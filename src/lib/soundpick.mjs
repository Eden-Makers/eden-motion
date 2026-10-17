// soundpick: find the best-fitting sound for a role on Openverse, scored in code (no LLM calls).
// 1. search (safe licenses only), broaden over-specific queries, keep lengths that can fit the role
// 2. download, trim silence, cap length, loudness-match to the curated library -> 48 kHz stereo wav
// 3. measure: trimmed length, where the peak sits, how steady the level is, noise floor, clipping
// 4. score per role: a whoosh peaks mid-sound, a hit peaks in the first 80 ms, a riser peaks at
//    the end, an ambience bed is steady; query words in title/tags count, speech/music/loops and
//    hiss/clipping are penalised, CC0 beats CC-BY, Openverse relevance breaks ties
// 5. optional (judge:true, `audio --judge-sfx`): Gemini listens to the top 4. Off by default:
//    editors swap sounds anyway, and the code score picks well enough for drafts.
// Picks are cached by role + query, so a project re-run never re-downloads or re-scores.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { search, fetchAudio, CACHE, safeWarn } from "./openverse.mjs";
import { key } from "./env.mjs";
import { log, warn, run, probeDuration } from "./util.mjs";

// dur: acceptable trimmed length (s); cap: hard cut with a short fade; peak: where the energy sits.
// mean: target mean volume (dBFS) measured on the curated sfx-library file for the same role, so an
// Openverse sound drops into the gains the mix was tuned with.
export const ROLES = {
  whoosh: { mean: -19, dur: [0.25, 2.2], cap: 2.5, peak: "mid", hint: "a clean air whoosh for a cut or a fast move, no hit, no voice" },
  hit: { mean: -8, dur: [0.25, 3], cap: 3.5, peak: "start", hint: "a tight impact with a short tail, no music" },
  click: { mean: -30, dur: [0.02, 0.5], cap: 0.6, peak: "start", hint: "a crisp, quiet UI click" },
  pop: { mean: -26, dur: [0.03, 0.6], cap: 0.7, peak: "start", hint: "a soft, round pop for an element arriving" },
  riser: { mean: -14, dur: [1.2, 6], cap: 6, peak: "end", hint: "a tonal or noise riser that builds into a reveal" },
  foley: { mean: -20, dur: [0.1, 4], cap: 4, peak: "any", hint: "a realistic, clean, close-miked foley sound" },
  ambience: { mean: -24, dur: [15, 600], cap: 90, peak: "flat", hint: "a steady, unobtrusive ambience bed with no speech, no music, no sudden events" },
  music: { mean: -16, dur: [30, 900], cap: 900, peak: "any", hint: "an instrumental track that fits a premium brand film" },
};

const SR = 22050;
function decodeMono(file) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error("decode failed");
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength / 4);
}

function measure(file) {
  const x = decodeMono(file);
  let m = 0, at = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    if (a > m) (m = a), (at = i);
  }
  // level steadiness: coefficient of variation of 0.5 s RMS windows
  const W = SR / 2, rms = [];
  for (let i = 0; i + W <= x.length; i += W) {
    let s = 0;
    for (let j = i; j < i + W; j++) s += x[j] * x[j];
    rms.push(Math.sqrt(s / W));
  }
  const mean = rms.reduce((a, b) => a + b, 0) / (rms.length || 1);
  const sd = Math.sqrt(rms.reduce((a, b) => a + (b - mean) ** 2, 0) / (rms.length || 1));
  // noise floor: quietest 10% of 50 ms windows against the loudest, in dB (one-shots should
  // decay into silence; a high floor means hiss, room tone or a busy recording)
  const w = Math.floor(SR / 20), short = [];
  for (let i = 0; i + w <= x.length; i += w) {
    let s2 = 0;
    for (let j = i; j < i + w; j++) s2 += x[j] * x[j];
    short.push(Math.sqrt(s2 / w));
  }
  short.sort((a, b) => a - b);
  const top = short[short.length - 1] || 1e-9, low = short[Math.floor(short.length * 0.1)] || 1e-9;
  const floorDb = short.length >= 6 ? 20 * Math.log10(Math.max(1e-9, low) / top) : -60;
  const dur = x.length / SR;
  return { dur, peakT: at / SR, peakR: dur ? at / SR / dur : 0, cv: mean ? sd / mean : 9, floorDb };
}

// Trim leading/trailing silence, cap, fade the tail, peak-normalise to -1 dBFS.
function prepare(src, role, out) {
  const R = ROLES[role] || ROLES.foley;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmp = out.replace(/\.wav$/, ".tmp.wav");
  const trim = role === "ambience" || role === "music" ? "" : "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.005,areverse,silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.02,areverse,";
  run("ffmpeg", ["-v", "error", "-y", "-i", src, "-af", `${trim}atrim=0:${R.cap},aformat=sample_rates=48000:channel_layouts=stereo`, "-c:a", "pcm_f32le", tmp]);
  const d = probeDuration(tmp);
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", tmp, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  const max = parseFloat((r.stderr.match(/max_volume:\s*(-?[\d.]+)/) || [])[1] || "0");
  const mean = parseFloat((r.stderr.match(/mean_volume:\s*(-?[\d.]+)/) || [])[1] || "-20");
  const gain = Math.min(-1 - max, (R.mean ?? -20) - mean); // never above -1 dBFS peak, never louder than the library
  const fade = Math.min(0.15, d / 4);
  run("ffmpeg", ["-v", "error", "-y", "-i", tmp, "-af", `volume=${gain.toFixed(2)}dB,afade=t=out:st=${Math.max(0, d - fade).toFixed(3)}:d=${fade.toFixed(3)}`, "-c:a", "pcm_f32le", out]);
  fs.rmSync(tmp, { force: true });
  return { file: out, clipped: max >= -0.05 };
}

const BANNED = {
  one: /\b(voice|vocal|speech|speak|talk|singing|sing|song|music|melody|loop|laugh|count(ing)?|narrat)/i,
  bed: /\b(voice|vocal|speech|talk|singing|song|music|melody|crowd cheer|announcement)/i,
};

function score(m, role, r, rank, n, query = "", clipped = false) {
  const R = ROLES[role] || ROLES.foley;
  const text = `${r.title} ${(r.tags || []).join(" ")}`.toLowerCase();
  const [lo, hi] = R.dur;
  let s = m.dur >= lo && m.dur <= hi ? 1 : Math.exp(-Math.abs(Math.log((m.dur < lo ? lo : hi) / Math.max(0.01, m.dur))) * 2);
  if (R.peak === "mid") s *= m.peakR > 0.2 && m.peakR < 0.8 ? 1 : 0.55;
  if (R.peak === "start") s *= m.peakT < 0.08 ? 1 : m.peakT < 0.2 ? 0.7 : 0.35;
  if (R.peak === "end") s *= m.peakR > 0.65 ? 1 : 0.5;
  if (R.peak === "flat") s *= m.cv < 0.45 ? 1 : m.cv < 0.8 ? 0.7 : 0.35;
  if (role !== "music" && BANNED[role === "ambience" ? "bed" : "one"].test(text)) s *= 0.5;
  if (role !== "ambience" && role !== "music" && m.floorDb > -32) s *= m.floorDb > -22 ? 0.55 : 0.8;
  if (clipped) s *= 0.85;
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  s += Math.min(0.3, 0.1 * words.filter((w) => text.includes(w)).length);
  s += r.license === "by" ? 0 : 0.15;
  s += 0.1 * (1 - rank / Math.max(1, n));
  return +s.toFixed(3);
}

async function judge(cands, { role, query, context }) {
  const { generateJSON, inlineImage, MODELS } = await import("./gemini.mjs");
  const parts = [];
  for (const [k, c] of cands.entries()) {
    const mp3 = c.file.replace(/\.wav$/, ".judge.mp3");
    run("ffmpeg", ["-v", "error", "-y", "-i", c.file, "-t", "20", "-ac", "1", "-b:a", "64k", mp3]);
    parts.push({ text: `Candidate ${k}: "${c.title}" (tags: ${c.tags.join(", ")}; ${c.m.dur.toFixed(2)} s)` }, inlineImage(mp3));
  }
  const res = await generateJSON(
    `You are the sound designer of a premium motion-graphics brand film${context ? ` (${context})` : ""}. Listen to every candidate and pick the one that best serves this role.
ROLE: ${role}, ${(ROLES[role] || ROLES.foley).hint}. SEARCH: "${query}".
Reject anything with speech, music (unless the role is music), clipping, hiss, room noise, a cheap or cartoon character, or a long silent gap. Prefer restrained, clean, expensive-sounding.
Return JSON {"best": <candidate index>, "why": "<one short sentence>", "ranking": [indices best first]}`,
    { model: MODELS.fast, parts, temperature: 0.2 }
  );
  const best = Number.isInteger(res?.best) && cands[res.best] ? res.best : 0;
  return { best, why: res?.why || "", ranking: Array.isArray(res?.ranking) ? res.ranking.filter((i) => cands[i]) : [best] };
}

// Returns up to n picks [{file (prepared wav), id, title, creator, license, attribution, landing, why}].
export async function pick(query, { role = "foley", n = 1, context = "", judge: useJudge = false, exclude = [], category } = {}) {
  const R = ROLES[role] || ROLES.foley;
  const ck = crypto.createHash("sha1").update(JSON.stringify([role, query.toLowerCase().trim(), n, exclude])).digest("hex").slice(0, 12);
  const cacheFile = path.join(CACHE, "picks", `${ck}.json`);
  if (fs.existsSync(cacheFile)) {
    const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    if (cached.every((p) => fs.existsSync(p.file))) return cached;
  }
  let results = [];
  const words = query.trim().split(/\s+/);
  const tries = [...new Set([query, words.slice(-2).join(" "), words.slice(-1)[0]])];
  for (const q of tries) {
    try {
      const got = (await search(q, { category })).filter((r) => !exclude.includes(r.id) && !results.some((x) => x.id === r.id));
      results.push(...got.filter((r) => !r.duration || (r.duration >= R.dur[0] * 0.5 && r.duration <= R.dur[1] * 6 + 2)));
    } catch (e) {
      safeWarn(e);
      break;
    }
    if (results.length >= 3) break;
  }
  // metadata length includes silence; allow generous slack before measuring the real thing
  const pool = results.slice(0, 6);
  const cands = [];
  for (const [rank, r] of pool.entries()) {
    try {
      const src = await fetchAudio(r);
      const { file, clipped } = prepare(src, role, path.join(CACHE, "prepared", `${r.id}.${role}.wav`));
      const m = measure(file);
      cands.push({ ...r, file, m, score: score(m, role, r, rank, pool.length, query, clipped) });
    } catch (e) {
      warn(`openverse: skip "${r.title}": ${String(e.message).slice(0, 80)}`);
    }
  }
  if (!cands.length) {
    warn(`openverse: nothing usable for "${query}" (${role})`);
    return [];
  }
  cands.sort((a, b) => b.score - a.score);
  let order = cands.map((_, i) => i), why = "code score";
  if (useJudge && cands.length > 1 && key("GEMINI_API_KEY", { required: false })) {
    try {
      const top = cands.slice(0, 4);
      const j = await judge(top, { role, query, context });
      order = [...new Set([...j.ranking, j.best, ...order])];
      order = [j.best, ...order.filter((i) => i !== j.best)];
      why = j.why;
    } catch (e) {
      warn("sound judge failed, using the code score: " + String(e.message).slice(0, 100));
    }
  }
  const picks = order.slice(0, n).map((i, k) => {
    const c = cands[i];
    return { file: c.file, id: c.id, title: c.title, creator: c.creator, license: c.license, attribution: c.attribution, landing: c.landing, dur: +c.m.dur.toFixed(3), peakT: +c.m.peakT.toFixed(3), why: k === 0 ? why : "runner-up" };
  });
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(picks, null, 1));
  log(`openverse ${role} "${query}": ${picks.map((p) => `"${p.title}" (${p.license})`).join(", ")}${why !== "code score" ? ` - ${why}` : ` (code score ${cands[order[0]].score})`}`);
  return picks;
}

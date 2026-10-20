// critique: the "watch your own frames" loop. Deterministic sheets + measured metrics first, then
// a harsh-director score from Gemini on the video and the sheets. Every round is appended to
// renders/review_log.md; the harness fixes the 3 worst problems and runs critique again until
// every score is 8+ and no hard metric fails. Rubric and sheet set follow the open "motion studio"
// course that circulated after Opus 5.5 (contact sheet, fast-action strips, phone test, loop seam).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { generateJSON, uploadFile, MODELS } from "../lib/gemini.mjs";
import { readDomJson } from "../lib/browser.mjs";
import { log, warn, readJSON, writeJSON, run } from "../lib/util.mjs";

const RUBRIC = ["hook", "phone_readability", "motion", "variety", "composition", "brand", "sound_sync"];

// Per-frame luma difference at 160x90: cheap, deterministic, good enough to find pops and dead air.
function frameDiffs(file) {
  const W = 160, H = 90;
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `scale=${W}:${H},format=gray`, "-f", "rawvideo", "-"], { maxBuffer: 2 ** 31 });
  const buf = r.stdout, n = Math.floor(buf.length / (W * H)), d = new Float32Array(Math.max(0, n - 1)), luma = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    let s = 0, m = 0;
    for (let i = 0; i < W * H; i++) {
      const v = buf[k * W * H + i];
      m += v;
      if (k) s += Math.abs(v - buf[(k - 1) * W * H + i]);
    }
    luma[k] = m / (W * H);
    if (k) d[k - 1] = s / (W * H);
  }
  return { d, luma, n };
}

export function measure(file, sb, { fps = 60, cues = [] } = {}) {
  const { d, luma } = frameDiffs(file);
  // intended cuts: scene boundaries plus cuts a scene declares inside itself (EM.cues type "cut")
  const cutTimes = [...sb.scenes.slice(1).map((s) => s.start), ...cues.filter((c) => c.type === "cut").map((c) => c.t)];
  const nearCut = (t) => cutTimes.some((c) => Math.abs(c - t) < 2.5 / fps);
  // single-frame pops: a difference spike 3x both neighbours
  const pops = [];
  for (let i = 1; i < d.length - 1; i++) if (d[i] > 2 && d[i] > 3 * Math.max(d[i - 1], d[i + 1])) pops.push(+((i + 1) / fps).toFixed(3));
  const strayPops = pops.filter((t) => !nearCut(t));
  // dead air: half-second windows with no visible change (the final hold is allowed)
  const dead = [];
  const win = Math.round(fps / 2), tailFrom = (sb.duration - 1.6) * fps;
  for (let i = 0; i + win <= d.length && i < tailFrom; i += win) {
    let s = 0;
    for (let j = i; j < i + win; j++) s += d[j];
    if (s / win < 0.03) dead.push(+(i / fps).toFixed(2));
  }
  // variety: something new every 2-4 s (scene starts, engine cues, visible pops)
  const events = [...new Set([0, ...sb.scenes.map((s) => s.start), ...cues.map((c) => c.t), ...pops])].sort((a, b) => a - b).filter((t) => t < sb.duration - 1);
  let gap = { len: 0, at: 0 };
  events.forEach((t, i) => {
    const next = i < events.length - 1 ? events[i + 1] : sb.duration - 1;
    if (next - t > gap.len) gap = { len: +(next - t).toFixed(2), at: +t.toFixed(2) };
  });
  // hook: the first half second must move and must not be a black frame
  let early = 0;
  for (let i = 0; i < Math.min(d.length, win); i++) early += d[i];
  const hook = { firstFrameLuma: +luma[0].toFixed(1), motionFirstHalfSecond: +(early / win).toFixed(3) };
  const loop = sb.loop ? { seamDiff: +Math.abs(luma[0] - luma[luma.length - 1]).toFixed(2) } : null;
  // reads (storyboard contract): each read needs held time and must not overlap the next one
  const readIssues = [];
  sb.scenes.forEach((s) => {
    const rs = (s.reads || []).map((r) => ({ ...r, t0: s.start + (r.at || 0), t1: s.start + (r.at || 0) + (r.hold || 0) })).sort((a, b) => a.t0 - b.t0);
    rs.forEach((r, i) => {
      if ((r.hold || 0) < 12 / fps) readIssues.push(`${s.id} "${r.what}" held ${(r.hold || 0).toFixed(2)} s`);
      if (i && r.t0 < rs[i - 1].t1 - 0.05) readIssues.push(`${s.id} "${r.what}" overlaps "${rs[i - 1].what}"`);
      if (r.t1 > s.start + s.duration + 0.05) readIssues.push(`${s.id} "${r.what}" is cut off by the next shot`);
    });
  });
  const fails = [];
  if (strayPops.length) fails.push(`single-frame pops away from cuts at ${strayPops.slice(0, 8).join(", ")} s`);
  if (dead.length) fails.push(`dead half-seconds at ${dead.slice(0, 8).join(", ")} s`);
  if (gap.len > 4) fails.push(`${gap.len} s with nothing new from ${gap.at} s (aim: every 2-4 s)`);
  if (hook.firstFrameLuma < 4 && hook.motionFirstHalfSecond < 0.2) fails.push("opens on a still black frame (hook must land in the first 2 s)");
  if (loop && loop.seamDiff > 3) fails.push(`loop seam jumps (luma diff ${loop.seamDiff})`);
  if (readIssues.length) fails.push(`reads: ${readIssues.slice(0, 6).join("; ")}`);
  return { pops, strayPops, dead, longestGap: gap, hook, loop, readIssues, fails };
}

function sheets(file, sb, renders, pops) {
  const out = {};
  const dur = sb.duration;
  out.contact = path.join(renders, "critique-contact.jpg");
  run("ffmpeg", ["-y", "-v", "error", "-i", file, "-vf", `fps=2,scale=320:-1,tile=6x${Math.ceil((dur * 2) / 6)}`, "-frames:v", "1", "-q:v", "4", out.contact], { allowFail: true });
  out.phone = path.join(renders, "critique-phone.jpg");
  run("ffmpeg", ["-y", "-v", "error", "-i", file, "-vf", `fps=1,scale=360:-1,tile=5x${Math.ceil(dur / 5)}`, "-frames:v", "1", "-q:v", "4", out.phone], { allowFail: true });
  // 12 consecutive frames around each cut and each stray pop: overlaps, flashes, text collisions
  const moments = [...sb.scenes.slice(1).map((s) => s.start), ...pops].sort((a, b) => a - b).slice(0, 14);
  const strips = moments.map((t, i) => {
    const f = path.join(renders, `.strip-${i}.png`);
    run("ffmpeg", ["-y", "-v", "error", "-ss", String(Math.max(0, t - 0.1)), "-i", file, "-vf", "scale=200:-1,tile=12x1", "-frames:v", "1", f], { allowFail: true });
    return f;
  }).filter((f) => fs.existsSync(f));
  if (strips.length) {
    out.strips = path.join(renders, "critique-strips.jpg");
    const inputs = strips.flatMap((f) => ["-i", f]);
    run("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", `${strips.map((_, i) => `[${i}:v]`).join("")}vstack=inputs=${strips.length}`, "-q:v", "4", out.strips], { allowFail: true });
    strips.forEach((f) => fs.rmSync(f, { force: true }));
  }
  return out;
}

export async function critique(projectDir, { file, noAi = false } = {}) {
  const renders = path.join(projectDir, "renders");
  if (file && !fs.existsSync(file) && fs.existsSync(path.join(projectDir, file))) file = path.join(projectDir, file); // --file relative to the project
  file = file || ["final.mp4", "draft.mp4"].map((f) => path.join(renders, f)).find((f) => fs.existsSync(f));
  if (!file || !fs.existsSync(file)) throw new Error("No render found. Run render --draft first.");
  const sb = readJSON(path.join(projectDir, "storyboard.json"));
  const brand = readJSON(path.join(projectDir, "brand.json"), {});
  const comp = path.join(projectDir, "comp", "index.html");
  const cues = fs.existsSync(comp) ? await readDomJson(comp, "em-cues", []).catch(() => []) : [];
  const fps = Math.round(eval(spawnSync("ffprobe", ["-v", "error", "-select_streams", "v", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", file]).stdout.toString().trim() || "60"));

  const m = measure(file, sb, { fps, cues });
  const sh = sheets(file, sb, renders, m.strayPops);
  log(`metrics: ${m.pops.length} pops (${m.strayPops.length} away from cuts), ${m.dead.length} dead half-seconds, longest gap ${m.longestGap.len}s`);
  m.fails.forEach((f) => warn(f));

  let ai = null;
  if (!noAi) {
    const parts = [await uploadFile(file), ...(await Promise.all([sh.contact, sh.phone, sh.strips].filter((f) => f && fs.existsSync(f)).map(uploadFile)))];
    ai = await generateJSON(
      `You are a harsh motion director, not a proud author. Review this ${sb.duration.toFixed(1)} s film for ${brand.name || "the brand"}.
Attached: the video, a contact sheet (2 fps), a phone test (1 fps at 360 px wide) and strips of 12 consecutive frames around every cut.
Score 1-10 each: hook (first 2 s) · phone_readability (text at 360 px) · motion (springs, overlap, no linear slides, no dead frames) · variety (a new thing every 2-4 s) · composition · brand (one accent, real product UI, correct logo) · sound_sync (hits land on cuts and actions).
Hunt specifically for: text overlapping during swaps, anything sliding instead of easing, corner labels and frame borders, centered title on a gradient, everything fading in, blurry scaled text, glow on UI chrome, generic particle bursts, a beat with nothing happening, a flash or stray frame at a cut, a stutter at a loop seam, invented UI where the real product should be.
Measured by the pipeline (trust these numbers): ${JSON.stringify({ strayPops: m.strayPops, dead: m.dead, longestGap: m.longestGap, hook: m.hook })}
Scenes: ${JSON.stringify(sb.scenes.map((s) => ({ id: s.id, type: s.type, t: `${s.start.toFixed(2)}-${(s.start + s.duration).toFixed(2)}` })))}
Return ONLY JSON: {"scores":{${RUBRIC.map((k) => `"${k}":1-10`).join(",")}},"problems":[{"t":"mm:ss.s","scene":"id","problem":"concrete","fix":"specific change"}] (the 3 worst, worst first),"keep":["what works, mm:ss"]}`,
      { model: MODELS.vision, parts, temperature: 0.3 }
    );
  }

  const logFile = path.join(renders, "review_log.md");
  const round = fs.existsSync(logFile) ? (fs.readFileSync(logFile, "utf8").match(/^## Round /gm) || []).length + 1 : 1;
  const scores = ai?.scores || {};
  const low = RUBRIC.filter((k) => scores[k] != null && scores[k] < 8);
  const pass = !m.fails.length && (noAi || (RUBRIC.every((k) => scores[k] != null) && !low.length));
  const md = [
    `## Round ${round} · ${new Date().toISOString().slice(0, 16).replace("T", " ")} · ${path.basename(file)} · ${pass ? "PASS" : "FIX"}`,
    ai ? `Scores: ${RUBRIC.map((k) => `${k} ${scores[k] ?? "-"}`).join(" · ")}` : "Scores: (metrics only)",
    m.fails.length ? `Metric fails:\n${m.fails.map((f) => `- ${f}`).join("\n")}` : "Metric fails: none",
    ai?.problems?.length ? `Worst problems:\n${ai.problems.map((p) => `- ${p.t} ${p.scene || ""}: ${p.problem} -> ${p.fix}`).join("\n")}` : "",
    `Sheets: ${Object.values(sh).map((f) => path.basename(f)).join(", ")}`,
    "",
  ].filter(Boolean).join("\n");
  fs.appendFileSync(logFile, (round === 1 ? "# Review log\n\n" : "") + md + "\n");
  writeJSON(path.join(renders, "critique.json"), { round, pass, metrics: m, sheets: sh, ai });
  log(`critique round ${round}: ${pass ? "PASS" : "FIX"}${low.length ? ` (below 8: ${low.join(", ")})` : ""} -> ${path.relative(projectDir, logFile)}`);
  return { round, pass, metrics: m, ai };
}

// critique --against <reference>: score the reference with the same rubric and storyboard, so the
// numbers mean something (the harsh judge rarely gives 8+ even to award-level films). Used on the
// Relate rebuilds: a recreation within 1 point of its reference on every axis is on par.
export async function critiqueAgainst(projectDir, refFile, { file, noAi = false } = {}) {
  const ours = await critique(projectDir, { file, noAi });
  const refDir = path.join(projectDir, "renders", "ref-critique");
  fs.mkdirSync(path.join(refDir, "renders"), { recursive: true });
  for (const f of ["storyboard.json", "brand.json"]) if (fs.existsSync(path.join(projectDir, f))) fs.copyFileSync(path.join(projectDir, f), path.join(refDir, f));
  const ref = await critique(refDir, { file: path.resolve(refFile), noAi });
  const last = (dir) => (fs.readFileSync(path.join(dir, "renders", "review_log.md"), "utf8").match(/Scores: .*/g) || []).pop() || "";
  const parse = (line) => Object.fromEntries([...line.matchAll(/(\w+) (\d+)/g)].map((m) => [m[1], +m[2]]));
  const a = parse(last(projectDir)), b = parse(last(refDir));
  const rows = RUBRIC.map((k) => `| ${k} | ${b[k] ?? "-"} | ${a[k] ?? "-"} | ${a[k] != null && b[k] != null ? (a[k] - b[k] > 0 ? "+" : "") + (a[k] - b[k]) : "-"} |`);
  const table = `\n### Calibrated against ${path.basename(refFile)}\n| axis | reference | ours | delta |\n|---|---|---|---|\n${rows.join("\n")}\n`;
  fs.appendFileSync(path.join(projectDir, "renders", "review_log.md"), table);
  log(`critique vs reference:${table}`);
  return { ours, ref, table };
}

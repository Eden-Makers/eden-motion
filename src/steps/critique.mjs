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
import { measureComp } from "./measure.mjs";
import { log, warn, readJSON, writeJSON, run } from "../lib/util.mjs";

const RUBRIC = ["hook", "phone_readability", "motion", "variety", "composition", "brand", "sound_sync"];

// Per-frame luma difference at 160x90: cheap, deterministic, good enough to find pops and dead air.
// Also per frame: mean luma, luma spread (a flat colour field has almost none), and the global
// horizontal shift against the previous frame from column profiles (whip pans).
const PW = 160, PH = 90, MAXSHIFT = 48;
function frameDiffs(file) {
  const W = PW, H = PH;
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `scale=${W}:${H},format=gray`, "-f", "rawvideo", "-"], { maxBuffer: 2 ** 31 });
  const buf = r.stdout, n = Math.floor(buf.length / (W * H)), d = new Float32Array(Math.max(0, n - 1)), luma = new Float32Array(n);
  const spread = new Float32Array(n), shift = new Float32Array(n), fit = new Float32Array(n);
  let prev = null;
  for (let k = 0; k < n; k++) {
    let s = 0, m = 0, m2 = 0;
    const col = new Float32Array(W);
    for (let i = 0; i < W * H; i++) {
      const v = buf[k * W * H + i];
      m += v;
      m2 += v * v;
      col[i % W] += v / H;
      if (k) s += Math.abs(v - buf[(k - 1) * W * H + i]);
    }
    luma[k] = m / (W * H);
    spread[k] = Math.sqrt(Math.max(0, m2 / (W * H) - luma[k] * luma[k]));
    if (k) d[k - 1] = s / (W * H);
    if (prev) {
      // best horizontal shift of the column profile (mean-removed), and how much better it fits than no shift
      const mc = col.reduce((a, b) => a + b, 0) / W, mp = prev.reduce((a, b) => a + b, 0) / W;
      const sad = (dx) => {
        let e = 0, c = 0;
        for (let x = Math.max(0, dx); x < Math.min(W, W + dx); x++) (e += Math.abs(col[x] - mc - (prev[x - dx] - mp))), c++;
        return c > W / 3 ? e / c : Infinity;
      };
      let best = 0, be = sad(0);
      const e0 = be;
      for (let dx = -MAXSHIFT; dx <= MAXSHIFT; dx++) {
        const e = sad(dx);
        if (e < be) (be = e), (best = dx);
      }
      shift[k] = best;
      fit[k] = e0 > 1e-6 ? 1 - be / e0 : 0;
    }
    prev = col;
  }
  return { d, luma, spread, shift, fit, n };
}

// Spans of consecutive frames where pred(i) holds: [{t0, t1, frames}]
function spans(n, pred, fps) {
  const out = [];
  let a = -1;
  for (let i = 0; i <= n; i++) {
    if (i < n && pred(i)) a < 0 && (a = i);
    else if (a >= 0) (out.push({ t0: +(a / fps).toFixed(3), t1: +(i / fps).toFixed(3), frames: i - a }), (a = -1));
  }
  return out;
}

// Whip pans: the whole frame slides sideways faster than ~1.6 frame widths per second for 3+ frames
// in one direction, and the shift explains the change (a cut or a zoom does not fit a shift).
export const LIMITS = { whipSpeed: 1.6, whipFrames: 3, whipFit: 0.35, whipMax: 2, darkLuma: 12, darkFrames: 2, flatSpread: 2.0, flatSeconds: 0.3 };
function whips(shift, fit, fps) {
  const fast = (i) => Math.abs(shift[i]) * fps / PW >= LIMITS.whipSpeed && fit[i] >= LIMITS.whipFit;
  const out = [];
  // runs of 2+ fast frames first; the whipFrames minimum applies after merging
  let a = -1, dir = 0;
  for (let i = 1; i <= shift.length; i++) {
    const ok = i < shift.length && fast(i) && (a < 0 || Math.sign(shift[i]) === dir);
    if (ok && a < 0) (a = i), (dir = Math.sign(shift[i]));
    else if (!ok && a >= 0) {
      if (i - a >= 2) {
        let peak = 0;
        for (let j = a; j < i; j++) peak = Math.max(peak, Math.abs(shift[j]) * fps / PW);
        out.push({ t: +(a / fps).toFixed(3), frames: i - a, dir: dir > 0 ? "right" : "left", peakWidthsPerSec: +peak.toFixed(2) });
      }
      a = -1;
      if (i < shift.length && fast(i)) (a = i), (dir = Math.sign(shift[i]));
    }
  }
  // one whip with a frame or two that did not fit (motion blur, a flash) is still one whip
  return out.reduce((acc, w) => {
    const p = acc[acc.length - 1];
    if (p && p.dir === w.dir && w.t - (p.t + p.frames / fps) <= 2.5 / fps) {
      p.frames = Math.round((w.t - p.t) * fps) + w.frames;
      p.peakWidthsPerSec = Math.max(p.peakWidthsPerSec, w.peakWidthsPerSec);
    } else acc.push({ ...w });
    return acc;
  }, []).filter((w) => w.frames >= LIMITS.whipFrames);
}

export function measure(file, sb, { fps = 60, cues = [] } = {}) {
  const { d, luma, spread, shift, fit, n } = frameDiffs(file);
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
  // whole film, not only the first frame: no black screen anywhere, no flat colour field longer than
  // 0.3 s (a full green end card was rejected), whip pans at most once or twice per film
  const dark = spans(n, (i) => luma[i] < LIMITS.darkLuma, fps).filter((s) => s.frames >= LIMITS.darkFrames);
  const flat = spans(n, (i) => luma[i] >= LIMITS.darkLuma && spread[i] < LIMITS.flatSpread, fps).filter((s) => s.t1 - s.t0 > LIMITS.flatSeconds);
  const whipList = whips(shift, fit, fps);
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
  if (dark.length) fails.push(`black screen at ${dark.slice(0, 6).map((s) => `${s.t0}-${s.t1} s`).join(", ")} (never black: a lit world, a parallax background)`);
  if (flat.length) fails.push(`flat colour field at ${flat.slice(0, 6).map((s) => `${s.t0}-${s.t1} s`).join(", ")} (no full-frame colour plates)`);
  if (whipList.length > LIMITS.whipMax) fails.push(`${whipList.length} whip pans (${whipList.slice(0, 8).map((w) => `${w.t} s`).join(", ")}): at most one per film, move with zooms, ramps, blur and parallax`);
  return { pops, strayPops, dead, longestGap: gap, hook, loop, readIssues, dark, flat, whips: whipList, fails };
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
  const explicitFile = !!file;
  if (file && !fs.existsSync(file) && fs.existsSync(path.join(projectDir, file))) file = path.join(projectDir, file); // --file relative to the project
  file = file || ["final.mp4", "draft.mp4"].map((f) => path.join(renders, f)).find((f) => fs.existsSync(f));
  if (!file || !fs.existsSync(file)) throw new Error("No render found. Run render --draft first.");
  const sb = readJSON(path.join(projectDir, "storyboard.json"));
  const brand = readJSON(path.join(projectDir, "brand.json"), {});
  const comp = path.join(projectDir, "comp", "index.html");
  const cues = fs.existsSync(comp) ? await readDomJson(comp, "em-cues", []).catch(() => []) : [];
  const fps = Math.round(eval(spawnSync("ffprobe", ["-v", "error", "-select_streams", "v", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", file]).stdout.toString().trim() || "60"));

  const m = measure(file, sb, { fps, cues });
  // frame-accurate checks on the composition itself (reading time, frame edge, ease tails, glyph
  // judder measured on the render): numbers a vision model cannot see
  const cm = await measureComp(projectDir, { video: file }).catch((e) => (warn(`measure skipped: ${e.message}`), null));
  if (cm) {
    writeJSON(path.join(renders, "measure.json"), cm);
    if (explicitFile && cm.missingTypes?.length) {
      // --file on a film the storyboard only labels (cut from clips outside the pipeline): the
      // composition does not describe this file, so its text checks would grade placeholders
      warn(`composition does not describe ${path.basename(file)} (scene types not in the runtime: ${cm.missingTypes.join(", ")}): text checks skipped, graded from the frames only`);
      m.composition = { skipped: "storyboard scene types not in the runtime", missingTypes: cm.missingTypes };
    } else {
      m.fails.push(...cm.fails);
      m.composition = cm.summary;
    }
  }
  // a measured style: how far this render is from its reference films, axis by axis (advice for
  // the director, not a fail: a film may leave the references' range on purpose)
  if (sb.styleProfile) {
    try {
      const { compareToProfile, measureFilm, profilePath } = await import("./study.mjs");
      const st = { style: sb.styleProfile, ...compareToProfile(measureFilm(file), readJSON(profilePath(sb.styleProfile))) };
      writeJSON(path.join(renders, `study-${sb.styleProfile}.json`), st);
      m.style = { score: st.score, off: st.rows.filter((r) => r.state === "off").map((r) => `${r.label} ${r.value} (refs ${r.p25}-${r.p75})`) };
      log(`style ${sb.styleProfile}: ${st.on} of ${st.rows.length} axes inside the references' range`);
      m.style.off.forEach((o) => warn(`off style: ${o}`));
    } catch (e) {
      warn(`style distance skipped: ${e.message.slice(0, 120)}`);
    }
  }
  const sh = sheets(file, sb, renders, m.strayPops);
  log(`metrics: ${m.pops.length} pops (${m.strayPops.length} away from cuts), ${m.dead.length} dead half-seconds, longest gap ${m.longestGap.len}s, ${m.whips.length} whip pans, ${m.dark.length} black and ${m.flat.length} flat colour spans`);
  m.fails.forEach((f) => warn(f));

  let ai = null;
  if (!noAi) {
    const parts = [await uploadFile(file), ...(await Promise.all([sh.contact, sh.phone, sh.strips].filter((f) => f && fs.existsSync(f)).map(uploadFile)))];
    ai = await generateJSON(
      `You are a harsh motion director, not a proud author. Review this ${sb.duration.toFixed(1)} s film for ${brand.name || "the brand"}.
Attached: the video, a contact sheet (2 fps), a phone test (1 fps at 360 px wide) and strips of 12 consecutive frames around every cut.
Calibrated scale, use it literally: 5 = student work, 6 = template / looks like a stock HTML or Remotion render, 7 = professional, 8 = agency (Burnwe, Relate, Google launch films), 9 = award shortlist. Anything that reads as an AI template or a default browser animation caps that axis at 6 and is a critical problem.
Score 1-10 each: hook (first 2 s) · phone_readability (text at 360 px) · motion (one continuous camera, elegant fast zooms with parallax, speed ramps, blur out and blur in, expo.out arrivals with no overshoot, overlap, no linear slides, no dead frames) · variety (a new thing every 2-4 s) · composition · brand (one accent, real product UI, correct logo) · sound_sync (hits land on cuts and actions, every press and transition has a sound).
Hunt specifically for: text overlapping during swaps, anything sliding instead of easing, corner labels and frame borders, centered title on a gradient, everything fading in, blurry scaled text, glow on UI chrome, generic particle bursts, a beat with nothing happening, a flash or stray frame at a cut, a stutter at a loop seam, invented UI where the real product should be, whip pans used as the default transition, a hard cut where a zoom into the UI should carry the eye, a black screen or a full-frame flat colour anywhere.
Fixes you may NOT propose (the director rejected them): springs or any overshoot or bounce, wiggle on arrival, a pump or punch-in on a word, flash frames, a slow scale drift on text, whip pans (at most one per film), 3D tilting everything. Propose instead: a smooth fast zoom with light parallax, a speed ramp, blur out and blur in, a parallax background, expo.out with a 12-20 px blur settling to 0, a flat front-on 2D close-up, a sound on the event.
Measured by the pipeline (trust these numbers): ${JSON.stringify({ strayPops: m.strayPops, dead: m.dead, longestGap: m.longestGap, hook: m.hook, whips: m.whips, blackSpans: m.dark, flatColourSpans: m.flat })}
Scenes: ${JSON.stringify(sb.scenes.map((s) => ({ id: s.id, type: s.type, t: `${s.start.toFixed(2)}-${(s.start + s.duration).toFixed(2)}` })))}
Return ONLY JSON: {"scores":{${RUBRIC.map((k) => `"${k}":1-10`).join(",")}},"problems":[{"t":"mm:ss.s","scene":"id","problem":"concrete","fix":"specific change with numbers (px, s, ease, colour), never 'make it better'"}] (the 3 worst, worst first; at least one aimed at a moment that would make a motion designer stop scrolling),"keep":["what works, mm:ss"]}`,
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

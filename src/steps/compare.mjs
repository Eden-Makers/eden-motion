// compare: put a render next to its reference (1:1 rebuilds, matching a client's favourite film).
// Writes renders/compare/side_by_side.mp4 (reference left, ours right, reference audio),
// pairs.jpg (one pair per second) and ssim.txt (480x270 luma SSIM over the shorter of the two).
// With --at, runs frame-by-frame pixelmatch + motion activity curve comparison with auto-align,
// red diff contact sheet (moment-<tag>-diff.jpg), SSIM, and fidelity verdict.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { log, warn, run, probeDuration, parseRanges, parseTime, rangeTag } from "../lib/util.mjs";
import { videoArgs, runEncode } from "../lib/encode.mjs";
import { extractVideoFrames, compareFrames } from "../lib/reanimate/compare.mjs";

// One moment of the reference against the same moment of our film, frame by frame:
// writes moment-<tag>.jpg (2-row ref/ours), moment-<tag>-diff.jpg (3-row labeled ref | clone | diff),
// and moment-<tag>.json (timingError, offset, meanMismatch, worstFrames, activityCurve, SSIM, pass/fail).
export function compareMoment(
  refFile,
  file,
  outDir,
  range,
  ourStart,
  {
    fidelity = "motion",
    blur = 0,
    region = null,
    autoAlign = true,
    offset = undefined,
    fps = 30,
    pixelThreshold = 0.1,
    threshold = undefined,
    motionThreshold = 0.08,
    maxShift = 15,
    keepDiffs = false,
  } = {}
) {
  const tag = rangeTag(range);
  const d = range.b - range.a;
  const n = Math.round(d * fps);
  const step = Math.max(1, Math.ceil(n / 12)); // at most 12 columns per row
  const cols = Math.ceil(n / step);

  // Backward-compatible 2-row moment-<tag>.jpg
  const rowOf = (src, a, label) => {
    const out = path.join(outDir, `.${label}-${tag}.png`);
    run("ffmpeg", [
      "-v", "error", "-y", "-ss", String(a), "-i", src, "-t", String(d),
      "-vf", `fps=${fps},select='not(mod(n\\,${step}))',scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2,setsar=1,tile=${cols}x1`,
      "-frames:v", "1", out,
    ]);
    return out;
  };
  const top = rowOf(refFile, range.a, "ref");
  const bottom = rowOf(file, ourStart, "ours");
  const sheet = path.join(outDir, `moment-${tag}.jpg`);
  run("ffmpeg", ["-v", "error", "-y", "-i", top, "-i", bottom, "-filter_complex", "vstack=inputs=2", "-q:v", "3", sheet]);
  fs.rmSync(top, { force: true });
  fs.rmSync(bottom, { force: true });

  // Per-frame luma SSIM (backward-compatible)
  const stats = path.join(outDir, `.ssim-${tag}.txt`);
  const fit = `fps=${fps},scale=480:270:force_original_aspect_ratio=decrease,pad=480:270:(ow-iw)/2:(oh-ih)/2,setsar=1,format=gray`;
  run(
    "ffmpeg",
    ["-v", "error", "-ss", String(range.a), "-t", String(d), "-i", refFile, "-ss", String(ourStart), "-t", String(d), "-i", file, "-filter_complex", `[0:v]${fit}[a];[1:v]${fit}[b];[a][b]ssim=stats_file=${stats}`, "-f", "null", "-"],
    { allowFail: true }
  );
  const per = fs.existsSync(stats)
    ? fs.readFileSync(stats, "utf8").split("\n").map((l) => +(l.match(/All:([0-9.]+)/) || [])[1]).filter((x) => x === x)
    : [];
  fs.rmSync(stats, { force: true });
  const meanSsim = per.length ? per.reduce((a, b) => a + b, 0) / per.length : null;
  const worstSsim = per.map((v, i) => ({ frame: i, t: +(range.a + i / fps).toFixed(2), ssim: v })).sort((a, b) => a.ssim - b.ssim).slice(0, 5);

  // Reanimate pixelmatch + motion activity comparison + 3-row labeled ref | clone | diff sheet
  const diffSheet = path.join(outDir, `moment-${tag}-diff.jpg`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "em-cmp-"));
  let rep = null;
  try {
    const refFramesDir = path.join(tmp, "ref");
    const cloneFramesDir = path.join(tmp, "clone");
    const cmpOutDir = keepDiffs ? path.join(outDir, `moment-${tag}-diffs`) : path.join(tmp, "out");
    extractVideoFrames(refFile, refFramesDir, { start: range.a, duration: d, fps, width: 640, height: 360 });
    extractVideoFrames(file, cloneFramesDir, { start: ourStart, duration: d, fps, width: 640, height: 360 });
    rep = compareFrames(refFramesDir, cloneFramesDir, cmpOutDir, {
      fps,
      fidelity,
      blur,
      region,
      autoAlign,
      offset,
      maxShift,
      pixelThreshold,
      threshold,
      motionThreshold,
      writeDiffs: true,
      sheetPath: diffSheet,
      maxCols: 12,
      tileWidth: 320,
      startTimeS: range.a,
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  const res = {
    range,
    ourStart,
    fps,
    frames: rep ? rep.frames : n,
    columnStep: step,
    meanSsim: meanSsim !== null ? +meanSsim.toFixed(3) : null,
    worst: worstSsim,
    perFrame: per.map((v) => +v.toFixed(3)),
    sheet,
    diffSheet,
    fidelity,
    fidelityVerdict: rep ? rep.fidelityVerdict : null,
    passed: rep ? rep.passed : null,
    pass: rep ? rep.pass : null,
    offset: rep ? rep.offset : 0,
    alignMethod: rep ? rep.alignMethod : "none",
    blur: blur || undefined,
    region: rep ? rep.region : null,
    meanMismatch: rep ? rep.meanMismatch : null,
    sharpMeanMismatch: rep ? rep.sharpMeanMismatch : undefined,
    maxMismatch: rep ? rep.maxMismatch : null,
    worstFrames: rep ? rep.worstFrames : [],
    timingError: rep ? rep.timingError : null,
    motion: rep ? rep.motion : null,
    activityCurve: rep ? rep.activityCurve : null,
  };
  fs.writeFileSync(path.join(outDir, `moment-${tag}.json`), JSON.stringify(res, null, 2) + "\n");
  log(
    `moment ${range.a}-${range.b} s vs ours from ${ourStart} s [${fidelity}: ${res.passed ? "PASS" : "FAIL"} (${res.fidelityVerdict})]: ` +
      `mismatch ${res.meanMismatch !== null ? (res.meanMismatch * 100).toFixed(2) + "%" : "n/a"}, ` +
      `timing err start ${res.timingError?.startS ?? 0}s / end ${res.timingError?.endS ?? 0}s / peak ${res.timingError?.peakS ?? 0}s (offset ${res.offset}), ` +
      `SSIM ${res.meanSsim} -> ${path.relative(path.dirname(outDir), diffSheet)}`
  );
  return res;
}

export async function compare(
  projectDir,
  refFile,
  {
    file,
    at,
    ourAt,
    fidelity = "motion",
    blur = 0,
    region = null,
    autoAlign = true,
    offset = undefined,
    fps = 30,
    pixelThreshold = 0.1,
    threshold = undefined,
    motionThreshold = 0.08,
    maxShift = 15,
  } = {}
) {
  if (!refFile || !fs.existsSync(refFile)) throw new Error("usage: compare <slug> <reference.mp4> [--file render.mp4]");
  const renders = path.join(projectDir, "renders");
  file = file || ["final.mp4", "draft.mp4"].map((f) => path.join(renders, f)).find((f) => fs.existsSync(f));
  if (!file) throw new Error("no render to compare");
  const out = path.join(renders, "compare");
  fs.mkdirSync(out, { recursive: true });
  if (at) {
    const rs = parseRanges(at);
    const starts = ourAt ? ourAt.split(",").map((x) => parseTime(x.trim())) : [];
    const moments = rs.map((r, i) =>
      compareMoment(refFile, file, out, r, starts[i] ?? r.a, {
        fidelity,
        blur,
        region,
        autoAlign,
        offset,
        fps,
        pixelThreshold,
        threshold,
        motionThreshold,
        maxShift,
      })
    );
    return { moments, out };
  }
  const Dr = probeDuration(refFile), Do = probeDuration(file);
  if (Math.abs(Dr - Do) > 0.5) warn(`length differs: reference ${Dr.toFixed(1)}s, render ${Do.toFixed(1)}s; comparing the first ${Math.min(Dr, Do).toFixed(1)}s only`);
  const D = Math.min(Dr, Do);
  const fit = "fps=30,scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2,setsar=1";
  // viewing copy only (SSIM below reads the sources), so the media engine is fine here
  runEncode(["-v", "error", "-y", "-i", refFile, "-i", file, "-filter_complex", `[0:v]${fit}[a];[1:v]${fit}[b];[a][b]hstack=inputs=2[v]`, "-map", "[v]", "-map", "0:a?", "-t", String(D), ...videoArgs("social"), "-c:a", "aac", "-shortest", path.join(out, "side_by_side.mp4")]);
  run("ffmpeg", ["-v", "error", "-y", "-i", path.join(out, "side_by_side.mp4"), "-vf", `fps=1,scale=960:-1,tile=2x${Math.ceil(D / 2)}`, "-frames:v", "1", path.join(out, "pairs.jpg")]);
  const r = run("ffmpeg", ["-i", refFile, "-i", file, "-filter_complex", "[0:v]fps=30,scale=480:270,setsar=1,format=gray[a];[1:v]fps=30,scale=480:270,setsar=1,format=gray[b];[a][b]ssim", "-t", String(D), "-f", "null", "-"], { allowFail: true });
  const ssim = ((r.stderr || "").match(/All:([0-9.]+)/g) || []).pop() || "All:n/a";
  fs.writeFileSync(path.join(out, "ssim.txt"), ssim + "\n");
  log(`compare: ${ssim} -> ${path.relative(projectDir, out)}/ (side_by_side.mp4: reference left, render right)`);
  return { ssim, out };
}

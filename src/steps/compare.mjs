// compare: put a render next to its reference (1:1 rebuilds, matching a client's favourite film).
// Writes renders/compare/side_by_side.mp4 (reference left, ours right, reference audio),
// pairs.jpg (one pair per second) and ssim.txt (480x270 luma SSIM over the shorter of the two).
// SSIM is harsh on thin black-on-white detail and DOF; always read pairs.jpg too.
import fs from "node:fs";
import path from "node:path";
import { log, warn, run, probeDuration, parseRanges, parseTime, rangeTag } from "../lib/util.mjs";

// One moment of the reference against the same moment of our film, frame by frame: a sheet with the
// reference frames in the top rows and ours below (same time grid), and the SSIM of every frame pair.
// A moment that does not match shows in the numbers (dips) and in the rows (what differs), so the
// fix is aimed at the frame where it starts, not at "the animation".
export function compareMoment(refFile, file, outDir, range, ourStart) {
  const fps = 30, tag = rangeTag(range), d = range.b - range.a;
  const n = Math.round(d * fps);
  const step = Math.max(1, Math.ceil(n / 12)); // at most 12 columns per row
  const cols = Math.ceil(n / step);
  const rowOf = (src, a, label) => {
    const out = path.join(outDir, `.${label}-${tag}.png`);
    run("ffmpeg", ["-v", "error", "-y", "-ss", String(a), "-i", src, "-t", String(d), "-vf", `fps=${fps},select='not(mod(n\\,${step}))',scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2,setsar=1,tile=${cols}x1`, "-frames:v", "1", out]);
    return out;
  };
  const top = rowOf(refFile, range.a, "ref"), bottom = rowOf(file, ourStart, "ours");
  const sheet = path.join(outDir, `moment-${tag}.jpg`);
  run("ffmpeg", ["-v", "error", "-y", "-i", top, "-i", bottom, "-filter_complex", "vstack=inputs=2", "-q:v", "3", sheet]);
  fs.rmSync(top, { force: true });
  fs.rmSync(bottom, { force: true });
  const stats = path.join(outDir, `.ssim-${tag}.txt`);
  const fit = `fps=${fps},scale=480:270:force_original_aspect_ratio=decrease,pad=480:270:(ow-iw)/2:(oh-ih)/2,setsar=1,format=gray`;
  run("ffmpeg", ["-v", "error", "-ss", String(range.a), "-t", String(d), "-i", refFile, "-ss", String(ourStart), "-t", String(d), "-i", file, "-filter_complex", `[0:v]${fit}[a];[1:v]${fit}[b];[a][b]ssim=stats_file=${stats}`, "-f", "null", "-"], { allowFail: true });
  const per = fs.existsSync(stats) ? fs.readFileSync(stats, "utf8").split("\n").map((l) => +(l.match(/All:([0-9.]+)/) || [])[1]).filter((x) => x === x) : [];
  fs.rmSync(stats, { force: true });
  const mean = per.length ? per.reduce((a, b) => a + b, 0) / per.length : null;
  const worst = per.map((v, i) => ({ frame: i, t: +(range.a + i / fps).toFixed(2), ssim: v })).sort((a, b) => a.ssim - b.ssim).slice(0, 5);
  const res = { range, ourStart, fps, frames: n, columnStep: step, meanSsim: mean && +mean.toFixed(3), worst, perFrame: per.map((v) => +v.toFixed(3)), sheet };
  fs.writeFileSync(path.join(outDir, `moment-${tag}.json`), JSON.stringify(res, null, 1));
  log(`moment ${range.a}-${range.b} s vs ours from ${ourStart} s: mean SSIM ${res.meanSsim}, worst ${worst.slice(0, 3).map((w) => `${w.t}s ${w.ssim.toFixed(2)}`).join(", ")} -> ${path.relative(path.dirname(outDir), sheet)} (top row reference, bottom row ours)`);
  return res;
}

export async function compare(projectDir, refFile, { file, at, ourAt } = {}) {
  if (!refFile || !fs.existsSync(refFile)) throw new Error("usage: compare <slug> <reference.mp4> [--file render.mp4]");
  const renders = path.join(projectDir, "renders");
  file = file || ["final.mp4", "draft.mp4"].map((f) => path.join(renders, f)).find((f) => fs.existsSync(f));
  if (!file) throw new Error("no render to compare");
  const out = path.join(renders, "compare");
  fs.mkdirSync(out, { recursive: true });
  if (at) {
    const rs = parseRanges(at);
    const starts = ourAt ? ourAt.split(",").map((x) => parseTime(x.trim())) : [];
    const moments = rs.map((r, i) => compareMoment(refFile, file, out, r, starts[i] ?? r.a));
    return { moments, out };
  }
  const Dr = probeDuration(refFile), Do = probeDuration(file);
  if (Math.abs(Dr - Do) > 0.5) warn(`length differs: reference ${Dr.toFixed(1)}s, render ${Do.toFixed(1)}s; comparing the first ${Math.min(Dr, Do).toFixed(1)}s only`);
  const D = Math.min(Dr, Do);
  const fit = "fps=30,scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2,setsar=1";
  run("ffmpeg", ["-v", "error", "-y", "-i", refFile, "-i", file, "-filter_complex", `[0:v]${fit}[a];[1:v]${fit}[b];[a][b]hstack=inputs=2[v]`, "-map", "[v]", "-map", "0:a?", "-t", String(D), "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", path.join(out, "side_by_side.mp4")]);
  run("ffmpeg", ["-v", "error", "-y", "-i", path.join(out, "side_by_side.mp4"), "-vf", `fps=1,scale=960:-1,tile=2x${Math.ceil(D / 2)}`, "-frames:v", "1", path.join(out, "pairs.jpg")]);
  const r = run("ffmpeg", ["-i", refFile, "-i", file, "-filter_complex", "[0:v]fps=30,scale=480:270,setsar=1,format=gray[a];[1:v]fps=30,scale=480:270,setsar=1,format=gray[b];[a][b]ssim", "-t", String(D), "-f", "null", "-"], { allowFail: true });
  const ssim = ((r.stderr || "").match(/All:([0-9.]+)/g) || []).pop() || "All:n/a";
  fs.writeFileSync(path.join(out, "ssim.txt"), ssim + "\n");
  log(`compare: ${ssim} -> ${path.relative(projectDir, out)}/ (side_by_side.mp4: reference left, render right)`);
  return { ssim, out };
}

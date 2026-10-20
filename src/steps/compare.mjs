// compare: put a render next to its reference (1:1 rebuilds, matching a client's favourite film).
// Writes renders/compare/side_by_side.mp4 (reference left, ours right, reference audio),
// pairs.jpg (one pair per second) and ssim.txt (480x270 luma SSIM over the shorter of the two).
// SSIM is harsh on thin black-on-white detail and DOF; always read pairs.jpg too.
import fs from "node:fs";
import path from "node:path";
import { log, warn, run, probeDuration } from "../lib/util.mjs";

export async function compare(projectDir, refFile, { file } = {}) {
  if (!refFile || !fs.existsSync(refFile)) throw new Error("usage: compare <slug> <reference.mp4> [--file render.mp4]");
  const renders = path.join(projectDir, "renders");
  file = file || ["final.mp4", "draft.mp4"].map((f) => path.join(renders, f)).find((f) => fs.existsSync(f));
  if (!file) throw new Error("no render to compare");
  const out = path.join(renders, "compare");
  fs.mkdirSync(out, { recursive: true });
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

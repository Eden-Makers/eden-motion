// render: HyperFrames capture -> (optional) true shutter motion blur -> mux audio.
//
// Motion blur: the composition is built with EM_SLOW=S, so every real second spans S seconds
// of timeline. Capturing that at R fps gives N = R*S/F sub-frames per output frame at F fps.
// ffmpeg tmix averages K = N*shutter/360 consecutive sub-frames centred on each output frame,
// which is exactly what a film camera shutter does. Cost: S times the render.
import fs from "node:fs";
import path from "node:path";
import { build } from "./build.mjs";
import { log, run, runLive, readJSON, probeDuration } from "../lib/util.mjs";

const HF = ["-y", "hyperframes@0.8.72"];

export async function render(projectDir, { quality = "final", fps = 30, shutter = 180, slow, workers, out } = {}) {
  const sb = readJSON(path.join(projectDir, "storyboard.json"));
  const draft = quality === "draft";
  const S = draft ? 1 : slow || 4;
  const R = 60;
  const renders = path.join(projectDir, "renders");
  fs.mkdirSync(renders, { recursive: true });

  const comp = await build(projectDir, { slow: S, out: draft ? "comp" : "comp-final" });
  const raw = path.join(renders, draft ? "raw-draft.mp4" : "raw-slow.mp4");
  const args = ["render", "--fps", String(draft ? fps : R), "--quality", draft ? "draft" : "high", "-o", raw];
  if (workers) args.push("--workers", String(workers));
  log(`hyperframes render (${draft ? "draft" : `slow x${S} @${R}fps for motion blur`})`);
  const t0 = Date.now();
  await runLive("npx", [...HF, ...args], { cwd: comp });
  log(`captured in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  let video = raw;
  if (!draft) {
    const N = Math.round((R * S) / fps);
    const K = Math.max(1, Math.round((N * shutter) / 360));
    const phase = Math.floor(K / 2);
    video = path.join(renders, "video-mb.mp4");
    log(`motion blur: ${N} sub-frames/frame, shutter ${shutter} deg -> average ${K}`);
    const weights = Array(K).fill(1).join(" ");
    run("ffmpeg", [
      "-y", "-v", "error", "-i", raw,
      "-vf", `tmix=frames=${K}:weights='${weights}',select='eq(mod(n\\,${N})\\,${phase})',setpts=N/${fps}/TB`,
      "-r", String(fps), "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-pix_fmt", "yuv420p", video,
    ]);
  }

  const mix = path.join(projectDir, "audio", "mix.wav");
  const final = out || path.join(renders, draft ? "draft.mp4" : "final.mp4");
  if (fs.existsSync(mix)) {
    run("ffmpeg", ["-y", "-v", "error", "-i", video, "-i", mix, "-map", "0:v", "-map", "1:a", "-c:v", draft ? "copy" : "libx264", ...(draft ? [] : ["-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p"]), "-c:a", "aac", "-b:a", "256k", "-t", String(sb.duration), "-movflags", "+faststart", final]);
  } else {
    run("ffmpeg", ["-y", "-v", "error", "-i", video, "-c:v", "copy", "-t", String(sb.duration), "-movflags", "+faststart", final]);
  }
  log(`done -> ${final} (${probeDuration(final).toFixed(2)}s)`);
  return final;
}

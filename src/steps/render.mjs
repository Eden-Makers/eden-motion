// render: HyperFrames capture -> true shutter motion blur -> mux audio.
//
// Motion blur is real temporal supersampling. HyperFrames seeks a paused timeline, so the engine
// stretches time: capture at R=60 fps of a timeline where a real second lasts S seconds gives
// N=2S sub-frames per 30 fps output frame; ffmpeg tmix averages K=N*shutter/360 of them centred
// on each output frame (a 180 deg film shutter).
//
// Adaptive (default final): the engine marks fast windows (transitions, scene-declared fast moves)
// and stretches only those by `hi` (16 sub-frames -> smooth smear, no strobing); calm stretches
// run at `lo`=0.5 (1 sub-frame, no cost). Faster AND smoother than a uniform stretch.
// Uniform (`--uniform`, or when the film contains video clips): every second stretched by S.
import fs from "node:fs";
import path from "node:path";
import { build } from "./build.mjs";
import { readDomJson } from "../lib/browser.mjs";
import { log, run, runLive, readJSON, probeDuration } from "../lib/util.mjs";

const HF = ["-y", "hyperframes@0.8.72"];

// Finish: what keeps a browser render from reading as a browser render. Temporal grain breaks the
// banding in big soft gradients and the dead-clean vector edges; a soft vignette gives the frame a
// lens. Added in ffmpeg, never drawn in the page (lemo-opuscar mux.sh: frames stay compressible
// and the measured composition stays clean). No bloom: on light themes it washes the UI out.
// storyboard.finish: "subtle" (default) | "film" | "clean" | false | { grain: 0-12, vignette: 0-1 }
const FINISH = { subtle: { grain: 3, vignette: 0.35 }, film: { grain: 6, vignette: 0.6 }, clean: { grain: 1.5, vignette: 0 } };
export function finishFilter(sb) {
  if (sb.finish === false) return null;
  const f = typeof sb.finish === "object" ? sb.finish : FINISH[sb.finish] || (sb.flat ? FINISH.clean : FINISH.subtle);
  const parts = [];
  if (f.vignette > 0) parts.push(`vignette=angle=${(0.5 * f.vignette).toFixed(3)}:mode=forward`);
  if (f.grain > 0) parts.push(`noise=c0s=${f.grain}:c0f=t+u:c1s=${(f.grain / 3).toFixed(1)}:c1f=t+u:c2s=${(f.grain / 3).toFixed(1)}:c2f=t+u`);
  return parts.length ? parts.join(",") : null;
}

function segmentGraph(map, fps, shutter, phase = "center", R = 60) {
  // One trim -> (tmix -> select) chain per segment, then concat.
  let F = 0;
  const parts = [];
  const labels = [];
  map.segs.forEach((g, k) => {
    const frames30 = Math.round((g.t1 - g.t0) * fps);
    const n = Math.max(1, Math.round((R * g.S) / fps));
    const count = frames30 * n;
    let chain = `[0:v]trim=start_frame=${F}:end_frame=${F + count},setpts=PTS-STARTPTS`;
    if (n > 1) {
      const K = Math.max(1, Math.round((n * shutter) / 360));
      // center: shutter straddles the frame time (physically centred blur, ghosts across hard cuts);
      // forward: shutter opens at the frame time (hard cuts stay clean; Relate-style metronome edits).
      chain += `,tmix=frames=${K}:weights='${Array(K).fill(1).join(" ")}',select='eq(mod(n\\,${n})\\,${phase === "forward" ? K - 1 : Math.floor(K / 2)})'`;
    }
    chain += `,setpts=N/${fps}/TB[s${k}]`;
    parts.push(chain);
    labels.push(`[s${k}]`);
    F += count;
  });
  return `${parts.join(";")};${labels.join("")}concat=n=${labels.length}:v=1:a=0[out]`;
}

export async function render(projectDir, { quality = "final", fps, shutter = 180, shutterPhase, slow, workers, out, uniform, hi = 16, resolution } = {}) {
  const sb = readJSON(path.join(projectDir, "storyboard.json"));
  fps = fps || sb.fps || 30;
  const phase = shutterPhase || sb.shutterPhase || "center";
  const R = 2 * fps; // capture rate: an integer number of sub-frames per output frame at 24, 25 or 30 fps
  const draft = quality === "draft";
  // any clip (media-frame video, clip-3d Blender plate) needs the uniform stretch: video elements
  // follow EM_SLOW, not the adaptive per-segment time map
  const hasVideo = JSON.stringify(sb.scenes).includes('"kind":"video"') || /\.(mp4|mov|webm|m4v)"/i.test(JSON.stringify(sb.scenes));
  const adaptive = !draft && !uniform && !slow && !hasVideo;
  let S = draft ? 1 : slow || 4;
  // HyperFrames clamps a <video> playbackRate to >= 0.1. Time stretching plays video at 1/S, so
  // S > 10 makes every clip run fast (S=12 -> 1.2x, lips drift ~200 ms per second). Measured with
  // a frame-coded clip (tools/synccheck.mjs). Cap the stretch whenever the film has video.
  const usesVideo = /\.(mp4|mov|webm)"/i.test(JSON.stringify(sb.scenes));
  if (usesVideo && S > 10) {
    log(`slow x${S} would push video below HyperFrames' 0.1 playbackRate floor; using x10`);
    S = 10;
  }
  const renders = path.join(projectDir, "renders");
  fs.mkdirSync(renders, { recursive: true });

  const comp = await build(projectDir, adaptive ? { slow: 1, mb: { hi, lo: fps / R, pad: 0.1, fps }, out: "comp-final" } : { slow: S, out: draft ? "comp" : "comp-final" });
  let map = null;
  if (adaptive) {
    map = await readDomJson(path.join(comp, "index.html"), "em-timemap");
    if (!map) throw new Error("engine did not export #em-timemap");
    const html = path.join(comp, "index.html");
    fs.writeFileSync(html, fs.readFileSync(html, "utf8").replace(/data-duration="[^"]*"/, `data-duration="${map.captureDuration.toFixed(4)}"`));
    const fast = map.segs.filter((g) => g.S > 1).reduce((a, g) => a + g.t1 - g.t0, 0);
    log(`adaptive motion blur: ${map.segs.length} segments, ${fast.toFixed(1)}s at ${2 * hi} sub-frames, capture ${map.captureDuration.toFixed(1)}s`);
  }

  const raw = path.join(renders, draft ? "raw-draft.mp4" : "raw-slow.mp4");
  const args = ["render", "--fps", String(draft ? fps : R), "--quality", draft ? "draft" : "high", "-o", raw];
  if (workers) args.push("--workers", String(workers));
  if (resolution && !draft) args.push("--resolution", resolution === "4k" ? "landscape-4k" : resolution); // supersampled 4K via deviceScaleFactor
  log(`hyperframes render (${draft ? "draft" : adaptive ? "adaptive supersampling" : `uniform slow x${S}`})`);
  const t0 = Date.now();
  // Stream frames into the encoder instead of writing every frame to disk (4K needs ~40 GB).
  await runLive("npx", [...HF, ...args], { cwd: comp, env: { ...process.env, HF_CAPTURE_PARALLEL_STREAM: "true" } });
  log(`captured in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  let video = raw;
  if (!draft) {
    video = path.join(renders, "video-mb.mp4");
    let graph;
    if (adaptive) graph = segmentGraph(map, fps, shutter, phase, R);
    else {
      const N = Math.round((R * S) / fps);
      const K = Math.max(1, Math.round((N * shutter) / 360));
      graph = `[0:v]tmix=frames=${K}:weights='${Array(K).fill(1).join(" ")}',select='eq(mod(n\\,${N})\\,${phase === "forward" ? K - 1 : Math.floor(K / 2)})',setpts=N/${fps}/TB[out]`;
    }
    fs.writeFileSync(path.join(renders, "mb.graph.txt"), graph);
    run("ffmpeg", ["-y", "-v", "error", "-i", raw, "-filter_complex", graph, "-map", "[out]", "-r", String(fps), "-c:v", "libx264", "-preset", "slow", "-crf", resolution ? "14" : "12", "-pix_fmt", "yuv420p", video]);
  }

  const mix = path.join(projectDir, "audio", "mix.wav");
  const final = out || path.join(renders, draft ? "draft.mp4" : "final.mp4");
  // storyboard.output: delivery size when the stage is laid out larger (4:5, 1:1)
  const scale = Array.isArray(sb.output) ? `scale=${sb.output[0]}:${sb.output[1]}:flags=lanczos` : null;
  const vf = [scale, draft ? null : finishFilter(sb)].filter(Boolean).join(",") || null;
  if (vf) log(`finish: ${vf}`);
  const venc = draft && !vf ? ["-c:v", "copy"] : [...(vf ? ["-vf", vf] : []), "-c:v", "libx264", "-crf", draft ? "20" : "16", "-preset", draft ? "veryfast" : "slow", "-pix_fmt", "yuv420p"];
  if (fs.existsSync(mix)) {
    run("ffmpeg", ["-y", "-v", "error", "-i", video, "-i", mix, "-map", "0:v", "-map", "1:a", ...venc, "-c:a", "aac", "-b:a", "256k", "-t", String(sb.duration), "-movflags", "+faststart", final]);
  } else {
    run("ffmpeg", ["-y", "-v", "error", "-i", video, ...(vf ? venc : ["-c:v", "copy"]), "-t", String(sb.duration), "-movflags", "+faststart", final]);
  }
  log(`done -> ${final} (${probeDuration(final).toFixed(2)}s)`);
  return final;
}

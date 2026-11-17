// Video encoder choice for every ffmpeg encode in the pipeline.
//
// On a Mac, H.264 goes through the Apple media engine (VideoToolbox): 3-9x faster than libx264
// at the same VMAF (crf 18 ~ q 75). Everywhere else (Linux VPS, Windows, ffmpeg built without VT)
// it stays libx264 with the original CRF and preset. VIDEO_HW_ENCODE=0 forces libx264 (debugging,
// bit-exact tests). Keep libx264 by hand where the output must be reproducible, all-intra (-g 1),
// lossless, 4:4:4 or needs -tune / -x264-params / a maxrate cap.
import { execFileSync } from "node:child_process";
import { run } from "./util.mjs";

let _vt;
export function hasVideoToolbox() {
  if (_vt !== undefined) return _vt;
  _vt = false;
  if (process.platform !== "darwin" || process.env.VIDEO_HW_ENCODE === "0") return _vt;
  try {
    _vt = execFileSync("ffmpeg", ["-hide_banner", "-encoders"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).includes("h264_videotoolbox");
  } catch {}
  return _vt;
}

// libx264 CRF -> VideoToolbox -q:v (crf 16 -> 80, 18 -> 75, 20 -> 70, 23 -> 62), clamped 40..95
export const crfToQ = (crf) => Math.max(40, Math.min(95, Math.round(75 - 2.5 * (crf - 18))));
const qToCrf = (q) => Math.round(18 - (q - 75) / 2.5);

// H.264 encoder args (includes -pix_fmt yuv420p).
export function h264Args(crf = 18, preset = "medium") {
  if (hasVideoToolbox()) return ["-c:v", "h264_videotoolbox", "-q:v", String(crfToQ(crf)), "-pix_fmt", "yuv420p"];
  return ["-c:v", "libx264", "-preset", preset, "-crf", String(crf), "-pix_fmt", "yuv420p"];
}

// Intermediate that the next step only reads and re-encodes: ProRes 422 HQ on the media engine
// (.mov), else null so the caller keeps its own libx264 settings.
export function proresIntermediateArgs() {
  if (!hasVideoToolbox()) return null;
  return ["-c:v", "prores_videotoolbox", "-profile:v", "3", "-pix_fmt", "p210le"];
}

// HyperFrames render flags: GPU encoding on a Mac (HyperFrames probes the encoder itself and
// falls back to libx264 when the probe fails). Off elsewhere, so Linux renders stay as before.
export function hfGpuArgs() {
  return hasVideoToolbox() ? ["--gpu"] : [];
}

// Software equivalent of an args list that uses a VideoToolbox encoder.
export function softwareFallback(args) {
  const out = [...args];
  const i = out.indexOf("h264_videotoolbox");
  if (i > 0) {
    const hasQ = out[i + 1] === "-q:v";
    const crf = hasQ ? qToCrf(Number(out[i + 2])) : 18;
    out.splice(i, hasQ ? 3 : 1, "libx264", "-preset", "medium", "-crf", String(crf));
  }
  const p = out.indexOf("prores_videotoolbox");
  if (p > 0) {
    out[p] = "prores_ks";
    const f = out.indexOf("p210le");
    if (f > 0) out[f] = "yuv422p10le";
  }
  return out;
}

// run("ffmpeg", args) that retries once in software when a VideoToolbox encode fails
// (VT session limit, odd frame size, ffmpeg without VT despite the probe).
export function runEncode(args, opts = {}) {
  const vt = args.includes("h264_videotoolbox") || args.includes("prores_videotoolbox");
  if (!vt) return run("ffmpeg", args, opts);
  const r = run("ffmpeg", args, { ...opts, allowFail: true });
  if (r.status === 0) return r;
  return run("ffmpeg", softwareFallback(args), opts);
}

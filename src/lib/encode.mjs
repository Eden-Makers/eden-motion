// Video encoder choice for every ffmpeg encode in the pipeline. House standard: HEVC 10-bit, bitrate
// set by where the video goes, never a starved ~5 Mbps file for anything a person watches.
//
//   social   HEVC Main10 40 Mbps   drafts, review links, previews, socials, 9:16 Reels versions (default)
//   deliver  HEVC Main10 160 Mbps  client delivery masters (the final brand film)
//   compat   H.264 High 40 Mbps    only where H.264 is required (X, WhatsApp, inputs that reject HEVC)
//
// On a Mac every profile encodes on the Apple media engine (VideoToolbox): HEVC 10-bit costs no render
// time there. Off a Mac (Linux, Windows, ffmpeg without VT) and with VIDEO_HW_ENCODE=0 it falls back to
// libx264 8-bit at the same bitrate (libx265 10-bit is several times slower on a CPU).
// VT ignores -crf and -preset (without -b:v it lands near 5 Mbps) and defaults to a 12-frame GOP, so
// always build the video block here. Exempt, by hand with a comment: all-intra seek assets with their
// own -g, hash-compared tests, alpha (VP9 / ProRes 4444).
import { execFileSync } from "node:child_process";
import { run } from "./util.mjs";

export const VIDEO_PROFILES = { social: ["hevc10", "40M"], deliver: ["hevc10", "160M"], compat: ["h264", "40M"] };

let _vt;
export function hasVideoToolbox() {
  if (_vt !== undefined) return _vt;
  _vt = false;
  if (process.platform !== "darwin" || process.env.VIDEO_HW_ENCODE === "0") return _vt;
  try {
    const out = execFileSync("ffmpeg", ["-hide_banner", "-encoders"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    _vt = out.includes("hevc_videotoolbox") && out.includes("h264_videotoolbox");
  } catch {}
  return _vt;
}

function softwareArgs(bitrate, gop) {
  const buf = `${parseInt(bitrate, 10) * 2}M`;
  return ["-c:v", "libx264", "-preset", "medium", "-b:v", bitrate, "-maxrate", bitrate, "-bufsize", buf, "-g", String(gop), "-pix_fmt", "yuv420p"];
}

// Encoder args for a profile (includes -pix_fmt, and -tag:v hvc1 for HEVC so QuickTime / iOS / IG play it).
export function videoArgs(profile = "social", gop = 250) {
  const p = VIDEO_PROFILES[profile];
  if (!p) throw new Error(`unknown video profile "${profile}" (social | deliver | compat)`);
  const [codec, bitrate] = p;
  if (!hasVideoToolbox()) return softwareArgs(bitrate, gop);
  if (codec === "hevc10")
    return ["-c:v", "hevc_videotoolbox", "-b:v", bitrate, "-g", String(gop), "-profile:v", "main10", "-pix_fmt", "p010le", "-tag:v", "hvc1"];
  return ["-c:v", "h264_videotoolbox", "-b:v", bitrate, "-g", String(gop), "-profile:v", "high", "-pix_fmt", "yuv420p"];
}

// Profile for a final render: --profile / storyboard.profile / EM_VIDEO_PROFILE, else deliver for a
// landscape or square film and social for a vertical (9:16 Reels) one.
export function pickProfile({ flag, sb = {}, vertical = false, fallback } = {}) {
  const p = flag || sb.profile || process.env.EM_VIDEO_PROFILE || fallback || (vertical ? "social" : "deliver");
  if (!VIDEO_PROFILES[p]) throw new Error(`unknown video profile "${p}" (social | deliver | compat)`);
  return p;
}

// Intermediate that the next step only reads and re-encodes: ProRes 422 HQ on the media engine
// (.mov), else null so the caller keeps its own software settings.
export function proresIntermediateArgs() {
  if (!hasVideoToolbox()) return null;
  return ["-c:v", "prores_videotoolbox", "-profile:v", "3", "-pix_fmt", "p210le"];
}

// HyperFrames render flags: GPU encoding on a Mac (HyperFrames probes the encoder itself and
// falls back to libx264 when the probe fails). Off elsewhere, so Linux renders stay as before.
export function hfGpuArgs() {
  return hasVideoToolbox() ? ["--gpu"] : [];
}

// Same argv with a VT block (as built by videoArgs / proresIntermediateArgs) swapped for software.
export function toSoftware(argv) {
  for (const [enc, n] of [["hevc_videotoolbox", 12], ["h264_videotoolbox", 10]]) {
    const i = argv.indexOf(enc);
    if (i > 0) return [...argv.slice(0, i - 1), ...softwareArgs(argv[i + 2], Number(argv[i + 4])), ...argv.slice(i - 1 + n)];
  }
  const p = argv.indexOf("prores_videotoolbox");
  if (p > 0) return argv.map((a, k) => (k === p ? "prores_ks" : a === "p210le" ? "yuv422p10le" : a));
  return null;
}

// run("ffmpeg", argv) that retries once in software when a VideoToolbox encode fails
// (VT session limit, odd frame size, ffmpeg without VT despite the probe).
export function runEncode(argv, opts = {}) {
  const sw = toSoftware(argv);
  if (!sw) return run("ffmpeg", argv, opts);
  const r = run("ffmpeg", argv, { ...opts, allowFail: true });
  if (r.status === 0) return r;
  console.warn("[encode] VideoToolbox failed, retrying with libx264");
  return run("ffmpeg", sw, opts);
}

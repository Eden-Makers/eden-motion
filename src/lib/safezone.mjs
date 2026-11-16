// safezone: measured checks on a rendered film for the platform UI of 9:16 (Reels, Shorts, TikTok)
// and for mixed aspect ratios.
//
//   safe zone   bounding box of bright content (text, glyphs, UI: luma above 200) per frame, taken
//               at 12 fps, skipped in fast motion. At 1080x1920 nothing important may sit above
//               y 220, below y 1500, right of x 940 (the buttons) or left of x 90. Scales with the size.
//   ratio mix   a horizontal shot or a letterbox inside a vertical film (and pillarboxes in a
//               landscape film): flat dark bars along the long edges around a lit middle.
//
// Pure function of the file, no composition needed: measure --video and critique --file both call it.
import { spawnSync } from "node:child_process";

export const SAFE = { top: 220, bottom: 1500, right: 940, left: 90, ref: [1080, 1920], bright: 200, minPixels: 12, fastDiff: 7 };
const SAMPLE_FPS = 12;

function probe(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file], { encoding: "utf8" });
  const [w, h] = r.stdout.trim().split(",").map(Number);
  return { w, h };
}

function frames(file, w, h) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `fps=${SAMPLE_FPS},scale=${w}:${h}:flags=area,format=gray`, "-f", "rawvideo", "-"], { maxBuffer: 2 ** 31 });
  const size = w * h;
  return { buf: r.stdout, n: Math.floor(r.stdout.length / size), size };
}

// A span [t0, t1] of consecutive sampled frames where pred holds for at least minSec.
function spans(flags, minSec) {
  const out = [];
  let a = -1;
  for (let i = 0; i <= flags.length; i++) {
    if (i < flags.length && flags[i]) a < 0 && (a = i);
    else if (a >= 0) {
      if ((i - a) / SAMPLE_FPS >= minSec) out.push({ t0: +(a / SAMPLE_FPS).toFixed(2), t1: +(i / SAMPLE_FPS).toFixed(2) });
      a = -1;
    }
  }
  return out;
}

// Returns { portrait, safe: {frames, bad:[{t, x0,x1,y0,y1}], spans}, ratio: {spans, kind}, fails: [] }
export function safeZone(file, { only916 = true } = {}) {
  const { w: W, h: H } = probe(file);
  const portrait = H > W;
  const res = { size: [W, H], portrait, safe: null, ratio: null, fails: [] };
  // work at a quarter of the 1080 short side: cheap and enough for 3 px glyph strokes
  const sw = Math.round((portrait ? 270 : 480) / 2) * 2, sh = Math.round((sw * H) / W / 2) * 2;
  const { buf, n, size } = frames(file, sw, sh);
  if (n < 2) return res;
  const fx = W / sw, fy = H / sh;

  // ratio mix: dark flat bars along the long edges around a lit middle
  const band = (f, y0, y1, x0, x1) => {
    let s = 0, s2 = 0, c = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const v = buf[f * size + y * sw + x]; s += v; s2 += v * v; c++; }
    const m = s / c;
    return { m, sd: Math.sqrt(Math.max(0, s2 / c - m * m)) };
  };
  const bars = [];
  for (let f = 0; f < n; f++) {
    let a, b, mid;
    if (portrait) {
      a = band(f, 0, Math.floor(sh * 0.22), 0, sw);
      b = band(f, Math.ceil(sh * 0.78), sh, 0, sw);
      mid = band(f, Math.floor(sh * 0.4), Math.ceil(sh * 0.6), 0, sw);
    } else {
      a = band(f, 0, sh, 0, Math.floor(sw * 0.22));
      b = band(f, 0, sh, Math.ceil(sw * 0.78), sw);
      mid = band(f, 0, sh, Math.floor(sw * 0.4), Math.ceil(sw * 0.6));
    }
    bars.push(a.m < 5 && a.sd < 2 && b.m < 5 && b.sd < 2 && mid.m > 22);
  }
  const barSpans = spans(bars, 0.5);
  res.ratio = { kind: portrait ? "letterbox in a vertical film (a horizontal shot)" : "pillarbox in a landscape film", spans: barSpans };
  if (barSpans.length) res.fails.push(`${res.ratio.kind} at ${barSpans.slice(0, 5).map((s) => `${s.t0}-${s.t1} s`).join(", ")}: shoot or render that shot natively in ${portrait ? "9:16" : "16:9"} with the same references`);

  // safe zone (9:16 films only: the platform UI is a vertical-format thing)
  if (portrait && only916) {
    const lim = { top: (SAFE.top / SAFE.ref[1]) * H, bottom: (SAFE.bottom / SAFE.ref[1]) * H, right: (SAFE.right / SAFE.ref[0]) * W, left: (SAFE.left / SAFE.ref[0]) * W };
    const bad = [];
    let prevFrame = -1;
    for (let f = 0; f < n; f++) {
      let diff = 0;
      if (prevFrame >= 0) {
        for (let i = 0; i < size; i += 3) diff += Math.abs(buf[f * size + i] - buf[prevFrame * size + i]);
        diff /= size / 3;
      }
      prevFrame = f;
      if (diff > SAFE.fastDiff) continue; // fast motion: slivers in motion read fine
      const colN = new Uint32Array(sw), rowN = new Uint32Array(sh);
      let tot = 0;
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) if (buf[f * size + y * sw + x] > SAFE.bright) (colN[x]++, rowN[y]++, tot++);
      if (tot < SAFE.minPixels) continue;
      const pct = (arr, q) => { let c = 0; const target = tot * q; for (let i = 0; i < arr.length; i++) { c += arr[i]; if (c >= target) return i; } return arr.length - 1; };
      const x0 = pct(colN, 0.002) * fx, x1 = (pct(colN, 0.998) + 1) * fx, y0 = pct(rowN, 0.002) * fy, y1 = (pct(rowN, 0.998) + 1) * fy;
      if (y0 < lim.top || y1 > lim.bottom || x1 > lim.right || x0 < lim.left) bad.push({ f, t: +(f / SAMPLE_FPS).toFixed(2), x0: Math.round(x0), x1: Math.round(x1), y0: Math.round(y0), y1: Math.round(y1) });
    }
    const flags = Array.from({ length: n }, (_, f) => bad.some((b) => b.f === f));
    const sp = spans(flags, 0.25);
    res.safe = { frames: n, bad: bad.length, limits: lim, spans: sp, worst: bad.slice(0, 6) };
    if (sp.length) res.fails.push(`content in the platform UI zone (y < ${Math.round(lim.top)}, y > ${Math.round(lim.bottom)}, x > ${Math.round(lim.right)} or x < ${Math.round(lim.left)} at ${W}x${H}) at ${sp.slice(0, 5).map((s) => `${s.t0}-${s.t1} s`).join(", ")}`);
  }
  return res;
}

#!/usr/bin/env node
// Video sync check: renders a frame-coded clip through the same <video> path the scenes use and
// decodes every output frame, so drift between timeline time and video time shows up as numbers.
// Usage: node tools/synccheck.mjs [--slow N] [--draft] [--decode-only]
// Found with it: HyperFrames clamps playbackRate to >= 0.1, so --slow 12 played video 1.2x fast.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const draft = args.includes("--draft");
const slow = Number(args[args.indexOf("--slow") + 1]) || 10;
const P = path.join(ROOT, "projects", "_synccheck");
const W = 1920, H = 1080, F = 480, FPS = 60, START = 1.0, MS = 2.0;

fs.mkdirSync(path.join(P, "custom-scenes"), { recursive: true });
fs.mkdirSync(path.join(P, "assets"), { recursive: true });

// 10-bit frame index as black/white blocks across the middle of a grey frame, all-intra
const clip = path.join(P, "assets", "code.mp4");
if (!fs.existsSync(clip)) {
  const frames = Buffer.alloc(W * H * F, 128);
  for (let i = 0; i < F; i++)
    for (let b = 0; b < 10; b++) {
      const v = (i >> b) & 1 ? 255 : 0;
      for (let y = 400; y < 680; y++) frames.fill(v, i * W * H + y * W + 60 + b * 180, i * W * H + y * W + 60 + b * 180 + 160);
    }
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", `${W}x${H}`, "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-crf", "10", "-g", "1", "-pix_fmt", "yuv420p", clip], { input: frames, maxBuffer: 1 << 30 });
  if (r.status) throw new Error(r.stderr.toString());
}

fs.writeFileSync(
  path.join(P, "custom-scenes", "sync.js"),
  `(function () {
  EM.scene("sync-blank", { ownsCamera: true, build() {} });
  EM.scene("sync-vid", { ownsCamera: true, build(ctx) {
    const { start, end, props: p } = ctx; const S = window.EM_SLOW || 1; const t0 = Math.max(0, start - 0.3);
    const v = EM.video({ id: "sv-" + ctx.index, src: p.src, muted: "", playsinline: "", "data-start": (t0 * S).toFixed(4), "data-duration": ((end - t0) * S).toFixed(4), "data-media-start": Math.max(0, p.mediaStart - (start - t0)).toFixed(3), "data-playback-rate": (1 / S).toFixed(5) });
    Object.assign(v.style, { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" });
    ctx.cam.appendChild(v);
  } });
})();\n`
);
fs.writeFileSync(
  path.join(P, "storyboard.json"),
  JSON.stringify({ beats: [], theme: "cinematic", duration: 4.5, background: "auto", vo: { words: [] }, scenes: [
    { id: "a", type: "sync-blank", start: 0, duration: START, camera: "static", props: {} },
    { id: "b", type: "sync-vid", start: START, duration: 3.5, camera: "static", props: { src: "assets/code.mp4", mediaStart: MS } },
  ] })
);
const brand = path.join(P, "brand.json");
if (!fs.existsSync(brand)) fs.writeFileSync(brand, JSON.stringify({ name: "synccheck", accent: "#00E67E" }));

const cli = path.join(ROOT, "bin", "eden-motion.mjs");
const renderArgs = [cli, "render", "_synccheck", "--fps", "60", ...(draft ? ["--draft"] : ["--uniform", "--slow", String(slow)])];
console.log(`rendering ${draft ? "draft" : `slow x${slow}`}...`);
if (!args.includes("--decode-only")) {
  const rr = spawnSync("node", renderArgs, { stdio: "inherit" });
  if (rr.status) process.exit(rr.status);
}

const out = path.join(P, "renders", draft ? "draft.mp4" : "final.mp4");
const raw = spawnSync("ffmpeg", ["-v", "error", "-i", out, "-vf", "scale=1920:1080,format=gray", "-f", "rawvideo", "-"], { maxBuffer: 2 ** 31 }).stdout;
const n = raw.length / (W * H);
const diffs = [];
for (let k = 0; k < n; k++) {
  const t = k / 60;
  if (t < START + 0.05 || t > START + 3.4) continue;
  let idx = 0, lo = 255, hi = 0;
  for (let b = 0; b < 10; b++) {
    let s = 0, c = 0;
    for (let y = 500; y < 580; y += 4) for (let x = 60 + b * 180 + 40; x < 60 + b * 180 + 120; x += 4) (s += raw[k * W * H + y * W + x]), c++;
    const m = s / c;
    lo = Math.min(lo, m);
    hi = Math.max(hi, m);
    if (m > 128) idx |= 1 << b;
  }
  if (hi - lo < 60) continue;
  diffs.push(idx - (MS + (t - START)) * 60);
}
const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
const drift = diffs.length > 1 ? (diffs.at(-1) - diffs[0]) / ((diffs.length - 1) / 60) : 0;
console.log(`frames checked ${diffs.length}, offset mean ${mean.toFixed(2)} frames, drift ${drift.toFixed(2)} frames/s`);
console.log(Math.abs(mean) < 1.5 && Math.abs(drift) < 0.5 ? "SYNC OK" : "SYNC BROKEN");

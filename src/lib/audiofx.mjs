// Small audio analysis without Python: decode with ffmpeg, spectral-flux-ish onset envelope,
// autocorrelation tempo, phase search for the beat grid, and per-file peak times.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SR = 11025;
const HOP = 256; // ~23 ms

function decode(file, seconds) {
  const args = ["-v", "error", "-i", file, ...(seconds ? ["-t", String(seconds)] : []), "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"];
  const r = spawnSync("ffmpeg", args, { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error("ffmpeg decode failed: " + r.stderr?.toString().slice(-200));
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength / 4);
}

function onsetEnvelope(x) {
  const n = Math.floor(x.length / HOP);
  const env = new Float32Array(n);
  let prevLow = 0, prevHigh = 0;
  for (let i = 0; i < n; i++) {
    let low = 0, high = 0, last = 0;
    for (let j = i * HOP; j < (i + 1) * HOP; j++) {
      const v = x[j];
      low += v * v;
      const d = v - last;
      high += d * d; // crude high-pass energy = transients
      last = v;
    }
    const f = Math.max(0, Math.log1p(low * 50) - Math.log1p(prevLow * 50)) + 2 * Math.max(0, Math.log1p(high * 50) - Math.log1p(prevHigh * 50));
    env[i] = f;
    prevLow = low;
    prevHigh = high;
  }
  return env;
}

// Returns { bpm, period, beats:[s], onsets:[{t,v}] }.
export function beatGrid(file, { minBpm = 80, maxBpm = 160 } = {}) {
  const env = onsetEnvelope(decode(file));
  const fps = SR / HOP;
  let best = { lag: 0, score: -1 };
  for (let bpm = minBpm; bpm <= maxBpm; bpm += 0.5) {
    const lag = (60 / bpm) * fps;
    let s = 0;
    for (let i = 0; i + lag * 2 < env.length; i++) s += env[i] * (env[Math.round(i + lag)] + 0.5 * env[Math.round(i + 2 * lag)]);
    s *= Math.exp(-0.5 * (Math.log2(bpm / 115) / 0.45) ** 2); // tempo prior: product films live around 90-130 BPM
    if (s > best.score) best = { lag, score: s, bpm };
  }
  const period = best.lag / fps;
  // phase: offset that maximises onset energy on the grid
  let bestPhase = 0, bestSum = -1;
  for (let p = 0; p < best.lag; p += 0.5) {
    let s = 0;
    for (let k = p; k < env.length; k += best.lag) s += env[Math.round(k)] || 0;
    if (s > bestSum) (bestSum = s), (bestPhase = p);
  }
  const beats = [];
  for (let k = bestPhase; k < env.length; k += best.lag) beats.push(+(k / fps).toFixed(3));
  const onsets = [];
  for (let i = 1; i < env.length - 1; i++) if (env[i] > env[i - 1] && env[i] >= env[i + 1] && env[i] > 0.5) onsets.push({ t: +(i / fps).toFixed(3), v: +env[i].toFixed(3) });
  return { bpm: best.bpm, period: +period.toFixed(4), beats, onsets };
}

// Time (s) of the loudest sample: an SFX should be placed so its PEAK lands on the event.
const peakCache = new Map();
export function peakTime(file) {
  if (peakCache.has(file)) return peakCache.get(file);
  const x = decode(file, 4);
  let m = 0, at = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    if (a > m) (m = a), (at = i);
  }
  const t = at / SR;
  peakCache.set(file, t);
  return t;
}

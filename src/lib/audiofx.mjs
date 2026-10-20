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

// Key of a music file (so a code-composed sting does not clash with it): Goertzel energy of every
// semitone over 4 octaves (C2-B5), folded into 12 pitch classes, correlated with the Krumhansl-
// Kessler major/minor profiles. Returns { key: "D", mode: "major"|"minor", confidence }.
const KK_MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KK_MIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export function estimateKey(file, { seconds = 30 } = {}) {
  const x = decode(file, seconds);
  const chroma = new Array(12).fill(0);
  for (let midi = 36; midi < 84; midi++) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const w = (2 * Math.PI * f) / SR, c = 2 * Math.cos(w);
    // blocks of 0.5 s so a long file does not smear phase; sum magnitudes
    const B = Math.floor(SR / 2);
    let e = 0;
    for (let s = 0; s + B <= x.length; s += B) {
      let s1 = 0, s2 = 0;
      for (let i = s; i < s + B; i++) {
        const s0 = x[i] + c * s1 - s2;
        s2 = s1;
        s1 = s0;
      }
      e += Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - c * s1 * s2));
    }
    chroma[midi % 12] += e;
  }
  const corr = (a, b) => {
    const ma = a.reduce((p, v) => p + v, 0) / 12, mb = b.reduce((p, v) => p + v, 0) / 12;
    let n = 0, da = 0, db = 0;
    for (let i = 0; i < 12; i++) (n += (a[i] - ma) * (b[i] - mb)), (da += (a[i] - ma) ** 2), (db += (b[i] - mb) ** 2);
    return n / Math.sqrt(da * db || 1);
  };
  let best = { r: -2 };
  for (let k = 0; k < 12; k++) {
    const rot = chroma.slice(k).concat(chroma.slice(0, k));
    for (const [mode, prof] of [["major", KK_MAJ], ["minor", KK_MIN]]) {
      const r = corr(rot, prof);
      if (r > best.r) best = { r, key: NAMES[k], mode };
    }
  }
  return { key: best.key, mode: best.mode, confidence: +best.r.toFixed(3) };
}

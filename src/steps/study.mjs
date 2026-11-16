// study: learn a style from reference films by measuring them, not by describing them.
//
//   eden-motion study <style> <film|url|folder|list.txt> [...]   -> styles/<style>/profile.json
//   eden-motion study <style> --against <slug|video>              -> how far a film is from it
//
// Each film is measured with the HyperFrames measure tools (cuts, events, audio) plus a per-shot
// brightness read: shot lengths and rhythm, metronome grid, flashes, how often something new
// happens, holds, polarity flips between shots, cuts on the beat, the overall look. The profile
// keeps the spread across films (p25, median, p75), so a rule is a range the references agree on.
// The same metrics on our own render give a distance per axis: the rules and the check come from
// one measurement, so a new reference film sharpens both.
//
// Only numbers are stored. Downloaded films stay in .cache/study/ (gitignored).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { HF } from "../lib/hf.mjs";
import { log, warn, readJSON, writeJSON, run } from "../lib/util.mjs";
import { REPO } from "../lib/env.mjs";
import { metronome } from "./ref.mjs";

const VIDEO = /\.(mp4|mov|webm|m4v|mkv)$/i;

function hfJSON(args) {
  const r = spawnSync("npx", [...HF, ...args, "--json"], { encoding: "utf8", maxBuffer: 2 ** 28 });
  try {
    return JSON.parse(r.stdout);
  } catch {
    throw new Error(`hyperframes ${args.slice(0, 2).join(" ")} gave no JSON: ${(r.stderr || r.stdout || "").slice(-300)}`);
  }
}

// files, folders of films, list files (one url or path per line) and urls -> local video paths
function resolveSources(sources, cacheDir) {
  const out = [];
  const take = (src) => {
    if (/^https?:\/\//.test(src)) {
      fs.mkdirSync(cacheDir, { recursive: true });
      const name = src.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "_").slice(-80);
      const file = path.join(cacheDir, `${name}.mp4`);
      if (!fs.existsSync(file)) {
        const r = run("yt-dlp", ["-q", "--no-warnings", "-f", "bv*[height<=1080]+ba/b[height<=1080]/b", "--merge-output-format", "mp4", "-o", file, src], { allowFail: true });
        if (r.status !== 0 || !fs.existsSync(file)) return warn(`could not download ${src}`);
      }
      return out.push({ file, source: src });
    }
    if (!fs.existsSync(src)) return warn(`not found: ${src}`);
    if (fs.statSync(src).isDirectory()) return fs.readdirSync(src).filter((f) => VIDEO.test(f)).sort().forEach((f) => out.push({ file: path.join(src, f), source: f }));
    if (/\.txt$/i.test(src)) return fs.readFileSync(src, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).forEach(take);
    out.push({ file: path.resolve(src), source: path.basename(src) });
  };
  sources.forEach(take);
  return out;
}

const q = (arr, p) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b), i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
};
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const r3 = (v) => (v == null || !Number.isFinite(v) ? null : +v.toFixed(3));

// mean grey level of one frame, read small
function lumaAt(file, t) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", "scale=64:36,format=gray", "-f", "rawvideo", "-"], { maxBuffer: 2 ** 20 });
  const b = r.stdout;
  if (!b || !b.length) return null;
  let s = 0;
  for (const v of b) s += v;
  return s / b.length;
}

export function measureFilm(file) {
  const cuts = hfJSON(["measure", "cuts", file]);
  const duration = cuts.end - cuts.start;
  const shots = (cuts.shots || []).map((s) => s.seconds).filter((s) => s > 0);
  const cutTimes = (cuts.cuts || []).map((c) => c.t);
  const grid = metronome([0, ...cutTimes]);
  const gaps = [0, ...cutTimes].slice(1).map((t, i) => t - [0, ...cutTimes][i]);
  const onGrid = grid ? gaps.filter((g) => Math.abs(g / grid - Math.round(g / grid)) < 0.08).length / Math.max(1, gaps.length) : 0;

  const ev = hfJSON(["measure", "events", file]);
  const events = (ev.events || []).filter((e) => e.type !== "hold");
  const holds = (ev.events || []).filter((e) => e.type === "hold").map((e) => e.seconds || 0);

  // brightness per shot: how often a cut flips the world from dark to light (or back)
  const lumas = (cuts.shots || []).map((s) => lumaAt(file, (s.start + s.end) / 2)).filter((v) => v != null);
  let flips = 0;
  for (let i = 1; i < lumas.length; i++) if (Math.abs(lumas[i] - lumas[i - 1]) > 80) flips++;
  const darkShare = lumas.length ? lumas.filter((v) => v < 64).length / lumas.length : null;

  const look = hfJSON(["measure", "look", file]);

  // the music: cuts within one frame and a half of a beat; with no steady beat, of a strong onset
  let bpm = null, beatConf = 0, onBeat = null, onOnset = null;
  try {
    const a = hfJSON(["audio", file, "--only", "beats,bpm,onsets", "--quality", "local"]).items[0];
    bpm = a.bpm && a.bpm.value;
    beatConf = (a.beats && a.beats.confidence) || 0;
    const tol = 1.5 / (cuts.fps || 30);
    const near = (ts) => (cutTimes.length ? cutTimes.filter((c) => ts.some((t) => Math.abs(t - c) <= tol)).length / cutTimes.length : null);
    const beats = (a.beats && a.beats.times) || [];
    if (beats.length && beatConf >= 0.3) onBeat = near(beats);
    const strong = ((a.onsets && a.onsets.events) || []).filter((o) => o.strength >= 0.35).map((o) => o.t);
    onOnset = near(strong);
  } catch (e) {
    warn(`audio not measured: ${e.message.slice(0, 120)}`);
  }

  return {
    duration: r3(duration),
    fps: cuts.fps,
    shots: shots.length,
    shotMedian: r3(q(shots, 0.5)),
    shotP10: r3(q(shots, 0.1)),
    shotP90: r3(q(shots, 0.9)),
    shotCV: r3(shots.length > 1 ? Math.sqrt(mean(shots.map((s) => (s - mean(shots)) ** 2))) / mean(shots) : 0),
    cutsPer10s: r3((cutTimes.length / duration) * 10),
    metronome: grid ? r3(grid) : null,
    onGrid: r3(onGrid),
    flashesPerMin: r3(((cuts.not_cuts || []).length / duration) * 60),
    eventsPerSec: r3(events.length / duration),
    holdShare: r3(holds.reduce((a, b) => a + b, 0) / duration),
    longestHold: r3(holds.length ? Math.max(...holds) : 0),
    polarityFlips: r3(lumas.length > 1 ? flips / (lumas.length - 1) : 0),
    darkShare: r3(darkShare),
    luma: look.luma,
    contrast: look.contrast,
    saturation: look.saturation,
    bwShare: look.bw_share,
    warmth: look.warmth,
    bpm: bpm ? r3(bpm) : null,
    beatConfidence: r3(beatConf),
    cutsOnBeat: r3(onBeat),
    cutsOnOnset: r3(onOnset),
    _shots: shots.map((s) => r3(s)),
  };
}

// what each axis means, for the profile and the storyboard prompt
export const AXES = {
  shotMedian: "median shot length (s)",
  shotP90: "long shots, 90th percentile (s)",
  shotCV: "shot length variation (std / mean)",
  cutsPer10s: "cuts per 10 s",
  onGrid: "share of cuts on a metronome grid",
  flashesPerMin: "flashes and whips per minute",
  eventsPerSec: "something new on screen per second",
  holdShare: "share of the film held still",
  longestHold: "longest still hold (s)",
  polarityFlips: "cuts that flip dark and light",
  darkShare: "share of dark shots",
  luma: "mean brightness (0-255)",
  contrast: "contrast",
  saturation: "saturation",
  cutsOnBeat: "cuts on a music beat",
  cutsOnOnset: "cuts on a strong sound onset",
};

// Axes about the edit only mean something for films that are edited: a 5 s single-shot loop
// says nothing about shot length or cutting on the beat, but its look still counts.
const EDIT_AXES = new Set(["shotMedian", "shotP90", "shotCV", "cutsPer10s", "onGrid", "polarityFlips", "darkShare", "cutsOnBeat", "cutsOnOnset"]);
export const MIN_SHOTS = 4;

function aggregate(films) {
  const axes = {};
  for (const k of Object.keys(AXES)) {
    const pool = EDIT_AXES.has(k) ? films.filter((f) => f.metrics.shots >= MIN_SHOTS) : films;
    const v = pool.map((f) => f.metrics[k]).filter((x) => x != null && Number.isFinite(x));
    if (v.length) axes[k] = { p25: r3(q(v, 0.25)), median: r3(q(v, 0.5)), p75: r3(q(v, 0.75)), min: r3(Math.min(...v)), max: r3(Math.max(...v)), n: v.length };
  }
  const pooled = films.filter((f) => f.metrics.shots >= MIN_SHOTS).flatMap((f) => f.metrics._shots || []);
  const grids = films.map((f) => f.metrics.metronome).filter(Boolean);
  return {
    axes,
    edited: films.filter((f) => f.metrics.shots >= MIN_SHOTS).length,
    shotLengths: { p10: r3(q(pooled, 0.1)), p25: r3(q(pooled, 0.25)), median: r3(q(pooled, 0.5)), p75: r3(q(pooled, 0.75)), p90: r3(q(pooled, 0.9)), n: pooled.length },
    metronome: grids.length ? { median: r3(q(grids, 0.5)), films: grids.length } : null,
  };
}

function profileMarkdown(name, prof) {
  const rows = Object.entries(prof.axes).map(([k, a]) => `| ${AXES[k]} | ${a.p25} | ${a.median} | ${a.p75} | ${a.n} |`);
  const films = prof.films.map((f) => `- ${f.source} (${f.metrics.duration} s, ${f.metrics.shots} shots${f.metrics.metronome ? `, grid ${f.metrics.metronome} s` : ""})`);
  return `# ${name}: measured style profile\n\n${prof.films.length} reference films, measured ${prof.created.slice(0, 10)} with HyperFrames ${prof.hyperframes}.\nEdit axes (shots, cuts, polarity, beat) come from the ${prof.edited} films with at least ${MIN_SHOTS} shots; look axes from all. A rule is the p25 to p75 range the films agree on. Regenerate with \`eden-motion study ${name} <films...>\`.\n\n| axis | p25 | median | p75 | films |\n|---|---|---|---|---|\n${rows.join("\n")}\n\nAll shots pooled: p10 ${prof.shotLengths.p10} s, median ${prof.shotLengths.median} s, p90 ${prof.shotLengths.p90} s (${prof.shotLengths.n} shots).${prof.metronome ? ` Metronome grid in ${prof.metronome.films} films, median ${prof.metronome.median} s.` : ""}\n\n## Films\n${films.join("\n")}\n`;
}

export function profilePath(name) {
  return path.join(REPO, "styles", name, "profile.json");
}

export async function study(name, sources, { against, keepShots = false } = {}) {
  if (!name) throw new Error("usage: eden-motion study <style> <films...> | eden-motion study <style> --against <slug|video>");
  if (against) return distance(name, against);
  const files = resolveSources(sources, path.join(REPO, ".cache", "study", name));
  if (!files.length) throw new Error("no films to study");
  const films = [];
  for (const [i, f] of files.entries()) {
    log(`study ${name}: ${i + 1}/${files.length} ${path.basename(f.file)}`);
    // measured once per file: a cached reading is reused while the file is unchanged
    const st = fs.statSync(f.file);
    const cache = path.join(REPO, ".cache", "study", name, "metrics", `${path.basename(f.file)}.${st.size}.${Math.round(st.mtimeMs)}.json`);
    try {
      const metrics = fs.existsSync(cache) ? readJSON(cache) : measureFilm(f.file);
      writeJSON(cache, metrics);
      films.push({ source: f.source, metrics });
    } catch (e) {
      warn(`skipped ${f.source}: ${e.message.slice(0, 160)}`);
    }
  }
  const prof = { style: name, created: new Date().toISOString(), hyperframes: HF[1].split("@")[1], ...aggregate(films), films };
  if (!keepShots) prof.films.forEach((f) => delete f.metrics._shots);
  const out = profilePath(name);
  writeJSON(out, prof);
  fs.writeFileSync(out.replace(/\.json$/, ".md"), profileMarkdown(name, prof));
  log(`profile -> ${path.relative(REPO, out)} (${films.length} films, ${Object.keys(prof.axes).length} axes)`);
  return prof;
}

// How far one film is from a profile, axis by axis: inside the references' p25-p75 is on style,
// inside their min-max is plausible, outside is off. The score is the share of axes on style.
export function compareToProfile(metrics, prof) {
  const rows = [];
  for (const [k, a] of Object.entries(prof.axes)) {
    const v = metrics[k];
    if (v == null) continue;
    const span = Math.max(1e-6, a.p75 - a.p25);
    const state = v >= a.p25 && v <= a.p75 ? "on" : v >= a.min && v <= a.max ? "near" : "off";
    const off = v < a.p25 ? (a.p25 - v) / span : v > a.p75 ? (v - a.p75) / span : 0;
    rows.push({ axis: k, label: AXES[k], value: v, p25: a.p25, median: a.median, p75: a.p75, state, off: r3(off) });
  }
  const on = rows.filter((r) => r.state === "on").length;
  return { score: r3(on / Math.max(1, rows.length)), on, near: rows.filter((r) => r.state === "near").length, off: rows.filter((r) => r.state === "off").length, rows: rows.sort((a, b) => b.off - a.off) };
}

function distance(name, target) {
  const file = profilePath(name);
  if (!fs.existsSync(file)) throw new Error(`no profile for "${name}": run eden-motion study ${name} <films...> first`);
  const prof = readJSON(file);
  let video = target, outDir = null;
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    const proj = fs.existsSync(target) ? target : path.join(REPO, "projects", target);
    video = ["final.mp4", "draft.mp4"].map((f) => path.join(proj, "renders", f)).find((f) => fs.existsSync(f));
    if (!video) throw new Error(`no render in ${proj}/renders`);
    outDir = path.join(proj, "renders");
  }
  const res = { style: name, video, ...compareToProfile(measureFilm(video), prof) };
  if (outDir) writeJSON(path.join(outDir, `study-${name}.json`), res);
  log(`${path.basename(video)} vs ${name}: ${res.on} of ${res.rows.length} axes on style (score ${res.score}), ${res.near} near, ${res.off} off`);
  for (const r of res.rows.filter((r) => r.state !== "on")) log(`  ${r.state.padEnd(4)} ${r.label}: ${r.value} (references ${r.p25}-${r.p75}, median ${r.median})`);
  return res;
}

// For the storyboard prompt: the measured ranges in plain words.
export function profilePrompt(name) {
  const file = profilePath(name);
  if (!fs.existsSync(file)) return "";
  const p = readJSON(file);
  const a = p.axes, line = (k, unit = "") => (a[k] ? `${AXES[k]} ${a[k].p25}-${a[k].p75}${unit} (median ${a[k].median}${unit})` : null);
  const parts = [line("shotMedian"), line("cutsPer10s"), line("eventsPerSec"), line("polarityFlips"), line("darkShare"), line("holdShare"), line("longestHold"), line("cutsOnOnset")].filter(Boolean);
  return `MEASURED FROM ${p.films.length} REFERENCE FILMS OF THIS STYLE (keep the film inside these ranges): ${parts.join("; ")}.${p.metronome ? ` ${p.metronome.films} of them cut on a metronome grid, median ${p.metronome.median} s.` : ""}`;
}

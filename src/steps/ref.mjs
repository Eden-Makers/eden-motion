// ref: direct from a reference film. Without one the model falls back to its default look
// (centred text, gradient background, everything fading in). A reference supplies pacing, type
// behaviour, transitions and camera. Accepts a URL (YouTube, Vimeo, X, whatships.com, any
// yt-dlp source) or a local file; appends measured style notes to research/ref-style.md, which
// the storyboard step injects into its prompt.
import fs from "node:fs";
import path from "node:path";
import { analyzeMedia, uploadFile, generateText, MODELS } from "../lib/gemini.mjs";
import { log, warn, run, parseRanges, rangeTag } from "../lib/util.mjs";

function fetchRef(src, dir, n) {
  if (fs.existsSync(src)) return path.resolve(src);
  const out = path.join(dir, `ref-${n}.mp4`);
  if (fs.existsSync(out)) return out;
  const base = ["-f", "bv*[height<=1080]+ba/b[height<=1080]/b", "--merge-output-format", "mp4", "-o", out, src];
  let r = run("yt-dlp", base, { allowFail: true });
  if (r.status !== 0) r = run("yt-dlp", ["--cookies-from-browser", "chrome", ...base], { allowFail: true });
  if (r.status !== 0 || !fs.existsSync(out)) throw new Error("could not download reference: " + (r.stderr || "").slice(-300));
  return out;
}

// A metronome edit (Relate: one cut every 24 frames) shows as cut gaps that are near-integer
// multiples of one base interval. Returns that interval in seconds or null.
export function metronome(times) {
  const gaps = times.slice(1).map((t, i) => t - times[i]).filter((g) => g > 0.2);
  if (gaps.length < 5) return null;
  for (const base of [...new Set(gaps.map((g) => +g.toFixed(3)))].sort((a, b) => a - b)) {
    if (base < 0.3) continue;
    const fit = gaps.filter((g) => Math.abs(g / base - Math.round(g / base)) < 0.08).length / gaps.length;
    if (fit > 0.8) return base;
  }
  return null;
}

// A moment of a reference (--at 0:04-0:08): the exact seconds cut out, every frame of them on a sheet,
// and a frame-by-frame reading of that span. A time code in a note is a copy instruction, so the
// moment is studied at full frame rate, not at the every-4th-frame the whole-film pass sees.
export async function refMoments(file, n, at, dir, { noAi = false } = {}) {
  const fps = (() => { const [x, y] = run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", file]).stdout.trim().split("/"); return +x / (+y || 1); })();
  const notes = [];
  for (const r of parseRanges(at)) {
    const tag = rangeTag(r);
    const cutFile = path.join(dir, `ref-${n}-${tag}.mp4`);
    run("ffmpeg", ["-v", "error", "-y", "-ss", String(r.a), "-i", file, "-t", String(r.b - r.a), "-an", "-c:v", "libx264", "-crf", "12", "-g", "1", "-pix_fmt", "yuv420p", cutFile]);
    const frames = Math.round((r.b - r.a) * fps);
    const cols = 8, rows = Math.ceil(frames / cols);
    const sheet = path.join(dir, `ref-${n}-${tag}-frames.jpg`);
    run("ffmpeg", ["-v", "error", "-y", "-i", cutFile, "-vf", `scale=320:-1,tile=${cols}x${rows}`, "-frames:v", "1", "-q:v", "3", sheet]);
    log(`moment ${r.a}-${r.b} s: ${frames} frames at ${fps.toFixed(2)} fps -> ${path.basename(sheet)}`);
    if (noAi) continue;
    try {
      const parts = [await uploadFile(cutFile), await uploadFile(sheet)];
      const txt = await generateText(
        `This is a ${(r.b - r.a).toFixed(2)} s moment cut from a reference film (${frames} frames at ${fps.toFixed(2)} fps), as a video and as a sheet of EVERY frame (left to right, top to bottom, ${cols} per row; frame 0 is the first tile).
Describe it frame by frame so a motion designer can copy it exactly. A table: frame range | time from the start of the cut (s) | what moves (element, from -> to, px or % of frame width, easing guess) | camera | blur | sound-worthy event.
Then: the order of events, the exact length of every phase, which element is the focus at each moment, how the elements arrive and leave. Measure, do not summarize; say "unclear" instead of guessing. No em dashes or en dashes.`,
        { model: MODELS.vision, parts, temperature: 0.2 }
      );
      notes.push(`\n## Moment ${r.a.toFixed(2)}-${r.b.toFixed(2)} s (${path.basename(cutFile)}, frames ${path.basename(sheet)})\n\n${txt.replace(/[—–]/g, "-")}\n`);
    } catch (e) {
      warn("moment analysis failed: " + e.message.slice(0, 160));
    }
  }
  return notes.join("");
}

export async function ref(projectDir, sources = [], { at } = {}) {
  if (!sources.length) throw new Error("usage: eden-motion ref <slug> <url-or-file> [more...]");
  const dir = path.join(projectDir, "research");
  fs.mkdirSync(dir, { recursive: true });
  const notesFile = path.join(dir, "ref-style.md");
  let n = fs.readdirSync(dir).filter((f) => /^ref-\d+\.mp4$/.test(f)).length;
  for (const src of sources) {
    n++;
    const file = fetchRef(src, dir, n);
    const dur = parseFloat(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).stdout);
    const cutTimes = (run("ffmpeg", ["-i", file, "-vf", "select='gt(scene,0.25)',showinfo", "-f", "null", "-"], { allowFail: true }).stderr.match(/pts_time:[\d.]+/g) || []).map((x) => +x.split(":")[1]);
    const cuts = cutTimes.length;
    const grid = metronome(cutTimes);
    const notes = await analyzeMedia(
      file,
      `You are reverse-engineering this reference film so a motion designer can match its STYLE (not its content) in an HTML/GSAP engine. Measured facts: duration ${dur.toFixed(1)} s, ${cuts} hard cuts (average shot ${(dur / Math.max(1, cuts + 1)).toFixed(2)} s)${grid ? `, cuts lock to a ${grid.toFixed(3)} s grid (metronome edit)` : ""}. Cut times: ${cutTimes.slice(0, 40).map((t) => t.toFixed(2)).join(", ")}.
Write compact markdown with concrete numbers, no fluff:
## Pacing (shot lengths, where it speeds up and slows down, how long holds are)
## Typography (font style, weight, size relative to frame, how words appear: typed/masked/word swap/blur, accent usage)
## Transitions (list each type with frequency and duration: cuts, zooms, blurs, morphs, flashes, pushes)
## Camera (drift, push-ins, 3D tilt, how the camera moves inside UI)
## Colour and background (hex palette, worlds, gradients, grain)
## UI and imagery (product UI treatment, cursor behaviour, AI or stock imagery, device frames)
## Sound (music genre/BPM guess, SFX grammar, sync)
## Rules to copy (8-12 imperative rules a storyboard must follow to feel like this film)
No em dashes or en dashes.`
    );
    const measured = `Measured: ${dur.toFixed(1)} s, ${cuts} cuts at ${cutTimes.map((t) => t.toFixed(2)).join(", ")}${grid ? `\nMETRONOME: cuts lock to a ${grid.toFixed(3)} s grid. Use brief.cutGrid = ${grid.toFixed(3)} (or --style relate).` : ""}`;
    const moments = at ? await refMoments(file, n, at, dir) : "";
    const block = `\n\n# Reference ${n}: ${src}\n\n${measured}\n\n${notes.replace(/[—–]/g, "-")}\n${moments}`;
    fs.appendFileSync(notesFile, block);
    log(`reference ${n} analysed (${dur.toFixed(0)} s, ${cuts} cuts) -> research/ref-style.md`);
  }
  return notesFile;
}

// ref: direct from a reference film. Without one the model falls back to its default look
// (centred text, gradient background, everything fading in). A reference supplies pacing, type
// behaviour, transitions and camera. Accepts a URL (YouTube, Vimeo, X, whatships.com, any
// yt-dlp source) or a local file; appends measured style notes to research/ref-style.md, which
// the storyboard step injects into its prompt.
import fs from "node:fs";
import path from "node:path";
import { analyzeMedia } from "../lib/gemini.mjs";
import { log, run } from "../lib/util.mjs";

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

export async function ref(projectDir, sources = []) {
  if (!sources.length) throw new Error("usage: eden-motion ref <slug> <url-or-file> [more...]");
  const dir = path.join(projectDir, "research");
  fs.mkdirSync(dir, { recursive: true });
  const notesFile = path.join(dir, "ref-style.md");
  let n = fs.readdirSync(dir).filter((f) => /^ref-\d+\.mp4$/.test(f)).length;
  for (const src of sources) {
    n++;
    const file = fetchRef(src, dir, n);
    const dur = parseFloat(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).stdout);
    const cuts = (run("ffmpeg", ["-i", file, "-vf", "select='gt(scene,0.25)',showinfo", "-f", "null", "-"], { allowFail: true }).stderr.match(/pts_time:[\d.]+/g) || []).length;
    const notes = await analyzeMedia(
      file,
      `You are reverse-engineering this reference film so a motion designer can match its STYLE (not its content) in an HTML/GSAP engine. Measured facts: duration ${dur.toFixed(1)} s, ${cuts} hard cuts (average shot ${(dur / Math.max(1, cuts + 1)).toFixed(2)} s).
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
    const block = `\n\n# Reference ${n}: ${src}\n\n${notes.replace(/[—–]/g, "-")}\n`;
    fs.appendFileSync(notesFile, block);
    log(`reference ${n} analysed (${dur.toFixed(0)} s, ${cuts} cuts) -> research/ref-style.md`);
  }
  return notesFile;
}

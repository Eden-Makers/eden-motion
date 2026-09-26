// stills: one settled frame per scene BEFORE anything is rendered in motion. Fixing a storyboard
// on stills takes seconds; fixing it after a render takes minutes. Also a fast Gemini pass that
// flags layout problems per scene (overflow, tiny text, empty frames, wrong logo colour).
import fs from "node:fs";
import path from "node:path";
import { build } from "./build.mjs";
import { generateJSON, inlineImage, MODELS } from "../lib/gemini.mjs";
import { log, run, readJSON, writeJSON } from "../lib/util.mjs";

export async function stills(projectDir, { storyboardFile = "storyboard.json", review = true, tag = "" } = {}) {
  const sbPath = path.join(projectDir, storyboardFile);
  const sb = readJSON(sbPath);
  // build from the requested storyboard (variants live next to storyboard.json)
  const comp = await build(projectDir, { slow: 1, out: "comp-stills", storyboard: sb });
  // settled moment: as late as possible (typing and counters done) but before the outgoing
  // transition starts eating the frame
  const times = sb.scenes.map((s, i) => {
    const nt = sb.scenes[i + 1]?.transition;
    const guard = nt && nt.type && nt.type !== "cut" ? (nt.duration || 0.6) / 2 + 0.06 : 0.12;
    return +Math.max(s.start + s.duration * 0.5, s.start + s.duration - guard).toFixed(2);
  });
  const snapDir = path.join(comp, "snapshots");
  fs.rmSync(snapDir, { recursive: true, force: true });
  run("npx", ["-y", "hyperframes@0.8.72", "snapshot", "--at", times.join(",")], { cwd: comp });
  const out = path.join(projectDir, "renders", "stills" + (tag ? "-" + tag : ""));
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const pngs = fs.readdirSync(snapDir).filter((f) => /^frame-\d+/.test(f)).sort();
  const files = [];
  pngs.slice(0, sb.scenes.length).forEach((f, i) => {
    const dst = path.join(out, `${sb.scenes[i].id}-${sb.scenes[i].type}.jpg`);
    run("ffmpeg", ["-y", "-v", "error", "-i", path.join(snapDir, f), "-vf", "scale=960:-1", "-q:v", "3", dst]);
    files.push(dst);
  });
  const cols = 4, rows = Math.ceil(files.length / cols);
  const sheet = path.join(out, "_sheet.jpg");
  run("ffmpeg", ["-y", "-v", "error", ...files.flatMap((f) => ["-i", f]), "-filter_complex", `${files.map((_, i) => `[${i}:v]scale=480:-1[v${i}]`).join(";")};${files.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`).join("|")}:fill=black`, "-frames:v", "1", sheet], { allowFail: true });
  log(`stills: ${files.length} frames -> ${out} (sheet ${rows}x${cols})`);

  if (!review) return { dir: out, files };
  const verdict = await generateJSON(
    `These are settled still frames, one per scene, of a motion-graphics brand film (order = scene order: ${sb.scenes.map((s) => `${s.id} ${s.type}`).join(", ")}).
Judge each like an art director reviewing a storyboard: is the key object centred and readable, does the shot have space to breathe (one shot = one idea), any text overflow/clipping/overlap, text smaller than ~24 px at 1080p, empty or half-empty frame, logo invisible against the background, off-brand colours, cheap-looking stock imagery.
Return ONLY JSON {"overall": "one sentence", "scenes": [{"id": "s1", "ok": true|false, "issue": "concrete problem or empty", "fix": "concrete prop/layout change or empty"}]}`,
    { model: MODELS.vision, parts: files.map(inlineImage), temperature: 0.2 }
  );
  writeJSON(path.join(out, "review.json"), verdict);
  const bad = (verdict.scenes || []).filter((s) => !s.ok);
  log(`stills review: ${verdict.overall}`);
  bad.forEach((s) => log(`  [${s.id}] ${s.issue} -> ${s.fix}`));
  return { dir: out, files, verdict };
}

// qc: Gemini watches the render like a creative director and returns timestamped issues
// scored against the reference DNA. The harness agent (Claude Code / Codex) reads qc.json,
// fixes storyboard props or scene code, and re-renders. Also writes a contact sheet.
import fs from "node:fs";
import path from "node:path";
import { analyzeMedia } from "../lib/gemini.mjs";
import { log, readJSON, writeJSON, run } from "../lib/util.mjs";

export async function qc(projectDir, { file } = {}) {
  const renders = path.join(projectDir, "renders");
  file = file || ["final.mp4", "draft.mp4"].map((f) => path.join(renders, f)).find((f) => fs.existsSync(f));
  if (!file) throw new Error("No render found. Run render first.");
  const sb = readJSON(path.join(projectDir, "storyboard.json"));
  const brand = readJSON(path.join(projectDir, "brand.json"), {});

  // contact sheet: 1 frame per second, 6 columns
  const sheet = path.join(renders, "contact-sheet.jpg");
  run("ffmpeg", ["-y", "-v", "error", "-i", file, "-vf", "fps=1,scale=480:-1,tile=6x" + Math.ceil(sb.duration / 6), "-frames:v", "1", "-q:v", "4", sheet], { allowFail: true });

  const report = await analyzeMedia(
    file,
    `You are the creative director at a top motion studio (Burnwe, Buck, Anyway Studio). Review this ${sb.duration.toFixed(0)} s brand film for ${brand.name}.
It must match premium SaaS explainer / launch film standards:
- every arrival is a focus pull or purposeful move, nothing pops without easing, no overshoot bounce
- the camera never sits dead still; transitions are motivated; motion blur on fast moves
- typography: clean hierarchy, text never too small (min ~24px at 1080p), never overlapping, never clipped at frame edges, never unreadably fast
- the VO and on-screen events are in sync; each shot holds one clause
- brand consistency: one accent colour used as a highlighter, logo correct and not distorted
- no empty frames, no broken layouts, no placeholder text, no visual glitches or flicker
- sound: music bed under VO, SFX on transitions and clicks, balanced levels, music ends cleanly

IMPORTANT context so you do not report false positives: headlines are revealed by a typewriter (characters appear one by one, the newest in the accent colour), so a partially typed line mid-animation is intentional, not clipping. Only report clipping if the fully typed, settled text is cut by the frame edge or its container. Cards and elements arrive with a deliberate blur-to-sharp focus pull. kinetic-type scenes in "single" mode intentionally show ONE giant word at a time swapped on each spoken word (Lovable style), so a single word on screen is not missing text.

Storyboard for reference (scene type + time window): ${JSON.stringify(sb.scenes.map((s) => ({ t: `${s.start.toFixed(1)}-${(s.start + s.duration).toFixed(1)}`, type: s.type, vo: s.vo })))}

Return ONLY JSON:
{"score": 0-100 overall vs a real agency film, "verdict":"one sentence",
 "scores":{"motion":0-10,"typography":0-10,"layout":0-10,"sync":0-10,"brand":0-10,"sound":0-10,"story":0-10},
 "issues":[{"t":"mm:ss","scene":"s<n> if known","severity":"high|medium|low","problem":"what is wrong, concrete","fix":"specific change (props, timing, scene type, or design)"}],
 "best_moments":["mm:ss what works"]}`,
    { json: true }
  );
  writeJSON(path.join(renders, "qc.json"), report);
  log(`QC score ${report.score}/100: ${report.verdict}`);
  for (const i of (report.issues || []).filter((x) => x.severity === "high")) log(`  [HIGH ${i.t}] ${i.problem} -> ${i.fix}`);
  return report;
}

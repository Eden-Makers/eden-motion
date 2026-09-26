// note: director notes in plain language ("slow every zoom to 0.7x", "hard cut into s5",
// "push in on the button in s9", "make the stat bigger") applied to storyboard.json. Camera words
// map to exact fields; vague notes are rejected with a question instead of random changes.
// Every applied note is logged to notes.log.jsonl so a session can be replayed or audited.
import fs from "node:fs";
import path from "node:path";
import { generateJSON } from "../lib/gemini.mjs";
import { SCENES, TRANSITIONS } from "../lib/catalog.mjs";
import { log, warn, readJSON, writeJSON, deepNoDashes } from "../lib/util.mjs";

export async function note(projectDir, text) {
  if (!text) throw new Error('usage: eden-motion note <slug> "slow every zoom to 0.7x; hard cut into s5"');
  const file = path.join(projectDir, "storyboard.json");
  const sb = readJSON(file);
  const slim = { cameraSpeed: sb.cameraSpeed ?? 1, transitionSpeed: sb.transitionSpeed ?? 1, scenes: sb.scenes.map(({ id, type, start, duration, tone, transition, camera, props, vo }) => ({ id, type, start, duration, tone, transition, camera, props, vo })) };
  const res = await generateJSON(
    `You apply a film director's notes to a motion-graphics storyboard. Change ONLY what the notes ask for.
NOTES: ${text}

Controls you can use:
- film level: "cameraSpeed" (multiplier on the perpetual camera drift and pushes, default 1; "slow every zoom to 0.7x" -> 0.7), "transitionSpeed" (multiplier on transition durations: 0.7 = faster, 1.4 = slower).
- scene level: "camera": "push" (emphasis push-in) | "pull" | "static" | null (auto drift); "transition": {"type": one of ${Object.keys(TRANSITIONS).join(", ")}, "duration": 0.2-0.8, opts} or null (= hard cut); "tone"; "type" (swap scene type, then rewrite props to that type's schema); "props" edits.
- punch-in on an element: use transition {"type":"punch-in","x":px,"y":px} on the NEXT scene, or camera "push" on the scene itself.
- Timing (start/duration) is locked to the voiceover: never change it.
Scene schemas: ${JSON.stringify(Object.fromEntries(Object.entries(SCENES).map(([k, v]) => [k, v.slice(0, 220)])))}

STORYBOARD: ${JSON.stringify(slim)}

If a note is too vague to act on (e.g. "make it better"), do not guess: put it in "questions".
Return ONLY JSON {"cameraSpeed": n, "transitionSpeed": n, "changes": [{"id": "s3", "set": {"camera": "push", "transition": {...} | null, "props": {...full props...}, "type": "...", "tone": "..."}}], "questions": ["..."], "summary": "one line"}`,
    { temperature: 0.2 }
  );
  const byId = new Map(sb.scenes.map((s) => [s.id, s]));
  for (const c of res.changes || []) {
    const s = byId.get(c.id);
    if (!s) continue;
    for (const [k, v] of Object.entries(c.set || {})) {
      if (["start", "duration", "id"].includes(k)) continue;
      if (v === null && (k === "transition" || k === "camera")) delete s[k];
      else s[k] = v;
    }
  }
  if (res.cameraSpeed) sb.cameraSpeed = res.cameraSpeed;
  if (res.transitionSpeed) sb.transitionSpeed = res.transitionSpeed;
  writeJSON(file, deepNoDashes(sb));
  fs.appendFileSync(path.join(projectDir, "notes.log.jsonl"), JSON.stringify({ t: new Date().toISOString(), note: text, summary: res.summary, changes: res.changes, questions: res.questions }) + "\n");
  log(`note applied: ${res.summary} (${(res.changes || []).length} scene changes, cameraSpeed ${sb.cameraSpeed ?? 1}, transitionSpeed ${sb.transitionSpeed ?? 1})`);
  (res.questions || []).forEach((q) => warn("question: " + q));
  return res;
}

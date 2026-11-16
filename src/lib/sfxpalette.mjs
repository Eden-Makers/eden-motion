// Sound palette by role, for engine cues and clip events (clips/<clip>_events.json).
// Order per role: the generated UI palette (sfx-library/gen, ElevenLabs sound-generation, soft and warm on
// purpose), then the bundled library, then the house library (`sfx search --json`, --sfx-source house).
// Missing generated sounds are made once (max 6 at a time) and cached in sfx-library/gen for every film.
// The cache is local (gitignored): seed it by hand with any approved sound named <role>-<n>.mp3.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { sfx as elSfx } from "./eleven.mjs";
import { key } from "./env.mjs";
import { REPO } from "./env.mjs";
import { log, warn } from "./util.mjs";

const LIB = path.join(REPO, "sfx-library");
const GEN = path.join(LIB, "gen");

// The event vocabulary (runtime/SCENE_API.md "Sound events"). layer = stem; db = default gain before
// the event's own gain; align "start" puts the onset on the event, "peak" the loudest point;
// maxdur trims long tails (a sub or a hit must not ring under the next line).
export const ROLES = {
  click: { layer: "sfx_ui", db: -4, align: "start" },
  key: { layer: "sfx_ui", db: -3, align: "peak" },
  type: { layer: "sfx_ui", db: -18, align: "start", sound: "tick" },
  tick: { layer: "sfx_ui", db: -16, align: "start" },
  pop: { layer: "sfx_ui", db: -9, align: "start" },
  send: { layer: "sfx_ui", db: -6, align: "start" },
  pulse: { layer: "sfx_ui", db: -6, align: "start" },
  shimmer: { layer: "sfx_ui", db: -13, align: "start" },
  glitch: { layer: "sfx_ui", db: -14, align: "start", maxdur: 1.2 },
  whoosh: { layer: "sfx_transitions", db: -8, align: "peak" },
  whip: { layer: "sfx_transitions", db: -8, align: "peak" },
  swell: { layer: "sfx_transitions", db: -10, align: "peak" },
  riser: { layer: "sfx_accents", db: -10, align: "peak" },
  hit: { layer: "sfx_accents", db: -10, align: "peak", maxdur: 1.0 },
  sub: { layer: "sfx_accents", db: -7, align: "peak", maxdur: 2.5 },
};
export const ALIASES = { cut: "whoosh", zoom: "whoosh", transition: "whoosh", press: "key", typing: "type", impact: "hit", boom: "sub", ripple: "pulse", glow: "shimmer", ping: "pop" };
export const roleOf = (type) => (ROLES[type] ? type : ALIASES[type] || "pop");

// Bundled files per role (the fallback when nothing better exists).
const BUNDLED = {
  click: ["click-soft.mp3", "click.mp3"],
  key: ["key-press.mp3"],
  tick: ["key-press.mp3"],
  pop: ["pop.mp3"],
  send: ["whoosh-short.mp3"],
  pulse: ["ping.mp3"],
  shimmer: ["sparkle.mp3"],
  glitch: ["glitch-3.mp3", "glitch-1.mp3"],
  whoosh: ["whoosh.mp3", "whoosh-short.mp3"],
  whip: ["whoosh-cinematic.mp3"],
  swell: ["whoosh-cinematic.mp3"],
  riser: ["riser.mp3"],
  hit: ["impact-bass-1.mp3", "impact-bass-2.mp3"],
  sub: ["impact-bass-2.mp3"],
};

// Generated UI palette: soft, warm, dry. No trailer horn, no tonal drone (both rejected by the client on a launch film).
const GEN_PROMPTS = {
  click: [0.5, "soft muted UI click, short warm felt tap, close mic, dry, no high frequency click, no reverb"],
  key: [0.5, "single laptop key press, soft low thock, close mic, dry, no hiss, no reverb"],
  tick: [0.5, "tiny quiet typing tick, very short soft keyboard tap, warm, dry"],
  pop: [0.5, "soft round bubble pop for a UI element appearing, warm, short, dry, no chime"],
  send: [0.8, "soft message send swoosh with a gentle airy tail, warm, short, no chime, no music"],
  pulse: [0.8, "soft low round sonar pulse, warm bloop, short decay, no reverb tail, no music"],
  shimmer: [1.0, "quiet soft glassy shimmer, gentle sparkle, warm, short, no bells"],
  whip: [0.7, "soft fast air whip pan swish, short, warm, no metallic ring"],
  swell: [1.5, "gentle airy swell rising into a soft breath of air, warm, no music, no tonal drone"],
  sub: [2.0, "deep soft sub drop boom, round low end, dry, short tail, no reverb, no horn, no brass"],
};
export const GEN_ROLES = Object.keys(GEN_PROMPTS);
const VARIANTS = 2;

const genFiles = (role) => (fs.existsSync(GEN) ? fs.readdirSync(GEN).filter((f) => f.startsWith(role + "-") && f.endsWith(".mp3")).sort().map((f) => path.join(GEN, f)) : []);

// Make the missing generated sounds (needs ELEVENLABS_API_KEY; without it the bundled files stand in).
export async function ensureGenerated(roles = GEN_ROLES, { concurrency = 6 } = {}) {
  const todo = [];
  for (const role of roles) {
    if (!GEN_PROMPTS[role]) continue;
    if (genFiles(role).length) continue; // a role that has any generated sound is complete
    for (let v = 1; v <= VARIANTS; v++) todo.push({ role, file: path.join(GEN, `${role}-${v}.mp3`) });
  }
  if (!todo.length) return 0;
  if (!key("ELEVENLABS_API_KEY", { required: false })) {
    warn(`no ELEVENLABS_API_KEY: ${todo.length} generated UI sounds missing, the bundled library stands in`);
    return 0;
  }
  log(`generating ${todo.length} UI sounds (ElevenLabs sound-generation, max ${concurrency} at a time) -> sfx-library/gen/`);
  let i = 0, made = 0;
  const worker = async () => {
    while (i < todo.length) {
      const { role, file } = todo[i++];
      const [seconds, prompt] = GEN_PROMPTS[role];
      try {
        await elSfx(prompt, file, { seconds, influence: 0.55 });
        made++;
      } catch (e) {
        warn(`sound-generation ${role}: ${e.message.slice(0, 160)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, worker));
  return made;
}

// House library (Shared drives/Projects/_Edit Assets) through the `sfx` CLI.
const HOUSE_Q = {
  whoosh: ["soft airy whoosh transition", "whooshes"],
  whip: ["fast soft whip pan swish", "whooshes"],
  swell: ["gentle airy swell into a reveal", "risers"],
  riser: ["short soft riser build", "risers"],
  hit: ["soft deep cinematic hit, dry", "hits"],
  sub: ["deep sub boom drop", "hits"],
  glitch: ["subtle digital glitch", null],
  shimmer: ["soft glassy shimmer", "moments"],
};
function house(role) {
  const q = HOUSE_Q[role];
  if (!q) return [];
  const args = ["search", q[0], "-n", "2", "--max", "3", "--json", ...(q[1] ? ["--cat", q[1]] : [])];
  const r = spawnSync("sfx", args, { encoding: "utf8", timeout: 120000 });
  if (r.status !== 0) return [];
  try {
    return JSON.parse(r.stdout.slice(r.stdout.indexOf("["))).map((x) => x.abs_path).filter((f) => f && fs.existsSync(f));
  } catch {
    return [];
  }
}

// role -> [files]. source: "local" | "house" | "openverse" (openverse is resolved by the caller).
export async function palette({ source = "local", generate = true, roles = Object.keys(ROLES) } = {}) {
  if (generate) await ensureGenerated(GEN_ROLES.filter((r) => roles.includes(r) || roles.some((x) => ROLES[x]?.sound === r)));
  const out = {};
  for (const role of Object.keys(ROLES)) {
    const want = ROLES[role].sound || role;
    const bundled = (BUNDLED[want] || BUNDLED.pop).map((f) => path.join(LIB, f)).filter((f) => fs.existsSync(f));
    const fromHouse = source === "house" ? house(want) : [];
    out[role] = fromHouse.length ? fromHouse : genFiles(want).length ? genFiles(want) : bundled;
  }
  return out;
}

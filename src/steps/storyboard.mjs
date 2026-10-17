// storyboard: script.json + vo.json + brand.json -> storyboard.json (the render contract).
// Timing is deterministic (cuts follow VO line ends); the model only fills scene props,
// transitions and camera. Validation repairs anything the renderer cannot handle.
import fs from "node:fs";
import path from "node:path";
import { generateJSON } from "../lib/gemini.mjs";
import { SCENES, TRANSITIONS } from "../lib/catalog.mjs";
import { REPO } from "../lib/env.mjs";
import { log, warn, readJSON, writeJSON, deepNoDashes } from "../lib/util.mjs";

// Visual grammars measured from the references (research/analysis/*.md).
const STYLES = {
  burnwe: "Burnwe SaaS explainer: clean light/dark worlds alternating every 5-13 s, hot-tail typed headlines, product UI as a stage prop with camera push and cursor, focus-pull arrivals, mostly cuts on VO phrase ends, orbit/flow/tasks diagrams, one accent colour.",
  launch: "Google/Lovable launch film: big single-word kinetic type on beats, glowing prompt box as the hero prop, AI result imagery in glass frames and montages, tones black or cream with gradient blooms, blur-based transitions, energetic cold open.",
  relate: "Relate Studio editorial film (research/analysis/relate.md): metronome hard cuts on a fixed grid (every 24 frames or every 2 beats), almost no transitions, polarity flip as rhythm (tone paper / black alternating nearly every shot, stage grey for UI), strictly one palette (monochrome or brand + neutrals), neo-grotesk type with tight tracking, small captions against giant cropped numbers, fast label swaps inside a held shot, industrial 3D metaphors for abstract ideas (chrome blocks, screws, rods, acrylic cards) as clip-3d plates, product UI only as physical objects or clean cards, logo built from its own graphic vocabulary at the end. Prefer scenes ghost-counter, editorial-headline, dash-field, glass-letters, rank-list, clip-3d, logo-bars, kinetic-type single; transitions cut only.",
  higgsfield: "Higgsfield promo: white grid canvas with hairlines and magenta crosshairs (tone 'grid', background 'hf-grid'), two accents with fixed jobs (magenta for names/buttons, lime for highlights), 1 char/frame typing, flash-frame and punch-in transitions on every section change, pixel/halftone reveals, AI footage shown as proof inside grid cells or tilted cards, fast 1-1.5 s shots, slot-roll word lists, crash-zoom logo lockup, plain caps end card. Prefer scenes grid-stage, drum-list, pixel-type, persp-card, glitch-lockup, endcard-caps when available, and transitions flash-frame, punch-in, pixel-dissolve, overexpose, grid-reflow.",
};

function availableScenes() {
  const dir = path.join(REPO, "runtime", "scenes");
  const src = fs.readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
  return Object.keys(SCENES).filter((k) => src.includes(`EM.scene("${k}"`));
}

// Three deliberately different directions so the human picks a direction instead of fixing the
// model's first idea (workflow from the 2026-09 motion threads, research/analysis/x-2026-09-workflows.md).
export const VARIANT_DIRECTIONS = [
  "PRODUCT-LED: the real product UI is the hero. Maximise ui-window, prompt-box, tasks, chat and ui-morph; camera lives inside the interface; typography only for hooks and the close.",
  "TYPE-LED: kinetic typography carries the story. Maximise headline, kinetic-type, pixel-type, stat-hit and drum-list; product appears in 2-3 precise UI moments; bold rhythm, big words.",
  "METAPHOR-LED: one visual metaphor and hero token carries the film (orb-hero, card-cloud, orbit, flow-line, media-frame with abstract 3D renders); the product proves it in 2-3 shots.",
];

export async function storyboardVariants(projectDir, { n = 3 } = {}) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const sb = await storyboard(projectDir, { direction: VARIANT_DIRECTIONS[k % VARIANT_DIRECTIONS.length], outFile: `storyboard.v${k + 1}.json` });
    out.push(`storyboard.v${k + 1}.json`);
    if (k === 0) writeJSON(path.join(projectDir, "storyboard.json"), sb);
  }
  log(`variants written: ${out.join(", ")} (storyboard.json = v1 until you run: pick <slug> <n>)`);
  return out;
}

export async function storyboard(projectDir, { endHold = 2.2, direction = null, outFile = "storyboard.json" } = {}) {
  const brief = readJSON(path.join(projectDir, "brief.json"), {});
  const refStyleFile = path.join(projectDir, "research", "ref-style.md");
  const refStyle = fs.existsSync(refStyleFile) ? fs.readFileSync(refStyleFile, "utf8").slice(0, 6000) : "";
  const brand = readJSON(path.join(projectDir, "brand.json"));
  const sc = readJSON(path.join(projectDir, "script.json"));
  const vo = readJSON(path.join(projectDir, "vo.json"));
  const avail = availableScenes();
  const theme = brief.theme || brand.theme || "saas-light";

  // Scene windows: start slightly before the line's first word (visual leads the ear).
  const LEAD = 0.18;
  const lines = vo.lines.map((l, i) => ({ ...l, ...sc.lines[i] }));
  const total = +(vo.lines[vo.lines.length - 1].end + endHold).toFixed(2);
  const windows = lines.map((l, i) => {
    const start = i === 0 ? 0 : Math.max(0, l.start - LEAD);
    const end = i < lines.length - 1 ? Math.max(0, lines[i + 1].start - LEAD) : total;
    return { start: +start.toFixed(3), end: +end.toFixed(3) };
  });

  // Metronome mode (Relate): shots on a fixed grid regardless of VO phrasing; each shot inherits
  // the line playing at its midpoint. brief.cutGrid in seconds (1.0 = 24 frames at 24 fps).
  const grid = +(brief.cutGrid || (brief.style === "relate" ? 1.0 : 0));
  let units = lines.map((l, i) => ({ li: i, start: windows[i].start, end: windows[i].end }));
  if (grid > 0) {
    units = [];
    // snap the end card onto the grid (no sliver shot before it), keep it at least 2.4 s
    const lastFrom = Math.max(grid, Math.floor((total - Math.max(2.4, endHold + 1)) / grid + 1e-6) * grid);
    for (let t = 0; t < lastFrom - 1e-6; t += grid) {
      const mid = t + grid / 2;
      const li = Math.max(0, windows.findIndex((w) => mid >= w.start && mid < w.end));
      units.push({ li, start: +t.toFixed(3), end: +Math.min(t + grid, lastFrom).toFixed(3) });
    }
    units.push({ li: lines.length - 1, start: +lastFrom.toFixed(3), end: total });
    log(`metronome grid ${grid}s: ${units.length} shots`);
  }

  log(`storyboarding ${units.length} shots (${total}s, theme ${theme}, scenes: ${avail.length})`);
  const catalog = avail.map((k) => `- ${k}: ${SCENES[k]}`).join("\n");
  const trans = Object.entries(TRANSITIONS).map(([k, v]) => `- ${k}: ${v}`).join("\n");
  const assets = { logo: brand.logo, mark: brand.mark, screenshots: brand.screenshots || [] };

  const plan = await generateJSON(
    `You are the motion director of a premium explainer film (Burnwe / Lovable / Google launch quality).
BRAND: ${JSON.stringify({ name: brand.name, tagline: brand.tagline, one_liner: brand.one_liner, features: brand.features, proof: brand.proof, customers: brand.customers, cta: brand.cta, url: brand.url, product_kind: brand.product_kind })}
AVAILABLE BRAND ASSETS: ${JSON.stringify(assets)}
THEME: ${theme}

SHOTS (${grid > 0 ? "metronome cuts on a fixed grid, several shots can share one narration line" : "one per narration line"}, timing is fixed):
${units.map((u, i) => { const l = lines[u.li]; return `${i}. [${u.start.toFixed(2)}-${u.end.toFixed(2)}s, ${(u.end - u.start).toFixed(1)}s] line=${u.li} beat=${l.beat} tone=${l.tone} suggested=${l.scene} VO: "${l.text}" | idea: ${l.visual}`; }).join("\n")}

SCENE CATALOG (type: props schema + purpose):
${catalog}

TRANSITIONS:
${trans}

STYLE: ${STYLES[brief.style || "burnwe"] || brief.style}
${refStyle ? `REFERENCE FILM TO MATCH (measured from the client's chosen reference; copy its pacing, type behaviour, transitions and camera, not its content):\n${refStyle}\n` : ""}${direction ? `CREATIVE DIRECTION FOR THIS VARIANT: ${direction}\n` : ""}
APPLE FRAMEWORK: every choice is intentional; one shot = one idea; each shot has room to breathe; the key object sits in the centre of the frame; backgrounds never compete with the key object; motion is eased and overlapping, never linear; rhythm adapts (speeds up in lists and montages, slows down on the reveal and the proof).

BANNED DEFAULTS (the tells of AI-made video): centered title on a gradient, everything fading in, corner labels and frame borders, glow on UI chrome, generic particle bursts, a beat where nothing happens, invented UI when the real product exists (use its screenshots or rebuild it 1:1).

READS (the rule models break most often): a read is one thing the viewer must understand (a word, a number, a UI change). Give every shot a "reads" array: [{"what":"...","at":seconds from shot start,"hold":seconds}]. Time to find it, understand it and let it land: hold >= 0.4 s for a word or icon, >= 0.8 s for a sentence or number. Two important reads never overlap; a cause comes before its reaction. Fast actions, slow meanings: motion can be quick, what it means gets held time.

BEAT CONTRACT: every shot ends in a state the viewer could point at; its key beat sits mid-shot where the cut cannot eat it; a cut must add information (if the next shot would show the same thing bigger, move the camera instead); something new every 2-4 s; pops and stamps snap in 1-2 frames and ease only on the settle.

DIRECTION RULES
- Pick one scene type per shot from the catalog (you may change the suggestion if another fits better). Never the same type twice in a row.
- Fill props with the brand's REAL words: feature names, UI labels, numbers only from BRAND.proof. On-screen text is shorter than the VO (2-6 words for headlines).
- headline and kinetic-type text must use the VO words of that line (a contiguous excerpt or the full line), because words are synced to the narrator one by one. "keyword" must be 1-2 words that appear inside that text.
- Shots shorter than 1.6 s: use kinetic-type single or headline only.
- headline text: 2-7 words (the punchiest excerpt of the line). kinetic-type single: 1-5 words, one per spoken word. Longer statements go to a visual scene with a short caption instead.
- Use real screenshots in ui-window when available; otherwise design a believable dashboard with brand-specific labels.
- Imagery must feel designed, not stock: prefer abstract premium 3D renders (glass, soft materials, light, macro objects that embody the idea) and the brand's real screenshots. NO clichés: no stressed worker at a desk, no handshakes, no team high-fives, no generic office people, no robots. People only if the product is about people, and then editorial and specific.
- montage items: use the brand's real screenshots first, then abstract renders.
- card-cloud word: "?" or one calm word, never shouting capitals.
- For images use "gen:<prompt>": a full Nano Banana Pro prompt, photographic or 3D, premium, brand colours ${JSON.stringify(brand.colors || {})}, and ALWAYS end with "no text, no letters, no logos". Max 5 generated images in the whole film.
${brief.video ? `- You MAY use up to 2 AI video clips in media-frame: props {kind:"video", src:"genvideo:<detailed still prompt> || <camera + motion direction, single shot>"}. Use them for the most cinematic human/world moments only.\n` : ""}- tone: keep the line's tone (dark/light); for theme glow you may use "cream", for cinematic use "black"${brief.style === "relate" ? '; RELATE: use "paper" and "black" alternating nearly every shot, "stage" for UI cards' : ""}. The last shot must be ${brief.style === "relate" ? "logo-bars" : "logo-reveal"}.
- transitions: mostly "cut" (60%+). Use zoom-through into the reveal, push-left between features, at most 1 whip, at most 1 wipe. Transition duration 0.4-0.7.
- camera: omit (auto drift) or "push" for emphasis shots.
- sound (optional, at most one shot in three): a signature foley sound for a PHYSICAL event on screen (an object lands, metal clinks, a card slides, paper folds, a coin drops, glass taps). {"q":"2-4 word search, concrete and literal, e.g. metal screw drop","at":seconds from shot start when the event happens,"gain":-8..-3}. Never for text, UI or abstract shots: those already get whooshes, clicks and pops.
- ambience (film level, optional): a 2-4 word search for a quiet bed that fits the world (e.g. "quiet studio room tone", "soft city ambience"), or null for none. Most graphic films want null.

Return ONLY JSON: {"ambience":null,"scenes":[{"i":0,"type":"...","tone":"dark|light|cream|black|grid","transition":{"type":"cut|...","duration":0.5},"camera":null,"sound":null,"props":{...}}]}`,
    { temperature: 0.6 }
  );

  const byI = new Map((plan.scenes || []).map((s, k) => [s.i ?? k, s]));
  const lastType = brief.style === "relate" && avail.includes("logo-bars") ? "logo-bars" : "logo-reveal";
  const scenes = units.map((u, i) => {
    const l = lines[u.li];
    const s = byI.get(i) || { type: l.scene, props: { text: l.text } };
    let type = avail.includes(s.type) ? s.type : avail.includes(l.scene) ? l.scene : "headline";
    if (i === units.length - 1) type = s.type === "logo-reveal" || s.type === "logo-bars" ? s.type : lastType;
    const win = { start: u.start, end: u.end };
    const tr = s.transition && s.transition.type && s.transition.type !== "cut" && TRANSITIONS[s.transition.type] ? { type: s.transition.type, duration: Math.min(0.8, Math.max(0.3, +s.transition.duration || 0.55)) } : undefined;
    return {
      id: `s${i + 1}`,
      type,
      start: win.start,
      duration: +(win.end - win.start).toFixed(3),
      tone: s.tone || l.tone || undefined,
      ...(i > 0 && tr ? { transition: tr } : {}),
      ...(s.camera ? { camera: s.camera } : {}),
      props: s.props || {},
      ...(Array.isArray(s.reads) && s.reads.length ? { reads: s.reads } : {}),
      ...(s.sound && (s.sound.q || typeof s.sound === "string") ? { sound: s.sound } : {}),
      vo: l.text,
    };
  });
  // Typed text must start when the narrator starts, or the shot opens on an empty frame for
  // however long it takes to reach the excerpt. If the excerpt starts late, type the whole line.
  const norm = (w) => String(w).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  scenes.forEach((s, k) => {
    const i = units[k].li;
    if (grid > 0) return; // metronome shots carry excerpts by design
    if (!["headline", "kinetic-type"].includes(s.type) || s.props.mode === "single") return;
    const text = s.props.text || (s.props.lines || []).join(" ");
    const first = norm(String(text).split(/\s+/)[0] || "");
    const lw = vo.words.filter((w) => w.start >= lines[i].start - 0.05 && w.start <= lines[i].end + 0.05);
    const hit = lw.find((w) => norm(w.word) === first);
    const late = hit ? hit.start - lines[i].start : 99;
    if (late > 0.7 && lw.length <= 10) {
      s.props.text = lines[i].text.trim();
      delete s.props.lines;
      if (s.props.mode === "stack") s.props.mode = "rise";
      if (s.props.sub && s.props.sub.endsWith("...")) delete s.props.sub;
    }
  });
  // logo-reveal defaults
  const last = scenes[scenes.length - 1];
  last.props = last.type === "logo-bars" ? { name: brand.name, ...last.props } : { tagline: brand.tagline, cta: brand.cta, url: brand.url, ...last.props };

  const sb = deepNoDashes({
    theme,
    ...(brief.style === "higgsfield" ? { background: "hf-grid" } : {}),
    ...(brief.style === "relate" ? { background: "none", flat: true, fps: brief.fps || 24, shutterPhase: "forward" } : {}),
    duration: total,
    ...(typeof plan.ambience === "string" && plan.ambience.trim() ? { ambience: plan.ambience.trim() } : {}),
    brand: {},
    vo: { file: vo.file, words: vo.words },
    scenes,
  });
  writeJSON(path.join(projectDir, outFile), sb);
  const gens = JSON.stringify(sb).match(/"gen:/g)?.length || 0;
  log(`${outFile}: ${scenes.length} scenes, ${scenes.filter((s) => s.transition).length} transitions, ${gens} images to generate`);
  return sb;
}

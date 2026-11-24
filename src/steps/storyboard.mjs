// storyboard: script.json + vo.json + brand.json -> storyboard.json (the render contract).
// Timing is deterministic (cuts follow VO line ends); the model only fills scene props,
// transitions and camera. Validation repairs anything the renderer cannot handle.
import fs from "node:fs";
import path from "node:path";
import { generateJSON } from "../lib/gemini.mjs";
import { SCENES, TRANSITIONS } from "../lib/catalog.mjs";
import { REPO } from "../lib/env.mjs";
import { log, warn, readJSON, writeJSON, deepNoDashes } from "../lib/util.mjs";
import { profilePath, profilePrompt } from "./study.mjs";
import { formatTreatmentPrompt } from "./treatment.mjs";

// Visual grammars measured from the references (research/analysis/*.md & styles/*/profile.json).
export const STYLES = {
  burnwe: "Burnwe SaaS explainer: clean light/dark worlds alternating every 5-13 s, hot-tail typed headlines, product UI as a stage prop with camera push and cursor, focus-pull arrivals, mostly cuts on VO phrase ends, orbit/flow/tasks diagrams, one accent colour. Claim + payoff lines as type-reply, a category with many real examples as slot-line, AI doing work as status-roll, one promise over several objects as word-swap.",
  launch: "Google/Lovable launch film: big single-word kinetic type on beats, glowing prompt box as the hero prop, AI result imagery in glass frames and montages, tones black or cream with gradient blooms, blur-based transitions, energetic cold open. For an image or creative tool: label-flash cold open over generated stills, scatter-line into the product name, type-behind and frame-grow for one verb per shot (Edit it, Write on it, Bigger). Calm agent or voice product: tool-swap for integrations into inline-orb, split-lockup as the end card.",
  relate: "Relate Studio editorial film (research/analysis/relate.md): metronome hard cuts on a fixed grid (every 24 frames or every 2 beats), almost no transitions, polarity flip as rhythm (tone paper / black alternating nearly every shot, stage grey for UI), strictly one palette (monochrome or brand + neutrals), neo-grotesk type with tight tracking, small captions against giant cropped numbers, fast label swaps inside a held shot, industrial 3D metaphors for abstract ideas (chrome blocks, screws, rods, acrylic cards) as clip-3d plates, product UI only as physical objects or clean cards, logo built from its own graphic vocabulary at the end. Prefer scenes ghost-counter, editorial-headline, dash-field, glass-letters, rank-list, clip-3d, logo-bars, kinetic-type single; transitions cut only.",
  higgsfield: "Higgsfield promo: white grid canvas with hairlines and magenta crosshairs (tone 'grid', background 'hf-grid'), two accents with fixed jobs (magenta for names/buttons, lime for highlights), 1 char/frame typing, smooth fast zoom-throughs with light parallax and blur on section changes (no flash frames, no punch-ins, no pump on a word unless the brief asks), pixel/halftone reveals, AI footage shown as proof inside grid cells or tilted cards, fast 1-1.5 s shots, slot-roll word lists, crash-zoom logo lockup, plain caps end card. Prefer scenes grid-stage, drum-list, pixel-type, persp-card, glitch-lockup, endcard-caps, macro-ui, micro-ticker when available, and transitions zoom-through, pixel-dissolve, overexpose, grid-reflow, blur-dissolve.",
  ovyon: "OvyonLabs high-cut editorial film (styles/ovyon/profile.json + styles/ovyon/style.md): high-cut editorial rhythm (median 0.53 s, p25 0.23 s, p75 0.89 s, ~13 cuts per 10 s), technical grid texture overlays (background 'shader-grid'), tinted B&W + fine film grain + 1 sharp brand accent, ~35% dark share with ~31% polarity flips, dynamic micro-tickers and live telemetry badges, razor-sharp flat macro UI close-ups without 3D CSS tilt. Prefer scenes micro-ticker, macro-ui, terminal, editorial-headline, kinetic-type single, dash-field, shader-card, clip-3d; transitions mostly hard cuts with selective zoom-through or blur-dissolve.",
};

// Five snapcn-inspired short-form structured beat blueprints (20-30 s, 10-11 beats).
export const TEMPLATES = {
  launch: {
    durationRange: "24-28 s",
    goal: "High-energy product launch: hook fast, show real UI and spatial craft, land crisp proof and CTA.",
    beats: [
      { beat: "hook", dur: 1.5, tech: "html-gsap", scenes: ["kinetic-type", "label-flash"], note: "Arrest attention immediately on beat 1" },
      { beat: "tension", dur: 2.2, tech: "html-gsap", scenes: ["card-cloud", "editorial-headline"], note: "Name the concrete old-world friction" },
      { beat: "turn", dur: 1.8, tech: "html-gsap", scenes: ["type-reply", "headline"], note: "Single crisp shift / thesis" },
      { beat: "reveal", dur: 2.2, tech: "webgl", scenes: ["shader-card", "orb-hero", "scatter-line"], note: "Brand and product name arrival" },
      { beat: "macro-hero", dur: 3.0, tech: "html-gsap", scenes: ["macro-ui", "ui-window"], note: "Razor-sharp close-up of real product UI" },
      { beat: "interaction-1", dur: 2.5, tech: "html-gsap", scenes: ["prompt-box", "terminal", "answer-stream"], note: "Input trigger into live system output" },
      { beat: "interaction-2", dur: 2.5, tech: "html-gsap", scenes: ["ui-morph", "tasks", "macro-ui"], note: "Control, speed, or workflow completion" },
      { beat: "spatial-depth", dur: 2.8, tech: "blender", scenes: ["clip-3d", "webgl-globe"], note: "3D multi-screen carousel/exploded plate or GPU globe" },
      { beat: "proof", dur: 2.0, tech: "html-gsap", scenes: ["stat-hit", "micro-ticker", "ghost-counter"], note: "Real metric from BRAND.proof" },
      { beat: "payoff", dur: 1.8, tech: "html-gsap", scenes: ["type-reply", "headline"], note: "Short closing promise" },
      { beat: "endcard", dur: 2.5, tech: "html-gsap", scenes: ["logo-reveal", "split-lockup"], note: "Logo lockup, CTA, URL" },
    ],
  },
  "feature-drop": {
    durationRange: "20-24 s",
    goal: "Focused single-feature drop: establish pain, reveal feature, prove live execution and anatomy.",
    beats: [
      { beat: "kicker", dur: 1.4, tech: "html-gsap", scenes: ["micro-ticker", "kinetic-type"], note: "Version or capability kicker" },
      { beat: "contrast", dur: 2.0, tech: "html-gsap", scenes: ["word-swap", "editorial-headline"], note: "What used to slow the team down" },
      { beat: "feature-reveal", dur: 2.4, tech: "webgl", scenes: ["shader-card", "headline"], note: "Feature name lands with sheen" },
      { beat: "trigger-macro", dur: 2.6, tech: "html-gsap", scenes: ["macro-ui", "terminal"], note: "Exact button, shortcut, or CLI command" },
      { beat: "live-stream", dur: 2.6, tech: "html-gsap", scenes: ["answer-stream", "status-roll"], note: "Live execution or streamed answer" },
      { beat: "anatomy-3d", dur: 2.8, tech: "blender", scenes: ["clip-3d"], note: "layers-3d layout=exploded showing stacked UI components" },
      { beat: "delta-proof", dur: 2.2, tech: "html-gsap", scenes: ["versus", "stat-hit"], note: "Before vs after measurable improvement" },
      { beat: "examples", dur: 1.8, tech: "html-gsap", scenes: ["slot-line", "drum-list"], note: "Rapid real use cases from BRAND" },
      { beat: "availability", dur: 1.4, tech: "html-gsap", scenes: ["type-reply", "headline"], note: "Available now / live today" },
      { beat: "endcard", dur: 2.2, tech: "html-gsap", scenes: ["logo-reveal", "endcard-caps"], note: "Logo + CTA" },
    ],
  },
  changelog: {
    durationRange: "20-25 s",
    goal: "Fast developer/product changelog reel: ship velocity, concrete UI/CLI drops, real benchmarks.",
    beats: [
      { beat: "version-punch", dur: 1.4, tech: "html-gsap", scenes: ["kinetic-type", "pixel-type"], note: "Release version hits on beat 1" },
      { beat: "ship-ticker", dur: 2.0, tech: "html-gsap", scenes: ["micro-ticker", "status-roll"], note: "Live telemetry overview of ships" },
      { beat: "ship-1", dur: 2.5, tech: "html-gsap", scenes: ["macro-ui"], note: "Headline UI update in crisp macro close-up" },
      { beat: "ship-2", dur: 2.5, tech: "html-gsap", scenes: ["terminal", "ui-morph"], note: "CLI / keyboard / control upgrade" },
      { beat: "ship-3", dur: 2.5, tech: "html-gsap", scenes: ["answer-stream", "tasks"], note: "Agent / automation workflow upgrade" },
      { beat: "ship-4-wall", dur: 2.8, tech: "blender", scenes: ["clip-3d"], note: "layers-3d layout=wall or carousel sweeping across screens" },
      { beat: "benchmark", dur: 2.0, tech: "html-gsap", scenes: ["stat-hit", "ghost-counter"], note: "Real latency, throughput, or accuracy gain" },
      { beat: "minor-ships", dur: 1.8, tech: "html-gsap", scenes: ["slot-line", "drum-list"], note: "Fast roll of 6-8 real changelog items" },
      { beat: "upgrade-cmd", dur: 1.6, tech: "html-gsap", scenes: ["terminal", "type-reply"], note: "One-line upgrade command or CTA" },
      { beat: "endcard", dur: 2.2, tech: "html-gsap", scenes: ["logo-reveal"], note: "Brand + changelog URL" },
    ],
  },
  "product-tour": {
    durationRange: "26-30 s",
    goal: "End-to-end guided walkthrough of the real workspace from input to scale proof.",
    beats: [
      { beat: "positioning", dur: 2.0, tech: "html-gsap", scenes: ["headline", "type-reply"], note: "One-line statement of what the product does" },
      { beat: "workspace-wide", dur: 2.6, tech: "blender", scenes: ["clip-3d"], note: "layers-3d stack or fisheye-wall establishing the full product" },
      { beat: "step-1-input", dur: 2.8, tech: "html-gsap", scenes: ["macro-ui", "prompt-box"], note: "Step 1: capture or prompt inside real UI" },
      { beat: "step-2-engine", dur: 2.8, tech: "html-gsap", scenes: ["answer-stream", "tasks", "terminal"], note: "Step 2: visible agent or system execution" },
      { beat: "step-3-flow", dur: 2.4, tech: "html-gsap", scenes: ["diagram-draw", "flow-line"], note: "Step 3: how architecture/workflow connects" },
      { beat: "step-4-control", dur: 2.8, tech: "html-gsap", scenes: ["macro-ui", "ui-morph"], note: "Step 4: deep control / review state" },
      { beat: "integrations", dur: 2.4, tech: "html-gsap", scenes: ["tool-swap", "orbit"], note: "Real connected tools and stack" },
      { beat: "scale-world", dur: 2.6, tech: "webgl", scenes: ["webgl-globe", "shader-card"], note: "Global footprint or high-craft GPU card" },
      { beat: "proof", dur: 2.0, tech: "html-gsap", scenes: ["stat-hit", "rank-list"], note: "Real customer or metric proof" },
      { beat: "summary", dur: 1.8, tech: "html-gsap", scenes: ["headline"], note: "Concise outcome takeaway" },
      { beat: "endcard", dur: 2.4, tech: "html-gsap", scenes: ["logo-reveal", "split-lockup"], note: "Logo + CTA + URL" },
    ],
  },
  pitch: {
    durationRange: "25-30 s",
    goal: "Crisp founder/investor pitch film: market truth, friction, unfair unlock, live proof, traction.",
    beats: [
      { beat: "claim", dur: 1.8, tech: "html-gsap", scenes: ["editorial-headline", "kinetic-type"], note: "Bold category claim" },
      { beat: "friction", dur: 2.4, tech: "html-gsap", scenes: ["card-cloud", "versus"], note: "Why the status quo breaks" },
      { beat: "market-scale", dur: 2.4, tech: "webgl", scenes: ["webgl-globe", "ghost-counter"], note: "Scale of the opportunity" },
      { beat: "unlock", dur: 2.0, tech: "html-gsap", scenes: ["type-reply", "diagram-draw"], note: "Core technical or workflow unlock" },
      { beat: "product-3d", dur: 2.8, tech: "blender", scenes: ["clip-3d"], note: "layers-3d carousel or exploded product showcase" },
      { beat: "live-ui", dur: 2.8, tech: "html-gsap", scenes: ["macro-ui", "terminal"], note: "Real product working in close-up" },
      { beat: "ai-proof", dur: 2.4, tech: "html-gsap", scenes: ["answer-stream", "status-roll"], note: "Output quality in real time" },
      { beat: "traction-stat", dur: 2.0, tech: "html-gsap", scenes: ["stat-hit"], note: "Headline traction metric from BRAND.proof" },
      { beat: "moat", dur: 2.2, tech: "webgl", scenes: ["shader-card", "feature-cards"], note: "Differentiation and moat" },
      { beat: "vision", dur: 1.8, tech: "html-gsap", scenes: ["headline"], note: "Where this leads" },
      { beat: "endcard", dur: 2.4, tech: "html-gsap", scenes: ["logo-reveal"], note: "Brand + URL + CTA" },
    ],
  },
};

const VALID_BACKGROUNDS = new Set(["none", "hf-grid", "shader-silk", "shader-mesh", "shader-grid", "shader-dither", "parallax-world"]);

function availableScenes() {
  const dir = path.join(REPO, "runtime", "scenes");
  const src = fs.readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
  return Object.keys(SCENES).filter((k) => src.includes(`EM.scene("${k}"`));
}

// Three deliberately different directions so the human picks a direction instead of fixing the
// model's first idea (workflow from the 2026-09 motion threads, research/analysis/x-2026-09-workflows.md).
export const VARIANT_DIRECTIONS = [
  "PRODUCT-LED: the real product UI is the hero. Maximise macro-ui, ui-window, terminal, prompt-box, tasks, answer-stream and ui-morph; camera lives inside the interface; typography only for hooks and the close.",
  "TYPE-LED: kinetic typography carries the story. Maximise headline, kinetic-type, editorial-headline, pixel-type, stat-hit and drum-list; product appears in 2-3 precise macro-ui moments; bold rhythm, big words.",
  "METAPHOR-LED: one visual metaphor and spatial/shader hero carries the film (webgl-globe, shader-card, clip-3d carousel/exploded, orb-hero, diagram-draw); the product proves it in 2-3 shots.",
];

export async function storyboardVariants(projectDir, { n = 3, template = null, style = null } = {}) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const sb = await storyboard(projectDir, {
      direction: VARIANT_DIRECTIONS[k % VARIANT_DIRECTIONS.length],
      outFile: `storyboard.v${k + 1}.json`,
      template,
      style,
    });
    out.push(`storyboard.v${k + 1}.json`);
    if (k === 0) writeJSON(path.join(projectDir, "storyboard.json"), sb);
  }
  log(`variants written: ${out.join(", ")} (storyboard.json = v1 until you run: pick <slug> <n>)`);
  return out;
}

function loadStyleBible(styleName) {
  if (!styleName) return "";
  const f = path.join(REPO, "styles", styleName, "style.md");
  if (!fs.existsSync(f)) return "";
  return fs.readFileSync(f, "utf8").slice(0, 16000);
}

function formatTemplatePrompt(name, tpl) {
  const rows = tpl.beats
    .map((b, idx) => `  ${idx + 1}. [${b.beat}, ~${b.dur}s, ${b.tech}] preferred=(${b.scenes.join("|")}) - ${b.note}`)
    .join("\n");
  return `SHORT-FORM TEMPLATE BLUEPRINT (${name}, target ${tpl.durationRange}, ${tpl.beats.length} beats):
Goal: ${tpl.goal}
Map shots along this beat progression (adapting smoothly to the exact VO line count and durations):
${rows}`;
}

export async function storyboard(projectDir, { endHold = 2.2, direction = null, outFile = "storyboard.json", template = null, style = null } = {}) {
  const brief = readJSON(path.join(projectDir, "brief.json"), {});
  const activeStyle = style || brief.style || "burnwe";
  const activeTemplateName = template || brief.template || null;
  const activeTemplate = activeTemplateName ? TEMPLATES[activeTemplateName] : null;
  if (activeTemplateName && !activeTemplate) {
    throw new Error(`unknown template "${activeTemplateName}" (expected: ${Object.keys(TEMPLATES).join("|")})`);
  }

  const refStyleFile = path.join(projectDir, "research", "ref-style.md");
  const refStyle = fs.existsSync(refStyleFile) ? fs.readFileSync(refStyleFile, "utf8").slice(0, 6000) : "";
  const styleBible = loadStyleBible(activeStyle);
  const treatmentFile = path.join(projectDir, "treatment.json");
  const treatmentData = fs.existsSync(treatmentFile) ? readJSON(treatmentFile, null) : null;
  const treatmentPrompt = treatmentData ? formatTreatmentPrompt(treatmentData) : "";

  const brand = readJSON(path.join(projectDir, "brand.json"));
  const sc = readJSON(path.join(projectDir, "script.json"));
  const vo = readJSON(path.join(projectDir, "vo.json"));
  // --no-images: films built from type, UI, diagrams, shaders and Blender plates only (no generated stills)
  const IMAGE_SCENES = ["media-frame", "montage", "persp-card", "grid-stage"];
  const avail = availableScenes().filter((k) => !(brief.noImages && IMAGE_SCENES.includes(k)));
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

  // A measured style (styles/<style>/profile.json, from `eden-motion study`) decides the shot plan.
  const prof = activeStyle && fs.existsSync(profilePath(activeStyle)) ? readJSON(profilePath(activeStyle)) : null;
  // Metronome mode: shots on a fixed grid regardless of VO phrasing; each shot inherits the line
  // playing at its midpoint. brief.cutGrid in seconds (1.0 = 24 frames at 24 fps). A measured
  // style gets a grid only when at least half of its edited references cut on one (Relate: 3 of 16).
  const measuredGrid = prof && prof.metronome && prof.metronome.films * 2 >= (prof.edited || 0) ? prof.metronome.median : 0;
  const grid = +(brief.cutGrid || (activeStyle === "relate" ? (prof ? measuredGrid : 1.0) : 0));
  let units = lines.map((l, i) => ({ li: i, start: windows[i].start, end: windows[i].end }));
  // No grid but references cut faster than the narration: split each line into shots whose
  // lengths cycle through the references' pooled shot lengths (deterministic, varied like theirs).
  const sl = prof && prof.shotLengths;
  if (!(grid > 0) && sl && sl.median && sl.median < 2.2) {
    const minLen = activeStyle === "ovyon" ? 0.45 : 0.5;
    const cycle = [sl.median, sl.p25, sl.p75, sl.median, sl.p25, Math.min(sl.p90, 4)].map((v) => Math.max(minLen, v));
    let k = 0;
    units = [];
    windows.forEach((w, li) => {
      // the end card stays one shot
      if (li === lines.length - 1) return units.push({ li, start: w.start, end: w.end });
      let t = w.start;
      while (w.end - t > 1e-3) {
        let len = cycle[k++ % cycle.length];
        if (w.end - (t + len) < minLen) len = w.end - t;
        units.push({ li, start: +t.toFixed(3), end: +(t + len).toFixed(3) });
        t += len;
      }
    });
    log(`measured shot plan (${activeStyle}, median ${sl.median} s): ${units.length} shots`);
  }
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
  // Short-form template subdivision: when --template is active and VO has fewer lines than the
  // 10-11 beat blueprint (and neither metronome grid nor fast-cut profile already split shots),
  // split the longest non-endcard windows cleanly so the film hits the target beat density.
  if (activeTemplate && !(grid > 0) && units.length < activeTemplate.beats.length && total >= 16 && total <= 40) {
    const targetCount = activeTemplate.beats.length;
    while (units.length < targetCount) {
      let bestIdx = -1;
      let bestDur = 0;
      for (let i = 0; i < units.length - 1; i++) {
        const d = units[i].end - units[i].start;
        if (d >= 2.4 && d > bestDur) {
          bestDur = d;
          bestIdx = i;
        }
      }
      if (bestIdx < 0) break;
      const u = units[bestIdx];
      const midT = +(u.start + (u.end - u.start) * 0.5).toFixed(3);
      units.splice(bestIdx, 1, { li: u.li, start: u.start, end: midT }, { li: u.li, start: midT, end: u.end });
    }
    log(`template "${activeTemplateName}" beat plan: ${units.length} shots (${total}s)`);
  }

  log(`storyboarding ${units.length} shots (${total}s, style ${activeStyle}${activeTemplateName ? `, template ${activeTemplateName}` : ""}, theme ${theme}, scenes: ${avail.length})`);
  const catalog = avail.map((k) => `- ${k}: ${SCENES[k]}`).join("\n");
  const trans = Object.entries(TRANSITIONS).map(([k, v]) => `- ${k}: ${v}`).join("\n");
  const assets = { logo: brand.logo, mark: brand.mark, screenshots: brand.screenshots || [] };

  const plan = await generateJSON(
    `You are the motion director of a premium explainer film (Burnwe / Lovable / Raycast / Framer / OvyonLabs quality).
BRAND: ${JSON.stringify({ name: brand.name, tagline: brand.tagline, one_liner: brand.one_liner, features: brand.features, proof: brand.proof, customers: brand.customers, cta: brand.cta, url: brand.url, product_kind: brand.product_kind })}
AVAILABLE BRAND ASSETS: ${JSON.stringify(assets)}
THEME: ${theme}

SHOTS (${grid > 0 ? "metronome cuts on a fixed grid, several shots can share one narration line" : units.length > lines.length ? "cut to the measured shot lengths or template beats, several shots can share one narration line" : "one per narration line"}, timing is fixed):
${units.map((u, i) => { const l = lines[u.li]; return `${i}. [${u.start.toFixed(2)}-${u.end.toFixed(2)}s, ${(u.end - u.start).toFixed(1)}s] line=${u.li} beat=${l.beat} tone=${l.tone} suggested=${l.scene} VO: "${l.text}" | idea: ${l.visual}`; }).join("\n")}

SCENE CATALOG (type: props schema + purpose):
${catalog}

TRANSITIONS:
${trans}

STYLE: ${STYLES[activeStyle] || activeStyle}
${prof ? profilePrompt(activeStyle) + " Where the style description above disagrees with these numbers, the numbers win." : ""}
${styleBible ? `\nSTYLE BIBLE (styles/${activeStyle}/style.md - 11-section craft rules; follow strictly):\n${styleBible}\n` : ""}
${treatmentPrompt ? `\n${treatmentPrompt}\n` : ""}
${activeTemplate ? `\n${formatTemplatePrompt(activeTemplateName, activeTemplate)}\n` : ""}
FRAME: ${brief.format && brief.format !== "16:9" ? `${brief.format} portrait feed frame: stack content vertically, max 2-3 words per display line, no wide rows of more than 3 cards, keep the key object in the middle third` : "16:9"}
${refStyle ? `REFERENCE FILM TO MATCH (measured from the client's chosen reference; copy its pacing, type behaviour, transitions and camera, not its content):\n${refStyle}\n` : ""}${direction ? `CREATIVE DIRECTION FOR THIS VARIANT: ${direction}\n` : ""}
HYBRID TECH ROUTING RULES (pick the right engine per shot; never fake optical 3D in CSS or use AI video where crisp code wins):
1. HTML/GSAP (2D): editorial typography (headline, kinetic-type, editorial-headline, type-reply, slot-line, word-swap), macro-ui (razor-sharp flat UI close-up with focus-pull zoom and guides, NEVER forced 38deg CSS 3D tilt), terminal (CLI / MCP / agent tool logs), answer-stream (AI prompt + streaming response), micro-ticker (live telemetry badges + technical grid), clone-ui live twins (custom scenes), diagram-draw, ui-morph, tasks, stat-hit.
2. WebGL2 / Three.js: fast, deterministic GPU worlds. Film-level "background" may be set to "shader-silk" (monochrome metallic silk waves), "shader-mesh" (brand-accent grained fluid mesh), "shader-grid" (OvyonLabs technical warped grid), or "shader-dither" (Bayer halftone wave). Use "webgl-globe" for global scale/network arcs + stat pills and "shader-card" for iridescent foil/glass hero cards.
3. Blender 3D (clip-3d): use blender:layers-3d (layouts: stack, tower, row, fan, floor, carousel, wall, fisheye-wall, exploded; add &loop=1 for seamless periodic loops), blender:chrome-object, or blender:card-stack ONLY when true optical DOF and rack focus, photoreal chrome/acrylic/glass materials, CG hardware, or curved/exploded 3D multi-screen space elevates the beat.
4. AI / live footage (media-frame, footage): selective human or real-world emotion only when 2D, WebGL, and Blender cannot carry the shot.

APPLE FRAMEWORK: every choice is intentional; one shot = one idea; each shot has room to breathe; the key object sits in the centre of the frame; backgrounds never compete with the key object; motion is eased and overlapping, never linear; rhythm adapts (speeds up in lists and montages, slows down on the reveal and the proof).

BANNED DEFAULTS (the tells of AI-made video): centered title on a gradient, everything fading in, corner labels and frame borders, 1-2px bright AI borders around cards, forced 38deg CSS 3D tilt on screenshots, pure #000000 or pure #ffffff flat fills (use floor >= #0f0f0f and ceiling <= #fafafa), glow on UI chrome, generic particle bursts, a beat where nothing happens, invented UI when the real product exists (use its screenshots or macro-ui/clone-ui). Also the template tells: a pill or eyebrow label above a headline, 01 / 02 / 03 section numbering, tiny letter-spaced uppercase captions on every shot, rows of identical icon cards, fake dashboards of grey bars, default palettes the brand does not own, invented proof (logos, stats, quotes, ratings not in BRAND), more than two typefaces.

READS (the rule models break most often): a read is one thing the viewer must understand (a word, a number, a UI change). Give every shot a "reads" array: [{"what":"...","at":seconds from shot start,"hold":seconds}]. Time to find it, understand it and let it land: hold >= 0.4 s for a word or icon, >= 0.8 s for a sentence or number. Two important reads never overlap; a cause comes before its reaction. Fast actions, slow meanings: motion can be quick, what it means gets held time.

BEAT CONTRACT: every shot ends in a state the viewer could point at; its key beat sits mid-shot where the cut cannot eat it; a cut must add information (if the next shot would show the same thing bigger, move the camera instead); something new every 2-4 s; pops and stamps snap in 1-2 frames and ease only on the settle.

DIRECTION RULES
- Pick one scene type per shot from the catalog (you may change the suggestion if another fits better). Never the same type twice in a row.
- Fill props with the brand's REAL words: feature names, UI labels, numbers only from BRAND.proof. On-screen text is shorter than the VO (2-6 words for headlines).
- headline and kinetic-type text must use the VO words of that line (a contiguous excerpt or the full line), because words are synced to the narrator one by one. "keyword" must be 1-2 words that appear inside that text.
- Shots shorter than 1.6 s: use kinetic-type single, micro-ticker, dash-field, or short headline only.
- headline text: 2-7 words (the punchiest excerpt of the line). kinetic-type single: 1-5 words, one per spoken word. Longer statements go to a visual scene with a short caption instead.
${brief.noImages ? "- NO generated images anywhere: never write a \"gen:\" prop. Carry the human or world moments with type, diagrams, WebGL shaders, UI and clip-3d Blender plates (blender:chrome-object, blender:card-stack, blender:layers-3d).\n" : ""}${avail.includes("clip-3d") ? "- Real 3D sells the film: use 1-3 clip-3d Blender plates where optical DOF or 3D space genuinely helps. When real screenshots exist (assets/ui-*.jpg), consider blender:layers-3d (carousel, wall, fisheye-wall, exploded, or stack) with rack focus for a hero spatial beat, and macro-ui for razor-sharp flat UI close-ups.\n" : ""}- Use real screenshots in macro-ui or ui-window (mode:"flat" or "macro") when available; otherwise design a believable dashboard with brand-specific labels.
- Imagery must feel designed, not stock: prefer abstract premium 3D renders (glass, soft materials, light, macro objects that embody the idea) and the brand's real screenshots. NO clichés: no stressed worker at a desk, no handshakes, no team high-fives, no generic office people, no robots. People only if the product is about people, and then editorial and specific.
- montage items: use the brand's real screenshots first, then abstract renders.
- card-cloud word: "?" or one calm word, never shouting capitals.
- For images use "gen:<prompt>": a full Nano Banana Pro prompt, photographic or 3D, premium, brand colours ${JSON.stringify(brand.colors || {})}, and ALWAYS end with "no text, no letters, no logos". Max 5 generated images in the whole film.
${brief.video ? `- You MAY use up to 2 AI video clips in media-frame: props {kind:"video", src:"genvideo:<detailed still prompt> || <camera + motion direction, single shot>"}. Use them for the most cinematic human/world moments only.\n` : ""}- tone: keep the line's tone (dark/light); for theme glow you may use "cream", for cinematic use "black"${activeStyle === "relate" ? (prof && prof.axes.polarityFlips ? `; RELATE: tones "paper", "black" and "stage" (UI cards); flip between dark and light on about ${Math.round(prof.axes.polarityFlips.median * 100)}% of cuts and keep about ${Math.round((prof.axes.darkShare ? prof.axes.darkShare.median : 0.2) * 100)}% of shots dark, never every shot` : '; RELATE: use "paper" and "black" alternating nearly every shot, "stage" for UI cards') : ""}${activeStyle === "ovyon" ? '; OVYON: mix dark (~35%) and light/paper (~65%) with ~31% polarity flips, high-cut rhythm, tinted B&W feel with 1 sharp brand accent' : ""}. The last shot must be ${activeStyle === "relate" ? "logo-bars" : "logo-reveal"}.
- transitions: mostly "cut" on VO phrase ends (60%+). Into the product, the UI and the reveal use zoom-through (an elegant animated zoom with parallax, never a hard cut into a close-up), zoom-out after a detail, blur-dissolve for calm turns, push-left between features. At most 1 whip, at most 1 wipe${brief.flashFrames ? "" : ", no flash-frame, flash-cycle or punch-in"}. Transition duration 0.4-0.7.
- camera: omit (auto drift) or "push" for emphasis shots.
- sound (optional, at most one shot in three): a signature foley sound for a PHYSICAL event on screen (an object lands, metal clinks, a card slides, paper folds, a coin drops, glass taps). {"q":"2-4 word search, concrete and literal, e.g. metal screw drop","at":seconds from shot start when the event happens,"gain":-8..-3}. Never for text, UI or abstract shots: those already get whooshes, clicks and pops.
- ambience (film level, optional): a 2-4 word search for a quiet bed that fits the world (e.g. "quiet studio room tone", "soft city ambience"), or null for none. Most graphic films want null.
- background (film level, optional): null for default theme background, or one of "none", "hf-grid", "shader-silk", "shader-mesh", "shader-grid", "shader-dither".

Return ONLY JSON: {"ambience":null,"background":null,"scenes":[{"i":0,"type":"...","tone":"dark|light|cream|black|paper|stage|grid","transition":{"type":"cut|...","duration":0.5},"camera":null,"sound":null,"reads":[{"what":"...","at":0.2,"hold":0.6}],"props":{...}}]}`,
    { temperature: 0.6 }
  );

  const byI = new Map((plan.scenes || []).map((s, k) => [s.i ?? k, s]));
  const lastType = activeStyle === "relate" && avail.includes("logo-bars") ? "logo-bars" : "logo-reveal";
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
  // House rules on transitions: one whip per film at most (later ones become zoom-throughs), and
  // flash frames and punch-ins only when the brief asks for them (brief.flashFrames).
  let whipsLeft = 1;
  for (const scItem of scenes) {
    const t = scItem.transition?.type;
    if (t === "whip" && whipsLeft-- <= 0) scItem.transition = { ...scItem.transition, type: "zoom-through" };
    else if (!brief.flashFrames && (t === "flash-frame" || t === "flash-cycle")) scItem.transition = { ...scItem.transition, type: "blur-dissolve", duration: 0.4 };
    else if (!brief.flashFrames && t === "punch-in") scItem.transition = { ...scItem.transition, type: "zoom-through" };
  }
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
  // Relate polarity from the measured profile. The model flips nearly every shot whatever the
  // prompt says, the references do not: long light runs and short dark runs put the flip rate and
  // the dark share inside the references' range. Stage (UI) shots stay stage and count as light.
  if (activeStyle === "relate" && prof && prof.axes.polarityFlips && prof.axes.darkShare) {
    const f = Math.max(0.05, prof.axes.polarityFlips.median), d = Math.max(0.05, prof.axes.darkShare.median);
    const darkRun = Math.max(1, Math.round(d / (f / 2))), lightRun = Math.max(2, Math.round((1 - d) / (f / 2)));
    let dark = false, left = Math.ceil(lightRun / 2);
    for (const s of scenes) {
      if (left <= 0 || (dark && s.tone === "stage")) { dark = !dark; left = dark ? darkRun : lightRun; }
      if (s.tone !== "stage") s.tone = dark ? "black" : "paper";
      left--;
    }
    log(`relate tones from profile: light runs of ${lightRun}, dark runs of ${darkRun}`);
  }
  // logo-reveal defaults
  const last = scenes[scenes.length - 1];
  last.props = last.type === "logo-bars" ? { name: brand.name, ...last.props } : { tagline: brand.tagline, cta: brand.cta, url: brand.url, ...last.props };

  // Film-level background: honour valid model choice, else style default
  const chosenBg = typeof plan.background === "string" && VALID_BACKGROUNDS.has(plan.background)
    ? plan.background
    : activeStyle === "higgsfield"
      ? "hf-grid"
      : activeStyle === "ovyon"
        ? "shader-grid"
        : activeStyle === "relate"
          ? "none"
          : null;

  // Frame. Non-16:9 films are laid out on a larger logical canvas and scaled down at the end, so
  // scenes written for a 1920 px wide stage keep their proportions (and the downscale supersamples).
  const FORMATS = { "4:5": { width: 1728, height: 2160, output: [1080, 1350] }, "1:1": { width: 1728, height: 1728, output: [1080, 1080] }, "9:16": { width: 1080, height: 1920 } };
  const frame = FORMATS[brief.format] || {};
  const sb = deepNoDashes({
    theme,
    ...frame,
    ...(chosenBg ? { background: chosenBg } : {}),
    ...(activeStyle === "relate" ? { flat: true, fps: brief.fps || 24, shutterPhase: "forward" } : {}),
    duration: total,
    ...(prof ? { styleProfile: activeStyle } : {}),
    ...(activeTemplateName ? { template: activeTemplateName } : {}),
    ...(treatmentData?.selected ? { treatmentSelected: treatmentData.selected } : {}),
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

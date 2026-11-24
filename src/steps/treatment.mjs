// treatment: pre-storyboard creative treatment gate (lemo-opuscar pattern).
// Generates 3 genuinely distinct creative directions with explicit hybrid tech mix,
// signature hero shot, tone/polarity rule, pacing target, and 4-of-6 novelty checklist
// against the most recent previous project so consecutive films never repeat one formula.
import fs from "node:fs";
import path from "node:path";
import { generateJSON } from "../lib/gemini.mjs";
import { REPO } from "../lib/env.mjs";
import { log, warn, readJSON, writeJSON, deepNoDashes, noDashes } from "../lib/util.mjs";

const NOVELTY_AXES = [
  "opening_hook",
  "tech_mix",
  "polarity_and_surface",
  "pacing_cadence",
  "hero_shot_mechanic",
  "narrative_arc",
];

const WEBGL_SCENES = new Set(["webgl-globe", "shader-card"]);
const WEBGL_BACKGROUNDS = new Set(["shader-silk", "shader-mesh", "shader-grid", "shader-dither"]);

function fingerprintProject(dir) {
  const sbFile = path.join(dir, "storyboard.json");
  if (!fs.existsSync(sbFile)) return null;
  let sb;
  try {
    sb = readJSON(sbFile);
  } catch {
    return null;
  }
  const brief = readJSON(path.join(dir, "brief.json"), {});
  const scenes = Array.isArray(sb.scenes) ? sb.scenes : [];
  if (!scenes.length) return null;

  const typeCounts = {};
  const toneCounts = {};
  const transCounts = {};
  const blenderTemplates = new Set();
  let webglCount = 0;
  let footageCount = 0;

  for (const s of scenes) {
    typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
    const tone = s.tone || "default";
    toneCounts[tone] = (toneCounts[tone] || 0) + 1;
    const tr = s.transition?.type || "cut";
    transCounts[tr] = (transCounts[tr] || 0) + 1;
    if (WEBGL_SCENES.has(s.type)) webglCount++;
    if (s.type === "footage" || (s.type === "media-frame" && s.props?.kind === "video")) footageCount++;
    const raw = JSON.stringify(s.props || {});
    const bm = raw.match(/blender:([a-z0-9_-]+)/gi) || [];
    for (const hit of bm) blenderTemplates.add(hit.replace(/^blender:/i, ""));
    if (s.type === "clip-3d" && !bm.length) blenderTemplates.add("clip-3d");
  }

  const topSceneTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([type, count]) => `${type}(${count})`);
  const durations = scenes.map((s) => +s.duration || 0).filter((d) => d > 0).sort((a, b) => a - b);
  const medianShotS = durations.length ? +durations[Math.floor(durations.length / 2)].toFixed(2) : null;

  return {
    slug: path.basename(dir),
    mtime: fs.statSync(sbFile).mtimeMs,
    style: sb.styleProfile || brief.style || "burnwe",
    theme: sb.theme || brief.theme || "saas-light",
    background: sb.background || "default",
    duration: sb.duration || null,
    sceneCount: scenes.length,
    medianShotS,
    openingScenes: scenes.slice(0, 2).map((s) => s.type),
    topSceneTypes,
    toneCounts,
    dominantTransition: Object.entries(transCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "cut",
    blenderTemplates: [...blenderTemplates],
    usesWebGL: webglCount > 0 || WEBGL_BACKGROUNDS.has(sb.background),
    footageCount,
  };
}

export function scanRecentProjects(projectDir, { projectsDir, limit = 3 } = {}) {
  const root = projectsDir ? path.resolve(projectsDir) : path.dirname(path.resolve(projectDir));
  const selfName = path.basename(path.resolve(projectDir));
  if (!fs.existsSync(root)) return [];

  const entries = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== selfName);
  const real = [];
  const tests = [];
  for (const e of entries) {
    const fp = fingerprintProject(path.join(root, e.name));
    if (!fp) continue;
    if (e.name.startsWith("_")) tests.push(fp);
    else real.push(fp);
  }
  const pool = real.length ? real : tests;
  return pool.sort((a, b) => b.mtime - a.mtime).slice(0, limit).map(({ mtime, ...rest }) => rest);
}

function normalizeTechMix(mix = {}) {
  const raw = {
    html_gsap_pct: Math.max(0, Math.round(+mix.html_gsap_pct || 0)),
    webgl_three_pct: Math.max(0, Math.round(+mix.webgl_three_pct || 0)),
    blender_3d_pct: Math.max(0, Math.round(+mix.blender_3d_pct || 0)),
    footage_ai_pct: Math.max(0, Math.round(+mix.footage_ai_pct || 0)),
  };
  let sum = raw.html_gsap_pct + raw.webgl_three_pct + raw.blender_3d_pct + raw.footage_ai_pct;
  if (sum <= 0) {
    raw.html_gsap_pct = 60;
    raw.webgl_three_pct = 20;
    raw.blender_3d_pct = 15;
    raw.footage_ai_pct = 5;
    sum = 100;
  }
  if (sum !== 100) {
    const scale = 100 / sum;
    raw.html_gsap_pct = Math.round(raw.html_gsap_pct * scale);
    raw.webgl_three_pct = Math.round(raw.webgl_three_pct * scale);
    raw.blender_3d_pct = Math.round(raw.blender_3d_pct * scale);
    raw.footage_ai_pct = Math.max(0, 100 - raw.html_gsap_pct - raw.webgl_three_pct - raw.blender_3d_pct);
  }
  return {
    ...raw,
    rationale: {
      html_gsap: String(mix.rationale?.html_gsap || "Editorial typography, macro UI, terminals, and crisp 2D choreography."),
      webgl_three: String(mix.rationale?.webgl_three || "Deterministic real-time GPU backgrounds, globes, or foil shaders."),
      blender_3d: String(mix.rationale?.blender_3d || "Optical DOF, rack focus, and physical 3D materials via clip-3d plates."),
      footage_ai: String(mix.rationale?.footage_ai || "Selective cinematic human or world moments where CG/UI is not enough."),
    },
  };
}

function renderTreatmentMarkdown(data) {
  const lines = [
    `# Creative Treatments: ${data.company || "Project"}`,
    "",
    `- Created: ${data.created}`,
    `- Style: ${data.style || "burnwe"}`,
    `- Selected: ${data.selected ? `Option ${data.selected}` : "none yet (run: eden-motion treatment <slug> --pick <n>)"}`,
  ];
  if (data.previous_project) {
    const p = data.previous_project;
    lines.push(`- Previous project avoided: \`${p.slug}\` (style=${p.style}, theme=${p.theme}, opening=${p.openingScenes.join(" -> ")}, median=${p.medianShotS ?? "?"}s)`);
  }
  lines.push("");

  for (const t of data.treatments || []) {
    const tag = data.selected === t.index ? " [SELECTED]" : "";
    const tm = t.tech_mix || {};
    lines.push(`## Option ${t.index}: ${t.title}${tag}`);
    lines.push("");
    lines.push(`**Angle:** ${t.angle}`);
    lines.push("");
    lines.push(`**Pacing target:** median ${t.pacing?.target_median_s ?? "?"} s | ${t.pacing?.cadence || ""} | cuts: ${t.pacing?.cuts_style || ""}`);
    lines.push("");
    lines.push(`**Tone and polarity rule:** ${t.tone_polarity_rule || ""}`);
    lines.push("");
    lines.push("**Hybrid tech mix:**");
    lines.push(`- 2D HTML/GSAP: ${tm.html_gsap_pct ?? 0}% - ${tm.rationale?.html_gsap || ""}`);
    lines.push(`- WebGL/Three.js: ${tm.webgl_three_pct ?? 0}% - ${tm.rationale?.webgl_three || ""}`);
    lines.push(`- Blender 3D: ${tm.blender_3d_pct ?? 0}% - ${tm.rationale?.blender_3d || ""}`);
    lines.push(`- AI / live footage: ${tm.footage_ai_pct ?? 0}% - ${tm.rationale?.footage_ai || ""}`);
    lines.push("");
    const hs = t.signature_hero_shot || {};
    lines.push(`**Signature hero shot:** [${hs.tech || "hybrid"} / ${hs.scene_type || "custom"}] (${hs.beat || "reveal"}) ${hs.description || ""}`);
    lines.push("");
    const nc = t.novelty_checklist || {};
    lines.push(`**Novelty checklist vs previous project (${nc.changed_count ?? 0}/6 changed, min 4 required):**`);
    for (const item of nc.items || []) {
      lines.push(`- [${item.changed ? "x" : " "}] \`${item.axis}\`: ${item.how}`);
    }
    if (t.direction_notes) {
      lines.push("");
      lines.push(`**Director notes:** ${t.direction_notes}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("Lock a treatment before storyboarding:");
  lines.push("`eden-motion treatment <slug> --pick <1|2|3>`");
  lines.push("");
  return noDashes(lines.join("\n"));
}

export async function treatment(projectDir, { n = 3, projectsDir } = {}) {
  const count = Math.max(1, Math.min(5, Math.round(+n || 3)));
  const brief = readJSON(path.join(projectDir, "brief.json"), {});
  const brand = readJSON(path.join(projectDir, "brand.json"), {});
  const sc = readJSON(path.join(projectDir, "script.json"), null);
  const recent = scanRecentProjects(projectDir, { projectsDir, limit: 3 });
  const prev = recent[0] || null;

  const styleName = brief.style || "burnwe";
  const styleBiblePath = path.join(REPO, "styles", styleName, "style.md");
  const styleBible = fs.existsSync(styleBiblePath) ? fs.readFileSync(styleBiblePath, "utf8").slice(0, 4000) : "";

  log(`generating ${count} creative treatments for ${brand.name || brief.company || path.basename(projectDir)}${prev ? ` (differentiating from ${prev.slug})` : ""}`);

  const prompt = `You are an executive creative director running a pre-storyboard treatment gate (inspired by lemo-opuscar).
Before any storyboard is written, produce ${count} GENUINELY DISTINCT creative treatments so the team can pick one bold direction instead of defaulting to generic SaaS motion graphics.

PROJECT BRIEF:
${JSON.stringify({ company: brief.company || brand.name, duration: brief.duration, style: styleName, theme: brief.theme || brand.theme, format: brief.format || "16:9", template: brief.template || null, notes: brief.notes || null, noImages: !!brief.noImages, video: !!brief.video })}

BRAND:
${JSON.stringify({ name: brand.name, tagline: brand.tagline, one_liner: brand.one_liner, product_kind: brand.product_kind, features: brand.features, proof: brand.proof, colors: brand.colors, screenshots: (brand.screenshots || []).slice(0, 6) })}

SCRIPT SUMMARY:
${sc ? JSON.stringify({ title: sc.title, lines: (sc.lines || []).map((l, i) => ({ i, beat: l.beat, tone: l.tone, text: l.text })) }) : "Script not yet generated; derive beat arcs from BRAND and BRIEF."}

${styleBible ? `ACTIVE STYLE BIBLE (${styleName}, excerpt):\n${styleBible}\n` : ""}
${recent.length ? `RECENT PREVIOUS PROJECTS TO AVOID REPEATING (most recent first):\n${JSON.stringify(recent, null, 2)}\n` : "No previous projects found; differentiate the 3 treatments strongly from each other.\n"}

AVAILABLE HYBRID ENGINES IN EDEN-MOTION:
1. 2D HTML/GSAP: editorial typography, macro-ui, terminal, answer-stream, micro-ticker, clone-ui live twins, diagram-draw, ui-morph, slot-line, type-reply.
2. WebGL2 / Three.js: shader-silk, shader-mesh, shader-grid, shader-dither backgrounds + webgl-globe, shader-card scenes (fast, deterministic GPU worlds).
3. Blender 3D (clip-3d transparent WebM plates): layers-3d (stack, tower, row, fan, floor, carousel, wall, fisheye-wall, exploded + seamless loop=1), chrome-object, card-stack (true optical DOF, rack focus, photoreal materials).
4. AI / live footage: media-frame (video/image), footage (human/world moments only when 2D/WebGL/Blender cannot carry the emotion).${brief.noImages ? " NOTE: brief.noImages is true, so footage_ai_pct MUST be 0." : ""}

REQUIREMENTS FOR EACH TREATMENT:
- Make the ${count} options structurally different (e.g. one product-macro/craft-led, one editorial/kinetic-rhythm-led, one 3D-spatial/shader-world-led), never cosmetic reskins of each other.
- Define exact hybrid tech mix percentages summing to 100% with concrete rationale for each layer.
- Define 1 unforgettable signature hero shot naming the exact beat, tech layer, scene type, and visual choreography.
- Define a concrete tone/polarity rule (no generic dark-only slop; obey floor >= #0f0f0f, ceiling <= #fafafa, intentional polarity contrast).
- Fill out the 6-item novelty_checklist against ${prev ? `the previous project "${prev.slug}"` : "standard SaaS defaults"} covering these exact 6 axes: ${NOVELTY_AXES.join(", ")}. At least 4 of 6 MUST have changed: true with a specific explanation in "how".
- NEVER use em dashes or en dashes anywhere; use plain hyphens or colons.

Return ONLY valid JSON:
{
  "treatments": [
    {
      "index": 1,
      "title": "2-5 word memorable title",
      "angle": "2-3 sentence creative thesis explaining why this fits this exact brand",
      "pacing": { "target_median_s": 1.2, "cadence": "description of speed/breath rhythm", "cuts_style": "hard cuts vs zoom-throughs vs metronome" },
      "tech_mix": {
        "html_gsap_pct": 55,
        "webgl_three_pct": 20,
        "blender_3d_pct": 20,
        "footage_ai_pct": 5,
        "rationale": {
          "html_gsap": "exact role in this film",
          "webgl_three": "exact role in this film",
          "blender_3d": "exact role in this film",
          "footage_ai": "exact role in this film"
        }
      },
      "signature_hero_shot": {
        "beat": "which narrative beat",
        "tech": "html-gsap|webgl|blender|footage",
        "scene_type": "exact scene type (e.g. clip-3d, macro-ui, webgl-globe, shader-card, terminal)",
        "description": "concrete camera, framing, motion, and read choreography"
      },
      "tone_polarity_rule": "concrete surface polarity and accent usage rule",
      "novelty_checklist": {
        "items": [
          { "axis": "opening_hook", "changed": true, "how": "..." },
          { "axis": "tech_mix", "changed": true, "how": "..." },
          { "axis": "polarity_and_surface", "changed": true, "how": "..." },
          { "axis": "pacing_cadence", "changed": true, "how": "..." },
          { "axis": "hero_shot_mechanic", "changed": true, "how": "..." },
          { "axis": "narrative_arc", "changed": false, "how": "..." }
        ]
      },
      "direction_notes": "concise instructions for the storyboard director if this option is picked"
    }
  ]
}`;

  const raw = await generateJSON(prompt, { temperature: 0.75 });
  const list = (raw.treatments || []).slice(0, count).map((t, idx) => {
    const items = NOVELTY_AXES.map((axis) => {
      const hit = (t.novelty_checklist?.items || []).find((x) => x.axis === axis);
      return {
        axis,
        changed: hit ? !!hit.changed : false,
        how: String(hit?.how || "Not specified."),
      };
    });
    const changed_count = items.filter((x) => x.changed).length;
    if (changed_count < 4) warn(`treatment ${idx + 1} (${t.title}) only changed ${changed_count}/6 novelty axes`);
    const tech_mix = normalizeTechMix(t.tech_mix);
    if (brief.noImages && tech_mix.footage_ai_pct > 0) {
      tech_mix.html_gsap_pct += tech_mix.footage_ai_pct;
      tech_mix.footage_ai_pct = 0;
    }
    return {
      index: idx + 1,
      title: String(t.title || `Treatment ${idx + 1}`),
      angle: String(t.angle || ""),
      pacing: {
        target_median_s: +t.pacing?.target_median_s || 1.2,
        cadence: String(t.pacing?.cadence || ""),
        cuts_style: String(t.pacing?.cuts_style || ""),
      },
      tech_mix,
      signature_hero_shot: {
        beat: String(t.signature_hero_shot?.beat || "reveal"),
        tech: String(t.signature_hero_shot?.tech || "hybrid"),
        scene_type: String(t.signature_hero_shot?.scene_type || "macro-ui"),
        description: String(t.signature_hero_shot?.description || ""),
      },
      tone_polarity_rule: String(t.tone_polarity_rule || ""),
      novelty_checklist: { changed_count, items },
      direction_notes: String(t.direction_notes || ""),
    };
  });

  if (!list.length) throw new Error("treatment: model returned zero treatments");

  const data = deepNoDashes({
    created: new Date().toISOString(),
    company: brand.name || brief.company || path.basename(projectDir),
    style: styleName,
    previous_project: prev,
    selected: null,
    treatments: list,
  });

  const jsonPath = path.join(projectDir, "treatment.json");
  const mdPath = path.join(projectDir, "treatment.md");
  writeJSON(jsonPath, data);
  fs.writeFileSync(mdPath, renderTreatmentMarkdown(data));
  log(`wrote ${jsonPath} and ${mdPath} (${list.length} options). Next: eden-motion treatment <slug> --pick <1..${list.length}>`);
  return data;
}

export function pickTreatment(projectDir, n) {
  const idx = parseInt(n, 10);
  const jsonPath = path.join(projectDir, "treatment.json");
  const mdPath = path.join(projectDir, "treatment.md");
  const data = readJSON(jsonPath);
  const list = data.treatments || [];
  const chosen = list.find((t) => t.index === idx) || list[idx - 1];
  if (!chosen) throw new Error(`treatment option ${n} not found (available: 1..${list.length})`);
  data.selected = chosen.index;
  data.selected_at = new Date().toISOString();
  writeJSON(jsonPath, deepNoDashes(data));
  fs.writeFileSync(mdPath, renderTreatmentMarkdown(data));
  log(`treatment locked: Option ${chosen.index} - ${chosen.title}. Next: eden-motion storyboard <slug>`);
  return chosen;
}

export function formatTreatmentPrompt(data) {
  if (!data || !Array.isArray(data.treatments) || !data.treatments.length) return "";
  const chosen = data.selected
    ? data.treatments.find((t) => t.index === data.selected) || data.treatments[data.selected - 1]
    : data.treatments[0];
  if (!chosen) return "";
  if (!data.selected) {
    warn(`treatment.json exists without a locked pick; defaulting to Option 1 (${chosen.title}). Run "eden-motion treatment <slug> --pick <n>" to lock another.`);
  }
  const tm = chosen.tech_mix || {};
  const hs = chosen.signature_hero_shot || {};
  const novelty = (chosen.novelty_checklist?.items || [])
    .filter((i) => i.changed)
    .map((i) => `${i.axis}: ${i.how}`)
    .join("; ");
  return noDashes([
    `APPROVED CREATIVE TREATMENT (Option ${chosen.index}: ${chosen.title} - FOLLOW THIS STRICTLY):`,
    `- Angle: ${chosen.angle}`,
    `- Pacing target: median ${chosen.pacing?.target_median_s ?? "?"}s | ${chosen.pacing?.cadence || ""} | cuts: ${chosen.pacing?.cuts_style || ""}`,
    `- Hybrid tech mix target: 2D HTML/GSAP ${tm.html_gsap_pct ?? 0}% (${tm.rationale?.html_gsap || ""}) | WebGL/Three.js ${tm.webgl_three_pct ?? 0}% (${tm.rationale?.webgl_three || ""}) | Blender 3D ${tm.blender_3d_pct ?? 0}% (${tm.rationale?.blender_3d || ""}) | Footage/AI ${tm.footage_ai_pct ?? 0}% (${tm.rationale?.footage_ai || ""})`,
    `- Signature hero shot (MUST include): [${hs.tech || "hybrid"} / ${hs.scene_type || ""}] on beat "${hs.beat || "reveal"}" - ${hs.description || ""}`,
    `- Tone/polarity rule: ${chosen.tone_polarity_rule || ""}`,
    novelty ? `- Novelty constraints vs previous film: ${novelty}` : "",
    chosen.direction_notes ? `- Director notes: ${chosen.direction_notes}` : "",
  ].filter(Boolean).join("\n"));
}

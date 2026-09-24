// storyboard: script.json + vo.json + brand.json -> storyboard.json (the render contract).
// Timing is deterministic (cuts follow VO line ends); the model only fills scene props,
// transitions and camera. Validation repairs anything the renderer cannot handle.
import fs from "node:fs";
import path from "node:path";
import { generateJSON } from "../lib/gemini.mjs";
import { SCENES, TRANSITIONS } from "../lib/catalog.mjs";
import { REPO } from "../lib/env.mjs";
import { log, warn, readJSON, writeJSON, deepNoDashes } from "../lib/util.mjs";

function availableScenes() {
  const dir = path.join(REPO, "runtime", "scenes");
  const src = fs.readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
  return Object.keys(SCENES).filter((k) => src.includes(`EM.scene("${k}"`));
}

export async function storyboard(projectDir, { endHold = 2.2 } = {}) {
  const brief = readJSON(path.join(projectDir, "brief.json"), {});
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

  log(`storyboarding ${lines.length} shots (${total}s, theme ${theme}, scenes: ${avail.length})`);
  const catalog = avail.map((k) => `- ${k}: ${SCENES[k]}`).join("\n");
  const trans = Object.entries(TRANSITIONS).map(([k, v]) => `- ${k}: ${v}`).join("\n");
  const assets = { logo: brand.logo, mark: brand.mark, screenshots: brand.screenshots || [] };

  const plan = await generateJSON(
    `You are the motion director of a premium explainer film (Burnwe / Lovable / Google launch quality).
BRAND: ${JSON.stringify({ name: brand.name, tagline: brand.tagline, one_liner: brand.one_liner, features: brand.features, proof: brand.proof, customers: brand.customers, cta: brand.cta, url: brand.url, product_kind: brand.product_kind })}
AVAILABLE BRAND ASSETS: ${JSON.stringify(assets)}
THEME: ${theme}

SHOTS (one per narration line, timing is fixed):
${lines.map((l, i) => `${i}. [${windows[i].start.toFixed(2)}-${windows[i].end.toFixed(2)}s, ${(windows[i].end - windows[i].start).toFixed(1)}s] beat=${l.beat} tone=${l.tone} suggested=${l.scene} VO: "${l.text}" | idea: ${l.visual}`).join("\n")}

SCENE CATALOG (type: props schema + purpose):
${catalog}

TRANSITIONS:
${trans}

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
${brief.video ? `- You MAY use up to 2 AI video clips in media-frame: props {kind:"video", src:"genvideo:<detailed still prompt> || <camera + motion direction, single shot>"}. Use them for the most cinematic human/world moments only.\n` : ""}- tone: keep the line's tone (dark/light); for theme glow you may use "cream", for cinematic use "black". The last shot must be logo-reveal.
- transitions: mostly "cut" (60%+). Use zoom-through into the reveal, push-left between features, at most 1 whip, at most 1 wipe. Transition duration 0.4-0.7.
- camera: omit (auto drift) or "push" for emphasis shots.

Return ONLY JSON: {"scenes":[{"i":0,"type":"...","tone":"dark|light|cream|black","transition":{"type":"cut|...","duration":0.5},"camera":null,"props":{...}}]}`,
    { temperature: 0.6 }
  );

  const byI = new Map((plan.scenes || []).map((s, k) => [s.i ?? k, s]));
  const scenes = lines.map((l, i) => {
    const s = byI.get(i) || { type: l.scene, props: { text: l.text } };
    let type = avail.includes(s.type) ? s.type : avail.includes(l.scene) ? l.scene : "headline";
    if (i === lines.length - 1) type = "logo-reveal";
    const win = windows[i];
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
      vo: l.text,
    };
  });
  // Typed text must start when the narrator starts, or the shot opens on an empty frame for
  // however long it takes to reach the excerpt. If the excerpt starts late, type the whole line.
  const norm = (w) => String(w).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  scenes.forEach((s, i) => {
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
  last.props = { tagline: brand.tagline, cta: brand.cta, url: brand.url, ...last.props };

  const sb = deepNoDashes({
    theme,
    duration: total,
    brand: {},
    vo: { file: vo.file, words: vo.words },
    scenes,
  });
  writeJSON(path.join(projectDir, "storyboard.json"), sb);
  const gens = JSON.stringify(sb).match(/"gen:/g)?.length || 0;
  log(`storyboard.json: ${scenes.length} scenes, ${scenes.filter((s) => s.transition).length} transitions, ${gens} images to generate`);
  return sb;
}

// research: company name (+ optional url) -> brand.json + assets/ (logo, mark, brand fonts,
// product screenshots). Sources: Gemini with Google Search, HyperFrames website capture,
// Gemini vision over the capture.
import fs from "node:fs";
import path from "node:path";
import { generateJSON, inlineImage, MODELS } from "../lib/gemini.mjs";
import { loadEnv } from "../lib/env.mjs";
import { logoSheet } from "../lib/browser.mjs";
import { log, warn, readJSON, writeJSON, runLive, deepNoDashes, run } from "../lib/util.mjs";

async function findSite(company, hint) {
  log(`finding official site for "${company}"`);
  const j = await generateJSON(
    `Find the official website and a factual profile of the company or product "${company}"${hint ? ` (hint: ${hint})` : ""}.
Return ONLY JSON: {"url":"https://...","name":"exact brand name","one_liner":"what it does in <= 14 words","category":"...","audience":"...","facts":["verifiable facts, numbers, customers, funding, awards, with no marketing fluff"],"competitors":["..."]}`,
    { search: true, temperature: 0.2 }
  );
  return j;
}

async function capture(url, outDir) {
  if (fs.existsSync(path.join(outDir, "extracted", "visible-text.txt"))) return true;
  log(`capturing ${url} (screenshots, assets, fonts, tokens)`);
  const env = { ...process.env, GEMINI_API_KEY: loadEnv().GEMINI_API_KEY || "" };
  try {
    await runLive("npx", ["-y", "hyperframes@0.8.72", "capture", url, "-o", outDir, "--max-screenshots", "14", "--timeout", "90000", "--capture-budget", "120000"], { env, cwd: path.dirname(outDir) });
    return true;
  } catch (e) {
    warn("capture failed: " + e.message);
    return false;
  }
}

function readIf(f, max = 20000) {
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8").slice(0, max) : "";
}

function listLogoCandidates(capDir) {
  const svgs = path.join(capDir, "assets", "svgs");
  const out = [];
  if (fs.existsSync(svgs)) {
    for (const f of fs.readdirSync(svgs).sort((a, b) => (b.startsWith("logo") ? 1 : 0) - (a.startsWith("logo") ? 1 : 0))) {
      if (!f.endsWith(".svg")) continue;
      const full = path.join(svgs, f);
      const sz = fs.statSync(full).size;
      if (sz < 300 || sz > 200000) continue;
      out.push(full);
    }
  }
  const assets = path.join(capDir, "assets");
  if (fs.existsSync(assets)) {
    for (const f of fs.readdirSync(assets)) {
      if (/^(icon-apple|favicon|logo)/i.test(f) && /\.(png|svg|jpg|webp)$/i.test(f)) out.push(path.join(assets, f));
    }
  }
  return out.slice(0, 40);
}

export async function research(projectDir, { company, url, lang = "en" } = {}) {
  const brief = readJSON(path.join(projectDir, "brief.json"), {});
  company = company || brief.company;
  url = url || brief.url;
  const resDir = path.join(projectDir, "research");
  fs.mkdirSync(resDir, { recursive: true });

  let site = readJSON(path.join(resDir, "site.json"), null);
  if (!site) {
    site = await findSite(company, url);
    if (url) site.url = url;
    writeJSON(path.join(resDir, "site.json"), site);
  }
  const capDir = path.join(resDir, "capture");
  const ok = site.url ? await capture(site.url, capDir) : false;

  const ex = path.join(capDir, "extracted");
  const visible = readIf(path.join(ex, "visible-text.txt"), 14000);
  const styles = readIf(path.join(ex, "design-styles.json"), 6000);
  const tokens = readIf(path.join(ex, "tokens.json"), 8000);
  const assetsMd = readIf(path.join(ex, "asset-descriptions.md"), 7000);
  const fontsManifest = readJSON(path.join(ex, "fonts-manifest.json"), { files: [] });

  // logo candidates sheet for the vision model
  const cands = ok ? listLogoCandidates(capDir) : [];
  let sheet = null;
  if (cands.length) {
    sheet = path.join(resDir, "logo-candidates.png");
    try {
      await logoSheet(cands, sheet);
    } catch (e) {
      warn("logo sheet failed: " + e.message);
      sheet = null;
    }
  }
  const shotsDir = path.join(capDir, "screenshots");
  const shots = fs.existsSync(shotsDir) ? fs.readdirSync(shotsDir).filter((f) => /^scroll-\d+\.png$/.test(f)).sort() : [];
  const contact = fs.existsSync(shotsDir) ? fs.readdirSync(shotsDir).filter((f) => f.startsWith("contact-sheet")).map((f) => path.join(shotsDir, f)) : [];

  log("extracting brand system with Gemini vision");
  const parts = [...contact.slice(0, 2).map(inlineImage), ...(sheet ? [inlineImage(sheet)] : [])];
  const brand = await generateJSON(
    `You are a brand strategist and motion designer preparing a premium 60 second explainer video for "${site.name || company}".
Site profile (from search): ${JSON.stringify(site)}

WEBSITE VISIBLE TEXT:
${visible}

DESIGN STYLES (computed typography):
${styles}

CSS TOKENS (truncated):
${tokens}

ASSET CAPTIONS:
${assetsMd}

Attached: website contact sheets${sheet ? " and a LOGO CANDIDATES sheet (each cell numbered in red, shown on white and on black)" : ""}.
Logo candidate files in order: ${JSON.stringify(cands.map((c) => path.relative(capDir, c)))}
Screenshot files in scroll order: ${JSON.stringify(shots)}

Return ONLY JSON:
{
 "name": "brand name as written in the logo",
 "tagline": "their real tagline or hero headline, verbatim if possible",
 "one_liner": "what it does, plain words, <= 14 words",
 "category": "...", "audience": "who buys it",
 "problem": "the pain it removes, concrete",
 "features": [{"title":"2-4 words","desc":"<= 12 words","icon":"lucide icon name"}],   // 3-5, real features from the site
 "proof": [{"value": 62, "prefix":"", "suffix":"%", "label":"what the number measures", "source":"quote from site"}], // ONLY numbers that appear on the site; [] if none
 "customers": ["logos/customer names mentioned on site"],
 "cta": "their CTA text (e.g. Get started)", "url": "domain.com without https",
 "voice": "3-5 adjectives for tone",
 "colors": {"accent":"#hex primary brand colour","accent2":"#hex secondary/gradient partner","accent3":"#hex third","bg":"#hex dominant background","fg":"#hex text", "dark": true|false (is the brand dark-first)},
 "fonts": {"display":"display font family name as used on site","body":"body font family","display_google":"closest Google Fonts family for display","body_google":"closest Google Fonts family for body"},
 "logo_index": index of the best full logo (wordmark or lockup) in the candidates or null,
 "mark_index": index of the best standalone symbol/mark or null,
 "logo_on_dark": true if the chosen logo is light-coloured (needs a dark background),
 "ui_screenshots": ["screenshot files that show real product UI or dashboards, best first"],
 "theme": "saas-light" | "saas-dark" | "glow" | "cinematic",   // which of our looks fits the brand best
 "product_kind": "saas-app" | "ai-tool" | "fintech" | "hardware" | "consumer-app" | "service" | "other"
}
Use only information supported by the site or search facts. No em dashes or en dashes.`,
    { model: MODELS.vision, parts, temperature: 0.3 }
  );

  // assets
  const assets = path.join(projectDir, "assets");
  fs.mkdirSync(assets, { recursive: true });
  const pick = (i) => (i != null && cands[i] ? cands[i] : null);
  const logoSrc = pick(brand.logo_index), markSrc = pick(brand.mark_index);
  // SVG logos often use currentColor (renders black as <img>). Bake explicit colours and flag
  // monochrome marks so scenes can flip them to white on dark tones.
  const saveLogo = (src, name) => {
    const ext = path.extname(src);
    if (ext === ".svg") {
      let svg = fs.readFileSync(src, "utf8");
      const colors = new Set((svg.match(/(?:fill|stroke)="(#[0-9a-fA-F]{3,8}|rgb[^"]+|[a-z]+)"/g) || []).map((m) => m.split('"')[1].toLowerCase()).filter((c) => !["none", "transparent", "currentcolor", "white", "#fff", "#ffffff"].includes(c)));
      const mono = colors.size <= 1;
      svg = svg.replace(/currentColor/gi, "#111111");
      // Only touch the ROOT tag: a duplicate attribute makes the SVG invalid XML and <img> renders nothing.
      svg = svg.replace(/<svg\b[^>]*>/, (tag) => {
        let t = tag.replace(/\s(width|height|size)="[^"]*"/g, "");
        if (!/\sfill=/.test(t)) t = t.replace(/<svg/, '<svg fill="#111111"');
        return t.replace(/<svg/, '<svg height="200"');
      });
      fs.writeFileSync(path.join(assets, name + ".svg"), svg);
      return { file: `assets/${name}.svg`, mono };
    }
    fs.copyFileSync(src, path.join(assets, name + ext));
    return { file: `assets/${name}${ext}`, mono: false };
  };
  if (logoSrc) {
    const r = saveLogo(logoSrc, "logo");
    brand.logo = r.file;
    brand.logoMono = r.mono;
  }
  if (markSrc) {
    const r = saveLogo(markSrc, "mark");
    brand.mark = r.file;
    brand.markMono = r.mono;
  }
  // product screenshots -> jpg 1920 wide. Each one is vetted by vision: websites love cookie
  // banners, chat widgets and modals, and one of those in a hero UI shot kills the film.
  brand.screenshots = [];
  const candidates = [...new Set([...(brand.ui_screenshots || []), ...shots])].slice(0, 12);
  for (const f of candidates) {
    if (brand.screenshots.length >= 4) break;
    const src = path.join(shotsDir, f);
    if (!fs.existsSync(src)) continue;
    const n = brand.screenshots.length + 1;
    const dst = path.join(assets, `ui-${n}.jpg`);
    run("ffmpeg", ["-y", "-v", "error", "-i", src, "-vf", "scale=1920:-2", "-q:v", "3", dst], { allowFail: true });
    if (!fs.existsSync(dst)) continue;
    let verdict = { ok: false };
    try {
      verdict = await generateJSON(
        `Screenshot of ${brand.name}'s website. Return ONLY JSON {"banner": true if ANY cookie/consent/privacy banner, newsletter popup, chat widget bubble covering content, or modal overlay is visible, "product_ui": true if it clearly shows the real product interface (app screens, dashboards, editor, data views) rather than only marketing copy, stock photos or logos, "quality": 1-5 how impressive it would look as a hero product shot}`,
        { model: MODELS.fast, parts: [inlineImage(dst)], temperature: 0 }
      );
      verdict.ok = !verdict.banner && verdict.product_ui && (verdict.quality || 0) >= 3;
    } catch (e) {
      warn("screenshot vetting failed: " + e.message.slice(0, 120));
    }
    if (verdict.ok) brand.screenshots.push(`assets/ui-${n}.jpg`);
    else fs.rmSync(dst, { force: true });
  }
  if (!brand.screenshots.length) warn("no clean product screenshots: ui-window will use designed dashboards");
  // brand font files captured from the site (real typeface beats a Google lookalike)
  const fontFiles = [];
  for (const role of ["display", "body"]) {
    const fam = brand.fonts?.[role];
    if (!fam) continue;
    const hits = (fontsManifest.files || []).filter((f) => f.family?.toLowerCase() === fam.toLowerCase() && !f.isIcon && f.style !== "italic");
    for (const f of hits) {
      const src = path.join(capDir, "assets", "fonts", f.file);
      if (!fs.existsSync(src)) continue;
      fs.mkdirSync(path.join(assets, "fonts"), { recursive: true });
      fs.copyFileSync(src, path.join(assets, "fonts", f.file));
      if (fontFiles.some((x) => x.file === "assets/fonts/" + f.file)) continue;
      const variable = (f.variationAxes || []).includes("wght");
      fontFiles.push({ family: f.family, weight: variable ? "100 900" : f.weight || 400, file: "assets/fonts/" + f.file });
    }
  }
  brand.fontFiles = fontFiles;
  brand.facts = site.facts || [];
  brand.site = site.url;
  const out = deepNoDashes(brand);
  writeJSON(path.join(projectDir, "brand.json"), out);
  log(`brand.json: ${out.name} | theme ${out.theme} | logo ${out.logo || "none"} | ${fontFiles.length} font files | ${out.screenshots.length} screenshots`);
  return out;
}

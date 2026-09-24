// build: storyboard.json + brand.json -> comp/index.html (self-contained HyperFrames project).
// Fonts and icons are vendored locally so renders never touch the network.
import fs from "node:fs";
import path from "node:path";
import { REPO } from "../lib/env.mjs";
import { log, warn, readJSON, writeJSON } from "../lib/util.mjs";

const RUNTIME = path.join(REPO, "runtime");
const CACHE = path.join(REPO, ".cache");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const DEFAULT_ICONS = ["sparkles", "zap", "check", "arrow-right", "chart-column", "shield-check", "clock", "users", "bot", "layers", "workflow", "rocket", "target", "globe", "lock", "message-square", "file-text", "calendar", "trending-up", "cpu", "database", "wand-sparkles", "search", "bell", "mail", "credit-card", "settings", "heart", "star", "play", "image", "video", "mic", "code", "cloud", "link", "gauge", "brain", "puzzle", "circle-check", "x", "triangle-alert", "inbox", "folder", "chart-pie", "dollar-sign", "building-2", "smartphone", "lightbulb", "refresh-cw"];

function collectIcons(obj, set) {
  if (Array.isArray(obj)) obj.forEach((o) => collectIcons(o, set));
  else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      if (k === "icon" && typeof v === "string") set.add(v);
      else collectIcons(v, set);
    }
  }
  return set;
}

// Lucide renamed many icons; LLMs still use the old names.
const ICON_ALIASES = { "alert-triangle": "triangle-alert", "alert-circle": "circle-alert", "check-circle": "circle-check", "check-circle-2": "circle-check-big", "bar-chart": "chart-column", "bar-chart-2": "chart-column", "bar-chart-3": "chart-column", "bar-chart-4": "chart-column", "line-chart": "chart-line", "pie-chart": "chart-pie", "area-chart": "chart-area", "x-circle": "circle-x", "help-circle": "circle-help", "play-circle": "circle-play", "user-circle": "circle-user", "plus-circle": "circle-plus", "edit": "pencil", "edit-2": "pencil", "edit-3": "pencil-line", "trending-up": "trending-up", "sparkle": "sparkles", "magic-wand": "wand-sparkles", "wand": "wand-sparkles", "git-pull-request": "git-pull-request", "unlock": "lock-open", "grid": "grid-3x3", "layout": "layout-dashboard", "slack": "message-square", "github": "git-branch", "figma": "pen-tool", "twitter": "at-sign", "linkedin": "briefcase", "chrome": "globe", "home": "house" };

async function fetchIcon(name) {
  name = ICON_ALIASES[name] || name;
  const dir = path.join(CACHE, "icons");
  const f = path.join(dir, name + ".svg");
  if (fs.existsSync(f)) return fs.readFileSync(f, "utf8");
  const res = await fetch(`https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/${name}.svg`);
  if (!res.ok) return null;
  let svg = await res.text();
  // strip size/class on the ROOT tag only (inner <rect width height> must survive)
  svg = svg.replace(/<!--[\s\S]*?-->/g, "").replace(/<svg\b[^>]*>/, (t) => t.replace(/\s(width|height)="\d+"/g, "").replace(/\sclass="[^"]*"/, ""));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(f, svg);
  return svg;
}

export async function buildIcons(sb, outFile) {
  const names = [...collectIcons(sb, new Set(DEFAULT_ICONS))];
  const map = {};
  await Promise.all(
    names.map(async (n) => {
      const svg = await fetchIcon(n).catch(() => null);
      if (svg) map[n] = svg;
      else warn(`icon not found: ${n} (falls back to sparkles)`);
    })
  );
  fs.writeFileSync(outFile, "window.EM_ICONS=" + JSON.stringify(map) + ";\n");
}

// Download Google Font families as woff2 and return @font-face CSS with local urls.
export async function vendorFonts(families, fontDir, relPrefix = "fonts") {
  fs.mkdirSync(fontDir, { recursive: true });
  let css = "";
  for (const fam of families.filter(Boolean)) {
    const q = fam.replace(/ /g, "+") + ":wght@400;500;600;700;800";
    const cacheCss = path.join(CACHE, "fonts", fam.replace(/\W+/g, "_") + ".css");
    let src;
    if (fs.existsSync(cacheCss)) src = fs.readFileSync(cacheCss, "utf8");
    else {
      const res = await fetch(`https://fonts.googleapis.com/css2?family=${q}&display=block`, { headers: { "user-agent": UA } });
      if (!res.ok) {
        warn(`font not on Google Fonts: ${fam}`);
        continue;
      }
      src = await res.text();
      fs.mkdirSync(path.dirname(cacheCss), { recursive: true });
      fs.writeFileSync(cacheCss, src);
    }
    // keep only latin + latin-ext subsets
    const blocks = src.split("/*").filter((b) => /latin/.test(b.split("*/")[0] || ""));
    for (const b of blocks) {
      const body = b.slice(b.indexOf("*/") + 2);
      const m = body.match(/url\((https:[^)]+\.woff2)\)/);
      if (!m) continue;
      const fname = path.basename(new URL(m[1]).pathname);
      const cached = path.join(CACHE, "fonts", fname);
      if (!fs.existsSync(cached)) {
        const r = await fetch(m[1]);
        fs.writeFileSync(cached, Buffer.from(await r.arrayBuffer()));
      }
      fs.copyFileSync(cached, path.join(fontDir, fname));
      css += body.replace(m[1], `${relPrefix}/${fname}`) + "\n";
    }
  }
  return css;
}

async function vendorGsap(dest) {
  const f = path.join(CACHE, "gsap-3.14.2.min.js");
  if (!fs.existsSync(f)) {
    const res = await fetch("https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js");
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(f, Buffer.from(await res.arrayBuffer()));
  }
  fs.copyFileSync(f, dest);
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

export async function build(projectDir, { slow = 1, out = "comp" } = {}) {
  const sb = readJSON(path.join(projectDir, "storyboard.json"));
  const brand = readJSON(path.join(projectDir, "brand.json"), {});
  const comp = path.join(projectDir, out);
  fs.mkdirSync(comp, { recursive: true });

  // runtime + project assets
  copyDir(RUNTIME, path.join(comp, "runtime"));
  const assetsSrc = path.join(projectDir, "assets");
  if (fs.existsSync(assetsSrc)) copyDir(assetsSrc, path.join(comp, "assets"));
  await buildIcons(sb, path.join(comp, "runtime", "icons.js"));
  await vendorGsap(path.join(comp, "runtime", "gsap.min.js"));

  // Fonts: the brand's own captured woff2 files win; otherwise the closest Google family.
  const fonts = brand.fonts || {};
  const local = brand.fontFiles || [];
  const hasLocal = (fam) => fam && local.some((f) => f.family.toLowerCase() === fam.toLowerCase());
  const pickFont = (role, dflt) => (hasLocal(fonts[role]) ? fonts[role] : fonts[role + "_google"] || fonts[role] || dflt);
  const display = sb.fonts?.display || pickFont("display", sb.theme === "cinematic" ? "Outfit" : "Inter Tight");
  const body = sb.fonts?.body || pickFont("body", "Inter");
  const localCss = local
    .map((f) => `@font-face { font-family: "${f.family}"; src: url("${f.file}") format("woff2"); font-weight: ${f.weight}; font-style: normal; font-display: block; }`)
    .join("\n");
  const google = [display, body, "Inter Tight", "Inter"].filter((f) => !hasLocal(f));
  const fontCss = localCss + "\n" + (await vendorFonts([...new Set(google)], path.join(comp, "fonts")));
  fs.writeFileSync(path.join(comp, "fonts.css"), fontCss);

  // The accent is a highlighter: it must be chromatic. Monochrome brands (black/white/grey
  // primary) promote their first colourful secondary instead.
  const c = { ...(brand.colors || {}) };
  const chroma = (hex) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return 0;
    const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    return Math.max(r, g, b) - Math.min(r, g, b);
  };
  if (chroma(c.accent) < 0.18) {
    const pool = [c.accent2, c.accent3].filter((x) => chroma(x) >= 0.18);
    if (pool.length) {
      c.accent = pool[0];
      c.accent2 = pool[1] || pool[0];
    }
  }
  const tokens = [
    `--font-display: "${display}", "Inter Tight", system-ui, sans-serif;`,
    `--font-body: "${body}", "Inter", system-ui, sans-serif;`,
    c.accent && `--accent: ${c.accent};`,
    c.accent2 && `--accent2: ${c.accent2};`,
    c.accent3 && `--accent3: ${c.accent3};`,
    (c.glow1 || c.accent) && `--glow1: ${c.glow1 || c.accent};`,
    (c.glow2 || c.accent2) && `--glow2: ${c.glow2 || c.accent2};`,
    (c.glow3 || c.accent3) && `--glow3: ${c.glow3 || c.accent3};`,
  ].filter(Boolean);
  const themeOverrides = sb.brandBackground ? [c.bg && `--bg: ${c.bg};`, c.fg && `--fg: ${c.fg};`].filter(Boolean) : [];

  const sceneFiles = fs.readdirSync(path.join(RUNTIME, "scenes")).filter((f) => f.endsWith(".js")).sort();
  const sceneCss = fs.readdirSync(path.join(RUNTIME, "scenes")).filter((f) => f.endsWith(".css")).sort();
  const customDir = path.join(projectDir, "custom-scenes");
  const customFiles = fs.existsSync(customDir) ? fs.readdirSync(customDir).filter((f) => f.endsWith(".js")) : [];
  if (customFiles.length) copyDir(customDir, path.join(comp, "custom-scenes"));

  const total = sb.duration;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<title>${(brand.name || "eden-motion").replace(/</g, "")}</title>
<script src="runtime/gsap.min.js"></script>
<link rel="stylesheet" href="fonts.css" />
<link rel="stylesheet" href="runtime/base.css" />
${sceneCss.map((f) => `<link rel="stylesheet" href="runtime/scenes/${f}" />`).join("\n")}
<link rel="stylesheet" href="runtime/scenes.css" />
<style>
:root { ${tokens.join(" ")} }
html[data-theme] { ${themeOverrides.join(" ")} }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${(total * slow).toFixed(3)}">
  <div id="bg"></div>
  <div id="stage"></div>
</div>
<script>window.EM_SLOW = ${slow}; window.STORYBOARD = ${JSON.stringify({ ...sb, brand: { ...brand, ...(sb.brand || {}) } })};</script>
<script src="runtime/icons.js"></script>
<script src="runtime/engine.js"></script>
<script src="runtime/fx.js"></script>
<script src="runtime/transitions.js"></script>
<script src="runtime/backgrounds.js"></script>
${sceneFiles.map((f) => `<script src="runtime/scenes/${f}"></script>`).join("\n")}
${customFiles.map((f) => `<script src="custom-scenes/${f}"></script>`).join("\n")}
<script>window.__timelines = window.__timelines || {}; window.__timelines["main"] = EM.boot();</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(comp, "index.html"), html);
  log(`built ${path.relative(process.cwd(), comp)}/index.html (slow=${slow}, ${sb.scenes.length} scenes, ${total}s)`);
  return comp;
}

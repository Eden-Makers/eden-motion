// Adapted from NiazMorshed2007/reanimate (MIT License, Copyright (c) 2026 Niaz Morshed).
// Capture any live URL or local HTML file using existing Chromium (puppeteer-core + findChrome):
// writes frames/, frames.json, video.mp4, final.png, inspect.json, track.json, capture.json, and optional gl/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PNG } from "pngjs";
import { findChrome } from "../browser.mjs";
import { run, sleep } from "../util.mjs";
import { writeGlArtifacts } from "./gl.mjs";
import { parseRegion } from "./compare.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const pad = (n, w = 4) => String(n).padStart(w, "0");

function loadInpage(file, cfg) {
  const src = fs.readFileSync(path.join(HERE, file), "utf8").trim().replace(/;$/, "");
  return `(${src})(${JSON.stringify(cfg)});`;
}

const CTX_PROBE = `(() => {
  for (const C of [self.HTMLCanvasElement, self.OffscreenCanvas]) {
    if (!C) continue;
    const g = C.prototype.getContext;
    C.prototype.getContext = function (type) {
      const c = g.apply(this, arguments);
      if (c && !this.__mcCtx) try { this.__mcCtx = String(type); } catch {}
      return c;
    };
  }
})();`;

const TRACKER_SRC = `(() => {
  const sels = __SELS__;
  const w = window;
  w.__mc = { samples: [], t0: null, running: true };
  const sample = () => {
    if (!w.__mc.running) return;
    const t = performance.now();
    const els = {};
    for (const s of sels) {
      let el = null;
      try { el = document.querySelector(s); } catch {}
      if (!el) { els[s] = null; continue; }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      els[s] = {
        x: +r.x.toFixed(2),
        y: +r.y.toFixed(2),
        w: +r.width.toFixed(2),
        h: +r.height.toFixed(2),
        opacity: +(+cs.opacity).toFixed(3),
        transform: cs.transform,
        clipPath: cs.clipPath === 'none' ? undefined : cs.clipPath,
      };
    }
    w.__mc.samples.push({ t, scrollY: w.scrollY, els });
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
})();`;

const INSPECT_FN = `(sel) => {
  const desc = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].slice(0, 4).join('.') : '');
  const root = sel ? document.querySelector(sel) : document.body;
  const w = window;
  const libs = [];
  const has = (c) => { try { return !!c(); } catch { return false; } };
  if (has(() => w.gsap)) libs.push('gsap' + (has(() => w.ScrollTrigger) ? '+ScrollTrigger' : ''));
  if (has(() => w.lottie || w.bodymovin || document.querySelector('lottie-player,dotlottie-player,[data-lottie],.lottie'))) libs.push('lottie');
  const canvases = [...document.querySelectorAll('canvas')].map((c) => ({
    el: desc(c),
    context: c.__mcCtx || null,
    size: [c.width, c.height],
    css: (() => { const r = c.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })(),
  }));
  if (has(() => w.__THREE__ || w.THREE)) libs.push('three.js r' + (w.__THREE__ || (w.THREE && w.THREE.REVISION) || '?'));
  if (canvases.some((c) => /webgl/.test(c.context || ''))) libs.push('webgl canvas');
  if (canvases.some((c) => c.context === 'webgpu')) libs.push('webgpu canvas');
  if (canvases.some((c) => c.context === '2d')) libs.push('canvas 2d');
  if (has(() => w.BABYLON)) libs.push('babylon.js');
  if (has(() => w.PIXI || w.__PIXI_APP__ || w.__PIXI_RENDERER__)) libs.push('pixi.js');
  if (has(() => w.rive || document.querySelector('canvas[data-rive], .rive-canvas'))) libs.push('rive');
  if (has(() => w.anime)) libs.push('anime.js');
  if (has(() => w.Lenis || document.documentElement.classList.contains('lenis'))) libs.push('lenis');
  if (has(() => document.querySelector('[data-framer-name],[data-framer-component-type]'))) libs.push('framer-sites');
  if (has(() => document.querySelector('[data-projection-id],[data-framer-appear-id]') || [...document.scripts].some((s) => /framer-motion|motion-dom/.test(s.src)))) libs.push('framer-motion');
  if (has(() => w.__NEXT_DATA__ || document.getElementById('__next'))) libs.push('next.js');
  if (has(() => [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.cssText.includes('animation-timeline')); } catch { return false; } }))) libs.push('css-scroll-animations');

  const fonts = [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '') + ' ' + f.weight + ' ' + f.style))];

  const keyframes = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { keyframes.push({ unreadable: sheet.href }); continue; }
    const walk = (list) => {
      for (const r of list) {
        if (r.type === 7) keyframes.push({ name: r.name, css: r.cssText });
        else if (r.cssRules) walk(r.cssRules);
      }
    };
    walk(rules);
  }

  const anims = (root ? root.getAnimations({ subtree: true }) : document.getAnimations()).slice(0, 200).map((an) => {
    const eff = an.effect;
    const tgt = eff && eff.target;
    let kf = [];
    try {
      kf = eff.getKeyframes().slice(0, 24).map((k) => {
        const o = {};
        for (const [p, v] of Object.entries(k)) if (p !== 'computedOffset' && p !== 'composite') o[p] = v;
        return o;
      });
    } catch {}
    return {
      kind: an.constructor.name,
      name: an.animationName || an.transitionProperty || an.id || '',
      target: tgt ? desc(tgt) : null,
      timing: eff ? eff.getTiming() : null,
      keyframes: kf,
      playState: an.playState,
      currentTime: an.currentTime,
      timeline: an.timeline && an.timeline.constructor.name,
    };
  });

  const PROPS = [
    'opacity','transform','transform-origin','transition','animation','will-change','color','background-color',
    'background-image','font-family','font-size','font-weight','line-height','letter-spacing','border-radius',
    'box-shadow','filter','backdrop-filter','clip-path','overflow','position','display','gap','padding','mask-image'
  ];
  const nodes = [];
  if (root) {
    const all = [root, ...root.querySelectorAll('*')].slice(0, 150);
    for (const el of all) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const style = {};
      for (const p of PROPS) {
        const v = cs.getPropertyValue(p);
        if (!v || v === 'none' || v === 'normal' || v === 'auto' || v === 'static' || v === 'visible' || v === '0px' || v === 'all' || v === 'all 0s ease 0s' || v === 'rgba(0, 0, 0, 0)') continue;
        if (p === 'opacity' && v === '1') continue;
        if (p === 'transform' && v === 'matrix(1, 0, 0, 1, 0, 0)') continue;
        if (p === 'transform-origin') continue;
        style[p] = v;
      }
      const text = el.childElementCount === 0 ? (el.textContent || '').trim().slice(0, 80) : undefined;
      nodes.push({
        el: desc(el),
        rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
        text,
        style,
        src: el.currentSrc || el.src || undefined,
      });
    }
  }
  const rect = root ? root.getBoundingClientRect() : null;
  const bodyCs = getComputedStyle(document.body);
  return {
    url: location.href,
    title: document.title,
    viewport: [innerWidth, innerHeight],
    scrollY,
    devicePixelRatio,
    bodyBg: bodyCs.backgroundColor,
    bodyColor: bodyCs.color,
    libs,
    fonts,
    canvases,
    target: sel ? { selector: sel, found: !!root, rect: rect && [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)] } : null,
    animations: anims,
    keyframes,
    nodes,
  };
}`;

function parseViewport(v) {
  if (!v) return { width: 1440, height: 900 };
  if (typeof v === "object" && v.width && v.height) return { width: Number(v.width), height: Number(v.height) };
  const m = String(v).match(/^(\d+)x(\d+)$/);
  if (!m) throw new Error(`bad viewport "${v}", expected WxH`);
  return { width: Number(m[1]), height: Number(m[2]) };
}

function normalizeUrl(raw) {
  const s = String(raw);
  if (/^[a-z]+:\/\//i.test(s)) return s;
  return pathToFileURL(path.resolve(s)).href;
}

async function pointAt(page, sel, fx = 0.5, fy = 0.5) {
  const el = await page.$(sel);
  if (!el) throw new Error(`selector not found: ${sel}`);
  const b = await el.boundingBox();
  if (!b) throw new Error(`selector not visible: ${sel}`);
  return { x: b.x + b.width * fx, y: b.y + b.height * fy };
}

export async function capturePage(urlInput, outDir, opts = {}) {
  const out = path.resolve(outDir);
  fs.mkdirSync(out, { recursive: true });

  const url = normalizeUrl(urlInput);
  const viewport = parseViewport(opts.viewport);
  const scale = Number(opts.scale) || 1;
  const fps = Number(opts.fps) || 25;
  const duration = Number(opts.duration) || 3000;
  const preRoll = opts.preRoll !== undefined ? Number(opts.preRoll) : 200;
  const waitBefore = opts.waitBefore !== undefined ? Number(opts.waitBefore) : 800;
  const trigger = opts.trigger || "load";
  const selector = opts.selector || null;
  const target = opts.target || selector;
  const padPx = Number(opts.pad) || 0;
  const wantVideo = opts.video !== false;
  const clockMode = opts.clock || "virtual";
  if (clockMode !== "virtual" && clockMode !== "real") {
    throw new Error(`clock must be "virtual" or "real", got "${clockMode}"`);
  }
  const virtual = clockMode === "virtual";
  const seed = opts.seed !== undefined ? Number(opts.seed) : virtual ? 1 : null;
  const rafHz = Number(opts.rafHz) || 60;
  const networkWait = opts.networkWait !== undefined ? Number(opts.networkWait) : 3000;
  const wantGl = !!opts.gl;
  const glBuffersMb = Number(opts.glBuffersMb) || 0;
  const gpuMode = opts.gpu === "hardware" ? "hardware" : "software";
  const trackList = Array.isArray(opts.track)
    ? opts.track.map((s) => String(s).trim()).filter(Boolean)
    : typeof opts.track === "string"
      ? opts.track.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  const trackSelectors = trackList.length ? trackList : selector ? [selector] : [];

  const hoverAt = Array.isArray(opts.hoverAt) ? opts.hoverAt : [0.5, 0.5];
  const preHover = opts.preHover || null;
  const preHoverMs = Number(opts.preHoverMs) || 1500;
  const leaveTo = Array.isArray(opts.leaveTo) ? opts.leaveTo : [viewport.width / 2, 8];
  const movePath = Array.isArray(opts.path) && opts.path.length ? opts.path : [[0.2, 0.5], [0.8, 0.5]];
  const pathMs = Number(opts.pathMs) || 400;
  const scrollSteps = Number(opts.scrollSteps) || 12;
  const scrollMs = Number(opts.scrollMs) || 600;
  const preJs = opts.preJs
    ? fs.existsSync(String(opts.preJs))
      ? fs.readFileSync(String(opts.preJs), "utf8")
      : String(opts.preJs)
    : null;

  const launchArgs = ["--no-sandbox", "--allow-file-access-from-files", "--disable-web-security"];
  if (gpuMode === "hardware") {
    launchArgs.push("--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-webgpu");
    if (process.platform === "darwin") launchArgs.push("--use-angle=metal");
  }
  if (virtual) launchArgs.push("--disable-smooth-scrolling");

  const puppeteer = (await import("puppeteer-core")).default;
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: opts.headed ? false : true,
    args: launchArgs,
  });

  const framesDir = path.join(out, "frames");
  let framesMeta = null;
  let inspect = null;
  let trackSamples = [];
  let glRaw = null;
  let renderer = null;
  let clip = null;
  let perfAtTrigger = null;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: scale });

    const mediaFeatures = [];
    if (opts.colorScheme) mediaFeatures.push({ name: "prefers-color-scheme", value: opts.colorScheme });
    if (opts.reducedMotion) mediaFeatures.push({ name: "prefers-reduced-motion", value: opts.reducedMotion });
    if (mediaFeatures.length) await page.emulateMediaFeatures(mediaFeatures);

    // Order matters: CTX_PROBE -> clock -> gl-hooks -> DOM tracker
    await page.evaluateOnNewDocument(CTX_PROBE);
    if (virtual || seed !== null) {
      await page.evaluateOnNewDocument(loadInpage("clock.js", { virtual, seed, rafHz, freezeAtStart: virtual }));
    }
    if (wantGl) {
      await page.evaluateOnNewDocument(loadInpage("gl-hooks.js", { dumpBuffers: glBuffersMb * 1024 * 1024 }));
    }
    if (trackSelectors.length) {
      await page.evaluateOnNewDocument(TRACKER_SRC.replace("__SELS__", JSON.stringify(trackSelectors)));
    }

    // Track in-flight network requests for virtual clock stability
    const inflight = new Map();
    page.on("request", (r) => inflight.set(r, Date.now()));
    page.on("requestfinished", (r) => inflight.delete(r));
    page.on("requestfailed", (r) => inflight.delete(r));

    const networkQuiet = async () => {
      const until = Date.now() + networkWait;
      while (Date.now() < until) {
        const busy =
          [...inflight.values()].some((t) => Date.now() - t < 10000) ||
          (virtual && (await page.evaluate(() => window.__mcClock?.busy?.() ?? 0).catch(() => 0)) > 0);
        if (!busy) return;
        await sleep(10);
      }
    };

    const clipOf = async () => {
      let c = parseRegion(opts.clip);
      if (!c && selector) {
        const r = await page.evaluate((s) => {
          const el = document.querySelector(s);
          if (!el) return null;
          const b = el.getBoundingClientRect();
          return { x: b.x, y: b.y, width: b.width, height: b.height };
        }, selector);
        if (r && r.width > 0 && r.height > 0) {
          const x = Math.max(0, Math.floor(r.x - padPx));
          const y = Math.max(0, Math.floor(r.y - padPx));
          c = {
            x,
            y,
            width: Math.max(2, Math.ceil(Math.min(viewport.width - x, r.width + 2 * padPx))),
            height: Math.max(2, Math.ceil(Math.min(viewport.height - y, r.height + 2 * padPx))),
          };
        }
      }
      return c;
    };

    const settle = async (ms) => {
      if (!virtual) { await sleep(ms); return; }
      for (let left = ms; left > 0; left -= 100) {
        await page.evaluate((x) => window.__mcClock.advance(x), Math.min(100, left));
        await networkQuiet();
      }
    };

    const scrollTarget = async () => {
      if (opts.scrollTo !== undefined && opts.scrollTo !== null && /^\d+$/.test(String(opts.scrollTo))) {
        return Number(opts.scrollTo);
      }
      const sel = opts.scrollTo ? String(opts.scrollTo) : selector;
      if (!sel) return Math.round(viewport.height * 0.8);
      return page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) throw new Error("scroll target not found: " + s);
        return window.scrollY + el.getBoundingClientRect().top - window.innerHeight * 0.25;
      }, sel);
    };

    const prepareTrigger = async () => {
      await settle(waitBefore);
      if (preJs) await page.evaluate(preJs);
      if (selector && trigger !== "scroll") {
        const ok = await page.evaluate((s) => {
          const el = document.querySelector(s);
          if (!el) return false;
          el.scrollIntoView({ block: "center", inline: "center" });
          return true;
        }, selector);
        if (!ok) throw new Error(`selector not found: ${selector}`);
        await settle(300);
      } else if (trigger === "scroll" && selector) {
        await page.evaluate((s) => {
          const el = document.querySelector(s);
          if (el) window.scrollTo(0, Math.max(0, window.scrollY + el.getBoundingClientRect().top - window.innerHeight - 20));
        }, selector);
        await settle(300);
      }
      if (preHover) {
        const pt = await pointAt(page, preHover, hoverAt[0], hoverAt[1]);
        await page.mouse.move(pt.x, pt.y);
        await settle(preHoverMs);
      }
    };

    const planTrigger = async () => {
      const tick = 1000 / rafHz;
      const glide = (pts) => {
        const acts = [];
        const steps = Math.max(1, Math.round(pathMs / tick));
        for (let i = 1; i < pts.length; i++) {
          for (let k = 1; k <= steps; k++) {
            const f = k / steps, p0 = pts[i - 1], p1 = pts[i];
            acts.push({
              at: (i - 1) * pathMs + f * pathMs,
              run: () => page.mouse.move(p0.x + (p1.x - p0.x) * f, p0.y + (p1.y - p0.y) * f),
            });
          }
        }
        return acts;
      };
      switch (trigger) {
        case "load":
        case "none":
          return [];
        case "hover": {
          if (!target) throw new Error("hover trigger requires selector or target");
          const pt = await pointAt(page, target, hoverAt[0], hoverAt[1]);
          return [{ at: 0, run: () => page.mouse.move(pt.x, pt.y) }];
        }
        case "leave":
          return [{ at: 0, run: () => page.mouse.move(leaveTo[0], leaveTo[1]) }];
        case "click": {
          if (!target) throw new Error("click trigger requires selector or target");
          return [{ at: 0, run: () => page.click(target) }];
        }
        case "move":
        case "drag": {
          if (!target) throw new Error(`${trigger} trigger requires selector or target`);
          const pts = [];
          for (const [fx, fy] of movePath) pts.push(await pointAt(page, target, fx, fy));
          const acts = glide(pts);
          acts.unshift({
            at: 0,
            run: async () => {
              await page.mouse.move(pts[0].x, pts[0].y);
              if (trigger === "drag") await page.mouse.down();
            },
          });
          if (trigger === "drag") acts.push({ at: acts[acts.length - 1].at, run: () => page.mouse.up() });
          return acts;
        }
        case "scroll": {
          const from = await page.evaluate(() => window.scrollY);
          const to = await scrollTarget();
          const delta = (to - from) / scrollSteps;
          const acts = [{ at: 0, run: () => page.mouse.move(viewport.width / 2, viewport.height / 2) }];
          for (let i = 0; i < scrollSteps; i++) {
            acts.push({ at: (i * scrollMs) / scrollSteps, run: () => page.mouse.wheel({ deltaX: 0, deltaY: delta }) });
          }
          return acts;
        }
        default:
          throw new Error(`unknown trigger "${trigger}"`);
      }
    };

    const runRealTrigger = async () => {
      switch (trigger) {
        case "load":
        case "none":
          return;
        case "hover": {
          if (!target) throw new Error("hover trigger requires selector or target");
          const pt = await pointAt(page, target, hoverAt[0], hoverAt[1]);
          await page.mouse.move(pt.x, pt.y);
          return;
        }
        case "leave":
          await page.mouse.move(leaveTo[0], leaveTo[1]);
          return;
        case "click":
          if (!target) throw new Error("click trigger requires selector or target");
          await page.click(target);
          return;
        case "move":
        case "drag": {
          if (!target) throw new Error(`${trigger} trigger requires selector or target`);
          const pts = [];
          for (const [fx, fy] of movePath) pts.push(await pointAt(page, target, fx, fy));
          await page.mouse.move(pts[0].x, pts[0].y);
          if (trigger === "drag") await page.mouse.down();
          for (let i = 1; i < pts.length; i++) {
            for (let k = 1; k <= 20; k++) {
              const f = k / 20;
              await page.mouse.move(pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f);
              await sleep(pathMs / 20);
            }
          }
          if (trigger === "drag") await page.mouse.up();
          return;
        }
        case "scroll": {
          const from = await page.evaluate(() => window.scrollY);
          const to = await scrollTarget();
          const delta = (to - from) / scrollSteps;
          await page.mouse.move(viewport.width / 2, viewport.height / 2);
          for (let i = 0; i < scrollSteps; i++) {
            await page.mouse.wheel({ deltaX: 0, deltaY: delta });
            await sleep(scrollMs / scrollSteps);
          }
          return;
        }
        default:
          throw new Error(`unknown trigger "${trigger}"`);
      }
    };

    if (virtual) {
      await page.goto(url, { waitUntil: "load", timeout: 60000 });
      await networkQuiet();
      let pre = 0;
      if (trigger !== "load") {
        await prepareTrigger();
        pre = preRoll;
      }
      const start = await page.evaluate(() => window.__mcClock.now());
      const at0 = start + pre;
      perfAtTrigger = at0;
      const plan = (await planTrigger()).map((x) => ({ ...x, at: at0 + x.at })).sort((x, y) => x.at - y.at);
      const frameMs = 1000 / fps;
      const total = Math.round((pre + duration) / frameMs) + 1;
      const rawDir = path.join(out, ".raw");
      fs.mkdirSync(rawDir, { recursive: true });
      for (const f of fs.readdirSync(rawDir)) fs.unlinkSync(path.join(rawDir, f));

      let now = start;
      const advanceTo = async (t) => {
        if (t > now + 1e-6) now = await page.evaluate((ms) => window.__mcClock.advance(ms), t - now);
      };

      for (let k = 0; k < total; k++) {
        const ft = start + k * frameMs;
        while (plan.length && plan[0].at <= ft) {
          const act = plan.shift();
          await advanceTo(act.at);
          await act.run();
        }
        await advanceTo(ft);
        await networkQuiet();
        if (wantVideo) {
          await page.screenshot({ path: path.join(rawDir, `${pad(k + 1)}.png`) });
        }
      }
      for (const act of plan) {
        await advanceTo(act.at);
        await act.run();
      }

      clip = await clipOf();
      if (wantVideo) {
        fs.mkdirSync(framesDir, { recursive: true });
        for (const f of fs.readdirSync(framesDir)) if (f.endsWith(".png")) fs.unlinkSync(path.join(framesDir, f));
        for (const f of fs.readdirSync(rawDir).sort()) {
          const png = PNG.sync.read(fs.readFileSync(path.join(rawDir, f)));
          if (!clip) {
            fs.writeFileSync(path.join(framesDir, f), PNG.sync.write(png));
            continue;
          }
          const x = Math.max(0, Math.round(clip.x * scale));
          const y = Math.max(0, Math.round(clip.y * scale));
          const cw = Math.max(2, Math.min(Math.round(clip.width * scale), png.width - x));
          const ch = Math.max(2, Math.min(Math.round(clip.height * scale), png.height - y));
          const o = new PNG({ width: cw, height: ch });
          PNG.bitblt(png, o, x, y, cw, ch, 0, 0);
          fs.writeFileSync(path.join(framesDir, f), PNG.sync.write(o));
        }
        fs.rmSync(rawDir, { recursive: true, force: true });
        run("ffmpeg", [
          "-v", "error", "-y",
          "-framerate", String(fps),
          "-i", path.join(framesDir, "%04d.png"),
          "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
          "-pix_fmt", "yuv420p",
          "-c:v", "libx264",
          "-crf", "18",
          path.join(out, "video.mp4"),
        ], { allowFail: true });
        framesMeta = {
          fps,
          count: total,
          preRollMs: pre,
          triggerFrame: Math.round((pre / 1000) * fps),
          clip,
          viewport,
          scale,
          clock: "virtual",
          seed,
          rafHz,
        };
        fs.writeFileSync(path.join(out, "frames.json"), JSON.stringify(framesMeta, null, 2) + "\n");
      }
    } else {
      // Real clock mode using timed screenshots via puppeteer-core
      await page.goto(url, { waitUntil: trigger === "load" ? "domcontentloaded" : "load", timeout: 60000 });
      if (trigger !== "load") await prepareTrigger();
      clip = await clipOf();
      const frameMs = 1000 / fps;
      const total = Math.round(duration / frameMs) + 1;
      fs.mkdirSync(framesDir, { recursive: true });
      for (const f of fs.readdirSync(framesDir)) if (f.endsWith(".png")) fs.unlinkSync(path.join(framesDir, f));
      perfAtTrigger = await page.evaluate(() => performance.now());
      const triggerPromise = runRealTrigger();
      const tWall0 = Date.now();
      for (let k = 0; k < total; k++) {
        const wait = tWall0 + k * frameMs - Date.now();
        if (wait > 2) await sleep(wait);
        if (wantVideo) {
          await page.screenshot({
            path: path.join(framesDir, `${pad(k + 1)}.png`),
            clip: clip && clip.width > 0 && clip.height > 0 ? clip : undefined,
          });
        }
      }
      await triggerPromise;
      if (wantVideo) {
        run("ffmpeg", [
          "-v", "error", "-y",
          "-framerate", String(fps),
          "-i", path.join(framesDir, "%04d.png"),
          "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
          "-pix_fmt", "yuv420p",
          "-c:v", "libx264",
          "-crf", "18",
          path.join(out, "video.mp4"),
        ], { allowFail: true });
        framesMeta = { fps, count: total, preRollMs: 0, triggerFrame: 0, clip, viewport, scale, clock: "real", seed };
        fs.writeFileSync(path.join(out, "frames.json"), JSON.stringify(framesMeta, null, 2) + "\n");
      }
    }

    if (!clip) clip = await clipOf();
    trackSamples = trackSelectors.length
      ? await page.evaluate(() => {
          const m = window.__mc;
          if (!m) return [];
          m.running = false;
          return m.samples;
        })
      : [];
    inspect = await page.evaluate(`(${INSPECT_FN})(${JSON.stringify(selector)})`);
    glRaw = wantGl ? await page.evaluate(() => (window.__mcgl ? window.__mcgl.export() : null)) : null;
    renderer = await page.evaluate(() => {
      const c = document.createElement("canvas");
      const g = c.getContext("webgl2") || c.getContext("webgl");
      if (!g) return null;
      const e = g.getExtension("WEBGL_debug_renderer_info");
      const r = e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER);
      g.getExtension("WEBGL_lose_context")?.loseContext();
      return r;
    });
    await page.screenshot({
      path: path.join(out, "final.png"),
      clip: clip && clip.width > 0 && clip.height > 0 ? clip : undefined,
    });
  } finally {
    await browser.close().catch(() => {});
  }

  const t0 = perfAtTrigger ?? (trackSamples.length ? trackSamples[0].t : 0);
  let trackPath = null;
  if (trackSelectors.length) {
    trackPath = path.join(out, "track.json");
    const trackOut = {
      selectors: trackSelectors,
      note: "t in ms of reference time, 0 = trigger; negative samples are before trigger",
      samples: trackSamples.map((s) => ({ ...s, t: +(s.t - t0).toFixed(1) })),
    };
    fs.writeFileSync(trackPath, JSON.stringify(trackOut, null, 2) + "\n");
  }
  const inspectPath = path.join(out, "inspect.json");
  fs.writeFileSync(inspectPath, JSON.stringify(inspect, null, 2) + "\n");
  const glSummary = glRaw ? writeGlArtifacts(out, glRaw, t0, 1) : null;
  const captureMeta = {
    url,
    out,
    viewport,
    scale,
    fps,
    trigger,
    target,
    selector,
    clip,
    duration,
    preRoll,
    waitBefore,
    track: trackSelectors,
    clock: clockMode,
    seed,
    rafHz: virtual ? rafHz : undefined,
    gpu: gpuMode,
    renderer,
    gl: wantGl,
    capturedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(out, "capture.json"), JSON.stringify(captureMeta, null, 2) + "\n");

  return {
    outDir: out,
    framesDir: wantVideo ? framesDir : null,
    videoPath: wantVideo && fs.existsSync(path.join(out, "video.mp4")) ? path.join(out, "video.mp4") : null,
    frames: framesMeta,
    inspect,
    inspectPath,
    trackPath,
    trackSamples: trackSamples.length,
    glSummary,
    captureMeta,
  };
}

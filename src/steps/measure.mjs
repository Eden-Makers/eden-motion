// measure: frame-accurate checks of the built composition, measured instead of judged.
// Seeks the timeline frame by frame in headless Chrome (the same way HyperFrames does), reads every
// visible text block's geometry, then screenshots a few long text holds and measures the ink.
//
//   reads     each text block holds fully visible long enough to read
//   frame     text clipped by the frame edge or outside the safe margin; text too small for a phone
//   tails     ease tails that crawl under 0.5 px per frame: they rasterise as a freeze, not a settle
//   ink       vertical judder of the glyphs under a slow scale (pixel snapping) and shape drift of
//             the letterforms (hinting re-snaps stems every frame, the type "boils")
//
// Method and thresholds follow snapcn's motion-quality notes (MIT, github.com/shadcn-labs/snapcn):
// sub-pixel bugs are invisible to the eye and to a vision model, so they are measured on frames.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { build } from "./build.mjs";
import { withPage } from "../lib/browser.mjs";
import { log, warn, readJSON, writeJSON } from "../lib/util.mjs";

export const LIMITS = {
  crawlPx: 0.5, // a frame that moves less than this inside a move reads as a freeze
  tailWarn: 4, // consecutive crawl frames at the end of a move
  tailFail: 6, // 6 frames = 250 ms at 24 fps
  judderWarn: 0.06, // px, mean frame-to-frame jitter of the ink centroid against the geometry (y)
  judderFail: 0.12,
  shapeWarn: 0.025, // relative drift of ink area / width^2 during a hold (warn only, see inkWindow)
  safe: 0.04, // safe margin as a share of the frame
  minFontPx: 24, // at 1080 px short side
};

// Reading time for a block: a single word only has to register (it rides the VO), a line needs
// about 18 characters per second plus a beat to find it. Adapted from lemo-opuscar's readcheck.
export const readNeed = (text) => (text.trim().split(/\s+/).length <= 1 ? 0.3 : 0.4 + text.trim().length / 18);

// ---- in-page sampler -------------------------------------------------------------------------
function installSampler() {
  const ids = new WeakMap();
  let next = 1;
  const idOf = (el) => (ids.has(el) ? ids.get(el) : (ids.set(el, next), next++));
  const INLINE = new Set(["inline", "inline-block", "contents", "inline-flex", "inline-grid"]);
  window.__emSample = (t) => {
    const tl = window.__timelines.main;
    tl.totalTime(t + 0.001, true);
    tl.totalTime(t, false);
    const memo = new Map();
    const info = (el) => {
      if (!el || el.nodeType !== 1) return { op: 1, vis: true, blur: false, clip: null, allow: false, decor: false };
      if (memo.has(el)) return memo.get(el);
      const p = info(el.parentElement);
      const cs = getComputedStyle(el);
      const r = { op: cs.display === "none" ? 0 : p.op * parseFloat(cs.opacity), vis: p.vis && cs.visibility !== "hidden", blur: p.blur || +(/blur\(([\d.e-]+)px/.exec(cs.filter) || [0, 0])[1] > 0.5, clip: p.clip, allow: p.allow || el.hasAttribute("data-layout-allow-overflow"), decor: p.decor || el.hasAttribute("data-em-decor") };
      if (cs.overflowX !== "visible" || cs.overflowY !== "visible" || cs.clipPath !== "none") {
        const b = el.getBoundingClientRect();
        const c = p.clip || { l: -1e9, t: -1e9, r: 1e9, b: 1e9 };
        r.clip = { l: Math.max(c.l, b.left), t: Math.max(c.t, b.top), r: Math.min(c.r, b.right), b: Math.min(c.b, b.bottom) };
      }
      memo.set(el, r);
      return r;
    };
    const blockOf = (el) => {
      while (el.parentElement && el.parentElement.id !== "stage" && INLINE.has(getComputedStyle(el).display)) el = el.parentElement;
      return el;
    };
    const blocks = new Map(), blurred = new Set();
    const walk = document.createTreeWalker(document.getElementById("stage"), NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement;
      if (!n.data.trim()) {
        // keep word spaces between inline spans so "Every film" does not read "Everyfilm"
        const e = blocks.get(idOf(blockOf(el)));
        if (e && !e.text.endsWith(" ")) e.text += " ";
        continue;
      }
      const i = info(el);
      if (!i.vis || i.op < 0.5 || i.decor) continue;
      // a character still focusing in (typewriter tail, blur reveal) is not text yet
      if (i.blur) { blurred.add(idOf(blockOf(el))); continue; }
      range.selectNodeContents(n);
      const b = range.getBoundingClientRect();
      if (b.width < 0.5 || b.height < 0.5) continue;
      const blk = blockOf(el);
      const id = idOf(blk);
      let e = blocks.get(id);
      if (!e) {
        const cam = blk.closest(".em-cam");
        const cb = cam ? cam.getBoundingClientRect() : { left: 0, top: 0, width: 1 };
        const cs = getComputedStyle(el);
        const scale = el.offsetHeight ? el.getBoundingClientRect().height / el.offsetHeight : 1;
        e = { id, text: "", l: 1e9, t: 1e9, r: -1e9, b: -1e9, op: 1, blur: false, allow: false, vis: 0, area: 0,
          cam: cam ? { x: cb.left, y: cb.top, s: cb.width / (cam.offsetWidth || 1) } : null,
          font: parseFloat(cs.fontSize) * scale, color: cs.color, clipBy: "" };
        blocks.set(id, e);
      }
      e.text += n.data;
      e.l = Math.min(e.l, b.left); e.t = Math.min(e.t, b.top); e.r = Math.max(e.r, b.right); e.b = Math.max(e.b, b.bottom);
      e.op = Math.min(e.op, i.op);
      e.allow = e.allow || i.allow;
      const c = i.clip || { l: -1e9, t: -1e9, r: 1e9, b: 1e9 };
      const vw = Math.max(0, Math.min(c.r, b.right) - Math.max(c.l, b.left)), vh = Math.max(0, Math.min(c.b, b.bottom) - Math.max(c.t, b.top));
      e.vis += vw * vh;
      e.area += b.width * b.height;
    }
    return [...blocks.values()].map((e) => ({ ...e, blur: blurred.has(e.id), text: e.text.replace(/\s+/g, " ").trim(), full: e.area ? e.vis / e.area : 0 }));
  };
}

// ---- analysis ----------------------------------------------------------------------------------
// counters, with an optional short unit ("12 min", "4 MB", "3x")
const isNumeric = (s) => /^[\d\s.,%$€£+\-x×:]+(\s?[A-Za-z%]{1,4})?$/.test(s) && /\d/.test(s);

function tracks(frames) {
  const m = new Map();
  frames.forEach((blocks, k) => blocks.forEach((b) => {
    if (!m.has(b.id)) m.set(b.id, []);
    m.get(b.id).push({ k, ...b });
  }));
  return m;
}

function analyse(frames, { fps, W, H }) {
  const tr = tracks(frames);
  const reads = [], frame = [], small = [], tails = [];
  const short = Math.min(W, H) / 1080;
  for (const [, seq] of tr) {
    // reads: time each final text is legible (dimmed counts, blurred or masked does not). A
    // typewriter's growing prefixes count toward the line they become: people read while it types.
    const held = new Map();
    let run = null, carry = 0;
    const flush = (nextText, contiguous) => {
      if (!run) return;
      const n = run.k1 - run.k0 + 1;
      if (contiguous && nextText.startsWith(run.text) && nextText !== run.text) carry += n;
      else {
        const h = held.get(run.text) || { frames: 0, k0: run.k0 - carry };
        h.frames += n + carry;
        held.set(run.text, h);
        carry = 0;
      }
      run = null;
    };
    seq.forEach((f) => {
      const ok = f.op >= 0.5 && f.full >= 0.95;
      if (ok && run && f.k === run.k1 + 1 && f.text === run.text) run.k1 = f.k;
      else {
        const contiguous = ok && run && f.k === run.k1 + 1;
        flush(ok ? f.text : "", contiguous);
        if (!contiguous) carry = 0;
        if (ok) run = { k0: f.k, k1: f.k, text: f.text };
      }
    });
    flush("", false);
    for (const [txt, h] of held) {
      if (/\b(undefined|NaN|null)\b|\[object /.test(txt)) reads.push({ t: +(h.k0 / fps).toFixed(2), text: txt.slice(0, 60), hold: 0, need: 0, severity: "fail", issue: "placeholder value on screen" });
      if (isNumeric(txt) || txt.length < 2) continue;
      const hold = h.frames / fps, need = readNeed(txt);
      if (hold < need) reads.push({ t: +(h.k0 / fps).toFixed(2), text: txt.slice(0, 60), hold: +hold.toFixed(2), need: +need.toFixed(2), severity: hold < 0.6 * need ? "fail" : "warn" });
    }
    // frame edge, safe margin, size (only for text a viewer is meant to read)
    // text on its way in or out may cross the frame edge; only text that has landed is judged
    const landed = seq.filter((f, i) => i && seq[i - 1].k === f.k - 1 && Math.max(Math.abs(f.l - seq[i - 1].l), Math.abs(f.t - seq[i - 1].t)) < 1);
    const legible = landed.filter((f) => f.op >= 0.9 && !f.blur && !f.allow && f.text.length > 1);
    const out = legible.filter((f) => f.l < -2 || f.t < -2 || f.r > W + 2 || f.b > H + 2);
    const mx = W * LIMITS.safe, my = H * LIMITS.safe;
    const unsafe = legible.filter((f) => f.l < mx || f.t < my || f.r > W - mx || f.b > H - my);
    const tiny = seq.filter((f) => f.op >= 0.9 && !f.blur && !f.allow && f.text.length > 1).filter((f) => f.font < LIMITS.minFontPx * short && !isNumeric(f.text));
    const text = (legible[0] || seq[0]).text.slice(0, 60);
    // a camera push that crops small UI chrome is framing; a cropped headline is a mistake
    if (out.length >= 3) frame.push({ t: +(out[0].k / fps).toFixed(2), text, issue: "clipped by the frame edge", dur: +(out.length / fps).toFixed(2), severity: Math.min(...out.map((f) => f.font)) >= 32 * short ? "fail" : "warn" });
    else if (unsafe.length >= fps / 2) frame.push({ t: +(unsafe[0].k / fps).toFixed(2), text, issue: "outside the safe margin", dur: +(unsafe.length / fps).toFixed(2), severity: "warn" });
    if (tiny.length >= fps / 2) small.push({ t: +(tiny[0].k / fps).toFixed(2), text, px: +Math.min(...tiny.map((f) => f.font)).toFixed(1), dur: +(tiny.length / fps).toFixed(2) });
    // tails: the moves of the block in camera space (the perpetual camera drift is not a move)
    const local = (f) => {
      const c = f.cam || { x: 0, y: 0, s: 1 };
      return { l: (f.l - c.x) / c.s, t: (f.t - c.y) / c.s, r: (f.r - c.x) / c.s, b: (f.b - c.y) / c.s, s: c.s };
    };
    let mv = null;
    // only a move that comes to rest has a tail; one that keeps drifting until the cut is a drift
    const close = (stopped) => {
      if (!mv) return;
      if (!stopped) { mv = null; return; }
      // drop the trailing still frames, then count the crawl at the end of the move
      const ds = mv.d;
      const travel = ds.reduce((a, b) => a + b, 0);
      if (travel >= 20 && Math.max(...ds) >= 2) {
        let streak = 0;
        for (let j = ds.length - 1; j >= 0 && ds[j] < LIMITS.crawlPx; j--) streak++;
        // a freeze is a fast move that crawls into place, not a slow drift easing out
        if (Math.max(0, ...ds.slice(Math.max(0, ds.length - streak - 6), ds.length - streak)) < 1.5) streak = 0;
        // an ease tail decays geometrically (ratio ~0.6 per frame); once two frames in a row keep
        // 90% of their speed the element has handed over to a camera or rig drift: stop counting
        for (let j = ds.length - streak + 1, keep = 0; streak && j < ds.length; j++) {
          keep = ds[j] / ds[j - 1] > 0.9 ? keep + 1 : 0;
          if (keep === 2) { streak = j - 1 - (ds.length - streak); break; }
        }
        const crawl = ds.filter((d) => d < LIMITS.crawlPx).length;
        if (streak >= LIMITS.tailWarn) tails.push({ t: +(mv.k0 / fps).toFixed(2), text: mv.text, travel: +travel.toFixed(0), frames: ds.length, crawl, tail: streak, px: ds.slice(-streak - 4).map((d) => +d.toFixed(2)), severity: streak >= LIMITS.tailFail ? "fail" : "warn" });
      }
      mv = null;
    };
    for (let i = 1; i < seq.length; i++) {
      const a = seq[i - 1], b = seq[i];
      if (b.k !== a.k + 1 || b.text !== a.text || b.op < 0.3) { close(false); continue; }
      const A = local(a), B = local(b);
      const d = Math.max(Math.abs(B.l - A.l), Math.abs(B.t - A.t), Math.abs(B.r - A.r), Math.abs(B.b - A.b)) * B.s;
      if (d >= 0.05) {
        if (!mv) mv = { k0: a.k, d: [], text: b.text.slice(0, 40) };
        mv.d.push(d);
      } else close(true);
    }
    close(false);
  }
  return { reads, frame, small, tails };
}

// Long sharp holds of text under the slow camera scale: the windows the ink check screenshots.
function holdWindows(frames, { fps, W, H }, max = 6, len = 24) {
  const out = [];
  for (const [id, seq] of tracks(frames)) {
    let run = [];
    const take = () => {
      if (run.length >= Math.min(len, 16)) {
        const w = run.slice(0, len);
        const growth = Math.abs(w[w.length - 1].r - w[w.length - 1].l - (w[0].r - w[0].l));
        if (growth > 0.3) out.push({ id, frames: w });
      }
      run = [];
    };
    for (const f of seq) {
      const ok = f.op >= 0.99 && !f.blur && f.full >= 0.99 && f.text.length > 2 && f.l > 0 && f.t > 0 && f.r < W && f.b < H && /rgb\(/.test(f.color) && !/rgba\(.*,\s*0\)/.test(f.color);
      const p = run[run.length - 1];
      const still = p && f.cam && p.cam && Math.max(Math.abs((f.l - f.cam.x) / f.cam.s - (p.l - p.cam.x) / p.cam.s), Math.abs((f.t - f.cam.y) / f.cam.s - (p.t - p.cam.y) / p.cam.s)) < 0.05;
      if (ok && p && still && f.k === p.k + 1 && f.text === run[0].text && f.color === run[0].color) run.push(f);
      else { take(); if (ok) run = [f]; }
    }
    take();
  }
  return out.sort((a, b) => b.frames.length - a.frames.length).slice(0, max);
}

export const luma = (rgb) => {
  const m = rgb.match(/[\d.]+/g).map(Number);
  return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
};

export function inkStats(gray, w, h, fg, box = null) {
  const border = [];
  for (let x = 0; x < w; x++) border.push(gray[x], gray[(h - 1) * w + x]);
  for (let y = 0; y < h; y++) border.push(gray[y * w], gray[y * w + w - 1]);
  border.sort((a, b) => a - b);
  const bg = border[border.length >> 1];
  if (Math.abs(fg - bg) < 50) return null;
  // only the text's own box counts: a caret, cursor or neighbour in the crop is not this text
  const [x0, y0, x1, y1] = box || [0, 0, w, h];
  let A = 0, X = 0, Y = 0;
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(h, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(w, Math.ceil(x1)); x++) {
    const a = Math.min(1, Math.max(0, (gray[y * w + x] - bg) / (fg - bg)));
    A += a; X += a * x; Y += a * y;
  }
  return A > 4 ? { area: A, cx: X / A, cy: Y / A } : null;
}

// Ink of one window: vertical judder is the actionable number (glyph origins snapping to whole
// pixels under a 2D scale; the engine's 3D camera fixes it). Horizontal jitter and shape drift
// on display type above ~120 px are a Skia limit no CSS fixes, so they only ever warn.
function inkWindow(raw, win, crop) {
  const [l, t, cw, ch] = crop, pad = 6;
  const fg = luma(win.frames[0].color);
  // one fixed mask for the window: the text's union box plus 2 px. A per-frame box would cut
  // whole ink columns in and out as its rounded edge crosses a pixel and fake a judder.
  const box = [pad - 2, pad - 2, cw - pad + 2, ch - pad + 2];
  // a decoder may hand back one frame less at a window edge; measure what came back
  const n = Math.min(win.frames.length, Math.floor(raw.length / (cw * ch)));
  if (n < 12) return null;
  const st = win.frames.slice(0, n).map((f, j) => {
    const s = inkStats(raw.subarray(j * cw * ch, (j + 1) * cw * ch), cw, ch, fg, box);
    // the ink centroid against the geometric centre: a smooth scale moves both together
    return s && { ...s, ry: s.cy - ((f.t + f.b) / 2 - t), rx: s.cx - ((f.l + f.r) / 2 - l), shape: s.area / (f.r - f.l) ** 2 };
  });
  if (st.some((s) => !s)) return null;
  const jit = (key) => {
    const d = st.slice(1).map((s, j) => s[key] - st[j][key]);
    const med = [...d].sort((a, b) => a - b)[d.length >> 1];
    return d.reduce((a, x) => a + Math.abs(x - med), 0) / d.length;
  };
  const shapes = st.map((s) => s.shape), mean = shapes.reduce((a, b) => a + b, 0) / shapes.length;
  const judderY = jit("ry"), judderX = jit("rx"), shape = (Math.max(...shapes) - Math.min(...shapes)) / mean;
  const severity = judderY >= LIMITS.judderFail ? "fail" : judderY >= LIMITS.judderWarn || judderX >= 2 * LIMITS.judderWarn || shape >= LIMITS.shapeWarn ? "warn" : "ok";
  return { judderY: +judderY.toFixed(3), judderX: +judderX.toFixed(3), shape: +shape.toFixed(4), font: +win.frames[0].font.toFixed(0), severity };
}

function cropOf(win, W, H) {
  const pad = 6;
  const l = Math.max(0, Math.floor(Math.min(...win.frames.map((f) => f.l)) - pad)), t = Math.max(0, Math.floor(Math.min(...win.frames.map((f) => f.t)) - pad));
  const r = Math.min(W, Math.ceil(Math.max(...win.frames.map((f) => f.r)) + pad)), b = Math.min(H, Math.ceil(Math.max(...win.frames.map((f) => f.b)) + pad));
  return [l, t, r - l, b - t];
}

async function inkCheck(page, windows, { fps, W, H, tmp, video }) {
  const res = [];
  for (const [wi, win] of windows.entries()) {
    const crop = cropOf(win, W, H), [l, t, cw, ch] = crop;
    if (cw < 8 || ch < 8) continue;
    const dir = path.join(tmp, `w${wi}`);
    fs.mkdirSync(dir, { recursive: true });
    for (const [j, f] of win.frames.entries()) {
      await page.evaluate((tt) => window.__emSample(tt), f.k / fps);
      await page.screenshot({ path: path.join(dir, `${String(j).padStart(3, "0")}.png`), clip: { x: l, y: t, width: cw, height: ch } });
    }
    const raw = spawnSync("ffmpeg", ["-v", "error", "-i", path.join(dir, "%03d.png"), "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 2 ** 30 }).stdout;
    const r = inkWindow(raw, win, crop);
    if (!r) continue;
    const row = { t: +(win.frames[0].k / fps).toFixed(2), text: win.frames[0].text.slice(0, 40), frames: win.frames.length, ...r };
    // --video: the same window measured on the real render (HyperFrames workers, encoder), since
    // a screenshot and a capture do not always raster the same way
    if (video) {
      const k0 = win.frames[0].k, k1 = k0 + win.frames.length - 1;
      const vraw = spawnSync("ffmpeg", ["-v", "error", "-i", video, "-vf", `select='between(n\\,${k0}\\,${k1})',crop=${cw}:${ch}:${l}:${t}`, "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 2 ** 30 }).stdout;
      row.video = inkWindow(vraw, win, crop);
      if (row.video) row.severity = row.video.severity; // the render is what ships
    }
    res.push(row);
  }
  return res;
}

// ---- entry ---------------------------------------------------------------------------------------
export async function measureComp(projectDir, { fps, ink = true, video = null } = {}) {
  const sb = readJSON(path.join(projectDir, "storyboard.json"));
  fps = fps || sb.fps || 30;
  const W = +sb.width || 1920, H = +sb.height || 1080;
  const comp = await build(projectDir, { slow: 1, out: "comp-measure" });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "em-measure-"));
  const n = Math.round(sb.duration * fps);
  const t0 = Date.now();
  const result = await withPage(async (page) => {
    await page.goto(pathToFileURL(path.join(comp, "index.html")).href, { waitUntil: "load", timeout: 60000 });
    await page.waitForFunction(() => window.EM_READY === true, { timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(installSampler);
    const frames = [];
    for (let k = 0; k < n; k++) frames.push(await page.evaluate((t) => window.__emSample(t), k / fps));
    // EM_MEASURE_DEBUG=t0,t1 prints every text block per frame in that window
    if (process.env.EM_MEASURE_DEBUG) {
      const [d0, d1] = process.env.EM_MEASURE_DEBUG.split(",").map(Number);
      frames.forEach((bs, k) => k / fps >= d0 && k / fps <= d1 && console.log((k / fps).toFixed(3), bs.map((b) => `"${b.text}" op ${b.op.toFixed(2)} full ${b.full.toFixed(2)} blur ${b.blur} [${b.l.toFixed(0)},${b.t.toFixed(0)},${b.r.toFixed(0)},${b.b.toFixed(0)}]`).join(" | ")));
    }
    const a = analyse(frames, { fps, W, H });
    a.sceneErrors = await page.evaluate(() => JSON.parse(document.getElementById("em-errors")?.textContent || "[]"));
    a.ink = ink ? await inkCheck(page, holdWindows(frames, { fps, W, H }), { fps, W, H, tmp, video }) : [];
    return a;
  }, { width: W, height: H });
  if (process.env.EM_MEASURE_KEEP) log(`ink crops kept in ${tmp}`);
  else fs.rmSync(tmp, { recursive: true, force: true });

  const sev = (arr) => arr.filter((x) => x.severity === "fail");
  const fails = [];
  if (result.sceneErrors.length) fails.push(`scenes that failed to build: ${result.sceneErrors.map((e) => `${e.t}s ${e.type}: ${e.error}`).join("; ")}`);
  if (sev(result.reads).length) fails.push(`text not readable: ${sev(result.reads).slice(0, 4).map((r) => `${r.t}s "${r.text}" ${r.issue || `${r.hold}/${r.need}s`}`).join("; ")}`);
  if (sev(result.frame).length) fails.push(`text clipped by the frame edge: ${sev(result.frame).slice(0, 4).map((r) => `${r.t}s "${r.text}"`).join("; ")}`);
  if (sev(result.tails).length) fails.push(`ease tails that freeze (${LIMITS.tailFail}+ frames under ${LIMITS.crawlPx}px): ${sev(result.tails).slice(0, 4).map((r) => `${r.t}s "${r.text}" ${r.tail}f`).join("; ")}`);
  if (sev(result.ink).length) fails.push(`text judders vertically under the camera scale (pixel snapping): ${sev(result.ink).slice(0, 4).map((r) => `${r.t}s "${r.text}" ${(r.video || r).judderY}px`).join("; ")}`);
  const summary = {
    frames: n, fps, seconds: +((Date.now() - t0) / 1000).toFixed(1),
    reads: { fail: sev(result.reads).length, warn: result.reads.length - sev(result.reads).length },
    frame: { fail: sev(result.frame).length, warn: result.frame.length - sev(result.frame).length },
    small: result.small.length,
    tails: { fail: sev(result.tails).length, warn: result.tails.length - sev(result.tails).length },
    ink: result.ink.length ? { windows: result.ink.length, judderY: Math.max(...result.ink.map((r) => r.judderY)), judderX: Math.max(...result.ink.map((r) => r.judderX)), shape: Math.max(...result.ink.map((r) => r.shape)), fail: sev(result.ink).length } : null,
  };
  return { summary, fails, ...result };
}

export async function measure(projectDir, opts = {}) {
  const m = await measureComp(projectDir, opts);
  fs.mkdirSync(path.join(projectDir, "renders"), { recursive: true });
  writeJSON(path.join(projectDir, "renders", "measure.json"), m);
  const s = m.summary;
  log(`measure: ${s.frames} frames in ${s.seconds}s · reads ${s.reads.fail} fail/${s.reads.warn} warn · frame ${s.frame.fail}/${s.frame.warn} · small text ${s.small} · tails ${s.tails.fail}/${s.tails.warn} · ink ${s.ink ? `judder y ${s.ink.judderY}px x ${s.ink.judderX}px, shape ${(s.ink.shape * 100).toFixed(2)}%` : "-"}`);
  m.fails.forEach((f) => warn(f));
  return m;
}

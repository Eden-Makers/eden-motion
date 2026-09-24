/* Higgsfield style pack (research/analysis/higgsfield.md).
 * The Higgsfield DNA differs from the Burnwe focus-pull law: everything arrives through a digital
 * state (bitmap glyphs, pixel blocks, thermal duotone) for 3-10 frames, section changes are
 * punctuated by 1-4 frame flashes, punch-ins are hard cuts, typing runs at 1 char per frame and the
 * canvas is a white technical grid with magenta crosshairs. Everything below is frame-locked with
 * tl.set at q(t) so seeks land on exactly the same frame every time.
 *
 * WORLD
 *   tone "grid"            scene-level world: #fcfcfc paper, 1.5 px ink hairline cell grid, magenta
 *                          x crosshairs, mono digits in the gutters, halftone/dither corner cells.
 *                          Added automatically to ANY scene type that sets "tone":"grid".
 *   background "hf-grid"   the same world as the persistent film background.
 *   palette                --hf-a = magenta job (defaults to --accent), --hf-b = lime job (--accent2).
 *                          Storyboard "palette":"higgsfield" (top level) or props.palette forces
 *                          #df167f / #d4ff19.
 *
 * SCENES
 *   grid-stage    { cells:[{src?, kind?:"image"|"video", mediaStart?, text?, label?, stat?,
 *                   fill?:"halftone"|"dither"|"stripes"}], layout?:"2x2"|"hero-left"|"hero-right"|"strip",
 *                   reflow?:<layout>, reflowAt?: seconds into scene | "vo cue word", title? }
 *   drum-list     { items:[str], prefix?:"Make it", stepEvery?:0.18, size?:112, label?, tail? }
 *   glitch-lockup { name?, logo?:bool (default true, uses brand logo when present), badge?:"NEW",
 *                   pill?:str, trace?:bool (default true), dropout?:bool (default true) }
 *   pixel-type    { text, keyword?, size?:120, align?:"left"|"center", sub?, stagger?:0.07 }
 *   endcard-caps  { lines:[str], url?, size?:26, flash?:"accent"|"lime"|"white"|false }
 *   persp-card    { src, kind?:"image"|"video", mediaStart?, caption?, rotY?:24 }
 *
 * TRANSITIONS  (storyboard "transition":{"type":..., "duration":..., ...opts})
 *   flash-frame    { color?:"accent"|"lime"|"white"|"black"|css, frames?:1|2, opacity?:0.9 }  d 0.2
 *   flash-cycle    { colors?:[4 css/role names] }                                             d 0.3
 *   overexpose     {}                                                                          d 0.4
 *   punch-in       { x?:960, y?:540, scale?:4, flash?:true }                                   d 0.4
 *   pixel-dissolve { cols?:16, rows?, tint?:"mix"|"accent"|"lime"|"ink", origin?:[x,y] }     d 0.5
 *   grid-reflow    { x?, y? } (split positions, seeded when omitted)                           d 0.55
 */
(function () {
  const EM = window.EM;
  const { h, fx } = EM;
  const F = 1 / 30;
  // Frame-locked time: snapped to the 30 fps grid, 1 ms early so float error never slips a frame.
  const q = (t) => Math.round(t / F) * F - 0.001;
  const cue = (t, type) => (EM.cues = EM.cues || []).push({ t, type });
  const fast = (a, b) => (EM.fastWindows = EM.fastWindows || []).push([a, b]);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const SLOW = () => window.EM_SLOW || 1;

  function pal(el) {
    const v = (n, d) => fx.cssVar(el, n) || d;
    return { a: v("--hf-a", "#df167f"), b: v("--hf-b", "#d4ff19"), ink: v("--hf-ink", "#111111"), paper: v("--hf-paper", "#fcfcfc"), cyan: v("--hf-cyan", "#27c4ea") };
  }
  function role(name, P) {
    switch (name) {
      case "accent": case "magenta": return P.a;
      case "lime": case "accent2": return P.b;
      case "white": return "#ffffff";
      case "black": return "#0b0b0b";
      case "ink": return P.ink;
      case "cyan": return P.cyan;
      default: return name || P.a;
    }
  }
  function rgbOf(c) {
    c = String(c || "").trim();
    let m = c.match(/^#([0-9a-f]{3,8})$/i);
    if (m) {
      let x = m[1];
      if (x.length === 3) x = x.split("").map((k) => k + k).join("");
      return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
    }
    m = c.match(/rgba?\(([^)]+)\)/);
    if (m) return m[1].split(/[ ,/]+/).slice(0, 3).map((v) => parseFloat(v));
    return [128, 128, 128];
  }
  const lerpC = (a, b, k) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(",")})`;

  // ---------------------------------------------------------------------------------------
  // Static textures (drawn once into a canvas at build time, so they are free and seek-safe)
  // ---------------------------------------------------------------------------------------
  const texCache = {};
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function texture(kind, w, hh, c1, c2, o = {}) {
    w = Math.max(8, Math.round(w));
    hh = Math.max(8, Math.round(hh));
    const key = [kind, w, hh, c1, c2, JSON.stringify(o)].join("|");
    if (texCache[key]) return texCache[key];
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = hh;
    const g = cv.getContext("2d");
    const dir = o.dir || "tr";
    const diag = Math.hypot(w, hh);
    const val = (x, y) => {
      const pts = { tl: [0, 0], tr: [w, 0], bl: [0, hh], br: [w, hh], c: [w / 2, hh / 2] };
      if (dir === "l") return 1 - x / w;
      if (dir === "r") return x / w;
      if (dir === "t") return 1 - y / hh;
      if (dir === "b") return y / hh;
      const p = pts[dir] || pts.tr;
      return clamp(1 - Math.hypot(x - p[0], y - p[1]) / (diag * (o.reach || 0.9)));
    };
    const r = EM.rng(key);
    if (kind === "halftone") {
      const p = o.pitch || 11;
      g.fillStyle = c1;
      for (let y = 0, row = 0; y < hh + p; y += p * 0.866, row++) {
        for (let x = row % 2 ? p / 2 : 0; x < w + p; x += p) {
          const v = Math.pow(val(x, y), o.gamma || 1.2);
          const rad = p * 0.56 * v;
          if (rad < 0.45) continue;
          g.beginPath();
          g.arc(x, y, rad, 0, Math.PI * 2);
          g.fill();
        }
      }
    } else if (kind === "dither") {
      const c = o.cell || 5;
      g.fillStyle = c1;
      for (let y = 0, j = 0; y < hh; y += c, j++) {
        for (let x = 0, i = 0; x < w; x += c, i++) {
          const v = Math.pow(val(x, y), o.gamma || 1);
          if (v > (BAYER[(j % 4) * 4 + (i % 4)] + 0.5) / 16) g.fillRect(x, y, c - 1, c - 1);
        }
      }
    } else if (kind === "stripes") {
      // vertical bar screen with a horizontal colour ramp (A 3.19 stripe-gradient cells)
      const bw = o.bar || 16;
      const A = rgbOf(c1), B = rgbOf(c2);
      for (let x = 0; x < w; x += bw) {
        g.fillStyle = lerpC(B, A, clamp(x / w));
        for (let y = 0; y < hh; y += 3) {
          const v = Math.pow(1 - y / hh, 0.8);
          const bwid = bw * (0.25 + 0.75 * v);
          g.fillRect(x + (bw - bwid) / 2, y, bwid, 3);
        }
      }
    } else if (kind === "sparkle") {
      g.fillStyle = c1;
      const c = o.cell || 12;
      for (let y = 0; y < hh; y += c) for (let x = 0; x < w; x += c) {
        const v = val(x, y);
        if (r() < v * 0.85) g.fillRect(x, y, c - 2, c - 2);
      }
    }
    return (texCache[key] = cv.toDataURL());
  }

  // Bitmap glyphs: the word is rasterised at 1/cell resolution and rebuilt from squares, with a
  // cyan/magenta RGB offset (A 6.50 "Your interface is ready"). Returned as a data URL that is
  // stretched over the vector word box, so it always registers with the real text.
  function pixelWord(text, font, fs, cA, cB, seed, cell) {
    cell = cell || Math.max(4, Math.round(fs / 10));
    const key = ["pw", text, font, fs, cA, cB, cell].join("|");
    if (texCache[key]) return texCache[key];
    const m = document.createElement("canvas").getContext("2d");
    m.font = `700 ${fs}px ${font}`;
    const mt = m.measureText(text);
    const W = Math.ceil(mt.width + fs * 0.04);
    const H = Math.ceil(fs);
    const asc = mt.fontBoundingBoxAscent || fs * 0.9, desc = mt.fontBoundingBoxDescent || fs * 0.22;
    const base = (H - (asc + desc)) / 2 + asc;
    const cw = Math.ceil(W / cell), ch = Math.ceil(H / cell);
    const s = document.createElement("canvas");
    s.width = cw;
    s.height = ch;
    const sg = s.getContext("2d");
    sg.font = `700 ${fs / cell}px ${font}`;
    sg.fillStyle = "#000";
    sg.fillText(text, 0, base / cell);
    const data = sg.getImageData(0, 0, cw, ch).data;
    const out = document.createElement("canvas");
    out.width = cw * cell;
    out.height = ch * cell;
    const og = out.getContext("2d");
    const r = EM.rng(seed + key);
    const off = Math.max(2, Math.round(cell * 0.4));
    const lit = [];
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (data[(y * cw + x) * 4 + 3] > 100 && r() > 0.05) lit.push([x, y]);
    og.globalAlpha = 0.85;
    og.fillStyle = cB;
    lit.forEach(([x, y]) => og.fillRect(x * cell + off, y * cell, cell - 1, cell - 1));
    og.globalAlpha = 1;
    og.fillStyle = cA;
    lit.forEach(([x, y]) => og.fillRect(x * cell, y * cell, cell - 2, cell - 2));
    return (texCache[key] = out.toDataURL());
  }

  const XSVG = '<svg viewBox="0 0 22 22"><path d="M5 5L17 17M17 5L5 17" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/></svg>';
  const cross = () => h("div", { class: "hf-x", html: XSVG });

  // Deterministic flickering binary digits for the gutters.
  function digitRow(seed, k, groups) {
    let s = "";
    for (let g = 0; g < groups; g++) {
      const r = EM.rng(seed * 131 + g * 17 + Math.floor((k + g * 3) / 5));
      const len = 1 + Math.floor(r() * 4);
      let grp = "";
      for (let i = 0; i < len; i++) grp += r() > 0.5 ? "1" : "0";
      s += grp + " ".repeat(2 + Math.floor(r() * 4));
    }
    return s;
  }
  function flicker(tl, els, t0, t1, seedBase) {
    const p = { v: 0 };
    const frames = Math.max(1, Math.round((t1 - t0) / F));
    const write = () => {
      const k = Math.floor(p.v);
      els.forEach(({ el, groups }, i) => (el.textContent = digitRow(seedBase + i, k, groups)));
    };
    write();
    tl.fromTo(p, { v: 0 }, { v: frames, duration: t1 - t0, ease: "none", onUpdate: write, immediateRender: false }, t0);
  }

  // Gutter decoration around a content area A {x0,y0,x1,y1}: halftone/dither/stripe corner cells
  // and mono digit rows. Variation comes from the seed.
  function decor(host, A, P, seed, tl, t0, t1) {
    const r = EM.rng("hfd" + seed);
    const add = (x, y, w, hh, url) => {
      if (w < 10 || hh < 10) return;
      const d = h("div", { class: "hf-tex" });
      Object.assign(d.style, { left: x + "px", top: y + "px", width: w + "px", height: hh + "px", backgroundImage: `url(${url})` });
      host.appendChild(d);
    };
    const topH = A.y0, botH = 1080 - A.y1;
    const pick = Math.floor(r() * 3);
    // top band: lime halftone fading right from the left corner
    add(0, 0, 820, topH, texture("halftone", 820, topH, P.b, "", { dir: "tl", pitch: 9, reach: 0.8 }));
    // top-right corner cell: magenta dither
    add(A.x1, 0, 1920 - A.x1, topH, texture("dither", 1920 - A.x1, topH, P.a, "", { dir: "tr", cell: 5, reach: 1.1 }));
    // bottom band: magenta halftone rising towards the right corner of the content cell
    add(A.x1 - 620, A.y1, 620, botH, texture("halftone", 620, botH, P.a, "", { dir: "br", pitch: 9, reach: 0.9 }));
    if (pick !== 1) add(0, A.y1, A.x0, botH, texture("halftone", A.x0, botH, P.b, "", { dir: "bl", pitch: 8, reach: 1.2 }));
    if (pick === 2) add(0, A.y0, A.x0, 260, texture("stripes", A.x0, 260, P.a, "#f3d23a", { bar: 12 }));
    // digits
    const rows = [];
    const dr = (x, y, groups, align) => {
      const el = h("div", { class: "hf-digits", "data-layout-ignore": "" });
      Object.assign(el.style, { left: x + "px", top: y + "px" });
      if (align === "r") Object.assign(el.style, { left: "auto", right: 1920 - x + "px", textAlign: "right" });
      host.appendChild(el);
      rows.push({ el, groups });
    };
    if (topH >= 60) dr(A.x1 - 20, topH / 2 - 15, 3, "r");
    if (botH >= 110) {
      const n = Math.min(3, Math.floor((botH - 30) / 32));
      for (let i = 0; i < n; i++) dr(A.x0 + 8, A.y1 + 22 + i * 32, 7, "l");
    }
    if (tl) flicker(tl, rows, t0, t1, seed * 7 + 3);
  }

  // Full static world: frame-wide hairlines on the content-area edges, crosshairs, decor.
  const PRESETS = [
    { x0: 208, y0: 214, x1: 1712, y1: 866 },
    { x0: 150, y0: 150, x1: 1770, y1: 930 },
    { x0: 300, y0: 128, x1: 1620, y1: 952 },
  ];
  function buildWorld(host, tl, t0, t1, seed, P, variant) {
    const r = EM.rng("hfw" + seed);
    const A = PRESETS[variant != null ? variant : Math.floor(r() * PRESETS.length)];
    const w = h("div", { class: "hf-world" });
    host.appendChild(w);
    decor(w, A, P, seed, tl, t0, t1);
    [A.x0, A.x1].forEach((x) => {
      const l = h("div", { class: "hf-line-v" });
      l.style.transform = `translateX(${x - 0.75}px)`;
      w.appendChild(l);
    });
    [A.y0, A.y1].forEach((y) => {
      const l = h("div", { class: "hf-line-h" });
      l.style.transform = `translateY(${y - 0.75}px)`;
      w.appendChild(l);
    });
    [[A.x0, A.y0], [A.x1, A.y0], [A.x0, A.y1], [A.x1, A.y1]].forEach(([x, y]) => {
      const c = cross();
      c.style.transform = `translate(${x}px, ${y}px)`;
      w.appendChild(c);
    });
    return A;
  }

  // Any scene that sets tone "grid" gets the world behind its camera. Scenes that draw their
  // own grid set hfOwnWorld. Wrapped at boot so scenes registered by later files are covered.
  const origBoot = EM.boot;
  EM.boot = function () {
    const sb = window.STORYBOARD || {};
    if (sb.palette === "higgsfield") document.documentElement.classList.add("hf-pal-higgsfield");
    Object.values(EM.scenes).forEach((def) => {
      if (!def || def.__hfWrapped) return;
      const b = def.build;
      def.build = function (ctx) {
        if (ctx.props && ctx.props.palette === "higgsfield") ctx.el.classList.add("hf-pal-higgsfield");
        if (ctx.el.classList.contains("tone-grid") && !def.hfOwnWorld) {
          const host = h("div", { class: "hf-world-host" });
          ctx.el.insertBefore(host, ctx.cam);
          ctx.hfArea = buildWorld(host, ctx.tl, ctx.start - 0.6, ctx.end + 0.6, ctx.index + 1, pal(ctx.el));
        }
        return b.call(this, ctx);
      };
      def.__hfWrapped = true;
    });
    return origBoot.apply(this, arguments);
  };

  EM.backgrounds = EM.backgrounds || {};
  EM.backgrounds["hf-grid"] = function (root, tl, sb) {
    if (sb.palette === "higgsfield") document.documentElement.classList.add("hf-pal-higgsfield");
    root.appendChild(h("div", { class: "hf-paper" }));
    buildWorld(root, tl, 0, sb.duration || 10, 0, pal(root), 0);
  };

  // ---------------------------------------------------------------------------------------
  // Motion helpers
  // ---------------------------------------------------------------------------------------

  // 1 char per frame typing; each new char walks through `seq` colours (2 frames each) and
  // settles on `base`. Words stay unbroken for wrapping. Returns the end time.
  function hfType(tl, el, text, t, { cps = 30, seq, base, caret = false } = {}) {
    el.textContent = "";
    const chars = [];
    String(text).split(/(\s+)/).forEach((tok) => {
      if (!tok) return;
      if (/^\s+$/.test(tok)) {
        el.appendChild(document.createTextNode(" "));
        chars.push(null);
        return;
      }
      const w = h("span", { class: "hf-w" });
      [...tok].forEach((c) => {
        const s = h("span", { class: "hf-ch" }, c);
        w.appendChild(s);
        chars.push(s);
      });
      el.appendChild(w);
    });
    let car = null;
    if (caret) el.appendChild((car = h("span", { class: "hf-caret" })));
    const live = chars.filter(Boolean);
    gsap.set(live, { opacity: 0 });
    const cols = seq || [];
    chars.forEach((s, i) => {
      if (!s) return;
      const ti = t + i / cps;
      tl.set(s, { opacity: 1, color: cols[0] || base }, q(ti));
      cols.slice(1).forEach((c, k) => tl.set(s, { color: c }, q(ti + (k + 1) * 2 * F)));
      if (cols.length) tl.set(s, { color: base }, q(ti + cols.length * 2 * F));
    });
    const tEnd = t + chars.length / cps;
    if (car) {
      gsap.set(car, { opacity: 0 });
      tl.set(car, { opacity: 1 }, q(t));
      // finite blink that ends hidden
      for (let i = 0; i < 5; i++) tl.set(car, { opacity: i % 2 ? 1 : 0 }, q(tEnd + 0.22 * (i + 1)));
    }
    if (live.length) (EM.cues = EM.cues || []).push({ t, type: "typing", dur: tEnd - t });
    return tEnd;
  }

  // Words appear as bitmap glyphs for `hold` frames, jitter once, then resolve to vector type.
  function ptWords(tl, parent, text, times, { P, seed = 1, keyword, holdMin = 6, holdMax = 10, finalColor, kwColor } = {}) {
    const r = EM.rng("pt" + seed);
    const kws = (Array.isArray(keyword) ? keyword : keyword ? [keyword] : []).join(" ").toLowerCase().split(/\s+/).filter(Boolean);
    const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}%$+]/gu, "");
    const words = String(text).split(/\s+/).filter(Boolean);
    const out = [];
    words.forEach((w, i) => {
      const span = h("span", { class: "hf-ptw" });
      const vec = h("span", { class: "hf-ptv" }, w);
      const pix = h("span", { class: "hf-ptp" });
      span.append(vec, pix);
      parent.appendChild(span);
      if (i < words.length - 1) parent.appendChild(document.createTextNode(" "));
      out.push({ span, vec, pix, word: w, kw: kws.includes(norm(w)) });
    });
    const cs = getComputedStyle(parent);
    const fs = parseFloat(cs.fontSize) || 100;
    const fam = cs.fontFamily;
    let tLast = 0;
    out.forEach((o, i) => {
      const cA = o.kw || r() < 0.5 ? P.a : P.cyan;
      const cB = cA === P.a ? P.cyan : P.a;
      o.pix.style.backgroundImage = `url(${pixelWord(o.word, fam, fs, cA, cB, seed + i)})`;
      const t = times[i] != null ? times[i] : times[times.length - 1];
      const hold = (holdMin + Math.floor(r() * (holdMax - holdMin + 1))) * F;
      const fin = o.kw ? kwColor || P.a : finalColor || P.ink;
      gsap.set([o.pix, o.vec], { opacity: 0 });
      tl.set(o.pix, { opacity: 1 }, q(t));
      tl.set(o.pix, { x: Math.round(fs * 0.05) }, q(t + 2 * F));
      tl.set(o.pix, { x: 0, opacity: 0 }, q(t + hold));
      tl.set(o.vec, { opacity: 1, color: "#9b9b9b" }, q(t + hold));
      tl.set(o.vec, { color: fin }, q(t + hold + 2 * F));
      o.tRes = t + hold;
      o.fin = fin;
      tLast = Math.max(tLast, t + hold + 2 * F);
    });
    return { words: out, tEnd: tLast };
  }

  // Pixel-block reveal inside a host (cell or card): blocks start as paper, the frontier flashes
  // lime/magenta for 2 frames, then each block switches off. Radial from origin + seeded jitter.
  function blockReveal(tl, host, t, { cols = 10, rows = 6, dur = 0.34, P, seed = 1, origin = [0.5, 0.5] } = {}) {
    const r = EM.rng("br" + seed);
    const wrap = h("div", { class: "hf-blocks" });
    host.appendChild(wrap);
    const maxD = Math.hypot(Math.max(origin[0], 1 - origin[0]), Math.max(origin[1], 1 - origin[1]));
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const b = h("i");
      Object.assign(b.style, { left: (i / cols) * 100 + "%", top: (j / rows) * 100 + "%", width: 100 / cols + 0.3 + "%", height: 100 / rows + 0.3 + "%", background: P.paper });
      wrap.appendChild(b);
      const d = Math.hypot((i + 0.5) / cols - origin[0], (j + 0.5) / rows - origin[1]) / maxD;
      const tOff = t + (d * 0.78 + r() * 0.22) * dur;
      tl.set(b, { backgroundColor: r() < 0.72 ? P.b : P.a }, q(tOff - 2 * F));
      tl.set(b, { opacity: 0 }, q(tOff));
    }
    return t + dur;
  }

  // Thermal duotone settle on media (A 25.87): magenta map, lime map, natural.
  const DUO_A = "grayscale(1) contrast(1.5) sepia(1) hue-rotate(285deg) saturate(5) brightness(1.1)";
  const DUO_B = "grayscale(1) contrast(1.3) sepia(1) hue-rotate(38deg) saturate(4) brightness(1.15)";
  function duoSettle(tl, media, t) {
    gsap.set(media, { filter: DUO_A });
    tl.set(media, { filter: DUO_A }, q(t));
    tl.set(media, { filter: DUO_B }, q(t + 2 * F));
    tl.set(media, { filter: "brightness(1.35) saturate(0.7)" }, q(t + 4 * F));
    tl.set(media, { filter: "none" }, q(t + 6 * F));
  }

  // RGB split for 2-3 frames (works for text and images).
  function rgbSplit(tl, el, t, P, frames = 3, px = 10) {
    const a = rgbOf(P.cyan), m = rgbOf(P.a);
    for (let k = 0; k < frames; k++) {
      const o = px * (k % 2 ? -0.6 : 1);
      tl.set(el, { filter: `drop-shadow(${o}px 0 0 rgba(${a.join(",")},0.9)) drop-shadow(${-o}px 0 0 rgba(${m.join(",")},0.9))` }, q(t + k * F));
    }
    tl.set(el, { filter: "none" }, q(t + frames * F));
  }

  function isVideo(p) {
    return p.kind ? p.kind === "video" : /\.(mp4|mov|webm|m4v)$/i.test(p.src || "");
  }
  // Same contract as media.js: HyperFrames owns playback, the element only declares its window,
  // scaled by EM_SLOW so the source keeps real speed when the timeline is stretched.
  let vidCount = 0;
  function mediaEl(ctx, p, cls) {
    if (!isVideo(p)) return h("img", { src: p.src, class: cls, alt: "" });
    const S = SLOW();
    const t0 = Math.max(0, ctx.start - 0.6);
    const d = ctx.end + 0.6 - t0;
    return h("video", {
      id: `em-hf-v${ctx.index}-${vidCount++}`,
      src: p.src,
      class: cls,
      muted: "",
      playsinline: "",
      "data-start": (t0 * S).toFixed(3),
      "data-duration": (d * S).toFixed(3),
      "data-media-start": String(p.mediaStart || 0),
      "data-playback-rate": (1 / S).toFixed(4),
    });
  }

  function startOf(ctx, at, fallback) {
    if (typeof at === "number") return ctx.start + at;
    if (typeof at === "string" && at) return fx.timeOf(ctx, at, fallback);
    return fallback;
  }

  // ---------------------------------------------------------------------------------------
  // grid-stage
  // ---------------------------------------------------------------------------------------
  function layoutRects(name, n, A) {
    const W = A.x1 - A.x0, H = A.y1 - A.y0;
    const R = (x, y, w, hh) => ({ x: A.x0 + x * W, y: A.y0 + y * H, w: w * W, h: hh * H });
    if (n <= 1) return [R(0, 0, 1, 1)];
    if (name === "strip") return Array.from({ length: n }, (_, i) => R(i / n, 0.16, 1 / n, 0.68));
    if (name === "hero-left" || name === "hero-right") {
      const hw = n === 2 ? 0.58 : 0.62;
      const left = name === "hero-left";
      const out = [R(left ? 0 : 1 - hw, 0, hw, 1)];
      for (let i = 1; i < n; i++) out.push(R(left ? hw : 0, (i - 1) / (n - 1), 1 - hw, 1 / (n - 1)));
      return out;
    }
    // "2x2" family
    if (n === 2) return [R(0, 0, 0.5, 1), R(0.5, 0, 0.5, 1)];
    if (n === 3) return [R(0, 0, 0.5, 1), R(0.5, 0, 0.5, 0.5), R(0.5, 0.5, 0.5, 0.5)];
    if (n === 4) return [R(0, 0, 0.5, 0.5), R(0.5, 0, 0.5, 0.5), R(0, 0.5, 0.5, 0.5), R(0.5, 0.5, 0.5, 0.5)];
    if (n === 5) return [R(0, 0, 1 / 3, 0.5), R(1 / 3, 0, 1 / 3, 0.5), R(2 / 3, 0, 1 / 3, 0.5), R(0, 0.5, 0.5, 0.5), R(0.5, 0.5, 0.5, 0.5)];
    return Array.from({ length: n }, (_, i) => R((i % 3) / 3, Math.floor(i / 3) * 0.5, 1 / 3, 0.5));
  }

  EM.scene("grid-stage", {
    ownsCamera: true,
    hfOwnWorld: true,
    build(ctx) {
      const p = ctx.props;
      const { tl, start, end, dur, index } = ctx;
      const P = pal(ctx.el);
      const cells = (p.cells || []).slice(0, 6);
      const n = Math.max(1, cells.length);
      const root = h("div", { class: "hf-gs" });
      ctx.cam.appendChild(root);
      root.appendChild(h("div", { class: "hf-paper" }));
      const A = { x0: 150, y0: p.title ? 196 : 150, x1: 1770, y1: 930 };
      const decoHost = h("div", { class: "hf-world" });
      root.appendChild(decoHost);
      decor(decoHost, A, P, index + 11, tl, start - 0.6, end + 0.6);

      const L0 = layoutRects(p.layout || "2x2", n, A);
      const L1 = p.reflow ? layoutRects(p.reflow, n, A) : null;
      const tR = L1 ? startOf(ctx, p.reflowAt, start + dur * 0.52) : null;
      const RD = 0.55;

      // hairlines: every cell edge is a full-frame line, so the grid runs past the content area
      // into the gutters exactly like the reference; duplicates overlap invisibly.
      const lines = [];
      const lineHost = h("div", { class: "hf-lines" });
      root.appendChild(lineHost);
      L0.forEach((r0, i) => {
        const r1 = L1 ? L1[i] : null;
        const mk = (vert, v0, v1) => {
          const l = h("div", { class: vert ? "hf-line-v" : "hf-line-h" });
          lineHost.appendChild(l);
          gsap.set(l, vert ? { x: v0 - 0.75, scaleY: 0, transformOrigin: "50% 0%" } : { y: v0 - 0.75, scaleX: 0, transformOrigin: "0% 50%" });
          lines.push({ l, vert, v1 });
        };
        mk(true, r0.x, r1 && r1.x);
        mk(true, r0.x + r0.w, r1 && r1.x + r1.w);
        mk(false, r0.y, r1 && r1.y);
        mk(false, r0.y + r0.h, r1 && r1.y + r1.h);
      });
      lines.forEach((o, k) => tl.to(o.l, o.vert ? { scaleY: 1, duration: 0.42, ease: "expo.inOut" } : { scaleX: 1, duration: 0.42, ease: "expo.inOut" }, start - 0.05 + (k % 4) * 0.03));

      const cellHost = h("div", { class: "hf-cells" });
      root.appendChild(cellHost);
      const crossHost = h("div", { class: "hf-crosses" });
      root.appendChild(crossHost);
      const cellEls = [];
      cells.forEach((c, i) => {
        const r0 = L0[i];
        const el = h("div", { class: "hf-cell" + (c.src ? " is-media" : "") });
        cellHost.appendChild(el);
        gsap.set(el, { x: r0.x + 0.75, y: r0.y + 0.75, width: r0.w - 1.5, height: r0.h - 1.5, opacity: 0 });
        cellEls.push(el);
        const t = start + 0.22 + i * 0.12;
        tl.set(el, { opacity: 1 }, q(t));
        cue(t, "pop");
        if (c.src) {
          const m = mediaEl(ctx, c, "hf-media");
          el.appendChild(m);
          tl.fromTo(m, { scale: 1.1 }, { scale: 1, duration: dur + 0.6, ease: "none" }, start - 0.3);
          const tEnd = blockReveal(tl, el, t, { P, seed: index * 10 + i, cols: 10, rows: 6, dur: 0.32, origin: [0.3 + 0.4 * ((i * 37) % 10) / 10, 0.5] });
          duoSettle(tl, m, tEnd - 0.12);
        } else if (c.fill) {
          const tex = h("div", { class: "hf-cell-tex" });
          const col1 = c.fill === "stripes" ? P.a : c.fill === "dither" ? P.a : P.b;
          tex.style.backgroundImage = `url(${texture(c.fill === "stripes" ? "stripes" : c.fill === "dither" ? "dither" : "halftone", 800, 600, col1, "#f3d23a", { dir: "bl", pitch: 12, cell: 7, bar: 14 })})`;
          el.appendChild(tex);
          blockReveal(tl, el, t, { P, seed: index * 10 + i, cols: 8, rows: 5, dur: 0.28 });
        }
        const body = h("div", { class: "hf-cell-body" });
        el.appendChild(body);
        let tt = t + (c.src ? 0.3 : 0.08);
        if (c.stat != null) {
          const st = h("div", { class: "hf-stat" });
          body.appendChild(st);
          const m = String(c.stat).match(/^([^\d]*)([\d][\d.,]*)(.*)$/);
          if (m) {
            const num = parseFloat(m[2].replace(/,/g, ""));
            const dec = (m[2].split(".")[1] || "").length;
            fx.countUp(tl, st, num, tt, { from: Math.round(num * 0.62), prefix: m[1], suffix: m[3], decimals: dec, dur: 0.54, ease: "power2.out" });
          } else st.textContent = c.stat;
          tl.fromTo(st, { opacity: 0, yPercent: 45, filter: "blur(12px)" }, { opacity: 1, yPercent: 0, filter: "blur(0px)", duration: 0.34, ease: "expo.out", immediateRender: false }, tt);
          gsap.set(st, { opacity: 0 });
          tt += 0.2;
        }
        if (c.text && !c.src) {
          const big = h("div", { class: "hf-cell-big" });
          body.appendChild(big);
          const ws = String(c.text).split(/\s+/).filter(Boolean);
          const times = ws.map((_, k) => tt + k * 2 * F);
          ptWords(tl, big, c.text, times, { P, seed: index * 100 + i });
          tt += ws.length * 2 * F + 0.1;
        }
        if (c.label) {
          if (c.src) {
            const pill = h("div", { class: "hf-pill" });
            const tx = h("span");
            pill.appendChild(tx);
            el.appendChild(pill);
            gsap.set(pill, { clipPath: "inset(0% 100% 0% 0% round 14px)" });
            tl.to(pill, { clipPath: "inset(0% 0% 0% 0% round 14px)", duration: 5 * F, ease: "none" }, q(tt));
            hfType(tl, tx, c.label, tt + 2 * F, { seq: [P.b, P.b], base: "#ffffff" });
          } else {
            const lab = h("div", { class: "hf-cell-label" }, cross());
            const tx = h("span");
            lab.appendChild(tx);
            body.insertBefore(lab, body.firstChild);
            hfType(tl, tx, c.label, tt, { seq: [P.b], base: P.a });
          }
        }
        if (c.text && c.src) {
          const bar = h("div", { class: "hf-capbar" });
          const tx = h("span");
          bar.appendChild(tx);
          el.appendChild(bar);
          gsap.set(bar, { clipPath: "inset(0% 100% 0% 0%)" });
          tl.to(bar, { clipPath: "inset(0% 0% 0% 0%)", duration: 5 * F, ease: "none" }, q(tt + 0.1));
          hfType(tl, tx, c.text, tt + 0.1 + 2 * F, { cps: 36, seq: [P.b], base: "#ffffff" });
        }
      });

      // crosshairs ride the top-left and bottom-right corner of every cell
      const crosses = [];
      L0.forEach((r0, i) => {
        [[0, 0], [1, 1]].forEach(([cx, cy]) => {
          const c = cross();
          crossHost.appendChild(c);
          gsap.set(c, { x: r0.x + cx * r0.w, y: r0.y + cy * r0.h, opacity: 0 });
          tl.set(c, { opacity: 1 }, q(start + 0.3 + i * 0.05));
          if (L1) crosses.push({ c, x1: L1[i].x + cx * L1[i].w, y1: L1[i].y + cy * L1[i].h });
        });
      });

      if (p.title) {
        const ti = h("div", { class: "hf-gs-title" });
        ti.style.left = A.x0 + 28 + "px";
        ti.style.top = A.y0 / 2 - 22 + "px";
        root.appendChild(ti);
        const ws = String(p.title).split(/\s+/).filter(Boolean);
        ptWords(tl, ti, p.title, ws.map((_, k) => start + 0.12 + k * 2 * F), { P, seed: index * 7 + 5 });
      }

      if (L1) {
        const E = "expo.inOut";
        lines.forEach((o) => tl.to(o.l, o.vert ? { x: o.v1 - 0.75, duration: RD, ease: E } : { y: o.v1 - 0.75, duration: RD, ease: E }, tR));
        cellEls.forEach((el, i) => {
          const r1 = L1[i];
          tl.to(el, { x: r1.x + 0.75, y: r1.y + 0.75, width: r1.w - 1.5, height: r1.h - 1.5, duration: RD, ease: E }, tR);
        });
        crosses.forEach((o) => tl.to(o.c, { x: o.x1, y: o.y1, duration: RD, ease: E }, tR));
        cue(tR, "whoosh");
        fast(tR, tR + RD);
      }
      // the grid itself never moves; only a very slow push keeps it alive
      tl.fromTo(root, { scale: 1 }, { scale: 1.018, duration: dur + 0.6, ease: "none" }, start - 0.3);
    },
  });

  // ---------------------------------------------------------------------------------------
  // drum-list
  // ---------------------------------------------------------------------------------------
  EM.scene("drum-list", {
    build(ctx) {
      const p = ctx.props;
      const { tl, start, end, index } = ctx;
      const P = pal(ctx.el);
      const items = (p.items || []).map(String).filter(Boolean);
      if (!items.length) return;
      let reel = items.slice();
      while (reel.length < 8 && items.length > 1) reel = items.concat(reel);
      const S = reel.length - 1;
      const fs = p.size || 112;
      const pitch = fs * 1.12;

      const box = h("div", { class: "hf-drum-box" });
      ctx.cam.appendChild(box);
      const row = h("div", { class: "hf-drum-row", style: { fontSize: fs + "px" } });
      box.appendChild(row);
      if (p.prefix) row.appendChild(h("div", { class: "hf-drum-pre" }, p.prefix));
      const drum = h("div", { class: "hf-drum" });
      row.appendChild(drum);
      const els = reel.map((w, i) => {
        // depth-faded neighbours are texture, not copy: keep them out of the contrast audit
        const e = h("div", { class: "hf-drum-item", "data-layout-ignore": i === S ? null : "" }, w);
        drum.appendChild(e);
        return e;
      });

      // vertical-only blur on each step (SVG filter, attribute driven by a proxy: seek-safe)
      const fid = "hfvb" + index;
      const svg = h("div", { class: "hf-svgdefs", html: `<svg width="0" height="0"><filter id="${fid}" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="0 0"/></filter></svg>` });
      ctx.cam.appendChild(svg);
      const blurEl = svg.querySelector("feGaussianBlur");
      drum.style.filter = `url(#${fid})`;
      const vb = { v: 0 };
      const applyVb = () => blurEl.setAttribute("stdDeviation", "0 " + vb.v.toFixed(2));

      const grey1 = "#6f6f6f", grey2 = "#b9b9b9";
      const state = (d, final) => {
        const a = Math.abs(d);
        if (a === 0) return { y: 0, scale: 1, opacity: 1, color: final ? P.a : P.ink, filter: "blur(0px)" };
        if (a === 1) return { y: d * pitch * 0.92, scale: 0.8, opacity: 0.9, color: grey1, filter: "blur(1.5px)" };
        if (a === 2) return { y: d * pitch * 0.84, scale: 0.68, opacity: 0.6, color: grey2, filter: "blur(4px)" };
        return { y: d * pitch * 0.8, scale: 0.6, opacity: 0, color: grey2, filter: "blur(7px)" };
      };
      els.forEach((e, i) => gsap.set(e, state(i, false)));

      // step schedule: even, then decelerating over the last three steps into the landing
      const every = p.stepEvery || 0.18;
      const iv = Array.from({ length: S }, (_, k) => every * (k >= S - 3 ? [1.5, 2.1, 2.9][k - (S - 3)] || 1 : 1));
      const t0 = start + 0.45;
      const total = iv.reduce((a, b) => a + b, 0);
      const k = Math.min(1, Math.max(0.35, (end - 0.9 - t0) / total));
      let t = t0;
      const stepT = [t0];
      iv.forEach((d) => stepT.push((t += d * k)));
      for (let s = 1; s <= S; s++) {
        const ts = q(stepT[s]);
        const sd = Math.min(0.16, (stepT[s] - stepT[s - 1]) * 0.85);
        els.forEach((e, i) => {
          const d = i - s, dPrev = i - (s - 1);
          if (Math.abs(d) > 3 && Math.abs(dPrev) > 3) return;
          tl.to(e, { ...state(d, s === S), duration: sd, ease: "power3.inOut" }, ts);
        });
        tl.fromTo(vb, { v: 0 }, { v: 10, duration: sd * 0.5, ease: "power2.in", immediateRender: false, onUpdate: applyVb }, ts);
        tl.fromTo(vb, { v: 10 }, { v: 0, duration: sd * 0.5, ease: "power2.out", immediateRender: false, onUpdate: applyVb }, ts + sd * 0.5);
        cue(ts, "click");
      }
      fast(stepT[1] - 0.02, stepT[S] + 0.2);

      // landing: hard 3-frame punch and a lime underline wipe
      const tl0 = stepT[S];
      const fin = els[S];
      const ul = h("div", { class: "hf-uline" });
      fin.appendChild(ul);
      gsap.set(ul, { scaleX: 0 });
      tl.to(ul, { scaleX: 1, duration: 0.22, ease: "expo.out" }, tl0 + 0.12);
      tl.fromTo(fin.firstChild ? fin : fin, { scale: 1.08 }, { scale: 1, duration: 3 * F, ease: "none", immediateRender: false }, q(tl0 + 0.16));
      cue(tl0 + 0.12, "pop");

      const A = ctx.hfArea || { x0: 150, y0: 150, x1: 1770, y1: 930 };
      if (p.label) {
        const lab = h("div", { class: "hf-corner", style: { left: A.x0 + 44 + "px", top: A.y0 + 40 + "px" } });
        ctx.cam.appendChild(lab);
        hfType(tl, lab, p.label, start + 0.15, { seq: [P.b, P.a], base: P.ink });
      }
      if (p.tail) {
        const tail = h("div", { class: "hf-corner", style: { right: 1920 - A.x1 + 44 + "px", bottom: 1080 - A.y1 + 40 + "px", textAlign: "right", maxWidth: "520px" } });
        ctx.cam.appendChild(tail);
        hfType(tl, tail, p.tail, tl0 + 0.2, { seq: [P.b, P.a], base: P.ink });
      }
    },
  });

  // ---------------------------------------------------------------------------------------
  // glitch-lockup
  // ---------------------------------------------------------------------------------------
  EM.scene("glitch-lockup", {
    build(ctx) {
      const p = ctx.props;
      const { tl, start, end, rng, index } = ctx;
      const P = pal(ctx.el);
      const wrap = h("div", { class: "hf-gl" });
      ctx.cam.appendChild(wrap);
      const row = h("div", { class: "hf-gl-row" });
      wrap.appendChild(row);
      const t0 = start + 0.1;
      let tNext;
      const allChars = [];
      const bi = p.logo !== false ? fx.brandImg(ctx, "logo", { height: p.logoHeight || 150 }) : null;
      if (bi) {
        row.appendChild(bi.wrap);
        gsap.set(bi.img, { opacity: 0 });
        tl.set(bi.img, { opacity: 1, scale: 4.2 }, q(t0));
        tl.set(bi.img, { scale: 1.3 }, q(t0 + F));
        tl.fromTo(bi.img, { scale: 1.3 }, { scale: 1, duration: 2 * F, ease: "expo.out", immediateRender: false }, q(t0 + 2 * F));
        tNext = t0 + 6 * F;
      } else {
        const name = String(p.name || (ctx.brand && ctx.brand.name) || "");
        const nameEl = h("div", { class: "hf-gl-name" });
        row.appendChild(nameEl);
        const nh = Math.min(4, Math.max(1, Math.ceil(name.length / 2.5)));
        const head = h("span", { class: "hf-gl-head" });
        nameEl.appendChild(head);
        [...name.slice(0, nh)].forEach((c) => {
          const s = h("span", { class: "hf-ch" }, c);
          head.appendChild(s);
          allChars.push(s);
        });
        const rest = h("span", { class: "hf-gl-rest" });
        nameEl.appendChild(rest);
        // A 0.17: first letters crash in at ~4x (1 frame), 1.3x (1 frame), settle by frame 3
        gsap.set(head, { opacity: 0 });
        tl.set(head, { opacity: 1, scale: 4.2 }, q(t0));
        tl.set(head, { scale: 1.3 }, q(t0 + F));
        tl.fromTo(head, { scale: 1.3 }, { scale: 1, duration: 2 * F, ease: "expo.out", immediateRender: false }, q(t0 + 2 * F));
        tl.set(head.firstChild, { color: P.a }, q(t0));
        tl.set(head.firstChild, { color: P.ink }, q(t0 + 9 * F));
        const tType = t0 + 4 * F;
        const tEnd = hfType(tl, rest, name.slice(nh), tType, { seq: [P.a], base: P.ink, caret: true });
        rest.querySelectorAll(".hf-ch").forEach((s) => allChars.push(s));
        tNext = tEnd + 2 * F;
      }
      rgbSplit(tl, row, t0 + F, P, 3, 12);
      fast(t0 - 0.03, t0 + 0.2);
      cue(t0, "pop");

      let badge = null;
      if (p.badge) {
        badge = h("div", { class: "hf-badge" });
        const tx = h("span");
        badge.appendChild(tx);
        row.appendChild(badge);
        if (bi) badge.style.fontSize = (p.logoHeight || 150) * 0.8 + "px";
        const tb = tNext + 2 * F;
        gsap.set(badge, { opacity: 0, backgroundColor: "#4de8b0" });
        tl.set(badge, { opacity: 1 }, q(tb));
        tl.set(badge, { backgroundColor: P.b }, q(tb + 3 * F));
        hfType(tl, tx, p.badge, tb + F, { seq: [P.a], base: "#111111" });
        rgbSplit(tl, badge, tb, P, 2, 8);
        cue(tb, "pop");
        tNext = tb + String(p.badge).length * F + 4 * F;
      }

      if (badge && p.trace !== false) {
        const bc = fx.layoutCenter(badge, ctx.cam);
        const bh = badge.offsetHeight || 150;
        const top = bc.y - bh / 2 - 10;
        const xs = 1920 - 150, ymid = Math.max(60, top - 120);
        const tr = h("div", { class: "hf-trace", html: `<svg width="1920" height="1080" viewBox="0 0 1920 1080"><path d="M${xs} -20 V${ymid} H${bc.x} V${top}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="square"/><rect x="${bc.x - 7}" y="${top - 7}" width="14" height="14" fill="currentColor"/></svg>` });
        ctx.cam.appendChild(tr);
        const path = tr.querySelector("path"), node = tr.querySelector("rect");
        fx.draw(tl, path, tNext - 0.1, { dur: 0.3, ease: "power2.inOut" });
        gsap.set(node, { opacity: 0 });
        tl.set(node, { opacity: 1 }, q(tNext + 0.2));
      }

      if (p.pill) {
        const pill = h("div", { class: "hf-gl-pill" });
        const bg = h("div", { class: "hf-gl-pill-bg" });
        const txw = h("span", { class: "hf-ptw" });
        const vec = h("span", { class: "hf-ptv" }, p.pill);
        const pix = h("span", { class: "hf-ptp" });
        txw.append(vec, pix);
        pill.append(bg, txw);
        wrap.appendChild(pill);
        const cs = getComputedStyle(vec);
        pix.style.backgroundImage = `url(${pixelWord(p.pill, cs.fontFamily, parseFloat(cs.fontSize) || 54, P.a, P.cyan, index)})`;
        const tp = tNext + 0.05;
        gsap.set([pix, vec], { opacity: 0 });
        gsap.set(bg, { clipPath: "inset(0% 100% 0% 0% round 16px)" });
        tl.set(pix, { opacity: 1 }, q(tp));
        tl.set(pix, { x: 4 }, q(tp + 2 * F));
        tl.to(bg, { clipPath: "inset(0% 0% 0% 0% round 16px)", duration: 6 * F, ease: "none" }, q(tp + 5 * F));
        tl.set(pix, { opacity: 0 }, q(tp + 8 * F));
        tl.set(vec, { opacity: 1, color: "#ffffff" }, q(tp + 8 * F));
        cue(tp + 5 * F, "pop");
      }

      // slow drift so the hold is never dead still
      tl.fromTo(wrap, { scale: 1 }, { scale: 1.025, duration: ctx.dur + 0.5, ease: "none" }, start);
      // mid-hold glitch hit
      const tg = Math.min(end - 0.6, tNext + 0.55);
      if (tg > tNext) {
        rgbSplit(tl, row, tg, P, 2, 9);
        tl.set(row, { x: 10 }, q(tg));
        tl.set(row, { x: 0 }, q(tg + 2 * F));
      }
      // A 2.95: letters drop out at random, each with a small black tag, into the next shot
      if (p.dropout !== false && allChars.length) {
        const tD = end - 0.32;
        allChars.forEach((s) => {
          const tag = h("i", { class: "hf-tagbar" });
          s.appendChild(tag);
          const tx = tD + rng() * 0.26;
          if (rng() < 0.55) {
            tl.set(tag, { opacity: 1 }, q(tx - 2 * F));
            tl.set(tag, { opacity: 0 }, q(tx + F));
          }
          tl.set(s, { opacity: 0 }, q(tx));
        });
      }
    },
  });

  // ---------------------------------------------------------------------------------------
  // pixel-type
  // ---------------------------------------------------------------------------------------
  EM.scene("pixel-type", {
    build(ctx) {
      const p = ctx.props;
      const { tl, start, index } = ctx;
      const P = pal(ctx.el);
      const size = Math.max(24, p.size || 120);
      const wrap = h("div", { class: "hf-pt-wrap", style: { alignItems: p.align === "center" ? "center" : "flex-start", width: (p.maxWidth || 1480) + "px" } });
      ctx.cam.appendChild(wrap);
      const block = h("div", { class: "hf-pt", style: { fontSize: size + "px", textAlign: p.align === "center" ? "center" : "left" } });
      wrap.appendChild(block);
      const words = String(p.text || "").split(/\s+/).filter(Boolean);
      const times = ctx.words && ctx.words.length ? fx.alignTimes(ctx, words, { lead: 0.03 }) : words.map((_, i) => start + 0.18 + i * (p.stagger || 0.07));
      const res = ptWords(tl, block, p.text || "", times, { P, seed: index * 13 + 1, keyword: p.keyword });
      // one cyan inversion frame once the whole line has resolved (A 21.95)
      const tInv = res.tEnd + 3 * F;
      res.words.forEach((o) => {
        tl.set(o.vec, { color: P.cyan }, q(tInv));
        tl.set(o.vec, { color: o.fin }, q(tInv + F));
        if (o.kw) cue(o.tRes, "pop");
      });
      if (p.sub) {
        const sub = h("div", { class: "hf-pt-sub" });
        wrap.appendChild(sub);
        hfType(tl, sub, p.sub, tInv + 0.15, { seq: [P.a], base: "#7a7a7a" });
      }
    },
  });

  // ---------------------------------------------------------------------------------------
  // endcard-caps
  // ---------------------------------------------------------------------------------------
  EM.scene("endcard-caps", {
    ownsCamera: true,
    hfOwnWorld: true,
    build(ctx) {
      const p = ctx.props;
      const { tl, start } = ctx;
      const P = pal(ctx.el);
      const root = h("div", { class: "hf-end" });
      ctx.cam.appendChild(root);
      root.appendChild(h("div", { class: "hf-paper" }));
      const size = Math.max(24, p.size || 26);
      const lines = h("div", { class: "hf-end-lines", style: { fontSize: size + "px" } });
      (p.lines || []).forEach((ln) => lines.appendChild(h("div", {}, String(ln))));
      root.appendChild(lines);
      if (p.url) root.appendChild(h("div", { class: "hf-end-url", style: { fontSize: size + "px" } }, p.url));
      // hard cut in: the card is simply there on the first frame; optional 1-frame flash
      if (p.flash) {
        const o = h("div", { class: "hf-end-flash" });
        o.style.background = role(p.flash === true ? "accent" : p.flash, P);
        root.appendChild(o);
        gsap.set(o, { opacity: 0 });
        tl.set(o, { opacity: 0.9 }, q(start));
        tl.set(o, { opacity: 0 }, q(start + F));
      }
    },
  });

  // ---------------------------------------------------------------------------------------
  // persp-card
  // ---------------------------------------------------------------------------------------
  EM.scene("persp-card", {
    ownsCamera: true,
    build(ctx) {
      const p = ctx.props;
      const { tl, start, dur, index } = ctx;
      const P = pal(ctx.el);
      const rotY = p.rotY != null ? p.rotY : 24;
      const stage = h("div", { class: "hf-pc" });
      ctx.cam.appendChild(stage);
      const card = h("div", { class: "hf-pc-card" });
      stage.appendChild(card);
      const m = mediaEl(ctx, p, "hf-media");
      card.appendChild(m);
      const t = start + 0.05;
      tl.fromTo(card, { x: 1150, z: -900, rotationY: rotY + 40, opacity: 1 }, { x: -30, z: 0, rotationY: rotY, duration: 0.62, ease: "expo.out" }, t);
      tl.to(card, { x: -80, rotationY: rotY - 7, duration: Math.max(0.5, dur - 0.4), ease: "none" }, t + 0.62);
      tl.fromTo(m, { scale: 1.12 }, { scale: 1, duration: dur + 0.6, ease: "none" }, start - 0.3);
      fast(t - 0.02, t + 0.3);
      cue(t, "whoosh");
      const tRev = blockReveal(tl, card, t + 0.2, { P: { ...P, paper: "#f4f4ef" }, seed: index * 5, cols: 14, rows: 8, dur: 0.36 });
      duoSettle(tl, m, tRev - 0.1);

      if (p.caption) {
        const cap = h("div", { class: "hf-cap" });
        const tx = h("span");
        cap.appendChild(tx);
        stage.appendChild(cap);
        const tc = tRev + 0.12;
        gsap.set(cap, { clipPath: "inset(-40% 100% -40% 0%)" });
        tl.to(cap, { clipPath: "inset(-40% 0% -40% 0%)", duration: 6 * F, ease: "none" }, q(tc));
        hfType(tl, tx, p.caption, tc + 2 * F, { cps: 40, seq: [P.b], base: "#ffffff" });
        cue(tc, "pop");
        // lime pixel sparkles at both ends, re-seeded every 3 frames
        [0, 1].forEach((side) => {
          const sp = h("div", { class: "hf-spark" + (side ? " r" : "") });
          cap.appendChild(sp);
          const urls = [0, 1, 2].map((k) => texture("sparkle", 132, 120, P.b, "", { dir: side ? "l" : "r", cell: 12, seed: k }));
          gsap.set(sp, { opacity: 0, backgroundImage: `url(${urls[0]})` });
          tl.set(sp, { opacity: 1 }, q(tc + 3 * F));
          let k = 0;
          for (let tt = tc + 6 * F; tt < start + dur + 0.3; tt += 3 * F) tl.set(sp, { backgroundImage: `url(${urls[++k % 3]})` }, q(tt));
        });
      }
    },
  });

  // ---------------------------------------------------------------------------------------
  // Transitions
  // ---------------------------------------------------------------------------------------
  const T = EM.transition;

  function overlay(next, cls = "hf-ovl") {
    const o = h("div", { class: cls });
    next.parentNode.appendChild(o);
    gsap.set(o, { opacity: 0 });
    return o;
  }
  // Hard cut on a frame: next is invisible until tc, prev disappears at tc (so transparent
  // scenes never show the old one underneath).
  function cutAt(tl, prev, next, tc) {
    gsap.set(next, { opacity: 0 });
    tl.set(next, { opacity: 1 }, q(tc));
    tl.set(prev, { opacity: 0 }, q(tc));
  }

  T("flash-frame", ({ tl, prev, next, at, d, opts }) => {
    const P = pal(next);
    const tc = at + d / 2;
    const o = overlay(next);
    o.style.background = role(opts.color || "accent", P);
    cutAt(tl, prev, next, tc);
    tl.set(o, { opacity: opts.opacity != null ? opts.opacity : 0.9 }, q(tc));
    tl.set(o, { opacity: 0 }, q(tc + clamp(opts.frames || 1, 1, 3) * F));
    cue(tc, "pop");
  });

  T("flash-cycle", ({ tl, prev, next, at, d, opts }) => {
    const P = pal(next);
    const tc = at + d / 2;
    const cols = (opts.colors || ["accent", "lime", "black", "white"]).map((c) => role(c, P));
    const ops = [0.82, 0.82, 0.94, 1];
    const o = overlay(next);
    cutAt(tl, prev, next, tc);
    cols.forEach((c, k) => tl.set(o, { opacity: ops[k] != null ? ops[k] : 0.85, backgroundColor: c }, q(tc + (k - 2) * F)));
    tl.set(o, { opacity: 0 }, q(tc + (cols.length - 2) * F));
    cue(tc - 2 * F, "pop");
  });

  T("overexpose", ({ tl, prev, next, at, d }) => {
    const tc = at + d / 2;
    const o = overlay(next);
    o.style.background = "#ffffff";
    tl.fromTo(prev, { filter: "brightness(1) contrast(1)" }, { filter: "brightness(3) contrast(0.8)", duration: 3 * F, ease: "power2.in", immediateRender: false }, q(tc - 3 * F));
    tl.fromTo(o, { opacity: 0 }, { opacity: 1, duration: 3 * F, ease: "power2.in", immediateRender: false }, q(tc - 3 * F));
    cutAt(tl, prev, next, tc);
    const s = Math.max(0.24, d / 2 + 0.1);
    tl.fromTo(next, { filter: "brightness(2.4) contrast(0.85)" }, { filter: "brightness(1) contrast(1)", duration: s, ease: "expo.out", immediateRender: false }, q(tc));
    tl.fromTo(o, { opacity: 1 }, { opacity: 0, duration: s * 0.8, ease: "power2.out", immediateRender: false }, q(tc));
    tl.set(next, { filter: "none" }, tc + s + 0.02);
    tl.set(prev, { filter: "none" }, at + d + 0.05);
  });

  T("punch-in", ({ tl, prev, next, at, d, opts }) => {
    const P = pal(next);
    const tc = at + d / 2;
    const x = opts.x != null ? opts.x : 960, y = opts.y != null ? opts.y : 540;
    const zin = Math.min(0.18, d / 2);
    tl.fromTo(prev, { scale: 1, transformOrigin: `${x}px ${y}px` }, { scale: opts.scale || 4, duration: zin, ease: "expo.in", immediateRender: false }, tc - zin);
    cutAt(tl, prev, next, tc);
    tl.fromTo(next, { scale: 1.15 }, { scale: 1, duration: Math.max(0.3, d / 2 + 0.1), ease: "expo.out", immediateRender: false }, q(tc));
    if (opts.flash !== false) {
      const o = overlay(next);
      o.style.background = P.a;
      o.style.mixBlendMode = "multiply";
      tl.set(o, { opacity: 0.6 }, q(tc));
      tl.set(o, { opacity: 0 }, q(tc + F));
    }
    tl.set(prev, { scale: 1 }, at + d + 0.05);
    fast(tc - zin - 0.02, tc + 0.15);
    cue(tc, "click");
  });

  T("pixel-dissolve", ({ tl, prev, next, at, d, opts }) => {
    const P = pal(next);
    const cols = opts.cols || 16, rows = opts.rows || Math.round((cols * 9) / 16);
    const r = EM.rng("pd" + at.toFixed(3));
    const wrap = h("div", { class: "hf-tblocks" });
    next.parentNode.appendChild(wrap);
    const pool = { mix: [P.a, P.a, P.a, P.ink, P.ink, P.b], accent: [P.a], lime: [P.b], ink: [P.ink] }[opts.tint || "mix"] || [P.a];
    const org = opts.origin ? [opts.origin[0] / 1920, opts.origin[1] / 1080] : null;
    const tc = at + d * 0.5;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const b = h("i");
      Object.assign(b.style, { left: (i * 1920) / cols + "px", top: (j * 1080) / rows + "px", width: Math.ceil(1920 / cols) + 1 + "px", height: Math.ceil(1080 / rows) + 1 + "px", background: pool[Math.floor(r() * pool.length)] });
      wrap.appendChild(b);
      gsap.set(b, { opacity: 0 });
      const tOn = at + r() * d * 0.42;
      const dist = org ? Math.hypot((i + 0.5) / cols - org[0], ((j + 0.5) / rows - org[1]) * 0.56) / 1.15 : r();
      const tOff = tc + F + (clamp(dist) * 0.7 + r() * 0.3) * d * 0.42;
      tl.set(b, { opacity: 1 }, q(tOn));
      if (r() < 0.35) tl.set(b, { backgroundColor: pool[Math.floor(r() * pool.length)] === P.b ? P.a : P.b }, q((tOn + tOff) / 2));
      tl.set(b, { opacity: 0 }, q(tOff));
    }
    cutAt(tl, prev, next, tc);
  });

  T("grid-reflow", ({ tl, prev, next, at, d, opts }) => {
    const W = 1920, H = 1080;
    const r = EM.rng("gr" + at.toFixed(3));
    const X0 = opts.x != null ? opts.x : Math.round(W * (0.36 + r() * 0.12));
    const Y0 = opts.y != null ? opts.y : Math.round(H * (0.42 + r() * 0.16));
    const X1 = W - X0 + Math.round((r() - 0.5) * 200), Y1 = H - Y0;
    const ease = gsap.parseEase("power3.inOut");
    const lerp = (a, b, k) => a + (b - a) * k;
    const boxes = Array.from({ length: 8 }, () => {
      const b = h("div", { class: "hf-rf-box" });
      next.parentNode.appendChild(b);
      gsap.set(b, { opacity: 0 });
      return b;
    });
    const path = (rs) => `path("${rs.map(([x0, y0, x1, y1]) => `M${x0.toFixed(1)} ${y0.toFixed(1)}H${x1.toFixed(1)}V${y1.toFixed(1)}H${x0.toFixed(1)}Z`).join("")}")`;
    const pr = { v: 0 };
    const apply = () => {
      const v = pr.v;
      const a = ease(clamp(v / 0.8)), b = ease(clamp((v - 0.2) / 0.8));
      const an = ease(clamp((v - 0.12) / 0.8)), bn = ease(clamp((v - 0.2) / 0.8));
      const P0 = [
        [0, 0, lerp(X0, 0, a), Y0], [lerp(X0, W, a), 0, W, Y0],
        [0, Y0, lerp(X0, 0, b), H], [lerp(X0, W, b), Y0, W, H],
      ];
      const N0 = [
        [lerp(X1, 0, an), 0, X1, Y1], [X1, 0, lerp(X1, W, an), Y1],
        [lerp(X1, 0, bn), Y1, X1, H], [X1, Y1, lerp(X1, W, bn), H],
      ];
      prev.style.clipPath = v <= 0 ? "" : path(P0);
      next.style.clipPath = v >= 1 ? "" : path(N0);
      P0.concat(N0).forEach(([x0, y0, x1, y1], k) => {
        const bx = boxes[k];
        bx.style.transform = `translate(${x0 - 0.75}px, ${y0 - 0.75}px)`;
        bx.style.width = Math.max(0, x1 - x0 + 1.5) + "px";
        bx.style.height = Math.max(0, y1 - y0 + 1.5) + "px";
      });
    };
    apply();
    prev.style.clipPath = "";
    next.style.clipPath = "";
    tl.fromTo(pr, { v: 0 }, { v: 1, duration: d, ease: "none", immediateRender: false, onUpdate: apply }, at);
    boxes.forEach((b) => {
      tl.set(b, { opacity: 1 }, q(at));
      tl.set(b, { opacity: 0 }, q(at + d));
    });
    cue(at, "whoosh");
  });
})();

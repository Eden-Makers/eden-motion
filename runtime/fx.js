/* Motion primitives shared by all scenes. Every helper takes the timeline and an absolute
 * time so scenes stay declarative and seek-safe. Easing vocabulary is deliberately small:
 * "land" for arrivals, power3.inOut for travel, back.out(1.6) only for pops.
 */
(function () {
  const EM = window.EM;
  const h = EM.h;
  const fx = (EM.fx = {});

  // "land": expo's fast start, but it arrives with a little speed left instead of crawling. On a
  // 24 fps clock expo.out spends its last 6-8 frames under 0.5 px per frame on moves under ~150 px,
  // which rasterises as the element stopping short, then creeping in (a freeze, not a settle).
  // Trimmed exponential, k=6: 2-5 crawl frames on the same moves. `eden-motion measure` counts them.
  gsap.registerEase("land", (p) => (1 - Math.pow(2, -6 * p)) / (1 - Math.pow(2, -6)));

  fx.EASE = { in: "land", travel: "power3.inOut", pop: "back.out(1.7)", soft: "power2.out", snap: "expo.inOut" };

  // Split text into word spans (keeps spaces), optional chars. Returns array of spans.
  fx.splitWords = function (el, text, { keyword, keywordClass = "em-kw" } = {}) {
    el.textContent = "";
    const kws = (Array.isArray(keyword) ? keyword : keyword ? [keyword] : []).map((k) => k.toLowerCase());
    const out = [];
    String(text)
      .split(/(\s+)/)
      .forEach((tok) => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) return el.appendChild(document.createTextNode(" "));
        const clean = tok.toLowerCase().replace(/[^\p{L}\p{N}%$+]/gu, "");
        const isKw = kws.some((k) => k.split(/\s+/).map((x) => x.replace(/[^\p{L}\p{N}%$+]/gu, "")).includes(clean));
        const w = h("span", { class: "em-word" + (isKw ? " " + keywordClass : "") }, h("span", { class: "em-word-in" }, tok));
        el.appendChild(w);
        out.push(w);
      });
    return out;
  };

  fx.splitChars = function (el, text) {
    el.textContent = "";
    return [...String(text)].map((c) => {
      const s = h("span", { class: "em-char" }, c === " " ? " " : c);
      el.appendChild(s);
      return s;
    });
  };

  // Word rise: y + blur + opacity -> rest. The signature Burnwe/Lovable text arrival.
  fx.riseIn = function (tl, targets, t, { y = 40, blur = 14, dur = 0.7, stagger = 0.06, ease = "land", scale = 1 } = {}) {
    const inner = [].concat(targets).map((w) => w.querySelector?.(".em-word-in") || w);
    tl.fromTo(inner, { y, opacity: 0, filter: `blur(${blur}px)`, scale }, { y: 0, opacity: 1, filter: "blur(0px)", scale: 1, duration: dur, stagger, ease }, t);
    return t + dur + stagger * (inner.length - 1);
  };

  // Words appear exactly when the narrator says them. times[] = absolute seconds.
  fx.riseInAt = function (tl, targets, times, opts = {}) {
    const inner = [].concat(targets).map((w) => w.querySelector?.(".em-word-in") || w);
    const { y = 36, blur = 12, dur = 0.55, ease = "land" } = opts;
    inner.forEach((el, i) => {
      tl.fromTo(el, { y, opacity: 0, filter: `blur(${blur}px)` }, { y: 0, opacity: 1, filter: "blur(0px)", duration: dur, ease }, times[i] ?? times[times.length - 1]);
    });
  };

  fx.fadeOutUp = function (tl, targets, t, { y = -30, blur = 10, dur = 0.45, stagger = 0.03 } = {}) {
    tl.to(targets, { y, opacity: 0, filter: `blur(${blur}px)`, duration: dur, stagger, ease: "power2.in" }, t);
  };

  // Mask reveal: element slides up from behind its own overflow-hidden line box.
  fx.maskUp = function (tl, targets, t, { dur = 0.8, stagger = 0.08, ease = "expo.out" } = {}) {
    [].concat(targets).forEach((el) => el.classList.add("em-mask"));
    const inner = [].concat(targets).map((w) => w.querySelector(".em-word-in") || w);
    tl.fromTo(inner, { yPercent: 110 }, { yPercent: 0, duration: dur, stagger, ease }, t);
  };

  // Typewriter with caret. Text is revealed by character count via a proxy (seek-safe).
  fx.typeText = function (tl, el, text, t, { cps = 28, caret = true, dur } = {}) {
    const span = h("span", { class: "em-typed" });
    el.textContent = "";
    el.appendChild(span);
    let caretEl = null;
    if (caret) el.appendChild((caretEl = h("span", { class: "em-caret" })));
    const n = text.length;
    const d = dur ?? n / cps;
    const p = { v: 0 };
    const write = () => (span.textContent = text.slice(0, Math.round(p.v)));
    write();
    tl.to(p, { v: n, duration: d, ease: "none", onUpdate: write }, t);
    (EM.cues = EM.cues || []).push({ t, type: "typing", dur: d });
    if (caretEl) {
      // finite blink after typing
      const blinks = 6;
      for (let i = 0; i < blinks; i++) tl.to(caretEl, { opacity: i % 2 ? 1 : 0, duration: 0.01 }, t + d + 0.35 * (i + 1));
    }
    return t + d;
  };

  fx.countUp = function (tl, el, to, t, { from = 0, dur = 1.4, prefix = "", suffix = "", decimals = 0, ease = "power3.out", sep = "," } = {}) {
    const p = { v: from };
    const fmt = (v) => {
      const s = v.toFixed(decimals);
      const [a, b] = s.split(".");
      return prefix + a.replace(/\B(?=(\d{3})+(?!\d))/g, sep) + (b ? "." + b : "") + suffix;
    };
    el.textContent = fmt(from);
    tl.to(p, { v: to, duration: dur, ease, onUpdate: () => (el.textContent = fmt(p.v)) }, t);
  };

  // Pop in for icons, chips, avatars. Reference films never overshoot: scale + defocus resolve
  // monotonically (0.4 -> 1, blur 10 -> 0, ~8 frames).
  fx.pop = function (tl, targets, t, { dur = 0.4, stagger = 0.16, from = 0.4, ease = "expo.out" } = {}) {
    tl.fromTo(targets, { scale: from, opacity: 0, filter: "blur(10px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: dur, stagger, ease }, t);
    [].concat(targets).forEach((el, i) => (EM.cues = EM.cues || []).push({ t: t + i * stagger, type: "pop", x: fx.screenX(el) }));
  };

  // Resolve a CSS custom property in the context of el (scene tone classes override vars).
  fx.cssVar = function (el, name) {
    const node = el && el.isConnected ? el : document.documentElement;
    return getComputedStyle(node).getPropertyValue(name).trim();
  };

  // Brand logo or mark as a wrapper <span><img></span>. Monochrome marks take the world's text
  // colour (white on dark tones, near-black on light). Animate the returned .img, not the wrapper
  // filter. Returns { wrap, img } or null when the brand has no such asset.
  fx.brandImg = function (ctx, which = "mark", { height = 120 } = {}) {
    const b = ctx.brand || {};
    const src = which === "logo" ? b.logo || b.mark : b.mark || b.logo;
    if (!src) return null;
    const mono = src === b.logo ? b.logoMono : b.markMono;
    const bg = fx.cssVar(ctx.el, "--bg") || "#fff";
    const m = bg.match(/^#?([0-9a-f]{6})$/i);
    const n = m ? parseInt(m[1], 16) : 0xffffff;
    const dark = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 110;
    const img = h("img", { src, style: { height: height + "px", width: "auto", display: "block" } });
    const wrap = h("span", { style: { display: "block", filter: mono ? (dark ? "brightness(0) invert(1)" : "brightness(0)") : "none" } }, img);
    return { wrap, img };
  };

  // M8 focus-pull entrance: THE default arrival for cards, rows, panels, icons.
  fx.focusIn = function (tl, targets, t, { dur = 0.42, stagger = 0.14, blur = 16, scale = 1.06, y = 0, ease = "land" } = {}) {
    tl.fromTo(targets, { opacity: 0, filter: `blur(${blur}px)`, scale, y }, { opacity: 1, filter: "blur(0px)", scale: 1, y: 0, duration: dur, stagger, ease }, t);
    return t + dur + stagger * ([].concat(targets).length - 1);
  };

  // M9 blur-out exit.
  fx.focusOut = function (tl, targets, t, { dur = 0.24, blur = 20, scale = 1.04 } = {}) {
    tl.to(targets, { opacity: 0, filter: `blur(${blur}px)`, scale, duration: dur, ease: "power2.in" }, t);
  };

  // M1 hot-tail typewriter (Burnwe signature). Characters appear at VO word onsets; the newest
  // characters are born in the accent gradient and cool to the base colour over ~0.4 s.
  // wordTimes: absolute onset per word (optional). Returns end time.
  fx.hotType = function (tl, el, text, t, { wordTimes, cps = 17, keyword, cool = 0.42, deadline } = {}) {
    // With a deadline, speed typing up so the last character lands by then.
    if (deadline == null && EM._sceneEnd != null) deadline = EM._sceneEnd - 0.55;
    if (deadline != null) {
      const chars = String(text).replace(/\s+/g, "").length;
      const lastStart = wordTimes && wordTimes.length ? wordTimes[wordTimes.length - 1] : t;
      const lastWordLen = String(text).trim().split(/\s+/).pop().length;
      const need = Math.max(lastStart + lastWordLen / cps, t + chars / cps);
      if (need > deadline) cps = Math.min(60, cps * (need - t) / Math.max(0.2, deadline - t));
    }
    el.textContent = "";
    // GSAP cannot tween var(--x) strings: resolve real colours from the element's context.
    const HOT = fx.cssVar(el, "--accent") || "#6d5cff";
    const BASE = fx.cssVar(el, "--fg") || "#111";
    const kws = (Array.isArray(keyword) ? keyword : keyword ? [keyword] : []).join(" ").toLowerCase().split(/\s+/).filter(Boolean);
    const words = String(text).split(/\s+/).filter(Boolean);
    // characters still to type from each word on, so a late VO word can be pulled forward
    const left = words.map((_, wi) => words.slice(wi).join("").length);
    let tt = t, last = t;
    words.forEach((w, wi) => {
      const isKw = kws.includes(w.toLowerCase().replace(/[^\p{L}\p{N}%$+]/gu, ""));
      const wordEl = h("span", { class: "em-word" + (isKw ? " em-kw" : "") });
      el.appendChild(wordEl);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(" "));
      if (wordTimes && wordTimes[wi] != null) tt = Math.max(tt, wordTimes[wi]);
      // a word the narrator says late still has to finish before the cut: the line must be read
      if (deadline != null) tt = Math.max(last === t && wi === 0 ? t : last + 1 / cps, Math.min(tt, deadline - left[wi] / cps));
      [...w].forEach((c, ci) => {
        const base = h("span", { class: "em-char" }, c);
        wordEl.appendChild(base);
        const at = tt + ci / cps;
        tl.fromTo(base, { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.1, ease: "none" }, at);
        if (!isKw) tl.fromTo(base, { color: HOT }, { color: BASE, duration: cool, ease: "power2.out" }, at + 0.06);
        last = at;
      });
      tt = last + 1 / cps;
    });
    return last + cool;
  };

  // Cursor with a coloured name tag (multiplayer cursor, M36).
  fx.tagCursor = function (parent, label, { x = 960, y = 700, color } = {}) {
    const c = fx.cursor(parent, { x, y });
    const tag = h("div", { class: "em-tag" }, label);
    if (color) tag.style.background = color;
    c.appendChild(tag);
    return c;
  };

  // Card arrival in 3D: comes from depth with tilt, settles flat.
  fx.cardIn = function (tl, targets, t, { dur = 0.9, stagger = 0.08, y = 120, rx = 25, z = -300, ease = "land" } = {}) {
    tl.fromTo(targets, { y, rotationX: rx, z, opacity: 0 }, { y: 0, rotationX: 0, z: 0, opacity: 1, duration: dur, stagger, ease }, t);
  };

  // Slow finite float so nothing is ever dead still.
  fx.float = function (tl, el, t, dur, { amp = 10, rot = 1.2, seed = 1 } = {}) {
    const r = EM.rng(seed);
    tl.to(el, { y: `+=${(r() - 0.5) * 2 * amp}`, x: `+=${(r() - 0.5) * amp}`, rotation: `+=${(r() - 0.5) * rot}`, duration: Math.max(0.1, dur), ease: "sine.inOut" }, t);
  };

  // Cursor: arrow svg that travels on bezier-ish path and clicks with a ripple.
  fx.cursor = function (parent, { x = 960, y = 700, hand = false } = {}) {
    const svg = hand
      ? '<svg viewBox="0 0 32 32" width="44" height="44"><path d="M11 3.5a2 2 0 0 1 4 0V14l1-.2V11a2 2 0 0 1 4 0v3.3l1 .1V13a2 2 0 0 1 4 0v8.5c0 4.7-3.3 8-8 8h-1.3c-2.6 0-4.4-1-6-3L5.4 21a2 2 0 0 1 3-2.6L11 21z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>'
      : '<svg viewBox="0 0 28 28" width="40" height="40"><path d="M5 3l17 10.2-7.4 1.6 4.3 8.2-3.4 1.8-4.3-8.2L5 22z" fill="#111" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>';
    const c = h("div", { class: "em-cursor", html: svg });
    const ripple = h("div", { class: "em-ripple" });
    c.appendChild(ripple);
    parent.appendChild(c);
    gsap.set(c, { x, y, opacity: 0 });
    return c;
  };

  fx.cursorMove = function (tl, c, x, y, t, { dur = 0.9, ease = "power3.inOut", show = true } = {}) {
    if (show) tl.to(c, { opacity: 1, duration: 0.2 }, t);
    tl.to(c, { x, y, duration: dur, ease }, t);
    return t + dur;
  };

  fx.cursorClick = function (tl, c, t, { target } = {}) {
    const r = c.querySelector(".em-ripple");
    tl.to(c, { scale: 0.85, duration: 0.08, ease: "power2.in" }, t).to(c, { scale: 1, duration: 0.2, ease: "power2.out" }, t + 0.08);
    tl.fromTo(r, { scale: 0.2, opacity: 0.9 }, { scale: 2.6, opacity: 0, duration: 0.55, ease: "expo.out" }, t + 0.05);
    if (target) tl.to(target, { scale: 0.96, duration: 0.08, ease: "power2.in" }, t).to(target, { scale: 1, duration: 0.25, ease: "power2.out" }, t + 0.08);
    (EM.cues = EM.cues || []).push({ t, type: "click", x: target ? fx.screenX(target) : undefined });
    return t + 0.35;
  };

  // SVG path draw-on.
  fx.draw = function (tl, path, t, { dur = 1.2, ease = "power2.inOut" } = {}) {
    const len = path.getTotalLength ? path.getTotalLength() : 1000;
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    tl.to(path, { strokeDashoffset: 0, duration: dur, ease }, t);
  };

  // Scene exit used when a scene wants to clear itself before the transition.
  fx.exit = function (tl, targets, t, { dur = 0.4 } = {}) {
    tl.to(targets, { opacity: 0, scale: 0.96, filter: "blur(8px)", duration: dur, ease: "power2.in" }, t);
  };

  // Layout position of el's centre relative to an ancestor, ignoring transforms (seek-safe,
  // unaffected by from-states GSAP has already applied).
  // Layout x of an element's centre in frame pixels (camera moves ignored), so the audio step can
  // pan its sound with it. undefined when it cannot be laid out.
  fx.screenX = function (el) {
    if (!el || !el.offsetParent) return undefined;
    const x = fx.layoutCenter(el, null).x;
    return Number.isFinite(x) ? Math.round(x) : undefined;
  };

  fx.layoutCenter = function (el, ancestor) {
    let x = el.offsetWidth / 2, y = el.offsetHeight / 2, n = el;
    while (n && n !== ancestor) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent;
    }
    return { x, y };
  };

  // Times of VO words that fall inside the scene, in order. Falls back to even spacing.
  fx.wordTimes = function (ctx, n, { lead = 0.05, from = 0.25, to = 0.6 } = {}) {
    const ws = ctx.words || [];
    if (ws.length >= n) return ws.slice(0, n).map((w) => w.start - lead);
    const span = Math.max(0.3, ctx.dur * to - from);
    return Array.from({ length: n }, (_, i) => ctx.start + from + (span * i) / Math.max(1, n - 1));
  };

  // Align on-screen tokens to the narrator: each token takes the onset of the next matching VO
  // word; unmatched tokens are interpolated between neighbours. Robust to excerpts/reordering.
  fx.alignTimes = function (ctx, tokens, { lead = 0.04 } = {}) {
    const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    const ws = ctx.words || [];
    const out = new Array(tokens.length).fill(null);
    let j = 0;
    tokens.forEach((tok, i) => {
      const t = norm(tok);
      for (let k = j; k < ws.length && t; k++) {
        if (norm(ws[k].word) === t) {
          out[i] = ws[k].start - lead;
          j = k + 1;
          break;
        }
      }
    });
    const fallback = fx.wordTimes({ ...ctx, words: [] }, tokens.length, { to: 0.75 });
    // nothing matched (no VO, or a line the narrator does not say): spread the tokens over the
    // shot instead of chaining 0.18 s steps off the first one, which flashes words unreadably
    if (out.every((v) => v == null)) out.splice(0, out.length, ...fallback);
    for (let i = 0; i < out.length; i++) {
      if (out[i] != null) continue;
      const prev = out.slice(0, i).reverse().find((v) => v != null);
      const nextIdx = out.findIndex((v, k) => k > i && v != null);
      if (prev != null && nextIdx > 0) out[i] = prev + ((out[nextIdx] - prev) * 1) / (nextIdx - i + 1);
      else if (prev != null) out[i] = prev + 0.18;
      else out[i] = fallback[i];
    }
    for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + 0.06);
    // Everything must land inside the shot: compress into [first, end - 0.9 s] if needed so
    // typed lines finish (with their tail) before the cut.
    if (ctx.end != null && out.length) {
      const deadline = Math.max(out[0] + 0.2, ctx.end - 0.9);
      const last = out[out.length - 1];
      if (last > deadline) {
        const a = out[0], k = (deadline - a) / Math.max(0.001, last - a);
        for (let i = 0; i < out.length; i++) out[i] = a + (out[i] - a) * k;
      }
    }
    return out;
  };

  // Find the VO time a given word (or phrase start) is spoken inside this scene.
  fx.timeOf = function (ctx, word, fallback) {
    if (!word) return fallback;
    const target = String(word).toLowerCase().split(/\s+/)[0].replace(/[^\p{L}\p{N}]/gu, "");
    const w = (ctx.words || []).find((x) => x.word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "") === target);
    return w ? w.start : fallback;
  };
})();

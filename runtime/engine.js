/* eden-motion runtime engine.
 * Reads window.STORYBOARD, builds every scene into one paused GSAP timeline and registers it
 * for HyperFrames. Time is authored in real seconds; window.EM_SLOW stretches the whole
 * timeline so the renderer can capture sub-frames for true shutter motion blur.
 */
(function () {
  const EM = (window.EM = window.EM || {});
  EM.scenes = EM.scenes || {};
  EM.transitions = EM.transitions || {};
  EM.scene = (name, def) => (EM.scenes[name] = def);
  EM.transition = (name, fn) => (EM.transitions[name] = fn);

  const $ = (sel, root = document) => root.querySelector(sel);

  EM.h = function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k === "html") el.innerHTML = v;
      else el.setAttribute(k, v);
    }
    for (const k of kids.flat()) {
      if (k == null || k === false) continue;
      el.appendChild(typeof k === "string" || typeof k === "number" ? document.createTextNode(String(k)) : k);
    }
    return el;
  };

  // Deterministic PRNG (mulberry32) so layouts are stable across seeks and renders.
  EM.rng = function (seed) {
    let a = typeof seed === "number" ? seed : [...String(seed)].reduce((s, c) => (s * 31 + c.charCodeAt(0)) | 0, 7);
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  EM.icon = function (name, size = 32, stroke) {
    const svg = (window.EM_ICONS || {})[name] || (window.EM_ICONS || {})["sparkles"] || "";
    const span = EM.h("span", { class: "em-icon", html: svg });
    span.style.width = span.style.height = size + "px";
    if (stroke) span.style.color = stroke;
    return span;
  };

  EM.asset = (p) => (p ? (p.startsWith("http") || p.startsWith("data:") ? p : p) : "");

  function words(sb, t0, t1) {
    return (sb.vo && sb.vo.words ? sb.vo.words : []).filter((w) => w.start >= t0 - 0.05 && w.start < t1);
  }

  // Synchronous on purpose: awaiting fonts/timers can stall in headless or hidden pages, and
  // HyperFrames waits for webfonts before capture anyway.
  EM.boot = function () {
    const sb = window.STORYBOARD;
    const SLOW = window.EM_SLOW || 1;
    const root = $("#root");
    const stage = $("#stage");
    document.documentElement.dataset.theme = sb.theme || "saas-light";

    const tl = gsap.timeline({ paused: true });
    const scenes = sb.scenes;

    // Background layer gets the whole duration.
    if (EM.backgrounds && EM.backgrounds[sb.background || "auto"]) {
      EM.backgrounds[sb.background || "auto"]($("#bg"), tl, sb);
    }

    scenes.forEach((s, i) => {
      const def = EM.scenes[s.type];
      // tone: "dark" | "light" gives the scene its own world (Burnwe alternates them);
      // omitted = transparent, the persistent film background shows through.
      const el = EM.h("section", { class: `em-scene em-${s.type}${s.tone ? " tone-" + s.tone : ""}`, id: `scene-${i}` });
      if (s.tone) {
        const sbg = EM.h("div", { class: "em-scene-bg" });
        el.appendChild(sbg);
        const r = EM.rng("sbg" + i);
        for (let k = 0; k < 2; k++) {
          const bloom = EM.h("div", { class: "em-scene-bloom", "data-layout-allow-overflow": "" });
          bloom.style.left = (k ? 70 + r() * 25 : r() * 25) + "%";
          bloom.style.top = (k ? r() * 30 : 60 + r() * 30) + "%";
          bloom.style.background = `radial-gradient(circle, var(--glow${k + 1}) 0%, transparent 62%)`;
          sbg.appendChild(bloom);
        }
      }
      const inner = EM.h("div", { class: "em-cam" });
      el.appendChild(inner);
      stage.appendChild(el);
      const start = s.start;
      const end = s.start + s.duration;
      const tIn = (s.transition && s.transition.duration) || 0;
      const next = scenes[i + 1];
      const tOut = next && next.transition ? next.transition.duration || 0 : 0;
      // Visibility only: opacity belongs to the transitions (autoAlpha here would override
      // their from-states and flash the incoming scene as a hard-edged box).
      gsap.set(el, { visibility: "hidden" });
      tl.set(el, { visibility: "visible" }, Math.max(0, start - tIn / 2));
      if (next) tl.set(el, { visibility: "hidden" }, end + tOut / 2);
      if (!def) {
        inner.appendChild(EM.h("div", { class: "em-missing" }, `Missing scene type: ${s.type}`));
        return;
      }
      const ctx = {
        el,
        cam: inner,
        props: s.props || {},
        start,
        end,
        dur: s.duration,
        index: i,
        tl,
        sb,
        brand: sb.brand || {},
        words: words(sb, start, end),
        rng: EM.rng(s.id || i + 1),
      };
      def.build(ctx);
      // The camera never stops (measured on Burnwe: 0.4-2%/s zoom, 15-60 px/s truck, linear,
      // direction alternating shot to shot). "push" = emphasis push at ~5%/s.
      if (s.camera !== "static" && !def.ownsCamera) {
        const D = s.duration + tIn / 2 + tOut / 2;
        const rate = s.camera === "push" ? 0.05 : 0.014;
        const pull = s.camera === "pull" || (s.camera == null && i % 2 === 1);
        const sc = [1, 1 + rate * D];
        const dir = i % 2 ? 1 : -1;
        tl.fromTo(inner, { scale: pull ? sc[1] : sc[0], x: -dir * 20 * D }, { scale: pull ? sc[0] : sc[1], x: dir * 20 * D, duration: D, ease: "none" }, Math.max(0, start - tIn / 2));
      }
    });

    // Transitions are applied after all scenes exist, pairing previous and next.
    scenes.forEach((s, i) => {
      if (i === 0) return;
      const type = (s.transition && s.transition.type) || "cut";
      // Hard cut into a different world: exposure ramp so it reads as a camera adjusting.
      if (type === "cut") {
        const prevTone = scenes[i - 1].tone, tone = s.tone;
        if (prevTone && tone && prevTone !== tone) {
          const flash = EM.h("div", { class: "em-exposure tone-" + prevTone });
          document.getElementById(`scene-${i}`).appendChild(flash);
          tl.fromTo(flash, { opacity: 0.4 }, { opacity: 0, duration: 0.44, ease: "power2.out" }, s.start);
        }
        return;
      }
      const fn = EM.transitions[type];
      if (!fn) return;
      const prev = document.getElementById(`scene-${i - 1}`);
      const next = document.getElementById(`scene-${i}`);
      const d = s.transition.duration || 0.6;
      fn({ tl, prev, next, at: s.start - d / 2, d, opts: s.transition, sb });
      (EM.cues = EM.cues || []).push({ t: s.start - d / 2, type: "whoosh", dur: d });
    });

    const total = sb.duration;
    tl.set({}, {}, total); // pin length

    let master = tl;
    if (SLOW !== 1) {
      master = gsap.timeline({ paused: true });
      master.to(tl, { time: total, duration: total * SLOW, ease: "none" }, 0);
    }
    // Sound cues (clicks, pops, whooshes) are exported into the DOM so the audio step can read
    // them with a headless --dump-dom and place SFX on the exact frames.
    const cues = (EM.cues || []).filter((c) => c.t >= 0 && c.t <= total).sort((a, b) => a.t - b.t);
    const cueEl = document.createElement("script");
    cueEl.type = "application/json";
    cueEl.id = "em-cues";
    cueEl.textContent = JSON.stringify(cues);
    document.body.appendChild(cueEl);
    window.EM_READY = true;
    return master;
  };
})();

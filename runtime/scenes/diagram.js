/* Diagram scenes: explainer diagrams built from the Burnwe technique catalog
 * (research/analysis/burnwe.md). Every copy string comes from props; defaults are placeholders.
 * Every item may carry `cue: "word"` to land exactly on that VO word, otherwise items are spread
 * over the VO words that fall inside the scene (even spacing when there is no VO).
 *
 * orbit (M29 orbit constellation + M28 glass orb)
 *   props: {
 *     items: [{ icon, label, cue? }]   5-9 satellites, pop onto the rings one by one
 *     title?: str, keyword?: str       caption typed at the top (M1 hot-tail)
 *     logo?: path                      centre token image (falls back to brand.mark / brand.logo)
 *     centerIcon?: lucide name         glyph inside the glass orb when there is no logo
 *     links?: bool (default true)      connector lines + data pulses from chips to the centre
 *     rings?: [r1, r2, r3]             ring radii in px (default 230, 340, 560), chips alternate right and left arcs
 *   }
 *
 * card-cloud (M14 3D card-cloud truck + M15 symbol condense), ownsCamera
 *   props: {
 *     items: [{ icon, label, meta?, kind?: "note"|"chip"|"window" }]   10-16 cards, 4 depth layers
 *     word?: str (default "?")         condenses at centre at ~60% of the scene
 *     cueWord?: str                    VO word that triggers the condense
 *     sub?: str                        small line under the word
 *     truck?: px/s (default 240)       sideways camera speed on the near layer
 *     fill?: bool (default true)       copy-free skeleton cards in the back layers for density
 *   }
 *
 * flow-line (M17 line-follow camera), ownsCamera
 *   props: {
 *     nodes: [{ icon, label, kicker?, cue? }]   3-5 nodes
 *     layout?: "zigzag" (default) | "line" | "steps"
 *     title?: str, keyword?: str
 *     spacing?: px (default 560)
 *     overview?: bool                  pull back to show the whole flow at the end (default n<=4)
 *   }
 *
 * feature-cards (focus-pull row + VO synced highlight)
 *   props: {
 *     cards: [{ icon, title, text, cue? }]   2-4 cards
 *     headline?: str, keyword?: str          typed above the row with fx.hotType
 *     index?: bool (default false)           small 01 / 02 / 03 numerals (template tell, use sparingly)
 *   }
 *
 * tasks (M30 status flip + M31 highlight sweep + M32 row lift, "AI doing the work")
 *   props: {
 *     rows: [{ title, meta?, icon?, from?: "Pending", to?: "Done", cue? }]   4-6 rows
 *     title?: str, kicker?: str
 *     agent?: str (default "AI Agent")     label on the agent puck / cursor tag
 *     agentStyle?: "puck" (default) | "cursor"
 *     columns?: [str, str]                 column headers (default ["Task", "Status"])
 *     doneLabel?: str (default "done")     word after the progress counter
 *   }
 */
(function () {
  const EM = window.EM;
  const { h, fx } = EM;

  // ---------------------------------------------------------------- local helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (u) => {
    u = clamp(u, 0, 1);
    return u * u * (3 - 2 * u);
  };
  const inOut2 = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

  // Visible window of the scene including transition overlaps.
  function win(ctx) {
    const list = (ctx.sb && ctx.sb.scenes) || [];
    const me = list[ctx.index] || {};
    const nx = list[ctx.index + 1];
    const tIn = (me.transition && me.transition.duration) || 0;
    const tOut = nx && nx.transition ? nx.transition.duration || 0 : 0;
    return { t0: Math.max(0, ctx.start - tIn / 2), t1: ctx.end + tOut / 2 };
  }

  // n beat times between fractions [from, to] of the scene. Priority per item: explicit `cue`
  // word, then the item's own label/title spoken in the VO (in order), then VO onsets spread over
  // the range, then even spacing. Keeps a minimum gap and stays inside the scene.
  const norm = (w) => String(w || "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  function beats(ctx, n, from, to, items, gap = 0.16) {
    const a = ctx.start + ctx.dur * from;
    const b = ctx.start + ctx.dur * to;
    const ws = (ctx.words || []).filter((w) => w.start >= a - 0.1 && w.start <= b + 0.1);
    let out;
    if (ws.length >= n) out = Array.from({ length: n }, (_, i) => ws[Math.round((i * (ws.length - 1)) / Math.max(1, n - 1))].start - 0.04);
    else out = Array.from({ length: n }, (_, i) => (n === 1 ? a : a + ((b - a) * i) / (n - 1)));
    const all = ctx.words || [];
    let j = 0;
    (items || []).forEach((it, i) => {
      if (!it) return;
      if (it.cue) return (out[i] = fx.timeOf(ctx, it.cue, out[i] + 0.04) - 0.04);
      const key = norm(String(it.label || it.title || "").split(/\s+/)[0]);
      if (!key) return;
      for (let k = j; k < all.length; k++) {
        if (norm(all[k].word) === key && all[k].start >= ctx.start) {
          out[i] = all[k].start - 0.04;
          j = k + 1;
          return;
        }
      }
    });
    for (let i = 1; i < n; i++) out[i] = Math.max(out[i], out[i - 1] + gap);
    return out.map((t) => Math.min(t, ctx.end - 0.35));
  }

  const col = (ctx, name, fb) => fx.cssVar(ctx.el, name) || fb;
  const centerEl = (el) => gsap.set(el, { xPercent: -50, yPercent: -50 });

  // Headline typed on VO with the hot tail (M1), centred at a fixed top offset.
  function typedTitle(ctx, parent, text, { top = 96, size = 60, keyword, to = 0.32 } = {}) {
    if (!text) return null;
    const el = h("div", { class: "dg-title", style: { top: top + "px", fontSize: size + "px" } });
    parent.appendChild(el);
    const toks = String(text).split(/\s+/).filter(Boolean);
    const vt = fx.alignTimes && (ctx.words || []).length ? fx.alignTimes(ctx, toks, { lead: 0.02 }) : fx.wordTimes(ctx, toks.length, { lead: 0.02, from: 0.12, to });
    fx.hotType(ctx.tl, el, text, vt[0], { wordTimes: vt, keyword });
    return el;
  }

  // Finite sine bob so heroes never sit dead still (no infinite repeats: seek-safe).
  function bob(tl, el, t0, t1, { amp = 6, period = 3 } = {}) {
    const half = period / 2;
    const n = Math.max(1, Math.floor((t1 - t0) / half));
    tl.fromTo(el, { y: 0 }, { y: -amp, duration: half, ease: "sine.inOut", yoyo: true, repeat: n - 1 }, t0);
  }

  function glassOrb(size, iconName) {
    const orb = h("div", { class: "dg-glass", style: { width: size + "px", height: size + "px" } });
    orb.appendChild(h("div", { class: "dg-glass-spec" }));
    if (iconName !== false) orb.appendChild(EM.icon(iconName || "sparkles", Math.round(size * 0.36)));
    return orb;
  }

  // White (or card coloured) puck holding the brand mark. fx.brandImg flips monochrome marks to
  // suit the tone; an explicit src (props.logo) is used as is.
  function logoPuck(ctx, size, src) {
    const puck = h("div", { class: "dg-puck", style: { width: size + "px", height: size + "px" } });
    const b = !src && fx.brandImg ? fx.brandImg(ctx, "mark", { height: Math.round(size * 0.46) }) : null;
    if (b) {
      b.img.style.maxWidth = size * 0.62 + "px";
      b.img.style.objectFit = "contain";
      puck.appendChild(b.wrap);
    } else {
      const s = src || (ctx.brand || {}).mark || (ctx.brand || {}).logo;
      puck.appendChild(h("img", { src: s, style: { maxWidth: size * 0.6 + "px", maxHeight: size * 0.46 + "px" } }));
    }
    return puck;
  }

  // ================================================================ 1. orbit
  const ORBIT_DEFAULT = [
    { icon: "mail", label: "Email" },
    { icon: "calendar", label: "Calendar" },
    { icon: "database", label: "CRM" },
    { icon: "message-square", label: "Chat" },
    { icon: "file-text", label: "Docs" },
    { icon: "chart-column", label: "Analytics" },
    { icon: "credit-card", label: "Billing" },
  ];

  EM.scene("orbit", {
    ownsCamera: true,
    build(ctx) {
      const p = ctx.props;
      const { tl, start } = ctx;
      const { t0, t1 } = win(ctx);
      const D = t1 - t0;
      const items = (p.items && p.items.length ? p.items : ORBIT_DEFAULT).slice(0, 9);
      const n = items.length;
      const brand = ctx.brand || {};
      const HOT = col(ctx, "--accent", "#5b5bf7");
      const BASE = col(ctx, "--fg", "#111217");

      const root = h("div", { class: "dg-abs dg-orbit" });
      const cam = h("div", { class: "dg-abs" });
      root.appendChild(cam);
      ctx.cam.appendChild(root);
      const CX = 960;
      const CY = p.title ? 616 : 540;
      cam.style.transformOrigin = `${CX}px ${CY + 90}px`; // pivot low: the push keeps top chips clear of the title and bottom labels in frame
      const anchor = h("div", { class: "dg-anchor", style: { left: CX + "px", top: CY + "px" } });
      cam.appendChild(anchor);

      const R = p.rings || [230, 340, 560];
      const CORE = 210;

      // soft brand halo behind everything
      const halo = h("div", { class: "dg-halo", "data-layout-allow-overflow": "" });
      anchor.appendChild(halo);

      // rings: two solid (stroke draw-on), the inner one dashed and rotating
      const ringEls = R.map((r, i) => {
        const s = 2 * r + 8;
        const dashed = i === 0;
        const wrap = h("div", {
          class: "dg-ring",
          "data-layout-allow-overflow": "",
          style: { width: s + "px", height: s + "px", left: -s / 2 + "px", top: -s / 2 + "px" },
          html: `<svg viewBox="${-s / 2} ${-s / 2} ${s} ${s}" width="${s}" height="${s}"><circle cx="0" cy="0" r="${r}" class="${dashed ? "dash" : ""}" transform="rotate(-90)"/></svg>`,
        });
        anchor.appendChild(wrap);
        return { wrap, circle: wrap.querySelector("circle"), dashed };
      });

      // one rotating layer per ring; satellites sit in layers 1 and 2
      const speeds = [-5, 4.6, 4];
      const layers = R.map(() => {
        const l = h("div", { class: "dg-anchor", style: { left: "0px", top: "0px" } });
        anchor.appendChild(l);
        return l;
      });

      // centre token
      const core = h("div", { class: "dg-anchor dg-core", style: { left: "0px", top: "0px" } });
      const token = p.logo || brand.mark || brand.logo ? logoPuck(ctx, CORE, p.logo) : glassOrb(CORE, p.centerIcon || "sparkles");
      token.style.left = -CORE / 2 + "px";
      token.style.top = -CORE / 2 + "px";
      const pulseA = h("div", { class: "dg-pulse", style: { width: CORE + "px", height: CORE + "px", left: -CORE / 2 + "px", top: -CORE / 2 + "px" } });
      const pulseB = pulseA.cloneNode();
      core.append(pulseA, pulseB, token);
      anchor.appendChild(core);

      // satellite placement for a 16:9 frame: chips alternate right / left arcs (+-46 deg around
      // the horizontal), steep angles sit on the middle ring, flat ones on the outer ring.
      const right = Math.ceil(n / 2);
      const left = n - right;
      const arc = (j, m, centre, skew) => (m === 1 ? centre + skew : centre - 46 + (92 * j) / (m - 1) + skew);
      const sats = items.map((it, i) => {
        const side = i % 2;
        const j = Math.floor(i / 2);
        const deg = side ? arc(left - 1 - j, left, 180, 10) : arc(j, right, 0, p.angleOffset || -6);
        const a = (deg * Math.PI) / 180;
        const s = Math.sin(a);
        const ri = Math.abs(s) < 0.45 ? 2 : 1;
        const r = R[ri];
        const x = r * Math.cos(a);
        const y = r * Math.sin(a);
        const holder = h("div", { class: "dg-anchor", style: { left: x + "px", top: y + "px" } });
        const chip = h("div", { class: "dg-sat-chip" });
        const ic = EM.icon(it.icon || "sparkles", 46);
        chip.appendChild(ic);
        const label = h("div", { class: "dg-sat-label" }, it.label || "");
        holder.append(chip, label);
        let link = null;
        if (p.links !== false) {
          const len = r - CORE / 2 - 52 - 22;
          const lw = h("div", { class: "dg-link", style: { transform: `rotate(${deg}deg)` } });
          const line = h("div", { class: "dg-link-line", style: { left: CORE / 2 + 12 + "px", width: len + "px" } });
          const dot = h("div", { class: "dg-link-dot", style: { left: CORE / 2 + 12 + "px" } });
          lw.append(line, dot);
          layers[ri].appendChild(lw);
          link = { line, dot, len };
        }
        layers[ri].appendChild(holder);
        return { it, holder, chip, ic, label, ri, link };
      });
      sats.forEach((s) => gsap.set(s.label, { xPercent: -50 }));

      // ---- timeline
      tl.fromTo(cam, { scale: 1, x: 7 * D }, { scale: 1 + 0.04 * D, x: -7 * D, duration: D, ease: "sine.inOut" }, t0);
      tl.fromTo(halo, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1.4, ease: "power2.out" }, start + 0.05);

      const tc = start + 0.12;
      tl.fromTo(token, { scale: 0.62, opacity: 0, filter: "blur(24px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.7, ease: "expo.out" }, tc);
      bob(tl, token, tc + 0.7, t1, { amp: 6, period: 3 });
      tl.fromTo(pulseA, { scale: 1, opacity: 0.55 }, { scale: 2.6, opacity: 0, duration: 1.5, ease: "power2.out" }, tc + 0.3);

      ringEls.forEach((rg, i) => {
        const at = start + 0.2 + i * 0.12;
        if (rg.dashed) tl.fromTo(rg.wrap, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.0, ease: "expo.out" }, at);
        else {
          tl.fromTo(rg.wrap, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" }, at);
          fx.draw(tl, rg.circle, at, { dur: 1.3, ease: "power3.inOut" });
        }
      });
      layers.forEach((l, i) => tl.fromTo(l, { rotation: 0 }, { rotation: speeds[i] * D, duration: D, ease: "none" }, t0));
      tl.fromTo(ringEls[0].wrap.querySelector("svg"), { rotation: 0 }, { rotation: speeds[0] * D, duration: D, ease: "none", transformOrigin: "50% 50%" }, t0);

      const times = beats(ctx, n, 0.16, 0.66, items, 0.14);
      sats.forEach((s, i) => {
        const t = times[i];
        // chips counter-rotate so icons and labels stay upright
        tl.fromTo(s.holder, { rotation: 0 }, { rotation: -speeds[s.ri] * D, duration: D, ease: "none" }, t0);
        fx.pop(tl, s.chip, t, { from: 0.4, dur: 0.4, stagger: 0 });
        // newest chip is born in the accent and cools to the base colour (Burnwe highlighter rule)
        tl.fromTo(s.ic, { color: HOT }, { color: BASE, duration: 0.7, ease: "power2.out" }, t + 0.35);
        fx.focusIn(tl, s.label, t + 0.08, { blur: 10, y: 10, scale: 1, dur: 0.4 });
        if (s.link) {
          tl.fromTo(s.link.line, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "expo.out" }, t + 0.1);
          // data pulses travelling inward to the hub, finite
          for (let k = 0, ts = t + 0.45 + (i % 3) * 0.2; ts + 0.8 < t1 && k < 3; k++, ts += 1.35) {
            tl.fromTo(s.link.dot, { x: s.link.len, opacity: 0 }, { x: 0, duration: 0.8, ease: "power1.in" }, ts);
            tl.to(s.link.dot, { opacity: 1, duration: 0.14, ease: "none" }, ts);
            tl.to(s.link.dot, { opacity: 0, duration: 0.16, ease: "none" }, ts + 0.64);
          }
        }
      });
      tl.fromTo(pulseB, { scale: 1, opacity: 0.5 }, { scale: 2.3, opacity: 0, duration: 1.4, ease: "power2.out" }, times[n - 1] + 0.25);

      typedTitle(ctx, root, p.title, { top: 92, size: 60, keyword: p.keyword });
    },
  });

  // ================================================================ 2. card-cloud
  const CLOUD_DEFAULT = [
    { icon: "mail", label: "37 unread emails", meta: "Inbox" },
    { icon: "file-text", label: "Q3_report_final_v4.pdf" },
    { icon: "message-square", label: "Where is the latest file?", meta: "#team-ops" },
    { icon: "database", label: "CRM export" },
    { icon: "calendar", label: "Sync moved again", meta: "Calendar" },
    { icon: "chart-column", label: "Dashboard" },
    { icon: "triangle-alert", label: "Invoice overdue", meta: "Billing" },
    { icon: "folder", label: "Shared drive" },
    { icon: "bell", label: "12 new notifications" },
    { icon: "users", label: "Who owns this?", meta: "Chat" },
    { icon: "search", label: "Can't find the doc" },
    { icon: "clock", label: "Deadline tomorrow", meta: "Project" },
    { icon: "credit-card", label: "Expenses" },
    { icon: "link", label: "Integrations" },
  ];

  function cloudCard(it, kind) {
    if (kind === "note") {
      return h(
        "div",
        { class: "dg-cc-card dg-cc-note" },
        h("div", { class: "dg-cc-badge" }, EM.icon(it.icon || "bell", 34)),
        h("div", { class: "dg-cc-txt" }, h("div", { class: "dg-cc-meta" }, it.meta || ""), h("div", { class: "dg-cc-label" }, it.label || ""))
      );
    }
    if (kind === "window") {
      return h(
        "div",
        { class: "dg-cc-card dg-cc-win" },
        h("div", { class: "dg-cc-winbar" }, h("i"), h("i"), h("i"), h("span", {}, it.label || "")),
        h(
          "div",
          { class: "dg-cc-winbody" },
          h("div", { class: "dg-cc-lines" }, h("b", { style: { width: "82%" } }), h("b", { style: { width: "64%" } }), h("b", { style: { width: "74%" } })),
          h("div", { class: "dg-cc-bars" }, ...[46, 72, 38, 88, 60].map((v) => h("b", { style: { height: v + "%" } })))
        )
      );
    }
    if (kind === "ghost") {
      // copy-free skeleton card: adds density in the far layers without repeating labels
      return h("div", { class: "dg-cc-card dg-cc-ghost" }, h("div", { class: "dg-cc-gav" }), h("div", { class: "dg-cc-glines" }, h("b", { style: { width: "78%" } }), h("b", { style: { width: "52%" } })));
    }
    return h("div", { class: "dg-cc-card dg-cc-chip" }, EM.icon(it.icon || "sparkles", 32), h("span", {}, it.label || ""));
  }
  const CARD_W = { note: 480, window: 400, chip: 330, ghost: 360 };
  const CARD_H = { note: 124, window: 260, chip: 78, ghost: 112 };

  EM.scene("card-cloud", {
    ownsCamera: true,
    build(ctx) {
      const p = ctx.props;
      const { tl, start, dur } = ctx;
      const { t0, t1 } = win(ctx);
      const D = t1 - t0;
      const items = (p.items && p.items.length ? p.items : CLOUD_DEFAULT).slice(0, 16);
      const rng = ctx.rng;
      const P = 1600;
      const ZS = [160, -320, -800, -1350];
      const TR = ((p.truck || 240) * D) / 2;
      const ZP = 60 * D; // push-in in z (about +5%/s at the near layer)

      const root = h("div", { class: "dg-abs dg-cc" });
      const persp = h("div", { class: "dg-abs dg-cc-persp" });
      const world = h("div", { class: "dg-cc-world" });
      persp.appendChild(world);
      root.appendChild(persp);
      ctx.cam.appendChild(root);

      // ambient dust at mixed depths (cheap, no blur)
      for (let i = 0; i < 36; i++) {
        const z = -200 - rng() * 1800;
        const k = (P - z) / P;
        const d = h("i", { class: "dg-cc-dust" });
        const sz = 2 + rng() * 3;
        Object.assign(d.style, { width: sz + "px", height: sz + "px", opacity: (0.18 + rng() * 0.3).toFixed(2), transform: `translate3d(${((rng() - 0.5) * 2 * (TR + 1100 * k)).toFixed(0)}px, ${((rng() - 0.5) * 1100 * k).toFixed(0)}px, ${z.toFixed(0)}px)` });
        world.appendChild(d);
      }

      // layout: round-robin into 4 depth layers (+ copy-free skeleton cards in the back layers).
      // Each card keeps its own x stratum (so the frame is never empty during the truck) and its
      // exact spot is chosen by best-candidate sampling: maximise the normalised screen-space gap
      // to every card already placed, measured at three moments of the truck (no messy overlaps).
      const perLayer = [[], [], [], []];
      items.forEach((it, i) => perLayer[i % 4].push(it));
      const ghosts = p.fill === false ? 0 : Math.max(3, 18 - items.length);
      for (let g = 0; g < ghosts; g++) {
        const L = [2, 3, 1][g % 3];
        perLayer[L].splice(Math.min(perLayer[L].length, 1 + 2 * Math.floor(g / 3)), 0, { ghost: true });
      }
      const proj = (c, u) => {
        const f = P / (P - (c.z + ZP * u));
        return { x: (c.x + TR - 2 * TR * u) * f, y: c.y * f, w: CARD_W[c.kind] * f, h: CARD_H[c.kind] * f };
      };
      const gapTo = (a, b) => {
        let m = 1e9;
        for (const u of [0.12, 0.5, 0.88]) {
          const A = proj(a, u);
          const B = proj(b, u);
          const dx = Math.abs(A.x - B.x) / ((A.w + B.w) / 2 + 36);
          const dy = Math.abs(A.y - B.y) / ((A.h + B.h) / 2 + 36);
          m = Math.min(m, Math.max(dx, dy));
        }
        return m;
      };
      const cards = [];
      let real = 0;
      perLayer.forEach((list, L) => {
        const z = ZS[L];
        const k = (P - z) / P;
        const range = TR + 960 * k * 0.86;
        const slotW = (2 * range) / Math.max(1, list.length);
        list.forEach((it, j) => {
          const kind = it.ghost ? "ghost" : it.kind || (it.meta ? "note" : real++ % 3 === 2 ? "window" : "chip");
          const cx = -range + slotW * (j + 0.5);
          let best = null;
          for (let c = 0; c < 16; c++) {
            const cand = { x: cx + (rng() - 0.5) * slotW * 0.8, y: (rng() * 2 - 1) * 0.74 * 540 * k, z, kind };
            let score = cards.reduce((m, o) => Math.min(m, gapTo(cand, o)), 9);
            if (score > (best ? best.score : -1)) best = { ...cand, score };
          }
          const { x, y } = best;
          const ry = clamp(-(x / range) * 14, -15, 15);
          const rx = (rng() - 0.5) * 6;
          const s = h("div", { class: "dg-cc-slot", style: { transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z}px) rotateY(${ry.toFixed(1)}deg) rotateX(${rx.toFixed(1)}deg)` } });
          const card = cloudCard(it, kind);
          card.setAttribute("data-layout-allow-overflow", "");
          s.appendChild(card);
          world.appendChild(s);
          centerEl(card);
          cards.push({ s, card, x, y, z, L, kind });
        });
      });

      // camera: truck sideways (world moves left) while pushing in
      tl.fromTo(world, { x: TR, z: 0, y: 20 }, { x: -TR, z: ZP, y: -20, duration: D, ease: "sine.inOut" }, t0);

      // arrival = when the card first enters frame (or staggered by screen x if visible at t0)
      const sx = (c, t) => {
        const u = clamp((t - t0) / D, 0, 1);
        const wx = TR - 2 * TR * u;
        const wz = ZP * u;
        const f = P / (P - (c.z + wz));
        return { x: (c.x + wx) * f, f };
      };
      const visibleAt = (c, t) => {
        const q = sx(c, t);
        return Math.abs(q.x) - (CARD_W[c.kind] / 2) * q.f < 960 - 30;
      };
      const restBlur = [0, 0, 1, 2.2];
      const restOp = [1, 1, 0.9, 0.72];
      // everything already in frame lands by start + 0.4 s (the cloud must read instantly),
      // nearest layers first so the frame is never empty
      const tA = Math.max(t0, start - 0.15);
      const early = cards.filter((c) => visibleAt(c, start + 0.1)).sort((a, b) => a.L - b.L || sx(a, start).x - sx(b, start).x);
      const st = early.length > 1 ? Math.min(0.06, (start + 0.2 - tA) / (early.length - 1)) : 0;
      early.forEach((c, i) => (c.at = tA + i * st));
      cards.forEach((c) => {
        if (c.at != null) return;
        for (let t = start; t < t1; t += 0.05) {
          if (visibleAt(c, t)) {
            c.at = Math.max(start + 0.1, t - 0.25);
            break;
          }
        }
      });
      cards.forEach((c) => {
        if (c.at == null) {
          gsap.set(c.card, { opacity: 0 });
          return;
        }
        tl.fromTo(
          c.card,
          { opacity: 0, scale: 1.08, filter: "blur(20px)" },
          { opacity: restOp[c.L] * (c.kind === "ghost" ? 0.75 : 1), scale: 1, filter: `blur(${restBlur[c.L]}px)`, duration: 0.42, ease: "power3.out" },
          c.at
        );
      });

      // the word condenses at centre while the cards sink behind a frosted dim
      const tw = fx.timeOf(ctx, p.cueWord, start + dur * 0.58);
      const dim = h("div", { class: "dg-abs dg-cc-dim", "data-layout-allow-overlap": "" });
      const glow = h("div", { class: "dg-cc-glow", "data-layout-allow-overflow": "", "data-layout-allow-overlap": "" });
      const word = String(p.word == null ? "?" : p.word);
      const fs = word.length <= 2 ? 440 : word.length <= 6 ? 250 : word.length <= 10 ? 180 : 130;
      const wEl = h("div", { class: "dg-cc-word", style: { fontSize: fs + "px" } }, h("span", {}, word));
      const stack = h("div", { class: "dg-cc-stack", "data-layout-allow-overlap": "" }, wEl);
      let subEl = null;
      if (p.sub) {
        subEl = h("div", { class: "dg-cc-sub" }, p.sub);
        stack.appendChild(subEl);
      }
      root.append(dim, glow, stack);
      centerEl(glow);
      tl.fromTo(dim, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power2.out" }, tw - 0.1);
      tl.fromTo(glow, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 1.0, ease: "power2.out" }, tw - 0.05);
      tl.fromTo(wEl, { opacity: 0, scale: 1.4, filter: "blur(30px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.8, ease: "power3.out" }, tw);
      tl.to(wEl, { scale: 1.05, duration: Math.max(0.3, t1 - tw - 0.8), ease: "sine.out" }, tw + 0.8);
      if (subEl) fx.focusIn(tl, subEl, tw + 0.45, { y: 14, blur: 12 });
    },
  });

  // ================================================================ 3. flow-line
  const FLOW_DEFAULT = [
    { icon: "inbox", label: "Request comes in", kicker: "Capture" },
    { icon: "brain", label: "AI sorts and drafts", kicker: "Understand" },
    { icon: "circle-check", label: "Team approves", kicker: "Review" },
    { icon: "rocket", label: "Shipped", kicker: "Deliver" },
  ];

  // Orthogonal elbow path through node centres, sampled into a polyline so length lookups are
  // exact and seek-safe (no getPointAtLength at render time).
  function elbowPolyline(pos, rc) {
    const pts = [[pos[0].x, pos[0].y]];
    const nodeIdx = [0];
    const arc = (cx, cy, r, a0, a1) => {
      const N = 10;
      for (let k = 1; k <= N; k++) {
        const a = ((a0 + ((a1 - a0) * k) / N) * Math.PI) / 180;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
    };
    for (let i = 1; i < pos.length; i++) {
      const a = pos[i - 1];
      const b = pos[i];
      if (Math.abs(a.y - b.y) > 1) {
        const xm = (a.x + b.x) / 2;
        const sy = Math.sign(b.y - a.y);
        const r = Math.min(rc, Math.abs(b.y - a.y) / 2, (b.x - a.x) / 4);
        pts.push([xm - r, a.y]);
        arc(xm - r, a.y + sy * r, r, -sy * 90, 0);
        pts.push([xm, b.y - sy * r]);
        arc(xm + r, b.y - sy * r, r, 180, 180 - sy * 90);
      }
      pts.push([b.x, b.y]);
      nodeIdx.push(pts.length - 1);
    }
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const at = (L) => {
      L = clamp(L, 0, cum[cum.length - 1]);
      let i = 1;
      while (i < cum.length - 1 && cum[i] < L) i++;
      const seg = cum[i] - cum[i - 1] || 1;
      const u = (L - cum[i - 1]) / seg;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u];
    };
    return { pts, cum, total: cum[cum.length - 1], nodeL: nodeIdx.map((k) => cum[k]), at };
  }

  EM.scene("flow-line", {
    ownsCamera: true,
    build(ctx) {
      const p = ctx.props;
      const { tl, start } = ctx;
      const { t0, t1 } = win(ctx);
      const nodes = (p.nodes && p.nodes.length ? p.nodes : FLOW_DEFAULT).slice(0, 5);
      const n = nodes.length;
      const S = p.spacing || 560;
      const layout = p.layout || "zigzag";
      const HOT = col(ctx, "--accent", "#5b5bf7");
      const BASE = col(ctx, "--fg", "#111217");
      const pos = nodes.map((_, i) => ({ x: i * S, y: layout === "line" ? 0 : layout === "steps" ? (i - (n - 1) / 2) * 190 : i % 2 ? 130 : -130 }));
      const path = elbowPolyline(pos, 30);
      const NR = 48;

      const root = h("div", { class: "dg-abs dg-fl" });
      const world = h("div", { class: "dg-fl-world" });
      root.appendChild(world);
      ctx.cam.appendChild(root);

      const pad = 80;
      const minX = Math.min(...pos.map((q) => q.x)) - pad;
      const minY = Math.min(...pos.map((q) => q.y)) - pad;
      const W = Math.max(...pos.map((q) => q.x)) - minX + pad;
      const H = Math.max(...pos.map((q) => q.y)) - minY + pad;
      const d = "M" + path.pts.map((q) => `${(q[0] - minX).toFixed(1)} ${(q[1] - minY).toFixed(1)}`).join(" L");
      const svgWrap = h("div", {
        class: "dg-fl-svg",
        style: { left: minX + "px", top: minY + "px", width: W + "px", height: H + "px" },
        html: `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><path class="dg-fl-base" d="${d}"/><path class="dg-fl-comet" d="${d}"/></svg>`,
      });
      world.appendChild(svgWrap);
      const basePath = svgWrap.querySelector(".dg-fl-base");
      const comet = svgWrap.querySelector(".dg-fl-comet");
      const C = 150;
      basePath.style.strokeDasharray = `${path.total} ${path.total}`;
      comet.style.strokeDasharray = `${C} ${path.total + C}`;
      const tip = h("div", { class: "dg-fl-tip" });
      world.appendChild(tip);

      const nodeEls = nodes.map((nd, i) => {
        const a = h("div", { class: "dg-anchor", style: { left: pos[i].x + "px", top: pos[i].y + "px" } });
        const circle = h("div", { class: "dg-fl-circle" });
        const ring = h("div", { class: "dg-fl-ring" });
        const pulse = h("div", { class: "dg-fl-pulse" });
        const ic = EM.icon(nd.icon || "sparkles", 44);
        circle.append(ic, ring);
        const label = h("div", { class: "dg-fl-label" }, nd.label || "");
        const kicker = nd.kicker ? h("div", { class: "dg-fl-kicker" }) : null;
        a.append(pulse, circle, label);
        if (kicker) a.appendChild(kicker);
        world.appendChild(a);
        gsap.set([label].concat(kicker ? [kicker] : []), { xPercent: -50 });
        return { a, circle, ring, pulse, ic, label, kicker, nd };
      });

      // schedule: node k focus-pulls at r[k]; the tip reaches its centre at r[k] + 0.2
      const overview = p.overview != null ? p.overview : n <= 4;
      const r = [start + 0.22].concat(beats(ctx, n - 1, 0.26, overview ? 0.55 : 0.8, nodes.slice(1), 0.55));
      const arrive = r.map((x) => x + 0.2);
      const depart = arrive.map((x, i) => (i === 0 ? r[0] + 0.4 : x + 0.04));
      const tipL = (T) => {
        if (T <= depart[0]) return 0;
        for (let k = 1; k < n; k++) {
          if (T < arrive[k]) {
            const u = clamp((T - depart[k - 1]) / Math.max(0.05, arrive[k] - depart[k - 1]), 0, 1);
            return path.nodeL[k - 1] + (path.nodeL[k] - path.nodeL[k - 1]) * inOut2(u);
          }
          if (T < depart[k] || k === n - 1) return path.nodeL[k];
        }
        return path.total;
      };

      // camera framing
      const title = !!p.title;
      const FX = 960;
      const FY = title ? 590 : 540;
      const lead = 150;
      const bw = W - 2 * pad + 420;
      const bh = H - 2 * pad + 300;
      const sO = clamp(Math.min(1700 / bw, (title ? 700 : 820) / bh), 0.62, 1);
      const oc = [(Math.min(...pos.map((q) => q.x)) + Math.max(...pos.map((q) => q.x))) / 2, (Math.min(...pos.map((q) => q.y)) + Math.max(...pos.map((q) => q.y))) / 2 + 20];
      const tO0 = arrive[n - 1] + 0.2;
      const tO1 = Math.min(t1 - 0.2, tO0 + 1.05);
      const doOverview = overview && tO1 - tO0 > 0.5;

      const nodeCentres = pos.map((q) => [q.x, q.y]);
      const update = (T) => {
        const L = tipL(T);
        basePath.style.strokeDashoffset = String(path.total - L);
        comet.style.strokeDashoffset = String(C - L);
        const tp = path.at(L);
        let dmin = 1e9;
        nodeCentres.forEach((c) => (dmin = Math.min(dmin, Math.hypot(c[0] - tp[0], c[1] - tp[1]))));
        tip.style.transform = `translate(${tp[0].toFixed(1)}px, ${tp[1].toFixed(1)}px)`;
        tip.style.opacity = String(clamp((dmin - NR - 4) / 26, 0, 1));
        // lagged follow (~6 frames) with a look-ahead in the travel direction
        const cp = path.at(tipL(T - 0.2));
        let tx = cp[0] + lead * clamp((T - start) / 0.6, 0, 1);
        let ty = cp[1];
        let s = 1.02 + 0.014 * (T - t0);
        if (doOverview) {
          const e = smooth((T - tO0) / (tO1 - tO0));
          tx += (oc[0] - tx) * e;
          ty += (oc[1] - ty) * e;
          s += (sO * (1 + 0.01 * Math.max(0, T - tO1)) - s) * e;
        }
        world.style.transform = `translate3d(${(FX - s * tx).toFixed(2)}px, ${(FY - s * ty).toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
      };
      update(t0);
      const drive = { v: 0 };
      tl.fromTo(drive, { v: 0 }, { v: 1, duration: t1 - t0, ease: "none", onUpdate: () => update(t0 + drive.v * (t1 - t0)) }, t0);

      // node events
      nodeEls.forEach((ne, k) => {
        const t = r[k];
        fx.focusIn(tl, ne.circle, t, { blur: 16, scale: 0.92, dur: 0.45 });
        fx.focusIn(tl, ne.label, t + 0.1, { blur: 12, y: 14, scale: 1, dur: 0.45 });
        if (ne.kicker) fx.hotType(tl, ne.kicker, ne.nd.kicker, t + 0.05, { cps: 24 });
        tl.fromTo(ne.ic, { color: BASE }, { color: HOT, duration: 0.3, ease: "power2.out" }, t + 0.1);
        tl.fromTo(ne.ring, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, arrive[k] - 0.05);
        tl.fromTo(ne.pulse, { scale: 1, opacity: 0.5 }, { scale: 1.9, opacity: 0, duration: 1.0, ease: "power2.out", immediateRender: false }, arrive[k]);
        gsap.set(ne.pulse, { opacity: 0 });
        tl.to(ne.circle, { scale: 1.06, duration: 0.18, ease: "power2.out" }, arrive[k] - 0.02);
        tl.to(ne.circle, { scale: 1, duration: 0.45, ease: "power3.out" }, arrive[k] + 0.16);
        // previous node cools once the line leaves it (only the newest stays hot)
        if (k < n - 1) {
          tl.to(ne.ic, { color: BASE, duration: 0.5, ease: "power2.out" }, arrive[k + 1] - 0.1);
          tl.to(ne.ring, { opacity: 0, duration: 0.5, ease: "power2.out" }, arrive[k + 1] - 0.1);
        }
      });

      typedTitle(ctx, root, p.title, { top: 90, size: 58, keyword: p.keyword });
    },
  });

  // ================================================================ 4. feature-cards
  const FEATURE_DEFAULT = [
    { icon: "zap", title: "Instant setup", text: "Connect your tools in minutes, no code required." },
    { icon: "brain", title: "Learns your flow", text: "AI picks up how your team works and takes the busywork." },
    { icon: "shield-check", title: "Secure by default", text: "Encrypted end to end, with access you control." },
  ];

  EM.scene("feature-cards", {
    build(ctx) {
      const p = ctx.props;
      const { tl, start } = ctx;
      const { t1 } = win(ctx);
      const cards = (p.cards && p.cards.length ? p.cards : FEATURE_DEFAULT).slice(0, 4);
      const n = cards.length;
      const white = "#ffffff";
      const HOT = col(ctx, "--accent", "#5b5bf7");
      const CW = n === 2 ? 600 : n === 4 ? 390 : 480;
      const GAP = n === 4 ? 34 : 44;
      const hasHead = !!p.headline;

      const root = h("div", { class: "dg-abs dg-fc" });
      const stage = h("div", { class: "dg-abs dg-fc-stage", style: { paddingTop: hasHead ? "150px" : "0px" } });
      const rig = h("div", { class: "dg-fc-rig", style: { gap: GAP + "px" } });
      stage.appendChild(rig);
      root.appendChild(stage);
      ctx.cam.appendChild(root);

      const els = cards.map((c, i) => {
        const outer = h("div", { class: "dg-fc-outer", style: { width: CW + "px" } });
        const inner = h("div", { class: "dg-fc-card" });
        const glowEl = h("div", { class: "dg-fc-glow" });
        const badge = h("div", { class: "dg-fc-badge" });
        const badgeOn = h("div", { class: "dg-fc-badge-on" });
        const ic = EM.icon(c.icon || "sparkles", 50);
        badge.append(badgeOn, ic);
        const top = h("div", { class: "dg-fc-top" }, badge, p.index === false ? null : h("div", { class: "dg-fc-idx" }, String(i + 1).padStart(2, "0")));
        const body = h("div", { class: "dg-fc-body" }, h("div", { class: "dg-fc-title" }, c.title || ""), c.text ? h("div", { class: "dg-fc-text" }, c.text) : null);
        inner.append(glowEl, top, body);
        outer.appendChild(inner);
        rig.appendChild(outer);
        const off = i - (n - 1) / 2;
        gsap.set(outer, { rotationY: -off * 7, z: -Math.abs(off) * 50 });
        return { outer, inner, glowEl, badgeOn, ic, off };
      });

      typedTitle(ctx, root, p.headline, { top: 118, size: 64, keyword: p.keyword, to: 0.3 });

      // arrival: from depth with a small tilt, content focus-pulls (M8)
      const ta = start + (hasHead ? 0.3 : 0.12);
      tl.fromTo(rig, { rotationY: 5, rotationX: 7 }, { rotationY: -4, rotationX: 3, duration: t1 - ta, ease: "sine.inOut" }, ta);
      els.forEach((e, i) => {
        const t = ta + i * 0.14;
        tl.fromTo(e.outer, { y: 90, z: -Math.abs(e.off) * 50 - 220 }, { y: 0, z: -Math.abs(e.off) * 50, duration: 0.9, ease: "expo.out" }, t);
        tl.fromTo(e.inner, { opacity: 0, scale: 1.06, filter: "blur(18px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.5, ease: "power3.out" }, t);
      });

      // highlight sequence synced to VO
      const hs = beats(ctx, n, hasHead ? 0.42 : 0.34, 0.84, cards, 0.45);
      hs.forEach((t, k) => {
        els.forEach((e, i) => {
          const baseZ = -Math.abs(e.off) * 50;
          if (i === k) {
            tl.to(e.outer, { opacity: 1, z: baseZ + 40, y: -14, duration: 0.5, ease: "power3.out" }, t);
            tl.to(e.glowEl, { opacity: 1, duration: 0.4, ease: "power2.out" }, t);
            tl.to(e.badgeOn, { opacity: 1, duration: 0.3, ease: "power2.out" }, t);
            tl.fromTo(e.ic, { color: HOT }, { color: white, duration: 0.3, ease: "power2.out" }, t);
          } else {
            tl.to(e.outer, { opacity: 0.55, z: baseZ, y: 0, duration: 0.5, ease: "power3.out" }, t);
            if (i === k - 1) {
              tl.to(e.glowEl, { opacity: 0, duration: 0.4, ease: "power2.out" }, t);
              tl.to(e.badgeOn, { opacity: 0, duration: 0.3, ease: "power2.out" }, t);
              tl.to(e.ic, { color: HOT, duration: 0.3, ease: "power2.out" }, t);
            }
          }
        });
      });
    },
  });

  // ================================================================ 5. tasks
  const TASKS_DEFAULT = [
    { title: "Reconcile March invoices", meta: "Finance · 42 items", icon: "file-text" },
    { title: "Update CRM contacts", meta: "Sales · 128 records", icon: "users" },
    { title: "Draft the weekly report", meta: "Ops · due today", icon: "chart-column" },
    { title: "Schedule onboarding calls", meta: "People · 6 invites", icon: "calendar" },
    { title: "Triage support inbox", meta: "Support · 31 tickets", icon: "inbox" },
  ];

  EM.scene("tasks", {
    build(ctx) {
      const p = ctx.props;
      const { tl, start } = ctx;
      const { t1 } = win(ctx);
      const rows = (p.rows && p.rows.length ? p.rows : TASKS_DEFAULT).slice(0, 6);
      const n = rows.length;
      const cols = p.columns || ["Task", "Status"];
      const ROWH = n >= 6 ? 96 : 106;

      const root = h("div", { class: "dg-abs dg-tk" });
      const persp = h("div", { class: "dg-abs dg-tk-persp" });
      const panel = h("div", { class: "dg-tk-panel em-card" });
      persp.appendChild(panel);
      root.appendChild(persp);
      ctx.cam.appendChild(root);

      // header
      const num = h("b", { class: "dg-tk-num" }, "0");
      const fill = h("div", { class: "dg-tk-fill" });
      const head = h(
        "div",
        { class: "dg-tk-head" },
        h("div", { class: "dg-tk-htext" }, p.kicker ? h("div", { class: "dg-tk-kicker" }, p.kicker) : null, h("div", { class: "dg-tk-title" }, p.title || "This week")),
        h("div", { class: "dg-tk-progress" }, h("div", { class: "dg-tk-count" }, num, h("span", {}, `/${n} ${p.doneLabel || "done"}`)), h("div", { class: "dg-tk-track" }, fill))
      );
      const colRow = h("div", { class: "dg-tk-cols" }, h("span", {}, cols[0] || ""), h("span", {}, cols[1] || ""));
      const list = h("div", { class: "dg-tk-list" });
      panel.append(head, colRow, list);

      const rowEls = rows.map((r, i) => {
        const slab = h("div", { class: "dg-tk-slab" });
        const sweep = h("div", { class: "dg-tk-sweep" });
        const av = h("div", { class: "dg-tk-av" }, r.icon ? EM.icon(r.icon, 28) : h("span", {}, String(r.title || "?").trim().charAt(0).toUpperCase()));
        const txt = h("div", { class: "dg-tk-txt" }, h("div", { class: "dg-tk-rt" }, r.title || ""), r.meta ? h("div", { class: "dg-tk-rm" }, r.meta) : null);
        const from = h("div", { class: "dg-tk-chip from", "data-layout-allow-overlap": "" }, EM.icon("clock", 24), h("span", {}, r.from || "Pending"));
        const to = h("div", { class: "dg-tk-chip to", "data-layout-allow-overlap": "" }, EM.icon("circle-check", 24), h("span", {}, r.to || "Done"));
        const status = h("div", { class: "dg-tk-status", "data-layout-allow-overlap": "" }, from, to);
        const content = h("div", { class: "dg-tk-content" }, av, txt, status);
        const row = h("div", { class: "dg-tk-row", style: { height: ROWH + "px" } }, slab, sweep, content);
        list.appendChild(row);
        return { row, slab, sweep, from, to, status, content };
      });

      // panel arrives tilted back (M18) and settles to a gentle 3D angle
      const ta = start + 0.08;
      tl.fromTo(panel, { rotationX: 30, rotationY: -10, y: 120, scale: 0.84, opacity: 0, filter: "blur(18px)" }, { rotationX: 7, rotationY: -5, y: 0, scale: 1, opacity: 1, filter: "blur(0px)", duration: 1.0, ease: "expo.out" }, ta);
      tl.to(panel, { rotationX: 3, rotationY: 3, duration: Math.max(0.5, t1 - ta - 1.0), ease: "sine.inOut" }, ta + 1.0);
      fx.focusIn(tl, head.children, ta + 0.3, { blur: 12, stagger: 0.1, scale: 1 });
      fx.focusIn(tl, rowEls.map((e) => e.content), ta + 0.45, { blur: 12, y: 16, stagger: 0.09, scale: 1 });

      // agent
      const agentStyle = p.agentStyle || "puck";
      const label = p.agent || "AI Agent";
      const panelW = 1240;
      const rowY = (i) => fx.layoutCenter(rowEls[i].row, panel).y; // layout coords, ignores transforms
      let agent;
      if (agentStyle === "cursor") {
        agent = fx.tagCursor(panel, label, { x: panelW - 60, y: rowY(0) + 180 });
      } else {
        agent = h("div", { class: "dg-tk-agent" }, h("div", { class: "dg-tk-orbwrap" }, glassOrb(72, "sparkles"), h("div", { class: "dg-tk-agent-ring" })), h("div", { class: "dg-tk-tag" }, label));
        panel.appendChild(agent);
        gsap.set(agent, { x: panelW + 40, y: rowY(0) + 150, opacity: 0 });
      }
      const agentRing = agent.querySelector(".dg-tk-agent-ring");

      const times = beats(ctx, n, 0.3, 0.86, rows, 0.32);
      const hopDur = (i) => Math.min(0.55, Math.max(0.28, (times[i] - (i ? times[i - 1] : times[0] - 0.8)) * 0.6));

      // entrance of the agent
      const tIn = times[0] - hopDur(0) - 0.25;
      if (agentStyle === "cursor") tl.to(agent, { opacity: 1, duration: 0.25 }, tIn);
      else tl.fromTo(agent, { opacity: 0, filter: "blur(14px)", scale: 1.1 }, { opacity: 1, filter: "blur(0px)", scale: 1, duration: 0.45, ease: "power3.out" }, tIn);

      rowEls.forEach((e, i) => {
        const t = times[i];
        const hd = hopDur(i);
        const ty = rowY(i);
        const tx = agentStyle === "cursor" ? panelW - 150 : panelW - 6;
        // arc: x swings outward mid-hop while y travels (two eases = curved path, M36)
        tl.to(agent, { y: agentStyle === "cursor" ? ty + 4 : ty, duration: hd, ease: "power2.inOut" }, t - hd);
        tl.to(agent, { x: tx + 34, duration: hd / 2, ease: "sine.out" }, t - hd);
        tl.to(agent, { x: tx, duration: hd / 2, ease: "sine.in" }, t - hd / 2);
        if (agentStyle === "cursor") fx.cursorClick(tl, agent, t + 0.02, { target: e.status });
        else if (agentRing) tl.fromTo(agentRing, { scale: 0.9, opacity: 0.8 }, { scale: 2.1, opacity: 0, duration: 0.7, ease: "power2.out", immediateRender: false }, t);

        // row lifts off the table (M32), highlight sweeps across (M31), status flips (M30)
        tl.to(e.row, { scale: 1.018, y: -3, duration: 0.3, ease: "power3.out" }, t);
        tl.fromTo(e.slab, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power3.out" }, t);
        tl.to(e.row, { scale: 1, y: 0, duration: 0.5, ease: "power3.inOut" }, t + 0.62);
        tl.to(e.slab, { opacity: 0, duration: 0.5, ease: "power3.inOut" }, t + 0.62);
        tl.fromTo(e.sweep, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.34, ease: "power2.out" }, t - 0.04);
        tl.to(e.sweep, { opacity: 0.28, duration: 0.5, ease: "power2.out" }, t + 0.5);
        tl.to(e.from, { opacity: 0, scale: 0.9, filter: "blur(6px)", duration: 0.2, ease: "power2.in" }, t + 0.1);
        tl.fromTo(e.to, { opacity: 0, scale: 0.9, filter: "blur(6px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.26, ease: "power3.out" }, t + 0.18);
        (EM.cues = EM.cues || []).push({ t: t + 0.18, type: "pop" });

      });

      // Counter, bar and number punch are written by ONE driver as a pure function of time, so
      // any seek order (renders, workers, scrubbing) gives the same frame.
      const flips = times.map((t) => t + 0.18);
      const out3 = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
      const writeProgress = (T) => {
        let k = 0;
        let bar = 0;
        let punch = 0;
        flips.forEach((tf, i) => {
          if (T >= tf) k = i + 1;
          bar += out3((T - tf) / 0.5);
          if (T >= tf) punch = Math.max(punch, 1 - out3((T - tf - 0.06) / 0.4));
        });
        num.textContent = String(k);
        num.style.transform = `scale(${(1 + 0.18 * (T >= flips[0] ? punch : 0)).toFixed(4)})`;
        fill.style.transform = `scaleX(${(bar / n).toFixed(4)})`;
      };
      writeProgress(ctx.start - 1);
      const drv = { v: 0 };
      const { t0: w0 } = win(ctx);
      tl.fromTo(drv, { v: 0 }, { v: 1, duration: t1 - w0, ease: "none", onUpdate: () => writeProgress(w0 + drv.v * (t1 - w0)) }, w0);
      const tOut = times[n - 1] + 0.7;
      if (tOut < t1 - 0.2) {
        if (agentStyle === "cursor") tl.to(agent, { opacity: 0, duration: 0.3 }, tOut);
        else tl.to(agent, { x: panelW + 70, y: rowY(n - 1) - 40, duration: 0.8, ease: "power2.inOut" }, tOut);
      }
    },
  });
})();

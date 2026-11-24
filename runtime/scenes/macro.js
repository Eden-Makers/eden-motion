/* Anti-slop 2D macro / UI / telemetry scenes (v0.6). Flat, razor sharp, borderless surfaces
 * (floor #0f0f0f / #141417, ceiling #fafafa, never #000 or #fff), no CSS 3D tilt. Everything that
 * changes inside a scene is a pure function of the timeline time through EM.drive (setter driver), so
 * seeks, scrubs and parallel workers agree frame for frame.
 *
 * macro-ui: a real UI screenshot (or a generated crisp UI element) filmed as a flat macro: focus-pull
 *   or Higgsfield whip-zoom choreography into a focal region, optional Framer selection frame and
 *   alignment guides, progressive backdrop blur behind the headline, micro-badges.
 *   props: { src?|screenshot?, srcSize?: [w,h] (build fills it), aspect?,
 *            ui?: { kind: "panel", title, tag?, rows: [{label, sub?, value?, on?, icon?}] }
 *               | { kind: "prompt", text, chips?: [str], send?: bool },
 *            focusRect?: [x,y,w,h] | [[x,y,w,h], ...]   (0..1 of the plane, default [.25,.3,.5,.3]),
 *            punch?: [x,y,w,h]                           (hard punch-in target, e.g. the CTA),
 *            move?: "push" | "whip" (default "whip" when punch is set, else "push"),
 *            hold?: 1.0, guides?: bool, dim?: bool, canvas?: bool,
 *            headline?, sub?, keyword?, badges?: [str | {text, icon?}], accent? }
 * terminal: CLI / MCP / agent terminal on a borderless #141417 surface. A command types with a real
 *   rhythm, then structured MCP tool calls and status lines stream in; optional side output card.
 *   props: { title?, prompt?: "❯", cmd, lines?: [{kind: "tool"|"ok"|"info"|"out"|"dim"|"err",
 *            text?, server?, tool?, args?: {k: v} | [[k, v]], ms?: seconds of "running", wait?: s,
 *            result?: "text after the spinner"}], rows?: max visible rows,
 *            preview?: { src?, title?, sub?, meta?: [str], at?: s }, accent? }
 * answer-stream: AI prompt pill and a live streaming answer with a caret, inline highlight chips and
 *   citation badges. Markup in `answer`: **bold**, [[chip]], {1} citation badge.
 *   props: { prompt, answer, model?, sources?: [{label, host?}], accent? }
 * micro-ticker: editorial macro shot with an optional technical grid and rapidly cycling telemetry chips.
 *   props: { headline?, media?: image|video path, items: [{label, values: [..]}], grid?: true,
 *            tint?: "mono"|"accent"|"none", rate?: 7.5 (changes per second), layout?: "bar"|"corners"|"rail",
 *            sub?, accent? }
 */
(function () {
  const { h, fx } = window.EM;
  const S = window.EM_SLOW || 1;

  // ---------------------------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------------------------
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const isDark = (ctx) => EM.luma(EM.cssColor(ctx.el, "--bg", [0.06, 0.06, 0.07])) < 0.5;
  const accentOf = (ctx, p) => p.accent || fx.cssVar(ctx.el, "--accent") || "#6d5cff";
  const SPIN = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  // human typing: per character delays with word and punctuation pauses (deterministic from rng)
  function typingTimes(text, rng, cps = 22) {
    const out = [];
    let t = 0;
    for (const c of text) {
      out.push(t);
      let d = (1 / cps) * (0.62 + 0.76 * rng());
      if (c === " ") d += 0.035;
      else if (",.:;/-=_".includes(c)) d += 0.05;
      if (rng() < 0.05) d += 0.16;
      t += d;
    }
    return { times: out, total: t };
  }
  function countAt(times, t) {
    let lo = 0, hi = times.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (times[m] <= t) lo = m + 1;
      else hi = m;
    }
    return lo;
  }
  // [...text] so emoji / glyphs count as one character
  const chars = (s) => [...String(s)];

  function surfaceClass(ctx) {
    return isDark(ctx) ? "mx-dark" : "mx-light";
  }

  // ---------------------------------------------------------------------------------------------
  // macro-ui
  // ---------------------------------------------------------------------------------------------
  function genPanel(ui, Wd, Hd) {
    const rows = (ui.rows || []).slice(0, 6);
    const el = h("div", { class: "mx-gen mx-panel", style: { width: Wd + "px", height: Hd + "px" } });
    el.appendChild(h("div", { class: "mxp-head" }, h("div", { class: "mxp-title" }, ui.title || ""), ui.tag ? h("div", { class: "mxp-tag" }, ui.tag) : null));
    const list = h("div", { class: "mxp-list" });
    rows.forEach((r) => {
      const right = r.value != null ? h("div", { class: "mxp-val" }, String(r.value)) : h("div", { class: "mxp-sw" + (r.on === false ? "" : " on") }, h("i"));
      list.appendChild(
        h("div", { class: "mxp-row" },
          h("div", { class: "mxp-ic" }, EM.icon(r.icon || "sparkles", 34)),
          h("div", { class: "mxp-txt" }, h("b", {}, r.label || ""), r.sub ? h("span", {}, r.sub) : null),
          right)
      );
    });
    el.appendChild(list);
    return el;
  }
  function genPrompt(ui, Wd, Hd) {
    const el = h("div", { class: "mx-gen mx-promptui", style: { width: Wd + "px", height: Hd + "px" } });
    const box = h("div", { class: "mxq-box" },
      h("div", { class: "mxq-text" }, ui.text || "", h("span", { class: "mxq-caret" })),
      h("div", { class: "mxq-foot" }, h("div", { class: "mxq-chips" }, ...(ui.chips || []).map((c) => h("div", { class: "mxq-chip" }, c))), ui.send === false ? null : h("div", { class: "mxq-send" }, EM.icon("arrow-right", 40))));
    el.appendChild(box);
    return el;
  }

  EM.scene("macro-ui", {
    ownsCamera: true,
    build(ctx) {
      const { tl, start, end, dur, props: p, cam } = ctx;
      const W = cam.offsetWidth || 1920, H = cam.offsetHeight || 1080;
      const src = p.src || p.screenshot;
      const size = p.srcSize || p.screenshotSize;
      const aspect = p.aspect || (size ? size[0] / size[1] : 16 / 9);
      const hasHead = !!(p.headline || p.sub);
      const Wd = Math.round(Math.min(W * 0.8, H * (hasHead ? 0.72 : 0.8) * aspect));
      const Hd = Math.round(Wd / aspect);
      const root = h("div", { class: `mx mx-ui ${surfaceClass(ctx)}` });
      root.style.setProperty("--mx-accent", accentOf(ctx, p));
      cam.appendChild(root);
      if (p.canvas) root.appendChild(h("div", { class: "mx-canvas" }));

      const arrive = h("div", { class: "mx-arrive" });
      const rig = h("div", { class: "mx-rig", style: { left: (W - Wd) / 2 + "px", top: (H - Hd) / 2 + (hasHead ? -H * 0.04 : 0) + "px", width: Wd + "px", height: Hd + "px" } });
      const plane = h("div", { class: "mx-plane", style: { width: Wd + "px", height: Hd + "px" } });
      rig.appendChild(plane);
      arrive.appendChild(rig);
      root.appendChild(arrive);
      if (src) plane.appendChild(h("img", { class: "mx-shot", src, style: { width: "100%", height: "100%" } }));
      else if (p.ui && p.ui.kind === "prompt") plane.appendChild(genPrompt(p.ui, Wd, Hd));
      else plane.appendChild(genPanel(p.ui || { title: p.headline || "Overview", rows: [] }, Wd, Hd));

      // ---- camera targets
      const rects = !p.focusRect ? [[0.25, 0.3, 0.5, 0.3]] : Array.isArray(p.focusRect[0]) ? p.focusRect : [p.focusRect];
      const yoff = hasHead ? -H * 0.05 : 0;
      const view = (r, { maxS = 6, fit = 0.72, fitY = hasHead ? 0.5 : 0.62 } = {}) => {
        const s = clamp(Math.min((W * fit) / (r[2] * Wd), (H * fitY) / (r[3] * Hd)), 1.15, maxS);
        return { scale: s, x: -((r[0] + r[2] / 2) - 0.5) * Wd * s, y: -((r[1] + r[3] / 2) - 0.5) * Hd * s + yoff * 0.4 };
      };
      const full = { scale: 1, x: 0, y: 0 };
      const mode = p.move || (p.punch ? "whip" : "push");
      const set = (o) => gsap.set(rig, Object.assign({ transformOrigin: "50% 50%" }, o));

      // ---- guides (Framer selection frame + alignment lines), clipped inside the plane
      let frame = null;
      const wantGuides = !!p.guides;
      const wantDim = p.dim != null ? p.dim : mode === "push";
      let hole = null;
      const box = (r) => ({ left: r[0] * Wd + "px", top: r[1] * Hd + "px", width: r[2] * Wd + "px", height: r[3] * Hd + "px" });
      if (wantDim) {
        hole = h("div", { class: "mx-hole" });
        Object.assign(hole.style, box(rects[0]));
        plane.appendChild(hole);
      }
      if (wantGuides) {
        frame = h("div", { class: "mx-frame" },
          h("i", { class: "mx-gl t" }), h("i", { class: "mx-gl b" }), h("i", { class: "mx-gl l" }), h("i", { class: "mx-gl r" }),
          h("i", { class: "mx-hd tl" }), h("i", { class: "mx-hd tr" }), h("i", { class: "mx-hd bl" }), h("i", { class: "mx-hd br" }),
          h("div", { class: "mx-dim", "data-em-decor": "" }, `${Math.round((size ? size[0] : Wd) * rects[0][2])} × ${Math.round((size ? size[1] : Hd) * rects[0][3])}`));
        Object.assign(frame.style, box(rects[0]));
        plane.appendChild(frame);
        gsap.set(frame, { opacity: 0 });
      }

      // ---- camera timeline
      const tArr = start + 0.04;
      fx.focusIn(tl, arrive, tArr, { dur: 0.5, blur: 18, scale: 1.04 });
      let tFocus = start + 0.5, tFocusEnd = start + 1.6, vFinal = full;
      if (mode === "whip") {
        const macro = view(rects[0], { maxS: 2.6 });
        const tw = start + (p.holdMacro != null ? p.holdMacro : 0.34);
        set(macro);
        const tNext = tw + 0.12;
        tl.fromTo(rig, { scale: macro.scale, x: macro.x, y: macro.y }, { scale: 1, x: 0, y: 0, duration: 0.12, ease: "expo.out", immediateRender: false }, tw);
        // horizontal-only blur on the peak frames of the whip (velocity gated)
        const fid = "mx-whip-" + ctx.index;
        const svgw = h("div", { class: "mx-svg", html: `<svg width="0" height="0" style="position:absolute"><filter id="${fid}" x="-8%" y="0" width="116%" height="100%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0 0"/></filter></svg>` });
        root.appendChild(svgw);
        const blurNode = svgw.querySelector("feGaussianBlur");
        EM.drive(tl, tw - 0.03, 0.2, (lt, pr) => {
          const dev = 30 * Math.pow(Math.sin(Math.PI * clamp((lt - 0.03) / 0.12)), 2);
          blurNode.setAttribute("stdDeviation", dev.toFixed(2) + " 0");
          rig.style.filter = dev > 0.6 ? `url(#${fid})` : "none";
        });
        const holdD = Math.max(0.4, Math.min(p.hold != null ? p.hold : 1.0, end - tNext - (p.punch ? 0.9 : 0.4)));
        const creep = 0.073;
        tl.fromTo(rig, { scale: 1, x: 0, y: 0 }, { scale: 1 + creep * holdD, duration: holdD, ease: "none", immediateRender: false }, tNext);
        const tPunch = tNext + holdD;
        if (p.punch) {
          const pv = view(p.punch, { maxS: 3.45, fit: 0.5, fitY: 0.45 });
          tl.fromTo(rig, { scale: 1 + creep * holdD, x: 0, y: 0 }, { scale: pv.scale, x: pv.x, y: pv.y, duration: 0.1, ease: "expo.out", immediateRender: false }, tPunch);
          const rest = Math.max(0.1, end - tPunch - 0.1);
          tl.fromTo(rig, { scale: pv.scale, x: pv.x, y: pv.y }, { scale: pv.scale * (1 + 0.035), x: pv.x * 1.035, y: pv.y * 1.035, duration: rest, ease: "sine.out", immediateRender: false }, tPunch + 0.1);
          if (p.press) {
            const pcx = (p.punch[0] + p.punch[2] / 2) * Wd, pcy = (p.punch[1] + p.punch[3] / 2) * Hd;
            const ring = h("div", { class: "mx-ring", style: { left: pcx + "px", top: pcy + "px" } });
            const flash = h("div", { class: "mx-press-flash", style: { left: pcx + "px", top: pcy + "px" } });
            plane.append(flash, ring);
            const tPress = tPunch + 0.12;
            gsap.set([ring, flash], { opacity: 0, scale: 0.6 });
            tl.fromTo(flash, { opacity: 0.85, scale: 0.5 }, { opacity: 0, scale: 2.2, duration: 0.22, ease: "expo.out", immediateRender: false }, tPress);
            tl.fromTo(ring, { opacity: 0.9, scale: 1 }, { opacity: 0, scale: 7.5, duration: 0.27, ease: "expo.out", immediateRender: false }, tPress);
            (EM.cues = EM.cues || []).push({ t: tPress, type: "click" });
          }
          vFinal = pv;
        } else {
          const rest = Math.max(0.1, end - tPunch);
          tl.fromTo(rig, { scale: 1 + creep * holdD, x: 0, y: 0 }, { scale: 1 + creep * (holdD + rest), duration: rest, ease: "none", immediateRender: false }, tPunch);
        }
        tFocus = tNext; tFocusEnd = tNext + 0.4;
        if (hole) tl.fromTo(hole, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out", immediateRender: false }, tNext + 0.2);
        if (frame) tl.fromTo(frame, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out", immediateRender: false }, tNext + 0.12);
        if (hole) gsap.set(hole, { opacity: 0 });
      } else {
        set(full);
        const n = rects.length;
        const t0 = start + 0.55;
        const step = Math.max(1.2, (dur - 0.55 - 0.45) / n);
        let prev = full;
        rects.forEach((r, i) => {
          const v = view(r);
          const T = t0 + i * step, D = Math.min(1.5, step * 0.78);
          tl.fromTo(rig, { scale: prev.scale, x: prev.x, y: prev.y }, { scale: v.scale, x: v.x, y: v.y, duration: D, ease: "power3.inOut", immediateRender: false }, T);
          if (frame && i > 0) tl.to(frame, Object.assign({ duration: D, ease: "power3.inOut" }, box(r)), T);
          if (hole && i > 0) tl.to(hole, Object.assign({ duration: D, ease: "power3.inOut" }, box(r)), T);
          if (i === 0) { tFocus = T; tFocusEnd = T + D; }
          prev = v;
        });
        const tEnd = t0 + (n - 1) * step + Math.min(1.5, step * 0.78);
        const rest = Math.max(0.1, end - tEnd);
        tl.fromTo(rig, { scale: prev.scale, x: prev.x, y: prev.y }, { scale: prev.scale * 1.04, x: prev.x * 1.04, y: prev.y * 1.04, duration: rest, ease: "sine.out", immediateRender: false }, tEnd);
        vFinal = prev;
        if (hole) { gsap.set(hole, { opacity: 0 }); tl.fromTo(hole, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power2.out", immediateRender: false }, tFocus + 0.2); }
        if (frame) tl.fromTo(frame, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out", immediateRender: false }, tFocus + 0.35);
      }

      // ---- headline over a progressive backdrop blur
      if (hasHead) {
        const scrim = h("div", { class: "mx-scrim", "data-layout-allow-overflow": "" });
        [1.5, 3, 6, 12, 24].forEach((px, i) => {
          const a = i * 12, b = 38 + i * 12;
          const l = h("i", { class: "mx-blur" });
          l.style.backdropFilter = l.style.webkitBackdropFilter = `blur(${px}px)`;
          const mask = `linear-gradient(to top, #000 ${a}%, transparent ${Math.min(100, b + 14)}%)`;
          l.style.maskImage = l.style.webkitMaskImage = mask;
          scrim.appendChild(l);
        });
        scrim.appendChild(h("i", { class: "mx-tint" }));
        root.appendChild(scrim);
        const head = h("div", { class: "mx-head" });
        const hl = h("div", { class: "mx-headline" });
        head.appendChild(hl);
        let words = [];
        if (p.headline) words = fx.splitWords(hl, p.headline, { keyword: p.keyword });
        if (p.sub) head.appendChild(h("div", { class: "mx-sub" }, p.sub));
        root.appendChild(head);
        const tH = mode === "whip" ? start + 0.62 : tFocus + 0.2;
        gsap.set(scrim, { opacity: 0 });
        tl.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out", immediateRender: false }, tH - 0.1);
        if (words.length) fx.riseIn(tl, words, tH, { y: 26, blur: 10, dur: 0.55, stagger: 0.07 });
        if (p.sub) fx.focusIn(tl, head.lastChild, tH + 0.35, { blur: 10, scale: 1.02, dur: 0.45 });
      }

      // ---- micro badges anchored above the focal box in its settled view
      const badges = (p.badges || []).slice(0, 3).map((b) => (typeof b === "string" ? { text: b } : b));
      if (badges.length) {
        const r = p.punch && mode === "whip" ? p.punch : rects[0];
        const v = mode === "whip" && !p.punch ? full : vFinal;
        const cx = W / 2 + v.x + ((r[0] + r[2] / 2) - 0.5) * Wd * v.scale, top = H / 2 + (hasHead ? -H * 0.04 : 0) + v.y + (r[1] - 0.5) * Hd * v.scale;
        const left = cx - (r[2] * Wd * v.scale) / 2;
        const row = h("div", { class: "mx-badges" });
        const els = badges.map((b) => h("div", { class: "mx-badge" }, h("i"), b.icon ? EM.icon(b.icon, 22) : null, b.text));
        row.append(...els);
        row.style.left = clamp(left, 60, W - 560) + "px";
        row.style.top = clamp(top - 74, 40, H - 120) + "px";
        root.appendChild(row);
        fx.focusIn(tl, els, (mode === "whip" ? tFocus + 0.15 : tFocusEnd - 0.1), { stagger: 0.14, blur: 8, scale: 1.04, dur: 0.4 });
      }
    },
  });

  // ---------------------------------------------------------------------------------------------
  // terminal
  // ---------------------------------------------------------------------------------------------
  EM.scene("terminal", {
    build(ctx) {
      const { tl, start, end, dur, props: p, cam, rng } = ctx;
      const W = cam.offsetWidth || 1920;
      const LH = 46;
      const prompt = p.prompt || "❯";
      const root = h("div", { class: `mx mx-term ${surfaceClass(ctx)}` });
      root.style.setProperty("--mx-accent", accentOf(ctx, p));
      const row = h("div", { class: "tm-row" });
      const term = h("div", { class: "tm" });
      const hasPv = !!(p.preview || p.side === "right");
      term.style.width = (hasPv ? Math.min(1060, W * 0.55) : Math.min(1400, W * 0.72)) + "px";
      if (p.title) term.appendChild(h("div", { class: "tm-title", "data-em-decor": "" }, p.title));
      const body = h("div", { class: "tm-body" });
      const scroll = h("div", { class: "tm-scroll" });
      body.appendChild(scroll);
      term.appendChild(body);

      // data model + schedule (relative seconds)
      const cmd = String(p.cmd || "");
      const typ = typingTimes(cmd, rng, p.cps || 21);
      let T = 0.55; // first keystroke
      const cmdAt = T;
      T += typ.total + 0.3; // enter
      const enterAt = T;
      T += 0.55;
      const lines = (p.lines || []).map((l) => {
        const kind = l.kind || "out";
        const args = l.args ? (Array.isArray(l.args) ? l.args : Object.entries(l.args)) : [];
        const run = l.ms != null ? l.ms : kind === "tool" ? 1.1 : 0;
        const o = { kind, l, args, at: T + (l.wait || 0), run, text: l.text || "", stream: kind === "out" || kind === "info" || kind === "dim" || kind === "ok" || kind === "err" ? Math.min(1.1, (l.text || "").length / 90) : 0 };
        T = o.at + (kind === "tool" ? 0.2 + args.length * 0.12 + run : 0.18 + o.stream) + (kind === "tool" ? 0.28 : 0.12);
        return o;
      });
      const pv = p.preview || (p.side === "right" ? {} : null);
      const firstTool = lines.find((o) => o.kind === "tool");
      let pvAt = pv ? (pv.at != null ? pv.at : firstTool ? firstTool.at + firstTool.run * 0.45 : T * 0.45) : 0;
      let pvDur = 1.25;
      // squeeze everything into the shot (never run past the cut)
      const budget = Math.max(2, dur - 0.55);
      const k = Math.min(1, (budget - 0.45) / Math.max(1, Math.max(T, pvAt + pvDur) - 0.45));
      if (k < 1) {
        const f = (x) => 0.45 + (x - 0.45) * k;
        typ.times = typ.times.map((x) => x * k);
        typ.total *= k;
        lines.forEach((o) => { o.at = f(o.at); o.run *= k; o.stream *= k; });
        pvAt = f(pvAt);
        pvDur *= Math.max(0.65, k);
        T = f(T);
      }
      const cmdAt2 = cmdAt;
      const enterAt2 = cmdAt2 + typ.total + 0.3 * Math.max(0.5, k);

      // rows
      const promptRow = h("div", { class: "tm-r tm-prompt" }, h("span", { class: "tm-pg" }, prompt), h("span", { class: "tm-cmd" }), h("span", { class: "tm-caret" }));
      scroll.appendChild(promptRow);
      const cmdEl = promptRow.querySelector(".tm-cmd"), caretEl = promptRow.querySelector(".tm-caret");
      const cmdChars = chars(cmd);
      const rowEls = [{ el: promptRow, at: cmdAt2, rows: 1 }];
      lines.forEach((o) => {
        const g = h("div", { class: "tm-ln tm-" + o.kind });
        if (o.kind === "tool") {
          const head = h("div", { class: "tm-r" }, h("span", { class: "tm-ic" }), h("span", { class: "tm-srv" }, o.l.server || "mcp"), h("span", { class: "tm-sep" }, "›"), h("span", { class: "tm-tool" }, o.l.tool || o.text || "tool"), h("span", { class: "tm-st" }));
          g.appendChild(head);
          o.head = head;
          o.argEls = o.args.map(([kk, vv], i) => {
            const isNum = typeof vv === "number" || /^[\d.,]+[a-z%x]*$/i.test(String(vv));
            const r = h("div", { class: "tm-r tm-arg" }, h("span", { class: "tm-elbow" }, i === 0 ? "⎿" : " "), h("span", { class: "tm-k" }, kk + ":"), h("span", { class: "tm-v" + (isNum ? " num" : "") }, typeof vv === "string" && !isNum ? `"${vv}"` : String(vv)));
            g.appendChild(r);
            return r;
          });
        } else {
          const glyph = o.kind === "ok" ? "✓" : o.kind === "err" ? "✕" : o.kind === "info" ? "i" : "";
          const r = h("div", { class: "tm-r" }, glyph ? h("span", { class: "tm-ic" }, glyph) : h("span", { class: "tm-ic none" }), h("span", { class: "tm-tx" }));
          g.appendChild(r);
          o.head = r;
          o.tx = r.querySelector(".tm-tx");
          o.chars = chars(o.text);
        }
        o.rowCount = 1 + (o.argEls ? o.argEls.length : 0);
        scroll.appendChild(g);
        rowEls.push({ el: g, at: o.at, rows: o.rowCount });
      });
      const totalRows = rowEls.reduce((a, r) => a + r.rows, 0);
      const maxRows = p.rows || Math.min(totalRows, 11);
      body.style.height = maxRows * LH + "px";
      scroll.style.setProperty("--lh", LH + "px");

      row.appendChild(term);
      // preview card
      let pvEl = null, pvImg = null, pvPct = null, pvBar = null;
      if (pv) {
        pvEl = h("div", { class: "tm-pv" });
        const media = h("div", { class: "tm-pv-media" });
        pvImg = pv.src ? h("img", { src: pv.src }) : h("div", { class: "tm-gen" });
        media.appendChild(pvImg);
        pvPct = h("div", { class: "tm-pv-pct", "data-em-decor": "" }, "0%");
        pvBar = h("i", { class: "tm-pv-bar" });
        media.append(pvPct, h("div", { class: "tm-pv-track" }, pvBar));
        pvEl.appendChild(media);
        const meta = h("div", { class: "tm-pv-meta" });
        if (pv.title) meta.appendChild(h("div", { class: "tm-pv-title" }, pv.title));
        if (pv.sub) meta.appendChild(h("div", { class: "tm-pv-sub" }, pv.sub));
        if (pv.meta && pv.meta.length) meta.appendChild(h("div", { class: "tm-pv-chips", "data-em-decor": "" }, ...pv.meta.slice(0, 4).map((m) => h("span", {}, m))));
        pvEl.appendChild(meta);
        row.appendChild(pvEl);
      }
      root.appendChild(row);
      cam.appendChild(root);

      // sound cues: key ticks while typing, enter, result pops
      (EM.cues = EM.cues || []).push({ t: start + cmdAt2, type: "type", dur: typ.total });
      EM.cues.push({ t: start + enterAt2, type: "key" });
      lines.forEach((o) => { if (o.kind === "ok") EM.cues.push({ t: start + o.at, type: "tick" }); });
      if (pv) EM.cues.push({ t: start + pvAt + 0.2, type: "shimmer" });

      const PVD = pvDur;
      const frame = (lt) => {
        // command typing
        const n = countAt(typ.times, lt - cmdAt2);
        cmdEl.textContent = cmdChars.slice(0, n).join("");
        const typing = lt >= cmdAt2 && lt < cmdAt2 + typ.total + 0.2;
        const idleOn = Math.floor(lt * 2.2) % 2 === 0;
        const afterEnter = lt >= enterAt2;
        caretEl.style.opacity = lt < cmdAt2 ? (idleOn ? 1 : 0) : typing ? 1 : afterEnter ? 0 : idleOn ? 1 : 0;
        promptRow.style.opacity = lt < cmdAt2 - 0.25 ? 0 : 1;
        // lines
        let revealed = 1;
        lines.forEach((o) => {
          const q = lt - o.at;
          const vis = clamp(q / 0.14);
          o.head.parentNode.style.opacity = vis;
          o.head.parentNode.style.transform = `translateY(${((1 - vis) * 8).toFixed(2)}px)`;
          revealed += o.rowCount * clamp(q / 0.25);
          if (o.kind === "tool") {
            const doneAt = o.at + 0.2 + o.args.length * 0.12 + o.run;
            const running = lt < doneAt;
            const ic = o.head.querySelector(".tm-ic"), st = o.head.querySelector(".tm-st");
            ic.textContent = running ? SPIN[Math.floor(Math.max(0, lt - o.at) * 12) % SPIN.length] : "●";
            ic.classList.toggle("run", running);
            st.textContent = running ? "" : o.l.result ? "  " + o.l.result : "  done";
            o.argEls.forEach((r, i) => {
              const a = clamp((lt - (o.at + 0.2 + i * 0.12)) / 0.14);
              r.style.opacity = a;
            });
          } else {
            const m = o.stream > 0 ? Math.round(o.chars.length * clamp(q / o.stream)) : o.chars.length;
            o.tx.textContent = o.chars.slice(0, m).join("");
          }
        });
        scroll.style.transform = `translateY(${(-Math.max(0, revealed - maxRows) * LH).toFixed(2)}px)`;
        if (pvEl) {
          const q = clamp((lt - pvAt) / PVD);
          const vis = clamp((lt - pvAt) / 0.4);
          pvEl.style.opacity = vis;
          pvEl.style.transform = `translateX(${((1 - ease(vis)) * 24).toFixed(2)}px)`;
          const e = easeOut(q);
          pvImg.style.filter = e < 0.995 ? `blur(${((1 - e) * 34).toFixed(2)}px) saturate(${(0.4 + 0.6 * e).toFixed(3)})` : "none";
          pvImg.style.transform = `scale(${(1.12 - 0.12 * e).toFixed(4)})`;
          pvPct.textContent = q >= 1 ? "Done" : Math.round(e * 100) + "%";
          pvBar.style.transform = `scaleX(${e.toFixed(4)})`;
          pvPct.classList.toggle("done", q >= 1);
        }
      };
      EM.drive(tl, start, dur, frame);
      fx.focusIn(tl, term, start + 0.05, { dur: 0.5, blur: 16, scale: 1.04, y: 24 });
    },
  });

  // ---------------------------------------------------------------------------------------------
  // answer-stream
  // ---------------------------------------------------------------------------------------------
  function parseMarkup(s) {
    const toks = [];
    const re = /(\*\*[^*]+\*\*|\[\[[^\]]+\]\]|\{\d+\})/g;
    String(s).split(re).forEach((part) => {
      if (!part) return;
      if (part.startsWith("**")) part.slice(2, -2).split(/(\s+)/).forEach((w) => w && toks.push({ k: "b", t: w }));
      else if (part.startsWith("[[")) toks.push({ k: "chip", t: part.slice(2, -2) });
      else if (part.startsWith("{")) toks.push({ k: "cite", t: part.slice(1, -1) });
      else part.split(/(\s+)/).forEach((w) => w && toks.push({ k: "w", t: w }));
    });
    return toks;
  }

  EM.scene("answer-stream", {
    build(ctx) {
      const { tl, start, dur, props: p, cam, rng } = ctx;
      const root = h("div", { class: `mx mx-ans ${surfaceClass(ctx)}` });
      root.style.setProperty("--mx-accent", accentOf(ctx, p));
      const col = h("div", { class: "as-col" });
      const pill = h("div", { class: "as-pill" }, h("span", { class: "as-spark" }, EM.icon("sparkles", 40)), h("span", { class: "as-ptx" }), h("span", { class: "as-pcaret" }), h("span", { class: "as-send" }, EM.icon("arrow-right", 36)));
      const ptx = pill.querySelector(".as-ptx"), pcaret = pill.querySelector(".as-pcaret"), send = pill.querySelector(".as-send");
      const head = h("div", { class: "as-head" }, h("i", { class: "as-av" }), h("span", {}, p.model || "Eden Gen"), h("span", { class: "as-meta" }, p.meta || ""));
      const ans = h("div", { class: "as-ans" });
      const toks = parseMarkup(p.answer || "");
      const els = toks.map((t) => {
        const el = t.k === "chip" ? h("span", { class: "as-chip" }, t.t) : t.k === "cite" ? h("span", { class: "as-cite" }, t.t) : h("span", { class: t.k === "b" ? "as-b" : "as-w" }, t.t);
        ans.appendChild(el);
        return el;
      });
      const caret = h("span", { class: "as-caret" });
      ans.appendChild(caret);
      const srcWrap = h("div", { class: "as-src" });
      const srcEls = (p.sources || []).slice(0, 4).map((s, i) => h("div", { class: "as-srcc" }, h("b", {}, String(i + 1)), h("span", {}, s.label || ""), s.host ? h("em", {}, s.host) : null));
      srcWrap.append(...srcEls);
      col.append(pill, head, ans, srcWrap);
      root.appendChild(col);
      cam.appendChild(root);

      // schedule
      const prompt = chars(p.prompt || "");
      const pt = typingTimes(prompt.join(""), rng, 28);
      const maxPromptDur = Math.max(0.45, Math.min(1.15, dur * 0.26));
      if (pt.total > maxPromptDur) {
        const pk = maxPromptDur / pt.total;
        pt.times = pt.times.map((x) => x * pk);
        pt.total = maxPromptDur;
      }
      const typeAt = 0.35;
      const budget = Math.max(2, dur - 0.45);
      const wordsN = toks.filter((t) => !/^\s+$/.test(t.t)).length;
      let tpw = 0.14;
      const startAns = typeAt + pt.total + 0.38;
      const srcAt = () => startAns + wordsN * tpw + 0.25;
      if (srcAt() + 0.65 > budget) tpw = Math.max(0.035, (budget - 0.65 - 0.25 - startAns) / Math.max(1, wordsN));
      let acc = startAns;
      const tokT = toks.map((t) => {
        const isSpace = /^\s+$/.test(t.t);
        if (isSpace) return acc;
        const at = acc;
        let d = tpw * (0.6 + 0.8 * rng());
        if (/[.,;:]$/.test(t.t)) d += tpw * 1.1;
        if (t.k === "chip") d += tpw * 0.9;
        acc += d;
        return at;
      });
      const doneAt = acc;
      const srcStart = doneAt + 0.25;
      EM.cues = EM.cues || [];
      EM.cues.push({ t: start + typeAt, type: "type", dur: pt.total });
      EM.cues.push({ t: start + typeAt + pt.total + 0.25, type: "send" });
      EM.cues.push({ t: start + startAns, type: "shimmer" });
      let lastIdx = -2;
      const frame = (lt) => {
        const n = countAt(pt.times, lt - typeAt);
        ptx.textContent = prompt.slice(0, n).join("");
        const typing = lt >= typeAt && lt < typeAt + pt.total + 0.2;
        pcaret.style.opacity = lt >= typeAt + pt.total + 0.25 ? 0 : typing ? 1 : Math.floor(lt * 2.2) % 2 === 0 ? 1 : 0;
        send.classList.toggle("on", lt >= typeAt + pt.total + 0.2);
        pill.classList.toggle("sent", lt >= typeAt + pt.total + 0.25);
        let last = -1;
        els.forEach((el, i) => {
          const q = clamp((lt - tokT[i]) / 0.18);
          el.style.opacity = q;
          if (q > 0) last = i;
        });
        if (last !== lastIdx) {
          lastIdx = last;
          if (last >= 0 && els[last].nextSibling !== caret) els[last].after(caret);
          else if (last < 0) ans.appendChild(caret);
        }
        const streaming = lt >= startAns - 0.1 && lt < doneAt + 1.4;
        caret.style.opacity = !streaming && lt < startAns - 0.1 ? 0 : lt < doneAt ? 1 : lt < doneAt + 1.4 ? (Math.floor((lt - doneAt) * 2.2) % 2 === 0 ? 1 : 0) : 0;
        head.style.opacity = clamp((lt - startAns + 0.3) / 0.3);
        srcEls.forEach((el, i) => {
          const q = clamp((lt - (srcStart + i * 0.14)) / 0.3);
          el.style.opacity = q;
          el.style.transform = `translateY(${((1 - easeOut(q)) * 14).toFixed(2)}px)`;
        });
      };
      EM.drive(tl, start, dur, frame);
      fx.focusIn(tl, [pill], start + 0.05, { dur: 0.5, blur: 14, scale: 1.04, y: 20 });
    },
  });

  // ---------------------------------------------------------------------------------------------
  // micro-ticker
  // ---------------------------------------------------------------------------------------------
  EM.scene("micro-ticker", {
    ownsCamera: true,
    build(ctx) {
      const { tl, start, end, dur, props: p, cam, rng } = ctx;
      const W = cam.offsetWidth || 1920, H = cam.offsetHeight || 1080;
      const tint = p.tint || "mono";
      const root = h("div", { class: `mx mx-tick tint-${tint} mx-dark` });
      root.style.setProperty("--mx-accent", accentOf(ctx, p));
      cam.appendChild(root);
      const stage = h("div", { class: "mt-stage" });
      root.appendChild(stage);

      // focal media (image / video) or a generated reticle
      const mediaSrc = p.media || p.src;
      let media = null;
      if (mediaSrc && /\.(mp4|mov|webm|m4v)$/i.test(mediaSrc)) {
        const t0 = Math.max(0, start - 0.3);
        media = EM.video({ id: `em-mt-v${ctx.index}`, src: mediaSrc, muted: "", playsinline: "", "data-start": (t0 * S).toFixed(3), "data-duration": ((end + 0.3 - t0) * S).toFixed(3), "data-media-start": String(p.mediaStart || 0), "data-playback-rate": (1 / S).toFixed(4) }, "mt-media");
      } else if (mediaSrc) media = h("img", { class: "mt-media", src: mediaSrc });
      else {
        media = h("div", { class: "mt-reticle" }, h("i", { class: "r1" }), h("i", { class: "r2" }), h("i", { class: "r3" }), h("i", { class: "cx" }), h("i", { class: "cy" }));
      }
      stage.appendChild(media);
      if (mediaSrc) stage.appendChild(h("div", { class: "mt-tint" }));
      stage.appendChild(h("div", { class: "mt-vig" }));
      tl.fromTo(stage, { scale: 1.0 }, { scale: 1.06, duration: dur + 0.3, ease: "sine.out", immediateRender: false }, start - 0.15);

      // technical grid + crosshairs (the grid layer overscans by one pitch and slides exactly one pitch,
      // so crosshairs stay on the intersections the whole time and the loop is seamless)
      let grid = null;
      if (p.grid !== false) {
        const pitch = 100;
        grid = h("div", { class: "mt-grid", "data-layout-allow-overflow": "" });
        for (let i = 0; i < 5; i++) {
          const gx = Math.round((0.12 + rng() * 0.76) * W / pitch) * pitch, gy = Math.round((0.14 + rng() * 0.7) * H / pitch) * pitch;
          const c = h("i", { class: "mt-x" });
          c.style.left = gx + pitch + "px";
          c.style.top = gy + pitch + "px";
          grid.appendChild(c);
        }
        root.appendChild(grid);
        ["tl", "tr", "bl", "br"].forEach((c) => root.appendChild(h("i", { class: "mt-br " + c })));
        tl.fromTo(grid, { x: 0, y: 0 }, { x: pitch, y: pitch, duration: dur + 0.3, ease: "none", immediateRender: false }, start - 0.15);
        fx.focusIn(tl, grid, start + 0.1, { dur: 0.5, blur: 0, scale: 1 });
      }

      // headline
      let words = [];
      if (p.headline) {
        const hd = h("div", { class: "mt-head" });
        words = fx.splitWords(hd, p.headline, { keyword: p.keyword });
        root.appendChild(hd);
        fx.riseIn(tl, words, start + 0.35, { y: 40, blur: 12, dur: 0.6, stagger: 0.07 });
      }
      if (p.sub) {
        const sb2 = h("div", { class: "mt-sub" }, p.sub);
        root.appendChild(sb2);
        fx.focusIn(tl, sb2, start + 0.8, { dur: 0.45, blur: 8, scale: 1.02 });
      }

      // telemetry chips (hard snap cycling, then each settles on its final value in the accent)
      const items = (p.items || []).slice(0, 6);
      const layout = p.layout || "bar";
      const bar = h("div", { class: "mt-bar mt-" + layout, "data-em-decor": "" });
      const chipEls = items.map((it) => {
        const lab = h("span", { class: "mt-l" }, it.label), val = h("span", { class: "mt-v" });
        val.style.minWidth = Math.max(...(it.values || [""]).map((v) => String(v).length), 2) + "ch";
        const c = h("div", { class: "mt-chip" }, lab, val);
        bar.appendChild(c);
        return { c, val, vals: (it.values || []).map(String) };
      });
      root.appendChild(bar);
      const rate = p.rate || 7.5;
      const settleBase = Math.max(0.9, dur * 0.5);
      const order = chipEls.map((ce) => {
        // deterministic shuffle of the non-final values
        const idx = ce.vals.slice(0, -1).map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
        return idx;
      });
      const phase = chipEls.map(() => rng() * 5);
      const coord = h("div", { class: "mt-coord", "data-em-decor": "" });
      root.appendChild(coord);
      const tickAt = chipEls.map((_, i) => 0.35 + i * 0.12);
      tickAt.forEach((t) => { (EM.cues = EM.cues || []).push({ t: start + t, type: "tick" }); });
      chipEls.forEach((_, i) => (EM.cues = EM.cues || []).push({ t: start + settleBase + i * 0.2, type: "pop" }));
      const frame = (lt) => {
        chipEls.forEach((ce, i) => {
          const sAt = settleBase + i * 0.2;
          const vis = clamp((lt - tickAt[i]) / 0.18);
          ce.c.style.opacity = vis;
          if (!ce.vals.length) return;
          if (lt >= sAt || ce.vals.length === 1) {
            ce.val.textContent = ce.vals[ce.vals.length - 1];
            ce.c.classList.add("on");
          } else {
            const o = order[i];
            const n = o.length || 1;
            const stepI = Math.floor(Math.max(0, lt - tickAt[i]) * rate + phase[i]);
            ce.val.textContent = o.length ? ce.vals[o[stepI % n]] : ce.vals[0];
            ce.c.classList.remove("on");
          }
        });
        const f = Math.floor(lt * 24);
        coord.textContent = `X ${String(412 + ((f * 7) % 90)).padStart(4, "0")}  Y ${String(218 + ((f * 13) % 140)).padStart(4, "0")}  F ${String(f).padStart(4, "0")}`;
      };
      EM.drive(tl, start, dur, frame);
      fx.focusIn(tl, bar, start + 0.15, { dur: 0.4, blur: 0, scale: 1 });
    },
  });
})();

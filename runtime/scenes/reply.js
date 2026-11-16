/* Launch-film type scenes, measured from a reverse of a SaaS launch film (Zaro, 2026).
 *
 * type-reply: a statement and its typed answer. Line 1 is already there in --fg, line 2 is typed in
 *   --muted with an accent caret at a human rhythm (0.045-0.11 s per char), the caret blinks a few
 *   times, the block eases to 0.97 into the cut.
 *   props: { line, reply, size?: px (default 150), dots?: true }
 * slot-line: one sentence with live slots. Words land hot and cool to their role colour, then the line
 *   opens and a card and/or a pill grow into the gaps and roll through examples every ~0.13 s.
 *   props: { text: "Apps {card} and {pill} agents", cards: [{title, sub?, color?}], pills: [{label, color?}], dots?: true }
 * word-swap: a left-anchored stem whose last word is typed, held, deleted and retyped.
 *   props: { stem: "Connect your", words: ["mess.", "files.", "tools."], size?: px (default 112) }
 * status-roll: an agent's working log. A new status line every ~0.08 s, newest dark, older grey,
 *   the list scrolls up. props: { lines: ["Reading sources...", ...] (6-14), side?: { title, items: [str] } }
 */
(function () {
  const { h, fx } = window.EM;

  // Hot word: lands in the accent, rises in, cools to its own colour.
  fx.hotWord = function (tl, el, t, { from, to, rise = 46, cool = 0.27 } = {}) {
    tl.fromTo(el, { opacity: 0, y: rise, color: from }, { opacity: 1, y: 0, duration: 0.42, ease: "expo.out", immediateRender: false }, t);
    gsap.set(el, { opacity: 0 });
    if (to) tl.to(el, { color: to, duration: 0.2, ease: "none" }, t + cool);
  };

  // Typing with a human rhythm: per-character gaps drawn from the scene rng, never a metronome.
  fx.humanType = function (tl, host, text, t, rng, { min = 0.045, max = 0.11, deadline } = {}) {
    const chars = [...String(text)];
    let gaps = chars.map(() => min + rng() * (max - min));
    const total = gaps.reduce((a, b) => a + b, 0);
    if (deadline != null && t + total > deadline) gaps = gaps.map((g) => (g * Math.max(0.2, deadline - t)) / total);
    let at = t;
    chars.forEach((c, i) => { const s = h("span", {}, c); host.appendChild(s); gsap.set(s, { display: "none" }); tl.set(s, { display: "inline" }, at); at += gaps[i]; });
    return at;
  };

  // A caret that blinks n times after typing, then goes.
  fx.blinkOut = function (tl, caret, t, { n = 3, period = 0.3 } = {}) {
    for (let i = 0; i < n; i++) { tl.set(caret, { opacity: 0 }, t + i * period + period / 2); if (i < n - 1) tl.set(caret, { opacity: 1 }, t + (i + 1) * period); }
  };

  // Accent band sweeping across a line of type (mask gradient on a coloured copy).
  fx.sweep = function (tl, el, t, { dur = 0.66, width = 280, color } = {}) {
    const c = el.cloneNode(true);
    c.removeAttribute("id");
    c.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    const col = color || fx.cssVar(el, "--accent") || "#bcacf4";
    Object.assign(c.style, { position: "absolute", left: "0", top: "0", margin: "0", pointerEvents: "none", color: col });
    c.querySelectorAll("*").forEach((n) => { n.style.color = col; n.style.opacity = 1; n.style.transform = "none"; n.style.filter = "none"; });
    c.style.setProperty("--sx", "-400px");
    c.style.webkitMaskImage = c.style.maskImage = `linear-gradient(90deg, transparent calc(var(--sx) - ${width}px), #000 var(--sx), transparent calc(var(--sx) + ${width}px))`;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.appendChild(c);
    const w = el.offsetWidth || 1600;
    tl.fromTo(c, { "--sx": `-${width}px` }, { "--sx": `${w + width}px`, duration: dur, ease: "none", immediateRender: false }, t);
    return c;
  };

  // Dot lattice ground: circles and rounded squares on a fixed pitch, clustered by smooth noise.
  fx.dotLattice = function (parent, rng, { pitch = 22, color = "rgba(255,255,255,0.09)", keep = 0.5, top = 0, bottom = 1080 } = {}) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "1920"); svg.setAttribute("height", "1080");
    Object.assign(svg.style, { position: "absolute", inset: "0", pointerEvents: "none" });
    svg.setAttribute("data-layout-ignore", "");
    let s = "";
    for (let y = top + pitch / 2; y < bottom; y += pitch) for (let x = pitch / 2; x < 1920; x += pitch) {
      const n = Math.sin(x * 0.011 + y * 0.004) * Math.cos(y * 0.013 - x * 0.006) + (rng() - 0.5) * 0.9;
      if (n < keep || rng() < 0.3) continue;
      const r = Math.min(8.5, 1.8 + (n - keep) * 13 * rng());
      s += rng() < 0.3 ? `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="2" fill="${color}"/>` : `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
    }
    svg.innerHTML = s;
    parent.appendChild(svg);
    return svg;
  };

  // stepped pixel corners for chips
  const STEP = "polygon(0 8px,4px 8px,4px 4px,8px 4px,8px 0,calc(100% - 8px) 0,calc(100% - 8px) 4px,calc(100% - 4px) 4px,calc(100% - 4px) 8px,100% 8px,100% calc(100% - 8px),calc(100% - 4px) calc(100% - 8px),calc(100% - 4px) calc(100% - 4px),calc(100% - 8px) calc(100% - 4px),calc(100% - 8px) 100%,8px 100%,8px calc(100% - 4px),4px calc(100% - 4px),4px calc(100% - 8px),0 calc(100% - 8px))";
  const roleColour = (w, fg, muted) => (/^(and|or|the|a|an|to|of|in|on|with|for|your|you|we|it|is|are|its)$/i.test(String(w).replace(/[^\p{L}]/gu, "")) ? muted : fg);

  EM.scene("type-reply", {
    build(ctx) {
      const p = ctx.props, { tl, start, end } = ctx;
      const fs = p.size || 150;
      const fg = fx.cssVar(ctx.cam, "--fg") || "#f8f6f3", muted = fx.cssVar(ctx.cam, "--muted") || "#a8a29c";
      if (p.dots) fx.dotLattice(ctx.cam, ctx.rng);
      const box = h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "-0.03em", fontSize: fs + "px", lineHeight: fs + "px", whiteSpace: "nowrap" } });
      const l1 = h("div", { style: { color: fg } }, p.line || "");
      const typed = h("span", {});
      const caret = h("span", { class: "em-caret", style: { background: "var(--accent)" } });
      const l2 = h("div", { style: { color: muted } }, typed, caret);
      box.appendChild(l1); box.appendChild(l2);
      ctx.cam.appendChild(box);
      const reply = String(p.reply || "");
      const first = reply.split(/\s+/)[0];
      const t0 = Math.max(start + 0.05, fx.timeOf ? fx.timeOf(ctx, first, start + 0.3) - 0.05 : start + 0.3);
      const done = fx.humanType(tl, typed, reply, t0, ctx.rng, { deadline: end - 0.9 });
      fx.blinkOut(tl, caret, done + 0.1, { n: 3 });
      tl.to(box, { scale: 0.97, duration: 0.4, ease: "power2.in" }, end - 0.4);
    },
  });

  EM.scene("slot-line", {
    build(ctx) {
      const p = ctx.props, { tl, start, end } = ctx;
      const fg = fx.cssVar(ctx.cam, "--fg") || "#faf9f7", muted = fx.cssVar(ctx.cam, "--muted") || "#a39c9b", accent = fx.cssVar(ctx.cam, "--accent") || "#bcacf4";
      if (p.dots) fx.dotLattice(ctx.cam, ctx.rng);
      const line = h("div", { style: { display: "flex", alignItems: "center", whiteSpace: "nowrap", fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "-0.02em", fontSize: (p.size || 122) + "px" } });
      ctx.cam.appendChild(line);
      const tokens = String(p.text || "").split(/(\{card\}|\{pill\})|\s+/).filter(Boolean);
      const words = [], slots = [];
      tokens.forEach((tok) => {
        if (tok === "{card}" || tok === "{pill}") { const s = h("span", { style: { position: "relative", display: "inline-block", width: "0px", height: "1px" } }); s._kind = tok.slice(1, -1); line.appendChild(s); slots.push(s); return; }
        const w = h("span", { class: "w", style: { display: "inline-block", marginLeft: words.length || slots.length ? "30px" : "0" } }, tok);
        w._final = roleColour(tok, fg, muted); line.appendChild(w); words.push(w);
      });
      // words land on the narrator; without VO they land fast, as in the reference (0.13-0.27 s apart)
      const times = ctx.words.length ? fx.alignTimes(ctx, words.map((w) => w.textContent), { lead: 0.03 }) : words.map((_, i) => start + 0.03 + i * 0.2);
      words.forEach((w, i) => fx.hotWord(tl, w, times[i], { from: accent, to: w._final }));
      const open = Math.min(end - 1.2, times[times.length - 1] + 0.25);
      const cards = p.cards || [], pills = p.pills || [];
      const n = Math.max(cards.length, pills.length, 1);
      const step = Math.min(0.2, Math.max(0.067, (end - 0.6 - open) / n));
      const pal = ["#d8d4cc", "#a8a08c", "#a8dcdc", "#f4b020", "#7cc880", "#a864b8", "#f05c1c", "#bcacf4"];
      slots.forEach((slot) => {
        const isCard = slot._kind === "card";
        const items = isCard ? cards : pills;
        if (!items.length) return;
        tl.to(slot, { width: isCard ? 233 : 239, duration: 0.33, ease: "expo.out" }, open);
        items.forEach((it, i) => {
          const col = it.color || pal[(i * 3) % pal.length];
          let el;
          if (isCard) {
            const glyph = h("div", { style: { width: "136px", height: "136px", borderRadius: "9px", background: col, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "20px", gap: "3px" } });
            for (let k = 0; k < 49; k++) glyph.appendChild(h("i", { style: { background: ctx.rng() < 0.38 ? "rgba(255,255,255,0.92)" : "transparent", borderRadius: "1px" } }));
            el = h("div", { style: { position: "absolute", left: "56px", top: "50%", marginTop: "-109px", width: "156px", height: "218px", background: "#fbfaf8", borderRadius: "14px", padding: "10px", whiteSpace: "normal" } }, glyph,
              h("div", { style: { font: "600 16px/1.2 var(--font-body)", color: "#2a2222", margin: "13px 0 0 6px", letterSpacing: "0" } }, it.title || it.label || ""),
              h("div", { style: { font: "500 15px/1.25 var(--font-body)", color: "#8b8484", marginLeft: "6px", letterSpacing: "0" } }, it.sub || ""));
          } else {
            el = h("div", { class: "em-slot-pill", style: { position: "absolute", left: "33px", top: "50%", marginTop: "-32px", height: "52px", padding: "0 18px", display: "flex", alignItems: "center", font: "500 21px var(--font-body)", color: "#1f1313", background: col, letterSpacing: "-0.01em", clipPath: STEP } }, it.label || it.title || String(it));
          }
          slot.appendChild(el);
          const t = open + 0.13 + i * step, tEnd = i < items.length - 1 ? open + 0.13 + (i + 1) * step : end + 0.1;
          const disp = isCard ? "block" : "flex";
          gsap.set(el, { display: "none" });
          tl.set(el, { display: disp }, t); tl.set(el, { display: "none" }, tEnd);
          if (i === 0) tl.fromTo(el, { scale: 0.45, transformOrigin: "0% 50%" }, { scale: 1, duration: 0.33, ease: "expo.out", immediateRender: false }, t);
        });
      });
      tl.fromTo(line, { scale: 1 }, { scale: 1.03, duration: Math.max(0.5, end - open), ease: "none" }, open);
    },
  });

  EM.scene("word-swap", {
    build(ctx) {
      const p = ctx.props, { tl, start, end } = ctx;
      const fs = p.size || 112;
      const words = (p.words || []).filter(Boolean);
      const longest = words.reduce((a, w) => (w.length > a.length ? w : a), "");
      // anchor: where the stem starts when the longest variant is centred
      const probe = h("div", { style: { position: "absolute", visibility: "hidden", whiteSpace: "nowrap", fontFamily: "var(--font-display)", fontWeight: 500, fontSize: fs + "px", letterSpacing: "-0.025em" } }, `${p.stem || ""} ${longest}`);
      ctx.cam.appendChild(probe);
      const left = Math.round(960 - probe.offsetWidth / 2);
      probe.remove();
      const line = h("div", { style: { position: "absolute", left: left + "px", top: "50%", transform: "translateY(-55%)", whiteSpace: "nowrap", fontFamily: "var(--font-display)", fontWeight: 500, fontSize: fs + "px", letterSpacing: "-0.025em", color: "var(--fg)" } });
      const stem = h("span", {}, (p.stem || "") + " ");
      const host = h("span", {});
      const caret = h("span", { class: "em-caret", style: { background: "var(--accent)" } });
      line.appendChild(stem); line.appendChild(host); line.appendChild(caret);
      ctx.cam.appendChild(line);
      const vt = fx.alignTimes(ctx, words, { lead: 0.05 });
      const span = (end - start) / Math.max(1, words.length);
      words.forEach((w, i) => {
        const t = Math.max(start + 0.1 + i * span, vt[i] || 0);
        const wh = h("span", {}); host.appendChild(wh);
        const done = fx.humanType(tl, wh, w, t, ctx.rng, { min: 0.05, max: 0.08 });
        if (i < words.length - 1) {
          const next = Math.max(start + 0.1 + (i + 1) * span, vt[i + 1] || 0);
          const del = Math.max(done + 0.35, next - 0.05 * w.length - 0.1);
          [...wh.children].reverse().forEach((c, k) => tl.set(c, { display: "none" }, del + k * 0.05));
        }
      });
      fx.blinkOut(tl, caret, end - 0.9, { n: 3 });
    },
  });

  EM.scene("status-roll", {
    build(ctx) {
      const p = ctx.props, { tl, start, end } = ctx;
      const lines = (p.lines || []).slice(0, 14);
      const wide = !p.side;
      const col = h("div", { style: { position: "absolute", left: "0", top: "0", width: wide ? "1920px" : "960px", height: "1080px", overflow: "hidden" } });
      const list = h("div", { style: { position: "absolute", left: "0", top: "360px", width: "100%" } });
      col.appendChild(list); ctx.cam.appendChild(col);
      const t0 = start + 0.1, step = Math.min(0.12, Math.max(0.07, (end - start - 0.8) / Math.max(1, lines.length)));
      const dark = fx.cssVar(ctx.cam, "--fg") || "#6f6b66", soft = fx.cssVar(ctx.cam, "--muted") || "#cdc9c2";
      lines.forEach((t, i) => {
        const d = h("div", { style: { position: "absolute", left: "0", top: i * 92 + "px", width: "100%", textAlign: "center", font: "500 80px/92px var(--font-display)", letterSpacing: "-0.03em", whiteSpace: "nowrap", color: dark } }, t);
        list.appendChild(d);
        gsap.set(d, { opacity: 0 });
        tl.set(d, { opacity: 1 }, t0 + i * step);
        tl.to(d, { color: soft, duration: 0.12 }, t0 + (i + 1) * step);
      });
      tl.fromTo(list, { y: 0 }, { y: -Math.max(0, lines.length * 92 - 600), duration: Math.max(0.5, lines.length * step + 0.3), ease: "none" }, t0);
      if (p.side) {
        const panel = h("div", { style: { position: "absolute", left: "960px", top: "0", width: "960px", height: "1080px", background: "color-mix(in srgb, var(--fg) 18%, var(--bg))" } });
        const card = h("div", { class: "em-card", style: { position: "absolute", left: "100px", top: "80px", width: "900px", height: "1100px", borderRadius: "20px", background: "var(--card)", color: "var(--card-fg)", padding: "40px" } },
          h("div", { style: { font: "600 28px var(--font-body)", marginBottom: "30px" } }, p.side.title || ""),
          ...(p.side.items || []).slice(0, 6).map((it) => h("div", { style: { border: "2px solid color-mix(in srgb, var(--card-fg) 8%, transparent)", borderRadius: "12px", padding: "18px 22px", marginBottom: "16px", font: "400 24px var(--font-body)", width: "820px" } }, it)));
        panel.appendChild(card); ctx.cam.appendChild(panel);
        tl.fromTo(card, { y: 40 }, { y: 0, duration: 0.6, ease: "expo.out", immediateRender: false }, start);
      }
    },
  });
})();

/* Typography scenes.
 * kinetic-type: one statement, words land on the narrator's timing.
 *   props: { text, keyword?, size: xl|lg|md|sm, mode: rise|mask|type|stack|single, sub?, align? }
 *   mode "single" = Lovable style: one giant word at a time, swapped on VO beats.
 *   mode "stack"  = lines stack vertically, each line masks up.
 */
(function () {
  const { h, fx } = window.EM;

  EM.scene("kinetic-type", {
    build(ctx) {
      const p = ctx.props;
      const { tl, start, end } = ctx;
      const mode = p.mode || "rise";
      const size = p.size || (mode === "single" ? "xl" : "lg");
      const wrap = h("div", { class: "em-kt", style: { width: "1600px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "28px" } });
      ctx.cam.appendChild(wrap);

      if (mode === "single") {
        const list = (p.words || String(p.text).split(/\s+/)).filter(Boolean);
        const times = fx.alignTimes(ctx, list, { lead: 0.04 });
        const holder = h("div", { style: { position: "relative", width: "1800px", height: "300px" } });
        wrap.appendChild(holder);
        list.forEach((w, i) => {
          const isKw = p.keyword && w.toLowerCase().includes(String(p.keyword).toLowerCase());
          const el = h("div", { class: `em-display ${size}${isKw ? " em-kw" : ""}`, style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" } }, h("span", { class: "em-word-in" }, w));
          holder.appendChild(el);
          const t = times[i];
          const tNext = i < list.length - 1 ? times[i + 1] : end + 0.2;
          // T19 word-swap slot: the new word replaces the old on the same frame (no crossfade,
          // overlapping words read as mush), with a short scale + focus settle.
          gsap.set(el, { opacity: 0 });
          tl.set(el, { opacity: 1 }, t);
          tl.fromTo(el, { scale: 1.1, filter: "blur(10px)" }, { scale: 1, filter: "blur(0px)", duration: 0.28, ease: "expo.out", immediateRender: false }, t);
          if (i < list.length - 1) tl.set(el, { opacity: 0 }, tNext);
        });
        return;
      }

      if (mode === "type") {
        const line = h("div", { class: `em-display ${size}` });
        wrap.appendChild(line);
        const t0 = ctx.words[0] ? ctx.words[0].start : start + 0.2;
        const lastWord = ctx.words[ctx.words.length - 1];
        const d = Math.min(Math.max(0.6, (lastWord ? lastWord.end : start + 1.5) - t0), ctx.dur - 0.6);
        fx.typeText(tl, line, p.text, t0, { dur: d });
        if (p.sub) {
          const sub = h("div", { class: "em-sub" }, p.sub);
          wrap.appendChild(sub);
          fx.riseIn(tl, sub, t0 + d + 0.1, { y: 20 });
        }
        return;
      }

      if (mode === "stack") {
        const lines = p.lines || [p.text];
        const els = lines.map((ln) => {
          const d = h("div", { class: `em-display ${size}` });
          const ws = fx.splitWords(d, ln, { keyword: p.keyword });
          wrap.appendChild(d);
          return ws;
        });
        const times = fx.alignTimes(ctx, lines.map((ln) => String(ln).split(/\s+/)[0]), { lead: 0.1 });
        els.forEach((ws, i) => fx.maskUp(tl, ws, times[i], { stagger: 0.05 }));
        return;
      }

      // rise / mask: words appear as they are spoken
      const line = h("div", { class: `em-display ${size}`, style: { maxWidth: "1600px" } });
      wrap.appendChild(line);
      const ws = fx.splitWords(line, p.text, { keyword: p.keyword });
      const times = fx.alignTimes(ctx, ws.map((w) => w.textContent), { lead: 0.06 });
      if (mode === "mask") {
        ws.forEach((w, i) => fx.maskUp(tl, w, times[i], { dur: 0.7 }));
      } else {
        fx.riseInAt(tl, ws, times);
      }
      if (p.sub) {
        const sub = h("div", { class: "em-sub" }, p.sub);
        wrap.appendChild(sub);
        fx.riseIn(tl, sub, times[times.length - 1] + 0.25, { y: 20 });
      }
      // keyword gets a small punch when it lands
      ws.forEach((w, i) => {
        if (w.classList.contains("em-kw")) tl.fromTo(w, { scale: 1 }, { scale: 1.06, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" }, times[i] + 0.3);
      });
    },
  });

  /* headline: Burnwe signature. Hot-tail typewriter synced to VO words (M1) on one centred line
   * that re-centres and scales down as it grows so it never exceeds ~60% of frame width (M2).
   * props: { text, keyword?, size?: px (default 124), maxWidth?: px (default 1150), sub? } */
  EM.scene("headline", {
    build(ctx) {
      const p = ctx.props;
      const { tl, start } = ctx;
      const fs = p.size || 124;
      const maxW = p.maxWidth || 1150;
      const line = h("div", { class: "em-display", style: { fontSize: fs + "px", whiteSpace: "nowrap", fontWeight: 600, letterSpacing: "-0.03em" } });
      const box = h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "30px" } }, line);
      ctx.cam.appendChild(box);
      const words = String(p.text).split(/\s+/).filter(Boolean);
      const vt = fx.alignTimes(ctx, words, { lead: 0.02 });
      const end = fx.hotType(tl, line, p.text, vt[0], { wordTimes: vt, keyword: p.keyword });
      // measure cumulative widths from real layout (all chars exist, just transparent)
      const wEls = [...line.querySelectorAll(".em-word")];
      const x0 = wEls[0].offsetLeft;
      const Wf = line.offsetWidth;
      // Too long for one readable line (would shrink below ~60%): wrap into a centred block
      // at a fixed size instead of the fit-to-width zoom.
      if (maxW / Wf < 0.6) {
        Object.assign(line.style, { whiteSpace: "normal", width: "1500px", fontSize: Math.round(fs * 0.72) + "px", lineHeight: "1.08" });
        tl.fromTo(line, { scale: 1.04 }, { scale: 1, duration: ctx.dur, ease: "none" }, start);
      } else wEls.forEach((w, i) => {
        const Wi = w.offsetLeft + w.offsetWidth - x0;
        const s = Math.min(1, maxW / Wi);
        const x = (s * (Wf - Wi)) / 2;
        if (i === 0) gsap.set(line, { x, scale: s });
        else tl.to(line, { x, scale: s, duration: 0.5, ease: "power3.inOut" }, vt[i]);
      });
      if (p.sub) {
        const sub = h("div", { class: "em-sub" }, p.sub);
        box.appendChild(sub);
        fx.focusIn(tl, sub, end + 0.1, { y: 14 });
      }
    },
  });

  /* stat-hit: huge number counts up, label rises, optional sparkline draws underneath.
   * props: { value, prefix?, suffix?, decimals?, label, compare?: {label, value}, line?: true } */
  EM.scene("stat-hit", {
    build(ctx) {
      const p = ctx.props;
      const { tl, start } = ctx;
      const wrap = h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", position: "relative" } });
      const num = h("div", { class: "em-display xl", style: { fontVariantNumeric: "tabular-nums" } });
      const label = h("div", { class: "em-sub", style: { fontSize: "42px", color: "var(--fg)", fontWeight: 600 } }, p.label || "");
      wrap.append(num, label);
      ctx.cam.appendChild(wrap);
      const t0 = fx.timeOf(ctx, p.cueWord, start + 0.25);
      tl.fromTo(num, { opacity: 0, y: 60, filter: "blur(20px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "expo.out" }, t0);
      fx.countUp(tl, num, Number(p.value) || 0, t0, { from: Number(p.from) || 0, prefix: p.prefix || "", suffix: p.suffix || "", decimals: p.decimals || 0, dur: Math.max(1.4, ctx.dur - 0.9), ease: "power1.out" });
      fx.riseIn(tl, label, t0 + 0.35, { y: 24 });
      if (p.line !== false) {
        const svg = h("div", {
          html: `<svg width="1400" height="260" viewBox="0 0 1400 260" style="overflow:visible"><defs><linearGradient id="sg${ctx.index}" x1="0" x2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity="0.2"/><stop offset="1" stop-color="var(--accent2)"/></linearGradient></defs><path d="M0 230 C 250 225, 380 200, 560 170 S 900 120, 1050 70 S 1300 20, 1400 10" fill="none" stroke="url(#sg${ctx.index})" stroke-width="10" stroke-linecap="round"/><circle cx="1400" cy="10" r="16" fill="var(--accent2)"/></svg>`,
          style: { position: "absolute", top: "260px", left: "50%", marginLeft: "-700px", opacity: 0.9 },
        });
        wrap.appendChild(svg);
        const path = svg.querySelector("path");
        fx.draw(tl, path, t0 + 0.1, { dur: Math.min(1.8, ctx.dur * 0.55) });
        fx.pop(tl, svg.querySelector("circle"), t0 + Math.min(1.8, ctx.dur * 0.55));
      }
    },
  });
})();

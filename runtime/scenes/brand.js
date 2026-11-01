/* Brand scenes.
 * logo-reveal: mark pops with overshoot, wordmark slides out from behind it, tagline + CTA.
 *   props: { logo?: path, mark?: path, name, tagline?, cta?, url?, click?: bool }
 *   If only a full logo is provided it scales in from blur; with mark+name the two-step
 *   Burnwe reveal is used (mark centered, then shifts left as the name unmasks).
 */
(function () {
  const { h, fx } = window.EM;

  EM.scene("logo-reveal", {
    build(ctx) {
      const p = ctx.props;
      const { tl, start, dur } = ctx;
      const brand = ctx.brand || {};
      const wrap = h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "46px" } });
      ctx.cam.appendChild(wrap);
      const row = h("div", { style: { display: "flex", alignItems: "center", gap: "28px", position: "relative" } });
      wrap.appendChild(row);
      const markSrc = p.mark || brand.mark;
      const logoSrc = p.logo || brand.logo;
      const name = p.name || brand.name || "";
      let t = start + 0.2;
      // Monochrome logos (baked #111) flip to white on dark worlds. The filter sits on a wrapper
      // so tweens can still animate blur on the img itself.
      const bg = fx.cssVar(ctx.el, "--bg") || "#fff";
      const darkBg = (() => {
        const m = bg.match(/^#?([0-9a-f]{6})$/i);
        if (!m) return /^#0|^#1|black/.test(bg);
        const n = parseInt(m[1], 16);
        return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 110;
      })();
      const wrapImg = (img, mono) => {
        // mono marks take the world's text colour: white on dark, near-black on light
        const s = h("span", { style: { display: "block", filter: mono ? (darkBg ? "brightness(0) invert(1)" : "brightness(0)") : "none" } }, img);
        return s;
      };

      if (logoSrc) {
        // Burnwe/Google resolve: the mark slams in (3.2x -> 1, blur -> sharp), then the full
        // lockup focus-pulls in over it.
        if (markSrc) {
          const mark = h("img", { src: markSrc, style: { height: "170px", width: "auto", display: "block" } });
          const mw = wrapImg(mark, brand.markMono);
          Object.assign(mw.style, { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" });
          row.appendChild(mw);
          tl.fromTo(mark, { scale: 3.2, rotation: -20, opacity: 0, filter: "blur(30px)" }, { scale: 1, rotation: 0, opacity: 1, filter: "blur(0px)", duration: 0.55, ease: "expo.out" }, t);
          tl.to(mark, { opacity: 0, scale: 0.9, filter: "blur(12px)", duration: 0.3, ease: "power2.in" }, t + 0.95);
          t += 1.0;
        }
        const logo = h("img", { src: logoSrc, style: { height: p.logoHeight || "150px", width: "auto", maxWidth: "1100px", objectFit: "contain", display: "block" } });
        row.appendChild(wrapImg(logo, brand.logoMono));
        tl.fromTo(logo, { scale: 1.08, opacity: 0, filter: "blur(20px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.7, ease: "expo.out" }, t);
        t += 0.7;
      } else if (markSrc) {
        const mark = h("img", { src: markSrc, style: { height: "150px", width: "auto", display: "block" } });
        const nameBox = h("div", { style: { overflow: "hidden", display: "flex", alignItems: "center" } });
        const nameEl = h("div", { class: "em-display", style: { fontSize: "150px", fontWeight: 650, letterSpacing: "-0.045em", whiteSpace: "nowrap", color: "var(--fg)" } }, name);
        nameBox.appendChild(nameEl);
        row.append(wrapImg(mark, brand.markMono), nameBox);
        // measure after layout: center mark first
        tl.fromTo(mark, { scale: 3.2, rotation: -25, opacity: 0, filter: "blur(30px)" }, { scale: 1, rotation: 0, opacity: 1, filter: "blur(0px)", duration: 0.5, ease: "expo.out" }, t);
        tl.fromTo(nameEl, { xPercent: -110, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.9, ease: "expo.out" }, t + 0.55);
        tl.fromTo(row, { x: () => (nameBox.offsetWidth + 28) / 2 }, { x: 0, duration: 0.9, ease: "expo.out" }, t + 0.55);
        t += 1.3;
      } else {
        const nameEl = h("div", { class: "em-display", style: { fontSize: "170px", fontWeight: 700 } });
        const chars = fx.splitChars(nameEl, name);
        row.appendChild(nameEl);
        tl.fromTo(chars, { yPercent: 100, opacity: 0, filter: "blur(10px)" }, { yPercent: 0, opacity: 1, filter: "blur(0px)", duration: 0.8, stagger: 0.04, ease: "expo.out" }, t);
        t += 0.8 + chars.length * 0.04;
      }

      // the end card must leave the tagline readable before the film ends: pull it forward over
      // the name's settle when the shot is short (reading time as in `eden-motion measure`)
      const end = start + dur;
      const tail = (p.cta ? 0.6 : 0) + (p.url ? 0.5 : 0);
      if (p.tagline) {
        const tag = h("div", { class: "em-sub", style: { fontSize: "44px", color: "var(--fg)", fontWeight: 550, marginTop: "-10px" } });
        const ws = fx.splitWords(tag, p.tagline, { keyword: p.keyword });
        wrap.appendChild(tag);
        const need = 0.4 + p.tagline.length / 18;
        t = Math.max(start + 0.5, Math.min(t, end - need - 0.6 - tail));
        fx.riseIn(tl, ws, t, { stagger: 0.05, y: 26 });
        t += 0.5;
      }
      if (p.cta) {
        const btn = h("div", { class: "em-pill-btn" }, p.cta);
        wrap.appendChild(btn);
        fx.pop(tl, btn, t + 0.1, { from: 0.6 });
        if (p.click !== false) {
          const c = fx.cursor(ctx.cam, { x: 1500, y: 1000, hand: true });
          const bc = fx.layoutCenter(btn, ctx.cam);
          fx.cursorMove(tl, c, bc.x - 8, bc.y - 6, t + 0.35, { dur: 0.8 });
          fx.cursorClick(tl, c, t + 1.2, { target: btn });
          tl.to(c, { opacity: 0, duration: 0.3 }, t + 1.9);
        }
        t += 0.6;
      }
      if (p.url) {
        const url = h("div", { class: "em-sub", style: { fontSize: "32px" } }, p.url);
        wrap.appendChild(url);
        fx.riseIn(tl, url, Math.min(t + 0.2, end - 1.3), { y: 16 });
      }
    },
  });
})();

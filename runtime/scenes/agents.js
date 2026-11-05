/* Calm agent-launch scenes, measured from a frame-by-frame reverse of a voice-AI agent launch film (2026, 60 fps).
 *
 * tool-swap: one static line ("Connect Architect to") and a dash; the tool name and the full-bleed mesh
 *   gradient behind it hard-cut together every ~0.67 s while the line slowly shrinks around the centre
 *   (1.0 to 0.84). With `orb: true` the last gradient closes into a circle that can hand off to inline-orb.
 *   props: { stem: "Connect Architect to", items: [{ name: "Claude", colors?: [c1, c2, c3] }] (3-6), orb?: true }
 * inline-orb: a sentence with a grained gradient orb sitting in the gap between two halves
 *   ("Improve (orb) your agents"); the orb breathes, then the halves close over it.
 *   props: { left: "Improve", right: "your agents", colors?: [c1, c2, c3], size?: px }
 * split-lockup: a line squeezes into the centre from both sides with two dots riding the edges, becomes two
 *   bars, the bars split and reveal the wordmark from the centre, the lockup slides left and the product name
 *   arrives in the accent.  props: { line?: "Elevate your customer experiences", name: "Brand", product?: "Agents" }
 */
(function () {
  const { h, fx } = window.EM;
  const FR = 1 / 60;

  // Squeeze a line into its centre: clip from both sides; two dots ride the clip edges.
  fx.squeeze = function (tl, el, t0, t1, { dots = true, color } = {}) {
    tl.set(el, { clipPath: "inset(0 0% 0 0%)" }, t0);
    tl.to(el, { clipPath: "inset(0 49.5% 0 49.5%)", duration: t1 - t0, ease: "power2.in" }, t0);
    if (!dots) return;
    const w = el.offsetWidth || 900, parent = el.parentNode;
    const col = color || fx.cssVar(el, "--fg") || "#141414";
    [-1, 1].forEach((s) => {
      const d = h("div", { style: `position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:2px;background:${col}` });
      parent.appendChild(d);
      gsap.set(d, { autoAlpha: 0 });
      tl.fromTo(d, { x: (s * w) / 2, autoAlpha: 1 }, { x: s * 8, duration: t1 - t0, ease: "power2.in", immediateRender: false }, t0);
      tl.set(d, { autoAlpha: 0 }, t1);
    });
  };

  const PALETTES = [["#e9c89a", "#c08a4e", "#cbd9df"], ["#d8c3a0", "#a87b48", "#efe4d2"], ["#b7cdd8", "#6e4a5a", "#cfdde2"], ["#e7bcd2", "#8a1a52", "#3a0c25"], ["#a9c6d6", "#3d4f9a", "#7c8fc9"]];
  const mesh = (c) => `radial-gradient(60% 70% at 25% 30%, ${c[0]} 0%, transparent 70%), radial-gradient(55% 65% at 70% 65%, ${c[1]} 0%, transparent 72%), radial-gradient(80% 90% at 50% 50%, ${c[2]} 0%, ${c[2]} 100%)`;
  const grain = () => h("div", { style: "position:absolute;inset:0;opacity:.18;mix-blend-mode:overlay;background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' seed='3'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" });

  EM.scene("tool-swap", {
    ownsCamera: true,
    build(ctx) {
      const p = ctx.props, { tl, start, end, dur } = ctx;
      const items = (p.items || []).filter((x) => x && x.name);
      if (!items.length) return;
      const box = h("div", { style: "position:absolute;inset:0;overflow:hidden" });
      ctx.cam.appendChild(box);
      const bg = h("div", { style: "position:absolute;inset:0;filter:blur(24px);transform:scale(1.1)" });
      box.appendChild(bg); box.appendChild(grain());
      const line = h("div", { style: "position:absolute;left:0;right:0;top:50%;text-align:center;font:400 67px var(--font-display);color:#f7f5f2;letter-spacing:-0.02em;white-space:nowrap;transform-origin:50% 50%" });
      const name = h("span", { style: "font-size:1.1em" });
      line.appendChild(h("span", {}, p.stem || "Connect to"));
      line.appendChild(h("span", { style: "display:inline-block;width:80px;height:2px;background:rgba(247,245,242,.85);margin:0 22px;vertical-align:middle;position:relative;top:-4px" }));
      line.appendChild(name);
      box.appendChild(line);
      gsap.set(line, { yPercent: -50 });
      const orbAt = p.orb ? end - Math.min(0.5, dur * 0.18) : end;
      const slot = (orbAt - start) / items.length;
      items.forEach((it, i) => {
        const t = start + i * slot;
        tl.set(bg, { background: mesh(it.colors || PALETTES[i % PALETTES.length]) }, t);
        tl.set(name, { textContent: it.name }, t);
      });
      tl.fromTo(line, { scale: 1 }, { scale: 0.84, duration: dur, ease: "none", immediateRender: false }, start);
      if (p.orb) {
        tl.fromTo(box, { clipPath: "circle(1100px at 960px 540px)" }, { clipPath: "circle(70px at 960px 540px)", duration: end - orbAt, ease: "power3.in", immediateRender: false }, orbAt);
        tl.to(line, { autoAlpha: 0, duration: 0.12 }, orbAt);
      }
    },
  });

  EM.scene("inline-orb", {
    ownsCamera: true,
    build(ctx) {
      const p = ctx.props, { tl, start, end, dur } = ctx;
      const fs = p.size || 57, d = fs * 2.6;
      const ink = fx.cssVar(ctx.cam, "--fg") || "#141414";
      const row = h("div", { style: `position:absolute;left:50%;top:50%;display:flex;align-items:center;gap:${fs * 0.35}px;font:500 ${fs}px var(--font-display);color:${ink};letter-spacing:-0.02em;white-space:nowrap` });
      const L = h("span", {}, p.left || "Improve"), R = h("span", {}, p.right || "your agents");
      const orb = h("div", { style: `position:relative;width:${d}px;height:${d}px;border-radius:50%;overflow:hidden;background:${mesh(p.colors || PALETTES[4])}` });
      orb.appendChild(grain());
      row.appendChild(L); row.appendChild(orb); row.appendChild(R);
      ctx.cam.appendChild(row);
      gsap.set(row, { xPercent: -50, yPercent: -50 });
      tl.fromTo(orb, { scale: 2.4 }, { scale: 1, duration: 0.5, ease: "expo.out", immediateRender: false }, start);
      tl.to(orb, { scale: 1.06, duration: dur * 0.5, ease: "sine.inOut", yoyo: true, repeat: 1 }, start + 0.5);
      tl.to(orb, { scale: 0, duration: 0.25, ease: "power3.in" }, end - 0.3);
      tl.to([L, R], { x: (i) => (i ? -d / 2 : d / 2), duration: 0.25, ease: "power3.in" }, end - 0.3);
    },
  });

  EM.scene("split-lockup", {
    ownsCamera: true,
    build(ctx) {
      const p = ctx.props, { tl, start, end, dur } = ctx;
      const ink = fx.cssVar(ctx.cam, "--fg") || "#141414";
      const accent = fx.cssVar(ctx.cam, "--accent") || "#8b8fc8";
      const box = h("div", { style: "position:absolute;inset:0" });
      ctx.cam.appendChild(box);
      let t = start;
      if (p.line) {
        const ln = h("div", { style: `position:absolute;left:50%;top:50%;font:500 57px var(--font-display);color:${ink};letter-spacing:-0.02em;white-space:nowrap` }, p.line);
        box.appendChild(ln); gsap.set(ln, { xPercent: -50, yPercent: -50 });
        const hold = Math.min(1.6, dur * 0.35);
        fx.squeeze(tl, ln, t + hold, t + hold + 0.2);
        tl.set(ln, { autoAlpha: 0 }, t + hold + 0.2);
        t += hold + 0.2;
      }
      // measured: bars sit 33 px apart for 0.2 s, split to the wordmark edges in 0.5 s, reveal from the centre
      const wm = h("div", { style: `position:absolute;left:50%;top:50%;font:600 56px var(--font-display);color:${ink};letter-spacing:-0.03em;white-space:nowrap;display:flex;gap:18px;align-items:baseline` });
      const nm = h("span", {}, p.name || "Brand");
      const pr = h("span", { style: `font-weight:400;color:${accent};letter-spacing:-0.02em` }, p.product || "");
      wm.appendChild(nm); if (p.product) wm.appendChild(pr);
      box.appendChild(wm);
      gsap.set(wm, { yPercent: -50, autoAlpha: 0 });
      const nmW = fx.textWidth ? fx.textWidth(nm.textContent, `600 56px ${getComputedStyle(nm).fontFamily}`) : 420;
      const prW = p.product && fx.textWidth ? fx.textWidth(pr.textContent, `400 56px ${getComputedStyle(pr).fontFamily}`) + 18 : 0;
      const bars = [-1, 1].map(() => { const b = h("div", { style: `position:absolute;left:50%;top:50%;width:12px;height:52px;margin:-26px 0 0 -6px;border-radius:2px;background:${ink}` }); box.appendChild(b); gsap.set(b, { autoAlpha: 0 }); return b; });
      bars.forEach((b, i) => {
        const s = i ? 1 : -1;
        tl.set(b, { x: s * 16, autoAlpha: 1 }, t);
        tl.to(b, { x: s * (nmW / 2), duration: 0.5, ease: "power2.inOut" }, t + 0.2);
        tl.set(b, { autoAlpha: 0 }, t + 0.8);
      });
      // wordmark centred on its name, revealed from the centre, then the lockup slides to centre the pair
      tl.set(wm, { x: -nmW / 2, autoAlpha: 1, clipPath: `inset(0 ${Math.max(0, prW - 8) + nmW / 2}px 0 ${nmW / 2}px)` }, t + 0.4);
      tl.to(wm, { clipPath: `inset(0 ${Math.max(0, prW - 8)}px 0 0px)`, duration: 0.4, ease: "power2.out" }, t + 0.4);
      if (p.product) {
        tl.to(wm, { x: -(nmW + prW) / 2, duration: 0.4, ease: "power3.inOut" }, t + 1.1);
        tl.to(wm, { clipPath: "inset(0 0px 0 0px)", duration: 0.7, ease: "power2.out" }, t + 1.2);
      }
    },
  });
})();

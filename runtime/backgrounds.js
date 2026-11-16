/* Persistent background layers per theme. They live under every scene for the whole film so
 * cuts never flash to a flat colour, and they drift slowly so the frame is never dead.
 */
(function () {
  const EM = window.EM;
  const h = EM.h;
  const B = (EM.backgrounds = {});

  // Big soft gradient blobs (Lovable / Google feel). Colours come from theme CSS vars.
  function blobs(root, tl, sb, { count = 4, opacity = 1 } = {}) {
    const r = EM.rng("bg-" + (sb.brand?.name || "x"));
    const colors = ["var(--glow1)", "var(--glow2)", "var(--glow3)", "var(--glow1)", "var(--glow2)"];
    const D = sb.duration;
    for (let i = 0; i < count; i++) {
      const b = h("div", { class: "em-blob", "data-layout-allow-overflow": "" });
      b.style.background = `radial-gradient(circle at 50% 50%, ${colors[i]} 0%, transparent 65%)`;
      b.style.opacity = opacity;
      root.appendChild(b);
      const x0 = (r() - 0.5) * 1800, y0 = (r() - 0.5) * 900;
      gsap.set(b, { x: x0, y: y0, scale: 0.9 + r() * 0.6 });
      // drift in 3 legs across the film
      const legs = 3;
      for (let k = 0; k < legs; k++) {
        tl.to(b, { x: (r() - 0.5) * 1900, y: (r() - 0.5) * 1000, scale: 0.8 + r() * 0.8, duration: D / legs, ease: "sine.inOut" }, (D / legs) * k);
      }
    }
  }

  function stars(root, sb, n = 90) {
    const r = EM.rng("stars");
    for (let i = 0; i < n; i++) {
      const s = h("div", { class: "em-star" });
      const size = r() < 0.9 ? 1 + r() * 2 : 3 + r() * 2;
      Object.assign(s.style, { left: r() * 100 + "%", top: r() * 100 + "%", width: size + "px", height: size + "px", opacity: 0.2 + r() * 0.6 });
      root.appendChild(s);
    }
  }

  function grain(root) {
    root.appendChild(h("div", { class: "em-grain" }));
  }

  // Darkest pixel of the film: a `lighten` layer raises everything darker than the floor colour to
  // it, so no frame is ever pure black (a black screen was rejected; a lit, out-of-focus world is the
  // default). sb.floor: a hex colour, or false to turn it off.
  function floor(root, sb, def = "#0c0f0e") {
    if (sb.floor === false) return;
    const f = h("div", { class: "em-floor", "data-layout-allow-overflow": "" });
    Object.assign(f.style, { position: "absolute", inset: "0", background: sb.floor || def, mixBlendMode: "lighten", pointerEvents: "none" });
    root.appendChild(f);
  }

  // parallax-world: brand imagery split into depth layers (tools/world_layers.py), drifting at different
  // speeds and blurred, behind everything. storyboard.json:
  //   "background": "parallax-world",
  //   "world": { "dir": "assets/world",
  //              "scenes": [{ "name": "day", "from": 0 }, { "name": "dusk", "from": 16.0, "dur": 0.9 }],
  //              "parallax": [1, 1.6, 2.4],  "travel": 90,  "blur": [18, 14, 30],
  //              "centerDim": 0.2, "light": 1.5, "floor": "#0c0f0e" }
  // scenes: the worlds in order (`from` = second the world takes over, `dur` = the light transition: the
  // new world settles from `light` x exposure while it fades in). parallax: layer speed factors (far, mid,
  // near). travel: px the far layer travels over the film at 1080p. blur: px per layer at 1080p (what is
  // in focus stays softer than the UI, never sharp). centerDim: darkens the middle behind the UI.
  B["parallax-world"] = function (root, tl, sb) {
    const w = sb.world || {};
    const dir = (w.dir || "assets/world").replace(/\/$/, "");
    const meta = w.meta || {};
    const worlds = w.scenes && w.scenes.length ? w.scenes : [{ name: w.name || "world", from: 0 }];
    const fac = w.parallax || [1, 1.6, 2.4];
    const blur = w.blur || [18, 14, 30];
    const travel = w.travel ?? 90;
    const D = sb.duration;
    const SW = (sb.width || 1920), SH = (sb.height || 1080), k = SW / 1920;
    root.appendChild(h("div", { class: "em-bg-base" }));
    worlds.forEach((wd, wi) => {
      const g = h("div", { class: "em-world", "data-layout-allow-overflow": "" });
      Object.assign(g.style, { position: "absolute", inset: "0", overflow: "hidden" });
      root.appendChild(g);
      const m = meta[wd.name] || { width: 4224, height: 2376 };
      ["far", "mid", "near"].forEach((ln, li) => {
        const A = (travel * k * fac[li]) / 2;                                   // half amplitude, px
        const pad = 4 * (blur[li] || 0) * k;                                     // a blurred edge fades: keep it outside the stage
        const s = Math.max((SW + A * 2.1 + pad) / m.width, (SH * 1.08 + A * 0.8 + pad) / m.height);
        const iw = m.width * s, ih = m.height * s;
        const img = h("img", { src: `${dir}/${wd.name}_${ln}.png`, alt: "", "data-layout-allow-overflow": "" });
        Object.assign(img.style, { position: "absolute", left: (SW - iw) / 2 + "px", top: (SH - ih) / 2 + "px", width: iw + "px", height: ih + "px", maxWidth: "none", filter: `blur(${(blur[li] || 0) * k}px)` });
        g.appendChild(img);
        // a slow sine leg out and back across the film, opposite direction per layer pair
        const dirn = wi % 2 ? -1 : 1;
        tl.fromTo(img, { x: -A * dirn, y: A * 0.18 }, { x: A * dirn, y: -A * 0.18, duration: Math.max(1, D), ease: "sine.inOut" }, 0);
      });
      const from = wd.from || 0;
      if (wi === 0) return;
      const dur = wd.dur ?? 0.9;
      // the light transition: the new world arrives overexposed and settles while it fades in
      gsap.set(g, { opacity: 0 });
      tl.fromTo(g, { opacity: 0, filter: `brightness(${w.light || 1.5})` }, { opacity: 1, filter: "brightness(1)", duration: dur, ease: "power2.out" }, from);
    });
    if (w.centerDim ?? 0.2) {
      const c = h("div", { class: "em-world-dim", "data-layout-allow-overflow": "" });
      Object.assign(c.style, { position: "absolute", inset: "0", background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,${w.centerDim ?? 0.2}) 0%, rgba(0,0,0,0) 72%)`, pointerEvents: "none" });
      root.appendChild(c);
    }
    floor(root, { floor: w.floor ?? sb.floor }, w.floorDefault);
    root.appendChild(h("div", { class: "em-vignette" }));
  };

  B.auto = function (root, tl, sb) {
    const theme = sb.theme || "saas-light";
    root.appendChild(h("div", { class: "em-bg-base" }));
    if (theme === "saas-dark") {
      blobs(root, tl, sb, { count: 3, opacity: 0.55 });
      stars(root, sb);
    } else if (theme === "saas-light") {
      blobs(root, tl, sb, { count: 3, opacity: 0.35 });
    } else if (theme === "glow") {
      blobs(root, tl, sb, { count: 5, opacity: 0.95 });
    } else if (theme === "cinematic") {
      blobs(root, tl, sb, { count: 2, opacity: 0.35 });
    }
    // dark worlds never go below the floor colour (no black screen), light ones are left alone
    if (theme !== "saas-light") floor(root, sb);
    root.appendChild(h("div", { class: "em-vignette" }));
    grain(root);
  };
})();

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
    root.appendChild(h("div", { class: "em-vignette" }));
    grain(root);
  };
})();

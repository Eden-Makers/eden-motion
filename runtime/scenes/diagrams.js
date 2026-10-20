/* diagram-draw: editorial diagrams drawn on stroke by stroke (taxonomy and taste from
 * cathrynlavery/diagram-design, MIT): one accent for the 1-2 things that matter, hairline strokes,
 * no shadows, no fills except the focal element, every coordinate on a 4 px grid, density ~4/10.
 *
 * diagram-draw, ownsCamera
 *   props: {
 *     mode: "timeline" | "quadrant" | "flywheel" | "sequence" | "nested"
 *     title?: str                    small display line top-left
 *     focus?: [index...]             items drawn in the accent (default: the last item)
 *     timeline:  items [{ label, when?, cue? }] 3-6 events on one axis
 *     quadrant:  axes { x: "Effort", y: "Impact" }, corners? [tl, tr, bl, br] labels,
 *                items [{ label, x: 0..1, y: 0..1, cue? }] 2-6 dots (y=1 is the top)
 *     flywheel:  items [{ label, cue? }] 3-5 stages around a loop, hub?: str in the centre
 *     sequence:  actors [str] 2-4 lifelines, items [{ from: 0, to: 1, label, cue? }] 2-6 messages top-down
 *     nested:    items [{ label }] 2-4 containers outer to inner (the innermost is the focus)
 *   }
 * Every item may carry cue: "word" to land on that VO word; otherwise items are spread over the
 * first 70% of the shot. Strokes draw on (power2.inOut), labels arrive with a focus pull.
 */
(function () {
  const EM = window.EM;
  const { h, fx } = EM;
  const NS = "http://www.w3.org/2000/svg";
  const g4 = (v) => Math.round(v / 4) * 4;

  function svgEl(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  }

  EM.scene("diagram-draw", {
    ownsCamera: true,
    build(ctx) {
      const { tl, start, dur, props: p, cam } = ctx;
      const mode = p.mode || "timeline";
      const ink = fx.cssVar(ctx.el, "--fg") || "#111";
      const muted = fx.cssVar(ctx.el, "--muted") || "#888";
      // the accent must read on this tone (a black brand accent on a black shot would vanish):
      // below 3:1 contrast the focus falls back to ink and is carried by fill + weight alone
      const rgb = (c) => {
        let m = String(c).match(/#([0-9a-f]{3})\b/i);
        if (m) return [...m[1]].map((x) => parseInt(x + x, 16));
        m = String(c).match(/#([0-9a-f]{6})/i);
        if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
        const n = String(c).match(/\d+(\.\d+)?/g);
        return n && n.length >= 3 ? n.slice(0, 3).map(Number) : null;
      };
      const lum = (c) => {
        const v = rgb(c);
        if (!v) return null;
        const [r, g, b] = v.map((x) => ((x /= 255) <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const contrast = (a, b) => {
        const la = lum(a), lb = lum(b);
        return la == null || lb == null ? 21 : (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
      };
      const bg = fx.cssVar(ctx.el, "--bg") || "#fff";
      const acc0 = fx.cssVar(ctx.el, "--accent") || ink;
      const accent = contrast(acc0, bg) >= 3 ? acc0 : ink;
      const items = (p.items || []).slice(0, mode === "nested" ? 4 : 6);
      const focus = new Set(Array.isArray(p.focus) ? p.focus : [items.length - 1]);
      const col = (i) => (focus.has(i) ? accent : ink);

      const svg = svgEl("svg", { width: 1920, height: 1080, viewBox: "0 0 1920 1080" });
      Object.assign(svg.style, { position: "absolute", left: 0, top: 0, overflow: "visible" });
      cam.appendChild(svg);

      // timing: cue word if given, else spread over the first 70% of the shot
      // everything has landed by ~55% of the shot so the last (usually the focal) read gets held
      const t0 = start + 0.2, span = Math.max(0.6, dur * 0.45 - 0.1);
      const at = (i, n) => {
        const it = items[i] || {};
        const even = t0 + (n > 1 ? (span * i) / (n - 1) : 0) * 0.85;
        return it.cue ? fx.timeOf(ctx, it.cue, even) : even;
      };

      const line = (d, t, { color = ink, w = 2, dd = 0.45, dash } = {}) => {
        const e = svgEl("path", { d, fill: "none", stroke: color, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": dash ? "0.012 0.012" : "1", "stroke-dashoffset": dash ? 0 : 1 });
        svg.appendChild(e);
        if (dash) tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: dd, ease: "power2.out" }, t);
        else tl.fromTo(e, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: dd, ease: "power2.inOut" }, t);
        return e;
      };
      const shape = (tag, attrs, t, { color = ink, fill = "none", dd = 0.4 } = {}) => {
        const e = svgEl(tag, { ...attrs, fill, stroke: color, "stroke-width": 2, pathLength: 1, "stroke-dasharray": "1", "stroke-dashoffset": 1 });
        svg.appendChild(e);
        tl.fromTo(e, { attr: { "stroke-dashoffset": 1 }, fillOpacity: 0 }, { attr: { "stroke-dashoffset": 0 }, duration: dd, ease: "power2.inOut" }, t);
        if (fill !== "none") tl.to(e, { fillOpacity: 1, duration: 0.25, ease: "power1.out" }, t + dd * 0.7);
        return e;
      };
      const arrow = (x, y, ang, t, color = ink) => {
        const a = (ang * Math.PI) / 180, L = 16;
        const pts = [-0.5, 0.5].map((s) => `${x - L * Math.cos(a + s)},${y - L * Math.sin(a + s)}`);
        const e = svgEl("path", { d: `M${pts[0]} L${x},${y} L${pts[1]}`, fill: "none", stroke: color, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0 });
        svg.appendChild(e);
        tl.to(e, { opacity: 1, duration: 0.12 }, t);
      };
      const label = (x, y, text, t, { size = 40, color = ink, anchor = "center", weight = 500, sub } = {}) => {
        const el = h("div", { style: { position: "absolute", left: `${g4(x)}px`, top: `${g4(y)}px`, fontFamily: "var(--font-display)", fontSize: `${size}px`, fontWeight: weight, letterSpacing: "-0.015em", lineHeight: 1.1, color, whiteSpace: "nowrap", textAlign: anchor === "start" ? "left" : anchor === "end" ? "right" : "center" } });
        el.textContent = text || "";
        if (sub) {
          const s = h("div", { style: { fontSize: `${Math.round(size * 0.6)}px`, color: muted, fontWeight: 400, marginTop: "6px" } });
          s.textContent = sub;
          el.appendChild(s);
        }
        cam.appendChild(el);
        tl.set(el, { xPercent: anchor === "start" ? 0 : anchor === "end" ? -100 : -50, yPercent: -50 }, 0);
        fx.focusIn(tl, el, t, { dur: 0.38, blur: 12, scale: 1.04 });
        return el;
      };
      // slow push for the whole shot, the diagram never sits dead still
      tl.fromTo(cam, { scale: 1 }, { scale: 1.035, duration: dur, ease: "sine.out" }, start);
      if (p.title) label(120, 128, p.title, start + 0.05, { size: 48, anchor: "start", weight: 600 });

      if (mode === "timeline") {
        const n = Math.max(1, items.length), x0 = 200, x1 = 1720, y = 560;
        line(`M${x0},${y} L${x1},${y}`, start + 0.1, { dd: Math.min(0.9, span * 0.6) });
        items.forEach((it, i) => {
          const x = g4(n > 1 ? x0 + 80 + ((x1 - x0 - 160) * i) / (n - 1) : (x0 + x1) / 2), t = at(i, n), up = i % 2 === 0;
          const r = focus.has(i) ? 14 : 8;
          shape("circle", { cx: x, cy: y, r }, t, { color: col(i), fill: focus.has(i) ? accent : "none", dd: 0.25 });
          line(`M${x},${y + (up ? -r - 8 : r + 8)} L${x},${y + (up ? -116 : 116)}`, t + 0.08, { color: col(i), dd: 0.2 });
          label(x, y + (up ? -176 : 176), it.label, t + 0.14, { color: col(i), size: 42, sub: it.when, weight: focus.has(i) ? 700 : 500 });
        });
      } else if (mode === "quadrant") {
        const L = 400, R = 1520, T = 220, B = 940, cx = (L + R) / 2, cy = (T + B) / 2;
        line(`M${L},${cy} L${R},${cy}`, start + 0.1, { dd: 0.5 });
        line(`M${cx},${B} L${cx},${T}`, start + 0.2, { dd: 0.5 });
        arrow(R, cy, 0, start + 0.6);
        arrow(cx, T, -90, start + 0.7);
        const ax = p.axes || {};
        if (ax.x) label(R + 24, cy, ax.x, start + 0.55, { size: 34, color: muted, anchor: "start" });
        if (ax.y) label(cx, T - 40, ax.y, start + 0.65, { size: 34, color: muted });
        (p.corners || []).slice(0, 4).forEach((c, i) => c && label(i % 2 ? R - 24 : L + 24, i < 2 ? T + 40 : B - 40, c, start + 0.7, { size: 30, color: muted, anchor: i % 2 ? "end" : "start" }));
        items.forEach((it, i) => {
          const x = g4(L + 40 + (R - L - 80) * Math.max(0, Math.min(1, +it.x || 0.5))), y = g4(B - 40 - (B - T - 80) * Math.max(0, Math.min(1, +it.y || 0.5))), t = at(i, items.length) + 0.5;
          shape("circle", { cx: x, cy: y, r: focus.has(i) ? 18 : 10 }, t, { color: col(i), fill: focus.has(i) ? accent : "none", dd: 0.22 });
          label(x + 32, y, it.label, t + 0.08, { size: 36, color: col(i), anchor: "start", weight: focus.has(i) ? 700 : 500 });
        });
      } else if (mode === "flywheel") {
        const n = Math.max(3, items.length), cx = 960, cy = 580, R = 300;
        const ang = (i) => -90 + (360 * i) / n;
        const pt = (a, r = R) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
        items.forEach((it, i) => {
          const t = at(i, items.length), a0 = ang(i) + 14, a1 = ang(i + 1) - 14;
          const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
          line(`M${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1}`, t, { dd: 0.4 });
          arrow(x1, y1, a1 + 90, t + 0.38);
          const [lx, ly] = pt(ang(i), R + 120);
          shape("circle", { cx: pt(ang(i))[0], cy: pt(ang(i))[1], r: focus.has(i) ? 14 : 8 }, t, { color: col(i), fill: focus.has(i) ? accent : "none", dd: 0.2 });
          label(lx, ly, it.label, t + 0.1, { size: 40, color: col(i), weight: focus.has(i) ? 700 : 500 });
        });
        if (p.hub) label(cx, cy, p.hub, start + span * 0.85, { size: 56, weight: 600 });
      } else if (mode === "sequence") {
        const actors = (p.actors || ["Client", "Server"]).slice(0, 4), m = actors.length, top = 220, bot = 960;
        const xs = actors.map((_, i) => g4(m > 1 ? 360 + (1200 * i) / (m - 1) : 960));
        actors.forEach((a, i) => {
          label(xs[i], top, a, start + 0.05 + i * 0.08, { size: 40, weight: 600 });
          line(`M${xs[i]},${top + 44} L${xs[i]},${bot}`, start + 0.15 + i * 0.08, { color: muted, dd: 0.5, dash: true });
        });
        const step = Math.min(120, (bot - top - 120) / Math.max(1, items.length));
        items.forEach((it, i) => {
          const a = Math.max(0, Math.min(m - 1, +it.from || 0)), b = Math.max(0, Math.min(m - 1, it.to == null ? 1 : +it.to));
          const y = g4(top + 120 + step * i), t = at(i, items.length) * 0.85 + (start + 0.3) * 0.15, dir = xs[b] >= xs[a] ? 1 : -1;
          line(`M${xs[a]},${y} L${xs[b] - dir * 4},${y}`, t, { color: col(i), dd: 0.3, w: focus.has(i) ? 3 : 2 });
          arrow(xs[b] - dir * 4, y, dir > 0 ? 0 : 180, t + 0.28, col(i));
          label((xs[a] + xs[b]) / 2, y - 30, it.label, t + 0.06, { size: 32, color: col(i), weight: focus.has(i) ? 700 : 500 });
        });
      } else if (mode === "nested") {
        const n = Math.max(1, items.length);
        items.forEach((it, i) => {
          const inset = i * 92, x = 300 + inset, y = 180 + inset * 0.78, w = 1320 - 2 * inset, hh = 800 - 2 * inset * 0.78;
          const t = at(i, n), last = i === n - 1;
          shape("rect", { x: g4(x), y: g4(y), width: g4(w), height: g4(hh), rx: 10 }, t, { color: last ? accent : ink, fill: "none", dd: 0.45 });
          label(x + 32, y + 40, it.label, t + 0.2, { size: last ? 44 : 34, color: last ? accent : i ? ink : muted, anchor: "start", weight: last ? 600 : 500 });
        });
      }
    },
  });
})();

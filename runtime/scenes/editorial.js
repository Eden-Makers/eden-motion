/* Editorial launch scenes, measured from a frame-by-frame reverse of an image-model launch film (2026).
 *
 * label-flash: one big category word per image, 0.4-0.6 s each. Four small corner marks sit outside the
 *   word; on every cut the marks enter as two coloured dashes and the word enters condensed (or wide on
 *   every third item) for two frames, then both snap to rest. The last item zooms toward camera.
 *   props: { items: [{ label: "Design", src: "gen:<prompt>"|"assets/..." }] (3-8), size?: px (default 136) }
 * scatter-line: a sentence scattered over a grid. Image tiles snap to grid cells, words on small chips jump
 *   on twos toward the middle, collapse into one centred line that keeps growing; optional scramble into
 *   a title (letters drop out, refill in the accent, then settle in ink).
 *   props: { text: "will never be the same", tiles?: [src] (0-6), then?: "Introducing Brand 2", size?: px }
 * type-behind: a giant word rising from below over a full-bleed image with the product in front of it
 *   (pass a cut-out PNG with alpha at the same frame as `front`).
 *   props: { src, front?: "assets/cutout.png", word: "Write", size?: px (default 900), color?: css }
 * frame-grow: a selected image frame widens from portrait to near full width while the word under it grows
 *   and its tracking opens; a ghost giant word sits behind.
 *   props: { src, word: "Bigger", ghost?: "Big", anchor?: 0-100 (object-position x, default 75) }
 */
(function () {
  const { h, fx } = window.EM;
  const FR = 1 / 30;
  fx.textWidth = fx.textWidth || function (text, font) { const c = document.createElement("canvas").getContext("2d"); c.font = font; return c.measureText(text).width; };

  // Four square corner marks around a box; enter() shows them as dash pairs for `frames` frames first.
  fx.cornerMarks = function (parent, { size = 14, color = "#e8e6e3" } = {}) {
    const marks = [0, 1, 2, 3].map(() => {
      const a = h("div", { style: `position:absolute;left:0;top:0;width:${size}px;height:${size}px;background:${color}` });
      const b = h("div", { style: `position:absolute;left:0;top:0;height:${Math.round(size * 0.72)}px;background:${color}` });
      parent.appendChild(a); parent.appendChild(b);
      gsap.set([a, b], { autoAlpha: 0 });
      return [a, b];
    });
    const place = (tl, t, box, { dashes = false, dashColor, scale = 1 } = {}) => {
      const pts = [[box.x0, box.y0], [box.x1, box.y0], [box.x0, box.y1], [box.x1, box.y1]];
      pts.forEach(([x, y], i) => {
        const [a, b] = marks[i];
        if (dashes) {
          tl.set(a, { x: x - 34, y: y - 5, width: 26, height: 10, background: dashColor || color, autoAlpha: 1 }, t);
          tl.set(b, { x: x + 2, y: y - 5, width: 30, height: 10, background: dashColor || color, autoAlpha: 1 }, t);
        } else {
          tl.set(a, { x: x - (size * scale) / 2, y: y - (size * scale) / 2, width: size * scale, height: size * scale, background: color, autoAlpha: 1 }, t);
          tl.set(b, { autoAlpha: 0 }, t);
        }
      });
    };
    const hide = (tl, t) => marks.flat().forEach((m) => tl.set(m, { autoAlpha: 0 }, t));
    return { place, hide };
  };

  // Scramble one string into another: letters of `from` drop out at random, `to` fills in through
  // `steps` frames in the accent colour, then turns to the final colour.
  fx.scramble = function (tl, el, from, to, t, rng, { steps = 6, accent, ink, frame = FR } = {}) {
    const A = [...from], B = [...to];
    const n = Math.max(A.length, B.length);
    const order = [...Array(n).keys()].sort(() => rng() - 0.5);
    for (let s = 0; s <= steps; s++) {
      const k = Math.round((s / steps) * n);
      const shown = new Set(order.slice(0, k));
      const half = s < steps / 2;
      const str = [...Array(n).keys()].map((i) => (half ? (shown.has(i) ? " " : A[i] || " ") : shown.has(i) ? B[i] || "" : " ")).join("");
      tl.set(el, { textContent: str, color: half ? ink : accent }, t + s * frame);
    }
    tl.set(el, { textContent: to, color: ink }, t + (steps + 1) * frame);
    return t + (steps + 1) * frame;
  };

  const full = (src) => {
    const isVid = /\.(mp4|webm|mov)$/i.test(src || "");
    return isVid ? h("video", { src, muted: "", playsinline: "", style: "position:absolute;inset:0;width:100%;height:100%;object-fit:cover" })
      : h("img", { src, alt: "", style: "position:absolute;inset:0;width:100%;height:100%;object-fit:cover" });
  };

  EM.scene("label-flash", {
    ownsCamera: true,
    build(ctx) {
      const p = ctx.props, { tl, start, end } = ctx;
      const items = (p.items || []).filter((x) => x && x.label);
      if (!items.length) return;
      const fs = p.size || 136;
      const box = h("div", { style: "position:absolute;inset:0;overflow:hidden" });
      ctx.cam.appendChild(box);
      const imgs = items.map((it) => { const im = full(it.src); box.appendChild(im); gsap.set(im, { autoAlpha: 0 }); return im; });
      const word = h("div", { style: `position:absolute;left:50%;top:50%;font:500 ${fs}px var(--font-display);color:#f4f2ee;white-space:nowrap;line-height:1;transform:translate(-50%,-50%)` });
      box.appendChild(word);
      const marks = fx.cornerMarks(box);
      const accent = fx.cssVar(box, "--accent") || "#a9c3e6";
      const slot = (end - start) / items.length;
      items.forEach((it, i) => {
        const t = start + i * slot;
        tl.set(imgs[i], { autoAlpha: 1 }, t);
        if (i) tl.set(imgs[i - 1], { autoAlpha: 0 }, t);
        tl.set(word, { textContent: it.label, scaleX: 1, letterSpacing: "0px", xPercent: -50, yPercent: -50, scale: 1 }, t);
        const w = fx.textWidth ? fx.textWidth(it.label, `500 ${fs}px ${getComputedStyle(word).fontFamily}`) : it.label.length * fs * 0.5;
        const bx = { x0: 960 - w / 2 - 38, x1: 960 + w / 2 + 38, y0: 540 - fs * 0.82, y1: 540 + fs * 0.82 };
        const wide = i % 3 === 2;
        if (i) {
          tl.set(word, wide ? { letterSpacing: Math.round(fs * 0.13) + "px" } : { scaleX: 0.8 }, t);
          marks.place(tl, t, bx, { dashes: true, dashColor: i % 2 ? accent : "#e8e6e3" });
          tl.set(word, { scaleX: 1, letterSpacing: "0px" }, t + 2 * FR);
        }
        marks.place(tl, i ? t + 2 * FR : t, bx);
        if (i === items.length - 1) {
          // the last word pushes toward camera in two steps, marks with it
          [[0.55, 1.37], [0.8, 1.56]].forEach(([f, s]) => {
            const tt = t + slot * f;
            tl.set(word, { scale: s }, tt);
            const cx = 960, cy = 540;
            marks.place(tl, tt, { x0: cx - (cx - bx.x0) * s, x1: cx + (bx.x1 - cx) * s, y0: cy - (cy - bx.y0) * s, y1: cy + (bx.y1 - cy) * s }, { scale: s });
          });
        }
      });
    },
  });

  EM.scene("scatter-line", {
    ownsCamera: true,
    build(ctx) {
      const p = ctx.props, { tl, start, end, dur, rng } = ctx;
      const words = String(p.text || "").split(/\s+/).filter(Boolean);
      if (!words.length) return;
      const fs = p.size || 82;
      const ink = fx.cssVar(ctx.cam, "--fg") || "#1c1c1c";
      const accent = fx.cssVar(ctx.cam, "--accent") || "#a58be8";
      const box = h("div", { style: "position:absolute;inset:0;overflow:hidden" });
      ctx.cam.appendChild(box);
      box.appendChild(h("div", { style: "position:absolute;inset:0;background-image:linear-gradient(90deg,rgba(0,0,0,.08) 1px,transparent 1px),linear-gradient(0deg,rgba(0,0,0,.08) 1px,transparent 1px);background-size:120px 120px;background-position:0 0,0 60px" }));
      // tiles on grid cells, away from the middle band
      const cells = [[1, 0, 2, 2], [1, 5, 2, 3], [5, 0, 2, 3], [7, 5, 2, 2], [11, 0, 4, 2.5], [12, 7, 3, 1.5]];
      const tiles = (p.tiles || []).slice(0, 6).map((src, i) => {
        const [cx, cy, cw, ch] = cells[i];
        const el = h("div", { style: `position:absolute;left:${cx * 120}px;top:${cy * 120 + 54}px;width:${cw * 120}px;height:${ch * 120}px;overflow:hidden` });
        el.appendChild(full(src)); box.appendChild(el);
        const t = start + i * 0.12;
        tl.fromTo(el, { autoAlpha: 0, y: 40 + rng() * 60 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "expo.out", immediateRender: false }, t);
        gsap.set(el, { autoAlpha: 0 });
        tl.to(el, { scale: 1.08, autoAlpha: 0, duration: 0.18, ease: "power2.in" }, start + dur * 0.86 + i * 0.02);
        return el;
      });
      // words on chips: 3 jumps on twos toward their slot in the line
      const line = h("div", { style: `position:absolute;left:50%;top:50%;font:500 ${fs}px var(--font-display);color:${ink};white-space:nowrap;line-height:1` });
      box.appendChild(line);
      line.textContent = words.join(" ");
      gsap.set(line, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
      const collapse = start + dur * 0.55;
      words.forEach((w, i) => {
        const chip = h("div", { style: `position:absolute;left:0;top:0;padding:${fs * 0.08}px ${fs * 0.17}px;background:#f7f7f7;font:500 ${fs}px var(--font-display);color:${ink};white-space:nowrap;line-height:1` }, w);
        box.appendChild(chip);
        gsap.set(chip, { autoAlpha: 0 });
        const ang = rng() * Math.PI * 2, R = 380 + rng() * 120;
        let x = 960 + Math.cos(ang) * R * 1.7 - 80, y = 540 + Math.sin(ang) * R - 40;
        const t0 = start + 0.08 + i * 0.1;
        tl.set(chip, { x, y, autoAlpha: 1 }, t0);
        for (let k = 1; k <= 3; k++) {
          x += (960 - 80 - x) * 0.32; y += (540 - 40 - y) * 0.32;
          tl.set(chip, { x: Math.round(x / 6) * 6, y: Math.round(y / 6) * 6 }, t0 + k * 2 * FR * 3);
        }
        tl.set(chip, { autoAlpha: 0 }, collapse);
      });
      tl.set(line, { autoAlpha: 1 }, collapse);
      tl.to(line, { scale: 1.15, duration: (p.then ? dur * 0.25 : end - collapse), ease: "none" }, collapse);
      if (p.then) {
        const s0 = start + dur * 0.8;
        tl.set(line, { scale: 1.2 }, s0);
        fx.scramble(tl, line, words.join(" "), p.then, s0, rng, { accent, ink });
      }
    },
  });

  EM.scene("type-behind", {
    ownsCamera: true,
    build(ctx) {
      const p = ctx.props, { tl, start, end } = ctx;
      const fs = p.size || 900;
      const box = h("div", { style: "position:absolute;inset:0;overflow:hidden" });
      ctx.cam.appendChild(box);
      if (p.src) box.appendChild(full(p.src));
      const word = h("div", { style: `position:absolute;left:4%;bottom:-${fs * 0.02}px;font:600 ${fs}px/0.8 var(--font-display);color:${p.color || "#060606"};white-space:nowrap;transform-origin:0 100%` }, p.word || "");
      box.appendChild(word);
      if (p.front) box.appendChild(h("img", { src: p.front, alt: "", style: "position:absolute;inset:0;width:100%;height:100%;object-fit:cover" }));
      // rises from below in ~9 frames, keeps drifting up and left until the cut
      tl.fromTo(word, { y: fs * 0.9, x: 200 }, { y: 0, x: 0, duration: 0.38, ease: "expo.out", immediateRender: false }, start);
      tl.to(word, { y: -fs * 0.08, x: -60, duration: Math.max(0.1, end - start - 0.38), ease: "none" }, start + 0.38);
    },
  });

  EM.scene("frame-grow", {
    ownsCamera: true,
    build(ctx) {
      const p = ctx.props, { tl, start, dur } = ctx;
      const ink = fx.cssVar(ctx.cam, "--fg") || "#1c1c1c";
      const accent = fx.cssVar(ctx.cam, "--accent") || "#a27ae7";
      const box = h("div", { style: "position:absolute;inset:0;overflow:hidden" });
      ctx.cam.appendChild(box);
      if (p.ghost) box.appendChild(h("div", { style: `position:absolute;left:2%;top:-6%;font:500 1220px/1 var(--font-display);color:${ink};opacity:0.06;white-space:nowrap` }, p.ghost));
      const fr = h("div", { style: "position:absolute;overflow:hidden" });
      const im = full(p.src); im.style.objectPosition = `${p.anchor ?? 75}% 50%`; fr.appendChild(im); box.appendChild(fr);
      const hs = [0, 1, 2, 3].map(() => { const d = h("div", { style: `position:absolute;left:0;top:0;width:22px;height:22px;background:${accent}` }); box.appendChild(d); return d; });
      const word = h("div", { style: `position:absolute;left:50%;top:0;font:600 132px var(--font-display);color:${ink};white-space:nowrap;line-height:1` }, p.word || "");
      box.appendChild(word);
      // measured: frame 586 -> 1785 px wide in three pushes, height 693 -> 663; word 132 -> 205 px, tracking 0 -> 45 px
      const KEY = [[0, 586, 693, 132, 0], [0.3, 640, 755, 150, 0], [0.33, 1100, 755, 192, 20], [0.45, 1190, 755, 209, 24], [0.68, 1265, 751, 209, 26], [0.75, 1716, 737, 205, 40], [0.82, 1785, 663, 205, 45]];
      KEY.forEach(([f, w, hgt, fs, ls], i) => {
        const t = start + dur * f;
        const x0 = 960 - w / 2, y0 = 196 + (693 - hgt) / 2 + (i > 5 ? 16 : 0);
        const v = { x: x0, y: y0, width: w, height: hgt };
        const d = i ? (dur * (f - KEY[i - 1][0])) : 0;
        if (!i) tl.set(fr, v, t); else tl.to(fr, { ...v, duration: Math.max(FR, d * 0.5), ease: "expo.out" }, t - d * 0.5);
        [[x0, y0], [x0 + w, y0], [x0, y0 + hgt], [x0 + w, y0 + hgt]].forEach(([x, y], k) => { if (!i) tl.set(hs[k], { x: x - 11, y: y - 11 }, t); else tl.to(hs[k], { x: x - 11, y: y - 11, duration: Math.max(FR, d * 0.5), ease: "expo.out" }, t - d * 0.5); });
        const wv = { fontSize: fs, letterSpacing: ls + "px", y: y0 + hgt - fs * 0.62, xPercent: -50 };
        if (!i) tl.set(word, wv, t); else tl.to(word, { ...wv, duration: Math.max(FR, d * 0.5), ease: "expo.out" }, t - d * 0.5);
      });
    },
  });
})();

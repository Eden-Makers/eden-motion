/* Media scenes: real imagery and footage staged like a launch film (Gemini / Lovable / Burnwe).
 *
 * media-frame (T8 liquid-glass frame, T9 full-bleed expand, T10 focus + tilt, M10 duotone grade)
 *   props: {
 *     src: "assets/x.jpg" | "assets/x.mp4",
 *     kind?: "image" | "video"        (default: inferred from the extension)
 *     mediaStart?: seconds into the video source (default 0)
 *     caption?: str, keyword?: str|[str], captionPos?: "below" | "side" (default "below")
 *     duotone?: bool (default true)   M10 gradient-map in --accent/--accent2, grades to natural
 *     expand?: bool                   T9: frame blows past the edges to full bleed at the end
 *     tilt?: bool (default true)      resting 3D tilt that slowly swings
 *     width?: px (default 1340, 1060 with captionPos "side")
 *   }
 *
 * montage (T23 flash cold open, T32 masonry wall pullback)
 *   props: {
 *     items: [paths] (6-14), mode?: "flash" | "wall" (default "flash"),
 *     interval?: s per flash frame (default 0.14, alternates +-0.02 like 4/3 frame cuts)
 *     text?: str, keyword?: str   flash: word that lands on the held last frame
 *     hero?: index of the full-frame start tile (wall, default 0)
 *     target?: index of the tile the camera pushes into at the end (wall, default 1)
 *   }
 *
 * orb-hero (M28 glass orb, M20 bloom white-out)
 *   props: { icon?: lucide name, glyph?: str, text?: str, keyword?: str, sub?: str, bloom?: bool }
 *
 * versus (M35 split, M34 counter + climbing line)
 *   props: {
 *     left:  { label, image?: path, items?: [str] },
 *     right: { label, value?: number, prefix?, suffix?, decimals?, from?, caption?, items?: [str] },
 *     expand?: bool (default true)    right side takes the full frame at the end
 *   }
 *
 * chat (AI assistant conversation card)
 *   props: {
 *     title?: str, placeholder?: str,
 *     messages: [{ from: "user" | "ai", text, chip?: { icon, label } }]
 *   }
 *   User lines are typed into the composer and sent; AI replies think (3 dots) then stream.
 */
(function () {
  const { h, fx } = window.EM;
  const SLOW = () => window.EM_SLOW || 1;

  // ---------- local helpers ----------
  function rgbOf(c, fallback = [0.5, 0.5, 0.5]) {
    if (!c) return fallback;
    c = c.trim();
    let m = c.match(/^#([0-9a-f]{3,8})$/i);
    if (m) {
      let x = m[1];
      if (x.length === 3) x = x.split("").map((k) => k + k).join("");
      return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16) / 255);
    }
    m = c.match(/rgba?\(([^)]+)\)/);
    if (m) return m[1].split(/[ ,/]+/).slice(0, 3).map((v) => parseFloat(v) / 255);
    return fallback;
  }
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const css = (rgb, a = 1) => `rgba(${rgb.map((v) => Math.round(v * 255)).join(",")},${a})`;

  // SVG gradient-map filter. set(p): p = 0 full duotone, 1 natural colour.
  function duotone(host, id, shadow, high) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    const f = document.createElementNS(ns, "filter");
    f.setAttribute("id", id);
    f.setAttribute("color-interpolation-filters", "sRGB");
    f.setAttribute("x", "0");
    f.setAttribute("y", "0");
    f.setAttribute("width", "1");
    f.setAttribute("height", "1");
    const cm = document.createElementNS(ns, "feColorMatrix");
    cm.setAttribute("type", "saturate");
    const ct = document.createElementNS(ns, "feComponentTransfer");
    const fn = ["R", "G", "B"].map((k) => {
      const e = document.createElementNS(ns, "feFunc" + k);
      e.setAttribute("type", "table");
      ct.appendChild(e);
      return e;
    });
    f.append(cm, ct);
    svg.appendChild(f);
    host.appendChild(svg);
    const set = (p) => {
      cm.setAttribute("values", String(p));
      fn.forEach((e, i) => e.setAttribute("tableValues", `${(shadow[i] * (1 - p)).toFixed(4)} ${(high[i] + (1 - high[i]) * p).toFixed(4)}`));
    };
    set(0);
    return { url: `url(#${id})`, set };
  }

  function isVideo(p) {
    return p.kind ? p.kind === "video" : /\.(mp4|mov|webm|m4v)$/i.test(p.src || "");
  }

  // HyperFrames owns playback: the element only declares its window. Times are scaled by
  // EM_SLOW so the source keeps real speed when the timeline is stretched for motion blur.
  let vidCount = 0;
  function mediaEl(ctx, p, cls) {
    if (!isVideo(p)) return h("img", { src: p.src, class: cls, alt: "" });
    const S = SLOW();
    const t0 = Math.max(0, ctx.start - 0.6);
    const d = ctx.end + 0.6 - t0;
    return h("video", {
      id: `em-media-v${ctx.index}-${vidCount++}`,
      src: p.src,
      class: cls,
      muted: "",
      playsinline: "",
      "data-start": (t0 * S).toFixed(3),
      "data-duration": (d * S).toFixed(3),
      "data-media-start": String(p.mediaStart || 0),
      "data-playback-rate": (1 / S).toFixed(4),
    });
  }

  // Finite sine bob in legs so nothing is dead still (no repeat:-1).
  function bob(tl, el, t0, t1, { amp = 8, period = 2.6, prop = "y", base = 0 } = {}) {
    let t = t0, k = 0;
    while (t < t1) {
      const d = Math.min(period / 2, t1 - t);
      tl.to(el, { [prop]: base + (k % 2 ? -amp : amp), duration: d, ease: "sine.inOut" }, t);
      t += d;
      k++;
    }
  }

  // ======================================================================
  // media-frame
  // ======================================================================
  EM.scene("media-frame", {
    ownsCamera: true,
    build(ctx) {
      const p = ctx.props;
      const { tl, start, end, dur, index } = ctx;
      const side = p.caption && p.captionPos === "side";
      const W = p.width || (side ? 1060 : 1340);
      const H = Math.round((W * 9) / 16);
      const R = Math.round(H * 0.18);
      const T = Math.round(H * 0.034); // glass rim thickness

      const stage = h("div", { class: "mf-stage" });
      const rig = h("div", { class: "mf-rig" });
      const frame = h("div", { class: "mf-frame", style: { width: W + "px", height: H + "px", borderRadius: R + "px" } });
      const content = h("div", { class: "mf-content", style: { borderRadius: R + "px" } });
      const refract = h("div", { class: "mf-refract" }, mediaEl(ctx, p, "mf-media"));
      const kb = h("div", { class: "mf-kb" }, mediaEl(ctx, p, "mf-media"));
      const inner = h("div", { class: "mf-inner", style: { inset: T + "px", borderRadius: R - T * 0.7 + "px" } }, kb);
      content.append(refract, inner);
      const rim = h("div", { class: "mf-rim", style: { borderRadius: R + "px", borderWidth: T + 4 + "px" } });
      const spec = h("div", { class: "mf-spec", style: { borderRadius: R + "px" } });
      const glint = h("div", { class: "mf-glint", style: { borderRadius: R + "px" } });
      frame.append(content, rim, spec, glint);
      const glow = h("div", { class: "mf-glow", style: { width: W + "px", height: H + "px", borderRadius: R + "px" } });
      rig.append(glow, frame);
      stage.appendChild(rig);
      ctx.cam.appendChild(stage);

      // M10 duotone grade in brand colours.
      let duo = null;
      if (p.duotone !== false) {
        const a = rgbOf(fx.cssVar(ctx.el, "--accent"), [0.36, 0.36, 0.97]);
        const b = rgbOf(fx.cssVar(ctx.el, "--accent2"), [0.9, 0.3, 0.75]);
        duo = duotone(ctx.el, `mfduo${index}`, mix(a, [0, 0, 0], 0.55), mix(b, [1, 1, 1], 0.25));
        content.style.filter = duo.url;
      }

      // Caption
      let capWords = [];
      let cap = null;
      if (p.caption) {
        cap = h("div", { class: "mf-caption em-display" + (side ? " side" : "") });
        capWords = fx.splitWords(cap, p.caption, { keyword: p.keyword });
        stage.appendChild(cap);
      }
      const restX = side ? -330 : 0;
      const restY = p.caption && !side ? -70 : 0;
      if (cap && side) Object.assign(cap.style, { left: 960 + restX + W / 2 + 90 + "px", top: "50%", transform: "translateY(-50%)" });
      if (cap && !side) Object.assign(cap.style, { left: "50%", top: 540 + restY + H / 2 + 60 + "px", transform: "translateX(-50%)" });

      const tilt = p.tilt !== false;
      const t0 = start + 0.05;
      // Arrival: focus pull from depth with a 3D tilt (T10 feel, M8 law: no overshoot).
      tl.fromTo(
        rig,
        { x: restX, y: restY + 90, z: -260, rotationX: tilt ? 16 : 0, rotationY: tilt ? -22 : 0, rotationZ: tilt ? -3 : 0, opacity: 0, filter: "blur(18px)" },
        { x: restX, y: restY, z: 0, rotationX: tilt ? 5 : 0, rotationY: tilt ? -9 : 0, rotationZ: 0, opacity: 1, filter: "blur(0px)", duration: 1.1, ease: "expo.out" },
        t0
      );
      tl.fromTo(glow, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 1.4, ease: "power2.out" }, t0 + 0.1);
      // Resting swing: the glass slowly turns toward camera.
      const swingEnd = p.expand ? end - 0.6 : end + 0.3;
      if (tilt) tl.to(rig, { rotationY: 7, rotationX: 2, z: 60, duration: Math.max(0.5, swingEnd - (t0 + 1.1)), ease: "sine.inOut" }, t0 + 1.1);
      else tl.to(rig, { z: 80, duration: Math.max(0.5, swingEnd - (t0 + 1.1)), ease: "sine.inOut" }, t0 + 1.1);

      // Ken Burns on the footage, the refracted rim copy rides along magnified.
      const kbD = end + 0.4 - t0;
      tl.fromTo(kb, { scale: 1.16, xPercent: -2 }, { scale: 1.02, xPercent: 2, duration: kbD, ease: "none" }, t0);
      tl.fromTo(refract, { scale: 1.48, xPercent: -3 }, { scale: 1.3, xPercent: 3, duration: kbD, ease: "none" }, t0);
      // Glint sweeps once across the glass as it lands.
      tl.fromTo(glint, { backgroundPosition: "130% 0%" }, { backgroundPosition: "-40% 0%", duration: 1.3, ease: "power2.inOut" }, t0 + 0.55);
      // The glass breathes (T8): rim swells a touch.
      bob(tl, spec, t0 + 1.1, swingEnd, { amp: 0.25, base: 0.75, period: 3.2, prop: "opacity" });
      tl.set(spec, { opacity: 1 }, t0);

      if (duo) {
        const pr = { v: 0 };
        tl.fromTo(pr, { v: 0 }, { v: 1, duration: 0.55, ease: "power2.out", onUpdate: () => duo.set(pr.v) }, t0 + 0.62);
      }

      if (cap) {
        const times = onsets(ctx, String(p.caption).split(/\s+/).filter(Boolean), { lead: 0.05, from: 0.7, to: 0.72 });
        fx.riseInAt(tl, capWords, times.map((x) => Math.max(x, t0 + 0.55)));
      }

      if (p.expand) {
        // T9: frame blows past the edges, rim leaves the frame, footage ends full bleed.
        const te = end - 0.55;
        if (cap) fx.focusOut(tl, cap, te - 0.25);
        tl.to(glow, { opacity: 0, duration: 0.3, ease: "power2.in" }, te);
        tl.to(rig, { x: 0, y: 0, z: 0, rotationX: 0, rotationY: 0, rotationZ: 0, duration: 0.55, ease: "expo.in" }, te);
        tl.to(frame, { width: 1920 * 1.34, height: 1080 * 1.34, duration: 0.55, ease: "expo.in" }, te);
      }
    },
  });

  // ======================================================================
  // montage
  // ======================================================================
  EM.scene("montage", {
    ownsCamera: true,
    build(ctx) {
      const p = ctx.props;
      const items = (p.items || []).filter(Boolean);
      if (!items.length) return;
      if ((p.mode || "flash") === "wall") return wall(ctx, items);
      return flash(ctx, items);
    },
  });

  function flash(ctx, items) {
    const p = ctx.props;
    const { tl, start, end } = ctx;
    const box = h("div", { class: "mo-flash" });
    ctx.cam.appendChild(box);
    const base = Math.min(0.2, Math.max(0.12, p.interval || 0.14));
    const imgs = items.map((src) => {
      const im = h("img", { src, class: "mo-full", alt: "" });
      box.appendChild(im);
      gsap.set(im, { opacity: box.children.length === 1 ? 1 : 0 });
      return im;
    });
    let t = start;
    imgs.forEach((im, i) => {
      const last = i === imgs.length - 1;
      const d = last ? end + 0.4 - t : base + (i % 2 ? -0.02 : 0.02);
      tl.set(im, { opacity: 1 }, t);
      if (i > 0) tl.set(imgs[i - 1], { opacity: 0 }, t);
      // each flash frame breathes, the held frame keeps pushing in
      tl.fromTo(im, { scale: last ? 1.0 : 1.06 }, { scale: last ? 1.1 : 1.0, duration: d, ease: last ? "power1.out" : "none" }, t);
      t += d;
    });
    const holdAt = start + imgs.slice(0, -1).reduce((s, _, i) => s + base + (i % 2 ? -0.02 : 0.02), 0);
    // A short exposure kick on the hold so the landing reads as a beat.
    const flashEl = h("div", { class: "mo-kick" });
    box.appendChild(flashEl);
    gsap.set(flashEl, { opacity: 0 });
    tl.fromTo(flashEl, { opacity: 0.5 }, { opacity: 0, duration: 0.35, ease: "power2.out", immediateRender: false }, holdAt);
    if (p.text) {
      box.appendChild(h("div", { class: "mo-shade" }));
      const word = h("div", { class: "em-display mo-word" });
      const ws = fx.splitWords(word, p.text, { keyword: p.keyword });
      box.appendChild(word);
      tl.fromTo(box.querySelector(".mo-shade"), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out", immediateRender: false }, holdAt);
      fx.riseIn(tl, ws, holdAt + 0.08, { y: 30, blur: 18, stagger: 0.07, dur: 0.6 });
      tl.fromTo(word, { scale: 1.06 }, { scale: 1, duration: end + 0.3 - holdAt, ease: "power2.out" }, holdAt);
    }
  }

  function wall(ctx, items) {
    const p = ctx.props;
    const { tl, start, end, dur, rng } = ctx;
    const TW = 1920, GAP = 56, RAD = 40;
    const COLS = 5;
    const heights = [1080, 1350, 900, 1200, 1080, 1440];
    const wallEl = h("div", { class: "mo-wall" });
    const view = h("div", { class: "mo-view" }, wallEl);
    ctx.cam.appendChild(view);
    let k = 0;
    const tiles = [];
    const heroIdx = (p.hero || 0) % items.length;
    // Build columns of tiles; column 2, row 1 is the hero (exactly 1920x1080).
    const cols = [];
    for (let c = 0; c < COLS; c++) {
      const col = [];
      let y = -(rng() * 700 + 200) - (c === 2 ? 0 : 0);
      for (let r = 0; r < 5; r++) {
        const hero = c === 2 && r === 1;
        const th = hero ? 1080 : heights[Math.floor(rng() * heights.length)];
        col.push({ x: c * (TW + GAP), y, w: TW, h: th, hero });
        y += th + GAP;
      }
      cols.push(col);
    }
    // align hero tile so it sits at wall y = 0
    const hero0 = cols[2][1];
    const shift = -hero0.y;
    cols.forEach((col) => col.forEach((t) => (t.y += shift)));
    // assign images: hero gets heroIdx, others cycle the rest deterministically
    const order = items.map((_, i) => i).filter((i) => i !== heroIdx);
    cols.flat().forEach((t) => {
      const src = t.hero ? items[heroIdx] : items[order[k++ % Math.max(1, order.length)] ?? heroIdx];
      const el = h("div", { class: "mo-tile", style: { left: t.x + "px", top: t.y + "px", width: t.w + "px", height: t.h + "px", borderRadius: RAD + "px" } }, h("img", { src, alt: "" }));
      wallEl.appendChild(el);
      t.el = el;
      tiles.push(t);
    });
    // Target tile: nearest neighbour column (3), the tile whose centre is closest to y=540.
    const tgtCol = cols[(p.targetCol ?? 3) % COLS];
    let tgt = tgtCol.reduce((b, t) => (Math.abs(t.y + t.h / 2 - 540) < Math.abs(b.y + b.h / 2 - 540) ? t : b), tgtCol[0]);
    if (p.target != null) {
      const ti = p.target % items.length;
      const want = tiles.find((t) => !t.hero && t.el.querySelector("img").getAttribute("src") === items[ti] && Math.abs(t.x - hero0.x) <= TW + GAP);
      if (want) tgt = want;
      else tgt.el.querySelector("img").setAttribute("src", items[ti]);
    }
    const heroEl = tiles.find((t) => t.hero);
    // camera = (cx, cy, s): wall point (cx,cy) at frame centre. x/y/scale tweens with the same
    // ease keep the focal point pinned (x is linear in s for a fixed focal point).
    const camAt = (cx, cy, s) => ({ x: 960 - cx * s, y: 540 - cy * s, scale: s });
    const hc = { x: heroEl.x + TW / 2, y: heroEl.y + heroEl.h / 2 };
    const tc = { x: tgt.x + tgt.w / 2, y: tgt.y + tgt.h / 2 };
    // target fills the frame: cover scale
    const sT = Math.max(1920 / tgt.w, 1080 / tgt.h);
    const S0 = 0.42;
    const tPull = start + 0.35, dPull = 0.95;
    const tPush = end - 0.62, dPush = 0.6;
    // wide framing drifts from the hero toward the target while wide
    const w1 = { x: hc.x + (tc.x - hc.x) * 0.15, y: hc.y + (tc.y - hc.y) * 0.1 };
    const w2 = { x: hc.x + (tc.x - hc.x) * 0.72, y: hc.y + (tc.y - hc.y) * 0.72 };
    gsap.set(wallEl, { transformOrigin: "0 0", ...camAt(hc.x, hc.y, 1) });
    const tA = Math.max(0, start - 0.3);
    tl.fromTo(wallEl, camAt(hc.x, hc.y, 1.05), { ...camAt(hc.x, hc.y, 1), duration: tPull - tA, ease: "power2.out" }, tA);
    // Pull back: focal point glides from hero to w1 while scaling (power3.inOut on all channels).
    tl.fromTo(wallEl, camAt(hc.x, hc.y, 1), { ...camAt(w1.x, w1.y, S0), duration: dPull, ease: "power3.inOut", immediateRender: false }, tPull);
    tl.fromTo(wallEl, camAt(w1.x, w1.y, S0), { ...camAt(w2.x, w2.y, S0 * 1.05), duration: tPush - (tPull + dPull), ease: "sine.inOut", immediateRender: false }, tPull + dPull);
    tl.fromTo(wallEl, camAt(w2.x, w2.y, S0 * 1.05), { ...camAt(tc.x, tc.y, sT * 1.02), duration: dPush, ease: "expo.in", immediateRender: false }, tPush);
    // focus pull on arrival, hero tile un-rounds as it fills the frame
    tl.fromTo(view, { filter: "blur(14px)" }, { filter: "blur(0px)", duration: 0.45, ease: "power3.out" }, Math.max(0, start - 0.05));
    // Depth: other tiles sit slightly dimmer, brighten as the wall is revealed.
    const others = tiles.filter((t) => !t.hero).map((t) => t.el);
    tl.fromTo(others, { opacity: 0.35 }, { opacity: 1, duration: 0.8, ease: "power2.out", stagger: { each: 0.015, from: "center" } }, tPull + 0.2);
    // Rack focus on the push: everything but the target defocuses.
    const nonTarget = [...wallEl.children].filter((e) => e !== tgt.el);
    tl.to(wallEl.querySelectorAll(".mo-tile img"), { scale: 1.06, duration: end - tPull, ease: "none" }, tPull);
    tl.to(nonTarget, { opacity: 0.5, duration: dPush * 0.8, ease: "power2.in" }, tPush);
    (EM.cues = EM.cues || []).push({ t: tPull, type: "whoosh", dur: dPull }, { t: tPush, type: "whoosh", dur: dPush });
  }

  // ======================================================================
  // orb-hero
  // ======================================================================
  EM.scene("orb-hero", {
    build(ctx) {
      const p = ctx.props;
      const { tl, start, end, dur, rng, index } = ctx;
      const wrap = h("div", { class: "orb-wrap" });
      const orbBox = h("div", { class: "orb-box" });
      const halo = h("div", { class: "orb-halo", "data-layout-allow-overflow": "" });
      const ring1 = h("div", { class: "orb-ring r1" });
      const ring2 = h("div", { class: "orb-ring r2" });
      const orb = h("div", { class: "orb" });
      const swirl = h("div", { class: "orb-swirl" });
      const spec = h("div", { class: "orb-spec" });
      const rimL = h("div", { class: "orb-rimlight" });
      const glyph = h("div", { class: "orb-glyph" });
      if (p.icon) glyph.appendChild(EM.icon(p.icon, 150));
      else if (p.glyph) glyph.textContent = p.glyph;
      orb.append(swirl, glyph, rimL, spec);
      const shadow = h("div", { class: "orb-floor" });
      orbBox.append(halo, ring1, ring2, shadow, orb);
      wrap.appendChild(orbBox);
      // dust: a few soft motes drifting around the orb
      const motes = [];
      for (let i = 0; i < 14; i++) {
        const a = rng() * Math.PI * 2, r = 280 + rng() * 520;
        const sz = 4 + rng() * 8;
        const m = h("div", { class: "orb-mote", style: { left: Math.cos(a) * r * 1.5 + "px", top: Math.sin(a) * r * 0.7 + "px", width: sz + "px", height: sz + "px" } });
        orbBox.appendChild(m);
        motes.push({ m, o: 0.25 + rng() * 0.5, dx: (rng() - 0.5) * 120, dy: -30 - rng() * 90 });
      }
      let head = null, sub = null;
      if (p.text) {
        head = h("div", { class: "em-display orb-head" });
        wrap.appendChild(head);
      }
      if (p.sub) {
        sub = h("div", { class: "em-sub orb-sub" }, p.sub);
        wrap.appendChild(sub);
      }
      ctx.cam.appendChild(wrap);
      if (!p.text) gsap.set(orbBox, { y: 60 });

      const t0 = start + 0.08;
      tl.fromTo(orb, { scale: 0.45, opacity: 0, filter: "blur(26px) brightness(1.6)" }, { scale: 1, opacity: 1, filter: "blur(0px) brightness(1)", duration: 1.0, ease: "expo.out" }, t0);
      tl.fromTo(halo, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.4, ease: "power2.out" }, t0 + 0.05);
      tl.fromTo([ring1, ring2], { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: "expo.out", stagger: 0.12 }, t0 + 0.2);
      tl.fromTo(ring1, { rotationZ: -8 }, { rotationZ: 22, duration: end + 0.4 - t0, ease: "none" }, t0);
      tl.fromTo(ring2, { rotationZ: 14 }, { rotationZ: -18, duration: end + 0.4 - t0, ease: "none" }, t0);
      tl.fromTo(swirl, { rotation: 0 }, { rotation: 140, duration: end + 0.4 - t0, ease: "none" }, t0);
      tl.fromTo(glyph, { scale: 0.5, opacity: 0, filter: "blur(12px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.55, ease: "expo.out" }, t0 + 0.4);
      tl.fromTo(shadow, { opacity: 0 }, { opacity: 1, duration: 1, ease: "power2.out" }, t0 + 0.2);
      tl.fromTo(motes.map((x) => x.m), { opacity: 0 }, { opacity: (i) => motes[i].o, duration: 1.2, stagger: 0.04, ease: "power2.out" }, t0 + 0.3);
      motes.forEach((x) => tl.to(x.m, { x: x.dx, y: x.dy, duration: end + 0.4 - t0, ease: "none" }, t0));
      // bob (M28: +-6..8 px over ~3 s) on the orb and a counter-bob on its floor shadow
      bob(tl, orb, t0 + 0.9, end + 0.3, { amp: 9, period: 2.8 });
      bob(tl, shadow, t0 + 0.9, end + 0.3, { amp: 0.08, base: 1, period: 2.8, prop: "scaleX" });
      gsap.set(shadow, { scaleX: 1 });

      let hEnd = t0 + 1;
      if (head) {
        const words = String(p.text).split(/\s+/).filter(Boolean);
        const vt = onsets(ctx, words, { lead: 0.02, from: 0.55, to: 0.4 });
        hEnd = fx.hotType(tl, head, p.text, Math.max(vt[0], t0 + 0.6), { wordTimes: vt.map((x) => Math.max(x, t0 + 0.6)), keyword: p.keyword });
        // keyword chars carry the accent gradient across the word
        const A = rgbOf(fx.cssVar(head, "--accent")), B = rgbOf(fx.cssVar(head, "--accent2"));
        head.querySelectorAll(".em-kw").forEach((w) => {
          const cs = [...w.querySelectorAll(".em-char")];
          cs.forEach((c, i) => (c.style.color = css(mix(A, B, cs.length > 1 ? i / (cs.length - 1) : 0))));
        });
        tl.fromTo(head, { scale: 1.04 }, { scale: 1, duration: end - t0, ease: "power2.out" }, t0 + 0.6);
      }
      if (sub) fx.focusIn(tl, sub, hEnd + 0.1, { y: 14 });

      if (p.bloom) {
        // M20: orb over-brightens, frame edges flush accent, white floods out of the orb.
        // The white must own the whole frame. Transitions that scale or move this scene
        // (zoom, push, whip, iris, card-drop) would turn it into a white card, so with those
        // the bloom becomes a flash that peaks and decays before the transition starts.
        const next = (ctx.sb.scenes || [])[index + 1];
        const nt = next ? (next.transition && next.transition.type) || "cut" : "cut";
        const nd = next && next.transition ? next.transition.duration || 0.6 : 0;
        const holdWhite = ["cut", "blur-dissolve", "wipe"].includes(nt);
        const tPeak = holdWhite ? end - (nt === "cut" ? 0.08 : nd / 2) : end - nd / 2 - 0.34;
        const tb = tPeak - 0.62;
        const edge = h("div", { class: "orb-edge" });
        const white = h("div", { class: "orb-white" });
        ctx.el.appendChild(edge);
        ctx.cam.appendChild(white); // rides the camera drift so it opens exactly from the orb
        const exits = [head, sub].filter(Boolean);
        if (exits.length) fx.focusOut(tl, exits, tb - 0.1);
        tl.to(orb, { filter: "blur(0px) brightness(2.6)", scale: 1.22, duration: 0.32, ease: "power2.in" }, tb);
        tl.to(halo, { scale: 1.7, opacity: 1, duration: 0.32, ease: "power2.in" }, tb);
        tl.fromTo(edge, { opacity: 0 }, { opacity: 0.85, duration: 0.22, ease: "power2.in", immediateRender: false }, tb + 0.08);
        const oc = fx.layoutCenter(orb, ctx.cam);
        const X = oc.x + 400, Y = oc.y + 400; // .orb-white is inset -400px inside the camera box
        white.style.webkitMaskImage = white.style.maskImage = `radial-gradient(circle at ${X}px ${Y}px, #000 calc(var(--r) * 1px), transparent calc(var(--r) * 1px + 360px))`;
        gsap.set(white, { "--r": -360, opacity: 1 });
        tl.fromTo(white, { "--r": -360 }, { "--r": 2700, duration: tPeak - (tb + 0.22), ease: "expo.in", immediateRender: false }, tb + 0.22);
        tl.fromTo(white, { backgroundSize: "100% 100%" }, { backgroundSize: "260% 260%", duration: 0.8, ease: "power2.out", immediateRender: false }, tPeak - 0.1);
        (EM.cues = EM.cues || []).push({ t: tb + 0.22, type: "whoosh", dur: 0.4 });
        if (!holdWhite) {
          // flash decays into an empty, glowing frame; the transition then moves nothing but light
          tl.set([orb, ring1, ring2, shadow, ...motes.map((x) => x.m)], { autoAlpha: 0 }, tPeak);
          tl.to(white, { opacity: 0, duration: 0.3, ease: "power2.out" }, tPeak + 0.02);
          tl.to(edge, { opacity: 0.25, duration: 0.3, ease: "power2.out" }, tPeak + 0.02);
          tl.to(halo, { opacity: 0.35, scale: 2.2, duration: 0.3, ease: "power2.out" }, tPeak + 0.02);
        }
      }
    },
  });

  // VO-synced onsets for on-screen tokens: fx.alignTimes when the runtime has it, else even spacing.
  function onsets(ctx, tokens, fb = {}) {
    if (fx.alignTimes && (ctx.words || []).length) return fx.alignTimes(ctx, tokens);
    return fx.wordTimes({ ...ctx, words: [] }, tokens.length, fb);
  }

  // ======================================================================
  // versus
  // ======================================================================
  EM.scene("versus", {
    ownsCamera: true,
    build(ctx) {
      const p = ctx.props;
      const L = p.left || {}, Rr = p.right || {};
      const { tl, start, end, index } = ctx;
      const hasValue = Rr.value != null && Rr.value !== "";
      const root = h("div", { class: "vs-root" + (hasValue ? " has-value" : " no-value") });
      root.style.setProperty("--split", "50%");
      const left = h("div", { class: "vs-left" });
      const right = h("div", { class: "vs-right" });
      const divider = h("div", { class: "vs-divider" });
      root.append(left, right, divider);
      ctx.cam.appendChild(root);

      // LEFT: duotone that never grades (M35), dull and desaturated.
      const lInner = h("div", { class: "vs-left-in" });
      left.appendChild(lInner);
      let lImg = null;
      if (L.image) {
        lImg = h("img", { src: L.image, class: "vs-img", alt: "" });
        lInner.appendChild(lImg);
        const acc = rgbOf(fx.cssVar(ctx.el, "--accent"), [0.36, 0.36, 0.97]);
        const d = duotone(ctx.el, `vsduo${index}`, [0.03, 0.03, 0.06], mix([0.62, 0.6, 0.66], acc, 0.18));
        lImg.style.filter = d.url;
      }
      lInner.appendChild(h("div", { class: "vs-left-shade" }));
      const lCol = h("div", { class: "vs-col" });
      const lLabel = h("div", { class: "vs-label dim" }, L.label || "");
      const lItems = (L.items || []).slice(0, 4).map((t) => h("div", { class: "vs-item dim" }, h("span", { class: "vs-x" }, EM.icon("x", 34)), h("span", {}, t)));
      lCol.append(lLabel, ...lItems);
      lInner.appendChild(lCol);

      // RIGHT: clean light panel. With a value: counter + climbing line (M34). Without: a big
      // checklist is the hero.
      const rInner = h("div", { class: "vs-right-in" });
      right.appendChild(rInner);
      const rCol = h("div", { class: "vs-rcol" });
      const rLabel = h("div", { class: "vs-label hot" }, Rr.label || "");
      rCol.appendChild(rLabel);
      let num = null, cap = null;
      if (hasValue) {
        num = h("div", { class: "em-display vs-num" });
        rCol.appendChild(num);
      }
      if (Rr.caption) rCol.appendChild((cap = h("div", { class: "vs-cap" }, Rr.caption)));
      const rItems = (Rr.items || []).slice(0, hasValue ? 3 : 4).map((t) => h("div", { class: "vs-item" }, h("span", { class: "vs-check" }, EM.icon("check", 30)), h("span", {}, t)));
      if (rItems.length) rCol.append(h("div", { class: "vs-items" }, ...rItems));
      let chart = null;
      if (hasValue) {
        const gid = `vsg${index}`;
        chart = h("div", {
          class: "vs-chart",
          html: `<svg viewBox="0 0 1200 420" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible"><defs>
          <linearGradient id="${gid}l" x1="0" x2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent2)"/></linearGradient>
          <linearGradient id="${gid}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent2)" stop-opacity="0.3"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient>
          <clipPath id="${gid}c"><rect x="0" y="-60" width="0" height="560"/></clipPath></defs>
          <path class="vs-area" d="M0 400 C 240 396, 420 380, 620 330 S 960 190, 1200 30 L 1200 420 L 0 420 Z" fill="url(#${gid}a)" clip-path="url(#${gid}c)"/>
          <path class="vs-line" d="M0 400 C 240 396, 420 380, 620 330 S 960 190, 1200 30" fill="none" stroke="url(#${gid}l)" stroke-width="14" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
          </svg><div class="vs-puck"></div>`,
        });
        rInner.appendChild(chart);
      }
      rInner.appendChild(rCol);

      // Everything readable within ~0.4 s, then the split moves and the metric keeps running.
      const t0 = start + 0.02;
      tl.fromTo(lInner, { opacity: 0, scale: 1.08, filter: "blur(16px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.45, ease: "power3.out" }, t0);
      tl.fromTo(rInner, { opacity: 0, scale: 1.06, filter: "blur(16px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.45, ease: "power3.out" }, t0 + 0.04);
      if (lImg) tl.fromTo(lImg, { scale: 1.12 }, { scale: 1.0, duration: end + 0.3 - t0, ease: "none" }, t0);
      tl.fromTo(divider, { scaleY: 0 }, { scaleY: 1, duration: 0.45, ease: "expo.out" }, t0 + 0.05);
      fx.focusIn(tl, [lLabel, rLabel], t0 + 0.08, { stagger: 0.08, y: 10, dur: 0.36 });
      if (lItems.length) fx.focusIn(tl, lItems, t0 + 0.18, { stagger: 0.1, y: 14, blur: 12, dur: 0.38 });
      const tSplit = t0 + 0.6;
      tl.fromTo(root, { "--split": "50%" }, { "--split": "42%", duration: 0.3, ease: "power3.out" }, tSplit);
      if (lItems.length) tl.to(lItems, { opacity: 0.55, duration: 0.6, ease: "power2.out", stagger: 0.08 }, tSplit + 0.6);

      const tRun = t0 + 0.22;
      if (hasValue) {
        const line = chart.querySelector(".vs-line");
        const clipRect = chart.querySelector("clipPath rect");
        const puck = chart.querySelector(".vs-puck");
        const len = line.getTotalLength();
        gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
        const pr = { v: 0 };
        const place = () => {
          const pt = line.getPointAtLength(len * pr.v);
          line.style.strokeDashoffset = len * (1 - pr.v);
          clipRect.setAttribute("width", pt.x.toFixed(1));
          const px = (pt.x / 1200) * chart.clientWidth, py = (pt.y / 420) * chart.clientHeight;
          puck.style.transform = `translate(${(px - 24).toFixed(1)}px, ${(py - 24).toFixed(1)}px)`;
        };
        place();
        // M34: the whole clause, number linear (keeps moving), line power1.in (steepens)
        tl.fromTo(pr, { v: 0 }, { v: 1, duration: end + 0.25 - tRun, ease: "power1.in", onUpdate: place }, tRun);
        tl.fromTo(chart, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" }, tRun);
        tl.fromTo(num, { opacity: 0, filter: "blur(16px)", y: 30 }, { opacity: 1, filter: "blur(0px)", y: 0, duration: 0.4, ease: "power3.out" }, tRun - 0.08);
        const to = Number(Rr.value) || 0;
        fx.countUp(tl, num, to, tRun, { from: Rr.from != null ? Number(Rr.from) : Math.round(to * 0.25), prefix: Rr.prefix || "", suffix: Rr.suffix || "", decimals: Rr.decimals || 0, dur: end + 0.25 - tRun, ease: "none" });
      }
      if (cap) fx.focusIn(tl, cap, tRun + 0.08, { y: 10, dur: 0.36 });
      if (rItems.length) fx.focusIn(tl, rItems, tRun + 0.12, { stagger: 0.1, y: 14, blur: 12, dur: 0.38 });

      if (p.expand !== false) {
        const tExp = end - 0.5;
        tl.to(root, { "--split": "0%", duration: 0.42, ease: "power3.inOut" }, tExp);
        tl.to(lCol, { x: -160, opacity: 0, filter: "blur(10px)", duration: 0.3, ease: "power2.in" }, tExp);
        tl.to(divider, { opacity: 0, duration: 0.3, ease: "power2.in" }, tExp + 0.15);
        tl.to(rCol, { scale: 1.06, duration: 0.6, ease: "power3.inOut" }, tExp);
      }
      // camera: slow push, never still
      tl.fromTo(root, { scale: 1.0 }, { scale: 1.04, duration: end + 0.3 - start, ease: "none" }, start - 0.1);
    },
  });

  // ======================================================================
  // chat
  // ======================================================================
  // Layout is never animated (only opacity, transforms and clip-path), so every measurement
  // is taken lazily inside tweens after webfonts have loaded, never at build time.
  EM.scene("chat", {
    ownsCamera: true,
    build(ctx) {
      const p = ctx.props;
      const { tl, start, end } = ctx;
      const msgs = (p.messages || []).slice(0, 6);
      const stage = h("div", { class: "chat-stage" });
      const rig = h("div", { class: "chat-rig" });
      const card = h("div", { class: "chat-card em-card" });
      const head = h("div", { class: "chat-head" }, h("div", { class: "chat-av big" }), h("div", { class: "chat-title" }, p.title || ""), h("div", { class: "chat-live" }));
      const viewport = h("div", { class: "chat-view" });
      const list = h("div", { class: "chat-list" });
      viewport.appendChild(list);
      const ph = h("div", { class: "chat-ph" }, p.placeholder || "");
      const inputBox = h("div", { class: "chat-input" }, ph);
      const send = h("div", { class: "chat-send", html: '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
      const composer = h("div", { class: "chat-composer" }, inputBox, send);
      card.append(head, viewport, composer);
      rig.appendChild(card);
      stage.appendChild(rig);
      ctx.cam.appendChild(stage);

      const rows = msgs.map((m) => {
        const ai = m.from !== "user";
        const row = h("div", { class: "chat-row " + (ai ? "ai" : "user") });
        const bubble = h("div", { class: "chat-bubble" });
        const txt = h("div", { class: "chat-text" });
        const words = fx.splitWords(txt, m.text || "");
        bubble.appendChild(txt);
        let chip = null;
        if (m.chip) {
          chip = h("div", { class: "chat-chip" }, EM.icon(m.chip.icon || "file-text", 32), h("span", {}, m.chip.label || ""));
          bubble.appendChild(chip);
        }
        let dots = null, av = null;
        if (ai) {
          dots = h("div", { class: "chat-dots" }, h("i"), h("i"), h("i"));
          av = h("div", { class: "chat-av" });
          row.append(av, h("div", { class: "chat-bwrap" }, bubble, dots));
        } else row.appendChild(bubble);
        list.appendChild(row);
        return { m, ai, row, bubble, txt, words, chip, dots, av };
      });
      gsap.set(rows.map((r) => r.row), { opacity: 0 });

      // Card arrival + perpetual camera
      const t0 = start + 0.05;
      tl.fromTo(rig, { y: 160, z: -300, rotationX: 22, rotationY: -16, opacity: 0, filter: "blur(18px)" }, { y: 0, z: 0, rotationX: 7, rotationY: -10, opacity: 1, filter: "blur(0px)", duration: 1.0, ease: "expo.out" }, t0);
      tl.to(rig, { rotationX: 3, rotationY: 6, duration: Math.max(0.5, end + 0.3 - (t0 + 1.0)), ease: "sine.inOut" }, t0 + 1.0);
      tl.fromTo(stage, { scale: 0.95 }, { scale: 1.1, duration: end + 0.3 - start, ease: "power1.inOut" }, start - 0.1);

      // scroll so a row's (partial) bottom sits at the viewport bottom; measured lazily
      const scrollTo = (row, extra, at, d) =>
        tl.to(list, { y: () => Math.min(0, viewport.clientHeight - (row.offsetTop + (extra == null ? row.offsetHeight : extra())) - 10), duration: d, ease: "power3.out" }, at);

      // Message onsets follow the VO (first word of each message) when there is one.
      const vo = (ctx.words || []).length ? onsets(ctx, rows.map((r) => String(r.m.text || "").split(/\s+/)[0])) : [];
      let t = t0 + 0.6;
      const HOT = fx.cssVar(card, "--accent"), BASE = fx.cssVar(card, "--card-fg");
      rows.forEach((r, i) => {
        if (vo[i] != null) t = Math.max(t, vo[i] - 0.3);
        if (!r.ai) {
          // type into the composer, click send, bubble lifts into the thread
          const tt = Math.min(1.0, Math.max(0.45, r.m.text.length / 46));
          const inputText = h("div", { class: "chat-input-text" });
          inputBox.appendChild(inputText);
          tl.to(ph, { opacity: 0, duration: 0.1 }, t);
          fx.typeText(tl, inputText, r.m.text, t, { dur: tt, caret: false });
          const ts = t + tt + 0.12;
          tl.to(send, { scale: 0.9, duration: 0.08, ease: "power2.in" }, ts).to(send, { scale: 1, duration: 0.22, ease: "power2.out" }, ts + 0.08);
          (EM.cues = EM.cues || []).push({ t: ts, type: "click" });
          tl.to(inputText, { opacity: 0, y: -20, duration: 0.12, ease: "power2.in" }, ts + 0.06);
          tl.to(ph, { opacity: 1, duration: 0.2 }, ts + 0.2);
          tl.fromTo(r.row, { opacity: 0, y: 70, scale: 0.96, filter: "blur(12px)" }, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.5, ease: "expo.out", immediateRender: false }, ts + 0.08);
          scrollTo(r.row, null, ts + 0.08, 0.5);
          t = ts + 0.55;
          return;
        }
        // AI: finite thinking dots, then the bubble opens from the dots and text streams in
        tl.set(r.row, { opacity: 1 }, t);
        gsap.set(r.bubble, { opacity: 0 });
        tl.fromTo(r.dots, { opacity: 0, scale: 0.7, filter: "blur(8px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.3, ease: "expo.out", immediateRender: false }, t);
        tl.fromTo(r.av, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.35, ease: "expo.out", immediateRender: false }, t);
        const DOTS_H = 84, DOTS_W = 150;
        scrollTo(r.row, () => DOTS_H, t, 0.45);
        const think = 0.72;
        const ds = r.dots.querySelectorAll("i");
        for (let c = 0; c < 2; c++) {
          ds.forEach((d, k) => {
            const at = t + 0.1 + c * 0.34 + k * 0.1;
            tl.fromTo(d, { y: 0, opacity: 0.35 }, { y: -9, opacity: 1, duration: 0.14, ease: "power2.out", immediateRender: false }, at).to(d, { y: 0, opacity: 0.35, duration: 0.16, ease: "power2.in" }, at + 0.14);
          });
        }
        const tsT = t + think;
        tl.to(r.dots, { opacity: 0, duration: 0.15, ease: "power2.in" }, tsT);
        tl.set(r.bubble, { opacity: 1 }, tsT);
        // clip-path reveal driven by a proxy: w = width opening, a = text rows, c = chip
        const g = { w: 0, a: 0, c: r.chip ? 0 : 1 };
        const clip = () => {
          const H = r.bubble.offsetHeight, W = r.bubble.offsetWidth;
          const textH = r.chip ? r.chip.offsetTop + 4 : H;
          const vh = DOTS_H + (textH - DOTS_H) * g.a + (H - textH) * g.c;
          const vw = DOTS_W + (W - DOTS_W) * g.w;
          r.bubble.style.clipPath = `inset(0px ${Math.max(0, W - vw).toFixed(1)}px ${Math.max(0, H - vh).toFixed(1)}px 0px round 36px 36px 36px 12px)`;
        };
        r.bubble.style.clipPath = `inset(0px calc(100% - ${DOTS_W}px) calc(100% - ${DOTS_H}px) 0px round 36px)`;
        const nW = r.words.length;
        const streamD = Math.min(2.2, Math.max(0.6, nW * 0.085));
        tl.fromTo(g, { w: 0 }, { w: 1, duration: 0.38, ease: "expo.out", onUpdate: clip, immediateRender: false }, tsT);
        tl.fromTo(g, { a: 0 }, { a: 1, duration: streamD, ease: "power1.out", onUpdate: clip, immediateRender: false }, tsT + 0.04);
        const inner = r.words.map((w) => w.querySelector(".em-word-in"));
        gsap.set(inner, { opacity: 0 });
        const st = streamD / Math.max(1, nW);
        tl.fromTo(inner, { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.28, ease: "power2.out", stagger: st, immediateRender: false }, tsT + 0.08);
        // accent tail on the newest words, cooling to the text colour (hotType logic)
        tl.fromTo(inner, { color: HOT }, { color: BASE, duration: 0.45, ease: "power2.out", stagger: st, immediateRender: false }, tsT + 0.12);
        scrollTo(r.row, () => (r.chip ? r.chip.offsetTop + 4 : r.bubble.offsetHeight), tsT + 0.04, streamD);
        let tEnd = tsT + streamD + 0.1;
        if (r.chip) {
          tl.fromTo(g, { c: 0 }, { c: 1, duration: 0.4, ease: "expo.out", onUpdate: clip, immediateRender: false }, tEnd);
          gsap.set(r.chip, { opacity: 0 });
          fx.pop(tl, r.chip, tEnd + 0.05, { from: 0.6 });
          scrollTo(r.row, null, tEnd, 0.4);
          tEnd += 0.45;
        }
        t = tEnd + 0.15;
      });
    },
  });
})();

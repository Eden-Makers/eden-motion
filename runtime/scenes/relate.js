/* Relate pack: scenes measured from 26 Relate Studio films (research/analysis/relate.md) and
 * proven in four 1:1 rebuilds (Frontier Traders, Ledger, Enoki, Arcus). Editorial, metronome
 * cut, monochrome-friendly. Best on tones "paper" / "black" alternating every shot.
 *
 * ghost-counter       { rows: [{label, from, to, prefix?, suffix?}] (1-2) }
 *                     giant cropped numbers rolling, trailing digits smeared into horizontal ghost copies.
 * editorial-headline  { lines: ["The Frontier","is the edge","of opportunity"] (1-4), indent?: [0, 0.3, 0.1], strike?: true }
 *                     staggered lines that pop in hard (no fade); strike = thin rods fall across the type.
 * dash-field          { mode: "swirl"|"vortex"|"burst", density?: "low"|"mid"|"high" } grid of short dashes
 *                     rotating to a moving attractor (Frontier flow field). Pure abstract rhythm beat.
 * glass-letters       { word: "Frontier", plate: "stack"|"swap"|"icons", items: [..] } giant frosted glass
 *                     letters drift over a plate: fast word stack, label swaps every few frames, or icon badges.
 * rank-list           { rows: [{label:"Tier 2", value:"112,000 Pts"}] (3-4), move?: index of the row that rises to the top }
 *                     phone-style list, the dark highlighted row climbs to first place.
 * logo-bars           { bars?: [[x,y,w,h]...] in a unit box, name?: "Frontier Traders" } logo mark built from bars,
 *                     shrinks into the lockup, wordmark whips in with motion blur, lockup steps down once.
 * clip-3d             { src: "assets/x.webm" (transparent Blender render, see `eden-motion blender`), fit?: "cover"|"contain" }
 *                     plays a 3D plate full frame over the scene tone.
 *
 * Elements the originals change in hard per-frame steps (counters, word stacks, swaps) are quantised
 * to the film fps so true-shutter motion blur keeps them crisp instead of smearing them.
 */
(function () {
  const { h } = window.EM;
  const NS = "http://www.w3.org/2000/svg";
  const FPS = () => (window.STORYBOARD && window.STORYBOARD.fps) || 30;
  const SLOW = () => window.EM_SLOW || 1;

  // One proxy tween drives a draw function. step=true quantises progress to film frames.
  // ease shapes the progress (default linear for drivers that ease inside fn); quantising happens
  // after easing so stepped elements still land on whole film frames.
  function prox(tl, start, dur, fn, step, ease) {
    const p = { t: 0 };
    const n = Math.max(1, Math.round(dur * FPS()));
    const q = (v) => (step ? Math.min(1, Math.floor(v * n + 1e-6) / n) : v);
    tl.to(p, { t: 1, duration: dur, ease: ease || "none", onUpdate: () => fn(q(p.t)) }, start);
    fn(0);
  }
  const fmt = (n, dec = 0) => Number(n).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const abs = (style) => h("div", { style: Object.assign({ position: "absolute" }, style) });

  // Shared SVG filters (horizontal blur levels, frost, rim) injected once per document.
  function defs() {
    if (document.getElementById("em-relate-defs")) return;
    const svg = document.createElementNS(NS, "svg");
    svg.id = "em-relate-defs";
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    svg.innerHTML = `<defs>
      ${[0, 1, 2, 3, 4].map((i) => `<filter id="emr-hb${i}" x="-20%" y="-5%" width="140%" height="110%"><feGaussianBlur stdDeviation="${6 + i * 5} 0"/></filter>`).join("")}
      <filter id="emr-rim" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter>
      <filter id="emr-frost"><feTurbulence type="fractalNoise" baseFrequency="0.009" numOctaves="5" seed="3"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.45"/></filter>
    </defs>`;
    document.body.appendChild(svg);
  }

  // ======================================================================
  // ghost-counter
  // ======================================================================
  EM.scene("ghost-counter", {
    ownsCamera: true,
    build(ctx) {
      defs();
      const { tl, start, dur, props: p } = ctx;
      const rows = (p.rows && p.rows.length ? p.rows : [{ label: p.label || "", from: p.from || 0, to: p.to || 100000 }]).slice(0, 2);
      const two = rows.length === 2;
      const size = two ? 440 : 560;
      rows.forEach((r, i) => {
        const top = two ? (i ? 744 : 150) : 300;
        const lbl = abs({ left: "84px", top: `${top - 74}px`, fontSize: "54px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--fg)", fontFamily: "var(--font-display)" });
        lbl.textContent = r.label || "";
        const big = abs({ left: "66px", top: `${top}px`, fontSize: `${size}px`, lineHeight: 1, letterSpacing: "-0.035em", fontWeight: 500, whiteSpace: "nowrap", color: "var(--fg)", fontFamily: "var(--font-display)" });
        const sharp = h("span");
        const tail = h("span", { style: { position: "relative", display: "inline-block" } });
        const main = h("span", { style: { position: "relative", opacity: 0.75, filter: "url(#emr-hb0)" } });
        tail.appendChild(main);
        const ghosts = [0, 1, 2, 3, 4].map((g) => {
          const s = h("span", { style: { position: "absolute", top: 0, left: `${70 + g * 120}px`, whiteSpace: "nowrap", opacity: [0.6, 0.45, 0.32, 0.22, 0.14][g], filter: `url(#emr-hb${g})` } });
          tail.appendChild(s);
          return s;
        });
        big.append(sharp, tail);
        ctx.cam.append(lbl, big);
        if (two && i === 0) ctx.cam.appendChild(abs({ left: "84px", top: "634px", right: "0", height: "4px", background: "var(--fg)" }));
        const pre = r.prefix || "", suf = r.suffix || "", dec = r.decimals || 0;
        const from = +r.from || 0, to = +r.to || 0;
        const nSharp = pre.length + 2;
        prox(tl, start, dur, (q) => {
          const v = from + (to - from) * q;
          const str = pre + fmt(v, dec) + suf;
          sharp.textContent = str.slice(0, nSharp);
          main.textContent = str.slice(nSharp);
          ghosts.forEach((g, k) => (g.textContent = (pre + fmt(v + (to - from) * 0.018 * (k + 1), dec) + suf).slice(nSharp)));
        }, true, "power1.out");
      });
    },
  });

  // ======================================================================
  // editorial-headline
  // ======================================================================
  EM.scene("editorial-headline", {
    ownsCamera: true,
    build(ctx) {
      const { tl, start, dur, props: p, rng } = ctx;
      const lines = (p.lines && p.lines.length ? p.lines : String(p.text || "").split(/\s*\/\s*|\n/)).filter(Boolean).slice(0, 4);
      const indent = p.indent || lines.map((_, i) => [0, 0.36, 0.12, 0.24][i % 4]);
      const fs = lines.length > 3 ? 104 : 124;
      const lh = fs * 0.98;
      const box = abs({ left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "1200px", height: `${lines.length * lh}px` });
      ctx.cam.appendChild(box);
      const els = lines.map((ln, i) => {
        const el = abs({ left: `${indent[i] * 900}px`, top: `${i * lh}px`, fontSize: `${fs}px`, lineHeight: 1, letterSpacing: "-0.03em", fontWeight: 500, whiteSpace: "nowrap", color: "var(--fg)", fontFamily: "var(--font-display)" });
        el.textContent = ln;
        box.appendChild(el);
        return el;
      });
      // hard pops: one line per ~5 frames, or on the narrator's first word of each line
      const words = ctx.words || [];
      els.forEach((el, i) => {
        const w = words.find((x) => x.word.toLowerCase().replace(/\W/g, "") === lines[i].split(/\s+/)[0].toLowerCase().replace(/\W/g, ""));
        const t = w ? w.start - 0.04 : start + i * (5 / 24);
        gsap.set(el, { opacity: 0 });
        tl.set(el, { opacity: 1 }, Math.max(start, t));
      });
      if (p.strike) {
        // 2D rods: thin tapered bars dropping onto the type (Frontier 2.5 s beat)
        const n = 4;
        for (let k = 0; k < n; k++) {
          const ang = [-23, -15, 9, -37][k];
          const rod = abs({ left: `${720 + (rng() - 0.5) * 420}px`, top: `${500 + (rng() - 0.5) * 200}px`, width: `${520 + rng() * 240}px`, height: "10px", borderRadius: "5px", background: "linear-gradient(180deg,#e9e9e9,#7d7d7d 45%,#3b3b3b 55%,#bdbdbd)", transformOrigin: "50% 50%", boxShadow: "0 2px 6px rgba(0,0,0,.25)" });
          ctx.cam.appendChild(rod);
          const tl0 = start + dur * (0.42 + k * 0.1);
          tl.fromTo(rod, { opacity: 0, scale: 2.4, rotation: ang - 25, y: -420 }, { opacity: 1, scale: 1, rotation: ang, y: 0, duration: 0.2, ease: "power2.in", immediateRender: false }, tl0);
        }
      }
    },
  });

  // ======================================================================
  // dash-field
  // ======================================================================
  EM.scene("dash-field", {
    ownsCamera: true,
    build(ctx) {
      const { tl, start, dur, props: p, rng } = ctx;
      const cv = h("canvas", { width: 1920, height: 1080, style: { position: "absolute", inset: 0, width: "1920px", height: "1080px" } });
      ctx.cam.appendChild(cv);
      const c = cv.getContext("2d");
      const mode = p.mode || "swirl";
      const dens = { low: [11, 7], mid: [13, 8], high: [17, 10] }[p.density || "mid"];
      const [cols, rows] = mode === "burst" ? [15, 9] : dens;
      const ph = Array.from({ length: cols * rows }, () => [rng() * 6.28, 0.6 + rng() * 2.2]);
      const fg = getComputedStyle(ctx.el).getPropertyValue("--fg").trim() || "#000";
      const bgc = getComputedStyle(ctx.el).getPropertyValue("--bg").trim() || "#fff";
      const ease = gsap.parseEase("power2.inOut");
      prox(tl, start, dur, (q) => {
        c.fillStyle = bgc; c.fillRect(0, 0, 1920, 1080);
        c.strokeStyle = fg; c.lineWidth = mode === "burst" ? 4 : 7; c.lineCap = "butt";
        const sx = 1920 / cols, sy = 1080 / rows, len = mode === "burst" ? 70 : 92;
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          let x = sx * (i + 0.5), y = sy * (j + 0.5), a;
          const [p0, sp] = ph[j * cols + i];
          if (mode === "swirl") {
            const edge = Math.min(i, cols - 1 - i);
            const amt = Math.min(1, edge / 3) * ease(Math.min(1, q * 1.25));
            if (edge) { const r = 70 * Math.min(1, edge / 3) * Math.min(1, q * 1.6); x += Math.cos(p0 + q * sp * 2) * r; y += Math.sin(p0 + q * sp * 2) * r; }
            a = (edge === 0 ? (j % 2 ? Math.PI / 2 : 0) : Math.PI / 2) + amt * (p0 + sp * q * 3);
          } else if (mode === "vortex") {
            const cx = 1290 + q * 120, cy = 50 + q * 40, dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
            const w = Math.max(0, Math.min(1, 1.5 - d / 900));
            let t = Math.atan2(dy, dx); if (t < -Math.PI / 2) t += Math.PI; if (t > Math.PI / 2) t -= Math.PI;
            a = -(y / 1080) * 0.7 * (1 - w) + t * w;
          } else {
            const dx = x - 960, dy = y - 540; if (Math.hypot(dx, dy) < 260) continue;
            a = Math.atan2(dy, dx) + q * 0.8;
          }
          const ex = Math.cos(a) * len / 2, ey = Math.sin(a) * len / 2;
          c.beginPath(); c.moveTo(x - ex, y - ey); c.lineTo(x + ex, y + ey); c.stroke();
        }
      });
    },
  });

  // ======================================================================
  // glass-letters
  // ======================================================================
  let glassN = 0;
  EM.scene("glass-letters", {
    ownsCamera: true,
    build(ctx) {
      defs();
      const { tl, start, dur, props: p } = ctx;
      const id = `emr-gl${glassN++}`;
      const word = p.word || (ctx.brand && ctx.brand.name) || "Glass";
      const plateMode = p.plate || "stack";
      const items = (p.items && p.items.length ? p.items : ["Signal", "Momentum", "Conviction", "Latency", "Spread", "Exposure"]).map(String);
      const mkPlate = () => {
        const d = abs({ inset: 0 });
        if (plateMode === "stack") {
          const st = h("div", { style: { position: "absolute", left: 0, width: "1920px", textAlign: "center", fontSize: "168px", lineHeight: "146px", letterSpacing: "-0.025em", fontWeight: 500, color: "var(--fg)", fontFamily: "var(--font-display)" } });
          const list = items.concat(items, items, items, items, items);
          st.innerHTML = list.map((w) => `<div>${w.replace(/</g, "")}</div>`).join("");
          d.appendChild(st);
          d._stack = st;
        } else if (plateMode === "swap") {
          d._labels = items.map((w) => { const el = abs({ left: 0, width: "1920px", top: "470px", textAlign: "center", fontSize: "148px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--fg)", fontFamily: "var(--font-display)", opacity: 0 }); el.textContent = w; d.appendChild(el); return el; });
        } else {
          d.appendChild(abs({ left: "700px", top: "330px", width: "520px", height: "520px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.55), rgba(255,255,255,.12) 40%, rgba(255,255,255,0) 68%)" }));
          d._labels = items.map((nm) => { const b = abs({ left: "820px", top: "450px", width: "280px", height: "280px", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0 }); b.appendChild(EM.icon(nm, 200, "#fff")); d.appendChild(b); return b; });
        }
        return d;
      };
      const plate = mkPlate();
      const clipWrap = abs({ inset: 0, clipPath: `url(#${id}-clip)` });
      const plate2 = mkPlate();
      Object.assign(plate2.style, { filter: "blur(14px) brightness(1.9)" });
      clipWrap.append(plate2, abs({ inset: 0, background: "rgba(255,255,255,.06)" }));
      const fsz = p.size || 1120;
      const base = p.baseline || 985;
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 1920 1080");
      Object.assign(svg.style, { position: "absolute", inset: 0, width: "1920px", height: "1080px", overflow: "visible" });
      const txt = (extra) => `<text x="0" y="${base}" style="font-family: var(--font-display), Inter Tight, Inter, sans-serif" font-weight="500" font-size="${fsz}" letter-spacing="70" ${extra}>${word.replace(/</g, "")}</text>`;
      svg.innerHTML = `<defs><clipPath id="${id}-clip">${txt(`id="${id}-ct"`)}</clipPath></defs>
        <g clip-path="url(#${id}-clip)"><rect x="-400" y="0" width="5000" height="1080" filter="url(#emr-frost)" opacity="0.8"/></g>
        ${txt(`id="${id}-rim" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="3" filter="url(#emr-rim)"`)}`;
      // the label stack and the giant cropped word are texture, not copy: `measure` skips them
      [plate, clipWrap, svg].forEach((el) => el.setAttribute("data-em-decor", ""));
      ctx.cam.append(plate, clipWrap, svg);
      const swapEvery = (p.swapFrames || 4) / FPS();
      prox(tl, start, dur, (q) => {
        const x = 40 - q * (p.drift || 380);
        ["-ct", "-rim"].forEach((s) => { const el = document.getElementById(id + s); if (el) el.setAttribute("x", x); });
        [plate, plate2].forEach((pl) => {
          if (pl._stack) pl._stack.style.transform = `translateY(${40 - q * 146 * 46}px)`;
          if (pl._labels) { const k = Math.floor((q * dur) / swapEvery) % pl._labels.length; pl._labels.forEach((el, i) => (el.style.opacity = i === k ? 1 : 0)); }
        });
      }, true);
    },
  });

  // ======================================================================
  // rank-list
  // ======================================================================
  EM.scene("rank-list", {
    ownsCamera: true,
    build(ctx) {
      const { tl, start, props: p } = ctx;
      const rows = (p.rows || []).slice(0, 4);
      const mv = p.move != null ? p.move : rows.length - 1;
      const phone = abs({ left: "664px", top: "104px", width: "590px", height: "1200px", background: "var(--card, #fff)", borderRadius: "28px", overflow: "hidden" });
      ctx.cam.appendChild(phone);
      const H = 300;
      rows.forEach((r, i) => {
        const dark = i === mv;
        const row = abs({ left: 0, top: `${116 + i * H}px`, width: "590px", height: `${H}px`, background: dark ? "#000" : "var(--card, #fff)", color: dark ? "#fff" : "var(--card-fg, #111)", borderBottom: "2px solid rgba(0,0,0,.06)" });
        const t = abs({ left: "40px", top: "66px", fontSize: "34px", fontWeight: 500, color: dark ? "#ddd" : "#9a9a9a" }); t.textContent = r.label || "";
        const v = abs({ left: "40px", top: "170px", fontSize: "66px", fontWeight: 600, letterSpacing: "-0.02em" }); v.textContent = r.value || "";
        row.append(t, v);
        phone.appendChild(row);
        const target = i === mv ? 0 : i < mv ? i + 1 : i;
        if (target !== i) tl.to(row, { y: (target - i) * H, duration: 0.55, ease: "power3.inOut" }, start + (i === mv ? 0.08 : 0.2));
      });
    },
  });

  // ======================================================================
  // logo-bars
  // ======================================================================
  EM.scene("logo-bars", {
    ownsCamera: true,
    build(ctx) {
      defs();
      const { tl, start, dur, props: p, brand } = ctx;
      const name = p.name || (brand && brand.name) || "";
      const bars = p.bars || [[0.137, 0, 0.411, 0.082], [0, 0.163, 0.084, 0.495], [0.178, 0.426, 0.34, 0.084], [0.662, 0.426, 0.338, 0.084], [0.548, 0.592, 0.084, 0.408]];
      const useImg = !p.bars && brand && brand.mark;
      const drawMark = (el, S) => {
        if (useImg) el.appendChild(h("img", { src: brand.mark, style: { width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0)" } }));
        else bars.forEach(([x, y, w, hh]) => el.appendChild(abs({ left: `${x * S}px`, top: `${y * S}px`, width: `${w * S}px`, height: `${hh * S}px`, background: "var(--fg)" })));
      };
      // final lockup: [mark 216px] gap [Word Word], centred by an estimated text width
      const FS = 145, M = 216, GAP = 104;
      const words = String(name).split(/\s+/).filter(Boolean);
      const estW = M + GAP + words.reduce((a, w) => a + w.length * 0.56 * FS, 0) + (words.length - 1) * 0.3 * FS;
      const left = Math.max(80, (1920 - estW) / 2), cy = 515;
      const lock = abs({ left: `${left}px`, top: `${cy - M / 2}px`, height: `${M}px`, display: "flex", alignItems: "center", gap: `${GAP}px`, transformOrigin: "0% 50%" });
      const slot = h("div", { style: { position: "relative", width: `${M}px`, height: `${M}px`, flex: "none", opacity: 0 } });
      drawMark(slot, M);
      const wordRow = h("div", { style: { display: "flex", gap: `${0.3 * FS}px`, alignItems: "center" } });
      const wm = words.map((w) => { const el = h("div", { style: { fontSize: `${FS}px`, fontWeight: 600, letterSpacing: "-0.03em", whiteSpace: "nowrap", color: "var(--fg)", fontFamily: "var(--font-display)", lineHeight: 1 } }); el.textContent = w; wordRow.appendChild(el); return el; });
      lock.append(slot, wordRow);
      // big mark flies from centre-left into the slot
      const S = 876;
      const big = abs({ left: "520px", top: "102px", width: `${S}px`, height: `${S}px`, transformOrigin: "0 0" });
      drawMark(big, S);
      ctx.cam.append(lock, big);
      const tFly = Math.min(1, dur * 0.3);
      tl.fromTo(big, { scale: 1.06, x: -20, y: -10 }, { scale: M / S, x: left - 520, y: cy - M / 2 - 102, duration: tFly, ease: "power2.in" }, start);
      const t1 = start + tFly;
      tl.set(big, { opacity: 0 }, t1);
      tl.set(slot, { opacity: 1 }, t1);
      tl.fromTo(wm, { x: 520, opacity: 0, filter: "url(#emr-hb4)" }, { x: 0, opacity: 1, duration: 0.7, ease: "expo.out", stagger: 0.22, immediateRender: true }, t1);
      wm.forEach((el, i) => tl.set(el, { filter: "none" }, t1 + 0.45 + i * 0.22));
      if (dur > 2.4) {
        // lockup steps down once and the word gap tightens (Frontier end card)
        const t2 = t1 + 0.95;
        tl.to(lock, { scale: 0.69, x: estW * 0.155, duration: 0.45, ease: "power3.inOut" }, t2);
        tl.to(wordRow, { gap: `${0.04 * FS}px`, duration: 0.45, ease: "power3.inOut" }, t2);
      }
    },
  });

  // ======================================================================
  // clip-3d
  // ======================================================================
  let clipN = 0;
  EM.scene("clip-3d", {
    ownsCamera: true,
    build(ctx) {
      const { props: p } = ctx;
      if (!p.src || /^blender:/.test(p.src)) {
        const ph = abs({ inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: "28px", fontFamily: "var(--font-display)" });
        ph.textContent = "3D plate pending: run eden-motion blender";
        ctx.cam.appendChild(ph);
        return;
      }
      const S = SLOW();
      const v = EM.video({ id: `em-clip3d-${ctx.index}-${clipN++}`, src: p.src, muted: "", playsinline: "", "data-start": (ctx.start * S).toFixed(3), "data-duration": (ctx.dur * S).toFixed(3), "data-media-start": String(p.mediaStart || 0), "data-playback-rate": (1 / S).toFixed(4) });
      Object.assign(v.style, { position: "absolute", inset: 0, width: "var(--W)", height: "var(--H)", objectFit: p.fit || "cover" });
      ctx.cam.appendChild(v);
    },
  });
})();

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

  // ---------------------------------------------------------------------------------------------
  // Deterministic WebGL2 shader backgrounds (runtime/webgl.js). Pure functions of the timeline time,
  // so seeks, scrubs and parallel render workers produce identical pixels. Set via
  //   "background": "shader-silk" | "shader-mesh" | "shader-grid" | "shader-dither"
  // optional tuning in storyboard.shader: { speed, scale, intensity, accent, mode: "dark"|"light" }.
  // Dark worlds keep the floor (#0f0f0f), light worlds the ceiling (#fafafa): never pure black/white.
  // ---------------------------------------------------------------------------------------------
  function glBackground(root, tl, sb, name, frag, { scale = 1, speed = 1, extra = {} } = {}) {
    const o = sb.shader || {};
    const W = +sb.width || 1920, H = +sb.height || 1080;
    const bg = EM.cssColor(root, "--bg", [0.06, 0.06, 0.07]);
    const dark = o.mode ? o.mode !== "light" : EM.luma(bg) < 0.5;
    const uniforms = Object.assign(
      {
        uA: o.accent ? EM.color(o.accent) : EM.cssColor(root, "--accent", [0.43, 0.36, 1]),
        uB: o.accent2 ? EM.color(o.accent2) : EM.cssColor(root, "--accent2", [1, 0.36, 0.66]),
        uC: o.accent3 ? EM.color(o.accent3) : EM.cssColor(root, "--accent3", [0.16, 0.78, 1]),
        uDark: dark ? 1 : 0,
        uInt: o.intensity != null ? o.intensity : 1,
      },
      extra
    );
    const canvas = h("canvas", { class: "em-gl em-gl-bg", "data-layout-allow-overflow": "", "data-bg": name });
    root.appendChild(canvas);
    const sc = o.scale || scale;
    const sp = (o.speed || 1) * speed;
    const runner = EM.shader(canvas, {
      frag,
      width: W,
      height: H,
      dpr: sc,
      uniforms,
      fallbackColors: dark ? ["#18181b", "#0f0f10"] : ["#f4f4f5", "#fafafa"],
    });
    runner.bind(tl, 0, Math.max(1, sb.duration), { speed: sp });
    return runner;
  }
  EM.glBackground = glBackground;

  const BG_HEAD = `
    vec2 bgP(){ return (vUv - .5) * vec2(uRes.x / uRes.y, 1.) * 2.; }
    vec3 bgOut(vec3 c){
      // never below #0f0f0f on dark worlds, never above #fafafa on light ones, 1/255 dither vs banding
      c = mix(min(c, vec3(.9804)), max(c, vec3(.0588)), uDark);
      c += (em_ign(gl_FragCoord.xy) - .5) / 255.;
      return c;
    }
  `;

  // Raycast-style satin ribbons: monochrome, glossy, slow. A warped sine height field is lit with two
  // lights; the speculars read as folds of silk.
  B["shader-silk"] = function (root, tl, sb) {
    glBackground(
      root, tl, sb, "shader-silk",
      BG_HEAD + `
      float silk(vec2 p, float t){
        vec2 q = p * 1.15;
        q += .42 * vec2(sin(q.y*1.7 + t*.23 + 1.), cos(q.x*1.5 - t*.19));
        q += .17 * vec2(sin(q.y*4.1 - t*.31 + 2.2), cos(q.x*3.6 + t*.27));
        float a = sin(q.x*3.2 + q.y*1.3 + t*.17);
        float b = sin(q.x*1.9 - q.y*2.7 - t*.13 + 2.);
        float c = sin(length(q - vec2(.3*sin(t*.11), .2))*4.6 - t*.21);
        // folds: ridged sum gives the pinched crease of satin
        return a*.45 + b*.35 + c*.30 + .18*sin((a + b + c)*2.4);
      }
      void main(){
        vec2 p = bgP(); float t = uTime;
        float e = .0025;
        float f  = silk(p, t);
        float fx = (silk(p + vec2(e,0.), t) - silk(p - vec2(e,0.), t)) / (2.*e);
        float fy = (silk(p + vec2(0.,e), t) - silk(p - vec2(0.,e), t)) / (2.*e);
        vec3 n = normalize(vec3(-fx*.34, -fy*.34, 1.));
        vec3 V = vec3(0., 0., 1.);
        vec3 L1 = normalize(vec3(-.55, .70, .50)), L2 = normalize(vec3(.75, -.45, .28));
        float d1 = max(dot(n, L1), 0.), d2 = max(dot(n, L2), 0.);
        float s1 = pow(max(dot(n, normalize(L1 + V)), 0.), 150.);
        float s1b = pow(max(dot(n, normalize(L1 + V)), 0.), 22.);
        float s2 = pow(max(dot(n, normalize(L2 + V)), 0.), 60.);
        float fres = pow(1. - max(n.z, 0.), 2.0);
        // anisotropic sheen along the fold direction
        float aniso = pow(abs(sin(f*5. + t*.07)), 18.) * smoothstep(.2, .9, 1. - n.z) * .35;
        float L = .040 + d1*.10 + d2*.045 + s1*.85 + s1b*.12 + s2*.30 + fres*.22 + aniso;
        float vig = mix(1., .50, smoothstep(.55, 1.7, length(p * vec2(.8, 1.))));
        L = clamp(L * vig * uInt, 0., 1.);
        vec3 dk = mix(vec3(.059), vec3(.78, .79, .82), pow(L, 1.12));
        dk = mix(dk, dk * (vec3(.55) + uA * .9), .03);
        vec3 lt = mix(vec3(.976), vec3(.58, .59, .63), clamp(L * 1.2, 0., 1.));
        outColor = vec4(bgOut(mix(lt, dk, uDark)), 1.);
      }`,
      { scale: 0.75 }
    );
    floor(root, sb, "#0f0f0f");
  };

  // ElevenLabs / Stripe fluid gradient mesh: five drifting colour fields, domain warped, grained.
  B["shader-mesh"] = function (root, tl, sb) {
    glBackground(
      root, tl, sb, "shader-mesh",
      BG_HEAD + `
      void main(){
        vec2 p = bgP(); float t = uTime;
        vec2 w = vec2(em_fbm(p*.85 + vec2(t*.050, 0.)), em_fbm(p*.85 + vec2(5.2, 1.3) - vec2(0., t*.045)));
        p += (w - .5) * 1.25;
        vec2 c0 = vec2(-.95*cos(t*.13), .55*sin(t*.11));
        vec2 c1 = vec2( .90*sin(t*.10 + 1.), -.50*cos(t*.14));
        vec2 c2 = vec2( .20*sin(t*.17 + 2.),  .75*cos(t*.09 + 1.));
        vec2 c3 = vec2(-.60*sin(t*.12 + 4.), -.70*sin(t*.08));
        vec2 c4 = vec2( 1.20*cos(t*.07 + 3.),  .35*sin(t*.15 + 2.));
        float k = 1.15;
        float w0 = exp(-dot(p-c0, p-c0)*k), w1 = exp(-dot(p-c1, p-c1)*k), w2 = exp(-dot(p-c2, p-c2)*k*1.2);
        float w3 = exp(-dot(p-c3, p-c3)*k), w4 = exp(-dot(p-c4, p-c4)*k*.9);
        float wb = .30;
        vec3 col = (uBase*wb + uA*w0 + uB*w1 + uC*w2 + uA*.7*w3 + uB*.7*w4) / (wb + w0 + w1 + w2 + w3*.7 + w4*.7);
        float lum = .86 + .28*em_fbm(p*1.3 + t*.03);
        float body = (w0 + w1 + w2 + w3 + w4) / (wb + w0 + w1 + w2 + w3 + w4);
        vec3 dk = mix(uBase, col * lum, clamp(body * 1.15 * uInt, 0., .92));
        dk *= mix(1., .62, smoothstep(.7, 1.9, length(bgP() * vec2(.85, 1.))));
        vec3 lt = mix(vec3(.98), col * (.9 + .2*lum), clamp(body * .85 * uInt, 0., .8));
        vec3 c = mix(lt, dk, uDark);
        c += em_grain(gl_FragCoord.xy, t) * .045;
        outColor = vec4(bgOut(c), 1.);
      }`,
      { scale: 0.5, extra: { uBase: EM.cssColor(root, "--bg", [0.06, 0.06, 0.07]).map((x, i, a) => (EM.luma(a) < 0.5 ? Math.max(x, 0.0588) : Math.min(x, 0.98))) } }
    );
    floor(root, sb, "#0f0f0f");
  };

  // OvyonLabs technical editorial grid: lens-warped hairlines, travelling scan lines, crosshair ticks and
  // micro coordinate glyphs. Pixel exact (full resolution).
  B["shader-grid"] = function (root, tl, sb) {
    glBackground(
      root, tl, sb, "shader-grid",
      BG_HEAD + `
      float glyphs(vec2 m, vec2 cid, float t, float k){
        // 6 characters of 3x5 dots, 2k px per dot, anchored 8k px right / 8k px below the crosshair
        vec2 g = (m - vec2(8.*k, 8.*k)) / (2.*k);
        if (g.y < 0. || g.y >= 5. || g.x < 0. || g.x >= 24.) return 0.;
        float ci = floor(g.x/4.), px = mod(g.x, 4.), row = floor(g.y);
        if (px >= 3.) return 0.;
        float live = step(em_hash21(cid), .42);
        float seed = em_hash21(cid + 3.7) * 5.;
        float v = em_hash21(vec2(ci*7.1 + px*13.7 + row*3.3, dot(cid, vec2(1.3, 2.9)) + floor(t*1.4 + seed)));
        return live * step(.55, v) * step(fract(g.x), .86) * step(fract(g.y), .86);
      }
      void main(){
        vec2 fc = gl_FragCoord.xy; float k = uRes.y / 1080.; float t = uTime;
        vec2 c = fc - uRes*.5;
        vec2 n = c / (uRes.y*.5); float r2 = dot(n, n);
        vec2 wc = c * (1. + .13*r2);
        wc.x *= 1. + .05*n.y;
        wc += vec2(t*12., t*7.) * k;
        float cell = 96.*k;
        vec2 g = wc / cell;
        vec2 gf = abs(fract(g - .5) - .5) / max(fwidth(g), 1e-4);
        float minor = 1. - min(min(gf.x, gf.y), 1.);
        vec2 G = g / 4.;
        vec2 Gf = abs(fract(G - .5) - .5) / max(fwidth(G), 1e-4);
        float major = 1. - min(min(Gf.x, Gf.y), 1.);
        vec2 m = (fract(G + .5) - .5) * cell * 4.;
        vec2 cid = floor(G + .5);
        float tick = max((1. - smoothstep(.4, 1.4, abs(m.y)/k)) * step(abs(m.x), 10.*k), (1. - smoothstep(.4, 1.4, abs(m.x)/k)) * step(abs(m.y), 10.*k));
        float gl = glyphs(m, cid, t, k);
        // travelling hairlines in screen space
        float sweep = 0., sweepA = 0.;
        for (int i = 0; i < 3; i++){
          float fi = float(i);
          float py = fract(t*(.045 + .017*fi) + fi*.37) * uRes.y;
          float px = fract(t*(.038 + .021*fi) + fi*.61 + .2) * uRes.x;
          float ph = 1. - smoothstep(0., 1.2*k, abs(fc.y - py));
          float pv = 1. - smoothstep(0., 1.2*k, abs(fc.x - px));
          float fadeH = smoothstep(0., .25, fract(fc.x/uRes.x + t*.05 + fi*.3)) * (1. - smoothstep(.55, .9, fract(fc.x/uRes.x + t*.05 + fi*.3)));
          float fadeV = smoothstep(0., .25, fract(fc.y/uRes.y - t*.04 + fi*.2)) * (1. - smoothstep(.55, .9, fract(fc.y/uRes.y - t*.04 + fi*.2)));
          float s = ph*fadeH + pv*fadeV;
          if (i == 0) sweepA += s; else sweep += s;
        }
        float vig = 1. - .55*smoothstep(.6, 1.7, length(n));
        vec3 ink = mix(vec3(0.), vec3(1.), uDark);
        float amt = (minor*.052 + major*.115 + tick*.34 + gl*.30 + sweep*.10) * vig;
        vec3 base = mix(vec3(.972), vec3(.063), uDark);
        base += mix(-.012, .016, uDark) * (1. - smoothstep(0., 1.3, length(n)));
        vec3 col = mix(base, ink, clamp(amt * uInt, 0., 1.));
        col = mix(col, uA, clamp(sweepA * .35 * vig, 0., .6));
        outColor = vec4(bgOut(col), 1.);
      }`,
      { scale: 1 }
    );
  };

  // Crisp Bayer ordered-dither wave field in a single brand accent (three tonal levels).
  B["shader-dither"] = function (root, tl, sb) {
    glBackground(
      root, tl, sb, "shader-dither",
      BG_HEAD + `
      void main(){
        float k = max(1., floor(uRes.y / 270.));
        vec2 q = floor(gl_FragCoord.xy / k);
        vec2 pc = (q + .5) * k;
        vec2 p = (pc - uRes*.5) / (uRes.y*.5);
        float t = uTime;
        float f = .5 + .5*sin(p.x*3.1 + t*.55 + sin(p.y*2.2 + t*.4)*1.6);
        f = f*.55 + .45*(.5 + .5*sin(length(p - vec2(.35*sin(t*.2), .12))*5.4 - t*.8));
        f = f*.8 + .2*em_fbm(p*2.2 + t*.1);
        f *= mix(.28, 1., smoothstep(.22, 1.0, length(p*vec2(.72, 1.))));
        float v = clamp(f * 2. * uInt, 0., 2.);
        float b = em_bayer8(q);
        float lvl = step(b, v) + step(b, v - 1.);
        vec3 base = mix(vec3(.975), vec3(.063), uDark);
        vec3 mid = mix(base, uA, mix(.20, .26, uDark));
        vec3 hi = mix(base, uA, mix(.85, .92, uDark));
        vec3 c = lvl < .5 ? base : (lvl < 1.5 ? mid : hi);
        outColor = vec4(mix(clamp(c, 0., .9804), max(c, vec3(.0588)), uDark), 1.);
      }`,
      { scale: 1 }
    );
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

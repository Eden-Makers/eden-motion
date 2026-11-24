/* eden-motion WebGL layer: zero dependency, offline safe, seek deterministic.
 *
 *   EM.shader(canvas, { frag, vert?, uniforms?, textures?, dpr?, width?, height?, overlay?, fallback? })
 *   EM.three(container, { setup(THREE, w, h, rng), render(t, state, renderer), width?, height?, dpr? })
 *   EM.drive(tl, start, dur, fn, { ease })       generic seek-safe driver, fn(localT, progress)
 *
 * Determinism contract (same as the rest of the runtime):
 *   - a frame is a PURE FUNCTION of the timeline time: render(t) never reads a clock, Math.random,
 *     requestAnimationFrame or any state that depends on the order frames were visited in.
 *   - the GSAP timeline drives it. A tween on a proxy object whose property is a SETTER calls
 *     render on every timeline render, including seeks with suppressed callbacks (onUpdate is
 *     skipped by seek(t, true), a property setter is not). Parallel workers, scrubbing and
 *     re-renders therefore produce identical pixels.
 *
 * All shader runners share ONE WebGL2 context (a Chrome page keeps ~16 live contexts, a film can have
 * more shader scenes than that). Each runner blits the shared canvas into its own 2D canvas right
 * after drawing, so the DOM only ever holds ordinary 2D canvases (compositor and screenshot safe).
 * Without WebGL2 (locked-down headless) the runner paints a clean 2D fallback instead of failing.
 *
 * GLSL contract for `frag`: write `void main()` only. Declared for you: `in vec2 vUv` (0..1, y up),
 * `out vec4 outColor` (PREMULTIPLIED alpha), `uTime` (s), `uRes` (px), one uniform per entry of
 * `uniforms` (number -> float, "#hex" / "rgb()" -> vec3, [a,b] -> vec2, [a,b,c] -> vec3,
 * [a,b,c,d] -> vec4, [[..],[..]] -> vecN[], long number arrays -> float[]), samplers for `textures`,
 * and the helper library `em_*` (hash, noise, fbm, rot, grain, bayer8, aces).
 */
(function () {
  const EM = window.EM;
  const h = EM.h;

  // ---------------------------------------------------------------------------------------------
  // colours
  // ---------------------------------------------------------------------------------------------
  EM.color = function (c, fallback = [1, 1, 1]) {
    if (Array.isArray(c)) return c.slice(0, 3);
    const s = String(c || "").trim();
    let m = /^#?([0-9a-f]{3})$/i.exec(s);
    if (m) return [...m[1]].map((x) => parseInt(x + x, 16) / 255);
    m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(s);
    if (m) {
      const n = parseInt(m[1], 16);
      return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }
    m = /^rgba?\(([^)]+)\)/i.exec(s);
    if (m) {
      const p = m[1].split(/[ ,\/]+/).filter(Boolean).slice(0, 3).map((x) => (x.endsWith("%") ? parseFloat(x) * 2.55 : parseFloat(x)) / 255);
      if (p.length === 3 && p.every(Number.isFinite)) return p;
    }
    return fallback;
  };
  // resolve a CSS custom property (tone classes override tokens) straight to [r,g,b] 0..1
  EM.cssColor = function (el, name, fallback) {
    return EM.color(EM.fx ? EM.fx.cssVar(el, name) : getComputedStyle(el || document.documentElement).getPropertyValue(name), fallback);
  };
  EM.luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  EM.hex = (c) => "#" + c.map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, "0")).join("");

  // ---------------------------------------------------------------------------------------------
  // generic seek-safe driver
  // ---------------------------------------------------------------------------------------------
  // Tweens a proxy from 0..dur whose setter calls fn(localT, progress). Works under seek(t, true).
  EM.drive = function (tl, start, dur, fn, { ease = "none", from = 0, to = 1 } = {}) {
    let cur = from;
    let first = true;
    const proxy = {};
    Object.defineProperty(proxy, "p", {
      get: () => cur,
      set: (v) => {
        cur = v;
        fn(v * dur, v);
      },
    });
    if (first) {
      first = false;
      fn(from * dur, from);
    }
    tl.fromTo(proxy, { p: from }, { p: to, duration: Math.max(0.001, dur), ease, immediateRender: false }, start);
    return proxy;
  };

  // ---------------------------------------------------------------------------------------------
  // GLSL helper library (prefix em_)
  // ---------------------------------------------------------------------------------------------
  const LIB = `
float em_hash11(float p){ p = fract(p*.1031); p *= p+33.33; p *= p+p; return fract(p); }
float em_hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2  em_hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3 += dot(p3, p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
float em_noise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f*f*f*(f*(f*6.-15.)+10.);
  return mix(mix(em_hash21(i), em_hash21(i+vec2(1,0)), u.x), mix(em_hash21(i+vec2(0,1)), em_hash21(i+vec2(1,1)), u.x), u.y);
}
float em_fbm(vec2 p){ float a = .5, s = 0.; mat2 m = mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<5;i++){ s += a*em_noise(p); p = m*p; a *= .5; } return s; }
mat2  em_rot(float a){ float c = cos(a), s = sin(a); return mat2(c,-s,s,c); }
// per-pixel film grain, re-seeded 24x per second so it is stable inside a frame
float em_grain(vec2 fc, float t){ return em_hash21(fc + floor(t*24.)*17.13) - .5; }
// interleaved gradient noise: static blue-ish dither to kill 8 bit banding
float em_ign(vec2 fc){ return fract(52.9829189*fract(dot(fc, vec2(.06711056,.00583715)))); }
float em_bayer8(vec2 fc){
  vec2 p = mod(floor(fc), 8.); float idx = 0., w = 16.;
  for (int i = 0; i < 3; i++){
    vec2 b = mod(floor(p / exp2(float(i))), 2.);
    float c = b.x == b.y ? (b.x < .5 ? 0. : 1.) : (b.x > .5 ? 2. : 3.);
    idx += c * w; w *= .25;
  }
  return (idx + .5) / 64.;
}
vec3 em_aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
`;

  const VERT = `#version 300 es
out vec2 vUv;
void main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); vUv = p; gl_Position = vec4(p*2.-1., 0., 1.); }`;

  // ---------------------------------------------------------------------------------------------
  // shared context
  // ---------------------------------------------------------------------------------------------
  const S = { gl: null, canvas: null, failed: false, vao: null, w: 0, h: 0 };
  function shared() {
    if (S.gl || S.failed) return S.gl;
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 2;
      const gl = c.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
      if (!gl) throw new Error("webgl2 unavailable");
      S.canvas = c;
      S.gl = gl;
      S.vao = gl.createVertexArray();
    } catch (e) {
      S.failed = true;
      console.warn("[em.webgl] WebGL2 unavailable, using 2D fallbacks: " + (e && e.message));
      (EM.glFallbacks = EM.glFallbacks || []).push(String((e && e.message) || e));
    }
    return S.gl;
  }
  EM.webgl2 = () => !!shared();

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh) || "";
      gl.deleteShader(sh);
      throw new Error("shader compile failed: " + log.trim());
    }
    return sh;
  }

  function declare(name, v) {
    if (typeof v === "number" || typeof v === "boolean") return `uniform float ${name};`;
    if (typeof v === "string") return `uniform vec3 ${name};`;
    if (Array.isArray(v)) {
      if (v.length && Array.isArray(v[0])) return `uniform vec${v[0].length} ${name}[${v.length}];`;
      if (v.length >= 2 && v.length <= 4) return `uniform vec${v.length} ${name};`;
      return `uniform float ${name}[${v.length}];`;
    }
    throw new Error(`uniform ${name}: unsupported value`);
  }

  function pack(v) {
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v === "string") return EM.color(v);
    if (Array.isArray(v) && v.length && Array.isArray(v[0])) return new Float32Array(v.flat());
    if (Array.isArray(v) && v.length > 4) return new Float32Array(v);
    return v;
  }

  // arrays of vecN pack flat into a Float32Array; the width comes from the declaration
  function setUniform(gl, loc, v, decl) {
    if (loc == null) return;
    if (typeof v === "number") return gl.uniform1f(loc, v);
    if (v instanceof Float32Array) {
      const m = /^uniform vec(\d) /.exec(decl);
      const k = m ? +m[1] : 1;
      return (k === 1 ? gl.uniform1fv : k === 2 ? gl.uniform2fv : k === 3 ? gl.uniform3fv : gl.uniform4fv).call(gl, loc, v);
    }
    if (v.length === 2) return gl.uniform2fv(loc, v);
    if (v.length === 3) return gl.uniform3fv(loc, v);
    if (v.length === 4) return gl.uniform4fv(loc, v);
  }

  function texFrom(gl, src, { nearest = false, repeat = false } = {}) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    const f = nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return t;
  }

  // ---------------------------------------------------------------------------------------------
  // EM.shader
  // ---------------------------------------------------------------------------------------------
  EM.shader = function (canvas, opts = {}) {
    const dpr = opts.dpr || 1;
    const cssW = opts.width || canvas.clientWidth || canvas.width || 1920;
    const cssH = opts.height || canvas.clientHeight || canvas.height || 1080;
    const W = Math.max(2, Math.round(cssW * dpr));
    const H = Math.max(2, Math.round(cssH * dpr));
    canvas.width = W;
    canvas.height = H;
    if (opts.css !== false) {
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
    }
    const ctx2d = canvas.getContext("2d");
    const names = Object.keys(opts.uniforms || {});
    const values = {};
    const decls = {};
    for (const k of names) {
      decls[k] = declare(k, opts.uniforms[k]);
      values[k] = pack(opts.uniforms[k]);
    }
    const texNames = Object.keys(opts.textures || {});

    const runner = {
      canvas,
      width: W,
      height: H,
      cssWidth: cssW,
      cssHeight: cssH,
      ok: false,
      t: 0,
      u: values,
      _sig: null,
    };

    let prog = null, locs = {}, texObjs = {};
    const gl = shared();
    if (gl) {
      try {
        const frag = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
in vec2 vUv; out vec4 outColor;
uniform float uTime; uniform vec2 uRes;
${names.map((k) => decls[k]).join("\n")}
${texNames.map((k) => `uniform sampler2D ${k};`).join("\n")}
${opts.lib === false ? "" : LIB}
${opts.frag}`;
        const vs = compile(gl, gl.VERTEX_SHADER, opts.vert || VERT);
        let fs;
        try {
          fs = compile(gl, gl.FRAGMENT_SHADER, frag);
        } catch (e) {
          // attach the numbered source so the author can see the failing line
          const log = String(e.message);
          const lines = frag.split("\n");
          const m = /ERROR: \d+:(\d+)/.exec(log);
          const at = m ? +m[1] : 0;
          const ctxLines = at ? lines.slice(Math.max(0, at - 3), at + 2).map((l, i) => `${Math.max(1, at - 2) + i}| ${l}`).join(" / ") : "";
          throw new Error(log.split("\n")[0] + (ctxLines ? "  @ " + ctxLines : ""));
        }
        prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("shader link failed: " + gl.getProgramInfoLog(prog));
        locs.uTime = gl.getUniformLocation(prog, "uTime");
        locs.uRes = gl.getUniformLocation(prog, "uRes");
        for (const k of names) locs[k] = gl.getUniformLocation(prog, k.endsWith("]") ? k : decls[k].includes("[") ? k + "[0]" : k);
        texNames.forEach((k, i) => {
          const spec = opts.textures[k];
          const src = spec && spec.src ? spec.src : spec;
          texObjs[k] = { tex: texFrom(gl, src, spec || {}), unit: i, loc: gl.getUniformLocation(prog, k) };
        });
        runner.ok = true;
      } catch (e) {
        console.error("[em.shader] " + e.message);
        (EM.errors = EM.errors || []).push({ type: "shader", error: String(e.message).slice(0, 600) });
      }
    }

    function fallbackPaint(t) {
      ctx2d.clearRect(0, 0, W, H);
      if (opts.fallback) return opts.fallback(ctx2d, t, W, H, values);
      const cols = (opts.fallbackColors || ["#17171a", "#101012"]).map((c) => (Array.isArray(c) ? EM.hex(c) : c));
      const g = ctx2d.createLinearGradient(0, 0, W, H);
      cols.forEach((c, i) => g.addColorStop(cols.length === 1 ? 0 : i / (cols.length - 1), c));
      ctx2d.fillStyle = g;
      ctx2d.fillRect(0, 0, W, H);
    }

    runner.set = function (name, v) {
      values[name] = pack(v);
      return runner;
    };

    // render(t, extra): extra overrides uniforms for this call and sticks (the frame is a pure function
    // of the values you pass; scenes that need per-frame values pass them every call).
    runner.render = function (t, extra) {
      if (extra) for (const k in extra) values[k] = pack(extra[k]);
      runner.t = t;
      let sig = t + "|";
      for (const k of names) {
        const v = values[k];
        sig += (v && v.length != null ? Array.prototype.join.call(v, ",") : v) + ";";
      }
      if (sig === runner._sig) return runner;
      runner._sig = sig;
      if (!runner.ok) {
        fallbackPaint(t);
        if (opts.overlay) opts.overlay(ctx2d, t, values, W, H, runner);
        return runner;
      }
      if (S.w !== W || S.h !== H) {
        S.canvas.width = W;
        S.canvas.height = H;
        S.w = W;
        S.h = H;
      }
      gl.viewport(0, 0, W, H);
      gl.useProgram(prog);
      gl.bindVertexArray(S.vao);
      gl.uniform1f(locs.uTime, t);
      gl.uniform2f(locs.uRes, W, H);
      for (const k of names) setUniform(gl, locs[k], values[k], decls[k]);
      for (const k of texNames) {
        const o = texObjs[k];
        gl.activeTexture(gl.TEXTURE0 + o.unit);
        gl.bindTexture(gl.TEXTURE_2D, o.tex);
        gl.uniform1i(o.loc, o.unit);
      }
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      ctx2d.globalCompositeOperation = "copy";
      ctx2d.drawImage(S.canvas, 0, 0, W, H);
      ctx2d.globalCompositeOperation = "source-over";
      if (opts.overlay) opts.overlay(ctx2d, t, values, W, H, runner);
      return runner;
    };

    // Drive the shader clock from a GSAP timeline: runner time = offset + local * speed.
    // extra(localT) may return uniforms to apply on every frame.
    runner.bind = function (tl, start, dur, { speed = 1, offset = 0, extra, ease = "none" } = {}) {
      EM.drive(tl, start, dur, (lt) => runner.render(offset + lt * speed, extra ? extra(lt) : undefined), { ease });
      return runner;
    };

    // Tween one numeric uniform (or [n] array element via name) on the timeline, seek safe.
    runner.tween = function (tl, name, from, to, start, dur, ease = "power2.inOut") {
      let cur = from;
      const proxy = {};
      Object.defineProperty(proxy, "v", {
        get: () => cur,
        set: (v) => {
          cur = v;
          values[name] = v;
          runner.render(runner.t);
        },
      });
      tl.fromTo(proxy, { v: from }, { v: to, duration: Math.max(0.001, dur), ease, immediateRender: false }, start);
      return runner;
    };

    runner.render(opts.t0 || 0);
    return runner;
  };

  // A canvas element already sized for a runner.
  EM.canvas = function (cls, w, h) {
    const c = h2(cls);
    c.width = w;
    c.height = h;
    return c;
  };
  function h2(cls) {
    return h("canvas", { class: cls || "em-gl" });
  }

  // ---------------------------------------------------------------------------------------------
  // EM.three: Three.js bridge (only when window.THREE is present, bundled by build when installed)
  // ---------------------------------------------------------------------------------------------
  EM.three = function (container, opts = {}) {
    const cssW = opts.width || container.offsetWidth || 1920;
    const cssH = opts.height || container.offsetHeight || 1080;
    const dpr = opts.dpr || 1;
    const W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
    const canvas = h("canvas", { class: "em-gl em-three" });
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    container.appendChild(canvas);
    const rng = EM.rng(opts.seed || "three");
    const runner = { canvas, ok: false, t: 0, state: null, renderer: null };
    const T = window.THREE;
    if (T && T.WebGLRenderer) {
      try {
        const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, premultipliedAlpha: true });
        renderer.setPixelRatio(1);
        renderer.setSize(W, H, false);
        renderer.setClearColor(0x000000, 0);
        runner.renderer = renderer;
        runner.state = (opts.setup && opts.setup(T, cssW, cssH, rng, renderer)) || {};
        runner.ok = true;
      } catch (e) {
        console.error("[em.three] " + e.message);
        (EM.errors = EM.errors || []).push({ type: "three", error: String(e.message).slice(0, 400) });
      }
    } else {
      (EM.glFallbacks = EM.glFallbacks || []).push("three: window.THREE not present");
      console.warn("[em.three] window.THREE not present, using the 2D fallback (install `three` next to the repo or pass a fallback)");
    }
    const ctx2d = runner.ok ? null : canvas.getContext("2d");
    runner.render = function (t) {
      runner.t = t;
      if (runner.ok) {
        opts.render && opts.render(t, runner.state, runner.renderer);
      } else if (opts.fallback) {
        ctx2d.clearRect(0, 0, W, H);
        opts.fallback(ctx2d, t, W, H);
      } else {
        const g = ctx2d.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, "#17171a");
        g.addColorStop(1, "#101012");
        ctx2d.fillStyle = g;
        ctx2d.fillRect(0, 0, W, H);
      }
      return runner;
    };
    runner.bind = function (tl, start, dur, { speed = 1, offset = 0, ease = "none" } = {}) {
      EM.drive(tl, start, dur, (lt) => runner.render(offset + lt * speed), { ease });
      return runner;
    };
    runner.render(0);
    return runner;
  };
})();

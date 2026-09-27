/* ui-morph: "one shape, never cut". Every state is the SAME element morphing its width, height,
 * radius, colour and shadow while its content swaps with a short blur. A cursor drives every
 * change with real clicks and drags, and the camera spring-zooms so each state fills the frame.
 *
 * Build law: every style is a pure function of time. One proxy tween (EM.spring.drive) calls
 * frame(t); springs are closed-form step responses and a value that changes target many times is
 * the SUM of one spring response per change (EM.spring.track). No transitions, timers or state.
 *
 * props: {
 *   states: [ {kind, ...} ]  4-12, kinds:
 *     button  {label}                      black pill button, cursor clicks it
 *     loader  {}                           spinner circle (advances on its own)
 *     check   {label?}                     accent pill, check draws itself
 *     island  {title, sub}                 dynamic-island pill with live waveform
 *     player  {title, artist}              scrub drag on the progress bar, pause/play morph
 *     slider  {label}                      volume, drag past max stretches the shape, springs back
 *     toggle  {label, icon?, sub?:[off,on]} knob with two-edge stretch
 *     tabs    {items:[3-4]}                liquid indicator, leading edge on a faster spring
 *     chart   {values:[..], title?, value?, delta?, mode?: "bars"|"line", prefix?, suffix?}
 *     command {placeholder, query, results:[str | {label, icon?, hint?}]}   Cmd K palette
 *     toast   {text, icon?}
 *   accent?: css colour (default brand --accent),  canvas?: "warm" | "dark" (default from tone),
 *   loop?: true (last state returns to the first; final frame == first frame),
 *   bpm?: number (snap changes to the beat when there is no VO),  fill?: 0.55-0.65
 * }
 */
(function () {
  const EM = window.EM;
  const { h, fx } = EM;

  // ---------------------------------------------------------------- springs (EM.spring)
  const DEF = { freq: 2.2, damping: 0.82 };

  // Named feel presets (freq Hz, damping ratio). "ui" is the measured reference spring (3-5%
  // overshoot); the rest follow the role table from the Opus 5.5 motion-studio course:
  // snappy for buttons/toggles/leading edges, default for cards/containers/camera, heavy for big
  // type/3D/logo lockups (no overshoot), playful for mascots and stickers (visible overshoot).
  const PRESETS = {
    ui: { freq: 2.6, damping: 0.7 },
    snappy: { freq: 2.85, damping: 0.84 },
    default: { freq: 2.07, damping: 1.0 },
    heavy: { freq: 1.5, damping: 1.0 },
    playful: { freq: 2.25, damping: 0.5 },
    glide: { freq: 1.15, damping: 1.0 }, // elegant camera zooms
  };
  const resolve = (o) => (typeof o === "string" ? PRESETS[o] || DEF : o);

  // Closed-form step response 0 -> 1 of a mass-spring-damper. Pure function of t.
  function response(t, o) {
    if (!(t > 0)) return 0;
    o = resolve(o);
    const f = (o && o.freq) || DEF.freq;
    const z = o && o.damping != null ? o.damping : DEF.damping;
    const w = 2 * Math.PI * f;
    if (z < 1) {
      const wd = w * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
    }
    if (z === 1) return 1 - Math.exp(-w * t) * (1 + w * t);
    const s = Math.sqrt(z * z - 1), r1 = -w * (z - s), r2 = -w * (z + s);
    return 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r1 - r2);
  }

  // value(t) = v0 + sum_i (to_i - prev_i) * response(t - t_i). changes: [{t, to, opts?}] sorted.
  function track(changes, t, o) {
    o = o || {};
    let prev = o.from != null ? o.from : changes.length ? changes[0].to : 0;
    let v = prev;
    for (let i = 0; i < changes.length; i++) {
      const c = changes[i];
      if (c.t > t) break;
      v += (c.to - prev) * response(t - c.t, c.opts || o);
      prev = c.to;
    }
    return v;
  }

  // ONE proxy tween from start to end (ease none) whose onUpdate renders fn(absoluteTime).
  // Seek-safe and stretch-safe: t is derived from the tween's own progress.
  function drive(tl, start, end, fn) {
    const d = Math.max(1e-3, end - start);
    const proxy = { p: 0 };
    fn(start);
    tl.fromTo(proxy, { p: 0 }, { p: 1, duration: d, ease: "none", immediateRender: false, onUpdate: () => fn(start + proxy.p * d) }, start);
  }

  // Two-edge indicator: the leading edge rides a stiffer spring than the trailing one, so a tab
  // pill or toggle knob stretches toward its target and contracts on arrival. stops: [{t, left, right}].
  function indicator(stops, t, lead = "snappy", trail = { freq: 1.6, damping: 0.9 }) {
    const L = stops.map((s) => ({ t: s.t, to: s.left })), Rr = stops.map((s) => ({ t: s.t, to: s.right }));
    const movingRight = (i) => i > 0 && stops[i].left > stops[i - 1].left;
    let idx = 0;
    stops.forEach((s, i) => (s.t <= t ? (idx = i) : 0));
    const right = movingRight(idx);
    const l = track(L, t, resolve(right ? trail : lead)), r = track(Rr, t, resolve(right ? lead : trail));
    return { left: Math.min(l, r), right: Math.max(l, r) };
  }

  // Text inside a morphing container: enters after the morph starts, leaves before the next one,
  // so swapped content never overlaps. Returns 0..1 opacity.
  function swapAlpha(t, tIn, tOut, { inDelay = 0.08, inDur = 0.12, outDur = 0.1 } = {}) {
    return Math.min(clamp((t - tIn - inDelay) / inDur, 0, 1), clamp((tOut - outDur - t) / outDur, 0, 1));
  }

  // Seamless loop: map any t into [0, dur) so the last frame equals the first.
  const loopT = (t, dur) => ((t % dur) + dur) % dur;

  EM.spring = { DEFAULTS: DEF, PRESETS, response, track, drive, indicator, swapAlpha, loopT };

  // ---------------------------------------------------------------- utils
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const c01 = (v) => clamp(v, 0, 1);
  const lerp = (a, b, u) => a + (b - a) * u;
  const f2 = (v) => (Math.round(v * 100) / 100).toString();
  const f4 = (v) => (Math.round(v * 10000) / 10000).toString();
  const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  function parseColor(c) {
    const s = String(c || "").trim();
    let m = /^#([0-9a-f]{3})$/i.exec(s);
    if (m) return [...m[1]].map((x) => parseInt(x + x, 16));
    m = /^#([0-9a-f]{6})/i.exec(s);
    if (m) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
    const probe = h("span", { style: { color: s } });
    document.body.appendChild(probe);
    const out = getComputedStyle(probe).color;
    probe.remove();
    m = /rgba?\(([^)]+)\)/.exec(out);
    return m ? m[1].split(",").slice(0, 3).map(Number) : [255, 91, 55];
  }
  const rgba = (c, a = 1) => `rgba(${c.map((v) => Math.round(clamp(v, 0, 255))).join(",")},${f4(clamp(a, 0, 1))})`;
  // OKLab so a colour morph (black -> accent, accent -> white) stays clean instead of muddy.
  const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const toSrgb = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055);
  function oklab(rgb) {
    const [r, g, b] = rgb.map(toLin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const q = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * q, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * q, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * q];
  }
  function fromOklab([L, A, B]) {
    const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3), m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3), q = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
    return [toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * q), toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * q), toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * q)];
  }
  const mixC = (a, b, u) => [0, 1, 2].map((i) => lerp(a[i], b[i], u));

  // Springs used by the scene (named so the design can be tuned in one place).
  const SPR = {
    w: { freq: 2.1, damping: 0.8 },     // width leads a touch slower than height: the shape breathes
    h: { freq: 2.5, damping: 0.84 },
    r: { freq: 2.3, damping: 0.86 },
    col: { freq: 3.0, damping: 1 },     // colour never overshoots
    cam: { freq: 1.5, damping: 0.92 },
    press: { freq: 7, damping: 0.9 },
    enter: { freq: 4.2, damping: 1 },   // content in  ~0.18 s
    exit: { freq: 6.0, damping: 1 },    // content out ~0.12 s
    lead: { freq: 3.4, damping: 0.78 }, // leading edge of indicators / knobs
    trail: { freq: 1.9, damping: 0.88 },// trailing edge
    item: { freq: 2.6, damping: 0.86 },
    fade: { freq: 4.5, damping: 1 },
    back: { freq: 3.0, damping: 0.68 }, // rubber band release
  };

  // ---------------------------------------------------------------- icons (24 grid, 1.5 stroke)
  const ICON = {
    arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
    check: '<path d="M5.5 12.5l4.2 4.2L18.5 7.8"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.4-4.4"/>',
    speaker: '<path d="M4.5 9.6h3.2L12 6v12l-4.3-3.6H4.5z"/>',
    wave1: '<path d="M15.6 9.4a3.6 3.6 0 0 1 0 5.2"/>',
    wave2: '<path d="M18.4 6.8a7.3 7.3 0 0 1 0 10.4"/>',
    moon: '<path d="M19.5 14.6A7.6 7.6 0 0 1 9.4 4.5a7.6 7.6 0 1 0 10.1 10.1z"/>',
    sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3.5v1.8M12 18.7v1.8M3.5 12h1.8M18.7 12h1.8M6 6l1.3 1.3M16.7 16.7L18 18M6 18l1.3-1.3M16.7 7.3L18 6"/>',
    wifi: '<path d="M4.5 9.5a11 11 0 0 1 15 0"/><path d="M7.3 12.6a7 7 0 0 1 9.4 0"/><path d="M10 15.6a3 3 0 0 1 4 0"/><path d="M12 18.6h.01"/>',
    headphones: '<path d="M4.5 16v-3.5a7.5 7.5 0 0 1 15 0V16"/><rect x="4.5" y="14" width="3.5" height="5.5" rx="1.5"/><rect x="16" y="14" width="3.5" height="5.5" rx="1.5"/>',
    list: '<path d="M9 7h10.5M9 12h10.5M9 17h10.5"/><path d="M4.8 7h.01M4.8 12h.01M4.8 17h.01"/>',
    bell: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.3 1.3H5.2z"/><path d="M10.2 20.3h3.6"/>',
    file: '<path d="M13.5 3.8H7.8a2 2 0 0 0-2 2v12.4a2 2 0 0 0 2 2h8.4a2 2 0 0 0 2-2V8.5z"/><path d="M13.5 3.8v4.7h4.7"/>',
    user: '<circle cx="12" cy="8.6" r="3.6"/><path d="M5.2 19.6a6.8 6.8 0 0 1 13.6 0"/>',
    users: '<circle cx="9.5" cy="9" r="3.3"/><path d="M3.8 19.2a5.7 5.7 0 0 1 11.4 0"/><path d="M15.2 5.9a3.3 3.3 0 0 1 0 6.2"/><path d="M17.6 14.2a5.7 5.7 0 0 1 2.6 5"/>',
    settings: '<path d="M4.5 7.5h9M17.5 7.5h2M4.5 16.5h3M11.5 16.5h8"/><circle cx="15.5" cy="7.5" r="2"/><circle cx="9.5" cy="16.5" r="2"/>',
    chart: '<path d="M5.5 19.5v-7M12 19.5V5M18.5 19.5v-10"/>',
    "chart-column": '<path d="M5.5 19.5v-7M12 19.5V5M18.5 19.5v-10"/>',
    calendar: '<rect x="4.2" y="5.5" width="15.6" height="14" rx="2.6"/><path d="M4.2 10h15.6M8.5 3.6v3.6M15.5 3.6v3.6"/>',
    mail: '<rect x="3.8" y="5.6" width="16.4" height="12.8" rx="2.6"/><path d="M4.6 7.6l7.4 5.6 7.4-5.6"/>',
    folder: '<path d="M3.8 7.6a2 2 0 0 1 2-2h3.8l2.1 2.1h6.5a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2H5.8a2 2 0 0 1-2-2z"/>',
    plus: '<path d="M12 5.5v13M5.5 12h13"/>',
    zap: '<path d="M13 3.8L5.8 13.2H12l-1 7 7.2-9.4H12z"/>',
    sparkle: '<path d="M12 4.2l1.7 5.1 5.1 1.7-5.1 1.7L12 17.8l-1.7-5.1L5.2 11l5.1-1.7z"/>',
    send: '<path d="M20 4L9.6 14.4"/><path d="M20 4l-6.4 16-4-5.6L4 10.4z"/>',
    link: '<path d="M10.2 13.8a3.8 3.8 0 0 0 5.4 0l2.7-2.7a3.8 3.8 0 0 0-5.4-5.4l-.9.9"/><path d="M13.8 10.2a3.8 3.8 0 0 0-5.4 0l-2.7 2.7a3.8 3.8 0 0 0 5.4 5.4l.9-.9"/>',
    rocket: '<path d="M12.5 15.5l-4-4c1.2-4.4 4.6-7.4 10.5-7.8-.4 5.9-3.4 9.3-7.8 10.5z"/><path d="M8.5 11.5l-3 .5 2.5-3.5h3M12.5 15.5l-.5 3 3.5-2.5v-3"/><path d="M5 19l2.3-2.3"/>',
    lock: '<rect x="5.2" y="10.6" width="13.6" height="9.4" rx="2.4"/><path d="M8.4 10.6V8a3.6 3.6 0 0 1 7.2 0v2.6"/>',
    globe: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.2 2.3 3.2 5 3.2 8s-1 5.7-3.2 8c-2.2-2.3-3.2-5-3.2-8s1-5.7 3.2-8z"/>',
  };
  function icon(name, size, cls) {
    const body = ICON[name] || ICON.file;
    return h("span", {
      class: "um-ic" + (cls ? " " + cls : ""),
      style: { width: size + "px", height: size + "px" },
      html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`,
    });
  }
  // Filled media glyphs (soft corners from a 1.5 stroke in the same colour).
  const GLYPH = {
    prev: '<path d="M11.2 7.4v9.2L5 12z"/><path d="M18.8 7.4v9.2L12.6 12z"/>',
    next: '<path d="M12.8 7.4v9.2L19 12z"/><path d="M5.2 7.4v9.2L11.4 12z"/>',
  };
  function glyph(name, size) {
    return h("span", {
      class: "um-ic",
      style: { width: size + "px", height: size + "px" },
      html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">${GLYPH[name]}</svg>`,
    });
  }
  const at = (el, cx, cy, w, hgt) => Object.assign(el.style, { position: "absolute", left: cx - w / 2 + "px", top: cy - (hgt == null ? w : hgt) / 2 + "px" });

  // Live waveform: pure function of time (no rng, no state).
  const WAVE_W = [7.3, 9.1, 6.2, 8.4, 10.3], WAVE_P = [0, 1.3, 2.2, 0.6, 2.9];
  function waveUpdate(bars, t, maxH, amp) {
    bars.forEach((b, i) => {
      const s = Math.abs(Math.sin(t * WAVE_W[i] + WAVE_P[i])) * 0.7 + Math.abs(Math.sin(t * WAVE_W[i] * 0.37 + i)) * 0.3;
      b.style.height = f2(4 + (maxH - 4) * s * amp) + "px";
    });
  }

  // ---------------------------------------------------------------- palette
  function palette(canvas, accent) {
    const A = parseColor(accent);
    if (canvas === "dark")
      return {
        dark: true, A, canvas: "#0b0b0c", glow: "#18181a", ringRGB: [255, 255, 255], shRGB: [0, 0, 0],
        ink: { bg: [243, 242, 239], fg: "#111111", on: "#ffffff", muted: "#6b6761", sub: "#e6e4e0", sub2: "#d9d6d0", ring: 0, sh: 0.55, hi: 0 },
        paper: { bg: [28, 28, 30], fg: "#f4f4f5", on: "#111111", muted: "rgba(255,255,255,0.5)", sub: "rgba(255,255,255,0.07)", sub2: "rgba(255,255,255,0.16)", ring: 0.08, sh: 0.6, hi: 0.06 },
        accent: { bg: A, fg: "#ffffff", on: rgba(A), muted: "rgba(255,255,255,0.8)", sub: "rgba(255,255,255,0.22)", sub2: "rgba(255,255,255,0.3)", ring: 0, sh: 0.5, hi: 0.2 },
      };
    return {
      dark: false, A, canvas: "#e8e6e2", glow: "#f2f0ed", ringRGB: [17, 17, 17], shRGB: [52, 40, 28],
      ink: { bg: [17, 17, 17], fg: "#ffffff", on: "#111111", muted: "rgba(255,255,255,0.56)", sub: "rgba(255,255,255,0.1)", sub2: "rgba(255,255,255,0.2)", ring: 0, sh: 0.3, hi: 0.1 },
      paper: { bg: [255, 255, 255], fg: "#111111", on: "#ffffff", muted: "#77746f", sub: "#f2f1ee", sub2: "#e5e3df", ring: 0.06, sh: 0.15, hi: 0 },
      accent: { bg: A, fg: "#ffffff", on: rgba(A), muted: "rgba(255,255,255,0.82)", sub: "rgba(255,255,255,0.22)", sub2: "rgba(255,255,255,0.3)", ring: 0, sh: 0.28, hi: 0.18 },
    };
  }

  // ---------------------------------------------------------------- kinds
  // make(s, E) -> K = { el, surface, w|fit, h, r ("pill"|px), anchor?, trigger(S) | "key" | null,
  //   plan?(S, api), update?(t, S, X), stretch?(t, S), shapeEvents?(S) }
  // Points are [x, y] relative to the layer centre. X = { C: cursor [x,y] world, w, h, stretch }.
  const KINDS = {};

  KINDS.button = {
    weight: 0.95, surface: "ink", nominal: [300, 96],
    make(s) {
      const el = h("div", { class: "um-layer um-row", style: { height: "96px", padding: "0 42px 0 46px", gap: "14px" } }, h("span", { class: "um-t-btn" }, s.label || ""), icon("arrow", 30));
      return { el, surface: "ink", fit: true, h: 96, r: "pill", trigger: (S) => [Math.round(S.w * 0.12), 8] };
    },
  };

  KINDS.loader = {
    weight: 0.8, surface: "ink", nominal: [112, 112],
    make() {
      const spin = h("div", { class: "um-spin", html: '<svg viewBox="0 0 24 24" width="50" height="50" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="9" opacity="0.2"/><circle class="arc" cx="12" cy="12" r="9" pathLength="1" stroke-dasharray="0.3 1"/></svg>' });
      const el = h("div", { class: "um-layer um-center", style: { width: "112px", height: "112px" } }, spin);
      const arc = spin.querySelector(".arc"), svg = spin.firstChild;
      return {
        el, surface: "ink", w: 112, h: 112, r: "pill", trigger: null,
        update(t, S) {
          const u = Math.max(0, t - S.T);
          const a = 0.2 + 0.18 * (0.5 - 0.5 * Math.cos(u * 5.4));
          arc.setAttribute("stroke-dasharray", f4(a) + " 1");
          svg.style.transform = `rotate(${f2(u * 420 + 55 * Math.sin(u * 2.7) - 90)}deg)`;
        },
      };
    },
  };

  KINDS.check = {
    weight: 0.85, surface: "accent", nominal: [330, 96],
    make(s) {
      const mark = h("span", { class: "um-ic", html: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path pathLength="1" stroke-dasharray="1 1" d="M5.5 12.5l4.2 4.2L18.5 7.8"/></svg>' });
      const disc = h("span", { class: "um-disc" }, mark);
      const lab = !!s.label;
      const el = h("div", { class: "um-layer um-row", style: lab ? { height: "96px", padding: "0 42px 0 22px", gap: "16px" } : { width: "112px", height: "112px", justifyContent: "center" } }, disc, lab ? h("span", { class: "um-t-btn" }, s.label) : null);
      const path = mark.querySelector("path");
      return {
        el, surface: "accent", fit: lab, w: 112, h: lab ? 96 : 112, r: "pill", trigger: () => [0, 4],
        update(t, S) {
          const u = t - S.T;
          path.style.strokeDashoffset = f4(1 - c01(response(u - 0.14, { freq: 2.1, damping: 1 })));
          disc.style.transform = `scale(${f4(0.5 + 0.5 * response(u - 0.03, { freq: 2.6, damping: 0.72 }))})`;
        },
      };
    },
  };

  KINDS.island = {
    weight: 0.95, surface: "ink", nominal: [460, 96],
    make(s) {
      const bars = [0, 1, 2, 3, 4].map(() => h("i"));
      const el = h(
        "div",
        { class: "um-layer um-row", style: { height: "96px", padding: "0 32px 0 18px", gap: "18px", minWidth: "440px" } },
        h("span", { class: "um-art", style: { width: "60px", height: "60px", borderRadius: "30px" } }),
        h("span", { class: "um-col" }, h("span", { class: "um-t-title" }, s.title || ""), h("span", { class: "um-t-sub" }, s.sub || "")),
        h("span", { class: "um-grow", style: { minWidth: "28px" } }),
        h("span", { class: "um-wave" }, ...bars)
      );
      return { el, surface: "ink", fit: true, h: 96, r: "pill", trigger: (S) => [-Math.round(S.w * 0.08), 6], update: (t) => waveUpdate(bars, t, 30, 1) };
    },
  };

  const PLAYER_LEN = 204; // seconds, shown as m:ss
  const mss = (sec) => { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); };
  KINDS.player = {
    weight: 2.1, surface: "ink", nominal: [600, 300],
    make(s) {
      const W = 600, H = 300, TL = 28, TW = 544, TY = 152;
      const el = h("div", { class: "um-layer", style: { width: W + "px", height: H + "px" } });
      const art = h("span", { class: "um-art", style: { position: "absolute", left: "28px", top: "28px", width: "92px", height: "92px", borderRadius: "22px" } });
      const title = h("div", { class: "um-t-title", style: { position: "absolute", left: "142px", top: "40px", fontSize: "28px", maxWidth: "330px", overflow: "hidden", textOverflow: "ellipsis" } }, s.title || "");
      const artist = h("div", { class: "um-t-sub", style: { position: "absolute", left: "142px", top: "80px", fontSize: "22px" } }, s.artist || "");
      const bars = [0, 1, 2, 3, 4].map(() => h("i"));
      const wave = h("span", { class: "um-wave", style: { position: "absolute", right: "30px", top: "58px" } }, ...bars);
      const trk = h("div", { class: "um-track", style: { left: TL + "px", width: TW + "px" } });
      const fill = h("div", { class: "um-track-fill" });
      trk.appendChild(fill);
      const knob = h("div", { class: "um-knob-dot" });
      const tL = h("div", { class: "um-time", style: { left: TL + "px", top: "172px" } });
      const tR = h("div", { class: "um-time", style: { right: 600 - TL - TW + "px", top: "172px" } });
      const play = h("span", { class: "um-ic", html: '<svg viewBox="0 0 24 24" width="56" height="56" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path class="a"/><path class="b"/></svg>' });
      const pa = play.querySelector(".a"), pb = play.querySelector(".b");
      const prev = glyph("prev", 40), next = glyph("next", 40), list = icon("list", 30), vol = h("span", { class: "um-ic", style: { width: "30px", height: "30px" }, html: `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICON.speaker}${ICON.wave1}${ICON.wave2}</svg>` });
      const CY = 246;
      at(play, 300, CY, 56); at(prev, 196, CY, 40); at(next, 404, CY, 40); at(list, 58, CY, 30); at(vol, 542, CY, 30);
      list.style.color = vol.style.color = "var(--um-muted)";
      el.append(art, title, artist, wave, trk, knob, tL, tR, play, prev, next, list, vol);
      const P0 = 0.24, RATE = 1 / PLAYER_LEN, P_TO = 0.7;
      const px = (p) => TL + p * TW - W / 2; // layer-relative x of progress p
      // play <-> pause as two quads that morph (0 = play triangle, 1 = pause bars)
      const PLAY = [[[7.5, 5.2], [13, 8.6], [13, 15.4], [7.5, 18.8]], [[13, 8.6], [19, 12], [19, 12], [13, 15.4]]];
      const PAUSE = [[[6.6, 5.2], [10.2, 5.2], [10.2, 18.8], [6.6, 18.8]], [[13.8, 5.2], [17.4, 5.2], [17.4, 18.8], [13.8, 18.8]]];
      const quad = (k, m) => "M" + PLAY[k].map((pt, j) => f2(lerp(pt[0], PAUSE[k][j][0], m)) + " " + f2(lerp(pt[1], PAUSE[k][j][1], m))).join("L") + "Z";
      const K = {
        el, surface: "ink", w: W, h: H, r: 56, trigger: () => [542 - W / 2, CY - H / 2],
        plan(S, api) {
          const D = S.D;
          S.tg = S.T + clamp(0.16 * D, 0.26, 0.5);
          S.tr = S.T + 0.47 * D;
          S.tp = S.T + 0.71 * D;
          S.pg = P0 + RATE * (S.tg - S.T);
          api.grab(S.tg, () => [px(S.pg), TY - H / 2], [{ t: S.tr - 0.07, pt: () => [px(P_TO), TY - H / 2 + 3] }], S.tr);
          api.click(S.tp, () => [0, CY - H / 2 + 2]);
          api.fast(S.tp, S.tp + 0.25);
        },
        progress(t, S, X) {
          if (t < S.tg) return P0 + RATE * (t - S.T);
          const xOf = (c) => c01((c[0] + W / 2 - TL) / TW);
          if (t <= S.tr) return xOf(X.C);
          const pr = xOf(X.cursorAt(S.tr));
          return pr + RATE * (Math.min(t, S.tp) - S.tr);
        },
        update(t, S, X) {
          const p = K.progress(t, S, X);
          const held = track([{ t: S.tg, to: 1 }, { t: S.tr, to: 0 }], t, { from: 0, freq: 5, damping: 0.9 });
          const th = 8 + 5 * held;
          Object.assign(trk.style, { top: f2(TY - th / 2) + "px", height: f2(th) + "px", borderRadius: f2(th / 2) + "px" });
          fill.style.width = f2(p * TW) + "px";
          const kd = 16 + 10 * held;
          knob.style.transform = `translate(${f2(TL + p * TW - 13)}px, ${TY - 13}px) scale(${f4(kd / 26)})`;
          setText(tL, mss(p * PLAYER_LEN));
          setText(tR, "-" + mss((1 - p) * PLAYER_LEN));
          const m = c01(track([{ t: S.tp, to: 0 }], t, { from: 1, freq: 3.2, damping: 0.9 }));
          pa.setAttribute("d", quad(0, m));
          pb.setAttribute("d", quad(1, m));
          const pp = track([{ t: S.tp - 0.04, to: 0.88 }, { t: S.tp + 0.08, to: 1 }], t, { from: 1, ...SPR.press });
          play.style.transform = `scale(${f4(pp)})`;
          waveUpdate(bars, t, 30, 0.12 + 0.88 * c01(track([{ t: S.tp, to: 0 }], t, { from: 1, freq: 2.4, damping: 1 })));
        },
      };
      return K;
    },
  };

  KINDS.slider = {
    weight: 1.7, surface: "paper", nominal: [540, 100],
    make(s) {
      const W = 540, H = 100, IN = 7, MINF = H - 2 * IN, SPAN = W - 2 * IN - MINF, G = 22, V0 = 0.32;
      const el = h("div", { class: "um-layer", style: { width: W + "px", height: H + "px" } });
      const fill = h("div", { class: "um-sl-fill" });
      const base = h("div", { class: "um-sl-text", "data-layout-allow-overlap": "", "data-layout-allow-occlusion": "" }, h("span", { class: "um-sl-label" }, s.label || ""), h("span", { class: "um-sl-val" }));
      const spk = h("span", { class: "um-ic", style: { width: "30px", height: "30px" }, html: `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICON.speaker}<g class="w1">${ICON.wave1}</g><g class="w2">${ICON.wave2}</g></svg>` });
      const over = h("div", { class: "um-sl-text um-sl-over", "data-layout-allow-overlap": "", "data-layout-allow-occlusion": "" }, h("span", { class: "um-sl-label" }, s.label || ""), h("span", { class: "um-sl-val" }));
      at(spk, IN + MINF / 2, H / 2, 30);
      over.appendChild(spk);
      el.append(fill, base, over);
      const vals = [base.lastChild, over.children[1]];
      const w1 = spk.querySelector(".w1"), w2 = spk.querySelector(".w2");
      const rawOf = (c) => (c[0] + W / 2 + G - IN - MINF) / SPAN; // layer left edge never moves
      const rubber = (o) => 90 * (1 - Math.exp(-o / 200));
      const K = {
        el, surface: "paper", w: W, h: H, r: "pill", trigger: () => [IN + MINF / 2 - W / 2, 0],
        plan(S, api) {
          const D = S.D;
          S.tg = S.T + clamp(0.18 * D, 0.26, 0.5);
          S.tpk = S.T + 0.52 * D;
          S.tr = S.T + 0.63 * D;
          const gx = IN + MINF + V0 * SPAN - G - W / 2;
          api.grab(S.tg, () => [gx, 2], [{ t: S.tpk, pt: () => [W / 2 + 150, -6] }], S.tr);
          api.fast(S.tr, S.tr + 0.35);
        },
        value(t, S, X) {
          if (t < S.tg) return V0;
          return c01(rawOf(t <= S.tr ? X.C : X.cursorAt(S.tr)));
        },
        stretch(t, S, X) {
          if (t < S.tg || t > S.T2 + 0.6) return 0;
          if (t <= S.tr) return rubber(Math.max(0, rawOf(X.C) - 1) * SPAN);
          const s0 = rubber(Math.max(0, rawOf(X.cursorAt(S.tr)) - 1) * SPAN);
          return s0 * (1 - response(t - S.tr, SPR.back));
        },
        update(t, S, X) {
          const v = K.value(t, S, X);
          const st = X.stretch;
          el.style.width = f2(W + st) + "px";
          const fh = X.h - 2 * IN;
          const fw = MINF + v * SPAN + st;
          Object.assign(fill.style, { width: f2(fw) + "px", height: f2(fh) + "px", top: f2((H - fh) / 2) + "px", borderRadius: f2(fh / 2) + "px" });
          over.style.clipPath = `inset(0 ${f2(W + st - IN - fw)}px 0 0)`;
          base.style.clipPath = `inset(0 0 0 ${f2(IN + fw)}px)`;
          const txt = Math.round(v * 100) + "%";
          vals.forEach((n) => setText(n, txt));
          w1.style.opacity = f4(c01((v - 0.02) / 0.12));
          w2.style.opacity = f4(c01((v - 0.45) / 0.15));
        },
      };
      return K;
    },
  };

  KINDS.toggle = {
    weight: 1.15, surface: "paper", nominal: [500, 116],
    make(s, E) {
      const W = 500, H = 116, SW = 88, SH = 52, SX = W - 28 - SW, SY = (H - SH) / 2, KP = 5, KD = SH - 2 * KP;
      const subs = s.sub || ["Off", "On"];
      const el = h("div", { class: "um-layer", style: { width: W + "px", height: H + "px" } });
      const tile = h("span", { class: "um-tile", style: { position: "absolute", left: "28px", top: (H - 60) / 2 + "px", width: "60px", height: "60px", borderRadius: "18px" } }, icon(s.icon || "moon", 30));
      const label = h("div", { class: "um-t-title", style: { position: "absolute", left: "108px", top: "29px", fontSize: "26px" } }, s.label || "");
      const sub0 = h("div", { class: "um-t-sub", "data-layout-allow-overlap": "", style: { position: "absolute", left: "108px", top: "63px" } }, subs[0]);
      const sub1 = h("div", { class: "um-t-sub", "data-layout-allow-overlap": "", style: { position: "absolute", left: "108px", top: "63px" } }, subs[1]);
      const sw = h("div", { class: "um-switch", style: { left: SX + "px", top: SY + "px", width: SW + "px", height: SH + "px" } });
      const knob = h("div", { class: "um-knob" });
      sw.appendChild(knob);
      el.append(tile, label, sub0, sub1, sw);
      const OFF = P_rgb(E, "sub2"), ON = E.P.A;
      const K = {
        el, surface: "paper", w: W, h: H, r: 32, trigger: () => [108 + 60 - W / 2, -6],
        plan(S, api) {
          S.tc = S.T + Math.max(0.3, 0.4 * S.D);
          api.click(S.tc, () => [SX + SW / 2 - W / 2 + 4, 2]);
          api.fast(S.tc, S.tc + 0.3);
        },
        update(t, S) {
          const L = track([{ t: S.tc, to: SW - KP - KD, opts: SPR.trail }], t, { from: KP });
          const R = track([{ t: S.tc, to: SW - KP, opts: SPR.lead }], t, { from: KP + KD });
          knob.style.left = f2(L) + "px";
          knob.style.width = f2(R - L) + "px";
          const on = c01(track([{ t: S.tc + 0.02, to: 1 }], t, { from: 0, ...SPR.col }));
          sw.style.background = rgba(mixC(OFF, ON, on), lerp(OFF[3] == null ? 1 : OFF[3], 1, on));
          const pr = track([{ t: S.tc - 0.04, to: 0.94 }, { t: S.tc + 0.09, to: 1 }], t, { from: 1, ...SPR.press });
          sw.style.transform = `scale(${f4(pr)})`;
          blurSwap(sub0, sub1, t, S.tc + 0.04);
        },
      };
      return K;
    },
  };
  // Resolve a palette token of the state's surface to [r,g,b,a] (for colour mixing in JS).
  function P_rgb(E, key) {
    const v = E.pal[key];
    const m = /rgba?\(([^)]+)\)/.exec(v);
    if (m) { const a = m[1].split(",").map(Number); return [a[0], a[1], a[2], a[3] == null ? 1 : a[3]]; }
    const c = parseColor(v);
    return [c[0], c[1], c[2], 1];
  }
  // Text swap inside a component: old exits fast, new enters a beat later (never overlapping).
  function blurSwap(a, b, t, ts) {
    const out = c01(response(t - ts, SPR.exit)), inn = c01(response(t - ts - 0.07, SPR.enter));
    a.style.opacity = f4(1 - out);
    a.style.filter = out > 0.01 && out < 0.99 ? `blur(${f2(6 * out)}px)` : "none";
    a.style.transform = `translateY(${f2(-6 * out)}px)`;
    b.style.opacity = f4(inn);
    b.style.filter = inn > 0.01 && inn < 0.99 ? `blur(${f2(6 * (1 - inn))}px)` : "none";
    b.style.transform = `translateY(${f2(6 * (1 - inn))}px)`;
  }

  KINDS.tabs = {
    weight: 1.5, surface: "paper", nominal: [480, 92],
    make(s) {
      const items = (s.items || ["Overview", "Activity", "Settings"]).slice(0, 4);
      const H = 92, PAD = 10;
      const mk = (cls) => h("div", { class: "um-tabs-row " + cls, "data-layout-allow-overlap": "", "data-layout-allow-occlusion": "" }, ...items.map((it) => h("span", { class: "um-tab", "data-layout-allow-overlap": "", "data-layout-allow-occlusion": "" }, it)));
      const base = mk("um-tabs-base"), over = mk("um-tabs-over");
      const ind = h("div", { class: "um-tabs-ind" });
      const el = h("div", { class: "um-layer", style: { height: H + "px", padding: PAD + "px" } }, base, ind, over);
      const K = {
        el, surface: "paper", fit: true, h: H, r: "pill",
        measure() {
          K.pos = [...base.children].map((c) => ({ l: c.offsetLeft, r: c.offsetLeft + c.offsetWidth }));
        },
        pt: (i) => (S) => [(K.pos[i].l + K.pos[i].r) / 2 - S.w / 2, 4],
        trigger: (S) => K.pt(S.last2)(S),
        plan(S, api) {
          const n = items.length;
          S.clicks = [];
          for (let k = 1; k < n; k++) {
            const tc = S.T + S.D * lerp(0.3, 0.7, n > 2 ? (k - 1) / (n - 2) : 0);
            S.clicks.push({ t: tc, i: k });
            api.click(tc, K.pt(k));
            api.fast(tc, tc + 0.3);
          }
          S.last2 = n - 1;
        },
        update(t, S) {
          const L = [], R = [];
          let prev = 0;
          S.clicks.forEach((c) => {
            const right = c.i > prev;
            L.push({ t: c.t, to: K.pos[c.i].l, opts: right ? SPR.trail : SPR.lead });
            R.push({ t: c.t, to: K.pos[c.i].r, opts: right ? SPR.lead : SPR.trail });
            prev = c.i;
          });
          const l = track(L, t, { from: K.pos[0].l }), r = Math.max(l + 20, track(R, t, { from: K.pos[0].r }));
          Object.assign(ind.style, { left: f2(PAD + l) + "px", width: f2(r - l) + "px" });
          const wAll = base.offsetWidth;
          over.style.clipPath = `inset(0 ${f2(wAll - r)}px 0 ${f2(l)}px round ${(H - 2 * PAD) / 2}px)`;
        },
      };
      return K;
    },
  };

  KINDS.chart = {
    weight: 1.55, surface: "paper", nominal: [660, 420],
    make(s, E) {
      const vals = (s.values || [4, 6, 5, 8, 7, 10, 9, 12]).slice(0, 16).map(Number);
      const n = vals.length, max = Math.max(...vals, 1);
      const W = 660, H = 420, PX = 36;
      const hasHead = s.title || s.value;
      const top = hasHead ? 168 : 60, bot = 36, AH = H - top - bot, AW = W - 2 * PX;
      const gap = n > 10 ? 8 : 14, bw = (AW - gap * (n - 1)) / n;
      const line = s.mode === "line";
      const el = h("div", { class: "um-layer", style: { width: W + "px", height: H + "px" } });
      if (s.title) el.appendChild(h("div", { class: "um-t-sub", style: { position: "absolute", left: PX + "px", top: "34px", fontSize: "22px" } }, s.title));
      if (s.value) el.appendChild(h("div", { class: "um-chart-v", style: { position: "absolute", left: PX + "px", top: "64px" } }, s.value));
      if (s.delta) el.appendChild(h("div", { class: "um-chip-acc", style: { position: "absolute", right: PX + "px", top: "34px" } }, s.delta));
      const fmt = (v) => (s.prefix || "") + (Number.isInteger(v) ? v : v.toFixed(1)) + (s.suffix || "");
      const cx = (i) => PX + i * (bw + gap) + bw / 2;
      const bh = (i) => Math.max(10, (vals[i] / max) * AH);
      const bars = [];
      let path = null, area = null, dot = null;
      if (line) {
        const pts = vals.map((v, i) => [PX + (i * AW) / Math.max(1, n - 1), top + AH - (v / max) * (AH - 10)]);
        let d = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
        for (let i = 1; i < n; i++) {
          const p0 = pts[Math.max(0, i - 2)], p1 = pts[i - 1], p2 = pts[i], p3 = pts[Math.min(n - 1, i + 1)];
          d += ` C${f2(p1[0] + (p2[0] - p0[0]) / 6)} ${f2(p1[1] + (p2[1] - p0[1]) / 6)} ${f2(p2[0] - (p3[0] - p1[0]) / 6)} ${f2(p2[1] - (p3[1] - p1[1]) / 6)} ${f2(p2[0])} ${f2(p2[1])}`;
        }
        const svg = h("div", { style: { position: "absolute", left: 0, top: 0 }, html: `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none"><path class="ar" d="${d} L${PX + AW} ${top + AH} L${PX} ${top + AH}Z" fill="var(--um-acc)" opacity="0.08"/><path class="ln" d="${d}" pathLength="1" stroke="var(--um-fg)" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 1"/><circle class="dt" r="8" fill="var(--um-acc)" stroke="var(--um-bg)" stroke-width="3"/></svg>` });
        el.appendChild(svg);
        path = svg.querySelector(".ln"); area = svg.querySelector(".ar"); dot = svg.querySelector(".dt");
        el._pts = pts;
      } else {
        for (let i = 0; i < n; i++) {
          const b = h("div", { class: "um-bar", style: { left: f2(cx(i) - bw / 2) + "px", width: f2(bw) + "px", borderRadius: f2(Math.min(10, bw / 2)) + "px" } });
          el.appendChild(b);
          bars.push(b);
        }
      }
      const tip = h("div", { class: "um-tip", "data-layout-allow-overlap": "" }, ...vals.map((v) => h("span", {}, fmt(v))));
      el.appendChild(tip);
      const tipLabels = [...tip.children];
      const BASE = P_rgb(E, "sub2"), ACC = E.P.A;
      const imax = vals.indexOf(Math.max(...vals));
      const ptY = (i) => (line ? el._pts[i][1] : top + AH - bh(i));
      const ptX = (i) => (line ? el._pts[i][0] : cx(i));
      const K = {
        el, surface: "paper", w: W, h: H, r: 40,
        trigger: (S) => [ptX(S.hov[S.hov.length - 1].i) - W / 2, ptY(S.hov[S.hov.length - 1].i) + (line ? 0 : 34) - H / 2],
        plan(S, api) {
          let idx = [Math.floor(n * 0.3), Math.floor(n * 0.6), imax];
          idx = [...new Set(idx)].sort((a, b) => a - b);
          if (idx[idx.length - 1] !== imax) idx = idx.filter((i) => i !== imax).concat(imax);
          S.hov = idx.map((i, k) => ({ i, t: S.T + S.D * lerp(0.34, 0.74, idx.length > 1 ? k / (idx.length - 1) : 0) }));
          S.hov.forEach((hv) => api.hover(hv.t, () => [ptX(hv.i) - W / 2, ptY(hv.i) + (line ? 0 : 34) - H / 2]));
        },
        update(t, S) {
          const u = t - S.T;
          if (line) {
            const dp = c01(response(u - 0.1, { freq: 1.1, damping: 1 }));
            path.style.strokeDashoffset = f4(1 - dp);
            area.style.clipPath = `inset(0 ${f2((1 - dp) * 100)}% 0 0)`;
          } else {
            bars.forEach((b, i) => {
              const g = response(u - 0.1 - i * 0.035, { freq: 2.3, damping: 0.8 });
              const hh = bh(i) * g;
              b.style.top = f2(top + AH - hh) + "px";
              b.style.height = f2(Math.max(0, hh)) + "px";
              const hl = c01(track(hoverChanges(S, i), t, { from: 0, freq: 4, damping: 1 }));
              b.style.background = rgba(mixC(BASE, ACC, hl), lerp(BASE[3], 1, hl));
            });
          }
          const show = c01(track([{ t: S.hov[0].t - 0.02, to: 1 }], t, { from: 0, ...SPR.fade }));
          const xs = S.hov.map((hv) => ({ t: hv.t - 0.02, to: ptX(hv.i) }));
          const ys = S.hov.map((hv) => ({ t: hv.t - 0.02, to: ptY(hv.i) }));
          const x = track(xs, t, { ...SPR.item, from: xs[0].to }), y = track(ys, t, { ...SPR.item, from: ys[0].to });
          tip.style.opacity = f4(show);
          tip.style.transform = `translate(${f2(x)}px, ${f2(y - 16)}px) translate(-50%, -100%) scale(${f4(0.9 + 0.1 * show)})`;
          tipLabels.forEach((lab, i) => {
            const o = c01(track(hoverChanges(S, i), t, { from: 0, freq: 6, damping: 1 }));
            lab.style.opacity = f4(o);
            lab.style.filter = o > 0.02 && o < 0.98 ? `blur(${f2(4 * (1 - o))}px)` : "none";
          });
          if (dot) {
            dot.setAttribute("cx", f2(x));
            dot.setAttribute("cy", f2(y));
            dot.style.opacity = f4(show);
          }
        },
      };
      function hoverChanges(S, i) {
        return S.hov.map((hv) => ({ t: hv.t - 0.02, to: hv.i === i ? 1 : 0 }));
      }
      return K;
    },
  };

  KINDS.command = {
    weight: 2.2, surface: "paper", nominal: [740, 450],
    make(s, E) {
      const res = (s.results || []).slice(0, 6).map((r, i) => (typeof r === "string" ? { label: r } : r));
      const ICONS = ["file", "user", "chart", "settings", "calendar", "mail"];
      const W = 740, SH = 92, RH = 68, TOP = SH + 1 + 8;
      const HMAX = TOP + RH * Math.max(1, res.length) + 8;
      const q = String(s.query || "");
      const el = h("div", { class: "um-layer um-cmd", style: { width: W + "px", height: HMAX + "px" } });
      const typed = h("span", { class: "um-cmd-typed" });
      const caret = h("span", { class: "um-caret" });
      const ph = h("span", { class: "um-cmd-ph" }, s.placeholder || "");
      const input = h("div", { class: "um-cmd-input" }, typed, caret, ph);
      const kbd = h("span", { class: "um-kbd", style: { position: "absolute", right: "28px", top: (SH - 36) / 2 + "px" } }, "esc");
      const srch = icon("search", 30);
      at(srch, 44, SH / 2, 30);
      srch.style.color = "var(--um-muted)";
      const hair = h("div", { class: "um-hair", style: { top: SH + "px" } });
      const sel = h("div", { class: "um-cmd-sel", style: { top: TOP + "px", height: RH + "px" } });
      const rows = res.map((r, i) => {
        const lab = h("span", { class: "um-cmd-l" }, r.label);
        const enter = h("span", { class: "um-kbd um-kbd-sm" }, "↵");
        const hint = r.hint ? h("span", { class: "um-t-sub", style: { fontSize: "20px" } }, r.hint) : null;
        const tileEl = h("span", { class: "um-tile um-tile-sm" }, icon(r.icon && ICON[r.icon] ? r.icon : ICONS[i % ICONS.length], 26));
        const row = h("div", { class: "um-cmd-row", "data-layout-allow-overlap": "", "data-layout-allow-occlusion": "", style: { height: RH + "px" } }, tileEl, lab, h("span", { class: "um-grow" }), hint, enter);
        return { row, lab, enter, r, tileEl };
      });
      el.append(srch, input, kbd, hair, sel, ...rows.map((x) => x.row));
      const matchesAt = (k) => {
        const qq = q.slice(0, k).toLowerCase().trim();
        return res.map((r) => !qq || r.label.toLowerCase().includes(qq));
      };
      const heightFor = (m) => { const c = m.filter(Boolean).length; return c ? TOP + RH * c + 8 : SH + 1; };
      const K = {
        el, surface: "paper", w: W, h: HMAX, r: 30, anchor: "top", trigger: "key",
        plan(S, api) {
          const D = S.D;
          const t0 = S.T + Math.max(0.3, 0.16 * D), t1 = S.T + 0.7 * D;
          const gaps = [...q].map(() => 0.7 + 0.6 * E.rng());
          const sum = gaps.reduce((a, b) => a + b, 0) || 1;
          let acc = t0;
          S.chars = gaps.map((g) => (acc += ((t1 - t0) * g) / sum));
          S.tType0 = t0;
          S.tType1 = t1;
          api.cursorVis(S.T + 0.06, 0);
          api.cursorVis(S.T2 + 0.3, 1);
          if (q.length) api.cue(t0, "typing", t1 - t0);
          api.fast(S.T2 - 0.05, S.T2 + 0.3);
        },
        shapeEvents(S) {
          const ev = [];
          let prevH = heightFor(matchesAt(0));
          S.chars.forEach((tc, j) => {
            const hh = heightFor(matchesAt(j + 1));
            if (hh !== prevH) ev.push({ t: tc + 0.02, to: hh });
            prevH = hh;
          });
          return ev;
        },
        update(t, S) {
          let k = 0;
          while (k < S.chars.length && S.chars[k] <= t) k++;
          const str = q.slice(0, k);
          setText(typed, str);
          ph.style.display = k ? "none" : "";
          const typing = t >= S.tType0 - 0.1 && t <= S.tType1 + 0.35;
          caret.style.opacity = typing || Math.floor((t - S.T) / 0.5) % 2 === 0 ? "1" : "0";
          // rows: opacity and slot position are springs summed over every filter change
          const ms = [matchesAt(0)].concat(S.chars.map((_, j) => matchesAt(j + 1)));
          const qq = str.toLowerCase().trim();
          rows.forEach((R, i) => {
            const O = [], Y = [];
            ms.forEach((m, j) => {
              if (j === 0) return;
              let slot = 0;
              for (let a = 0; a < i; a++) if (m[a]) slot++;
              O.push({ t: S.chars[j - 1], to: m[i] ? 1 : 0 });
              Y.push({ t: S.chars[j - 1], to: slot });
            });
            const o = c01(track(O, t, { from: 1, ...SPR.fade }));
            const y = track(Y, t, { from: i, ...SPR.item });
            R.row.style.transform = `translateY(${f2(TOP + y * RH)}px)`;
            R.row.style.opacity = f4(o);
            R.row.style.filter = o > 0.02 && o < 0.98 ? `blur(${f2(5 * (1 - o))}px)` : "none";
            R.row.style.visibility = o < 0.005 ? "hidden" : "";
            const lab = R.r.label, at0 = qq ? lab.toLowerCase().indexOf(qq) : -1;
            const html = at0 >= 0 ? `${esc(lab.slice(0, at0))}<b>${esc(lab.slice(at0, at0 + qq.length))}</b>${esc(lab.slice(at0 + qq.length))}` : esc(lab);
            if (R.lab.innerHTML !== html) R.lab.innerHTML = html;
            R.lab.classList.toggle("q", !!qq);
            const cur = ms[k];
            const first = cur.indexOf(true);
            R.enter.style.opacity = f4(c01(track(ms.slice(1).map((m, j) => ({ t: S.chars[j], to: m.indexOf(true) === i ? 1 : 0 })), t, { from: i === 0 ? 1 : 0, ...SPR.fade })));
            const kp = track([{ t: S.T2 - 0.07, to: 0.86 }, { t: S.T2 + 0.05, to: 1 }], t, { from: 1, ...SPR.press });
            R.enter.style.transform = first === i ? `scale(${f4(kp)})` : "none";
            R.tileEl.classList.toggle("on", first === i);
          });
          sel.style.opacity = f4(c01(track(ms.slice(1).map((m, j) => ({ t: S.chars[j], to: m.some(Boolean) ? 1 : 0 })), t, { from: 1, ...SPR.fade })));
        },
      };
      return K;
    },
  };

  KINDS.toast = {
    weight: 0.9, surface: "ink", nominal: [380, 84],
    make(s) {
      const el = h(
        "div",
        { class: "um-layer um-row", style: { height: "84px", padding: "0 34px 0 20px", gap: "14px" } },
        h("span", { class: "um-disc um-disc-acc" }, icon(s.icon && ICON[s.icon] ? s.icon : "check", 24)),
        h("span", { class: "um-t-toast" }, s.text || "")
      );
      return { el, surface: "ink", fit: true, h: 84, r: "pill", trigger: () => [0, 4] };
    },
  };

  // ---------------------------------------------------------------- scene
  EM.scene("ui-morph", {
    ownsCamera: true,
    build(ctx) {
      const { tl, start, end, dur, props: p, cam } = ctx;
      let list = (p.states || []).filter((s) => s && KINDS[s.kind]).slice(0, 12);
      if (!list.length) return;
      const loop = !!p.loop;
      if (loop && JSON.stringify(list[list.length - 1]) !== JSON.stringify(list[0])) list = list.concat([list[0]]);
      const N = list.length;
      const canvasMode = p.canvas || (/tone-(dark|black)/.test(ctx.el.className) ? "dark" : "warm");
      const P = palette(canvasMode, p.accent || fx.cssVar(ctx.el, "--accent") || "#ff5b37");
      const fill = clamp(p.fill || 0.6, 0.4, 0.8);

      // ---------- DOM
      const root = h("div", { class: "um-root" });
      const canvas = h("div", { class: "um-canvas", style: { background: `radial-gradient(80% 75% at 50% 45%, ${P.glow} 0%, ${P.canvas} 100%)` } });
      const world = h("div", { class: "um-world" });
      const shape = h("div", { class: "um-shape" });
      world.appendChild(shape);
      root.append(canvas, world);
      cam.appendChild(root);
      const cursor = fx.cursor(world, { x: 0, y: 0 });
      gsap.set(cursor, { clearProps: "transform" });

      // ---------- states + time plan
      const states = list.map((s, i) => {
        const def = KINDS[s.kind];
        const pal = P[def.surface];
        const S = { i, s, def };
        S.K = def.make(s, { P, pal, rng: EM.rng((s.kind || "") + i + "-" + (ctx.index || 0)) });
        const st = S.K.el.style;
        st.setProperty("--um-fg", pal.fg); st.setProperty("--um-on", pal.on); st.setProperty("--um-muted", pal.muted);
        st.setProperty("--um-sub", pal.sub); st.setProperty("--um-sub2", pal.sub2); st.setProperty("--um-acc", rgba(P.A));
        st.setProperty("--um-bg", rgba(pal.bg));
        if (S.K.anchor === "top") { st.top = "0px"; st.transformOrigin = "50% 0"; }
        shape.appendChild(S.K.el);
        return S;
      });

      const tail = loop ? 1.15 : 1.0;
      const head = loop ? 0 : 0.3;
      const Wt = states.map((S) => S.def.weight);
      const sumW = Wt.slice(0, N - 1).reduce((a, b) => a + b, 0) || 1;
      const k = Math.max(0.2, (dur - head - tail) / sumW);
      const T = [start];
      let acc = start + head;
      for (let i = 1; i < N; i++) { acc += Wt[i - 1] * k; T.push(acc); }
      const limit = end - tail + 0.05, minGap = 0.45;
      const onsets = (ctx.words || []).map((w) => w.start).filter((x) => x > start && x < end);
      const beat = p.bpm ? 60 / p.bpm : 0;
      for (let i = 1; i < N; i++) {
        let t = T[i];
        const lo = T[i - 1] + minGap;
        if (onsets.length) {
          let best = null;
          const win = Math.max(0.35, 0.45 * Wt[i - 1] * k);
          for (const o of onsets) if (o - 0.03 >= lo && o - 0.03 <= limit && Math.abs(o - t) < win && (best == null || Math.abs(o - t) < Math.abs(best - t))) best = o;
          if (best != null) t = best - 0.03;
        } else if (beat) {
          let sn = Math.round(t / beat) * beat;
          while (sn < lo - 1e-6) sn += beat;
          while (sn > limit + 1e-6 && sn - beat >= lo - 1e-6) sn -= beat;
          if (sn >= lo - 1e-6 && sn <= limit + 1e-6) t = sn;
        }
        T[i] = Math.max(lo, t);
      }
      (EM.morphPlans = EM.morphPlans || [])[ctx.index] = T.map((x) => Math.round(x * 1000) / 1000);
      states.forEach((S, i) => {
        S.T = T[i];
        S.last = i === N - 1;
        S.T2 = S.last ? end + 5 : T[i + 1];
        // the last state keeps ~30% of its time to settle before the cut
        S.D = S.last ? Math.max(0.5, (end - S.T) * 0.7) : S.T2 - S.T;
      });

      // ---------- events (times only; points resolve lazily once fonts are measured)
      const cursorEv = [], cues = EM.cues = EM.cues || [], fast = EM.fastWindows = EM.fastWindows || [];
      const cPress = [], cVis = [], sPress = [];
      if (!loop) cVis.push({ t: start + 0.35, to: 1 });
      const api = (S) => ({
        click(t, pt) { cursorEv.push({ t, type: "click", S, pt }); cPress.push({ t: t - 0.05, to: 0.85 }, { t: t + 0.09, to: 1 }); cues.push({ t, type: "click" }); },
        grab(t, pt, drag, release) { cursorEv.push({ t, type: "grab", S, pt, drag, release }); cPress.push({ t: t - 0.05, to: 0.85 }, { t: release, to: 1 }); cues.push({ t, type: "click" }); },
        hover(t, pt) { cursorEv.push({ t, type: "hover", S, pt }); },
        cursorVis(t, v) { cVis.push({ t, to: v }); },
        cue(t, type, d) { cues.push({ t, type, dur: d }); },
        fast(t0, t1) { fast.push([t0, t1]); },
      });
      states.forEach((S) => {
        const A = api(S);
        if (S.K.plan) S.K.plan(S, A);
        if (S.last) return;
        const trig = S.K.trigger;
        if (trig === "key") A.cue(S.T2, "click");
        else if (typeof trig === "function") {
          A.click(S.T2, trig);
          sPress.push({ t: S.T2 - 0.05, to: 0.965 }, { t: S.T2 + 0.08, to: 1 });
        }
        const a = S.def.nominal, b = states[S.i + 1].def.nominal;
        if (Math.max(a[0] / b[0], b[0] / a[0], a[1] / b[1], b[1] / a[1]) > 1.5) fast.push([S.T2 - 0.02, S.T2 + 0.3]);
      });
      const byT = (a, b) => a.t - b.t;
      cursorEv.sort(byT); cPress.sort(byT); cVis.sort(byT); sPress.sort(byT);
      const cVisFrom = loop ? 1 : 0;

      // ---------- geometry (lazy: needs real font metrics; cached once fonts are loaded)
      const fam = (fx.cssVar(root, "--font-body").split(",")[0] || "").trim();
      const fontsReady = () => {
        try { return !document.fonts || (document.fonts.check(`500 24px ${fam}`) && document.fonts.check(`600 24px ${fam}`)); } catch (e) { return true; }
      };
      let GEO = null;
      function geo() {
        if (GEO) return GEO;
        const ready = fontsReady();
        const G = computeGeo();
        if (ready) GEO = G;
        return G;
      }
      function computeGeo() {
        states.forEach((S) => {
          const K = S.K;
          if (K.fit) {
            K.el.style.width = "";
            S.w = Math.ceil(K.el.offsetWidth / 2) * 2;
            K.el.style.width = S.w + "px";
          } else S.w = K.w;
          S.h = K.h;
          S.r = K.r === "pill" ? S.h / 2 : K.r;
          if (K.measure) K.measure();
        });
        const pal = (S) => P[S.def.surface];
        const W = [], H = [], R = [], C = [[], [], []], RING = [], SH = [], HI = [], Z = [];
        const zOf = (S) => clamp((fill * 1920) / Math.max(S.w, S.h * 1.62), 0.9, 3.2);
        states.forEach((S, i) => {
          if (!i) return;
          const q = pal(S), t = S.T;
          W.push({ t, to: S.w }); H.push({ t, to: S.h }); R.push({ t, to: S.r });
          oklab(q.bg).forEach((v, c) => C[c].push({ t, to: v }));
          RING.push({ t, to: q.ring }); SH.push({ t, to: q.sh }); HI.push({ t, to: q.hi });
          Z.push({ t: t + 0.02, to: zOf(S) });
          if (S.K.shapeEvents) S.K.shapeEvents(S).forEach((e) => H.push(e));
        });
        const S0 = states[0], q0 = pal(S0);
        H.sort(byT);
        const G = {
          W, H, R, C, RING, SH, HI, Z,
          from: { w: S0.w, h: S0.h, r: S0.r, c: oklab(q0.bg), ring: q0.ring, sh: q0.sh, hi: q0.hi, z: zOf(S0) },
        };
        // cursor waypoints: eased arcs between targets, straight drags while held
        const worldPt = (S, pt) => {
          const v = pt(S);
          return S.K.anchor === "top" ? [v[0], v[1] - S.h / 2 + S.K.h / 2] : [v[0], v[1]];
        };
        const rest = [Math.round(S0.w * 0.2), Math.round(S0.h / 2 + 64)];
        const wps = [{ t: -1e9, p: rest, mode: "hold" }];
        let cur = rest, free = start + (loop ? 0.1 : 0.4);
        const hold = (t) => { if (t > wps[wps.length - 1].t) wps.push({ t, p: cur, mode: "hold" }); };
        cursorEv.forEach((e) => {
          const P1 = worldPt(e.S, e.pt);
          const dwell = e.type === "hover" ? 0 : e.type === "grab" ? 0.08 : 0.11;
          let arrive = e.t - dwell;
          let md = clamp(0.26 + Math.hypot(P1[0] - cur[0], P1[1] - cur[1]) / 1700, 0.3, 0.6);
          if (arrive - md - free > 0.8) {
            // idle: the hand drifts off the component instead of freezing on top of it
            hold(free);
            cur = [cur[0] + 26, cur[1] + 34];
            wps.push({ t: free + 0.5, p: cur, mode: "move" });
            free += 0.5;
            md = clamp(0.26 + Math.hypot(P1[0] - cur[0], P1[1] - cur[1]) / 1700, 0.3, 0.6);
          }
          let depart = Math.max(free, arrive - md);
          if (arrive - depart < 0.2) arrive = Math.min(e.t - 0.02, depart + 0.2);
          if (arrive <= depart + 0.04) arrive = depart + 0.05;
          hold(depart);
          wps.push({ t: arrive, p: P1, mode: "move" });
          cur = P1;
          if (e.drag) {
            e.drag.forEach((d) => { cur = worldPt(e.S, d.pt); wps.push({ t: d.t, p: cur, mode: "drag" }); });
            hold(e.release);
            free = e.release + 0.06;
          } else free = e.t + (e.type === "hover" ? 0.03 : 0.1);
        });
        if (loop) {
          const tb = end - 0.3;
          hold(Math.max(free, tb - 0.55));
          wps.push({ t: Math.max(free + 0.3, tb), p: rest, mode: "move" });
        }
        G.wps = wps;
        return G;
      }
      const ease3 = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
      const easeS = (u) => 0.5 - 0.5 * Math.cos(Math.PI * u);
      function cursorAt(G, t) {
        const w = G.wps;
        let j = w.length - 1;
        while (j > 0 && w[j].t > t) j--;
        if (j === w.length - 1) return w[j].p;
        const a = w[j], b = w[j + 1];
        const u = c01((t - a.t) / Math.max(1e-4, b.t - a.t));
        if (b.mode === "hold") return a.p;
        const dx = b.p[0] - a.p[0], dy = b.p[1] - a.p[1], d = Math.hypot(dx, dy) || 1;
        if (b.mode === "drag") { const e = easeS(u); return [a.p[0] + dx * e, a.p[1] + dy * e]; }
        const e = ease3(u);
        let nx = -dy / d, ny = dx / d;
        if (ny > 0) { nx = -nx; ny = -ny; }
        const arc = Math.min(70, d * 0.14) * Math.sin(Math.PI * e);
        return [a.p[0] + dx * e + nx * arc, a.p[1] + dy * e + ny * arc];
      }

      // ---------- frame(t): the whole scene as a pure function of time
      const intro = loop ? null : [{ t: start + 0.02, to: 1 }];
      function frame(t) {
        const G = geo();
        const C = cursorAt(G, t);
        const X = { C, cursorAt: (tt) => cursorAt(G, tt) };
        let stretch = 0;
        states.forEach((S) => { if (S.K.stretch) stretch += S.K.stretch(t, S, X); });
        const F = G.from;
        const w = track(G.W, t, { ...SPR.w, from: F.w }) + stretch;
        const hh = track(G.H, t, { ...SPR.h, from: F.h }) - stretch * 0.1;
        const r = clamp(track(G.R, t, { ...SPR.r, from: F.r }), 0, Math.min(w, hh) / 2);
        const bg = fromOklab([0, 1, 2].map((c) => track(G.C[c], t, { ...SPR.col, from: F.c[c] })));
        const ring = Math.max(0, track(G.RING, t, { ...SPR.col, from: F.ring }));
        const sh = Math.max(0, track(G.SH, t, { ...SPR.col, from: F.sh }));
        const hi = Math.max(0, track(G.HI, t, { ...SPR.col, from: F.hi }));
        const pr = track(sPress, t, { ...SPR.press, from: 1 });
        const ii = intro ? track(intro, t, { freq: 2.2, damping: 0.8, from: 0 }) : 1;
        X.w = w; X.h = hh; X.stretch = stretch;
        const s = shape.style;
        s.width = f2(w) + "px";
        s.height = f2(hh) + "px";
        s.borderRadius = f2(r) + "px";
        s.background = rgba(bg);
        s.opacity = f4(c01(ii * 1.6));
        const sr = P.shRGB;
        s.boxShadow = `0 0 0 1px ${rgba(P.ringRGB, ring)}, inset 0 1px 0 rgba(255,255,255,${f4(hi)}), 0 1px 2px ${rgba(sr, sh * 0.4)}, 0 8px 20px -6px ${rgba(sr, sh * 0.55)}, 0 32px 72px -24px ${rgba(sr, sh)}`;
        s.transform = `translate(${f2(-w / 2 + stretch / 2)}px, ${f2(-hh / 2)}px) scale(${f4(pr * (0.6 + 0.4 * ii))})`;

        // content layers: each state enters and exits on its own short blur timing
        states.forEach((S, i) => {
          const el = S.K.el;
          const eIn = i === 0 ? (loop ? 1 : c01(response(t - start - 0.12, SPR.enter))) : c01(response(t - S.T - 0.075, SPR.enter));
          const eOut = S.last ? 0 : c01(response(t - S.T2, SPR.exit));
          const o = eIn * (1 - eOut);
          if (o < 0.002) { el.style.visibility = "hidden"; el.style.opacity = "0"; return; }
          el.style.visibility = "";
          el.style.opacity = f4(o);
          const blur = 9 * (1 - eIn) + 9 * eOut;
          el.style.filter = blur > 0.05 ? `blur(${f2(blur)}px)` : "none";
          const prv = states[i - 1], nxt = states[i + 1];
          const dIn = prv ? Math.sign(S.w * S.h - prv.w * prv.h) : 1;
          const dOut = nxt ? Math.sign(nxt.w * nxt.h - S.w * S.h) : 0;
          const sc = lerp(dIn > 0 ? 0.9 : 1.07, 1, eIn) * lerp(1, dOut > 0 ? 1.07 : 0.93, eOut);
          el.style.transform = (S.K.anchor === "top" ? "translate(-50%, 0)" : "translate(-50%, -50%)") + ` scale(${f4(sc)})`;
          if (S.K.update) S.K.update(t, S, X);
        });

        // camera: spring zoom per state + a barely-there periodic drift (loop-safe)
        const z = track(G.Z, t, { ...SPR.cam, from: F.z });
        // looping: the drift phase completes exactly on the final frame so it equals the first
        const u = c01((t - start) / (loop ? dur - 1 / 30 : dur));
        world.style.transform = `translate(${f2(5 * Math.sin(2 * Math.PI * u))}px, ${f2(3 * Math.sin(4 * Math.PI * u))}px) scale(${f4(z)})`;

        // cursor lives in world space (zooms with the UI) but keeps a steady on-screen size
        const cp = track(cPress, t, { ...SPR.press, from: 1 });
        const cv = c01(track(cVis, t, { freq: 4, damping: 1, from: cVisFrom }));
        const cs = 0.95 * Math.pow(1.9 / z, 0.85) * cp;
        cursor.style.transform = `translate(${f2(C[0] - 6)}px, ${f2(C[1] - 4)}px) scale(${f4(cs)})`;
        cursor.style.opacity = f4(cv);
      }

      drive(tl, Math.max(0, start - 0.45), end + 0.45, frame);
    },
  });
})();

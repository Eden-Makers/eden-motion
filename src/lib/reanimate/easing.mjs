// Adapted from NiazMorshed2007/reanimate (MIT License, Copyright (c) 2026 Niaz Morshed).
// Fit a recorded [t_ms, value] series, DOM track.json, or gl-track.json channel to named
// cubic-bezier / GSAP easings and report delay, duration, overshoot, best-fit RMSE, and track diffs.
import fs from "node:fs";

const bez = (x1, y1, x2, y2) => (t) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let lo = 0, hi = 1, u = t;
  for (let i = 0; i < 30; i++) {
    u = (lo + hi) / 2;
    const x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u ** 2 * x2 + u ** 3;
    if (x < t) lo = u;
    else hi = u;
  }
  return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u ** 2 * y2 + u ** 3;
};

const powOut = (p) => (t) => 1 - Math.pow(1 - t, p);
const powIn = (p) => (t) => Math.pow(t, p);
const powInOut = (p) => (t) => (t < 0.5 ? Math.pow(2, p - 1) * Math.pow(t, p) : 1 - Math.pow(-2 * t + 2, p) / 2);

const LAND_DENOM = 1 - Math.pow(2, -6);

export const EASING_CATALOG = {
  "linear":              { fn: (t) => t, gsap: "none", css: "linear" },
  "land":                { fn: (t) => (1 - Math.pow(2, -6 * t)) / LAND_DENOM, gsap: "land", css: "cubic-bezier(0.16,1,0.3,1)" },
  "power1.out":          { fn: powOut(2), gsap: "power1.out", css: "cubic-bezier(0.5,1,0.89,1)" },
  "power1.in":           { fn: powIn(2), gsap: "power1.in", css: "cubic-bezier(0.11,0,0.5,0)" },
  "power1.inOut":        { fn: powInOut(2), gsap: "power1.inOut", css: "cubic-bezier(0.45,0,0.55,1)" },
  "power2.out":          { fn: powOut(3), gsap: "power2.out", css: "cubic-bezier(0.33,1,0.68,1)" },
  "power2.in":           { fn: powIn(3), gsap: "power2.in", css: "cubic-bezier(0.32,0,0.67,0)" },
  "power2.inOut":        { fn: powInOut(3), gsap: "power2.inOut", css: "cubic-bezier(0.65,0,0.35,1)" },
  "power3.out":          { fn: powOut(4), gsap: "power3.out", css: "cubic-bezier(0.25,1,0.5,1)" },
  "power3.in":           { fn: powIn(4), gsap: "power3.in", css: "cubic-bezier(0.5,0,0.75,0)" },
  "power3.inOut":        { fn: powInOut(4), gsap: "power3.inOut", css: "cubic-bezier(0.76,0,0.24,1)" },
  "power4.out":          { fn: powOut(5), gsap: "power4.out", css: "cubic-bezier(0.22,1,0.36,1)" },
  "power4.in":           { fn: powIn(5), gsap: "power4.in", css: "cubic-bezier(0.64,0,0.78,0)" },
  "power4.inOut":        { fn: powInOut(5), gsap: "power4.inOut", css: "cubic-bezier(0.83,0,0.17,1)" },
  "expo.out":            { fn: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)), gsap: "expo.out", css: "cubic-bezier(0.16,1,0.3,1)" },
  "expo.in":             { fn: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)), gsap: "expo.in", css: "cubic-bezier(0.7,0,0.84,0)" },
  "expo.inOut":          { fn: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2), gsap: "expo.inOut", css: "cubic-bezier(0.87,0,0.13,1)" },
  "sine.out":            { fn: (t) => Math.sin((t * Math.PI) / 2), gsap: "sine.out", css: "cubic-bezier(0.61,1,0.88,1)" },
  "sine.in":             { fn: (t) => 1 - Math.cos((t * Math.PI) / 2), gsap: "sine.in", css: "cubic-bezier(0.12,0,0.39,0)" },
  "sine.inOut":          { fn: (t) => -(Math.cos(Math.PI * t) - 1) / 2, gsap: "sine.inOut", css: "cubic-bezier(0.37,0,0.63,1)" },
  "circ.out":            { fn: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)), gsap: "circ.out", css: "cubic-bezier(0.075,0.82,0.165,1)" },
  "back.out":            { fn: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2), gsap: "back.out(1.7)", css: "cubic-bezier(0.34,1.56,0.64,1)" },
  "back.inOut":          { fn: bez(0.68, -0.6, 0.32, 1.6), gsap: "back.inOut(1.7)", css: "cubic-bezier(0.68,-0.6,0.32,1.6)" },
  "material.standard":   { fn: bez(0.4, 0, 0.2, 1), gsap: "power2.inOut", css: "cubic-bezier(0.4,0,0.2,1)" },
  "material.emphasized": { fn: bez(0.2, 0, 0, 1), gsap: "power3.out", css: "cubic-bezier(0.2,0,0,1)" },
  "material.decelerate": { fn: bez(0, 0, 0.2, 1), gsap: "power2.out", css: "cubic-bezier(0,0,0.2,1)" },
  "ease":                { fn: bez(0.25, 0.1, 0.25, 1), gsap: "power2.out", css: "ease" },
  "ease-in":             { fn: bez(0.42, 0, 1, 1), gsap: "power1.in", css: "ease-in" },
  "ease-out":            { fn: bez(0, 0, 0.58, 1), gsap: "power1.out", css: "ease-out" },
  "ease-in-out":         { fn: bez(0.42, 0, 0.58, 1), gsap: "power1.inOut", css: "ease-in-out" },
  "expo.landing":        { fn: bez(0.19, 1, 0.22, 1), gsap: "expo.out", css: "cubic-bezier(0.19,1,0.22,1)" },
  "quint.smooth":        { fn: bez(0.23, 1, 0.32, 1), gsap: "power4.out", css: "cubic-bezier(0.23,1,0.32,1)" },
};

export const EASINGS = Object.fromEntries(Object.entries(EASING_CATALOG).map(([k, v]) => [k, v.fn]));

export function matrixPart(transform) {
  if (!transform || transform === "none") return { tx: 0, ty: 0, sx: 1, sy: 1, rot: 0 };
  const m = String(transform).match(/matrix(3d)?\(([^)]+)\)/);
  if (!m) return { tx: 0, ty: 0, sx: 1, sy: 1, rot: 0 };
  const v = m[2].split(",").map(Number);
  if (m[1]) {
    return {
      tx: v[12],
      ty: v[13],
      sx: Math.hypot(v[0], v[1]),
      sy: Math.hypot(v[4], v[5]),
      rot: (Math.atan2(v[1], v[0]) * 180) / Math.PI,
    };
  }
  return {
    tx: v[4],
    ty: v[5],
    sx: Math.hypot(v[0], v[1]),
    sy: Math.hypot(v[2], v[3]),
    rot: (Math.atan2(v[1], v[0]) * 180) / Math.PI,
  };
}

export function resolveChannel(glTrack, name) {
  if (!glTrack?.channels) throw new Error("gl-track missing channels");
  if (glTrack.channels[name]) return name;
  const keys = Object.keys(glTrack.channels).filter((k) => k.endsWith("." + name) || k.endsWith(name));
  if (keys.length === 1) return keys[0];
  throw new Error(
    keys.length
      ? `channel "${name}" is ambiguous: ${keys.slice(0, 12).join(", ")}`
      : `no animated channel "${name}" in gl-track`
  );
}

export function seriesFromTrack(trackOrPath, { selector, prop = "y", channel, fromMs = -Infinity, toMs = Infinity } = {}) {
  const t = typeof trackOrPath === "string" ? JSON.parse(fs.readFileSync(trackOrPath, "utf8")) : trackOrPath;
  const out = [];
  if (t.kind === "gl-track") {
    if (!channel) throw new Error("gl-track requires channel option");
    const k = resolveChannel(t, channel);
    for (const s of t.samples || []) {
      if (s.v[k] !== undefined && s.t >= fromMs && s.t <= toMs) out.push([s.t, s.v[k]]);
    }
    return out;
  }
  const sel = selector || (t.selectors && t.selectors[0]);
  if (!sel) throw new Error("track requires selector option");
  for (const s of t.samples || []) {
    if (s.t < fromMs || s.t > toMs) continue;
    const e = s.els?.[sel];
    if (!e) continue;
    const mp = matrixPart(e.transform);
    const v = {
      x: e.x,
      y: e.y,
      w: e.w,
      h: e.h,
      opacity: e.opacity,
      translateX: mp.tx,
      translateY: mp.ty,
      scale: mp.sx,
      scaleX: mp.sx,
      scaleY: mp.sy,
      rotate: mp.rot,
    };
    if (!(prop in v)) throw new Error(`unknown prop "${prop}"; use one of ${Object.keys(v).join(", ")}`);
    out.push([s.t, v[prop]]);
  }
  return out;
}

export function fitSeries(series, { minSamples = 4 } = {}) {
  if (!Array.isArray(series) || series.length < minSamples) {
    return {
      samples: Array.isArray(series) ? series.length : 0,
      start: series?.[0]?.[1] ?? null,
      end: series?.[series.length - 1]?.[1] ?? null,
      change: 0,
      delayMs: 0,
      visibleDurationMs: 0,
      overshootPct: 0,
      isSpring: false,
      bestFit: null,
      bestFits: [],
      verdict: "insufficient samples",
    };
  }
  const t0 = series[0][0];
  const start = series[0][1];
  const end = series[series.length - 1][1];
  const range = end - start;
  const eps = Math.max(Math.abs(range) * 0.01, 0.002);

  let firstChange = series.findIndex(([, v]) => Math.abs(v - start) > eps);
  if (firstChange < 0) {
    return {
      samples: series.length,
      start: +start.toFixed(3),
      end: +end.toFixed(3),
      change: +range.toFixed(3),
      delayMs: 0,
      visibleDurationMs: 0,
      overshootPct: 0,
      isSpring: false,
      bestFit: null,
      bestFits: [],
      verdict: "no motion",
    };
  }
  let lastChange = series.length - 1;
  for (let i = series.length - 1; i > 0; i--) {
    if (Math.abs(series[i][1] - end) > eps) {
      lastChange = Math.min(series.length - 1, i + 1);
      break;
    }
  }
  if (firstChange < 1) firstChange = 1;
  const delayMs = series[firstChange - 1][0] - t0;
  const durMs = series[lastChange][0] - series[firstChange - 1][0];
  const extremes = series.map(([, v]) => v);
  const overshoot =
    range === 0
      ? 0
      : Math.max(
          0,
          (Math.max(...extremes.map((v) => (v - start) * Math.sign(range))) - Math.abs(range)) / Math.abs(range)
        );

  // Detect damped oscillation (sign reversals around end) as spring-like even with modest overshoot
  let signCrossings = 0;
  if (Math.abs(range) > 0) {
    let prevSign = 0;
    for (let i = firstChange; i <= lastChange; i++) {
      const diff = series[i][1] - end;
      if (Math.abs(diff) <= eps) continue;
      const s = Math.sign(diff);
      if (prevSign && s !== prevSign) signCrossings++;
      prevSign = s;
    }
  }
  const isSpring = overshoot > 0.02 || signCrossings >= 2;

  const fits = [];
  if (Math.abs(range) > 0 && durMs > 0) {
    const startCandidates = [firstChange - 1];
    if (firstChange - 2 >= 0) startCandidates.push(firstChange - 2);
    if (firstChange - 3 >= 0) startCandidates.push(firstChange - 3);
    for (const [name, meta] of Object.entries(EASING_CATALOG)) {
      let best = { rmse: Infinity, durationMs: durMs };
      for (const sIdx of startCandidates) {
        const base = series[sIdx][0];
        const spanMs = series[lastChange][0] - base;
        if (spanMs <= 0) continue;
        const raw = series.slice(sIdx).map(([t, v]) => [t - base, (v - start) / range]);
        for (let k = 1; k <= 2.0001; k += 0.05) {
          const d = spanMs * k;
          const pts = raw.filter(([t]) => t <= Math.max(spanMs, d) * 1.05);
          if (!pts.length) continue;
          const err = Math.sqrt(
            pts.reduce((s, [t, y]) => s + (meta.fn(Math.min(1, Math.max(0, t / d))) - y) ** 2, 0) / pts.length
          );
          if (err < best.rmse) best = { rmse: err, durationMs: Math.round(d) };
        }
      }
      fits.push({
        name,
        gsap: meta.gsap,
        css: meta.css,
        rmse: +best.rmse.toFixed(4),
        durationMs: best.durationMs,
      });
    }
    fits.sort((x, y) => x.rmse - y.rmse);
  }

  const top = fits[0] || null;
  const verdict = isSpring
    ? `spring-like / back easing (overshoot ${(overshoot * 100).toFixed(1)}%)`
    : top
      ? `${top.name} over ~${top.durationMs}ms${top.rmse < 0.03 ? " (good fit)" : top.rmse < 0.08 ? " (approximate)" : " (poor fit: multi-step, spring, or scroll-linked)"}`
      : "no motion";

  return {
    samples: series.length,
    start: +start.toFixed(3),
    end: +end.toFixed(3),
    change: +range.toFixed(3),
    delayMs: +delayMs.toFixed(0),
    visibleDurationMs: +durMs.toFixed(0),
    overshootPct: +(overshoot * 100).toFixed(1),
    isSpring,
    bestFit: top,
    bestFits: fits.slice(0, 5),
    verdict,
  };
}

export function compareSeries(refSeries, cloneSeries) {
  if (!refSeries.length || !cloneSeries.length) {
    return { refSamples: refSeries.length, cloneSamples: cloneSeries.length, maxAbsDiff: null, meanAbsDiff: null, sampledDiffs: [] };
  }
  const at = (s, t) => {
    let best = s[0];
    for (const p of s) if (Math.abs(p[0] - t) < Math.abs(best[0] - t)) best = p;
    return best[1];
  };
  const diffs = refSeries.map(([t, v]) => +(at(cloneSeries, t) - v).toFixed(3));
  const absDiffs = diffs.map(Math.abs);
  const step = Math.max(1, Math.ceil(diffs.length / 20));
  return {
    refSamples: refSeries.length,
    cloneSamples: cloneSeries.length,
    maxAbsDiff: +Math.max(...absDiffs).toFixed(3),
    meanAbsDiff: +(absDiffs.reduce((a, b) => a + b, 0) / absDiffs.length).toFixed(3),
    sampledDiffs: diffs.filter((_, i) => i % step === 0),
  };
}

export function analyzeTrack(trackOrPath, opts = {}) {
  const series = opts.series || seriesFromTrack(trackOrPath, opts);
  const res = fitSeries(series, opts);
  if (opts.compareTrack) {
    const other = seriesFromTrack(opts.compareTrack, {
      ...opts,
      selector: opts.compareSelector || opts.selector,
      channel: opts.compareChannel || opts.channel,
    });
    res.compare = compareSeries(series, other);
  }
  return res;
}

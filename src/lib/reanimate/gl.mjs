// Adapted from NiazMorshed2007/reanimate (MIT License, Copyright (c) 2026 Niaz Morshed).
// WebGL / WebGPU / Canvas 2D / Three.js GPU trace exporter, channel classifier, and ref-vs-clone comparator.
import fs from "node:fs";
import path from "node:path";

const slug = (s) => String(s).replace(/\(([^)]*)\)/g, "$1").replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48);
const suffix = (n, k) => (n === 1 ? "" : n <= 4 ? "." + "xyzw"[k] : `[${k}]`);
const r4 = (v) => +Number(v).toPrecision(5);
const ensureDir = (p) => { fs.mkdirSync(p, { recursive: true }); return p; };
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n");

// Classify what a channel does over the capture: constant, clock, transition, oscillation, steps, or there-and-back.
export function classifyChannel(ts, vs) {
  const min = Math.min(...vs), max = Math.max(...vs), range = max - min;
  const base = { min: r4(min), max: r4(max) };
  if (!(range > 1e-7)) return { ...base, firstChangeMs: null, lastChangeMs: null, kind: "constant" };
  const eps = range * 0.002;
  let first = -1, last = -1, ups = 0, downs = 0, turns = 0, prevSign = 0;
  for (let i = 1; i < vs.length; i++) {
    const d = vs[i] - vs[i - 1];
    if (Math.abs(d) <= eps) continue;
    if (first < 0) first = i - 1;
    last = i;
    const s = Math.sign(d);
    if (s > 0) ups++;
    else downs++;
    if (prevSign && s !== prevSign) turns++;
    prevSign = s;
  }
  const firstChangeMs = Math.round(ts[Math.min(ts.length - 1, first + 1)]);
  const lastChangeMs = Math.round(ts[Math.max(0, last)]);
  const moving = ups + downs;
  const span = ts[ts.length - 1] - ts[0];
  if (turns === 0) {
    const n = vs.length;
    const mt = ts.reduce((s, t) => s + t, 0) / n;
    const mv = vs.reduce((s, v) => s + v, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      sxy += (ts[i] - mt) * (vs[i] - mv);
      sxx += (ts[i] - mt) ** 2;
      syy += (vs[i] - mv) ** 2;
    }
    const r2 = sxx && syy ? (sxy * sxy) / (sxx * syy) : 0;
    if (r2 > 0.995 && lastChangeMs - firstChangeMs > span * 0.8) {
      return { ...base, firstChangeMs, lastChangeMs, kind: "clock", perSecond: r4((sxy / sxx) * 1000) };
    }
    return { ...base, firstChangeMs, lastChangeMs, kind: "transition" };
  }
  if (turns >= 3) {
    const peaks = [];
    for (let i = 1; i < vs.length - 1; i++) {
      if (vs[i] > vs[i - 1] + eps / 2 && vs[i] >= vs[i + 1]) peaks.push(ts[i]);
    }
    const periodMs = peaks.length >= 2 ? Math.round((peaks[peaks.length - 1] - peaks[0]) / (peaks.length - 1)) : undefined;
    return { ...base, firstChangeMs, lastChangeMs, kind: moving > vs.length * 0.6 ? "oscillation" : "steps", periodMs };
  }
  return { ...base, firstChangeMs, lastChangeMs, kind: "there-and-back" };
}

export function writeGlArtifacts(outDir, d, t0 = 0, rate = 1) {
  const dir = path.join(outDir, "gl");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(path.join(outDir, "three"), { recursive: true, force: true });
  ensureDir(dir);
  const t = (pageMs) => +((pageMs - t0) * rate).toFixed(1);
  const progKey = new Map();
  for (const p of d.programs || []) progKey.set(p.id, p.id + (p.label ? ":" + slug(p.label) : ""));

  // Shaders
  const shaderDir = ensureDir(path.join(dir, "shaders"));
  for (const p of d.programs || []) {
    const base = progKey.get(p.id).replace(":", "-");
    p.files = {};
    if (p.vs) { fs.writeFileSync(path.join(shaderDir, base + ".vert"), p.vs); p.files.vs = `gl/shaders/${base}.vert`; }
    if (p.fs) { fs.writeFileSync(path.join(shaderDir, base + ".frag"), p.fs); p.files.fs = `gl/shaders/${base}.frag`; }
    delete p.vs;
    delete p.fs;
  }
  for (const m of d.gpu?.modules ?? []) {
    if (!m.code) continue;
    const f = `${m.id}${m.label ? "-" + slug(m.label) : ""}.wgsl`;
    fs.writeFileSync(path.join(shaderDir, f), m.code);
    m.file = `gl/shaders/${f}`;
    delete m.code;
  }

  // Buffers and canvas textures
  for (const [id, dump] of Object.entries(d.dumps ?? {})) {
    const f = `${id}.${dump.type.replace(/Array$/, "")}.bin`;
    fs.writeFileSync(path.join(ensureDir(path.join(dir, "buffers")), f), Buffer.from(dump.base64, "base64"));
    const b = (d.buffers || []).find((x) => x.id === id);
    if (b) b.file = `gl/buffers/${f}`;
  }
  delete d.dumps;

  for (const tx of d.textures || []) {
    const url = tx.src?.dataUrl;
    if (!url) continue;
    fs.writeFileSync(path.join(ensureDir(path.join(dir, "textures")), `${tx.id}.png`), Buffer.from(url.split(",")[1], "base64"));
    tx.src.file = `gl/textures/${tx.id}.png`;
    delete tx.src.dataUrl;
  }

  if (d.three) {
    for (const s of d.three.scenes || []) {
      if (s._json) {
        fs.writeFileSync(path.join(ensureDir(path.join(outDir, "three")), `scene-${s.index}.json`), s._json);
        s.file = `three/scene-${s.index}.json`;
        delete s._json;
      }
    }
  }

  // Channels
  const frames = d.frameData || [];
  const raw = new Map();
  const put = (key, tm, v) => {
    let r = raw.get(key);
    if (!r) raw.set(key, (r = { ts: [], vs: [] }));
    r.ts.push(tm);
    r.vs.push(v);
  };
  const meta = new Map();

  const state = new Map();
  const perOrd = new Map();
  for (const f of frames) {
    const tm = t(f.t);
    for (const [key, delta] of Object.entries(f.u ?? {})) {
      state.set(key, { ...(state.get(key) ?? {}), ...delta });
    }
    for (const [pid, count] of Object.entries(f.pc ?? {})) {
      for (let ord = 0; ord < count; ord++) {
        const vals = state.get(`${pid}#${ord}`);
        if (!vals) continue;
        for (const [name, v] of Object.entries(vals)) {
          if (!Array.isArray(v) || v.length > 16) continue;
          v.forEach((x, k) => {
            const id = `${pid}|${name}|${k}|${v.length}`;
            let m = perOrd.get(id);
            if (!m) perOrd.set(id, (m = new Map()));
            let r = m.get(ord);
            if (!r) m.set(ord, (r = { ts: [], vs: [] }));
            r.ts.push(tm);
            r.vs.push(x);
          });
        }
      }
    }
  }
  for (const [id, m] of perOrd) {
    const [pid, name, k, n] = id.split("|");
    const series = [...m.entries()].sort((x, y) => x[0] - y[0]);
    const same = series.every(
      ([, r]) => r.vs.length === series[0][1].vs.length && r.vs.every((v, i) => v === series[0][1].vs[i])
    );
    for (const [ord, r] of same ? series.slice(0, 1) : series) {
      const key = `${progKey.get(pid) ?? pid}${same ? "" : "#" + ord}.${name}${suffix(+n, +k)}`;
      raw.set(key, r);
      meta.set(key, { source: "uniform", program: pid, uniform: name });
    }
  }

  // Scene graphs
  const sg = {};
  for (const f of frames) {
    if (!f.sg || !f.tr) continue;
    Object.assign(sg, f.sg);
    const tm = t(f.t);
    for (const [key, v] of Object.entries(sg)) {
      put(key, tm, v);
      if (!meta.has(key)) meta.set(key, { source: "scene" });
    }
  }

  // WebGPU uniform buffer writes
  const gw = {};
  for (const f of frames) {
    if (!f.gw || !Object.keys(f.gw).length) continue;
    Object.assign(gw, f.gw);
    const tm = t(f.t);
    for (const [key, v] of Object.entries(gw)) {
      v.forEach((x, k) => {
        const ck = `gpu:${key}[${k}]`;
        put(ck, tm, x);
        if (!meta.has(ck)) meta.set(ck, { source: "webgpu" });
      });
    }
  }

  const channels = {};
  const constants = {};
  for (const [key, r] of raw) {
    const c = classifyChannel(r.ts, r.vs);
    if (c.kind === "constant") {
      if (meta.get(key)?.source !== "scene" || Object.keys(constants).length < 2000) constants[key] = r.vs[0];
      continue;
    }
    channels[key] = { ...meta.get(key), ...c };
  }

  const keys = Object.keys(channels);
  const idx = new Map(keys.map((k) => [k, 0]));
  const samples = [];
  const times = [...new Set(keys.flatMap((k) => raw.get(k).ts))].sort((x, y) => x - y);
  const cur = {};
  for (const tm of times) {
    for (const k of keys) {
      const r = raw.get(k);
      let i = idx.get(k);
      while (i < r.ts.length && r.ts[i] <= tm) {
        cur[k] = r.vs[i];
        i++;
      }
      idx.set(k, i);
    }
    samples.push({ t: tm, v: { ...cur } });
  }
  writeJson(path.join(outDir, "gl-track.json"), {
    kind: "gl-track",
    note: "t in ms, 0 = trigger. One sample per rendered frame; v holds every channel that changes during the capture (constants are in gl/gl.json).",
    channels,
    samples,
  });

  // Render passes
  const drawn = frames.filter((f) => f.d?.length);
  const passes = [];
  const canvasOf = new Map((d.contexts || []).map((c) => [c.id, c.canvas]));
  const ctxIds = [...new Set(drawn.flatMap((f) => f.d.map((x) => x.c ?? "webgpu")))];
  for (const cid of ctxIds) {
    const rep = [...drawn].reverse().find((f) => f.d.some((x) => (x.c ?? "webgpu") === cid));
    if (!rep) continue;
    for (const dr of rep.d.filter((x) => (x.c ?? "webgpu") === cid)) {
      const fb = dr.fb && (d.framebuffers || []).find((x) => x.id === dr.fb);
      const target =
        `${cid} ${canvasOf.get(cid) ?? ""} -> ` +
        (dr.gpu ? "webgpu" : dr.fb ? `framebuffer ${dr.fb}${fb?.color ? " -> texture " + fb.color : ""}` : "screen");
      let p = passes[passes.length - 1];
      if (!p || p.target !== target) passes.push((p = { target, draws: [] }));
      const last = p.draws[p.draws.length - 1];
      const label = dr.gpu
        ? dr.gpu
        : `${progKey.get(dr.p) ?? dr.p} ${dr.m} ${dr.n}${dr.i ? " x" + dr.i + " instances" : ""}${dr.tx ? " samples " + dr.tx.filter(Boolean).join(",") : ""} [${dr.st}]`;
      if (last && last.label === label) last.times++;
      else p.draws.push({ label, times: 1 });
    }
  }

  const drawCounts = drawn.map((f) => f.d.length + (f.more || 0));
  const avgDraws = drawCounts.length ? +(drawCounts.reduce((s, n) => s + n, 0) / drawCounts.length).toFixed(1) : 0;
  writeJson(path.join(dir, "draws.json"), {
    note: "per frame: draw calls (p program, m primitive, n vertices, i instances, fb target framebuffer, tx bound textures, st state), clears, three.js renders",
    frames: frames.map((f) => ({
      t: t(f.t),
      draws: f.d,
      more: f.more || undefined,
      clears: f.cl?.length ? f.cl : undefined,
      three: f.tr,
      canvas2d: f.c2 ? Object.fromEntries(Object.entries(f.c2).map(([k, v]) => [k, { n: v.n, calls: v.calls }])) : undefined,
    })),
  });

  const logs = {};
  for (const f of frames) {
    for (const [cid, v] of Object.entries(f.c2 ?? {})) {
      if (v.log) (logs[cid] = logs[cid] ?? []).push(`--- frame t=${t(f.t)}ms (${v.n} calls)`, ...v.log);
    }
  }
  for (const [cid, lines] of Object.entries(logs)) {
    fs.writeFileSync(path.join(dir, `canvas2d-${cid}.txt`), lines.join("\n") + "\n");
  }

  const animatedBy = new Map();
  for (const [k, c] of Object.entries(channels)) {
    if (c.program) animatedBy.set(c.program + "|" + c.uniform, [...(animatedBy.get(c.program + "|" + c.uniform) ?? []), k]);
  }
  for (const p of d.programs || []) {
    p.key = progKey.get(p.id);
    p.drawsPerFrame = drawn.length ? +(p.draws / drawn.length).toFixed(2) : 0;
    for (const u of p.uniforms || []) {
      const ch = animatedBy.get(p.id + "|" + u.name);
      if (ch) u.animated = ch;
    }
  }

  const glJson = {
    note: "static side of the GPU scene; animated values are channels in ../gl-track.json; shader sources in shaders/",
    renderer:
      (d.contexts || []).find((c) => c.renderer)?.renderer ??
      (d.gpu?.adapter
        ? `WebGPU ${[d.gpu.adapter.vendor, d.gpu.adapter.architecture, d.gpu.adapter.description].filter(Boolean).join(" ")}`
        : null),
    contexts: d.contexts || [],
    three: d.three,
    engines: d.engines && Object.keys(d.engines).length ? d.engines : undefined,
    workers: d.workers,
    frames: frames.length,
    drawCallsPerFrame: avgDraws,
    passes,
    programs: d.programs || [],
    textures: d.textures || [],
    buffers: d.buffers || [],
    framebuffers: d.framebuffers || [],
    webgpu: d.gpu && (d.gpu.modules.length || d.gpu.pipelines.length) ? d.gpu : undefined,
    canvas2d: Object.keys(logs).length ? Object.keys(logs).map((c) => `gl/canvas2d-${c}.txt`) : undefined,
    constants,
    errors: d.errors?.length ? d.errors : undefined,
  };
  writeJson(path.join(dir, "gl.json"), glJson);
  const sum = summarizeGl(outDir);
  fs.writeFileSync(path.join(dir, "summary.md"), sum + "\n");
  return {
    contexts: (d.contexts || []).map((c) => `${c.id} ${c.type} ${c.canvas}`),
    programs: (d.programs || []).length,
    drawCallsPerFrame: avgDraws,
    animatedChannels: keys.length,
    three: d.three?.revision ?? undefined,
    summary: path.join(dir, "summary.md"),
  };
}

export function summarizeGl(dirIn) {
  const dir = path.resolve(dirIn);
  const g = readJson(path.join(dir, "gl", "gl.json"));
  const track = fs.existsSync(path.join(dir, "gl-track.json")) ? readJson(path.join(dir, "gl-track.json")) : { channels: {} };
  const L = [];
  L.push(`# GPU trace: ${dir}`, "");
  L.push(`renderer: ${g.renderer ?? "?"} | ${g.frames} frames traced | ${g.drawCallsPerFrame} draw calls per frame`, "");
  L.push("## Canvases");
  for (const c of g.contexts || []) {
    L.push(
      `- ${c.id} ${c.type} on ${c.canvas}: ${c.size ? c.size.join("x") : "?"} px` +
        `${c.cssRect ? `, css ${c.cssRect[2]}x${c.cssRect[3]} at ${c.cssRect[0]},${c.cssRect[1]} (pixel ratio ${c.pixelRatio})` : ""}` +
        `${c.attributes ? `, antialias ${c.attributes.antialias}, alpha ${c.attributes.alpha}, premultipliedAlpha ${c.attributes.premultipliedAlpha}` : ""}`
    );
  }
  if (g.three) {
    L.push("", `## three.js r${g.three.revision ?? "?"}`);
    for (const r of g.three.renderers || []) {
      L.push(
        `- ${r.kind} on ${r.canvas}: pixelRatio ${r.pixelRatio}, size ${r.size?.join("x")}, outputColorSpace ${r.outputColorSpace ?? r.outputEncoding}, toneMapping ${r.toneMapping} (exposure ${r.toneMappingExposure}), clear ${JSON.stringify(r.clearColor)} a=${r.clearAlpha}`
      );
    }
    for (const s of g.three.scenes || []) {
      L.push(`- scene ${s.index}${s.name ? ` "${s.name}"` : ""}: ${s.objects} objects${s.file ? `, full JSON in ${s.file}` : ""}`);
      for (const o of (s.tree || []).slice(0, 40)) {
        if (o.key === "scene") continue;
        const geo = o.geometry ? ` ${o.geometry.type}${o.geometry.parameters ? JSON.stringify(o.geometry.parameters) : ""} ${o.geometry.vertices ?? "?"} verts` : "";
        const mat = o.material
          ? " | " +
            o.material
              .map((m) => `${m.type}${m.name ? ` "${m.name}"` : ""}${m.transparent ? " transparent" : ""}${m.uniforms ? ` uniforms[${m.uniforms.join(",")}]` : ""}`)
              .join(", ")
          : "";
        L.push(`  ${"  ".repeat(o.depth)}- ${o.key} ${o.type}${geo}${mat} pos ${JSON.stringify(o.position)} rot ${JSON.stringify(o.rotation)}${o.visible ? "" : " (hidden)"}`);
      }
      if ((s.tree || []).length > 40) L.push(`  ... ${s.tree.length - 40} more in gl/gl.json`);
    }
  }
  L.push("", "## Programs (shaders in gl/shaders/)");
  for (const p of g.programs || []) {
    if (!p.draws) continue;
    L.push(
      `- **${p.key}**: ${p.drawsPerFrame}/frame, ${p.modes.join("/")} up to ${p.maxCount} verts${p.maxInstances ? ` x ${p.maxInstances} instances` : ""}, ${p.state}${p.files?.fs ? ` (${p.files.vs}, ${p.files.fs})` : ""}`
    );
    const anim = (p.uniforms || []).filter((u) => u.animated).map((u) => u.name);
    const fixed = (p.uniforms || [])
      .filter((u) => !u.animated && u.value !== undefined && !/^(sampler|isampler|usampler)/.test(u.type ?? "") && (u.value?.length ?? 0) <= 4)
      .map((u) => `${u.name}=${u.value.length === 1 ? u.value[0] : "[" + u.value.join(",") + "]"}`);
    if (anim.length) L.push(`  - animated: ${anim.join(", ")}`);
    if (fixed.length) L.push(`  - fixed: ${fixed.slice(0, 24).join(", ")}${fixed.length > 24 ? " ..." : ""}`);
  }
  if (g.passes?.length) {
    L.push("", "## One frame per canvas, in draw order");
    for (const p of g.passes) {
      L.push(`- ${p.target}: ${p.draws.map((x) => x.label + (x.times > 1 ? ` x${x.times}` : "")).join("; ")}`);
    }
  }
  const ch = Object.entries(track.channels || {});
  if (ch.length) {
    L.push("", `## Animated channels (${ch.length})`);
    const order = ["transition", "there-and-back", "oscillation", "steps", "clock"];
    const shown = ch.sort(
      (x, y) => order.indexOf(x[1].kind) - order.indexOf(y[1].kind) || (x[1].firstChangeMs ?? 0) - (y[1].firstChangeMs ?? 0)
    );
    for (const [k, c] of shown.slice(0, 60)) {
      L.push(
        `- ${k}: ${c.kind}${c.kind === "clock" ? ` (+${c.perSecond}/s)` : ""}${c.periodMs ? ` period ~${c.periodMs} ms` : ""}, ${c.min} -> ${c.max}, changes ${c.firstChangeMs}-${c.lastChangeMs} ms`
      );
    }
  }
  if (g.errors?.length) L.push("", "## Tracer notes", ...g.errors.map((e) => `- ${e}`));
  return L.join("\n");
}

export function listGlChannels(captureDir, { grep = null, series = null } = {}) {
  const tr = readJson(path.join(path.resolve(captureDir), "gl-track.json"));
  if (series) {
    const keys = Object.keys(tr.channels || {}).filter((x) => x === series || x.endsWith("." + series) || x.endsWith(series));
    if (keys.length !== 1) throw new Error(keys.length ? `ambiguous channel: ${keys.join(", ")}` : `no channel ${series}`);
    return tr.samples.filter((s) => s.v[keys[0]] !== undefined).map((s) => [s.t, s.v[keys[0]]]);
  }
  const re = grep ? (grep instanceof RegExp ? grep : new RegExp(String(grep), "i")) : null;
  const out = {};
  for (const [k, c] of Object.entries(tr.channels || {})) {
    if (!re || re.test(k)) out[k] = c;
  }
  return out;
}

export function compareGlCaptures(refDir, cloneDir, { map = {}, timingLimit = 80, grep = null } = {}) {
  const refAbs = path.resolve(refDir), cloneAbs = path.resolve(cloneDir);
  const R = readJson(path.join(refAbs, "gl", "gl.json"));
  const C = readJson(path.join(cloneAbs, "gl", "gl.json"));
  const rt = readJson(path.join(refAbs, "gl-track.json"));
  const ct = readJson(path.join(cloneAbs, "gl-track.json"));
  const re = grep ? (grep instanceof RegExp ? grep : new RegExp(String(grep), "i")) : null;
  const L = [`# GPU compare: ${refAbs} vs ${cloneAbs}`, ""];

  const ctx = (g) => (g.contexts || []).filter((c) => /webgl|webgpu/.test(c.type) && c.cssRect && c.cssRect[2] > 0);
  const fmt = (c) =>
    c
      ? `${c.type} ${c.size?.join("x")} px (ratio ${c.pixelRatio}), antialias ${c.attributes?.antialias}, alpha ${c.attributes?.alpha}`
      : "-";
  L.push("## Canvases", "| canvas | reference | clone |", "|---|---|---|");
  const cc = ctx(C);
  for (const r of ctx(R)) {
    const c = cc.find((x) => x.canvas === r.canvas);
    L.push(`| ${r.canvas} | ${fmt(r)} | ${fmt(c)}${c && fmt(c) !== fmt(r) ? " **differs**" : ""} |`);
  }
  for (const c of cc) {
    if (!ctx(R).some((r) => r.canvas === c.canvas)) L.push(`| ${c.canvas} | - | ${fmt(c)} |`);
  }

  const tail = (k) => k.replace(/^(w\d+\.)?p\d+(:[\w-]+)?(#\d+)?\./, "").replace(/^(\w+):s\d+\//, "$1:").replace(/#\d+/g, "");
  const cIndex = new Map();
  for (const k of Object.keys(ct.channels || {})) {
    cIndex.set(tail(k), [...(cIndex.get(tail(k)) ?? []), k]);
  }
  const getSeries = (tr, k) => tr.samples.filter((s) => s.v[k] !== undefined).map((s) => [s.t, s.v[k]]);
  const at = (s, tm) => {
    let best = s[0];
    for (const p of s) if (Math.abs(p[0] - tm) < Math.abs(best[0] - tm)) best = p;
    return best[1];
  };
  const likeness = (r, c) =>
    (c.kind === r.kind ? 0 : 1000) +
    Math.abs((c.firstChangeMs ?? 0) - (r.firstChangeMs ?? 0)) +
    Math.abs((c.lastChangeMs ?? 0) - (r.lastChangeMs ?? 0)) +
    (1000 * (Math.abs(c.min - r.min) + Math.abs(c.max - r.max))) / Math.max(1e-9, Math.abs(r.max - r.min));

  const rows = [];
  const results = [];
  let fails = 0;
  const taken = new Set();
  for (const [rk, r] of Object.entries(rt.channels || {})) {
    if (r.kind === "clock" || (re && !re.test(rk))) continue;
    const wanted = map[tail(rk)] ?? tail(rk);
    const ck = (cIndex.get(wanted) ?? [])
      .filter((k) => !taken.has(k))
      .sort((x, y) => likeness(r, ct.channels[x]) - likeness(r, ct.channels[y]))[0];
    if (ck) taken.add(ck);
    if (!ck) {
      rows.push(`| ${rk} | ${r.kind} ${r.min}->${r.max} ${r.firstChangeMs}-${r.lastChangeMs} ms | (no channel named ${wanted}) | | missing |`);
      results.push({ ref: rk, clone: null, ok: false, reason: "missing" });
      fails++;
      continue;
    }
    const c = ct.channels[ck];
    const ds = r.firstChangeMs !== null && c.firstChangeMs !== null ? c.firstChangeMs - r.firstChangeMs : NaN;
    const de = r.lastChangeMs !== null && c.lastChangeMs !== null ? c.lastChangeMs - r.lastChangeMs : NaN;
    const span = Math.max(1e-9, r.max - r.min);
    const rsr = getSeries(rt, rk);
    const csr = getSeries(ct, ck);
    const diffs = rsr.map(([tm, v]) => Math.abs(at(csr, tm) - v) / span);
    const mean = diffs.reduce((s, x) => s + x, 0) / Math.max(1, diffs.length);
    const ok = Math.abs(ds) <= timingLimit && Math.abs(de) <= timingLimit && mean <= 0.05 && c.kind === r.kind;
    if (!ok) fails++;
    results.push({ ref: rk, clone: ck, startErrMs: ds, endErrMs: de, meanRelErr: +mean.toFixed(4), kindMatch: c.kind === r.kind, ok });
    rows.push(
      `| ${rk} | ${r.kind} ${r.min}->${r.max} ${r.firstChangeMs}-${r.lastChangeMs} ms | ${ck}: ${c.kind} ${c.min}->${c.max} ${c.firstChangeMs}-${c.lastChangeMs} ms | start ${ds >= 0 ? "+" : ""}${ds} ms, end ${de >= 0 ? "+" : ""}${de} ms, mean err ${(mean * 100).toFixed(1)}% | ${ok ? "pass" : "FAIL"} |`
    );
  }
  L.push(
    "",
    `## Animated channels (${rows.length} in reference; clock channels skipped)`,
    "",
    "| reference | | clone | timing and value error | result |",
    "|---|---|---|---|---|",
    ...rows
  );
  L.push("", `pass: start/end within ${timingLimit} ms, same kind, mean value error <= 5% of reference range. ${fails} of ${rows.length} failing.`);
  return { md: L.join("\n"), fails, passed: fails === 0, channels: results };
}

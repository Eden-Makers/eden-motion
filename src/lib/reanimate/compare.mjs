// Adapted from NiazMorshed2007/reanimate (MIT License, Copyright (c) 2026 Niaz Morshed).
// Frame-by-frame pixel + motion activity comparator using pixelmatch + pngjs + ffmpeg.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { run } from "../util.mjs";

const pad = (n, w = 4) => String(n).padStart(w, "0");

export function listFrames(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.png$/i.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

export function parseRegion(v) {
  if (!v) return null;
  if (typeof v === "object" && Number.isFinite(v.x) && Number.isFinite(v.y)) {
    return { x: Math.round(v.x), y: Math.round(v.y), width: Math.round(v.width ?? v.w), height: Math.round(v.height ?? v.h) };
  }
  const p = String(v).split(",").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n))) {
    throw new Error(`bad region "${v}", expected x,y,w,h`);
  }
  return { x: Math.round(p[0]), y: Math.round(p[1]), width: Math.round(p[2]), height: Math.round(p[3]) };
}

export function extractVideoFrames(videoFile, outDir, { start = 0, duration = null, fps = 30, width = 640, height = 360 } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) {
    if (f.endsWith(".png")) fs.unlinkSync(path.join(outDir, f));
  }
  const vf = [`fps=${fps}`];
  if (width && height) {
    vf.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`);
  } else if (width) {
    vf.push(`scale=${width}:-2`);
  }
  const args = ["-v", "error", "-y", "-ss", String(start), "-i", videoFile];
  if (duration !== null && duration !== undefined) args.push("-t", String(duration));
  args.push("-vf", vf.join(","), "-fps_mode", "passthrough", path.join(outDir, "%04d.png"));
  run("ffmpeg", args);
  const files = listFrames(outDir);
  const meta = { source: path.resolve(videoFile), fps, start, duration, count: files.length, width, height };
  fs.writeFileSync(path.join(outDir, "frames.json"), JSON.stringify(meta, null, 2) + "\n");
  return { files, meta };
}

function readPng(p) {
  return PNG.sync.read(fs.readFileSync(p));
}

function cropPng(img, region) {
  if (!region) return img;
  const x = Math.max(0, Math.min(img.width - 1, region.x));
  const y = Math.max(0, Math.min(img.height - 1, region.y));
  const w = Math.max(1, Math.min(img.width - x, region.width));
  const h = Math.max(1, Math.min(img.height - y, region.height));
  const o = new PNG({ width: w, height: h });
  PNG.bitblt(img, o, x, y, w, h, 0, 0);
  return o;
}

// Separable 2-pass box blur (approximates Gaussian) for particle/grain tolerant comparison.
export function boxBlurPng(img, r) {
  if (!r || r <= 0) return img;
  const radius = Math.round(r);
  const { width: w, height: h } = img;
  const src = new Float32Array(img.data);
  const tmp = new Float32Array(src.length);
  const pass = (from, to, horizontal) => {
    const n = horizontal ? w : h;
    const m = horizontal ? h : w;
    for (let j = 0; j < m; j++) {
      for (let c = 0; c < 4; c++) {
        let acc = 0, cnt = 0;
        const idx = (i) => ((horizontal ? j * w + i : i * w + j) << 2) + c;
        for (let i = 0; i <= Math.min(radius, n - 1); i++) {
          acc += from[idx(i)];
          cnt++;
        }
        for (let i = 0; i < n; i++) {
          to[idx(i)] = acc / cnt;
          const add = i + radius + 1;
          const rem = i - radius;
          if (add < n) { acc += from[idx(add)]; cnt++; }
          if (rem >= 0) { acc -= from[idx(rem)]; cnt--; }
        }
      }
    }
  };
  pass(src, tmp, true);
  pass(tmp, src, false);
  pass(src, tmp, true);
  pass(tmp, src, false);
  const o = new PNG({ width: w, height: h });
  for (let i = 0; i < src.length; i++) o.data[i] = Math.round(src[i]);
  return o;
}

function frameMismatch(aP, bP, pixelThreshold, diff) {
  const n = pixelmatch(aP.data, bP.data, diff ? diff.data : undefined, aP.width, aP.height, {
    threshold: pixelThreshold,
    includeAA: false,
  });
  return n / (aP.width * aP.height);
}

export function motionWindowFromActivity(act, fps = 30, floor = 0.002) {
  let first = -1, last = -1;
  act.forEach((v, i) => {
    if (v > floor) {
      if (first < 0) first = i;
      last = i;
    }
  });
  const maxVal = act.length ? Math.max(...act) : 0;
  const peak = maxVal > 0 ? act.indexOf(maxVal) : -1;
  return {
    first,
    last,
    peak,
    startS: first < 0 ? 0 : +(first / fps).toFixed(3),
    endS: last < 0 ? 0 : +(last / fps).toFixed(3),
    peakS: peak < 0 ? 0 : +(peak / fps).toFixed(3),
    peakActivity: +maxVal.toFixed(4),
    durationS: first < 0 ? 0 : +((last - first + 1) / fps).toFixed(3),
  };
}

// Segment activity into distinct bursts (merges gaps <= maxGapFrames).
export function motionSegments(act, fps = 30, { floor = 0.004, maxGapFrames = 3 } = {}) {
  const segs = [];
  let cur = null;
  for (let i = 0; i < act.length; i++) {
    if (act[i] > floor) {
      if (!cur) cur = { startFrame: i, endFrame: i, peakFrame: i, peakActivity: act[i] };
      else {
        cur.endFrame = i;
        if (act[i] > cur.peakActivity) {
          cur.peakFrame = i;
          cur.peakActivity = act[i];
        }
      }
    } else if (cur && i - cur.endFrame > maxGapFrames) {
      segs.push(cur);
      cur = null;
    }
  }
  if (cur) segs.push(cur);
  return segs.map((s) => ({
    startFrame: s.startFrame,
    endFrame: s.endFrame,
    startS: +(s.startFrame / fps).toFixed(3),
    endS: +(s.endFrame / fps).toFixed(3),
    durationS: +((s.endFrame - s.startFrame + 1) / fps).toFixed(3),
    peakFrame: s.peakFrame,
    peakS: +(s.peakFrame / fps).toFixed(3),
    peakActivity: +s.peakActivity.toFixed(4),
  }));
}

export function computeActivity(frameDirOrFiles, { fps = 30, pixelThreshold = 0.1, region = null, blur = 0, floor = 0.002 } = {}) {
  const files = Array.isArray(frameDirOrFiles) ? frameDirOrFiles : listFrames(frameDirOrFiles);
  if (!files.length) throw new Error("computeActivity: no frames found");
  const reg = parseRegion(region);
  const imgs = files.map((f) => {
    let img = cropPng(readPng(f), reg);
    if (blur > 0) img = boxBlurPng(img, blur);
    return img;
  });
  const act = [0];
  for (let i = 1; i < imgs.length; i++) {
    act.push(+frameMismatch(imgs[i - 1], imgs[i], pixelThreshold).toFixed(4));
  }
  const win = motionWindowFromActivity(act, fps, floor);
  const windows = motionSegments(act, fps, { floor: Math.max(floor, 0.004) });
  return { fps, frames: files.length, activity: act, window: win, windows };
}

// Tiny 5x7 uppercase/digit bitmap font for crisp ffmpeg-drawtext-free sheet labels.
const FONT5X7 = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 2, 4, 8, 31],
  "3": [14, 17, 1, 6, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 2, 12],
  "A": [14, 17, 17, 31, 17, 17, 17],
  "B": [30, 17, 17, 30, 17, 17, 30],
  "C": [14, 17, 16, 16, 16, 17, 14],
  "D": [28, 18, 17, 17, 17, 18, 28],
  "E": [31, 16, 16, 30, 16, 16, 31],
  "F": [31, 16, 16, 30, 16, 16, 16],
  "G": [14, 17, 16, 23, 17, 17, 15],
  "H": [17, 17, 17, 31, 17, 17, 17],
  "I": [14, 4, 4, 4, 4, 4, 14],
  "J": [7, 2, 2, 2, 18, 18, 12],
  "K": [17, 18, 20, 24, 20, 18, 17],
  "L": [16, 16, 16, 16, 16, 16, 31],
  "M": [17, 27, 21, 21, 17, 17, 17],
  "N": [17, 25, 21, 19, 17, 17, 17],
  "O": [14, 17, 17, 17, 17, 17, 14],
  "P": [30, 17, 17, 30, 16, 16, 16],
  "Q": [14, 17, 17, 17, 21, 18, 13],
  "R": [30, 17, 17, 30, 20, 18, 17],
  "S": [15, 16, 16, 14, 1, 1, 30],
  "T": [31, 4, 4, 4, 4, 4, 4],
  "U": [17, 17, 17, 17, 17, 17, 14],
  "V": [17, 17, 17, 17, 17, 10, 4],
  "W": [17, 17, 17, 21, 21, 27, 17],
  "X": [17, 17, 10, 4, 10, 17, 17],
  "Y": [17, 17, 10, 4, 4, 4, 4],
  "Z": [31, 1, 2, 4, 8, 16, 31],
  ".": [0, 0, 0, 0, 0, 12, 12],
  ":": [0, 12, 12, 0, 12, 12, 0],
  "-": [0, 0, 0, 31, 0, 0, 0],
  "#": [10, 10, 31, 10, 31, 10, 10],
  "%": [25, 25, 2, 4, 8, 19, 19],
  "|": [4, 4, 4, 4, 4, 4, 4],
  "/": [1, 2, 2, 4, 8, 8, 16],
};

function drawBitmapText(png, text, x0, y0, color = [235, 240, 248, 255], scale = 2) {
  const s = String(text).toUpperCase();
  let x = x0;
  for (const ch of s) {
    const glyph = FONT5X7[ch] || FONT5X7[" "];
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 5; col++) {
        if ((bits >> (4 - col)) & 1) {
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const px = x + col * scale + dx;
              const py = y0 + row * scale + dy;
              if (px >= 0 && px < png.width && py >= 0 && py < png.height) {
                const idx = (py * png.width + px) << 2;
                png.data[idx] = color[0];
                png.data[idx + 1] = color[1];
                png.data[idx + 2] = color[2];
                png.data[idx + 3] = color[3];
              }
            }
          }
        }
      }
    }
    x += 6 * scale;
  }
}

function makeSolidPng(width, height, rgba) {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) {
    const idx = i << 2;
    png.data[idx] = rgba[0];
    png.data[idx + 1] = rgba[1];
    png.data[idx + 2] = rgba[2];
    png.data[idx + 3] = rgba[3];
  }
  return png;
}

// Build a 3-row labeled `ref | clone | diff` contact sheet via ffmpeg + pngjs headers.
export function buildCompareSheet(
  refFiles,
  cloneFiles,
  diffFiles,
  outPath,
  { offset = 0, fps = 30, maxCols = 12, tileWidth = 320, labels = ["REF", "CLONE", "DIFF"], startTimeS = 0 } = {}
) {
  if (!refFiles.length) return null;
  const sample0 = readPng(refFiles[0]);
  const tileHeight = Math.max(2, Math.round((tileWidth * sample0.height) / sample0.width / 2) * 2);
  const step = Math.max(1, Math.ceil(refFiles.length / maxCols));
  const indices = [];
  for (let i = 0; i < refFiles.length && indices.length < maxCols; i += step) indices.push(i);
  const cols = indices.length;
  const labelW = 96;
  const headerH = 30;
  const totalW = labelW + cols * tileWidth;

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "em-sheet-"));
  try {
    // Top timestamp header bar
    const hdr = makeSolidPng(totalW, headerH, [18, 20, 26, 255]);
    drawBitmapText(hdr, "FRAME", 10, 8, [145, 175, 220, 255], 2);
    indices.forEach((fi, c) => {
      const t = (startTimeS + fi / fps).toFixed(2) + "S";
      drawBitmapText(hdr, `#${fi} ${t}`, labelW + c * tileWidth + 8, 8, [225, 232, 245, 255], 2);
    });
    const hdrPng = path.join(tmp, "hdr.png");
    fs.writeFileSync(hdrPng, PNG.sync.write(hdr));

    const buildRow = (rowIdx, labelText, accentRgb, pickPath) => {
      const blankPng = path.join(tmp, `blank-${rowIdx}.png`);
      fs.writeFileSync(blankPng, PNG.sync.write(makeSolidPng(tileWidth, tileHeight, [14, 14, 18, 255])));
      const tilePaths = indices.map((fi) => {
        const src = pickPath(fi);
        return src && fs.existsSync(src) ? src : blankPng;
      });
      const scaleFilter = `format=rgba,scale=${tileWidth}:${tileHeight}:force_original_aspect_ratio=decrease,pad=${tileWidth}:${tileHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
      const inputs = tilePaths.flatMap((p) => ["-i", p]);
      const filterParts = tilePaths.map((_, c) => `[${c}:v]${scaleFilter}[t${c}]`);
      const strip = path.join(tmp, `strip-${rowIdx}.png`);
      if (cols === 1) {
        run("ffmpeg", ["-v", "error", "-y", ...inputs, "-vf", scaleFilter, "-frames:v", "1", strip]);
      } else {
        const stackIn = tilePaths.map((_, c) => `[t${c}]`).join("");
        run("ffmpeg", [
          "-v", "error", "-y",
          ...inputs,
          "-filter_complex", `${filterParts.join(";")};${stackIn}hstack=inputs=${cols}`,
          "-frames:v", "1",
          strip,
        ]);
      }
      const lbl = makeSolidPng(labelW, tileHeight, [22, 24, 30, 255]);
      // Left accent bar
      for (let y = 0; y < tileHeight; y++) {
        for (let x = 0; x < 5; x++) {
          const idx = (y * labelW + x) << 2;
          lbl.data[idx] = accentRgb[0];
          lbl.data[idx + 1] = accentRgb[1];
          lbl.data[idx + 2] = accentRgb[2];
          lbl.data[idx + 3] = 255;
        }
      }
      drawBitmapText(lbl, labelText, 12, Math.max(8, Math.floor(tileHeight / 2) - 7), [240, 244, 250, 255], 2);
      const lblPng = path.join(tmp, `lbl-${rowIdx}.png`);
      fs.writeFileSync(lblPng, PNG.sync.write(lbl));
      const fullRow = path.join(tmp, `row-${rowIdx}.png`);
      run("ffmpeg", ["-v", "error", "-y", "-i", lblPng, "-i", strip, "-filter_complex", "hstack=inputs=2", fullRow]);
      return fullRow;
    };

    const rows = [
      hdrPng,
      buildRow(0, labels[0] || "REF", [76, 175, 255], (fi) => refFiles[fi]),
      buildRow(1, labels[1] || "CLONE", [82, 224, 150], (fi) => {
        const j = fi + offset;
        return j >= 0 && j < cloneFiles.length ? cloneFiles[j] : null;
      }),
    ];
    if (diffFiles && diffFiles.length) {
      const diffMap = new Map(diffFiles.map((f) => [path.basename(f), f]));
      rows.push(buildRow(2, labels[2] || "DIFF", [255, 76, 98], (fi) => diffMap.get(`${pad(fi)}.png`) || null));
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const inputs = rows.flatMap((r) => ["-i", r]);
    const isJpg = /\.jpe?g$/i.test(outPath);
    const outArgs = isJpg ? ["-q:v", "3", outPath] : [outPath];
    run("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", `vstack=inputs=${rows.length}`, ...outArgs]);
    return outPath;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export function compareFrames(refDir, cloneDir, outDir, opts = {}) {
  const refAbs = path.resolve(refDir);
  const cloneAbs = path.resolve(cloneDir);
  const outAbs = path.resolve(outDir);
  fs.mkdirSync(outAbs, { recursive: true });

  const framesJson = [path.join(refAbs, "frames.json"), path.join(refAbs, "..", "frames.json")].find((p) => fs.existsSync(p));
  const fps = Number(opts.fps) || (framesJson ? Number(JSON.parse(fs.readFileSync(framesJson, "utf8")).fps) || 30 : 30);
  const fidelity = opts.fidelity || "motion"; // "motion" | "pixel" | "mixed"
  const pixelThreshold = opts.pixelThreshold ?? 0.1;
  const defaultThreshold = fidelity === "pixel" ? 0.02 : fidelity === "mixed" ? 0.05 : 0.15;
  const threshold = opts.threshold ?? defaultThreshold;
  const motionThreshold = opts.motionThreshold ?? 0.08;
  const region = parseRegion(opts.region);
  const blurR = Number(opts.blur) || 0;
  const maxShift = opts.maxShift ?? 15;
  const autoAlign = opts.offset === undefined ? opts.autoAlign !== false : false;
  const writeDiffs = opts.writeDiffs !== false;
  const startTimeS = opts.startTimeS ?? 0;

  // Check capture setup mismatches if capture.json exists
  const capOf = (dir) => {
    const p = path.join(dir, "..", "capture.json");
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
  };
  const capRef = capOf(refAbs), capClone = capOf(cloneAbs);
  const setupWarnings = [];
  if (capRef && capClone) {
    for (const k of ["viewport", "scale", "fps", "trigger", "duration", "preRoll", "clock", "seed", "gpu", "rafHz", "rate"]) {
      if (JSON.stringify(capRef[k] ?? null) !== JSON.stringify(capClone[k] ?? null)) {
        setupWarnings.push(`${k}: reference ${JSON.stringify(capRef[k] ?? null)}, clone ${JSON.stringify(capClone[k] ?? null)}`);
      }
    }
  }

  const refFiles = listFrames(refAbs);
  let cloneFiles = listFrames(cloneAbs);
  if (!refFiles.length || !cloneFiles.length) throw new Error("compareFrames: no PNG frames found");

  const ref0 = readPng(refFiles[0]);
  const c0 = readPng(cloneFiles[0]);
  if (c0.width !== ref0.width || c0.height !== ref0.height) {
    const scaled = path.join(outAbs, ".clone-scaled");
    fs.mkdirSync(scaled, { recursive: true });
    for (const f of fs.readdirSync(scaled)) fs.unlinkSync(path.join(scaled, f));
    cloneFiles.forEach((p, i) => {
      run("ffmpeg", ["-v", "error", "-y", "-i", p, "-vf", `scale=${ref0.width}:${ref0.height}:flags=lanczos`, path.join(scaled, `${pad(i)}.png`)]);
    });
    cloneFiles = listFrames(scaled);
  }
  const W = ref0.width, H = ref0.height;

  const refSharp = refFiles.map((p) => cropPng(readPng(p), region));
  const cloneSharp = cloneFiles.map((p) => cropPng(readPng(p), region));
  const refImgs = blurR > 0 ? refSharp.map((p) => boxBlurPng(p, blurR)) : refSharp;
  const cloneImgs = blurR > 0 ? cloneSharp.map((p) => boxBlurPng(p, blurR)) : cloneSharp;

  // Activity curve always reads sharp frames
  const activityOf = (imgs) => {
    const arr = [0];
    for (let i = 1; i < imgs.length; i++) arr.push(frameMismatch(imgs[i - 1], imgs[i], pixelThreshold));
    return arr;
  };
  const refAct = activityOf(refSharp);
  const cloneAct = activityOf(cloneSharp);

  // Auto-alignment
  let offset = opts.offset !== undefined ? Number(opts.offset) : 0;
  let alignMethod = opts.offset !== undefined ? "fixed" : "none";
  if (autoAlign) {
    const probeN = Math.min(12, refImgs.length);
    let bestPx = Infinity, bestPxOffset = 0;
    for (let k = -maxShift; k <= maxShift; k++) {
      let sum = 0, n = 0;
      for (let i = 0; i < probeN; i++) {
        const j = i + k;
        if (j < 0 || j >= cloneImgs.length) continue;
        sum += frameMismatch(refImgs[i], cloneImgs[j], pixelThreshold);
        n++;
      }
      if (n >= Math.min(5, probeN) && sum / n < bestPx) {
        bestPx = sum / n;
        bestPxOffset = k;
      }
    }
    if (fidelity === "motion" && bestPx > 0.25 && refAct.length >= 6) {
      // Align by activity-curve L1 error when pixels differ in palette/copy
      let bestAct = Infinity, bestActOffset = 0;
      for (let k = -maxShift; k <= maxShift; k++) {
        let sum = 0, n = 0;
        for (let i = 0; i < refAct.length; i++) {
          const j = i + k;
          if (j < 0 || j >= cloneAct.length) continue;
          sum += Math.abs(refAct[i] - cloneAct[j]);
          n++;
        }
        if (n >= Math.min(5, refAct.length) && sum / n < bestAct) {
          bestAct = sum / n;
          bestActOffset = k;
        }
      }
      offset = bestActOffset;
      alignMethod = "activity";
    } else {
      offset = bestPxOffset;
      alignMethod = "pixel";
    }
  }

  // Per-frame pixel mismatch + diff PNGs
  const diffDir = writeDiffs ? path.join(outAbs, "diff") : null;
  if (diffDir) {
    fs.mkdirSync(diffDir, { recursive: true });
    for (const f of fs.readdirSync(diffDir)) if (f.endsWith(".png")) fs.unlinkSync(path.join(diffDir, f));
  }
  const frameDetails = [];
  for (let i = 0; i < refImgs.length; i++) {
    const j = i + offset;
    if (j < 0 || j >= cloneImgs.length) {
      frameDetails.push({ i, t: +(startTimeS + i / fps).toFixed(3), cloneIndex: null, mismatch: null });
      continue;
    }
    const diff = diffDir ? new PNG({ width: refImgs[i].width, height: refImgs[i].height }) : undefined;
    const m = frameMismatch(refImgs[i], cloneImgs[j], pixelThreshold, diff);
    if (diff && diffDir) fs.writeFileSync(path.join(diffDir, `${pad(i)}.png`), PNG.sync.write(diff));
    frameDetails.push({
      i,
      t: +(startTimeS + i / fps).toFixed(3),
      cloneIndex: j,
      mismatch: +m.toFixed(4),
      ...(blurR > 0 ? { sharpMismatch: +frameMismatch(refSharp[i], cloneSharp[j], pixelThreshold).toFixed(4) } : {}),
    });
  }

  const compared = frameDetails.filter((f) => f.mismatch !== null);
  const meanMismatch = compared.length ? compared.reduce((s, f) => s + f.mismatch, 0) / compared.length : 1;
  const sharpMeanMismatch =
    blurR > 0 && compared.length
      ? compared.reduce((s, f) => s + (f.sharpMismatch ?? 0), 0) / compared.length
      : null;
  const worstFrames = [...compared].sort((x, y) => y.mismatch - x.mismatch).slice(0, 5);

  const refWin = motionWindowFromActivity(refAct, fps);
  const alignedCloneAct = offset >= 0 ? cloneAct.slice(offset) : [...Array(-offset).fill(0), ...cloneAct];
  const cloneWin = motionWindowFromActivity(alignedCloneAct, fps);

  const timingError = {
    startS: refWin.first >= 0 && cloneWin.first >= 0 ? +((cloneWin.first - refWin.first) / fps).toFixed(3) : 0,
    endS: refWin.last >= 0 && cloneWin.last >= 0 ? +((cloneWin.last - refWin.last) / fps).toFixed(3) : 0,
    peakS: refWin.peak >= 0 && cloneWin.peak >= 0 ? +((cloneWin.peak - refWin.peak) / fps).toFixed(3) : 0,
    durationS: +(cloneWin.durationS - refWin.durationS).toFixed(3),
  };
  const maxTimingErr = Math.max(Math.abs(timingError.startS), Math.abs(timingError.endS), Math.abs(timingError.durationS));
  const pass = {
    pixels: meanMismatch <= threshold,
    timing: maxTimingErr <= motionThreshold,
  };

  let fidelityVerdict = "failed";
  if (pass.timing && meanMismatch <= 0.02) fidelityVerdict = "pixel-faithful";
  else if (pass.timing && meanMismatch <= Math.max(0.08, threshold)) fidelityVerdict = "mixed";
  else if (pass.timing) fidelityVerdict = "motion-faithful";

  const passed =
    fidelity === "pixel"
      ? pass.pixels && pass.timing
      : fidelity === "mixed"
        ? pass.pixels && pass.timing
        : pass.timing;

  // Build 3-row contact sheet (ref | clone | diff)
  let sheet = null;
  if (opts.sheetPath !== false) {
    const targetSheet = opts.sheetPath || path.join(outAbs, "compare-sheet.jpg");
    const diffFiles = diffDir ? listFrames(diffDir) : [];
    sheet = buildCompareSheet(refFiles, cloneFiles, diffFiles, targetSheet, {
      offset,
      fps,
      maxCols: opts.maxCols ?? 12,
      tileWidth: opts.tileWidth ?? 320,
      startTimeS,
    });
  }

  const report = {
    fps,
    size: [W, H],
    region,
    offset,
    alignMethod,
    fidelity,
    fidelityVerdict,
    passed,
    threshold,
    motionThreshold,
    pixelThreshold,
    blur: blurR || undefined,
    setupWarnings,
    frames: frameDetails.length,
    compared: compared.length,
    meanMismatch: +meanMismatch.toFixed(4),
    sharpMeanMismatch: sharpMeanMismatch === null ? undefined : +sharpMeanMismatch.toFixed(4),
    maxMismatch: worstFrames[0]?.mismatch ?? 0,
    worstFrames,
    motion: { reference: refWin, clone: cloneWin, timingError },
    timingError,
    activityCurve: {
      reference: refAct.map((v) => +v.toFixed(4)),
      clone: cloneAct.map((v) => +v.toFixed(4)),
    },
    pass,
    diffDir,
    sheet,
    frameDetails,
  };

  fs.writeFileSync(path.join(outAbs, "report.json"), JSON.stringify(report, null, 2) + "\n");

  const bar = (v) => "#".repeat(Math.min(40, Math.round(v * 400))) || ".";
  const md = [
    `# compare: ${refAbs} vs ${cloneAbs}`,
    ``,
    `- frames compared: ${compared.length}/${frameDetails.length} at ${fps} fps, clone offset ${offset} (${alignMethod})`,
    `- fidelity mode: ${fidelity} | verdict: **${fidelityVerdict}** | contract: **${passed ? "PASS" : "FAIL"}**`,
    ...setupWarnings.map((w) => `- warning, captures differ in ${w}`),
    `- mean mismatch${blurR ? ` (blurred ${blurR} px)` : ""}: **${(meanMismatch * 100).toFixed(2)}%** (threshold ${(threshold * 100).toFixed(1)}%) -> ${pass.pixels ? "PASS" : "FAIL"}${sharpMeanMismatch !== null ? `; sharp: ${(sharpMeanMismatch * 100).toFixed(2)}%` : ""}`,
    `- motion window: reference frames ${refWin.first}-${refWin.last} (${refWin.durationS.toFixed(2)}s, peak #${refWin.peak}); clone ${cloneWin.first}-${cloneWin.last} (${cloneWin.durationS.toFixed(2)}s, peak #${cloneWin.peak})`,
    `- timing error (clone - ref): start ${timingError.startS}s, end ${timingError.endS}s, duration ${timingError.durationS}s, peak ${timingError.peakS}s -> ${pass.timing ? "PASS" : "FAIL"} (limit ${motionThreshold}s)`,
    `- worst frames: ${worstFrames.map((w) => `#${w.i} (${(w.mismatch * 100).toFixed(1)}% @ ${w.t}s)`).join(", ")}`,
    ``,
    `## activity per frame`,
    ``,
    "```",
    `frame   t(s)   reference                                 clone`,
    ...frameDetails.map(
      (f) =>
        `${String(f.i).padStart(5)} ${f.t.toFixed(2).padStart(6)}   ${bar(refAct[f.i]).padEnd(40)}  ${f.cloneIndex === null ? "" : bar(cloneAct[f.cloneIndex])}`
    ),
    "```",
  ].join("\n");
  fs.writeFileSync(path.join(outAbs, "report.md"), md + "\n");

  return report;
}

// blender: render every "blender:<template>?k=v" prop headless in Blender into a transparent
// VP9 webm (assets/3d/<template>-<hash>.webm) and point the prop at it. Templates live in
// blender/templates/*.py; a prop can also name its own script with "blender:./path/shot.py".
// Proven on the Relate 1:1 rebuilds (research/analysis/relate.md): chrome needs the near studio
// dome, product CG runs in EEVEE at about 2 s per 1080p frame.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { REPO } from "../lib/env.mjs";
import { log, warn, readJSON, writeJSON, run } from "../lib/util.mjs";

export function findBlender() {
  for (const c of [process.env.BLENDER, "/opt/homebrew/bin/blender", "/Applications/Blender.app/Contents/MacOS/Blender", "blender"]) {
    if (!c) continue;
    const r = run("which", [c], { allowFail: true });
    if (c.startsWith("/") ? fs.existsSync(c) : r.status === 0) return c;
  }
  return null;
}

export function parseBlenderSrc(src) {
  const m = String(src).match(/^blender:([^?]+)(?:\?(.*))?$/);
  if (!m) return null;
  const params = {};
  for (const kv of (m[2] || "").split("&").filter(Boolean)) {
    const [k, v = "true"] = kv.split("=");
    const val = decodeURIComponent(v);
    params[k] = /^-?\d+(\.\d+)?$/.test(val) ? +val : val.includes(",") ? val.split(",") : val;
  }
  return { template: m[1], params };
}

export async function blender(projectDir, { preview = false, force = false } = {}) {
  const sbFile = path.join(projectDir, "storyboard.json");
  const sb = readJSON(sbFile);
  const fps = sb.fps || 30;
  const jobs = [];
  sb.scenes.forEach((s, i) => {
    const walk = (o) => {
      if (!o || typeof o !== "object") return;
      for (const [k, v] of Object.entries(o)) {
        if (typeof v === "string" && v.startsWith("blender:")) jobs.push({ scene: s, i, holder: o, key: k, spec: parseBlenderSrc(v) });
        else if (typeof v === "object") walk(v);
      }
    };
    walk(s.props);
  });
  if (!jobs.length) return log("no blender: props in storyboard.json");
  const bl = findBlender();
  if (!bl) throw new Error("Blender not found (set BLENDER=/path/to/blender)");
  const outDir = path.join(projectDir, "assets", "3d");
  fs.mkdirSync(outDir, { recursive: true });
  for (const j of jobs) {
    const { template, params } = j.spec;
    const script = template.startsWith(".") || template.endsWith(".py") ? path.resolve(projectDir, template) : path.join(REPO, "blender", "templates", `${template.replace(/-/g, "_")}.py`);
    if (!fs.existsSync(script)) { warn(`scene ${j.scene.id}: no Blender template ${template}`); continue; }
    const frames = Math.ceil(j.scene.duration * fps) + 2;
    const P = { frames, fps, ...params };
    const hash = crypto.createHash("sha1").update(JSON.stringify([template, P, fs.statSync(script).mtimeMs])).digest("hex").slice(0, 8);
    const name = `${path.basename(template, ".py")}-${hash}`;
    const webm = path.join(outDir, `${name}.webm`);
    if (!fs.existsSync(webm) || force) {
      const seq = path.join(outDir, name);
      fs.mkdirSync(seq, { recursive: true });
      log(`blender ${template} ${JSON.stringify(params)} -> ${frames} frames (scene ${j.scene.id})`);
      const t0 = Date.now();
      run(bl, ["-b", "--factory-startup", "-P", script, "--", "--out", seq, "--params", JSON.stringify(P), ...(preview ? ["--preview"] : [])], { env: { ...process.env, EM_PROJECT: projectDir } });
      run("ffmpeg", ["-v", "error", "-y", "-framerate", String(fps), "-i", path.join(seq, "f_%04d.png"), "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "20", "-row-mt", "1", "-auto-alt-ref", "0", webm]);
      fs.rmSync(seq, { recursive: true, force: true }); // comp/ copies assets/, keep only the webm
      log(`  rendered in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    j.holder[`${j.key}Spec`] = j.holder[j.key];
    j.holder[j.key] = path.relative(projectDir, webm);
  }
  writeJSON(sbFile, sb);
  log(`blender: ${jobs.length} plate(s) ready, storyboard.json points at assets/3d/*.webm`);
}

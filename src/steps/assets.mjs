// assets: resolve every "gen:<prompt>" in storyboard props into a real image with Nano Banana
// Pro (Gemini 3 Pro Image), 2K, brand logo as a style reference only when asked. Images are
// downscaled to 1920 px JPGs for fast renders; the 2K originals are kept.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { generateImage } from "../lib/gemini.mjs";
import { log, warn, readJSON, writeJSON, run } from "../lib/util.mjs";

function walk(obj, fn) {
  if (Array.isArray(obj)) return obj.map((v) => walk(v, fn));
  if (obj && typeof obj === "object") return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, walk(v, fn)]));
  return fn(obj);
}

export async function assets(projectDir, { concurrency = 3 } = {}) {
  const sbFile = path.join(projectDir, "storyboard.json");
  const sb = readJSON(sbFile);
  const prompts = new Set();
  walk(sb.scenes, (v) => {
    if (typeof v === "string" && v.startsWith("gen:")) prompts.add(v.slice(4).trim());
    return v;
  });
  if (!prompts.size && !JSON.stringify(sb.scenes).includes('"genvideo:')) {
    log("assets: nothing to generate");
    return sb;
  }
  const dir = path.join(projectDir, "assets", "gen");
  fs.mkdirSync(dir, { recursive: true });
  const map = {};
  const logFile = path.join(projectDir, "prompts.log.jsonl");
  const list = [...prompts];
  log(`assets: generating ${list.length} images with Nano Banana Pro (2K)`);
  let idx = 0;
  async function worker() {
    while (idx < list.length) {
      const p = list[idx++];
      const h = crypto.createHash("sha1").update(p).digest("hex").slice(0, 10);
      const orig = path.join(dir, `${h}.png`);
      const jpg = path.join(dir, `${h}.jpg`);
      try {
        if (!fs.existsSync(jpg)) {
          const full = /no text/i.test(p) ? p : `${p}. No text, no letters, no logos, no watermark.`;
          await generateImage(full, orig, { aspect: "16:9", size: "2K" });
          run("ffmpeg", ["-y", "-v", "error", "-i", orig, "-vf", "scale=1920:-2", "-q:v", "3", jpg]);
          fs.appendFileSync(logFile, JSON.stringify({ t: new Date().toISOString(), model: "gemini-3-pro-image", prompt: full, file: path.relative(projectDir, orig) }) + "\n");
          log(`  image ok ${h}`);
        }
        map[p] = `assets/gen/${h}.jpg`;
      } catch (e) {
        warn(`image failed (${e.message.slice(0, 160)}); scene will use a fallback`);
        map[p] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  sb.scenes = walk(sb.scenes, (v) => (typeof v === "string" && v.startsWith("gen:") ? map[v.slice(4).trim()] || "" : v));

  // "genvideo:<still prompt> || <motion prompt>": still with Nano Banana Pro, then Seedance 2.0
  // image-to-video on fal (reference = the still), 3 s longer than needed, no music.
  const vids = [];
  walk(sb.scenes, (v) => (typeof v === "string" && v.startsWith("genvideo:") && vids.push(v), v));
  if (vids.length) {
    // Provider: Higgsfield CLI when authed (house default, Seedance 2.0), else fal.ai.
    const brief = readJSON(path.join(projectDir, "brief.json"), {});
    const { higgsfieldAvailable, hfImageToVideo } = await import("../lib/higgsfield.mjs");
    const useHF = (brief.videoProvider || "higgsfield") === "higgsfield" && higgsfieldAvailable();
    const imageToVideo = useHF ? (img, motion, out, o) => hfImageToVideo(img, motion, out, { model: brief.videoModel || "seedance_2_0", ...o }) : (await import("../lib/fal.mjs")).imageToVideo;
    log(`video provider: ${useHF ? "Higgsfield CLI" : "fal.ai"}`);
    const vmap = {};
    for (const v of [...new Set(vids)]) {
      const [still, motion] = v.slice(9).split("||").map((s) => s.trim());
      const h = crypto.createHash("sha1").update(v).digest("hex").slice(0, 10);
      const img = path.join(dir, `${h}.png`), mp4 = path.join(dir, `${h}.mp4`), raw = path.join(dir, `${h}-raw.mp4`);
      try {
        if (!fs.existsSync(mp4)) {
          if (!fs.existsSync(img)) await generateImage(`${still}. No text, no letters, no logos.`, img, { aspect: "16:9", size: "2K" });
          log(`  video ${h}: image-to-video`);
          const r = await imageToVideo(img, motion || "Slow cinematic push in, subtle natural motion, no cut.", raw, { seconds: 7 });
          run("ffmpeg", ["-y", "-v", "error", "-i", raw, "-vf", "scale=1920:-2,fps=30", "-an", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", mp4]);
          fs.appendFileSync(logFile, JSON.stringify({ t: new Date().toISOString(), model: r.model, request_id: r.request_id, still, motion, file: path.relative(projectDir, mp4) }) + "\n");
        }
        vmap[v] = `assets/gen/${h}.mp4`;
      } catch (e) {
        warn(`video failed (${e.message.slice(0, 160)}); falling back to the still`);
        vmap[v] = fs.existsSync(img) ? `assets/gen/${h}.png` : "";
      }
    }
    sb.scenes = walk(sb.scenes, (v) => (typeof v === "string" && v.startsWith("genvideo:") ? vmap[v] : v));
  }
  writeJSON(sbFile, sb);
  return sb;
}

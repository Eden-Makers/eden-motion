// Higgsfield via its official CLI (`higgsfield`, authed with `higgsfield auth login`). Works from
// any harness because it is a plain subprocess. Models: seedance_2_0 (default), kling3_0,
// veo3_1, minimax_h3 ... (`higgsfield model list --video`). Every job logs model + id.
import { spawnSync } from "node:child_process";
import { download, log } from "./util.mjs";

function hf(args, { timeoutMs = 25 * 60 * 1000 } = {}) {
  const r = spawnSync("higgsfield", [...args, "--json"], { encoding: "utf8", maxBuffer: 1 << 26, timeout: timeoutMs });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`higgsfield ${args.slice(0, 3).join(" ")} failed: ${(r.stderr || r.stdout).slice(-600)}`);
  const out = r.stdout.trim();
  try {
    return JSON.parse(out);
  } catch {
    const i = out.search(/[\[{]/);
    return i >= 0 ? JSON.parse(out.slice(i)) : { raw: out };
  }
}

export function higgsfieldAvailable() {
  const r = spawnSync("higgsfield", ["account", "status"], { encoding: "utf8", timeout: 20000 });
  return r.status === 0 && /credits/i.test(r.stdout);
}

function findUrl(obj) {
  const s = JSON.stringify(obj);
  const m = s.match(/https?:[^"\\]+\.(?:mp4|mov|webm)[^"\\]*/i);
  return m ? m[0] : null;
}

// Image-to-video with the approved still as start frame (or reference). Direct prompts:
// camera behaviour, beat, motion, light; timecoded beats for multishot; "no music".
export async function hfImageToVideo(imageFile, prompt, outFile, { model = "seedance_2_0", seconds = 7, resolution = "1080p", asReference = false } = {}) {
  const full = /no music/i.test(prompt) ? prompt : `${prompt} No music.`;
  const params = [model, "--prompt", full, "--duration", String(seconds), "--resolution", resolution];
  if (model.startsWith("seedance")) params.push("--generate_audio", "false", "--aspect_ratio", "16:9");
  params.push(asReference ? "--image-references" : "--start-image", imageFile);
  const cost = hf(["generate", "cost", ...params]);
  log(`higgsfield ${model}: ~${JSON.stringify(cost).match(/\d+(\.\d+)?/)?.[0] ?? "?"} credits`);
  const res = hf(["generate", "create", ...params, "--wait", "--wait-timeout", "20m", "--wait-interval", "6s"]);
  const url = findUrl(res);
  if (!url) throw new Error("higgsfield: no video url in " + JSON.stringify(res).slice(0, 400));
  await download(url, outFile);
  const id = JSON.stringify(res).match(/"id"\s*:\s*"([^"]+)"/)?.[1] || null;
  return { file: outFile, request_id: id, model: `higgsfield/${model}` };
}

// fal.ai queue client: image-to-video with Seedance 2.0 (default) or Kling 3.0.
// House rules: the approved still is the reference, "no music" in every prompt, render 3 s longer
// than the planned cut.
import fs from "node:fs";
import path from "node:path";
import { key } from "./env.mjs";
import { sleep, download, log } from "./util.mjs";

const MODELS = {
  seedance: "bytedance/seedance-2.0/image-to-video",
  kling: "fal-ai/kling-video/v3/pro/image-to-video",
};

async function upload(file) {
  // fal storage: initiate + PUT
  const name = path.basename(file);
  const ct = file.endsWith(".png") ? "image/png" : "image/jpeg";
  const init = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate", {
    method: "POST",
    headers: { Authorization: `Key ${key("FAL_KEY")}`, "content-type": "application/json" },
    body: JSON.stringify({ file_name: name, content_type: ct }),
  });
  if (!init.ok) throw new Error("fal upload init " + init.status + " " + (await init.text()).slice(0, 300));
  const { upload_url, file_url } = await init.json();
  const put = await fetch(upload_url, { method: "PUT", headers: { "content-type": ct }, body: fs.readFileSync(file) });
  if (!put.ok) throw new Error("fal upload put " + put.status);
  return file_url;
}

export async function imageToVideo(imageFile, prompt, outFile, { model = "seedance", seconds = 6, resolution = "1080p" } = {}) {
  const endpoint = MODELS[model] || model;
  const image_url = await upload(imageFile);
  const full = /no music/i.test(prompt) ? prompt : `${prompt} No music. Subtle natural sound only.`;
  const body = model === "kling" ? { prompt: full, image_url, duration: String(Math.min(10, seconds)) } : { prompt: full, image_url, duration: String(Math.max(4, Math.min(15, seconds))), resolution, aspect_ratio: "16:9", generate_audio: false };
  const sub = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Key ${key("FAL_KEY")}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!sub.ok) throw new Error("fal submit " + sub.status + " " + (await sub.text()).slice(0, 400));
  const { status_url, response_url, request_id } = await sub.json();
  log(`fal ${endpoint} queued ${request_id}`);
  for (let i = 0; i < 180; i++) {
    await sleep(5000);
    const st = await (await fetch(status_url, { headers: { Authorization: `Key ${key("FAL_KEY")}` } })).json();
    if (st.status === "COMPLETED") break;
    if (st.status === "FAILED" || st.error) throw new Error("fal failed: " + JSON.stringify(st).slice(0, 400));
  }
  const res = await (await fetch(response_url, { headers: { Authorization: `Key ${key("FAL_KEY")}` } })).json();
  const url = res?.video?.url || res?.videos?.[0]?.url;
  if (!url) throw new Error("fal: no video in response " + JSON.stringify(res).slice(0, 300));
  await download(url, outFile);
  return { file: outFile, request_id, model: endpoint };
}

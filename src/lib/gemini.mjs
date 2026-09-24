// Thin Gemini REST client: text/JSON, image (Nano Banana Pro), file upload + video/audio analysis.
import fs from "node:fs";
import path from "node:path";
import { key } from "./env.mjs";
import { parseLooseJSON, sleep, log } from "./util.mjs";

const BASE = "https://generativelanguage.googleapis.com";
export const MODELS = {
  text: process.env.EM_TEXT_MODEL || "gemini-3.1-pro-preview",
  fast: process.env.EM_FAST_MODEL || "gemini-3.5-flash",
  image: process.env.EM_IMAGE_MODEL || "gemini-3-pro-image",
  vision: process.env.EM_VISION_MODEL || "gemini-3.1-pro-preview",
};

async function call(model, body, { retries = 3 } = {}) {
  const url = `${BASE}/v1beta/models/${model}:generateContent?key=${key("GEMINI_API_KEY")}`;
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) return res.json();
    lastErr = `${res.status} ${(await res.text()).slice(0, 800)}`;
    if (![429, 500, 502, 503, 504].includes(res.status)) break;
    await sleep(2000 * (i + 1) ** 2);
  }
  throw new Error(`Gemini ${model}: ${lastErr}`);
}

function textOf(resp) {
  const parts = resp?.candidates?.[0]?.content?.parts || [];
  return parts.filter((p) => p.text && !p.thought).map((p) => p.text).join("");
}

export async function generateText(prompt, { model = MODELS.text, system, parts = [], temperature = 0.8, json = false, search = false } = {}) {
  const body = {
    contents: [{ role: "user", parts: [...parts, { text: prompt }] }],
    // JSON mode and tools cannot be combined; with search we parse JSON loosely instead.
    generationConfig: { temperature, ...(json && !search ? { responseMimeType: "application/json" } : {}) },
  };
  if (search) body.tools = [{ google_search: {} }];
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const resp = await call(model, body);
  return textOf(resp);
}

export async function generateJSON(prompt, opts = {}) {
  const txt = await generateText(prompt, { ...opts, json: true });
  try {
    return JSON.parse(txt);
  } catch {
    return parseLooseJSON(txt);
  }
}

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4", ".mov": "video/quicktime", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4" };

export function inlineImage(file) {
  const mimeType = MIME[path.extname(file).toLowerCase()] || "image/png";
  return { inlineData: { mimeType, data: fs.readFileSync(file).toString("base64") } };
}

// Nano Banana Pro. refs = local image paths used as visual references (logo, key frame, style).
export async function generateImage(prompt, outFile, { refs = [], aspect = "16:9", size = "2K", model = MODELS.image } = {}) {
  const body = {
    contents: [{ role: "user", parts: [...refs.map(inlineImage), { text: prompt }] }],
    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect, imageSize: size } },
  };
  let resp;
  try {
    resp = await call(model, body);
  } catch (e) {
    // Older endpoints reject imageSize; retry without it.
    if (!String(e).includes("imageSize")) throw e;
    delete body.generationConfig.imageConfig.imageSize;
    resp = await call(model, body);
  }
  const part = (resp?.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData?.data);
  if (!part) throw new Error("No image returned: " + JSON.stringify(resp).slice(0, 600));
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, Buffer.from(part.inlineData.data, "base64"));
  return outFile;
}

// Resumable upload to the Files API, then poll until ACTIVE (needed for video).
export async function uploadFile(file) {
  const mimeType = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
  const size = fs.statSync(file).size;
  const start = await fetch(`${BASE}/upload/v1beta/files?key=${key("GEMINI_API_KEY")}`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(size),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "content-type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: path.basename(file) } }),
  });
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Upload start failed: " + (await start.text()));
  const up = await fetch(uploadUrl, {
    method: "POST",
    headers: { "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize", "content-length": String(size) },
    body: fs.readFileSync(file),
  });
  let info = (await up.json()).file;
  for (let i = 0; i < 90 && info.state === "PROCESSING"; i++) {
    await sleep(2000);
    info = await (await fetch(`${BASE}/v1beta/${info.name}?key=${key("GEMINI_API_KEY")}`)).json();
  }
  if (info.state !== "ACTIVE") throw new Error("File not active: " + JSON.stringify(info));
  return { fileData: { mimeType, fileUri: info.uri } };
}

export async function analyzeMedia(file, prompt, { model = MODELS.vision, json = false } = {}) {
  log(`gemini analyze ${path.basename(file)} (${model})`);
  const part = await uploadFile(file);
  return json ? generateJSON(prompt, { model, parts: [part], temperature: 0.3 }) : generateText(prompt, { model, parts: [part], temperature: 0.3 });
}

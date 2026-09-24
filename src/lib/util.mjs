import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

export const log = (...a) => console.error("\x1b[36m[eden-motion]\x1b[0m", ...a);
export const warn = (...a) => console.error("\x1b[33m[warn]\x1b[0m", ...a);

export function readJSON(file, fallback) {
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  return file;
}

export function slugify(s) {
  return String(s)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// Hard house rule: no em/en dashes in anything we author.
export function noDashes(s) {
  return String(s)
    .replace(/(\d)\s*–\s*(\d)/g, "$1-$2")
    .replace(/\s*[—–]\s*/g, " - ");
}

export function deepNoDashes(obj) {
  if (typeof obj === "string") return noDashes(obj);
  if (Array.isArray(obj)) return obj.map(deepNoDashes);
  if (obj && typeof obj === "object") return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepNoDashes(v)]));
  return obj;
}

export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`${cmd} ${args.join(" ")} failed (${r.status}):\n${(r.stderr || "").slice(-3000)}`);
  }
  return r;
}

// Streams output live; resolves with exit code.
export function runLive(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "inherit", "inherit"], ...opts });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 || opts.allowFail ? resolve(code) : reject(new Error(`${cmd} exited ${code}`))));
  });
}

export function probeDuration(file) {
  const r = run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return parseFloat(r.stdout.trim());
}

export async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url} -> ${res.status}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Extract first JSON object/array from an LLM reply (tolerates ```json fences).
export function parseLooseJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[\[{]/);
  if (start < 0) throw new Error("No JSON in model reply:\n" + text.slice(0, 500));
  const open = body[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return JSON.parse(body.slice(start, i + 1));
  }
  throw new Error("Unterminated JSON in model reply");
}

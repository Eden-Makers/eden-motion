// Openverse (api.openverse.org): 5M+ Creative Commons audio (freesound, wikimedia, jamendo),
// free, no key. Only licenses that are safe in a client film pass: cc0 and pdm (no strings) and
// by (credit required, collected into audio/CREDITS.md). nc, nd and sa never pass: a brand film
// is commercial, we trim and process every sound, and share-alike would bind the whole film.
// Anonymous limits are low (a few hundred calls a day), so searches and files are cached in
// .cache/openverse and reused across projects.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { REPO } from "./env.mjs";
import { sleep, warn } from "./util.mjs";

const API = "https://api.openverse.org/v1/audio/";
export const CACHE = path.join(REPO, ".cache", "openverse");
export const SAFE = new Set(["cc0", "pdm", "by"]);

async function get(url) {
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { headers: { "user-agent": "eden-motion (https://github.com/Eden-Makers/eden-motion)" } });
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      await sleep(2500 * (i + 1));
      continue;
    }
    throw new Error(`Openverse ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  throw new Error("Openverse: retries exhausted (rate limit?)");
}

// Returns safe, non-mature results in Openverse relevance order:
// [{id,title,creator,license,duration (s),url,landing,attribution,tags,source}]
export async function search(q, { category, pageSize = 20, source } = {}) {
  const qs = new URLSearchParams({ q, page_size: String(pageSize), license: [...SAFE].join(","), mature: "false" });
  if (category) qs.set("category", category);
  if (source) qs.set("source", source);
  const key = crypto.createHash("sha1").update(qs.toString()).digest("hex").slice(0, 12);
  const file = path.join(CACHE, "search", `${key}.json`);
  let data;
  if (fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file, "utf8"));
  else {
    data = await (await get(`${API}?${qs}`)).json();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data));
  }
  return (data.results || [])
    .filter((r) => SAFE.has(r.license) && !r.mature && r.url)
    .map((r) => ({
      id: r.id,
      title: r.title,
      creator: r.creator,
      license: r.license,
      licenseVersion: r.license_version,
      duration: (r.duration || 0) / 1000,
      url: r.url,
      ext: (path.extname(new URL(r.url).pathname).slice(1) || r.filetype || "mp3").toLowerCase(), // freesound serves mp3 previews of wav originals
      landing: r.foreign_landing_url,
      attribution: r.attribution,
      tags: (r.tags || []).map((t) => t.name).slice(0, 12),
      source: r.source,
    }));
}

export async function fetchAudio(r) {
  const file = path.join(CACHE, "files", `${r.id}.${r.ext}`);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return file;
  const res = await get(r.url);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

// One line per used sound for audio/CREDITS.md (cc0/pdm listed too: provenance, not obligation).
export function creditLine(r) {
  const must = r.license === "by" ? " **(credit required)**" : "";
  return `- ${r.attribution || `"${r.title}" by ${r.creator} (${r.license})`} Source: ${r.landing || r.url}${must}`;
}

export function safeWarn(e) {
  warn("openverse: " + String(e.message || e).slice(0, 160));
}

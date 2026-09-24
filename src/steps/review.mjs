// review: HTML review sheet (shots in order with frames, VO, scene type, props, image prompts,
// QC notes) next to the render, plus optional delivery to a Drive folder.
import fs from "node:fs";
import path from "node:path";
import { log, readJSON, run } from "../lib/util.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export async function review(projectDir, { deliver } = {}) {
  const sb = readJSON(path.join(projectDir, "storyboard.json"));
  const brand = readJSON(path.join(projectDir, "brand.json"), {});
  const sc = readJSON(path.join(projectDir, "script.json"), {});
  const renders = path.join(projectDir, "renders");
  const video = ["final.mp4", "draft.mp4"].map((f) => path.join(renders, f)).find((f) => fs.existsSync(f));
  if (!video) throw new Error("render first");
  const qc = readJSON(path.join(renders, "qc.json"), null);
  const prompts = fs.existsSync(path.join(projectDir, "prompts.log.jsonl"))
    ? fs.readFileSync(path.join(projectDir, "prompts.log.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : [];
  const dir = path.join(renders, "review");
  fs.mkdirSync(dir, { recursive: true });
  sb.scenes.forEach((s, i) => {
    for (const [k, f] of [["a", 0.35], ["b", 0.8]]) {
      run("ffmpeg", ["-y", "-v", "error", "-ss", (s.start + s.duration * f).toFixed(2), "-i", video, "-frames:v", "1", "-vf", "scale=640:-1", "-q:v", "3", path.join(dir, `s${i + 1}${k}.jpg`)], { allowFail: true });
    }
  });
  fs.copyFileSync(video, path.join(dir, path.basename(video)));
  const rows = sb.scenes
    .map((s, i) => {
      const issues = (qc?.issues || []).filter((x) => x.scene === s.id);
      return `<section class="shot"><div class="frames"><img src="s${i + 1}a.jpg"><img src="s${i + 1}b.jpg"></div>
<div class="meta"><div class="top"><b>${s.id}</b><span class="t">${s.start.toFixed(2)}s &middot; ${s.duration.toFixed(2)}s</span><span class="tag">${esc(s.type)}</span>${s.tone ? `<span class="tag ghost">${esc(s.tone)}</span>` : ""}${s.transition ? `<span class="tag ghost">in: ${esc(s.transition.type)}</span>` : ""}</div>
<p class="vo">${esc(s.vo)}</p><pre>${esc(JSON.stringify(s.props, null, 1))}</pre>${issues.map((x) => `<p class="qc ${x.severity}">QC ${esc(x.severity)}: ${esc(x.problem)} &rarr; ${esc(x.fix)}</p>`).join("")}</div></section>`;
    })
    .join("\n");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(brand.name)} review</title>
<style>:root{--bg:#0b0b0e;--card:#15151b;--fg:#f2f2f5;--muted:#8b8b99;--acc:#ec7740}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 Inter,system-ui,sans-serif}main{max-width:1200px;margin:0 auto;padding:32px 16px}h1{font-size:34px;margin:0 0 4px}video{width:100%;border-radius:14px;margin:18px 0 28px;background:#000}.shot{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:18px;background:var(--card);border-radius:14px;padding:14px;margin:0 0 14px}.frames{display:grid;grid-template-columns:1fr 1fr;gap:8px}.frames img{width:100%;border-radius:8px;display:block}.top{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.t{color:var(--muted)}.tag{background:var(--acc);color:#111;border-radius:99px;padding:2px 10px;font-weight:600;font-size:13px}.tag.ghost{background:transparent;color:var(--muted);border:1px solid #333}.vo{font-size:17px;margin:10px 0}pre{white-space:pre-wrap;color:var(--muted);font-size:12px;max-height:160px;overflow:auto;margin:0}.qc{color:#ffb4a0;font-size:13px}.qc.low{color:var(--muted)}.sum{color:var(--muted)}@media(max-width:760px){.shot{grid-template-columns:1fr}}</style></head>
<body><main><h1>${esc(brand.name)}: ${esc(sc.title || "brand film")}</h1><p class="sum">${sb.scenes.length} shots &middot; ${sb.duration.toFixed(1)} s &middot; theme ${esc(sb.theme)}${qc ? ` &middot; QC ${qc.score}/100: ${esc(qc.verdict)}` : ""}</p>
<video src="${path.basename(video)}" controls playsinline></video>
${rows}
<h2>Image prompts</h2>${prompts.map((p) => `<pre>${esc(p.model)} &middot; ${esc(p.file)}\n${esc(p.prompt)}</pre>`).join("") || "<p class='sum'>none</p>"}
<h2>Voice and music</h2><pre>${esc(sc.voice_direction || "")}\n\n${esc(sc.music || "")}</pre></main></body></html>`;
  fs.writeFileSync(path.join(dir, "index.html"), html);
  log(`review sheet -> ${path.join(dir, "index.html")}`);
  if (deliver) {
    const dst = path.join(deliver, path.basename(projectDir));
    fs.mkdirSync(dst, { recursive: true });
    for (const f of fs.readdirSync(dir)) fs.copyFileSync(path.join(dir, f), path.join(dst, f));
    log(`delivered -> ${dst}`);
  }
  return path.join(dir, "index.html");
}

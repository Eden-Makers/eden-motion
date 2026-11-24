// review: HTML review sheet (shots in order with frames, VO, scene type, props, image prompts,
// QC notes) next to the render, plus optional VideoHub JSON export, timestamped comment importer,
// and delivery to a Drive folder.
import fs from "node:fs";
import path from "node:path";
import { log, warn, readJSON, writeJSON, run, noDashes, deepNoDashes } from "../lib/util.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function pad2(n) {
  return String(Math.floor(Math.max(0, n))).padStart(2, "0");
}

function formatMMSS(sec) {
  const s = Math.max(0, +sec || 0);
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return `${m}:${rem < 10 ? "0" : ""}${rem.toFixed(2)}`;
}

function formatSMPTE(sec, fps = 30) {
  const s = Math.max(0, +sec || 0);
  const totalFrames = Math.round(s * fps);
  const ff = totalFrames % fps;
  const totalSec = Math.floor(totalFrames / fps);
  const ss = totalSec % 60;
  const mm = Math.floor(totalSec / 60) % 60;
  const hh = Math.floor(totalSec / 3600);
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}:${pad2(ff)}`;
}

export function parseTimestampSeconds(val, fps = 30) {
  if (val == null || val === "") return null;
  if (typeof val === "number" && Number.isFinite(val)) return Math.max(0, val);
  const s = String(val).trim().replace(/s$/i, "");
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const parts = s.split(":").map((x) => x.trim());
  if (parts.length === 4 && parts.every((x) => /^\d+$/.test(x))) {
    // SMPTE HH:MM:SS:FF
    const [hh, mm, ss, ff] = parts.map(Number);
    return hh * 3600 + mm * 60 + ss + ff / Math.max(1, fps);
  }
  if (parts.length === 3 && parts.every((x) => /^\d+(\.\d+)?$/.test(x))) {
    const [hh, mm, ss] = parts.map(Number);
    return hh * 3600 + mm * 60 + ss;
  }
  if (parts.length === 2 && parts.every((x) => /^\d+(\.\d+)?$/.test(x))) {
    const [mm, ss] = parts.map(Number);
    return mm * 60 + ss;
  }
  return null;
}

function findSceneAtTime(scenes, t) {
  if (!scenes.length) return null;
  if (t == null || !Number.isFinite(t)) return null;
  if (t <= scenes[0].start) return scenes[0];
  for (const s of scenes) {
    if (t >= s.start - 0.001 && t < s.start + s.duration - 0.001) return s;
  }
  const last = scenes[scenes.length - 1];
  if (t >= last.start) return last;
  // Fallback: closest scene midpoint
  let best = scenes[0];
  let bestDist = Infinity;
  for (const s of scenes) {
    const mid = s.start + s.duration / 2;
    const d = Math.abs(t - mid);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

function collectAudioStems(projectDir) {
  const rel = (p) => (fs.existsSync(p) ? path.relative(projectDir, p) : null);
  const stemsDir = path.join(projectDir, "audio", "stems");
  const layers = {};
  if (fs.existsSync(stemsDir)) {
    for (const f of fs.readdirSync(stemsDir).sort()) {
      if (!/\.(wav|mp3|m4a|flac)$/i.test(f)) continue;
      layers[path.basename(f, path.extname(f))] = path.relative(projectDir, path.join(stemsDir, f));
    }
  }
  return {
    mix: rel(path.join(projectDir, "audio", "mix.wav")),
    sfx_only: rel(path.join(projectDir, "audio", "sfx_only.wav")),
    vo: rel(path.join(projectDir, "audio", "vo.mp3")),
    layers,
  };
}

function extractCommentsList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    for (const k of ["comments", "review_comments", "notes", "items", "data", "results"]) {
      if (Array.isArray(raw[k])) return raw[k];
    }
  }
  return [];
}

export function importReviewNotes(projectDir, notesFile) {
  const srcPath = path.isAbsolute(notesFile) ? notesFile : path.resolve(process.cwd(), notesFile);
  if (!fs.existsSync(srcPath)) throw new Error(`notes file not found: ${srcPath}`);
  const sb = readJSON(path.join(projectDir, "storyboard.json"));
  const fps = sb.fps || 30;
  const raw = readJSON(srcPath);
  const comments = extractCommentsList(raw);
  if (!comments.length) warn(`no comments found in ${srcPath}`);

  const mapped = comments
    .map((c, idx) => {
      const text = noDashes(String(c.text ?? c.body ?? c.comment ?? c.message ?? c.note ?? "").trim());
      if (!text) return null;
      const rawTime = c.timestamp_s ?? c.time_s ?? c.seconds ?? c.at ?? c.start_s ?? c.timecode ?? c.tc ?? c.timestamp ?? c.time;
      const ts = parseTimestampSeconds(rawTime, fps);
      const explicitScene = c.scene_id || c.scene || null;
      const scene = explicitScene
        ? sb.scenes.find((s) => s.id === explicitScene) || findSceneAtTime(sb.scenes, ts)
        : findSceneAtTime(sb.scenes, ts);
      const author = String(c.author?.name ?? c.author ?? c.user?.name ?? c.user ?? c.reviewer ?? "reviewer");
      const resolved = Boolean(c.resolved || c.status === "resolved" || c.status === "closed");
      const offset_s = scene && ts != null ? +Math.max(0, ts - scene.start).toFixed(2) : null;
      return {
        index: idx + 1,
        id: c.id ?? null,
        author,
        resolved,
        timestamp_s: ts != null ? +ts.toFixed(3) : null,
        timecode: ts != null ? formatMMSS(ts) : (c.timecode ? String(c.timecode) : "film"),
        scene_id: scene ? scene.id : "film",
        scene_type: scene ? scene.type : null,
        offset_s,
        text,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.timestamp_s ?? 1e9) - (b.timestamp_s ?? 1e9));

  const openNotes = mapped.filter((n) => !n.resolved);
  const directorNote = noDashes(
    openNotes
      .map((n) => `${n.scene_id}${n.timestamp_s != null ? ` (${n.timecode})` : ""}: ${n.text.replace(/\s+/g, " ")}`)
      .join("; ")
  );

  const dir = path.join(projectDir, "renders", "review");
  fs.mkdirSync(dir, { recursive: true });

  const mdLines = [
    `# Imported Review Notes: ${path.basename(projectDir)}`,
    "",
    `- Source: \`${path.relative(projectDir, srcPath) || srcPath}\``,
    `- Total comments: ${mapped.length} (${openNotes.length} open, ${mapped.length - openNotes.length} resolved)`,
    "",
    "## Mapped to Scenes",
    "",
  ];
  for (const n of mapped) {
    const status = n.resolved ? " [RESOLVED]" : "";
    const meta = n.scene_type ? `${n.scene_id} (${n.scene_type}, +${n.offset_s ?? 0}s)` : n.scene_id;
    mdLines.push(`- **${n.timecode}** -> **${meta}** (${n.author})${status}: ${n.text}`);
  }
  mdLines.push("");
  mdLines.push("## Director Note String");
  mdLines.push("");
  mdLines.push("```text");
  mdLines.push(directorNote || "(no open notes)");
  mdLines.push("```");
  mdLines.push("");
  if (directorNote) {
    const safeQuoted = directorNote.replace(/"/g, '\\"');
    mdLines.push("Run:");
    mdLines.push(`\`eden-motion note ${path.basename(projectDir)} "${safeQuoted}"\``);
    mdLines.push("");
  }

  const mdPath = path.join(dir, "imported-notes.md");
  const jsonPath = path.join(dir, "imported-notes.json");
  fs.writeFileSync(mdPath, noDashes(mdLines.join("\n")));
  writeJSON(jsonPath, deepNoDashes({ source: srcPath, count: mapped.length, open_count: openNotes.length, director_note: directorNote, notes: mapped }));
  log(`imported ${mapped.length} review comment(s) -> ${mdPath}`);
  if (directorNote) log(`director note: ${directorNote}`);
  return { mdPath, jsonPath, notes: mapped, directorNote };
}

export async function review(projectDir, { deliver, videohub = false, importNotes = null } = {}) {
  if (importNotes && !videohub && !deliver) {
    return importReviewNotes(projectDir, importNotes);
  }
  const sb = readJSON(path.join(projectDir, "storyboard.json"));
  const brand = readJSON(path.join(projectDir, "brand.json"), {});
  const brief = readJSON(path.join(projectDir, "brief.json"), {});
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

  if (videohub) {
    const fps = sb.fps || 30;
    const vhPath = path.join(dir, "videohub.json");
    const prevVh = readJSON(vhPath, null);
    const prevRev = typeof prevVh?.version?.revision === "number" ? prevVh.version.revision : 0;
    const markers = sb.scenes.map((s, i) => ({
      scene_id: s.id,
      index: i + 1,
      type: s.type,
      tone: s.tone || null,
      transition_in: s.transition?.type || "cut",
      start_s: s.start,
      end_s: +(s.start + s.duration).toFixed(3),
      duration_s: s.duration,
      timecode_in: formatMMSS(s.start),
      timecode_out: formatMMSS(s.start + s.duration),
      smpte_in: formatSMPTE(s.start, fps),
      smpte_out: formatSMPTE(s.start + s.duration, fps),
      vo: s.vo || "",
      thumbnails: [`s${i + 1}a.jpg`, `s${i + 1}b.jpg`],
      qc_issues: (qc?.issues || []).filter((x) => x.scene === s.id),
    }));
    const manifest = deepNoDashes({
      schema: "eden-motion.videohub/v1",
      exported_at: new Date().toISOString(),
      project: path.basename(projectDir),
      company: brand.name || brief.company || path.basename(projectDir),
      title: sc.title || `${brand.name || path.basename(projectDir)} brand film`,
      version: {
        revision: prevRev + 1,
        label: `v${prevRev + 1}`,
        quality: path.basename(video) === "final.mp4" ? "final" : "draft",
        render_file: path.basename(video),
        render_path: path.relative(projectDir, video),
        duration_s: sb.duration,
        fps,
        width: sb.width || 1920,
        height: sb.height || 1080,
        theme: sb.theme || null,
        style: sb.styleProfile || brief.style || null,
        template: sb.template || brief.template || null,
        qc_score: qc?.score ?? null,
        qc_verdict: qc?.verdict ?? null,
      },
      review_html: "index.html",
      markers,
      thumbnails: markers.flatMap((m) => m.thumbnails),
      stems: collectAudioStems(projectDir),
    });
    writeJSON(vhPath, manifest);
    log(`videohub manifest -> ${vhPath} (${markers.length} scene markers, ${manifest.version.label})`);
  }

  if (importNotes) {
    importReviewNotes(projectDir, importNotes);
  }

  if (deliver) {
    const dst = path.join(deliver, path.basename(projectDir));
    fs.mkdirSync(dst, { recursive: true });
    for (const f of fs.readdirSync(dir)) fs.copyFileSync(path.join(dir, f), path.join(dst, f));
    log(`delivered -> ${dst}`);
  }
  return path.join(dir, "index.html");
}

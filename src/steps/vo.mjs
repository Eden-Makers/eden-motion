// vo: script.json -> audio/vo.mp3 + vo.json (word timings + per-line windows).
// The whole script is synthesised in ONE request so prosody flows like a real read; lines are
// separated by a short pause and mapped back to time windows from the word timestamps.
import fs from "node:fs";
import path from "node:path";
import { tts } from "../lib/eleven.mjs";
import { log, readJSON, writeJSON, run, probeDuration } from "../lib/util.mjs";

const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export async function vo(projectDir, { voice, speed, model } = {}) {
  const brief = readJSON(path.join(projectDir, "brief.json"), {});
  const sc = readJSON(path.join(projectDir, "script.json"));
  voice = voice || brief.voice || "brian";
  const lang = brief.lang || "en";
  model = model || (lang === "en" ? "eleven_multilingual_v2" : "eleven_multilingual_v2");
  const text = sc.lines.map((l) => l.text.trim().replace(/([^.!?])$/, "$1.")).join("\n\n");
  const audioDir = path.join(projectDir, "audio");
  fs.mkdirSync(audioDir, { recursive: true });
  const raw = path.join(audioDir, "vo-raw.mp3");
  log(`ElevenLabs TTS (${voice}, ${text.length} chars)`);
  const { words } = await tts(text, raw, { voice, model, speed: speed || brief.voiceSpeed || 1.0, stability: 0.5, style: 0.2 });

  // Trim leading silence and shift timings so the film can start with the first word + lead-in.
  const lead = 0.35;
  const first = words[0]?.start || 0;
  const shift = lead - first;
  const vo = path.join(audioDir, "vo.mp3");
  if (shift >= 0) run("ffmpeg", ["-y", "-v", "error", "-i", raw, "-af", `adelay=${Math.round(shift * 1000)}:all=1`, "-c:a", "libmp3lame", "-q:a", "2", vo]);
  else run("ffmpeg", ["-y", "-v", "error", "-ss", String(-shift), "-i", raw, "-c:a", "libmp3lame", "-q:a", "2", vo]);
  const W = words.map((w) => ({ word: w.word, start: +(w.start + shift).toFixed(3), end: +(w.end + shift).toFixed(3) }));

  // Map lines to word ranges by walking the normalised tokens.
  let wi = 0;
  const lines = sc.lines.map((l, i) => {
    // alignment is on the raw input characters, so whitespace tokens match 1:1
    const toks = l.text.trim().split(/\s+/).filter(Boolean);
    const startIdx = wi;
    wi = Math.min(W.length, wi + toks.length);
    const seg = W.slice(startIdx, wi);
    return { i, text: l.text, start: seg[0]?.start ?? 0, end: seg[seg.length - 1]?.end ?? 0, words: seg.length };
  });
  const dur = probeDuration(vo);
  const out = { voice, file: "audio/vo.mp3", duration: +dur.toFixed(3), words: W, lines };
  writeJSON(path.join(projectDir, "vo.json"), out);
  const wpm = (W.length / ((W[W.length - 1].end - W[0].start) / 60)).toFixed(0);
  log(`vo.json: ${W.length} words, ${dur.toFixed(1)}s, ${wpm} wpm`);
  return out;
}

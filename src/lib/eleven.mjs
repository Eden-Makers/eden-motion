// ElevenLabs: TTS with character timestamps -> word timings, SFX, music.
import fs from "node:fs";
import path from "node:path";
import { key } from "./env.mjs";
import { sleep } from "./util.mjs";

const API = "https://api.elevenlabs.io/v1";

// Curated narrators that fit premium tech explainers. Override with --voice <id>.
export const VOICES = {
  "brian": "nPczCjzI2devNBz1zQrb", // deep, calm American male, the Burnwe-style narrator
  "adam": "pNInz6obpgDQGcFmaJgB",
  "george": "JBFqnCBsd6RMkjVDRZzb", // warm British male
  "sarah": "EXAVITQu4vr4xnSDxMaL", // soft confident female
  "alice": "Xb7hH8MSUJpSbSDYk0k2", // clear British female
  "matilda": "XrExE9yKIg1WjnnlVkGX", // warm American female
  "daniel": "onwK4e9ZLuTAKqWW03F9", // authoritative British male, broadcast
};

async function post(url, body, { json = true } = {}) {
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "xi-api-key": key("ELEVENLABS_API_KEY"), "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return json ? res.json() : Buffer.from(await res.arrayBuffer());
    const t = await res.text();
    if (res.status === 429 || res.status >= 500) {
      await sleep(3000 * (i + 1));
      continue;
    }
    throw new Error(`ElevenLabs ${res.status}: ${t.slice(0, 600)}`);
  }
  throw new Error("ElevenLabs: retries exhausted");
}

// Returns { audioFile, words:[{word,start,end}] }.
export async function tts(text, outFile, { voice = "brian", model = "eleven_multilingual_v2", stability = 0.45, similarity = 0.8, style = 0.25, speed = 1.0, previousText, nextText } = {}) {
  const voiceId = VOICES[voice] || voice;
  const data = await post(`${API}/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_192`, {
    text,
    model_id: model,
    voice_settings: { stability, similarity_boost: similarity, style, use_speaker_boost: true, speed },
    ...(previousText ? { previous_text: previousText } : {}),
    ...(nextText ? { next_text: nextText } : {}),
  });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, Buffer.from(data.audio_base64, "base64"));
  const a = data.alignment || data.normalized_alignment;
  return { audioFile: outFile, words: charsToWords(a) };
}

export function charsToWords(a) {
  const words = [];
  let cur = null;
  a.characters.forEach((ch, i) => {
    const s = a.character_start_times_seconds[i];
    const e = a.character_end_times_seconds[i];
    if (/\s/.test(ch)) {
      if (cur) words.push(cur), (cur = null);
      return;
    }
    if (!cur) cur = { word: "", start: s, end: e };
    cur.word += ch;
    cur.end = e;
  });
  if (cur) words.push(cur);
  return words;
}

export async function sfx(prompt, outFile, { seconds = 1.5, influence = 0.6 } = {}) {
  const buf = await post(`${API}/sound-generation?output_format=mp3_44100_192`, { text: prompt, duration_seconds: seconds, prompt_influence: influence }, { json: false });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, buf);
  return outFile;
}

export async function music(prompt, outFile, { ms = 60000 } = {}) {
  const buf = await post(`${API}/music?output_format=mp3_44100_192`, { prompt, music_length_ms: ms, force_instrumental: true }, { json: false });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, buf);
  return outFile;
}

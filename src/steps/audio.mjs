// audio: music bed + SFX on engine cues + VO -> audio/mix.wav
// Sound grammar from the reference films: whoosh on every scene change / fast move, click on
// every cursor click, quiet pops on staggered arrivals, a riser into the reveal, music ducked
// under VO, music dips under the pivot/prompt and returns on the answer, music out 1-2 s before
// the picture ends. Cues come from the composition itself so SFX land on exact frames.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { music as elMusic } from "../lib/eleven.mjs";
import { readCues } from "../lib/browser.mjs";
import { beatGrid, peakTime } from "../lib/audiofx.mjs";
import { build } from "./build.mjs";
import { REPO } from "../lib/env.mjs";
import { log, warn, readJSON, writeJSON, run, probeDuration } from "../lib/util.mjs";

const SFX = path.join(REPO, "sfx-library");

function thin(cues, type, minGap) {
  let last = -99;
  return cues.filter((c) => c.type === type).filter((c) => (c.t - last >= minGap ? ((last = c.t), true) : false));
}

export async function audio(projectDir, { musicPrompt, noMusic = false } = {}) {
  const sb = readJSON(path.join(projectDir, "storyboard.json"));
  const sc = readJSON(path.join(projectDir, "script.json"), {});
  const vo = readJSON(path.join(projectDir, "vo.json"), null);
  const D = sb.duration;
  const aDir = path.join(projectDir, "audio");
  fs.mkdirSync(aDir, { recursive: true });

  // 1. music
  const musicFile = path.join(aDir, "music.mp3");
  if (!noMusic && !fs.existsSync(musicFile)) {
    const prompt = musicPrompt || `${sc.music || "modern corporate tech house, 115 BPM, clean plucks, soft kick, warm pads, uplifting, confident"}. Instrumental only, no vocals. Structure for a ${Math.round(D)} second product film: soft intro, builds, a short breakdown around 35% (the problem-to-solution turn), full energy after, clean ending with a final hit around ${Math.round(D - 2)} s.`;
    log("generating music (ElevenLabs music)");
    try {
      await elMusic(prompt, musicFile, { ms: Math.round((D + 1) * 1000) });
      fs.writeFileSync(path.join(aDir, "music.prompt.txt"), prompt);
    } catch (e) {
      warn("music generation failed: " + e.message.slice(0, 200));
    }
  }

  // 2. cues from the composition
  const comp = await build(projectDir, { slow: 1, out: "comp" });
  let cues = [];
  try {
    cues = await readCues(path.join(comp, "index.html"));
  } catch (e) {
    warn("could not read cues: " + e.message);
  }
  const whooshes = thin(cues, "whoosh", 0.8);
  const clicks = thin(cues, "click", 0.25);
  // Restraint (Apple framework): a pop that does not help understanding is noise.
  const pops = thin(cues, "pop", 0.5).slice(0, 14);
  // Scenes without a transition still get a soft whoosh on tone changes.
  sb.scenes.forEach((s, i) => {
    if (i && !s.transition && s.tone !== sb.scenes[i - 1].tone) whooshes.push({ t: s.start - 0.15, type: "whoosh", soft: true });
  });
  const reveal = sb.scenes.find((s) => s.type === "logo-reveal");
  writeJSON(path.join(aDir, "cues.json"), { whooshes, clicks, pops });

  // 3. mix with one ffmpeg graph
  const inputs = [];
  const filters = [];
  const mixLabels = [];
  const add = (file) => (inputs.push("-i", file), inputs.length / 2 - 1);
  // Repeated one-shots get a small deterministic pitch spread (0.92-1.12) so a run of pops or
  // clicks never sounds pasted; an optional screen x (0..1920) pans the sound with its element.
  const hash = (str) => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const place = (file, t, gainDb, label, { x, pitch } = {}) => {
    if (t < 0 || t > D) return;
    const k = add(file);
    const rate = pitch ?? (/^w/.test(label) ? 1 : 0.92 + (hash(label) % 1000) / 5000);
    // t is the EVENT time: shift by the sample's measured peak (scaled by the pitch change) so the transient lands on it
    const at = Math.max(0, t - peakTime(file) / rate);
    const pan = x != null ? (() => { const p = Math.max(-1, Math.min(1, (x - 960) / 960)) * 0.6; return `,pan=stereo|c0=${(1 - Math.max(0, p)).toFixed(3)}*c0|c1=${(1 + Math.min(0, p)).toFixed(3)}*c1`; })() : "";
    const shift = rate !== 1 ? `,asetrate=${Math.round(48000 * rate)},aresample=48000` : "";
    filters.push(`[${k}:a]aformat=sample_rates=48000:channel_layouts=stereo${shift}${pan},volume=${gainDb}dB,adelay=${Math.round(at * 1000)}:all=1[${label}]`);
    mixLabels.push(`[${label}]`);
  };

  const voFile = vo ? path.join(projectDir, vo.file) : null;
  let voIdx = -1;
  if (voFile && fs.existsSync(voFile)) {
    voIdx = add(voFile);
    filters.push(`[${voIdx}:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=1.0,asplit=2[vo][vokey]`);
    mixLabels.push("[vo]");
  }
  // Beat grid + drop alignment: shift the music so its strongest hit just after the reveal lands
  // exactly on the logo (the only thing the references lock to the music besides drops).
  let trimStart = 0;
  if (fs.existsSync(musicFile)) {
    try {
      const g = beatGrid(musicFile);
      const T = reveal ? reveal.start + 0.2 : null;
      if (T != null) {
        const cands = g.onsets.filter((o) => o.t >= T && o.t <= T + 1.6);
        const hit = cands.sort((a, b) => b.v - a.v)[0];
        if (hit) trimStart = +(hit.t - T).toFixed(3);
      }
      writeJSON(path.join(aDir, "beats.json"), { bpm: g.bpm, period: g.period, trimStart, beats: g.beats.map((b) => +(b - trimStart).toFixed(3)).filter((b) => b >= 0) });
      log(`music: ${g.bpm} BPM, shifted ${trimStart}s so the strongest hit lands on the logo`);
    } catch (e) {
      warn("beat analysis failed: " + e.message.slice(0, 120));
    }
  }
  if (fs.existsSync(musicFile)) {
    const mk = add(musicFile);
    // music out 1.2 s before the end, fade in 0.4 s
    const fadeOut = Math.max(0, D - 2.6);
    // Music dips (the main dynamic device of the references): under the TURN/pivot line and
    // under prompt typing, returning on the answer.
    const dips = sb.scenes
      .map((s, i) => ({ s, beat: (sc.lines?.[i]?.beat || "").toUpperCase() }))
      .filter(({ s, beat }) => beat === "TURN" || s.type === "prompt-box")
      .map(({ s }) => `volume=enable='between(t,${(s.start + 0.1).toFixed(2)},${(s.start + s.duration - 0.35).toFixed(2)})':volume=0.4`);
    filters.push(`[${mk}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=start=${trimStart},asetpts=PTS-STARTPTS,atrim=0:${D.toFixed(2)},afade=t=in:d=0.4,afade=t=out:st=${fadeOut.toFixed(2)}:d=1.4,volume=-9dB${dips.length ? "," + dips.join(",") : ""}[mraw]`);
    if (voIdx >= 0) {
      filters.push(`[mraw][vokey]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=450:makeup=1[music]`);
    } else filters.push(`[mraw]anull[music]`);
    mixLabels.push("[music]");
  } else if (voIdx >= 0) {
    filters.push(`[vokey]anullsink`);
  }
  // keyboard bed under typed prompts, trimmed to the typing duration
  cues.filter((c) => c.type === "typing").slice(0, 8).forEach((c, i) => {
    if (c.t < 0 || c.t > D) return;
    const k = add(path.join(SFX, "typing.mp3"));
    const dur = Math.min(c.dur || 1.5, 4);
    filters.push(`[${k}:a]aformat=sample_rates=48000:channel_layouts=stereo,aloop=loop=3:size=2e6,atrim=0:${dur.toFixed(2)},afade=t=out:st=${Math.max(0, dur - 0.15).toFixed(2)}:d=0.15,volume=-10dB,adelay=${Math.round(c.t * 1000)}:all=1[ty${i}]`);
    mixLabels.push(`[ty${i}]`);
  });
  const W = [path.join(SFX, "whoosh.mp3"), path.join(SFX, "whoosh-short.mp3")];
  whooshes.forEach((c, i) => place(W[i % 2], c.t + (c.dur || 0.3) / 2, c.soft ? -6 : -1, `w${i}`));
  clicks.forEach((c, i) => place(path.join(SFX, "click.mp3"), c.t, 2, `c${i}`, { x: c.x }));
  pops.forEach((c, i) => place(path.join(SFX, "pop.mp3"), c.t, -7, `p${i}`, { x: c.x }));
  if (reveal) {
    place(path.join(SFX, "riser.mp3"), reveal.start + 0.1, -9, "riser");
    place(path.join(SFX, "impact-bass-1.mp3"), reveal.start + 0.2, -10, "impact");
  }

  const out = path.join(aDir, "mix.wav");
  const graph = `${filters.join(";")};${mixLabels.join("")}amix=inputs=${mixLabels.length}:normalize=0:dropout_transition=0,atrim=0:${D.toFixed(2)}[out]`;
  fs.writeFileSync(path.join(aDir, "mix.graph.txt"), graph);
  const pre = path.join(aDir, "mix.pre.wav");
  run("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", graph, "-map", "[out]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_f32le", pre]);
  master(pre, out);
  fs.rmSync(pre, { force: true });
  log(`audio mix: vo + ${fs.existsSync(musicFile) ? "music" : "no music"} + ${whooshes.length} whooshes, ${clicks.length} clicks, ${pops.length} pops -> ${probeDuration(out).toFixed(1)}s`);
  return out;
}

// Two-pass loudness to -14 LUFS with the measured values, then a 4x-oversampled limiter: AAC adds
// ~1.5 dB of inter-sample overshoot, so a single-pass loudnorm peak target is not enough.
export function master(input, output, { I = -14, TP = -1.5, LRA = 11, ceilingDb = -2.0 } = {}) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", input, "-af", `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
  const m = JSON.parse((r.stderr.match(/\{[\s\S]*?\}(?![\s\S]*\{)/) || ["{}"])[0]);
  const ln = m.input_i
    ? `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`
    : `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}`;
  const lim = Math.pow(10, ceilingDb / 20).toFixed(4);
  run("ffmpeg", ["-y", "-v", "error", "-i", input, "-af", `${ln},aresample=192000,alimiter=limit=${lim}:attack=2:release=60:level=false,aresample=48000`, "-ar", "48000", "-ac", "2", output]);
}

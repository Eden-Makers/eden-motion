// audio: music bed + SFX on engine cues + VO -> audio/mix.wav
// Sound grammar from the reference films: whoosh on every scene change / fast move, click on
// every cursor click, quiet pops on staggered arrivals, a riser into the reveal, music ducked
// under VO, music dips under the pivot/prompt and returns on the answer, music out 1-2 s before
// the picture ends. Cues come from the composition itself so SFX land on exact frames.
import fs from "node:fs";
import path from "node:path";
import { music as elMusic } from "../lib/eleven.mjs";
import { readCues } from "../lib/browser.mjs";
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
  const pops = thin(cues, "pop", 0.22).slice(0, 40);
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
  const place = (file, t, gainDb, label) => {
    if (t < 0 || t > D) return;
    const k = add(file);
    filters.push(`[${k}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${gainDb}dB,adelay=${Math.round(t * 1000)}:all=1[${label}]`);
    mixLabels.push(`[${label}]`);
  };

  const voFile = vo ? path.join(projectDir, vo.file) : null;
  let voIdx = -1;
  if (voFile && fs.existsSync(voFile)) {
    voIdx = add(voFile);
    filters.push(`[${voIdx}:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=1.0,asplit=2[vo][vokey]`);
    mixLabels.push("[vo]");
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
    filters.push(`[${mk}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:${D.toFixed(2)},afade=t=in:d=0.4,afade=t=out:st=${fadeOut.toFixed(2)}:d=1.4,volume=-9dB${dips.length ? "," + dips.join(",") : ""}[mraw]`);
    if (voIdx >= 0) {
      filters.push(`[mraw][vokey]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=450:makeup=1[music]`);
    } else filters.push(`[mraw]anull[music]`);
    mixLabels.push("[music]");
  } else if (voIdx >= 0) {
    filters.push(`[vokey]anullsink`);
  }
  const W = [path.join(SFX, "whoosh.mp3"), path.join(SFX, "whoosh-short.mp3")];
  whooshes.forEach((c, i) => place(W[i % 2], Math.max(0, c.t - 0.05), c.soft ? -20 : -15, `w${i}`));
  clicks.forEach((c, i) => place(path.join(SFX, "click.mp3"), c.t, -12, `c${i}`));
  pops.forEach((c, i) => place(path.join(SFX, "pop.mp3"), c.t, -24, `p${i}`));
  if (reveal) {
    place(path.join(SFX, "riser.mp3"), Math.max(0, reveal.start - 2.4), -20, "riser");
    place(path.join(SFX, "impact-bass-1.mp3"), reveal.start + 0.2, -14, "impact");
  }

  const out = path.join(aDir, "mix.wav");
  const graph = `${filters.join(";")};${mixLabels.join("")}amix=inputs=${mixLabels.length}:normalize=0:dropout_transition=0,atrim=0:${D.toFixed(2)},loudnorm=I=-14:TP=-1.2:LRA=11[out]`;
  fs.writeFileSync(path.join(aDir, "mix.graph.txt"), graph);
  run("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", graph, "-map", "[out]", "-ar", "48000", "-ac", "2", out]);
  log(`audio mix: vo + ${fs.existsSync(musicFile) ? "music" : "no music"} + ${whooshes.length} whooshes, ${clicks.length} clicks, ${pops.length} pops -> ${probeDuration(out).toFixed(1)}s`);
  return out;
}

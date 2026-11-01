// audio: VO + music bed + ambience + layered SFX on engine cues -> audio/stems/*.wav + audio/mix.wav
// Sound grammar from the reference films: whoosh on every scene change / fast move, click on
// every cursor click, quiet pops on staggered arrivals, a riser into the reveal, music ducked
// under VO, music dips under the pivot/prompt and returns on the answer, music out 1-2 s before
// the picture ends. Cues come from the composition itself so SFX land on exact frames.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { music as elMusic } from "../lib/eleven.mjs";
import { readCues } from "../lib/browser.mjs";
import { beatGrid, peakTime, estimateKey } from "../lib/audiofx.mjs";
import { build } from "./build.mjs";
import { REPO } from "../lib/env.mjs";
import { log, warn, readJSON, writeJSON, run, probeDuration } from "../lib/util.mjs";

const SFX = path.join(REPO, "sfx-library");

function thin(cues, type, minGap) {
  let last = -99;
  return cues.filter((c) => c.type === type).filter((c) => (c.t - last >= minGap ? ((last = c.t), true) : false));
}

// Layers (each rendered to its own full-length stem in audio/stems/, so an editor can rebalance
// or replace any of them, and `remix` rebuilds mix.wav from stems in seconds):
//   vo, music, ambience, sfx_transitions (whooshes), sfx_ui (clicks, pops, typing),
//   sfx_foley (per-scene signature sounds from Openverse), sfx_accents (riser + impact on the logo)
//   stingers (opt-in, --stingers): accent thumps + a logo sting composed in code (audio-as-code),
//   in the music's detected key, landing on exact cue frames
// The logo moment: built-in logo scenes, or any custom "*lockup*" / "*logo*" scene; props.at delays
// the reveal inside the scene (a lockup that lands after a 3D plate has turned).
const isReveal = (s) => /logo-reveal|logo-bars|lockup|logo/.test(s.type || "");
const revealTime = (s) => (s ? s.start + (+s.props?.at || 0) : null);

export const LAYERS = ["vo", "music", "ambience", "sfx_transitions", "sfx_ui", "sfx_foley", "sfx_accents", "stingers"];

// Out-of-process audio-as-code (tools/stingers.py), pinned. Returns a wav path or null.
function composeCode(job, out) {
  if (run("which", ["uv"], { allowFail: true }).status !== 0) {
    warn("uv not found: skipping code-composed audio (brew install uv)");
    return null;
  }
  const jobFile = out.replace(/\.wav$/, ".job.json");
  writeJSON(jobFile, { ...job, out });
  const r = run("uv", ["run", "--quiet", "--no-project", "--with", "audio-as-code==0.5.0", "python", path.join(REPO, "tools", "stingers.py"), jobFile], { allowFail: true });
  if (r.status !== 0 || !fs.existsSync(out)) {
    warn("audio-as-code failed: " + String(r.stderr || r.stdout).slice(-200));
    return null;
  }
  return out;
}

export async function audio(projectDir, { musicPrompt, noMusic = false, sfxSource, ambience, openverse = true, stingers, judgeSfx } = {}) {
  const sb = readJSON(path.join(projectDir, "storyboard.json"));
  const sc = readJSON(path.join(projectDir, "script.json"), {});
  const brief = readJSON(path.join(projectDir, "brief.json"), {});
  const vo = readJSON(path.join(projectDir, "vo.json"), null);
  sfxSource = sfxSource || brief.sfxSource || "local";
  stingers = stingers ?? !!brief.stingers;
  // SFX are picked by a code score; Gemini listening is opt-in (costs calls, editors swap sounds anyway)
  judgeSfx = judgeSfx ?? (!!brief.sfxJudge || process.env.EM_SFX_JUDGE === "1");
  const D = sb.duration;
  const FPS = sb.fps || 30;
  const aDir = path.join(projectDir, "audio");
  const stemDir = path.join(aDir, "stems");
  fs.rmSync(stemDir, { recursive: true, force: true });
  fs.mkdirSync(stemDir, { recursive: true });
  const credits = [];
  const context = `${brief.style || "burnwe"} style brand film for ${brief.company || sb.brand?.name || "a brand"}`;
  const ov = async (q, role, opts = {}) => {
    if (!openverse) return [];
    const { pick } = await import("../lib/soundpick.mjs");
    const got = await pick(q, { role, context, judge: judgeSfx, ...opts });
    got.forEach((g) => credits.push(g));
    return got;
  };

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

  const reveal0 = sb.scenes.find(isReveal);
  const codeBed = path.join(aDir, "music-code.wav");
  if (!noMusic && !fs.existsSync(musicFile)) {
    // no ElevenLabs music (no key or it failed): a plain bed composed in code beats silence
    if (fs.existsSync(codeBed) || composeCode({ mode: "bed", duration: D, bpm: 120, logo: reveal0 ? revealTime(reveal0) + 0.2 : null, key: brief.key || "D", scale: brief.keyScale || "major" }, codeBed)) {
      warn("music: using the code-composed fallback bed (audio/music-code.wav); generate real music for a final");
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
  const reveal = sb.scenes.find(isReveal);
  const revealT = revealTime(reveal);
  writeJSON(path.join(aDir, "cues.json"), { whooshes, clicks, pops });

  // 3. sound palette: the curated local library by default, or a fresh Openverse palette per film
  //    (--sfx-source openverse), each role falling back to the local file when nothing fits.
  const lib = { whoosh: [path.join(SFX, "whoosh.mp3"), path.join(SFX, "whoosh-short.mp3")], click: [path.join(SFX, "click.mp3")], pop: [path.join(SFX, "pop.mp3")], riser: [path.join(SFX, "riser.mp3")], hit: [path.join(SFX, "impact-bass-1.mp3")] };
  if (sfxSource === "openverse") {
    const Q = { whoosh: ["soft whoosh transition", 2], click: ["ui click", 1], pop: ["soft pop", 1], riser: ["riser build up", 1], hit: ["deep impact hit", 1] };
    for (const [role, [q, n]] of Object.entries(Q)) {
      const got = await ov(q, role, { n });
      if (got.length) lib[role] = got.map((g) => g.file);
    }
  }

  // 4. one ffmpeg graph, one output per layer
  const inputs = [];
  const filters = [];
  const byLayer = Object.fromEntries(LAYERS.map((l) => [l, []]));
  const add = (file) => (inputs.push("-i", file), inputs.length / 2 - 1);
  // Repeated one-shots get a small deterministic pitch spread (0.92-1.12) so a run of pops or
  // clicks never sounds pasted; an optional screen x (0..1920) pans the sound with its element.
  const hash = (str) => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const place = (file, t, gainDb, label, layer, { x, pitch } = {}) => {
    if (t < 0 || t > D) return;
    const k = add(file);
    const rate = pitch ?? (/^w/.test(label) ? 1 : 0.92 + (hash(label) % 1000) / 5000);
    // t is the EVENT time: shift by the sample's measured peak (scaled by the pitch change) so the
    // transient lands on it, and one more frame for one-shots: a hit that starts on the picture
    // frame reads as late (eye and ear fuse a sound that leads by ~40 ms; mg-styles-15 sync.py)
    const lead = layer === "sfx_transitions" ? 0 : 1 / FPS;
    const at = Math.max(0, t - peakTime(file) / rate - lead);
    const pan = x != null ? (() => { const p = Math.max(-1, Math.min(1, (x - 960) / 960)) * 0.6; return `,pan=stereo|c0=${(1 - Math.max(0, p)).toFixed(3)}*c0|c1=${(1 + Math.min(0, p)).toFixed(3)}*c1`; })() : "";
    const shift = rate !== 1 ? `,asetrate=${Math.round(48000 * rate)},aresample=48000` : "";
    filters.push(`[${k}:a]aformat=sample_rates=48000:channel_layouts=stereo${shift}${pan},volume=${gainDb}dB,adelay=${Math.round(at * 1000)}:all=1[${label}]`);
    byLayer[layer].push(`[${label}]`);
  };

  const voFile = vo ? path.join(projectDir, vo.file) : null;
  if (voFile && fs.existsSync(voFile)) {
    const k = add(voFile);
    filters.push(`[${k}:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=1.0[vo]`);
    byLayer.vo.push("[vo]");
  }
  // Beat grid + drop alignment: shift the music so its strongest hit just after the reveal lands
  // exactly on the logo (the only thing the references lock to the music besides drops).
  let trimStart = 0;
  const musicIn = fs.existsSync(musicFile) ? musicFile : !noMusic && fs.existsSync(codeBed) ? codeBed : null;
  if (musicIn) {
    try {
      const g = beatGrid(musicIn);
      const T = reveal ? revealT + 0.2 : null;
      if (T != null && musicIn !== codeBed && !sb.musicLocked) { // the code bed is composed onto the logo already; a locked (client) track is never shifted
        const cands = g.onsets.filter((o) => o.t >= T && o.t <= T + 1.6);
        const hit = cands.sort((a, b) => b.v - a.v)[0];
        if (hit) trimStart = +(hit.t - T).toFixed(3);
      }
      writeJSON(path.join(aDir, "beats.json"), { bpm: g.bpm, period: g.period, trimStart, beats: g.beats.map((b) => +(b - trimStart).toFixed(3)).filter((b) => b >= 0) });
      log(`music: ${g.bpm} BPM, shifted ${trimStart}s so the strongest hit lands on the logo`);
    } catch (e) {
      warn("beat analysis failed: " + e.message.slice(0, 120));
    }
    const mk = add(musicIn);
    // music out 1.2 s before the end, fade in 0.4 s
    // a locked track plays as delivered (the picture is cut to it): only a short safety fade at the very end
    const fadeOut = sb.musicLocked ? Math.max(0, D - 0.3) : Math.max(0, D - 2.6);
    // Music dips (the main dynamic device of the references): under the TURN/pivot line and
    // under prompt typing, returning on the answer. VO ducking happens in remix (sidechain).
    const dips = sb.scenes
      .map((s, i) => ({ s, beat: (sc.lines?.[i]?.beat || "").toUpperCase() }))
      .filter(({ s, beat }) => beat === "TURN" || s.type === "prompt-box")
      .map(({ s }) => `volume=enable='between(t,${(s.start + 0.1).toFixed(2)},${(s.start + s.duration - 0.35).toFixed(2)})':volume=0.4`);
    // explicit dips from the storyboard: musicDips [{from, to, gain (dB)}], e.g. under a voice line
    (sb.musicDips || []).forEach((d) => dips.push(`volume=enable='between(t,${(+d.from).toFixed(2)},${(+d.to).toFixed(2)})':volume=${Math.pow(10, (+d.gain || -4) / 20).toFixed(3)}`));
    filters.push(`[${mk}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=start=${trimStart},asetpts=PTS-STARTPTS,atrim=0:${D.toFixed(2)},afade=t=in:d=0.4,afade=t=out:st=${fadeOut.toFixed(2)}:d=${sb.musicLocked ? 0.3 : 1.4},volume=${musicIn === codeBed ? 0 : -9}dB${dips.length ? "," + dips.join(",") : ""}[music]`);
    byLayer.music.push("[music]");
  }
  // ambience bed (storyboard "ambience" or --ambience): looped, faded, far under everything
  const ambQ = ambience ?? brief.ambience ?? sb.ambience;
  if (ambQ) {
    const [a] = await ov(String(ambQ), "ambience");
    if (a) {
      const k = add(a.file);
      filters.push(`[${k}:a]aformat=sample_rates=48000:channel_layouts=stereo,aloop=loop=-1:size=2e9,atrim=0:${D.toFixed(2)},afade=t=in:d=1.2,afade=t=out:st=${Math.max(0, D - 2).toFixed(2)}:d=1.8,volume=-18dB[amb]`);
      byLayer.ambience.push("[amb]");
    }
  }
  // keyboard bed under typed prompts, trimmed to the typing duration
  cues.filter((c) => c.type === "typing").slice(0, 8).forEach((c, i) => {
    if (c.t < 0 || c.t > D) return;
    const k = add(path.join(SFX, "typing.mp3"));
    const dur = Math.min(c.dur || 1.5, 4);
    filters.push(`[${k}:a]aformat=sample_rates=48000:channel_layouts=stereo,aloop=loop=3:size=2e6,atrim=0:${dur.toFixed(2)},afade=t=out:st=${Math.max(0, dur - 0.15).toFixed(2)}:d=0.15,volume=-10dB,adelay=${Math.round(c.t * 1000)}:all=1[ty${i}]`);
    byLayer.sfx_ui.push(`[ty${i}]`);
  });
  // metronome films (flat, a cut every second) would turn tone-change whooshes into a wall of air:
  // keep them a breath under the picture there
  const softDb = sb.flat ? -13 : -6;
  whooshes.forEach((c, i) => place(lib.whoosh[i % lib.whoosh.length], c.t + (c.dur || 0.3) / 2, c.soft ? softDb : -1, `w${i}`, "sfx_transitions"));
  clicks.forEach((c, i) => place(lib.click[0], c.t, 2, `c${i}`, "sfx_ui", { x: c.x }));
  pops.forEach((c, i) => place(lib.pop[0], c.t, -7, `p${i}`, "sfx_ui", { x: c.x }));
  // per-scene signature sounds: scene.sound = {q, at (s from shot start), gain (dB)} or a query string
  // scene.sound may be one sound or a list: [{q, at, gain}, ...]
  for (const [i, s] of sb.scenes.entries()) {
    if (!s.sound) continue;
    const list = (Array.isArray(s.sound) ? s.sound : [s.sound]).map((x) => (typeof x === "string" ? { q: x } : x));
    for (const [j, snd] of list.entries()) {
      if (!snd.q) continue;
      const [f] = await ov(snd.q, "foley");
      if (f) place(f.file, s.start + (+snd.at || 0.15), +snd.gain || -6, `f${i}_${j}`, "sfx_foley", { pitch: 1 });
    }
  }
  if (reveal && sb.accents !== false) {
    place(lib.riser[0], revealT + 0.1, -9, "riser", "sfx_accents");
    place(lib.hit[0], revealT + 0.2, -10, "impact", "sfx_accents");
  }

  if (stingers) {
    // accents: tone flips into a light shot after a dark one and every scene with a "proof" read
    // are where the film turns; the sting lands with the logo, in the music's key
    let key = { key: brief.key || "D", mode: brief.keyScale || "major" };
    if (musicIn && !brief.key) {
      try {
        key = estimateKey(musicIn);
        log(`music key: ${key.key} ${key.mode} (confidence ${key.confidence})`);
      } catch {}
    }
    const accents = sb.scenes.filter((s, i) => i && s.tone !== sb.scenes[i - 1].tone && /light|paper|cream/.test(s.tone || "") && s !== reveal).map((s) => s.start).filter((t, i, a) => !i || t - a[i - 1] >= 2.5).slice(0, 6);
    const st = composeCode({ mode: "stingers", duration: D, bpm: 120, cuts: sb.scenes.map((s) => s.start), accents, logo: reveal ? revealT + 0.2 : null, key: key.key, scale: key.mode }, path.join(aDir, "stingers.wav"));
    if (st) {
      const k = add(st);
      filters.push(`[${k}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:${D.toFixed(3)},volume=-6dB[sting]`);
      byLayer.stingers.push("[sting]");
    }
  }

  const used = LAYERS.filter((l) => byLayer[l].length);
  const outs = used.map((l) => {
    const ls = byLayer[l];
    const sum = ls.length > 1 ? `${ls.join("")}amix=inputs=${ls.length}:normalize=0:dropout_transition=0,` : `${ls[0]}anull,`;
    return `${sum}apad=whole_dur=${D.toFixed(3)},atrim=0:${D.toFixed(3)}[L_${l}]`;
  });
  const graph = [...filters, ...outs].join(";");
  fs.writeFileSync(path.join(aDir, "stems.graph.txt"), graph);
  run("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", graph, ...used.flatMap((l) => ["-map", `[L_${l}]`, "-ar", "48000", "-ac", "2", "-c:a", "pcm_f32le", path.join(stemDir, `${l}.wav`)])]);
  writeJSON(path.join(stemDir, "stems.json"), { duration: D, layers: used, counts: Object.fromEntries(used.map((l) => [l, byLayer[l].length])), sfxSource });

  // credits for every Openverse sound in the film (CC-BY ones must be credited where it is published)
  const uniq = [...new Map(credits.map((c) => [c.id, c])).values()];
  if (uniq.length) {
    const { creditLine } = await import("../lib/openverse.mjs");
    fs.writeFileSync(path.join(aDir, "CREDITS.md"), `# Sound credits (Openverse)\n\n${uniq.map(creditLine).join("\n")}\n`);
    const by = uniq.filter((c) => c.license === "by").length;
    if (by) warn(`${by} CC-BY sound(s): put audio/CREDITS.md into the video description or end credits`);
  }
  const out = remix(projectDir);
  log(`audio: stems ${used.map((l) => `${l}(${byLayer[l].length})`).join(" ")} -> audio/stems/, mix -> ${probeDuration(out).toFixed(1)}s`);
  return out;
}

// remix: rebuild audio/mix.wav from the stems with per-layer gains (dB, or "off"), without
// regenerating anything. Gains persist in audio/mix.json; "sfx" sets every sfx_* layer at once.
// Music is ducked under the VO stem here (sidechain), so the music stem itself stays clean.
export function remix(projectDir, gains = {}) {
  const aDir = path.join(projectDir, "audio");
  const stemDir = path.join(aDir, "stems");
  const meta = readJSON(path.join(stemDir, "stems.json"), null);
  if (!meta) throw new Error("no audio/stems/stems.json; run the audio step first");
  const saved = readJSON(path.join(aDir, "mix.json"), { gains: {} }).gains || {};
  const g = { ...saved };
  for (const [k, v] of Object.entries(gains)) {
    const name = k.replace(/-/g, "_");
    if (name === "sfx") meta.layers.filter((l) => l.startsWith("sfx_")).forEach((l) => (g[l] = v));
    else if (LAYERS.includes(name)) g[name] = v;
  }
  const on = meta.layers.filter((l) => g[l] !== "off" && !(+g[l] <= -60));
  if (!on.length) throw new Error("every layer is off");
  const inputs = on.flatMap((l) => ["-i", path.join(stemDir, `${l}.wav`)]);
  const f = on.map((l, i) => `[${i}:a]volume=${(+g[l] || 0).toFixed(2)}dB[s_${l}]`);
  const labels = on.map((l) => `[s_${l}]`);
  if (on.includes("vo") && on.includes("music")) {
    f.push(`[s_vo]asplit=2[vo_o][vokey]`, `[s_music][vokey]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=450:makeup=1[music_o]`);
    labels[on.indexOf("vo")] = "[vo_o]";
    labels[on.indexOf("music")] = "[music_o]";
  }
  const graph = `${f.join(";")};${labels.join("")}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,atrim=0:${(+meta.duration).toFixed(2)}[out]`;
  const pre = path.join(aDir, "mix.pre.wav");
  const out = path.join(aDir, "mix.wav");
  run("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", graph, "-map", "[out]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_f32le", pre]);
  master(pre, out);
  fs.rmSync(pre, { force: true });
  writeJSON(path.join(aDir, "mix.json"), { gains: g, layers: on });
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

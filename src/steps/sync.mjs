// sync: put the cuts on the music. The audio step writes the music's beat grid (audio/beats.json,
// in film time after the drop alignment); every cut within `tol` of a beat moves onto it, on the
// frame grid. Picture moves to the music, never the music to the picture (mg-styles-15 sync.py).
// VO-led cuts move by at most ~120 ms, which nobody hears as a late cut but everybody feels as
// "on the beat". Cue-driven SFX follow when the audio step runs again.
import fs from "node:fs";
import path from "node:path";
import { log, warn, readJSON, writeJSON } from "../lib/util.mjs";

export function snapCuts(sb, beats, { tol = 0.12, minShot = 0.5, fps = sb.fps || 30 } = {}) {
  const frame = (t) => Math.round(t * fps) / fps;
  const starts = sb.scenes.map((s) => s.start);
  const moves = [];
  for (let i = 1; i < starts.length; i++) {
    const t = starts[i];
    let best = null;
    for (const b of beats) if (Math.abs(b - t) <= tol && (best == null || Math.abs(b - t) < Math.abs(best - t))) best = b;
    if (best == null) continue;
    const nt = frame(best);
    const prevEnd = i + 1 < starts.length ? starts[i + 1] : sb.duration;
    if (nt - starts[i - 1] < minShot || prevEnd - nt < minShot || Math.abs(nt - t) < 0.5 / fps) continue;
    moves.push({ scene: sb.scenes[i].id || i, from: +t.toFixed(3), to: +nt.toFixed(3) });
    starts[i] = nt;
  }
  sb.scenes.forEach((s, i) => {
    s.start = +starts[i].toFixed(4);
    s.duration = +((i + 1 < starts.length ? starts[i + 1] : sb.duration) - starts[i]).toFixed(4);
  });
  return moves;
}

export async function sync(projectDir, { tol = 0.12, reaudio = true } = {}) {
  const sbFile = path.join(projectDir, "storyboard.json");
  const beatsFile = path.join(projectDir, "audio", "beats.json");
  if (!fs.existsSync(beatsFile)) {
    warn("no audio/beats.json yet: run the audio step first (it analyses the music)");
    return { moves: [] };
  }
  const sb = readJSON(sbFile);
  if (sb.flat) {
    // metronome (Relate) films are cut on their own grid already
    log("sync: storyboard keeps its own cut grid, nothing moved");
    return { moves: [] };
  }
  const { beats = [], bpm } = readJSON(beatsFile);
  const moves = snapCuts(sb, beats, { tol });
  writeJSON(path.join(projectDir, "audio", "sync.json"), { bpm, tol, moves });
  if (!moves.length) {
    log(`sync: ${bpm} BPM, every cut already on a beat or too far from one`);
    return { moves };
  }
  writeJSON(sbFile, sb);
  log(`sync: moved ${moves.length} cut(s) onto the ${bpm} BPM grid (max ${Math.max(...moves.map((m) => Math.abs(m.to - m.from))).toFixed(3)} s)`);
  if (reaudio) {
    // cues (whooshes on transitions, accents on cuts) are placed from the storyboard: re-mix
    const { audio } = await import("./audio.mjs");
    await audio(projectDir, {});
  }
  return { moves };
}

"""Cue-locked stingers and a fallback music bed, composed in code with audio-as-code (MIT).

Run by src/steps/audio.mjs out of process, pinned:
  uv run --no-project --with audio-as-code==0.5.0 python tools/stingers.py job.json

job.json: {"mode": "stingers" | "bed", "duration": s, "bpm": 120, "cuts": [s...],
           "accents": [s...], "logo": s | null, "key": "D", "scale": "major" | "minor", "out": "x.wav"}

Every event is placed in seconds and converted to beats, so hits land on the exact frame the
picture cuts, whatever the tempo. Instruments are synthesized from code: no samples, no keys.
Code synthesis is good at tuned, musical hits (a sting in the film's key) and weak at textures:
ticks, rolls and risers came out cheap in listening tests, so those stay with sampled sounds
(local library or Openverse) and this layer only carries accent thumps and the logo sting.
"""
import json
import sys

from audio_as_code import Delay, Note, Reverb, Song, Track, render

job = json.load(open(sys.argv[1]))
BPM = float(job.get("bpm") or 120)
D = float(job["duration"])
b = lambda t: max(0.0, round(float(t) * BPM / 60.0, 4))  # seconds -> beats
SPB = 60.0 / BPM

ROOTS = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
k = str(job.get("key") or "D")
root = (ROOTS.get(k[0].upper(), 2) + (1 if "#" in k else -1 if len(k) > 1 and k[1] == "b" else 0)) % 12
MINOR = job.get("scale") == "minor"
P = lambda octave, semis: 12 * (octave + 1) + root + semis  # midi pitch in the film's key

logo = job.get("logo")
cuts = [c for c in job.get("cuts", []) if 0.05 < c < D - 0.05 and (logo is None or abs(c - logo) > 0.2)]
accents = [a for a in job.get("accents", []) if 0 <= a < D and (logo is None or abs(a - logo) > 0.3)]
tracks = []


def track(name, instrument, notes, gain, **kw):
    notes = [n for n in notes if n.start < b(D) + 8]
    if notes:
        tracks.append(Track(name=name, instrument=instrument, notes=tuple(notes), gain=gain, **kw))


if job.get("mode", "stingers") == "stingers":
    # kick_909 carries the transient small speakers need, the sub carries the weight
    track("accent kick", "kick_909", [Note(pitch=36, start=b(a), duration=0.4, velocity=0.6) for a in accents], 0.32)
    track("accent sub", "sub_bass", [Note(pitch=P(1, 0), start=b(a), duration=0.6, velocity=0.6) for a in accents], 0.3, release_seconds=0.3)
    if logo is not None:
        hit = b(logo)
        track("logo kick", "kick_909", [Note(pitch=36, start=hit, duration=1, velocity=0.95)], 0.6)
        track("logo sub", "sub_bass", [Note(pitch=P(1, 0), start=hit, duration=3, velocity=0.9)], 0.5, release_seconds=1.2)
        chord = [P(3, 0), P(3, 7), P(4, 2), P(4, 3 if MINOR else 4)]  # add9 voicing, open and expensive
        track("logo bell", "fm_bell", [Note(pitch=p, start=hit, duration=3, velocity=0.6) for p in chord], 0.32, release_seconds=2.5,
              effects=(Delay(time_seconds=round(SPB * 0.75, 4), feedback=0.35, repeats=4, mix=0.18), Reverb(decay_seconds=2.4, mix=0.3)))
        track("logo pad", "wavetable_pad", [Note(pitch=p, start=hit, duration=4, velocity=0.5) for p in chord[:3]], 0.25, release_seconds=2.0,
              effects=(Reverb(decay_seconds=2.0, mix=0.35),))
else:
    # fallback bed: I vi IV V in the key, 2 bars each, light drums; drums drop a bar before the
    # logo so the sting lands in space
    prog = [(0, 3, 7), (-4, 0, 3), (5, 8, 12), (7, 10, 14)] if MINOR else [(0, 4, 7), (-3, 0, 4), (5, 9, 12), (7, 11, 14)]
    bars = int(b(D) // 4) + 1
    stop = b(logo) - 4 if logo is not None else b(D)
    pad, bass, kick, hat = [], [], [], []
    for bar in range(bars):
        c = prog[(bar // 2) % 4]
        s = bar * 4.0
        for p in c:
            pad.append(Note(pitch=P(3, p), start=s, duration=4, velocity=0.45))
        for q in range(4):
            bass.append(Note(pitch=P(1, c[0]), start=s + q, duration=0.45, velocity=0.6))
            if s + q < stop and bar > 0:
                kick.append(Note(pitch=36, start=s + q, duration=0.3, velocity=0.6))
            if s + q + 0.5 < stop and bar > 1:
                hat.append(Note(pitch=42, start=s + q + 0.5, duration=0.2, velocity=0.3))
    track("bed pad", "wavetable_pad", pad, 0.3, release_seconds=1.0)
    track("bed bass", "fm_bass", bass, 0.35)
    track("bed kick", "kick_909", kick, 0.45)
    track("bed hat", "metal_hat", hat, 0.18)
    if logo is not None:
        track("bed sting", "fm_bell", [Note(pitch=P(4, p), start=b(logo), duration=3, velocity=0.6) for p in (0, 3 if MINOR else 4, 7, 14)], 0.3, release_seconds=2.5)

if not tracks:
    print(json.dumps({"ok": False, "reason": "no events"}))
    sys.exit(0)
end = max(n.start + n.duration for t in tracks for n in t.notes)
song = Song(title=f"eden-motion {job.get('mode', 'stingers')}", bpm=BPM, beats=round(max(b(D) + 2, end + 0.5), 4), sample_rate=48000, seed=7, tracks=tuple(tracks))
report = render(song, job["out"], stems_dir=job.get("stems"), wav_format="pcm16")
print(json.dumps({"ok": True, "out": job["out"], "tracks": [t.name for t in tracks]}))

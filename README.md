# eden-motion

**Company name in, finished motion-graphics brand film out.** Burnwe / Lovable / Google launch-film
style: voiceover-driven story, hot-tail kinetic type, product UI with camera moves and cursor clicks,
glass orbs, orbit diagrams, counters, AI imagery, music and SFX on exact frames, and true shutter
motion blur. Built to be driven by coding agents (Claude Code, Codex, Gemini CLI, Cursor) or run
unattended.

```bash
./install.sh                                   # skills for Claude Code + Codex + ~/.agents, global CLI
eden-motion new "Attio" --url https://attio.com --duration 60
# ~25-40 min later: projects/attio/renders/final.mp4 + review/index.html + qc.json
```

## How it works

```
brief.json ─ research ─► brand.json + logo/fonts/screenshots      (Gemini + Google Search, HyperFrames capture, Gemini vision)
           ─ script ───► script.json  (measured formula: ~150 words/60 s, beats, one clause per shot)
           ─ vo ───────► vo.mp3 + word timings                    (ElevenLabs, one take, char alignment)
           ─ storyboard► storyboard.json (scene per line, props, tones, transitions; timing from VO)
           ─ assets ───► images for "gen:" props                   (Nano Banana Pro 2K)
           ─ audio ────► mix.wav (music + SFX on engine cues + ducked VO, -14 LUFS)
           ─ render ───► final.mp4 (HyperFrames; time-stretched capture + tmix = 180 deg shutter blur)
           ─ qc ───────► qc.json (Gemini creative-director review, timestamped fixes)
           ─ review ───► review/index.html (frames per shot, VO, props, prompts, QC) [--deliver <drive>]
```

The creative intelligence lives in three places:
1. **The scene library** (`runtime/scenes/`): 16 premium, parameterised scene types implementing the
   techniques measured from the reference films (see `research/analysis/`). Copy comes from props.
2. **The motion primitives** (`runtime/fx.js`): focus-pull arrivals, hot-tail typewriter, VO word
   alignment, cursor choreography, counters, perpetual camera drift, transitions, exposure ramps.
3. **The director loop** (`skills/eden-motion/SKILL.md`): the agent reads the JSON, fixes script and
   storyboard, renders a draft, looks at frames, runs QC, fixes, renders final.

## True motion blur
HyperFrames seeks a paused timeline frame by frame, so real motion blur is impossible in-browser.
eden-motion builds the composition with `EM_SLOW = S` (every real second lasts S seconds), captures at
60 fps, and ffmpeg averages S consecutive sub-frames per output frame (`tmix`, 180 deg shutter). Every
moving pixel gets physically correct blur; default S=4, hero renders `--slow 8`.

## Requirements
Node 20+, ffmpeg, Chrome (or the puppeteer headless shell), `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`.

## Research
`research/analysis/burnwe.md` (4 Burnwe explainers, 36 techniques), `launch-films.md` (Gemini Omni,
Gemini era, Lovable 2.0, 34 techniques), `tooling-and-workflows.md` (HyperFrames vs Remotion, motion
blur approaches, astra-remotion, X posts, Vimeo refs).

# eden-motion - agent instructions (Claude Code, Codex, Gemini CLI, Cursor, opencode)

This repo turns a company name into a finished motion-graphics brand film. The operating manual for
agents is `skills/eden-motion/SKILL.md`; read it first. Short version:

```bash
node bin/eden-motion.mjs doctor --json      # not ready? onboard the person first (SKILL.md section 0)
node bin/eden-motion.mjs new "<Company>" --url https://site --duration 60     # autopilot draft
node bin/eden-motion.mjs treatment <slug> && node bin/eden-motion.mjs treatment <slug> --pick 1
node bin/eden-motion.mjs render <slug> --draft && node bin/eden-motion.mjs qc <slug>
```
Then run the director loop: read script.json and storyboard.json, fix, re-render, look at frames, QC.

## Layout
| path | what |
|---|---|
| `bin/eden-motion.mjs` | CLI, one subcommand per pipeline step (`treatment`, `clone-ui`, `storyboard`, `compare`, `review`, etc.) |
| `src/steps/*.mjs` | research, script, vo, treatment, clone-ui, ref, storyboard, stills, note, assets, blender, audio, sync, build, render, measure, compare, qc, critique, review, study, setup |
| `src/lib/` | gemini (text/vision/image), eleven (TTS/music/SFX), browser (puppeteer), catalog (50 scenes + 7 backgrounds + 16 transitions for the LLM) |
| `src/lib/reanimate/` | Reanimate-derived deterministic verification & live-UI capture engine: `easing.mjs` (curve fitting), `compare.mjs` (pixelmatch + activity curve + diff sheet), `capture.mjs`, `clock.js`, `gl-hooks.js`, `gl.mjs` |
| `runtime/` | the in-browser engine: `engine.js`, `fx.js` (motion primitives), `webgl.js` (`EM.shader`, `EM.three`, `EM.drive`), `transitions.js`, `backgrounds.js` (incl. `shader-silk`, `shader-mesh`, `shader-grid`, `shader-dither`), `base.css`, `scenes/*.js|css` |
| `runtime/SCENE_API.md` | contract for writing scenes |
| `blender/` | headless Blender 5.2 templates (`layers_3d.py` with 9 layouts incl. `carousel`, `wall`, `fisheye-wall`, `exploded` + `loop=1`; `chrome_object.py`; `card_stack.py`) and libs (`chrome.py`, `product.py`, `mglib.py`) |
| `skills/eden-motion/` | the Agent Skill (symlinked into ~/.claude/skills, ~/.codex/skills, ~/.agents/skills by `install.sh`), incl. `references/hybrid-tech-matrix.md` and `references/scene-catalog.md` |
| `styles/<style>/` | measured style profiles (`profile.json`, `profile.md`) and 11-section style bibles (`style.md`) for `burnwe`, `launch`, `relate`, `higgsfield`, `ovyon` |
| `research/analysis/` | forensic breakdowns of 80+ reference films (`universal-craft-invariants.md`, `higgsfield-mcp-closeup.md`, plus per-style deep dives) |
| `sfx-library/` | Pixabay-licensed SFX used by the audio step |
| `tools/` | out-of-process helpers: `stingers.py` (audio-as-code), `synccheck.mjs`, `lensfx.py` (lens finish keyed to fast moves), `retime.py` (slowed capture to 60 fps, optical-flow gap fill), `cadence.py` (measure and repair the frame cadence of an AI clip, interpolate to 240 fps), `ramp.py` (speed-ramp plates from a 240 fps master), `upscale.py` (Topaz Proteus 4K plates with a ghost check), `assemble.sh` (clips joined at exact frame counts), `gpu_lock.sh` (one GPU job at a time), `world_layers.py` (brand image -> far/mid/near depth layers for the parallax-world background), `scenetext/` (text standing in a live-action scene: track, solve, smooth, composite), `token_usage.py` (where the Claude Code tokens went) |

## Rules when editing code
- Scenes must stay deterministic: no Math.random (use `ctx.rng`), no Date, no timers, no `requestAnimationFrame`, no CSS animations, no `repeat: -1`. Drive WebGL2/Three.js shaders exclusively via `EM.shader().bind(...)` or `EM.drive(tl, ...)` GSAP setter proxies.
- `EM.boot()` is synchronous; never await in scene builds.
- Register new scenes in `src/lib/catalog.mjs` so the storyboard model can use them, and document props in the file header and `skills/eden-motion/references/scene-catalog.md`.
- Hybrid routing discipline (`skills/eden-motion/references/hybrid-tech-matrix.md`): flat 2D HTML/GSAP for UI close-ups & type (`macro-ui`, `terminal`, `answer-stream`, `micro-ticker`, `ui-window` default flat), WebGL2/Three.js for procedural GPU worlds (`shader-*`, `webgl-globe`, `shader-card`), Blender `clip-3d` for optical DOF & photoreal 3D (`layers-3d`, `chrome-object`, `card-stack`). Never force 38 deg CSS 3D tilt on product screenshots or use `#000000`/`#ffffff` border-box slop (floor `>= #0f0f0f`, ceiling `<= #fafafa`).
- Test a scene: add it to a storyboard in `projects/_test*`, `node bin/eden-motion.mjs build <proj>`, then `npx -y hyperframes@0.9.15 snapshot --at <t,...>` inside `comp/` and look at the PNGs. Run `node bin/eden-motion.mjs measure <proj> --no-ink` to verify reading times, framing, tails, and easing curves.
- ffmpeg video encodes use a house profile: `videoArgs(profile)` (`src/lib/encode.mjs`) or `video_args(profile)` (`tools/hwenc.py`). `social` = HEVC 10-bit 40M (drafts, previews, socials, 9:16), `deliver` = HEVC 10-bit 160M (final film, masters), `compat` = H.264 40M (only where H.264 is required). VideoToolbox on a Mac, libx264 at the same bitrate elsewhere, `VIDEO_HW_ENCODE=0` forces software. Never a hard-coded `-c:v` or a ~5 Mbps file someone watches.
- No em dashes or en dashes in any text or comment.

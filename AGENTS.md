# eden-motion - agent instructions (Claude Code, Codex, Gemini CLI, Cursor, opencode)

This repo turns a company name into a finished motion-graphics brand film. The operating manual for
agents is `skills/eden-motion/SKILL.md`; read it first. Short version:

```bash
node bin/eden-motion.mjs doctor
node bin/eden-motion.mjs new "<Company>" --url https://site --duration 60     # autopilot draft
node bin/eden-motion.mjs render <slug> --draft && node bin/eden-motion.mjs qc <slug>
```
Then run the director loop: read script.json and storyboard.json, fix, re-render, look at frames, QC.

## Layout
| path | what |
|---|---|
| `bin/eden-motion.mjs` | CLI, one subcommand per pipeline step |
| `src/steps/*.mjs` | research, script, vo, storyboard, assets, audio, build, render, qc |
| `src/lib/` | gemini (text/vision/image), eleven (TTS/music/SFX), browser (puppeteer), catalog (scene docs for the LLM) |
| `runtime/` | the in-browser engine: `engine.js`, `fx.js` (motion primitives), `transitions.js`, `backgrounds.js`, `base.css`, `scenes/*.js|css` |
| `runtime/SCENE_API.md` | contract for writing scenes |
| `skills/eden-motion/` | the Agent Skill (symlinked into ~/.claude/skills, ~/.codex/skills, ~/.agents/skills by `install.sh`) |
| `research/analysis/` | forensic breakdowns of the reference films (70 techniques with parameters) |
| `sfx-library/` | Pixabay-licensed SFX used by the audio step |

## Rules when editing code
- Scenes must stay deterministic: no Math.random (use `ctx.rng`), no Date, no timers, no CSS animations, no `repeat: -1`.
- `EM.boot()` is synchronous; never await in scene builds.
- Register new scenes in `src/lib/catalog.mjs` so the storyboard model can use them, and document props in the file header.
- Test a scene: add it to a storyboard in `projects/_test*`, `node bin/eden-motion.mjs build <proj>`, then `npx -y hyperframes@0.8.72 snapshot --at <t,...>` inside `comp/` and look at the PNGs.
- No em dashes or en dashes in any text or comment.

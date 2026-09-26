---
name: eden-motion
description: Company name in, finished motion-graphics brand film out (Burnwe / Lovable / Google launch-film quality). Researches the brand from its website, writes the script, records an ElevenLabs voiceover with word timings, storyboards 15-20 shots from a library of premium scenes (hot-tail kinetic type, product UI with camera and cursor, prompt box, orbit, stat counters, card chaos, flow lines, glass media frames, logo resolve), generates images with Nano Banana Pro and AI clips via Higgsfield (Seedance 2.0 / Kling 3 / Veo 3.1), offers burnwe / launch / higgsfield visual styles, mixes music + SFX on exact frames, renders with HyperFrames and true shutter motion blur, then self-reviews with Gemini and iterates. Use for "make a motion graphics video for <company>", "explainer video", "SaaS promo", "launch video", "brand film from a website", "motion design like Burnwe/Lovable/Google", "udělej motion graphic video", "explainer pro firmu".
---

# eden-motion

Repo: `~/Dev/eden-motion` (path also in `.repo-path` next to this file). CLI: `eden-motion` (global) or `node <repo>/bin/eden-motion.mjs`. Engine = HyperFrames (HTML + GSAP, seek-deterministic).
Everything is plain JSON in a project folder, so any harness can run steps, read results and edit them.

## 0. Setup check (10 s)
```bash
cd ~/Dev/eden-motion && node bin/eden-motion.mjs doctor
```
Needs `GEMINI_API_KEY`, `ELEVENLABS_API_KEY` (env, repo `.env` or `~/.zshrc`), ffmpeg, node 20+, npx.

## 1. One command (autopilot, ~25-40 min)
```bash
node bin/eden-motion.mjs new "<Company>" [--url https://site] [--duration 60] [--lang en] \
  [--theme saas-light|saas-dark|glow|cinematic] [--voice brian|george|sarah|alice|matilda|daniel] \
  [--structure problem-solution|launch|manifesto] [--notes "client notes"] [--dir <projects root>]
```
Runs: research -> script -> vo -> storyboard -> assets -> audio -> render (final, motion blur) -> qc.
Project lands in `projects/<slug>/` (or `--dir`). Output: `renders/final.mp4`, `renders/qc.json`, `renders/contact-sheet.jpg`.

**Autopilot is the first draft, not the deliverable.** Always run the director loop (section 3).

## 2. Step by step (when you want control)
```bash
node bin/eden-motion.mjs new "<Company>" --no-run      # creates brief.json only
node bin/eden-motion.mjs research <slug>               # brand.json, assets/logo.svg, fonts, ui-*.jpg
node bin/eden-motion.mjs script <slug>                 # script.json  <- READ AND IMPROVE IT
node bin/eden-motion.mjs vo <slug>                     # audio/vo.mp3, vo.json (word timings)
node bin/eden-motion.mjs storyboard <slug>             # storyboard.json  <- READ AND IMPROVE IT
node bin/eden-motion.mjs assets <slug>                 # resolves "gen:<prompt>" images (Nano Banana Pro 2K)
node bin/eden-motion.mjs audio <slug>                  # music + SFX on engine cues + VO -> audio/mix.wav
node bin/eden-motion.mjs render <slug> --draft         # ~1-2 min, no motion blur, for review
node bin/eden-motion.mjs render <slug>                 # final: adaptive true shutter motion blur (~7 min / 60 s)
node bin/eden-motion.mjs qc <slug>                     # Gemini creative-director review
node bin/eden-motion.mjs preview <slug>                # HyperFrames Studio (scrub, edit timeline)
```
Re-run any step after editing its input JSON. `run <slug> --from storyboard --to render` chains a range.
If you change script text, re-run `vo` (timings change) then `storyboard`.

## 2b. Context first (what separates pro from "mid" one-prompt videos)
Everyone has the same model; the context decides the look.
```bash
eden-motion ref <slug> https://whatships.com/...  ./their-favourite.mp4   # 1-2 reference films to MATCH
eden-motion storyboard <slug> --variants 3     # product-led / type-led / metaphor-led
eden-motion stills <slug> --variants           # one settled frame per scene per variant + art-director review
eden-motion pick <slug> 2                      # choose a direction instead of fixing the first idea
eden-motion note <slug> "slow every zoom to 0.7x; hard cut into s5; push in on the button in s9"
```
- Name a reference instead of describing a style. Without one the model falls back to its default look
  (centred text, gradient background, everything fading in).
- Real brand context: `research` pulls logo, fonts, colours and vetted product screenshots; add client
  notes with `--notes`. Real UI components beat invented ones (21st.dev MCP when authorised, or the
  captured screenshots).
- Stills before motion: fixing a storyboard on stills takes seconds, fixing a render takes minutes.
- Notes like a director, in camera words. `note` maps them to exact fields (`cameraSpeed`,
  `transitionSpeed`, per-scene `camera`, `transition`, props) and asks back instead of guessing on vague notes.

## 3. Director loop (this is where quality comes from)
1. **Script pass.** Read `script.json`. Kill buzzwords, make every line concrete and speakable, one clause per line, 7-11 words mostly, product named by 38% of runtime, exactly one real number, last lines = tagline then "Brand. CTA.". Check `brand.json` facts; never invent numbers.
2. **Storyboard pass.** Read `storyboard.json` against `references/style-dna.md` and `references/scene-catalog.md`:
   variety (no type twice in a row), dark/light worlds alternating every 5-13 s, one hero token, real
   screenshots where they exist, on-screen text shorter than VO, keywords that exist in the text.
3. **Draft render + look.** `render --draft`, then extract frames and LOOK at them (Read tool on images):
   ```bash
   ffmpeg -v error -i renders/draft.mp4 -vf "fps=2,scale=640:-1,tile=6x6" -frames:v 1 renders/sheet.jpg
   ```
   Check every scene: layout, overflow, text size, collisions, empty frames, logo colour on dark.
4. **QC.** `qc <slug>` -> fix every HIGH issue in `renders/qc.json`, most MEDIUM ones. The reviewer is
   deliberately harsh (a first autopilot pass scores ~50-60). Typical real fixes seen so far:
   - stock-looking people imagery (stressed worker, office team) -> abstract premium 3D render of the idea, or the brand's real screenshots;
   - shouting words in card-cloud ("OUTDATED") -> "?" plus a calm sub line;
   - typed headline that starts on a late word -> type the whole VO line (the hook must show text on the first spoken word);
   - light scene arriving via zoom-through reading as a small card -> fixed in the engine, but prefer `cut` into tone changes.
   After editing storyboard props: `assets` (only if new `gen:` images) -> `audio` (cues move with the picture) -> `render --draft`.
5. **Final.** `render <slug>` (motion blur), `qc` again, compare. Two loops minimum, never ship the first render.

Fix hierarchy: props in storyboard.json -> scene type swap -> timing (split a long line in script) -> new custom scene.

## 4. Custom scenes (when the library is not enough)
Write `projects/<slug>/custom-scenes/<name>.js` following `runtime/SCENE_API.md` (same contract as the
built-ins, auto-loaded by `build`). Use it in storyboard.json with `"type": "<name>"`. If it is reusable,
promote it into `runtime/scenes/` and add it to `src/lib/catalog.mjs`.

## 5. Styles and AI footage
- `--style burnwe` (default SaaS explainer), `--style launch` (Google/Lovable launch film), `--style higgsfield`
  (white grid canvas, magenta + lime accents, flash frames, punch-ins, pixel reveals, AI footage as proof in
  grid cells; see `research/analysis/higgsfield.md`). The style steers storyboard scene and transition choice.
- `--video` allows up to 2 AI clips: storyboard props `{kind:"video", src:"genvideo:<still prompt> || <motion prompt>"}`.
  The assets step makes the still with Nano Banana Pro, then image-to-video through the **Higgsfield CLI**
  (`higgsfield generate create seedance_2_0 --start-image ...`, default when `higgsfield account status` works;
  `brief.videoModel` can be kling3_0, veo3_1, seedance_2_5, minimax_h3 ...) or fal.ai as fallback. Cost is
  printed before each job (~22 credits per 5 s 720p Seedance, ~77 per 7 s 1080p). Prompts direct camera,
  beat, motion and light, use timecoded beats for multishot, and always say "no music".
- Harness agents with the Higgsfield MCP can also browse effect presets (Bullet time, Earth zoom, Lidar
  transition, World morphing, Overexposed, Break Typography, Slot Roll ...) and generate hero shots there,
  then drop the mp4 into `assets/` and reference it from storyboard.json.

## 6. House rules
- Stills: Nano Banana Pro (Gemini 3 Pro Image) at 2K, always end prompts with "no text, no letters, no logos". Flux is banned. Log every prompt (done automatically in `prompts.log.jsonl`).
- Video clips (optional, for `media-frame` kind video): Seedance 2.0 or Kling 3.0 via Higgsfield/fal/Magnific with the approved still as reference, render 3 s longer than the cut, "no music" in the prompt.
- No em dashes or en dashes in any copy (the pipeline strips them; check anything you write).
- Motion law: focus-pull arrivals, no overshoot, camera never still, one accent colour, sync to VO words.
- Deliver: copy `renders/final.mp4` + an HTML review sheet to the company Google Drive project folder (Eden Business). Never send to a client without Gedeon's approval.

## References
- `references/style-dna.md` - measured rules from the reference films (pacing, easing, type, sound).
- `references/scene-catalog.md` - every scene type, props, when to use.
- `references/pipeline.md` - file formats (brief, brand, script, vo, storyboard), rendering and motion blur internals, troubleshooting.
- Repo research: `~/Dev/eden-motion/research/analysis/{burnwe,launch-films,higgsfield,tooling-and-workflows}.md` (full forensic breakdowns, 90+ techniques with parameters, Higgsfield preset map).

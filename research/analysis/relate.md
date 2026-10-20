# Relate Studio - forensic analysis and 1:1 rebuild notes (2026-10-17)

Source: the 24 latest video posts on t.me/relate_studio (public preview at t.me/s/relate_studio) plus two older
pure promos (Ledger 196, Ecliptica 193). Per-video shot lists: `research/relate/*.md`. Four were rebuilt 1:1
(Frontier Traders, Ledger, Enoki website, Arcus 2x2 grid) in Blender headless + HyperFrames; results and
calibrated critique scores in section 4. eden-motion implements this as `--style relate`, the Relate scene
pack (runtime/scenes/relate.js), the `blender` step and `compare` / `critique --against`.

Source: forensic analysis of the 24 latest video posts on t.me/relate_studio (+ 2 older pure promos: Ledger 196, Ecliptica 193), see `research/relate/*.md`. Written to be applied by eden-motion / HyperFrames / Blender agents.

## 1. Edit grammar
- Metronome cutting. Hard cuts on a fixed grid: every 24 frames (Frontier, 24 fps), every 36 frames (Frontier 3D), or every 2 beats at 112-129 BPM (Flex, Propr, Ledger). Almost no dissolves.
- A whoosh/riser peaks into each cut (accent about 0.3 s before the picture cut).
- Polarity flip as rhythm: white frame, black frame, white frame.
- Fast label swaps inside a held shot: logos, currency pairs, city names change every 4-6 frames.
- 2x2 grids with zero gutter where each cell cuts on its own beat; built as seamless loops for X autoplay.
- Shape match transitions: the edge-on card stack becomes the edge-on device (Ledger).
- End card: logo build from the brand's own graphic vocabulary, wordmark slides in with horizontal motion blur, lockup steps down once, hold 3-4 s.

## 2. Typography
- Neo-grotesk, Medium or Light, tracking -2% to -5% (Neue Haas / Helvetica Now / Aeonik class). Free stand-ins: Inter Tight, Inter, Space Grotesk.
- Scale contrast: small centered captions (4-9% of frame height) against giant cropped numbers or words (25-40% of height, cropped by the frame edge).
- Pairings: sans + serif italic emphasis word (Flex), sans + mono micro copy (Quip, WenAltSeason, Ecliptica HUD).
- Text motion vocabulary:
  - per-word blur-in: blur 10-15 px to 0, about 0.4 s, 0.1-0.15 s stagger;
  - per-line hard pops (no fade) for editorial headlines;
  - counters with directional ghost echo: 4-6 copies offset to the right, opacity 0.6 to 0.14, horizontal-only blur 6-26 px (SVG feGaussianBlur stdDeviation="N 0");
  - typewriter / glyph scramble for data;
  - word carousel with neighbours faded 1.0 / 0.35 / 0.12;
  - wordmark whip-in with real horizontal motion blur, expo.out about 0.6 s.

## 3. Colour
- One palette per film, no extra hues. Monochrome (#FCFCFC / #ECECEC / #000), bank green + off-white (#081E14 / #F5F2EE / #3C8A60), clay + sage (#D8D1C9 / #3E4831), black + neon green (#040706 / #66D98E), saturated acrylic cards on pure white (Ledger).
- One brand accent used as a highlighter on neutrals.

## 4. 3D worlds
- Chrome / brushed aluminium on white or light grey, soft studio, no DOF, no grain. Needs a near emissive studio dome (gradient + vertical softbox strips) so flat faces get gradients and bevels catch highlights.
- Matte clay and sage, warm sun, long lens, shallow DOF (Arcus).
- Tinted acrylic cards + soft-touch black product on pure white, high-key, shallow DOF macros (Ledger).
- Frosted grunge glass letters with rim light and bloom on black (Frontier). In HyperFrames: blurred plate copy clipped by SVG text + feTurbulence frost + blurred stroke rim.
- UI is never a flat recording: it is mapped onto phones, metal cards, data cubes, curled paper, frosted pills.
- Industrial metaphors for finance: rods, screws, machined blocks, coins, candlesticks.
- Object choreography beats camera acrobatics: stacks, fans, implosions, rings collapsing.

## 5. Motion and easing
- UI moves: expo.out / power4.out, 0.2 s to peak speed, 1.0-1.6 s settle (peaks around 2,000 px/s).
- Marquees linear (Quip 219 px/s).
- 3D cameras: slow ease-in-out drifts and pushes, nothing is ever fully still (tickers, drift, gradient breathing).
- Real motion blur on everything fast (180 degree shutter).

## 6. Production model (what they actually do)
- Promos = in-house 3D (C4D/Redshift look) + graded licensed stock + AI video only for spectacle (jets, anime) or people/venues. Never AI for UI or product.
- AI stills at scale for icon systems (Nano Banana 2 with HEX-locked gradients).
- Branding/website posts are silent seamless loops; promos have a 112-129 BPM electronic bed with SFX on cuts.
- Delivery for X: 720p/1080p, 24 fps for 3D, 30/60 fps for UI.

## 7. How we rebuilt it (see videos/*/NOTES.md)
- Blender 5.2 headless (Cycles Metal for chrome, EEVEE for product CG at ~2 s/frame 1080p), rendered with transparent film and composited in HyperFrames.
- HyperFrames for every 2D layer: type, counters, dash flow fields (canvas + proxy tween), UI, glass letters, logo builds; reference audio under it for timing.
- Eden Gen (Nano Banana Pro still + Kling 3 i2v) only for the three B&W live-action inserts.


## 4. Rebuild results (calibrated with `critique --against`)
| film | SSIM | critique original | critique rebuild | what carried it |
|---|---|---|---|---|
| Frontier Traders 24 s | 0.695 | 5/6/4/7/6/6/6 | 7/7/6/7/7/7/7 | Cycles chrome in a near studio dome, ghost counters, glass letters, dash fields, forward-shutter motion blur |
| Ledger 20 s | 0.765 | 7/5/5/6/7/9/8 | 5/4/3/4/6/6/5 | EEVEE product CG, edge-on stack to device match cut; gap = materials and camera weight |
| Enoki website 26.6 s | 0.889 | 8/4/5/4/7/8/5 | 7/5/6/4/8/8/7 | real HTML/CSS UI, measured camera moves, speed-scaled blur |
| Arcus 2x2 grid 10.5 s | 0.494 | 4/3/5/8/8/8/5 | 6/1/7/7/4/8/6 | clay Cycles cells on measured per-cell cut frames; interiors are the gap |
Rubric order: hook, phone readability, motion, variety, composition, brand, sound sync. The judge varies about 1 point run to run.

## 5. Summary tables from the analysis

### Posts 01-12

| # | Title | Dur | Res / fps | Audio | Dominant technique | 1:1 feasibility without AI video |
|---|---|---|---|---|---|---|
| 01 | Promo Video for Propr (MMT x Propr) | 30.3 s | 1280x720 / 30 | Yes, ~112 BPM | AI jet footage + HUD type + 3D glass candles + terminal UI | 3 |
| 02 | Promo Video for Flex | 42.0 s | 1280x720 / 30 | Yes, ~112 BPM | Stock footage + editorial type, 3D metal cards, UI vignettes | 6 |
| 03 | Frontier Traders 2x2 loop | 12.0 s (6 s x2) | 1920x1080 / 24 | Yes | 2x2 grid of 04 assets: type, chrome 3D, glass letters, UI | 8 |
| 04 | Frontier Traders motion design | 24.0 s | 1920x1080 / 24 | Yes | 1 s hard-cut montage: Helvetica type, chrome 3D, flow field, B&W stock | 8 |
| 05 | Frontier Traders custom 3D | 9.0 s | 1080x1080 / 24 | Yes | Pure chrome 3D vignettes, 1.5 s each | 10 |
| 06 | Promo Video for Jupiter (Gacha) | 46.0 s | 1920x1080 / 30 | Yes, loud | AI anime + 3D packs + phone UI, Pokemon IP | 2 |
| 07 | Promo Video for Arcus (prev. dYdX) | 10.5 s | 1920x1080 / 24 | Yes, ~117 BPM | 2x2 grid of soft clay/sage 3D scenes | 8 |
| 08 | Custom Tool for Quip | 28.8 s | 1280x800 / 30 | No | Screen recording of generative pattern tool | 9 |
| 09 | Quip branding case study | 35.0 s | 1920x1080 / 60 | Yes (voice) | Talking head PiP + slide carousel | 4 |
| 10 | Product design, crypto wallet | 14.9 s | 1280x960 / 30 | No | Flat UI screens on ultramarine, carousel | 9 |
| 11 | Website for Enoki | 26.6 s | 1280x800 / 30 | No | Website as camera-space motion piece | 8 |
| 12 | AI icons for Jupiter (X article) | 12.0 s | 848x848 / 60 | No | Screen recording of article scroll | 9 |


### Posts 13-24 and extras

| # | post | title | dur (s) | res / fps | audio | dominant technique | 1:1 feasibility without AI (1-10) |
|---|---|---|---|---|---|---|---|
| 13 | 225 | Branding & Website for Neuron | 8.9 | 848x848 / 30 | no | Brand slideshow, 12 slides at 0.73 s (3D + UI + photo mockups) | 4 |
| 14 | 224 | Branding & Website for Shio | 22.9 | 1280x960 / 30 | no | Website UI motion in browser frame on brand blue | 9 |
| 15 | 223 | Banner Templates for Quip | 20.0 | 1280x800 / 60 | no | Linear marquee (219 px/s) of animated 2D banners | 8 |
| 16 | 222 | Promo Video for Arcus | 48.0 | 1280x720 / 60 | music ~118 BPM | Full 3D clay-world narrative (Blender-grade CG) | 7 |
| 17 | 218 | Branding for Shio (4 clips) | 4.2 + 2.0 + 11.3 + 10.4 | 1280x720 / 30 | no | Gradient shaders + UI theme cycling + card carousel | 9 |
| 18 | 214 | Branding & Website for Flipit (2 clips) | 2.8 + 18.4 | 1920x1080 / 60 | no | 3D coin arc inside website hero + responsive UI demo | 8 |
| 19 | 213 | AIVM by ChainGPT | 5.0 | 1920x1080 / 60 | no | Static bento of looping 2D tiles | 7 |
| 20 | 211 | Branding for WenAltSeason | 21.5 | 1280x720 / 60 | no | Figma-canvas kinetic 2D (selection boxes, cursor, typewriter) | 8 |
| 21 | 202 | Website for Neuron | 24.1 | 2394x1440 / 30 | silent track | Live 3D glass/steel hero + HTML cards sliding up (expo.out) | 8 |
| 22 | 201 | Promo Videos for Jupiter (reel) | 36.1 | 1280x720 / 60 | music ~112 BPM | Mixed: bento of clips, 3D phones/hands/gift, kinetic type with glows | 6 |
| 23 | 200 | 1000 tasks with ChainGPT | 4.9 | 1280x720 / 30 | no | AI video (robots + neon) with 2D overlay | 2 |
| 24 | 199 | Jupiter Onchain Media | 6.9 | 1280x720 / 30 | no | 1.0 s slideshow of AI/photo brand mockups | 3 |
| x | 196 | Promo Video for Ledger | 20.0 | 1920x1080 / 60 | music ~129 BPM | Pure 3D product on white, beat-cut, shape match transition | 9 |
| x | 193 | Promo Video for Ecliptica | 31.3 | 1920x1080 / 30 | music ~118 BPM | Dark sci-fi HUD (2D) + 3D crystal/cards; stylized character opening | 6 |



## 6. Tooling lessons (Blender 5.2 + HyperFrames), verbatim from the rebuild

Project root: `~/Dev/relate-mograph/`
- `ref/` reference videos, `ref/index.json` titles, `sheets/` contact sheets, `research/relate/*.md` forensic shot lists (READ the one for your video first).
- `videos/<slug>/` one HyperFrames project per recreation. Example finished-ish project: `videos/r04-frontier/` (index.html shows the patterns below).
- `blender/r04lib.py` reusable Blender helpers (render setup, Cycles Metal GPU, metal material, machined block, socket screw, rods, env_dome studio, keyframes, render loop). Copy/extend into your own lib file, do not edit r04lib.py (another render is using it).
- `scripts/compare.sh REF OURS OUTDIR` -> side_by_side.mp4 + pairs.jpg + SSIM. `scripts/seq2webm.sh DIR NAME OUT.webm` PNG sequence -> VP9 alpha webm (24 fps).
- `research/blender/PLAYBOOK.md` + `blender/mglib.py` (Blender tutorial distillation, may still be in progress).

## Blender (5.2.2, headless: `blender -b --factory-startup -P script.py -- --out DIR [--frames 1,15] [--preview]`)
- Engines: `CYCLES` (GPU Metal on M1 Pro, ~10-15 s/frame 1080p at 64-96 samples with OIDN denoise) or `BLENDER_EEVEE`. First Cycles frame of a session takes ~2 min (kernel compile), later runs are cached.
- BUG: Boolean modifier with EXACT solver adds an EMPTY material slot 0 -> object renders default grey. After applying booleans: `ob.data.materials.clear(); ob.data.materials.append(mat)` and set every polygon material_index = 0 (see `set_mat` in r04lib).
- Polished metal/chrome only looks right with something to reflect: an infinite world gradient makes flat faces uniform. Use a NEAR emissive dome (`env_dome` in r04lib: sphere, invisible to camera, vertical gradient + vertical softbox strips). The CAMERA MUST BE INSIDE the dome radius, otherwise everything washes out.
- A bright horizon band makes vertical faces white; for rods / vertical faces use darker horizon + strong strips (`r04_env(dark=True)`).
- Euler gotcha: Blender 'XYZ' = X applied first. To stand a plane up facing a -Y camera rotate X +90, then Y is screen roll, Z is yaw.
- Render with `film_transparent=True`, composite the solid background colour in HyperFrames (lets you match the ref bg hex exactly).
- Iterate on single frames with `--preview --frames 15` (50% res, quarter samples, ~10-20 s), compare side by side with the ref frame (ffmpeg hstack) and LOOK at it. Only then render all frames, in the background (`nohup ... &`), and keep working.
- GPU is shared with other renders on this Mac. Never run more than 2 Blender renders at once.

## HyperFrames (CLI 0.8.x, `npx hyperframes ...`)
- Read `/hyperframes-core` skill rules. Key gotchas hit so far:
  - `<video data-start>` must NOT sit inside another element that has `data-start` (lint error). Put videos at root level with GLOBAL data-start, `class="clip"`, `id` required, `muted playsinline`.
  - Every `<video>`/`<audio>` needs an `id`.
  - Do not tween `top/left` (lint error gsap_non_transform_motion) - use x/y.
  - Canvas or per-frame JS drawing: proxy tween `tl.to(p,{t:1,duration,ease:"none",onUpdate:()=>draw(p.t)},start)`; deterministic only (seeded rng, no Math.random/Date).
  - Fonts via `@font-face` to local files in `assets/fonts/` (Inter / Inter Tight are in `shared/fonts/`).
  - VP9 alpha webm plays with transparency in `<video>`.
  - Frosted glass letters: blurred copy of the plate clipped by an SVG `<clipPath><text>` (`clip-path:url(#id)` on an HTML div) + feTurbulence frost + blurred stroke rim.
  - Directional (horizontal) motion blur: SVG filter `feGaussianBlur stdDeviation="12 0"`.
- Compare loop: `npx hyperframes snapshot --at t1,t2,... --no-end --describe false --against <ref.mp4> -o snaps/vN` writes pair-*.jpg (render | reference). vstack a few pairs and LOOK. Iterate until layout, scale, timing and tone match.
- Render: `npx hyperframes render -o renders/final.mp4 --fps <ref fps>` (check `npx hyperframes render --help`). Then `scripts/compare.sh ref.mp4 renders/final.mp4 compare/`.
- For internal comparison you may put the reference's own audio track under the recreation (`ffmpeg -i ref.mp4 -vn -c:a aac assets/ref_audio.m4a` + `<audio id=...>`). Note in the report that it is the original track.

## AI generation (only where unavoidable, e.g. live-action people)
- Eden Gen MCP (`mcp__eden-gen__*`), project "Social Media". Stills `nbp` 2K (~$0.13), animate with `kling-3` first_frame 5 s 1080p (~$0.28). Never above $5 per call. Log every prompt + job id in `assets/gen/PROMPTS.md`. Download files keeping the job-id filename.

## Writing rule
Never use em dash or en dash characters in any file (plain hyphen). Check with `grep -c $'-\|-' file`.


# Relate grammar, 1:1 rebuilds, Blender headless

Measured on 26 Relate Studio films and proven in four 1:1 rebuilds (2026-10-17, `research/analysis/relate.md`).

## Part A. Relate film grammar (what `--style relate` encodes)
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


## Part B. The 1:1 rebuild loop
1. Download the reference (t.me public channels: `https://t.me/s/<channel>` lists posts with direct video URLs; X/YouTube via yt-dlp).
2. `eden-motion ref <slug> ref.mp4` for measured cuts, metronome grid and style notes.
3. Per-second strips (6 fps, 6x4 tiles) and full-res stills at every cut; measure positions, font sizes (cap height x 1.38 = font-size), sample hex.
4. Build the storyboard by hand on the measured frames. 2D layers as scenes, 3D as `blender:` plates, live action via Eden Gen (Nano Banana Pro still + Kling 3 i2v, about $0.40 per shot) only when unavoidable.
5. Iterate on single frames: Blender `--preview --frames N` next to the reference frame; HyperFrames `snapshot --at ... --against ref.mp4`. Fix composition first, then tone, then motion.
6. Final render with true shutter blur (forward phase for metronome edits), `compare`, `critique --against`.
Result benchmarks: Enoki web 0.889 SSIM (pure HTML), Ledger 0.765, Frontier 0.695, Arcus grid 0.494. Calibrated critique within about 1 point of the originals except Ledger/Arcus interiors.

## Part C. Tooling lessons

Workspace layout used for the original study (a separate rebuild workspace next to eden-motion):
- `ref/` reference videos, `ref/index.json` titles, `sheets/` contact sheets, `research/relate/*.md` forensic shot lists (READ the one for your video first).
- `videos/<slug>/` one HyperFrames project per recreation. Example finished-ish project: `videos/r04-frontier/` (index.html shows the patterns below).
- `blender/lib/chrome.py` (render setup, Cycles Metal, metal material, machined block, socket screw, rods, env_dome studio, keyframes), `blender/lib/product.py` (EEVEE product CG: rounded slabs, acrylic cards, device, phone, scale_vis).
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
- Use your image/video generator of choice (we use Nano Banana Pro stills at 2K, then Kling 3 or Seedance image-to-video, 5 s at 1080p, render 2 s longer than the cut). Confirm cost before any expensive call. Log every prompt + job id in `assets/gen/PROMPTS.md` and keep the job id in the filename.

## Writing rule
Never use em dash or en dash characters in any file (plain hyphen). Check with `grep -c $'-\|-' file`.


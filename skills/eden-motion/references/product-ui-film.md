# Product UI films (an app or a device as the hero)

Proven on a 4K60 launch promo and ~60 b-roll shots for a TV launcher app (2026-11-01): a 30 s promo
cut to a licensed track, close-up b-roll of every feature, CG shots of the physical TV in Blender,
and a vertical 9:16 version of everything. The client's verdict was "exactly what I wanted" only
after the rules below were applied; the first round (screen recordings, cropped into cards) was
called lazy. Read this before any film whose subject is a real app, website or device.

## 1. The core rule: rebuild the UI in code, do not film the screen

Screen recordings read as screen recordings: soft text on zoom-ins, compression, no depth, and the
whole screen moves as one flat layer. Cropping a recording into a rounded card and tilting it is
worse (it looks like a cut-out).

Build an **HTML twin** of the UI instead: the real layout, fonts, colours and assets, every element
its own DOM node, driven by a small API (`TV.home()`, `TV.focusTo(i)`, `TV.voiceQuery(text)` ...).

| why | how |
|---|---|
| Razor sharp at any zoom | Lay the twin out at the device's dp grid (1 CSS px = 1 dp, e.g. a 960x540 stage) and render at device scale 4 for 4K. Text stays vector, 3x zoom-ins stay sharp. |
| Animate like After Effects layers | Every element flies in on its own: staggered arrivals with blur (12-20 px to 0), cards moving along z, anamorphic background blur. |
| Pixel faithful | Measure against real device captures (overlay, difference): we held 0-2 px. Copy the app's own motion specs (durations, curves, staggers) from its code. |
| Honest | Real copy, real numbers, real app behaviour. The twin is staging, not invention. |

Twin rules that cost us a re-render each:
- **Measure every box at rest, before any tween.** A camera that aims at `getBoundingClientRect()`
  after an `immediateRender` scale tween aims at the wrong place. Read all boxes first, then build.
- Frosted glass panels sync their backdrop from bounding rects, not from transforms.
- Word tracking (a camera following typed words): measure with an unscaled probe in `<body>` and do
  not divide by the device scale again.
- `font-variant-numeric: tabular-nums` switches many fonts to a slashed zero. Use a fixed-width
  sizer box for counters instead.
- Keep real device captures for the shots where authenticity is the point (system behaviour,
  live answers from an assistant), and the twin for everything designed.

## 2. Depth: CSS 3D is soft, real 3D is Blender

Chrome rasterizes CSS 3D layers at a low resolution: tilted text goes jagged even at 3840 px and
2x supersampling.
- A z move of a screen-parallel layer is just a 2D scale about the vanishing point: do it in 2D.
- Mild tilts: supersample (lay the layer out larger, flat-scale it down).
- Real perspective, rack focus, parallax: render **flat 8K plates** of the twin (PNG sequence) and
  film them in Blender on a plane (section 4b of SKILL.md, `layers-3d`, or a custom shot).
  Frame-match the cut in and out of the Blender clip against the HTML (mean difference 1-2 / 255).
- Text on a moving plane needs **holds**: plan ride and hold windows so the focus element is still
  while it is read, keep the shutter at ~0.4 (180 deg smears small text).

## 3. CG device shots (the physical product on a set)

What sold the TV shots: a slow camera, a real lens, the screen as the key light.

| element | setting |
|---|---|
| Screen | Image-sequence emission texture from twin plates (`mglib.mat_screen_sequence`), Cubic interpolation, start the sequence where the UI is already settled. |
| Lens | 50-85 mm, f/1.8-2.8, `dof.aperture_ratio` ~1.6 for anamorphic bokeh (`mglib.set_anamorphic`), rack focus keyed per shot. |
| Light | The screen lights the set; one soft key; rim strips; a **bias backlight** (light strips on the device back aimed back and outward, `mglib.bias_glow`) so the glow falls off from the edges and the silhouette reads in the dark. |
| Sets | Black void with a glossy floor fading to black; studio backdrop with a cove; a dark living room with one warm practical lamp against the cool screen. |
| Moves | Slider and orbit, sine in-out, 8 s per shot. Macro shots (bezel edge to clock, subpixels, remote in the foreground racking to the screen) carry the most value. |
| Resolution | 2560x1440 for 16:9 finals and 1080x1920 for verticals were plenty; 4K EEVEE took ~2x longer with no visible gain after delivery compression. |
| Approval | Render 960x540 previews of every shot first, send one labelled reel plus a still grid, get the style approved, then run the long finals overnight. |

Blender 5 notes: `Action.fcurves` is gone (use `mglib.fcurves_of` / channelbags); EEVEE id is
`BLENDER_EEVEE`; render sequentially, one Blender at a time, `nice -n 5`, resumable (skip frames
already on disk).

## 4. Capturing a real device without jank

Screen capture drops frames under load, and wall-clock animations (blinking caret, spinners) look
too fast once retimed. What worked on an Android emulator:
1. Slow the app's animation clock R times (R = 6-10, higher for heavy scenes) and record.
2. Retime to 60 fps (speed up R times, nearest real frame on the grid).
3. Where the grid repeats a frame inside a motion (a capture gap), replace it with an optical-flow
   midframe: warp both neighbours halfway along DIS flow and blend. A plain crossfade ghosts text.
   `tools/retime.py` does all three steps.
4. Make the app's own wall-clock animations follow the animator clock (Animator-driven), or build
   those shots in the twin.
5. A demo-only in-app camera (zoom + pan via a broadcast intent) lets the device render the
   close-up natively instead of a blown-up crop.

## 5. Post that sells the motion

`tools/lensfx.py IN OUT --fx fx.json` (deterministic, any resolution and fps):
- Barrel distortion with zoom compensation plus radial chromatic aberration, keyed to the fast
  moves listed in `fx.json` (`{"t": 5.3, "attack": 0.28, "release": 0.3, "k": 1.0}`): k = 1 is ~6%
  edge displacement at the peak. Tie events to speed ramps, whips and zoom-throughs only.
- Halation on highlights (quarter-res blur, warm tint), a soft static vignette.
- Grain generated at **1/3 resolution** and upscaled. Per-pixel grain pushed a 4K encode to
  143 Mb/s; soft grain plus `maxrate` caps landed at 61.8 (4K) and 16.7 (1080p) Mb/s.

## 6. Music-led edit

- A beat grid helper: `beat(k) = (first_frame + frames_per_beat * k) / fps`. Cuts and camera moves on
  downbeats, the main reveal on the drop, the end card on the final downbeat.
- SFX on picture events: the app's own UI sounds for focus steps (they exist in its resources),
  whooshes on whips, an impact on the drop. Two-pass `loudnorm` to -14 LUFS, -1 dBTP.
- Per-word kinetic type on pulses (not per character), big and readable on a phone.

## 7. Vertical 9:16 versions (Reels, Shorts)

Keep the composition (subject scale and placement, the same move), never a lazy centre crop. Keep
essential detail out of the top 12% and the bottom 22% (the platform UI covers them).

| source | method |
|---|---|
| Twin shots | Render natively in portrait (supersample 2x, downscale to 1080x1920). Wide subjects fill the width and leave air above and below; that is the honest version. |
| Blender shots | Same scene and move, per-shot `lens_mult` with the f-stop scaled by the same factor (the blur keeps its size relative to the subject), plus lens shift into the safe zone (`mglib.vertical_reframe`). |
| Real captures | Full-height 9:16 window from the 4K master (1215x2160 to 1080x1920, no upscale), crop-centre keyframes per clip with eased moves. |

Crop rules for a 16:9 UI (a row of tiles is always wider than 9:16):
- At rest, no slivers: a neighbour element shows either fully, or at least about a third, or not at
  all. Narrow the window slightly (up to 1.1x scale from a 4K source) so its edges fall in the gaps.
- Hold only on clean positions; between them keep the camera moving (slivers in motion read fine).
- Fit mode (whole subject, padded) only where the pads vanish into a black background.

## 8. Review process that worked

- A phone review page: every clip with a verdict (fits / change) and a note, saved to a shared
  database, the previous version one tap away, the client's note and "what changed" on each card.
- Before long renders, send a labelled preview reel and a still grid for style approval.
- Treat every note as a hard rule for the rest of the project (safe space around subjects, nothing
  cut by the frame, no camera move where they asked for none) and re-check all clips against it.
- Never ship the first take. Check end frames at full size: most framing problems sit in the last
  frame of a camera move.

## 9. HyperFrames gotchas from this project

| symptom | cause and fix |
|---|---|
| The first captured frame inside a heavy UI scene is black | warm-up race in the capture worker; render with `--workers 1` (lint rejects rAF warm-ups). |
| A preview sheet "shows" a clipped element | the sheet's own label box covered it. Put labels in a strip above each tile, or verify on the raw frame. |
| A loop over `$LIST` runs once with the whole string | zsh does not word-split unquoted variables; run the loop in `bash -c`. |
| Camera aims above the subject | boxes measured after a tween with `immediateRender`; measure at rest first (section 1). |

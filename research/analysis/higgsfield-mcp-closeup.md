# Higgsfield MCP (0:04-0:08) Forensic Closeup + Reference Craft Breakdown

Forensic frame-by-frame analysis of `.cache/study/analysis-2026-11/higgsfield-mcp.mp4` ("Higgsfield MCP x Claude Fable 5.1", 57.05 s, 30 fps, 1920x1080) focusing on the signature `0:04-0:08` macro UI sequence, paired with visual and quantitative breakdowns of `motionimo.mp4`, `davidim.mp4`, Framer Dark (`01-@Framer-6xJWQRVl9nw.mp4`), Framer Light (`02-@Framer-bv936eeoxmQ.mp4`), Raycast (`04-@raycastapp-Mi173xGb0ZA.mp4`), LandAtlas (`06-@addxstudio-9FlQZyVzINo.mp4`), and Burnwe (`05-@Burnwe-PBp7_1J2iH8.mp4`).

Contact sheets generated and visually inspected in `.cache/study/analysis-2026-11/sheets/`:
- `higgsfield-full.jpg` (1 fps, 57 frames)
- `higgsfield-burst-01.jpg`, `higgsfield-burst-02.jpg` (10 fps, `4.000-7.900 s`, 40 frames)
- `hf-30fps-a.jpg` (native 30 fps, `3.800-4.667 s`, 27 frames)
- `hf-30fps-b.jpg` (native 30 fps, `6.300-7.667 s`, 42 frames)
- `motionimo-full.jpg`, `davidim-full.jpg`, `burnwe-05.jpg`, `framer-dark.jpg`, `framer-light.jpg`, `raycast.jpg`, `addxstudio.jpg`

---

## 1. Higgsfield MCP (`0:03.80-0:08.00`) Frame-by-Frame Breakdown

All timestamps at 30 fps (`1 frame = 33.3 ms`). Motion `diff` is mean absolute RGB delta per pixel (0-255 scale) at 640x360 between consecutive frames. Geometry measured on full 1920x1080 frames.

### 1.1 Measured Palette and Surface Separation

| Role | Measured Hex | Mean Luma (0-255) | Craft Note |
|---|---|---|---|
| Canvas ground | `#f0f0f0` | 240 | Soft neutral paper, never `#ffffff` |
| Floating composer card | `#fefefe` | 254 | Only +14 luma delta above canvas; ZERO dark border, no drop shadow soup |
| Primary typed ink | `#161616` | 22 | Deep warm charcoal, never `#000000` |
| Secondary / model label (`Fable 5.1`) | `#6b6b6b` | 107 | Low-contrast UI metadata |
| Claude terracotta coral (button, hot tail) | `#d3725c` / `#d3725e` | 140 | Single saturated accent (`sat ~0.56` on button, 0.20 frame mean) |
| Shimmer mosaic tiles / bloom peak | `#f9c0b0` -> `#eab1a2` | 198-218 | Soft additive/screen peach halo over `#fefefe` |
| User thread bubble fill (`7.2 s+`) | `#e1e1e2` | 225 | Borderless soft grey pill on `#f0f0f0` canvas |

### 1.2 Measured Camera Scales and Card Geometry (1920x1080)

| Timestamp | Framing State | Measured Geometry (1080p) | Effective Magnification |
|---|---|---|---|
| `4.000 s` | Macro entry (top-left of card) | Card left edge at `x=713` (`37.1% W`), cropped off right & bottom; thumb ~370 px | **2.18x** macro |
| `4.600-5.000 s` | Full composer card settled | Card `1503 x 471 px` (`78.3% W x 43.6% H`), centered `(967, 551)`; send button `46 x 46 px` | **1.00x** baseline |
| `5.000-6.300 s` | Reading hold with micro-push | Card grows `1503x471` -> `1645x517 px` (`85.7% W x 47.9% H`) smoothly over 1.3 s | **1.00x -> 1.095x** (+7.3%/s optical push) |
| `6.450 s` | Send-button macro punch-in | Card right edge `x=1226`, bottom `y=710`; coral send button `159 x 159 px` (`x=970..1129, y=462..621`) | **3.45x** macro |

### 1.3 Exact Beat-by-Beat Timeline (`3.800-8.000 s`)

| Window | Frames | Duration | Visual Action (Verified on 30 fps Sheets) | Motion `diff` Peak | Easing / Optical Treatment |
|---|---|---|---|---|---|
| `3.800-3.900` | 3 f | 100 ms | Full-bleed oak tree + red bike photograph holds at end of opening shot | `5.88-22.38` | Anticipation ramp begins on `3.867` |
| `3.900-4.000` | 3 f | 100 ms | **Shrink-to-thumbnail collapse**: full photograph collapses into a rounded-square (`border-radius ~22%` of thumb) slot inside the macro composer card | **`71.32`** (`3.967`) | `expo.in`, radial zoom blur on `3.933` and `3.967`; dead-sharp by `4.000` |
| `4.000-4.067` | 2 f | 67 ms | Crisp macro hold on thumbnail + white card corner | `0.9` | Clean landing breath before activation |
| `4.067-4.500` | 13 f | 433 ms | **Coral mosaic-pixel ripple**: concentric stepped coral squares (`#e07b5d` to `#f9c0b0`, tile pitch ~40-60 px at macro scale) radiate outward from the thumbnail border across the card | `3.1-6.4` | Procedural distance-from-thumb wave + soft peach glow |
| `4.267-4.500` | 7 f | 233 ms | **Macro hot-tail typing**: `"y"` -> `"yo, this is th"` types directly below thumb in terracotta coral as ripple passes | `3.5-6.5` | ~1.8 chars/frame (`54 chars/s`), newest 8-12 chars glow coral |
| `4.533-4.600` | 3 f | 100 ms | **Whip zoom-out**: camera pulls back from `2.18x` macro to `1.00x` full card (`78.3% W`) | **`16.39`** (`4.567`) | `expo.out`, heavy horizontal directional blur (`stdDeviation ~24 0`) on `4.533-4.567`, sharp by `4.600` |
| `4.600-5.333` | 22 f | 733 ms | **Full-card hot-tail typing**: `"yo, this is the tree in my yard - I wanna build a treehouse on it"` completes; mosaic ripple clears off right edge by `4.700` | `1.1-2.6` | ~1.7 chars/frame (`51 chars/s`), last ~10-14 chars coral `#d3725c` cooling to `#161616` over ~8 f |
| `5.367-6.367` | 30 f | 1000 ms | **Reading hold + optical creep**: zero new text; card smoothly pushes in `+9.5%` (`1503 -> 1645 px` width) | **`< 0.8`** (26 consecutive frames!) | Linear/subtle ease-in optical creep; eye reads full prompt effortlessly |
| `6.400-6.433` | 1-2 f | 33-67 ms | **Hard punch-in cut (3.45x)** to bottom-right corner: `"e on it"`, `"Fable 5.1 v"`, circular coral send button (`159 px`) | **`11.08`** (`6.400`) | Zero-duration hard cut + 1 frame subtle arrival blur (`6.400`), crisp by `6.433` |
| `6.433-6.600` | 5 f | 167 ms | **Macro drift**: camera glides slightly leftward (`~180 px/s` at 1080p) centering the send button | `1.8-2.4` | Smooth linear drift builds anticipation |
| `6.600-6.867` | 8 f | 267 ms | **Button press + concentric coral shockwave**: button core bleaches to warm cream (`#faeccf`), white arrow stays crisp, concentric coral glow ring expands from `1.4x` to `> 9x` button radius, washing viewport in peach (`luma` dips `242 -> 209`) | **`35.92`** (`6.833`) | `expo.out` radial ring expansion + Gaussian bloom |
| `6.900-7.033` | 5 f | 167 ms | **Chromatic-aberration barrel whip**: send button anchors right-of-center while `"Fable 5.1"` and left card edge stretch horizontally with intense prism RGB separation (cyan/yellow/magenta horizontal streaks) and barrel warp | **`12.06`** (`6.900`) | Radial/horizontal RGB channel offset (`+/- 25-60 px`) + horizontal directional blur |
| `7.067` | 1 f | 33 ms | **Clean paper breath frame**: solid `#f0f0f0` field with zero UI | `11.17` | 1-frame optical reset so next layout never collides with outgoing card |
| `7.100-7.267` | 5 f | 167 ms | **Thread snap-resolve**: treehouse thumbnail pops in top-right (scales `0.15 -> 1.0` in 4 f); grey user prompt bubble (`#e1e1e2`) whips in from right with horizontal motion blur (`7.200-7.233`), crisp by `7.267` | `4.8-7.4` | `expo.out`, 180-deg horizontal shutter blur on fast slide |
| `7.267-7.600` | 10 f | 333 ms | **Agent thinking stream**: coral sunburst spinner pops bottom-left (`7.267`), morphs into dotted ring (`7.367`); `"Analyzing image..."` types with coral hot tail cooling to `#161616` | `1.4-3.1` | 1.8 chars/frame hot-tail type |
| `7.600-7.667` | 2 f | 67 ms | **Micro camera settle bump**: brief horizontal jitter/blur (`7.633`) locking framing | `6.92` (`7.667`) | Tactile optical "lens lock" before 300 ms clean hold (`7.700-8.000`) into tree scan |

### 1.4 Why `0:04-0:08` Works (The 5 Core Craft Principles)
1. **Flat 2D optical framing, zero 3D CSS tilt**: The card stays 100% perpendicular (`rotateX=0, rotateY=0`) throughout all 4 seconds. Depth comes from **magnification jumps** (`2.18x -> 1.00x -> 3.45x`), soft luminance separation (`#f0f0f0` vs `#fefefe`), and optical motion blur, never from cheesy 38-degree CSS perspective tilts.
2. **Macro-to-wide-to-macro choreography**: Starting tight (`2.18x`) gives immediate tactile intrigue; pulling back (`1.00x`) delivers full comprehension; punching in (`3.45x`) turns a mundane button click into a cinema-scale climax.
3. **1.0 s deliberate reading hold with subtle creep**: Every fast transition (`3-8 frames`) is paid for by a full `1.0 s` reading hold (`5.367-6.367`, `diff < 0.8`) where the card scales `+9.5%` silently so the frame feels alive without fighting legibility.
4. **Motion blur strictly velocity-gated**: Only 4 moments carry blur (`3.967` shrink, `4.567` whip zoom-out, `6.933-7.033` RGB whip, `7.200-7.233` bubble snap). Everything else is razor sharp.
5. **1-frame paper reset (`7.067`)**: Inserting a single clean `#f0f0f0` breath frame between the departing composer card and arriving chat thread prevents visual muddiness and makes the snap-in feel crisp.

---

## 2. Key Techniques from Other Reference Videos

Direct ffmpeg/numpy measurements across the 8 inspected reference videos:

| Film | Dur (s) | Shots (0.28) | Shot Med (s) | Shot CV | Mean Luma | Contrast | Mean Sat | Dark Share | Hold (<3.0) | Clean Neg Space | Edge Density |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `higgsfield-mcp.mp4` | 57.05 | 19 | 1.93 | 0.781 | 165.6 | 33.8 | 0.200 | 0.247 | 0.288 | 0.686 | 8.69 |
| `motionimo.mp4` | 35.35 | 5 | 5.60 | 0.628 | 39.0 | 38.0 | 0.236 | 0.850 | 0.483 | 0.922 | 2.67 |
| `davidim.mp4` | 43.22 | 20 | 1.78 | 0.934 | 142.4 | 59.5 | 0.326 | 0.282 | 0.132 | 0.615 | 10.84 |
| `01-@Framer` (dark) | 36.97 | 4 | 7.56 | 0.847 | 19.8 | 32.5 | 0.147 | 0.997 | 0.576 | 0.796 | 7.86 |
| `02-@Framer` (light) | 59.09 | 13 | 3.03 | 0.787 | 158.2 | 41.6 | 0.109 | 0.149 | 0.550 | 0.792 | 6.99 |
| `04-@raycastapp` | 38.59 | 6 | 4.68 | 0.645 | 23.8 | 28.3 | 0.009 | 1.000 | 0.747 | 0.882 | 3.61 |
| `06-@addxstudio` | 63.74 | 8 | 4.77 | 1.020 | 43.1 | 46.2 | 0.280 | 0.939 | 0.346 | 0.875 | 5.93 |
| `05-@Burnwe` (Peko) | 56.05 | 7 | 7.88 | 0.676 | 200.6 | 32.0 | 0.137 | 0.080 | 0.608 | 0.888 | 5.13 |

### 2.1 `motionimo.mp4` (Google Gemini Motion Study, 35.35 s, 30 fps)
- **Extreme negative space**: `92.2%` clean flat pixels (`edge 2.67`, lowest in corpus) on deep obsidian (`luma 39.0`, `darkShare 85%`). Every object floats in near-total emptiness so light carries the composition.
- **Rim-light hardware silhouette reveal (`0.0-6.0 s`)**: Edge-lit white phone rim draws in from pitch black, a volumetric cyan/blue light orb blooms behind the bezel, and the camera flips cleanly into bright white (`8.0-10.0 s`) to show the whole phone at 3 receding scales.
- **Shader-driven volumetric light waves (`10.6-19.5 s`)**: Smooth multi-stop GLSL aurora wave (`cyan -> lime -> yellow -> red`) maps directly onto a real hand-held phone (`12.6-13.3 s`), then breaks down into a minimal motion-system schematic: `beam + circle = concentric directional glow` with micro hairline annotations (`16.0-19.3 s`).
- **Motion-curve visualization (`20.0-25.5 s`)**: Literally draws the multi-curve cubic Bezier easing grid (`21.3 s`) and spring-arc orbital dots (`24.0-25.3 s`), proving that Google's motion language relies on asymmetric staggered ease curves (`expo.out` / `power4.out`) rather than uniform motion.

### 2.2 `davidim.mp4` (Sume Director Studio, 43.22 s, 25 fps)
- **Fast hybrid live-action/AI + 2D UI rhythm**: `shotMedian 1.78 s`, `shotCV 0.934`, `holdShare 0.132` (highest sustained kinetic velocity among the 8 inspected films).
- **Camera-viewport framing (`6.4-11.2 s`)**: `"Set your camera."` sits crisp left-aligned on `#f7f9fc` paper while the right side shows a real actor surrounded by a 3D cyan camera-path ribbon (`7.2-8.8 s`), cutting straight to a white 3D studio spatial diorama (`9.6-11.2 s`) with interactive lens slider HUD (`35mm`, `Animation`).
- **One-actor / any-scene continuity cut (`12.0-15.2 s`)**: Giant cyan/white condensed caps (`ONE ACTOR.` -> `ANY SCENE.`) pinned across live cuts while a persistent bottom filmstrip dock highlights the active thumbnail.
- **Direct-manipulation UI over full-bleed footage (`29.6-32.8 s`)**: `"Direct the emotion"` overlays a translucent circular emotion-wheel dial (`Fear`, `Anger`, `Happiness`) directly on the actor's face as her expression shifts live with each sector click.
- **Macro prompt zoom + pricing ticker close (`23.2-24.0 s`, `37.6-39.2 s`)**: Tight macro on a blue-glowing dark prompt pill (`Generate $0.5686/s`), echoed at the climax by huge cyan price typography (`$0.5686/s` vs struck-through `$1.1373/s` with `-50%` pill) flanking a pill-masked action clip.

### 2.3 Framer Dark (`01-@Framer`) and Framer Light (`02-@Framer` / Ossie)
- **Design-tool canvas grammar**: Every macro UI shot uses ultra-crisp 1 px selection frames, blue corner resize handles, and live numeric spacing badges (`47`, `16` px in magenta/blue pills) instead of decorative frames.
- **Zero forced 3D tilt on product UI**: Both films keep screenshots flat (`rotateY = 0`) and achieve cinema polish through **extreme macro crops** (a single pill button `"Get started for free"` or `"Reserve now"` filling 30% of the viewport width with hairline cross-guides, pulling back smoothly to the full browser page).
- **Skeleton-to-bento pop (`02-@Framer` bottom row)**: Empty off-white rounded rectangles (`3x1` -> `2x1` -> `4x3` grid) morph cleanly into populated UI bento cards with cursor-guided focus.

### 2.4 Raycast (`04-@raycastapp`)
- **Monochrome luxury restraint**: Measured mean saturation is **`0.009`** (virtually 100% achromatic!), mean luma **`23.8`**, `darkShare 100%`, `negSpace 88.2%`, and `holdShare 74.7%` (longest holds in the group!).
- **Glossy liquid-metallic silk shader background**: Slow-moving dark chrome/silk folds (`#0f0f10` to `#3a3a3d` specular highlights) sit behind razor-sharp translucent glass UI (`rgba(20,20,22,0.85)`, hairline `1 px` `rgba(255,255,255,0.12)` rim).
- **Macro input + single-tile focus**: Opens at `~3x` macro on the `"Search"` input with blinking vertical caret, types `"clip"` -> `"clipboard"`, then glides across an oversized emoji/icon grid where only the active tile receives a clean colored hairline rim (`orange`, `cyan`, `white`). Closes on a minimalist dark glass audio waveform pill.

### 2.5 LandAtlas by Addxstudio (`06-@addxstudio`)
- **Dark-world stat monumentality**: `darkShare 93.9%`, `luma 43.1`, `negSpace 87.5%`, `shotCV 1.020` (huge dynamic range between rapid tension cuts and sweeping data reveals).
- **Problem-to-product world flip**: Opens with a 3D scatter of property cards around centered white type (`Every [cards] land lives or dies by one thing`), accelerates through cold spreadsheets + phone call logs + a 3D flipping calendar (`01 -> 04`), then blooms an emerald/mint bottom-horizon radial glow (`#28e5a8`) that introduces the `LandAtlas` mark.
- **Signature WebGL dotted globe + rolling stat + bright pill tags**: Huge crisp white numerals (`7,987+ -> 8,000+`, `800+`, `600+`) sit centered over a rotating monochrome dotted 3D globe or staggered dark UI cards, punctuated by high-contrast mint pill badges (`Active`, `builders`, `Builder`, `buy`, `boxes`, `Title`, `companies`) placed asymmetrically at the top-left and bottom-right corners of the number.

### 2.6 Burnwe Peko (`05-@Burnwe`)
- **Warm coral-red editorial light world**: `luma 200.6`, `lightShare 83.4%`, `negSpace 88.8%`, `shotMedian 7.88 s` (continuous camera journeys rather than hard cuts).
- **Focused horizontal card carousel (`28.0-32.0 s`)**: Flat white rounded feature cards (`Payroll`, `Bill payments`, `Accounting`, `Corporate travel`) slide horizontally; the center card pops forward `1.12x` with soft warm shadow while flanking cards recede slightly in opacity and scale.
- **Brief dark-world agitation (`10.0-12.0 s`)**: Only 8% of frames are dark, reserved exclusively for the "fragmented subscriptions costing hundreds of dollars" problem table before returning to luminous `#f5f5f5` + coral-glow paper.

---

## 3. Actionable Tuning Specs for `eden-motion` Runtime (`@runtime-webgl`)

### 3.1 `macro-ui` (`runtime/scenes/macro.js`)
- **Flat 2D optical camera (NEVER 38 deg CSS tilt)**: Keep `rotateX = 0, rotateY = 0` by default. Drive drama via magnification shifts:
  - Macro entry zoom: `2.0x-2.4x` anchored on `focusRect` (e.g. top-left input or CTA button), pulling back cleanly to `1.0x` in `3-6 frames` (`0.10-0.20 s`, `expo.out`) or hard-punching to `3.0x-3.5x` on a focal button.
  - Continuous optical creep during holds: `+6% to +9%` scale over `1.0-1.3 s` (`~+7%/s`) so reading holds (`>= 0.85 s`) stay alive without shaking text.
- **Borderless luminance layering (anti-slop)**:
  - Light mode: canvas `#f0f0f0` (`luma 240`), UI card `#fefefe` (`luma 254`, +14 delta), ZERO dark border (`border: none` or hairline `rgba(0,0,0,0.04)`), soft ambient shadow only (`0 20px 50px rgba(0,0,0,0.06)`).
  - Dark mode (Raycast/Framer Dark): canvas `#0f0f11`, card `#18181c` with ultra-thin `1 px` top specular rim `rgba(255,255,255,0.10)`.
- **Framer selection guides (`guides: true`)**: Crisp `1 px` `#3b82f6` (or `--accent`) hairline bounding box around `focusRect`, `6x6 px` white-filled square corner handles with `1.5 px` accent stroke, and optional tiny `10 px` pill dimension badge (`48`, `16`) offset `8 px` outside the top/bottom edge.
- **Press climax / shockwave (`clickAt` / `bloom: true`)**: On button activation, bleach button fill toward warm white over `3 f`, expand a concentric radial ring (`scale 1.0 -> 8.0`, opacity `0.65 -> 0` over `8 f` / `267 ms`, `expo.out`) in `--accent`.
- **Velocity-gated horizontal blur**: Only apply directional SVG blur (`feGaussianBlur stdDeviation="20 0"`) on the `2-4` peak-velocity frames of a whip zoom/slide; keep all holds razor sharp.

### 3.2 `micro-ticker` (`runtime/scenes/macro.js`)
- **Grid + telemetry framing (Ovyon / Higgsfield / Davidim grammar)**:
  - Technical hairline grid overlay (`1 px` at `6-10%` ink opacity, cell pitch `80-120 px` at 1080p) with minimal `+` crosshair ticks at 4-6 intersections.
  - Live telemetry chips (`items: [{label, values}]`) set in crisp monospace (`11-13 px`, `letter-spacing: 0.08em`, uppercase), cycling deterministically every `4-8 frames` (`0.13-0.27 s`) with hard snap swaps (no crossfade blur between ticks!).
  - Anchor chips to outer safe margins (`6-8%` inset) or a pinned bottom/top status bar (`height 36-44 px`), leaving `>= 65%` clean negative space around the hero focal media or oversized headline (`cap height 12-22%` of frame).
  - Single high-contrast accent pill (e.g. `#d3725c` coral, `#28e5a8` mint, or `#d4ff19` lime) reserved exclusively for the active value or live indicator dot.

### 3.3 `webgl-globe` and `shader-silk` (`runtime/scenes/webgl.js`, `runtime/backgrounds.js`)
- **`webgl-globe` (LandAtlas pattern)**: Deep charcoal canvas (`#0f0f11`, never `#000`), monochrome white/grey Fibonacci sphere dots (`alpha 0.25-0.85` depth-attenuated), optional glowing arcs in single `--accent` (mint `#28e5a8` or brand accent), huge tight-tracked centered rolling numeral (`180-240 px`, `-0.04em`), and 2-3 high-contrast solid `--accent` pill tags with dark ink offset asymmetrically around the numeral's top-left and bottom-right corners.
- **`shader-silk` (Raycast pattern)**: Near-monochrome (`sat <= 0.03`) glossy dark metallic wave ribbons spanning `#0f0f11` troughs to `#3d3d42` soft specular crests, slow laminar drift (`<= 0.15 cycles/s`) so translucent dark UI (`rgba(20,20,24,0.84)`) remains effortless to read at `> 70%` hold share.

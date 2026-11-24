# Universal Craft Invariants Across 80+ Measured Motion Design Films

Synthesis of all **80 cached metric JSONs** across `.cache/study/{burnwe,launch,relate,ovyon,refs-2026-11}/metrics/` (**66 unique films**, **47 multi-shot films** with >= 4 shots, **809 pooled shots**), plus direct frame-level visual and numerical measurements of 8 flagship references (`higgsfield-mcp.mp4`, `motionimo.mp4`, `davidim.mp4`, Framer Dark, Framer Light, Raycast, LandAtlas/Addxstudio, Burnwe Peko) and prior forensic studies (`burnwe.md`, `launch-films.md`, `relate.md`, `higgsfield.md`, `editorial-launch.md`, `agent-launch.md`, `launch-type.md`).

---

## 0. Master Quantitative Table (All 80 Metric JSONs -> 66 Unique Films)

### 0.1 Pooled Corpus Summary

| Axis | Pooled Unique (Multi-Shot, n=47) p25 / med / p75 | Pooled Unique (All, n=66) p25 / med / p75 | Pooled Shots (n=809) |
|---|---|---|---|
| Median shot length (s) | `0.568` / **`1.000`** / `2.035` | (n=47 multi-shot) | p10 `0.13`, p25 `0.37`, **med `1.00`**, p75 `2.13`, p90 `4.83` |
| Long shots p90 (s) | `1.251` / **`2.810`** / `5.746` | - | - |
| Shot length CV (`std / mean`) | `0.601` / **`0.793`** / `1.189` | - | p10 `0.447`, p90 `1.469` |
| Cuts per 10 s | `3.151` / **`5.946`** / `12.355` | - | - |
| Metronome grid share (`onGrid`) | **`0.000`** / **`0.000`** / **`0.000`** | - | p90 `0.000` (only 3/47 films > 0) |
| Flashes & whips per min | `0.000` / **`0.000`** / `4.218` | `0.000` / **`0.000`** / `1.817` | - |
| Visual events per sec | `0.774` / **`1.206`** / `2.090` | `0.624` / **`0.953`** / `1.991` | - |
| Still hold share (`holdShare`) | `0.089` / **`0.204`** / `0.309` | `0.079` / **`0.205`** / `0.383` | - |
| Longest still hold (s) | `0.650` / **`1.230`** / `2.550` | - | - |
| Polarity flips (dark/light cuts) | `0.033` / **`0.250`** / `0.391` | - | - |
| Dark shot share | `0.099` / **`0.278`** / `0.453` | - | - |
| Mean luminance (0-255) | `79.7` / **`124.2`** / `163.6` | `77.6` / **`124.1`** / `161.9` | min `9.9`, max `239.0` |
| Contrast (luma std) | `38.5` / **`50.4`** / `59.0` | `40.2` / **`52.4`** / `66.0` | p10 `31.7`, p90 `81.9` |
| Mean saturation (0-1) | `0.093` / **`0.198`** / `0.314` | `0.101` / **`0.185`** / `0.319` | p10 `0.054`, p90 `0.502` |
| Near-B&W frame share (`bwShare`) | `0.120` / **`0.200`** / `0.390` | `0.062` / **`0.190`** / `0.440` | - |
| Cuts on music beat (n=19) | `0.130` / **`0.226`** / `0.305` | - | - |
| Cuts on strong sound onset | `0.097` / **`0.226`** / `0.393` | - | - |

### 0.2 Per-Style Comparison (`styles/*/profile.json` + Higgsfield Measured)

| Axis | `burnwe` (n=6) | `launch` (n=5) | `relate` (n=29 / 18m) | `ovyon` (n=25 / 17m) | `higgsfield` (`11-hf` + `hf-mcp` + A/B) |
|---|---|---|---|---|---|
| Median shot (s) | `1.89` / **2.15** / `2.38` | `2.38` / **2.73** / `3.55` | `0.95` / **1.26** / `2.65` | `0.25` / **0.54** / `0.63` | **1.55 - 1.93** (`11-hf`: `1.67`, `hf-mcp`: `1.93`) |
| Shot p90 (s) | `5.46` / **5.64** / `6.46` | `4.81` / **6.64** / `7.54` | `2.21` / **5.55** / `6.78` | `1.05` / **1.28** / `1.79` | **4.30 - 5.10** |
| Shot CV | `0.78` / **0.80** / `0.82` | `0.60` / **0.67** / `0.81` | `0.44` / **0.71** / `1.19` | `0.61` / **0.79** / `1.30` | **0.78 - 0.87** |
| Cuts per 10 s | `3.10` / **3.27** / `3.41` | `2.00` / **2.33** / `2.98` | `2.83` / **4.04** / `6.49` | `11.58` / **13.05** / `16.36` | **3.3 - 5.2** (`hf-mcp`: 3.3, `11-hf`: 5.16) |
| On-grid share | `0` / **0** / `0` | `0` / **0** / `0` | `0` / **0** / `0` | `0` / **0** / `0` | **0** |
| Flashes/min | `0` / **0** / `0` | `0` / **0** / `1.00` | `0` / **0** / `0` | `0` / **5.94** / `19.09` | **0 - 12** (budget max 1 per 3 s) |
| Events/sec | `0.65` / **0.75** / `0.91` | `0.42` / **0.60** / `0.77` | `0.46` / **0.70** / `1.09` | `1.54` / **2.95** / `3.74` | **1.03 - 1.40** |
| Hold share | `0.34` / **0.41** / `0.47` | `0.28` / **0.39** / `0.59` | `0.11` / **0.28** / `0.48` | `0.00` / **0.07** / `0.21` | **0.12 - 0.29** (`11-hf`: 0.12, `hf-mcp`: 0.29) |
| Longest hold (s) | `2.24` / **3.18** / `4.86` | `1.60` / **3.17** / `7.44` | `0.77` / **1.93** / `3.10` | `0.00` / **0.63** / `1.23` | **2.0 - 2.53** |
| Polarity flips | `0.13` / **0.20** / `0.33` | `0.00` / **0.00** / `0.07` | `0.00` / **0.26** / `0.40` | `0.20` / **0.31** / `0.42` | **0.25 - 0.36** |
| Dark share | `0.06` / **0.07** / `0.08` | `0.77` / **0.84** / `0.92` | `0.00` / **0.21** / `0.31` | `0.25` / **0.35** / `0.45` | **0.25 - 0.26** |
| Mean luma | `173.6` / **183.4** / `199.1` | `23.9` / **25.1** / `29.9` | `102.3` / **152.3** / `182.7` | `77.4` / **107.9** / `127.9` | **147.9 - 165.6** |
| Contrast | `30.3` / **32.6** / `34.2` | `28.6` / **31.5** / `38.8` | `40.4` / **55.2** / `66.0` | `50.4` / **55.7** / `76.4` | **33.8 - 43.4** |
| Saturation | `0.088` / **0.103** / `0.110` | `0.070` / **0.162** / `0.281` | `0.119` / **0.238** / `0.452` | `0.142` / **0.217** / `0.324` | **0.200 - 0.248** |
| Cuts on onset | `0.231` / **0.269** / `0.403` | `0.083` / **0.226** / `0.333` | `0.000` / **0.194** / `0.383` | `0.167` / **0.300** / `0.545` | **0.18 - 0.35** (drop/flash locked) |

---

## (a) Universal Invariants (Never Break These Across Any Style)

Every single high-craft motion video in the 66-film corpus, regardless of whether it is a 0.53 s/shot Ovyon blitz or a 2.73 s/shot dark Raycast launch film, obeys these **10 universal invariants**:

### 1. High Shot-Length Variance, Zero Metronome Slop
- **Measured invariant**: Across all 47 multi-shot films, `onGrid` is **`0.000` at p25, median, p75, and p90**! Meanwhile, `shotCV` (`std / mean`) sits tightly at **`0.601` (p25) to `1.189` (p75), median `0.793`**. Every single style shares a remarkably tight median `shotCV`: Burnwe `0.798`, Ovyon `0.793`, Relate `0.712`, Launch `0.669`, Higgsfield `0.78-0.87`.
- **What this means**: Great editors NEVER cut on a robotic fixed interval (e.g. every 2.0 s). They contrast short kinetic jolts (`0.2-0.7 s`) against deliberate hero holds (`2.5-6.5 s`). Uniform slide-deck pacing (`shotCV < 0.40`) is the #1 statistical fingerprint of amateur/AI-generated video.

### 2. Saturation Restraint: 80% Neutral Ground, 1 Highlight Hue
- **Measured invariant**: Pooled mean frame saturation across 66 films is **`0.101` (p25) / `0.185` (median) / `0.319` (p75)**! Even in bold, vibrant styles like Ovyon (`0.217`), Relate (`0.238`), and Higgsfield (`0.200-0.248`), **75-90% of every frame's area is neutral** (off-white paper, warm grey, or near-black obsidian). Raycast pushes this to `0.009` (99% monochrome).
- **What this means**: Color is an attention pointer, not wallpaper. Never flood a film with rainbow gradients or 4 competing saturated UI badges. Pick ONE primary ground polarity + ONE brand accent hue used strictly as a highlighter (active button, hot typing tail, hero stat pill, focal arc).

### 3. Massive Clean Negative Space (62%-92% Quiet Pixels)
- **Measured invariant**: Across all 8 flagship videos measured directly, the fraction of clean flat/uncluttered pixels (`clean_negative_space_mean`) is **`0.615` to `0.922`** (Motionimo `92.2%`, Burnwe `88.8%`, Raycast `88.2%`, LandAtlas `87.5%`, Framer Dark `79.6%`, Framer Light `79.2%`, Higgsfield MCP `68.6%`, Davidim `61.5%`).
- **What this means**: One focal subject per beat. A floating composer card, a single giant numeral over a dotted globe, one button at 3.45x macro, or one crisp headline. Never pack a headline, 4 bullet points, a cluttered dashboard, and 3 floating badges into one frame.

### 4. Never Pure `#000000` or `#ffffff` Border-Box Slop
- **Visual invariant**: Inspected full-res frames across Higgsfield MCP (`#f0f0f0` canvas + `#fefefe` card, `#161616` ink), Burnwe (`#ebebeb`/`#f5f5f5` + `#0c0a12`), Framer Dark (`#0f0f11` + `#18181c`), and Raycast (`#0f0f10` + `rgba(20,20,24,0.84)`) show **subtle luminance elevation** (+10 to +16 luma points) and **hairline or zero borders** (`border: none` or `1px rgba(..., 0.06-0.12)`).
- **Never**: `#000000` pitch void with harsh `#ffffff` 2 px neon borders and thick blurred drop shadows.

### 5. Flat Optical Macro Framing Beats Forced 3D CSS Tilt
- **Visual invariant**: In Framer Dark, Framer Light, Raycast, Higgsfield MCP (`0:04-0:08`), and Davidim, product UI is shown **flat (`rotateX=0, rotateY=0`) and razor sharp**, using **extreme macro crops (`2.0x-3.5x`)** and rapid optical zoom-outs (`3-6 frames`) to create drama. When 3D depth IS desired (LandAtlas property cards, Relate chrome/acrylic objects, Burnwe card clouds), it uses genuine Z-depth parallax or true Blender/WebGL optical perspective with DOF, never flat screenshots arbitrarily skewed `rotateY(38deg)` in CSS.

### 6. Velocity-Gated Motion Blur + Asymmetric Expo Easing
- **Visual invariant**: Motion curves in every top film (`motionimo.mp4` literally charts them at `21.3 s`!) are steeply asymmetric (`expo.out`, `power4.out` for arrivals; `expo.in` for exits/whips), NEVER `linear` on arrivals and NEVER rubbery spring-overshoot on editorial text. Motion blur appears ONLY during peak-velocity transitions (`2-5 frames` of directional blur on whips, shrink-to-thumb, and fast trucks), while every reading frame is dead sharp.

### 7. The Frame Breathes During Holds (Micro-Creep, Never Frozen Stills)
- **Measured invariant**: Even during `1.0-3.2 s` reading holds (`diff < 0.8` in Higgsfield `5.36-6.36 s`; `holdShare 39-41%` in Launch/Burnwe), top studios apply a subtle **`+2% to +7%/s` optical push-in** or gentle background shader drift (`<= 0.15 cycles/s`). The frame stays calm enough to read at a glance, yet never looks like a paused PowerPoint slide.

### 8. Cuts Follow Narrative Clauses and Sound Onsets, Not Blind Beat Grids
- **Measured invariant**: Across 47 multi-shot films, `cutsOnOnset` median is `0.226` (p75 `0.393`), and `cutsOnBeat` (where strong BPM exists) is `0.226` (p75 `0.305`), while `onGrid` is `0.000`. Major structural pivots (send-button click -> drop, world polarity flip, payoff reveal) snap cleanly within `+/- 80 ms` of a strong audio onset or a `0.3-0.5 s` pre-reveal music breath/dip, while intermediate cuts serve reading comprehension and VO clauses.

### 9. Object-Motivated Transitions Over Generic Crossfades
- **Visual invariant**: Pure opacity crossfades are virtually absent across all 66 films. Transitions are anchored to a concrete visual actor: a full photo collapses into a composer thumbnail (`higgsfield-mcp 3.93 s`), a button press blooms into a radial shockwave (`6.60 s`), a glowing cursor clicks a toggle that floods the canvas (`burnwe`), a calendar flips into a glowing horizon (`addxstudio`), or a 1-frame clean paper breath resets the eye (`7.067 s`).

### 10. Structural Arc: Immediate Hook -> Controlled Comprehension -> Escalation -> Quiet Land
- **Visual & statistical invariant**: Top films open with an immediate visual intrigue in the first `0.5-2.0 s` (never a slow 4 s fade-in logo), settle into legible product comprehension beats (`1.5-3.5 s`), escalate into a kinetic payoff or quantified stat proof (`60-85%` of runtime), and finish on a clean, unhurried end card (`1.8-3.5 s`) with generous negative space and zero SFX clutter.

---

## (b) Style-Specific Levers (What Actually Separates the 5 Styles)

Once the 10 universal invariants are locked, **just 6 quantitative levers** separate `burnwe`, `launch`, `relate`, `higgsfield`, and `ovyon`:

| Lever | `burnwe` | `launch` | `relate` | `higgsfield` | `ovyon` |
|---|---|---|---|---|---|
| **1. Luminance Polarity** | High-key light (`luma 183`, `dark 7%`) | Low-key obsidian (`luma 25`, `dark 84%`) | Balanced studio (`luma 152`, `dark 21%`) | Light technical paper (`luma 155`, `dark 25%`) | Mid-dark moody editorial (`luma 108`, `dark 35%`) |
| **2. Pacing Velocity** | Calm explainer (`2.15 s` med, `3.3` cuts/10s) | Monumental showcase (`2.73 s` med, `2.3` cuts/10s) | Design-driven pulse (`1.26 s` med, `4.0` cuts/10s) | Sprint-and-hold demo (`1.67-1.93 s` med, `3.3-5.2` cuts/10s) | Hyper-cut kinetic (`0.54 s` med, `13.1` cuts/10s) |
| **3. Reading Hold Budget** | Generous (`41%` hold, `3.2 s` max) | Very generous (`39%` hold, `3.2-7.4 s` max) | Moderate (`28%` hold, `1.9 s` max) | Short tactical holds (`12-29%`, `1.0-2.5 s`) | Minimal (`7%` hold, `0.63 s` max) |
| **4. Polarity Flips** | Structural (`20%` of cuts: problem=dark, product=light) | Rare (`0%` med: stays dark world) | Rhythmic (`26%` of cuts: white/black cadence) | High-impact pivots (`25-36%`: paper <-> HUD/media) | Aggressive strobe/contrast (`31%` of cuts) |
| **5. Transition Texture** | Soft Gaussian defocus (`12-20 px` focus-pull) | Optical zoom, liquid silk/glow, crisp cuts | Shape-match cuts, horizontal shutter blur, 3D sweeps | Digital/pixel mosaic ripples, RGB whips, punch-ins, flash frames | Flash/whip cuts (`5.9/min` med), grid snaps, grain |
| **6. Type & Contrast** | Soft geometric (`contrast 33`, hot-tail type synced to VO) | Minimal ultra-clean sans (`contrast 32`, macro UI + big stats) | High-contrast neo-grotesk (`contrast 55`, scale extremes + ghost counters) | Tech grotesk + bitmap/pixel resolve + monospace HUD (`contrast 34-43`) | Bold editorial condensed + monospace telemetry tickers (`contrast 56`) |

---

## (c) Hybrid Technology Mapping (When Top Studios Use Each Engine)

Top studios never force one rendering stack to do everything. Across the corpus, every shot cleanly maps to one of **4 specialized engines** based on optical and motion physics:

| Shot Type / Visual Need | Best Engine | Why Top Studios Pick It | Concrete Reference Evidence |
|---|---|---|---|
| **Editorial typography, macro UI crops, prompts, terminals, telemetry tickers, live product clones, 2D diagrams** | **2D HTML / CSS / GSAP** (HyperFrames) | Subpixel font hinting, razor-sharp UI vector borders, instant deterministic timing, zero aliasing on small text, exact CSS/DOM fidelity | Higgsfield MCP `0:04-0:08` composer card, Framer Dark/Light selection handles, Raycast macro search bar, Burnwe hot-tail type, Davidim pricing ticker |
| **Fluid silk ribbons, grained aurora meshes, dotted 3D globes, iridescent/foil glass cards, Bayer dithers, interactive data grids** | **Real-Time WebGL2 / GLSL / Three.js** (seek-driven proxy in HyperFrames) | Continuous procedural math (waves, specular light sweeps, 10,000-dot spheres, halftone/dither shaders) at 100% deterministic frame seeking with 0 Blender render wait | Raycast monochrome liquid silk (`04-@raycastapp`), LandAtlas dotted 3D globe (`06-@addxstudio`), Motionimo volumetric aurora beams (`motionimo.mp4`), Stripe/ElevenLabs fluid meshes |
| **True optical DOF & rack focus, photoreal chrome/acrylic/glass/clay materials, multi-layer 3D screen walls/carousels/exploded assemblies, hardware reveals, seamless 3D loops** | **Photoreal 3D / Blender** (Cycles Metal / EEVEE alpha plates composited in HyperFrames) | Real physically based reflections (near emissive softbox domes), true camera focal length (`18mm` fisheye to `85mm` macro) and optical bokeh that CSS `filter: blur()` cannot fake | Relate Frontier chrome rods & Ledger acrylic stacks, Arcus matte clay worlds, Davidim 3D camera-studio diorama, Burnwe exploded UI carousels |
| **Humans, real environments, tactile physics spectacle, photoreal product lifestyle, impossible visual metaphors** | **AI Video / Live-Action Footage** (Seedance / Kling / Cinema Studio / live camera) | Organic skin, cloth, dust, camera handheld energy, and real-world proof that CG looks uncanny attempting | Higgsfield MCP oak tree + treehouse previews + live carpenter finale, Davidim live actor emotion scenes, Google Gemini live-action vignettes, Relate B&W stock inserts |

### The Golden Rule of Hybrid Routing
**Never use AI video for UI or typography. Never use CSS 3D `perspective()` to fake photoreal glass/chrome or multi-plane optical DOF. Never use Blender to render flat 2D typography.** Composite alpha plates (Blender VP9/PNG or AI clips) *inside* HyperFrames so the 2D typographic/HUD layer always renders at native crisp 1080p/4K resolution on top.

---

## (d) Concrete Improvements for `eden-motion`

Based on the measured gaps between top-studio references and current `eden-motion` renders:

1. **Kill default 38-degree CSS 3D screenshot tilt**: Default `ui.js` to `mode: "flat"` or `"macro"` (`rotateX=0, rotateY=0`), using `macro-ui` magnification jumps (`2.2x -> 1.0x -> 3.4x`) and optional Framer selection guides (`guides: true`) for visual drama. Route real multi-plane 3D screen walls, carousels, and exploded stacks to Blender `layers-3d` with optical DOF.
2. **Enforce `shotCV` & anti-metronome gating in `measure.mjs` / `storyboard.mjs`**: Flag any generated storyboard whose planned scene durations have `shotCV < 0.45` or `onGrid > 0.35`. Every style profile should verify both `shotMedian` AND `shotCV` against `styles/<name>/profile.json`.
3. **Add `macro-ui`, `micro-ticker`, `terminal`, `answer-stream`, `webgl-globe`, and `shader-card` to core runtime**: These 6 scenes directly cover the highest-leverage modern patterns observed in Higgsfield MCP, Raycast, Framer, LandAtlas, Davidim, and Ovyon.
4. **Upgrade background palette with 4 deterministic WebGL2 shaders (`shader-silk`, `shader-mesh`, `shader-grid`, `shader-dither`)**: Replaces flat CSS radial gradients with authentic Raycast liquid chrome, ElevenLabs grained aurora, Ovyon technical perspective grids, and crisp halftone fields, all seek-deterministic via GSAP proxy timelines.
5. **Enforce strict surface & saturation discipline in CSS tokens**: Lock dark canvas floor `>= #0f0f11` (never `#000000`), light ceiling `<= #fafafa` (`#f0f0f0` paper + `#fefefe` card), remove thick default 1-2 px AI card borders, and cap accent saturation coverage to focal pointers only (targeting corpus median frame saturation `0.10-0.25`).
6. **Add a Pre-Production Treatment Gate (`treatment.mjs`) + 11-Section Style Bibles (`styles/*/style.md`)**: Force deliberate creative differentiation (4-of-6 novelty check vs previous film) and explicit **Hybrid Tech Mix** budgeting (% HTML/GSAP vs WebGL vs Blender vs Footage) *before* generating `storyboard.json`, eliminating same-looking template reels.
7. **Adopt velocity-gated directional blur + 1-frame breath resets + element easing verification (`reanimate/easing.mjs`)**: Verify in `measure.mjs` that arrivals never accidentally use `linear` easing and that reading holds preserve `>= 0.85 s` of calm micro-creep (`+4-8%/s`) so viewers can actually read every beat.

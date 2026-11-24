# Ovyon Style Bible

Hyper-kinetic editorial reel style modeled after OvyonLabs' 25 measured short-form films: sub-second rapid cutting (`0.535 s` median shot, `13.1 cuts/10 s`), high-contrast monochrome/tinted editorial frames with organic film grain, hairline technical grid overlays, rapidly cycling monospace micro-tickers, and percussive dark/light polarity strobes designed to stop social feeds in under 1 second.

---

## 1. Identity & When to Use

- **Core identity**: High-voltage, fashion-editorial meets engineering-telemetry social sprint. Built for instant thumb-stop impact on Instagram Reels, X, and TikTok (`6-16 s` short bursts or high-energy `20-30 s` feature drops), where visual density, rhythmic polarity flips, tactile film grain, and cycling telemetry metadata turn abstract AI/tech capabilities into visceral kinetic design.
- **Best fit**:
  - 6-16 s thumb-stop social reels, teaser trailers, model/capability drops, brand attitude showreels, and fast-paced 20-25 s changelog / feature-drop sprints (`--template feature-drop` / `changelog`).
  - Music-first, zero-VO edits driven by crisp electronic percussion (`115-135 BPM`) and rapid visual punctuation.
  - Brands wanting raw, tastemaker editorial edge (A24 / brutalist Swiss / creative-engineering studio energy) rather than safe corporate SaaS explainers.

## 2. What This Style IS NOT

- **NOT a calm voiceover explainer**: `holdShare` median is just **`7.2%`** (`p25 0%`, `p75 20.6%`) and `longestHold` median is **`0.63 s`**. Never cram 15-word paragraphs or 3-second static UI walkthroughs into `ovyon`.
- **NOT low-contrast pastel softness**: Highest measured `contrast` in the entire 80-film corpus (**median `55.7`**, `p75 76.4`, peaking above `81`), with bold black/white polarity swings (`30.8%` of cuts flip dark <-> light!).
- **NOT noisy multicolored RGB chaos**: Despite extreme editing speed, color stays tightly restrained: high monochrome/B&W grain presence (`bwShare` often `30-60%`), mid-dark tonal gravity (`luma 107.9`), and ONE surgical high-contrast accent color (`saturation` median `0.217`, `p25 0.142`).
- **NOT robotic uniform slide-swapping**: Even at `13 cuts/10 s`, `onGrid` is strictly **`0.000`** and `shotCV` is **`0.793`** (`p75 1.304`), contrasting `0.10-0.25 s` micro-flashes against `1.1-1.8 s` hero punches.

## 3. Color & Contrast Rules

- **High-contrast editorial tonal engine**: Target measured `contrast` **`50.4-76.4`** (median `55.7`) and mean `luma` **`77.4-127.9`** (median `107.9`), balanced at **`35%` dark shots** (`p25 25%`, `p75 45%`).
- **Tinted B&W + Film Grain + 1 Surgical Accent**:
  - Grade photography/footage into rich high-contrast monochrome or subtle silver/warm-sepia duotone (`#121214` crushed-safe shadows, `#e8e6e1` paper highlights) with subtle 35mm organic grain (`3-5%` noise overlay).
  - Deploy **ONE razor-sharp brand accent** (signal orange `#ff4d1a`, acid lime `#d4ff19`, electric cyan `#00d4ff`, or crimson `#e61e32`) exclusively for active telemetry chips, corner crosshair ticks, 1-2 frame flash punctuation, or one highlighted headline word.
- **Polarity flips as percussion**: **`30.8%`** of cuts (`p25 20.0%`, `p75 41.7%`) flip between dark obsidian (`#111114`) and stark light paper (`#efeee9`), creating an unmistakable editorial strobe cadence without needing rainbow colors.

## 4. Typography Rules

- **Two-tier editorial + telemetry pairing**:
  1. **Bold Editorial Display**: High-impact condensed or heavy neo-grotesk (`Inter Tight` Bold/Black `700-900`, `Space Grotesk`, or editorial high-contrast serif accent), tight tracking `-0.03em` to `-0.05em`, cap height **`12-22%`** of frame height (`130-240 px` at 1080p). Strictly **1-3 words per beat** so viewers read instantaneously at `0.4-0.7 s` shot durations!
  2. **Monospace Micro-Telemetry (`micro-ticker`)**: Razor-sharp `11-13 px` uppercase monospace (`JetBrains Mono`, `Geist Mono`, `IBM Plex Mono`), tracking `+0.08em` to `+0.12em`, pinned to outer `6-8%` safe margins or a `36-44 px` edge status strip (`MODEL: V4.2`, `RES: 4K/60FPS`, `LATENCY: 14MS`, frame counters, coordinates).
- **Kinetic delivery**:
  - **Hard snap swaps** (`0 f` fade) on micro-ticker values every `4-8 frames` (`0.13-0.27 s`) and on rapid headline word-cuts.
  - **Typography-on-twos / scale punch**: Instant scale step (`1.0 -> 1.15` or condensed `scaleX 0.85 -> 1.0` over `2 f`) on cut landings; optional brief `2-3 f` character scramble/dropout (`fx.scramble`) before locking ink.

## 5. Camera Movement Table

| Shot Role | Camera Move | Speed / Range (1080p, 30 fps) | Easing | Optical Blur |
|---|---|---|---|---|
| Opening thumb-stop burst (`0.0-1.5 s`) | Rapid hard-cut montage (`4-8 f` shots) with subtle scale punch on each cut | `0.13-0.30 s` per shot; scale `1.08 -> 1.00` | Hard cut + `expo.out` settle | Optional `1-2 f` directional whip blur on peak cuts |
| Technical grid + macro focal beat | Continuous micro-zoom over `shader-grid` subtle perspective/lens warp | Scale `+8% to +15%/s` | `power3.out` | None on headline/ticker; crisp legibility |
| Whip / flash transition (`5.9/min` med) | High-speed lateral whip or `1-2 f` polarity/accent flash | `3-4 f` (`100-133 ms`) | `expo.inOut` | Directional horizontal blur (`stdDeviation="28 0"`) on whip frames only |
| Macro UI / capability proof | Tight crop (`2.0x-3.0x`) snap-cut between 2-3 focal details | `0.5-1.1 s` per angle | Hard punch-in cuts | None during read window |
| Hero climax / breather beat (`p90`) | Sudden tempo drop to `1.2-1.8 s` held shot with slow dramatic push | Scale `+4-6%/s` | `power2.out` | Native shallow DOF if 3D/footage |
| End card / loop bridge | Instant lockup snap (`0.15 s`) -> clean `0.8-1.5 s` hold (or seamless cut back to frame 0) | Static / `-2%/s` settle | `expo.out` | None |

## 6. Signature Moves & Content Fit

- **Technical grid overlay + live micro-tickers (`micro-ticker` + `shader-grid`)**: Hairline `1 px` grid (`6-10%` ink opacity, `80-120 px` cell pitch) with `+` crosshair marks at 4-6 intersections and rapidly cycling monospace telemetry chips in the margins, preserving `>= 65%` uncluttered center space around the focal media or 1-3 word headline.
- **Polarity-flip flash punctuation**: `1-2 frame` stark black/white inversion or single-accent flash (`flashesPerMin` median `5.94`, `p75 19.09`) landing squarely on drum transients or major beat changes.
- **Micro-burst visual proof (`0.13-0.35 s` cuts)**: Show 4-6 distinct outputs, styles, or camera angles in 1.5 seconds while holding ONE pinned typographic anchor or telemetry bar steady across all cuts (so the eye never loses orientation!).
- **Dither / halftone graphic interludes (`shader-dither`)**: Crisp Bayer-matrix or halftone animated monochrome textures punctuated by a single vivid brand accent block.
- **Tactile print/editorial texture**: Subtle fine film grain, crop-mark corner ticks (`14 px` squares or L-brackets), and occasional `2-frame` high-contrast B&W negative flash.

## 7. Hybrid Tech Mix

| Engine | Target Share | Exact Role in `ovyon` |
|---|---|---|
| **2D HTML / CSS / GSAP** | **40-50%** | Oversized 1-3 word kinetic headlines, `micro-ticker` cycling telemetry chips, corner crop marks, `macro-ui` rapid focal punch-ins, hard-cut polarity title cards, end lockup |
| **AI / Live Footage** | **25-35%** | High-contrast monochrome/tinted B&W editorial vignettes, rapid `0.2-0.6 s` capability proof bursts, human/texture/fashion macro clips (graded to match the film's monochrome + 1 accent palette) |
| **WebGL2 / GLSL Shaders** | **15-25%** | `shader-grid` subtle perspective-warped technical hairlines + micro coordinate noise, `shader-dither` animated Bayer/halftone fields, `shader-card` glossy kinetic accent cards |
| **Blender 3D** | **0-15%** | Optional stark monochrome `chrome-object` macro spins or `layers-3d` `fisheye-wall` wide-lens (`18-24mm`) wraparound screen rushes for high-impact `1.2 s` climax beats |

## 8. Pacing & Rhythm (`styles/ovyon/profile.json`)

Measured across 25 Ovyon reference films (17 multi-shot films, 286 pooled shots: `p10 0.10 s`, `median 0.53 s`, `p90 1.47 s`):

| Metric | p25 | Median | p75 | Direction Rule |
|---|---|---|---|---|
| `shotMedian` (s) | `0.250` | **`0.535`** | `0.630` | Fastest style in `eden-motion`: sub-second editorial punch! |
| `shotP90` (s) | `1.047` | **`1.279`** | `1.787` | Even your longest hero beats stay compact (`1.2-1.8 s`) |
| `shotCV` (`std/mean`) | `0.606` | **`0.793`** | `1.304` | High rhythmic contrast: cluster `0.15-0.30 s` bursts around `1.2-1.7 s` anchors |
| `cutsPer10s` | `11.579` | **`13.053`** | `16.358` | 1.1 to 1.6 cuts per second on average |
| `onGrid` | `0.000` | **`0.000`** | `0.000` | Syncopated percussion phrasing, NEVER flat metronomic ticks |
| `flashesPerMin` | `0.000` | **`5.941`** | `19.088` | Intentional flash/whip punctuation on major accents |
| `eventsPerSec` | `1.544` | **`2.953`** | `3.738` | Constant visual electricity (~3 distinct events/sec including ticker swaps) |
| `holdShare` | `0.000` | **`0.072`** | `0.206` | Motion almost never stops completely |
| `longestHold` (s) | `0.000` | **`0.630`** | `1.230` | Keep holds razor-short (`0.6-1.2 s`) on 1-3 word statements |
| `polarityFlips` | `0.200` | **`0.308`** | `0.417` | Every 3rd cut flips dark <-> light for maximum kinetic snap |
| `cutsOnOnset` | `0.167` | **`0.300`** | `0.545` | Highest onset lock in the corpus: tie 30-55% of cuts to percussive transients |

## 9. Sound & SFX Grammar

- **Percussion-first electronic bed (`115-135 BPM`)**: Tight, dry, high-impact minimal techno, UK garage, breakbeat, or percussive synth-bass with razor-sharp snare/kick transients (`cutsOnBeat` `0.216-0.258`, `cutsOnOnset` up to `0.545`).
- **Tactile editorial Foley**: Crisp camera-shutter snaps on `0.2-0.4 s` burst cuts, short metallic/digital ticks on `micro-ticker` cycling values, tight filtered noise whips (`80-120 ms`) on polarity flips, punchy dry sub-kick (`50-70 Hz`) on the `1.2-1.8 s` hero anchor frames.
- **No mushy reverb tails**: Every audio hit is dry, gated, and tight so `13 cuts/10 s` reads with surgical precision rather than turning into sonic mud.

## 10. Anti-Slop Traps & Fixes

| Anti-Slop Trap | Why It Breaks `ovyon` | Concrete Fix |
|---|---|---|
| **Long 8-12 word sentences at `0.5 s` cut speed** | Completely unreadable; viewer gives up instantly | Strict **1-3 word headline cap** per beat; offload extra context to cycling peripheral `micro-ticker` tags or a pinned stem line held across cuts |
| **Uncoordinated chaotic cuts with no anchor** | Feels random and nauseating instead of editorial | Pin either the technical grid + margin `micro-ticker` bar OR a centered headline lockup steady across a `4-6` shot rapid burst |
| **Low-contrast muddy grey visuals** | Loses the signature `contrast ~55.7` editorial bite | Crush-safe deep ink (`#111114`), crisp light paper (`#efeee9`), high-contrast B&W footage grade + `3-5%` film grain |
| **Cluttered center canvas** | Telemetry chips collide with hero type/footage | Lock `micro-ticker` chips strictly inside outer `6-8%` margins or a `40 px` status bar, keeping `>= 65%` clean center space |
| **Stretching `ovyon` past 30 s with no breather** | Causes viewer fatigue | Keep pure `ovyon` reels `8-22 s`; for `25-30 s` feature drops, insert 2 deliberate `1.3-1.8 s` hero breathers (`p90`) |

## 11. Reference Anchors

- **OvyonLabs 25-Film Corpus** (`.cache/study/ovyon/metrics/*.json`, `styles/ovyon/profile.json`): 25 measured short-form reels (`5.5-15.7 s`, 286 shots) establishing `0.535 s` median shot length, `13.05 cuts/10 s`, `55.7` contrast, `30.8%` polarity flips, `2.95 events/s`, and `30-55%` onset cut lock.
- **Editorial Launch Reference** (`research/analysis/editorial-launch.md`): `0.5 s` cold open cuts, `14 px` corner registration marks, `2-4 f` flash montage under one held headline, giant verb typography (`250-925 px`), and letterpress paper + grain discipline.
- **Sume Director Studio (`davidim.mp4`)** (`sheets/davidim-full.jpg`): High-contrast `59.5` hybrid pacing (`holdShare 13.2%`), pinned giant condensed caps across live cuts (`ONE ACTOR.` -> `ANY SCENE.`), and bold kinetic telemetry pricing close.

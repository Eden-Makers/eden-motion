# Hybrid Tech Routing Matrix

Top motion studios never force one rendering stack to carry an entire film. Across 80+ measured references (`research/analysis/universal-craft-invariants.md`), every shot routes cleanly to one of **four specialized engines** based on optical and motion physics, then composites inside HyperFrames so 2D typography and HUD overlays always render at native crisp resolution.

## Golden Rule

- **Never use AI video for UI or typography.** It melts letterforms, breaks kerning, and invents fake controls.
- **Never use CSS 3D `perspective()` to fake photoreal glass/chrome or multi-plane optical DOF.** Flat screenshots skewed `rotateY(38deg)` read as cheap templates.
- **Never use Blender to render flat 2D typography.** Subpixel font hinting and word-synced kinetic pacing belong in HTML/GSAP.
- **Always composite Blender alpha plates (`clip-3d`) and video plates (`media-frame`/`footage`) inside HyperFrames** so HUD badges, captions, and pacing remain 100% seek-deterministic.

---

## Master 4-Engine Decision Matrix

| Engine | Best For | Built-In `eden-motion` Primitives | Cost & Render Speed | Reference Evidence |
|---|---|---|---|---|
| **1. 2D HTML / CSS / GSAP** (HyperFrames) | Editorial typography, razor-sharp flat macro UI close-ups, CLI/MCP terminals, AI streaming answers, live telemetry tickers, live-captured UI clones, 2D diagrams, morphing controls | `headline`, `kinetic-type`, `editorial-headline`, `type-reply`, `slot-line`, `word-swap`, `status-roll`, `macro-ui`, `ui-window` (`mode:"flat"\|"macro"`), `terminal`, `answer-stream`, `micro-ticker`, `ui-morph`, `diagram-draw`, `tasks`, `stat-hit`, `ghost-counter`, `clone-ui` custom scenes | Instant preview, ~1-2 min draft render, native subpixel sharpness | Higgsfield MCP `0:04-0:08` composer macro, Framer selection handles, Raycast search bar, Burnwe hot-tail type, Davidim pricing ticker |
| **2. Real-Time WebGL2 / GLSL / Three.js** (GSAP proxy timeline) | Continuous procedural GPU worlds, glossy monochrome silk folds, grained multi-stop fluid meshes, warped technical grids, Bayer halftone fields, rotating 3D dotted globes with glowing arcs, iridescent foil/glass hero cards | Backgrounds: `shader-silk`, `shader-mesh`, `shader-grid`, `shader-dither`. Scenes: `webgl-globe`, `shader-card`. Custom helpers: `EM.shader()`, `EM.three()` | Zero Blender wait, 100% seek-deterministic frame output | Raycast liquid chrome silk, LandAtlas dotted 3D globe + stat pills, ElevenLabs/Stripe fluid meshes, OvyonLabs technical perspective grids |
| **3. Photoreal 3D / Blender** (Headless Cycles Metal / EEVEE alpha `.webm` plates) | True optical depth of field & rack focus, wide-angle lens warp (`18-24mm`), photoreal chrome/acrylic/glass materials, CG hardware, curved/exploded multi-screen walls, mathematically seamless 3D loops (`loop=1`) | `clip-3d` with `blender:layers-3d` (`stack`, `tower`, `row`, `fan`, `floor`, `carousel`, `wall`, `fisheye-wall`, `exploded`), `blender:chrome-object`, `blender:card-stack`, or custom `blender:./shot.py` | ~1-2 s/frame (EEVEE) or ~4-8 s/frame (Cycles), cached in `assets/3d/` by params hash | Relate Frontier chrome hardware & Ledger acrylic stacks, AlignCanvas carousels & fisheye screen walls, Hlas glowing keycap & 3D screen flythroughs |
| **4. AI Video / Live-Action Footage** | Real humans, organic environments, tactile physical spectacle, real-world lifestyle proof that CG cannot emulate convincingly | `media-frame` (`kind:"video"` or `"image"`), `footage` (`clips/<clip>.mp4` + `_events.json`) | External generation credits or shoot; cap to 0-2 AI video clips per film | Higgsfield MCP live treehouse/carpenter moments, Google Gemini live-action vignettes, Relate B&W documentary inserts |

---

## Surface & Craft Guardrails (All 4 Engines)

1. **Luminance discipline**: Dark canvas floor `>= #0f0f0f` (never pitch `#000000`), light ceiling `<= #fafafa` (`#f0f0f0` paper + `#fefefe` borderless card). Use subtle luminance elevation (+10 to +16 luma points) instead of heavy 1-2 px bright AI borders.
2. **Saturation restraint**: Keep 75-90% of every frame neutral (pooled reference median saturation is `0.185`). Reserve brand accent color strictly for attention pointers (active CTA, hot typing tail, hero stat pill, focal arc).
3. **Flat macro UI first**: Default real product UI shots to `macro-ui` or `ui-window` (`mode: "flat"` / `"macro"`), using magnification jumps (`2.2x -> 1.0x -> 3.4x`) and subtle reading-hold micro-creep (`+4-7%/s`). Reserve 3D depth for genuine Blender `layers-3d` plates with optical DOF.
4. **High shot-length variance**: Reference films average `shotCV = 0.793` (`onGrid = 0.000`). Contrast short kinetic jolts (`0.3-0.7 s`) with deliberate hero holds (`2.0-4.5 s`).
5. **Motion curves**: Arrivals use `expo.out` or `land`, settles use `power2.out`, drifts use `sine.out`. Never use `linear` on element arrivals (verify with `eden-motion measure`).

---

## Recommended Hybrid Tech Mixes by Style

Use `eden-motion treatment <slug>` before storyboarding to budget your exact percentages and justify each layer against the previous film (4-of-6 novelty gate):

| Style | 2D HTML/GSAP | WebGL2 / Three.js | Blender 3D | AI / Live Footage | Typical Background |
|---|---|---|---|---|---|
| `burnwe` | 60-70% | 15-20% | 10-15% | 0-10% | theme default or `shader-mesh` |
| `launch` | 45-55% | 25-35% | 10-20% | 0-15% | `shader-silk` or `shader-mesh` |
| `relate` | 35-45% | 5-15% | 35-50% | 0-10% | `none` (flat `paper`/`black`) |
| `higgsfield` | 45-55% | 10-15% | 5-15% | 25-35% | `hf-grid` |
| `ovyon` | 40-50% | 15-25% | 0-15% | 25-35% | `shader-grid` or `shader-dither` |

---

## Blender `layers-3d` Layout Guide

Use `{"type": "clip-3d", "props": {"src": "blender:layers-3d?images=assets/ui-1.png,assets/ui-2.png&layout=<layout>&..."}}`:

| Layout | Geometry & Camera | Best Beat | Key Params |
|---|---|---|---|
| `stack` | Offset planes stepping back in depth | Product flythrough with rack focus | `move=dolly`, `focus=last`, `fstop=1.8-2.8` |
| `tower` | Vertical stacked column (auto on 9:16) | Portrait / Reels multi-screen flow | `move=dolly` or `float`, `fstop=2.4` |
| `row` | Curved horizontal row facing camera | Feature comparison strip | `move=orbit` or `dolly`, `spin=24` |
| `fan` | Cards fanned around a lower pivot | Options / templates spread | `move=tilt` or `orbit` |
| `floor` | Screens laid on tabletop, high camera | Editorial overview / flatlay | `move=dolly` or `orbit` |
| `carousel` | 360-degree 3D ring orbiting camera with bokeh rear cards | Ecosystem / multi-view hero showcase | `move=orbit`, `fstop=1.8-2.2`, `loop=1` |
| `wall` | Multi-row staggered masonry wall with Z-depth parallax | Scale / library / template breadth | `move=dolly`, `cols=3\|4`, `fstop=2.2` |
| `fisheye-wall` | Concave 5x3 wraparound dome on wide `18-24mm` lens | Dramatic macro-to-wide reveal | `lens=20`, `fstop=2.8`, `loop=0\|1` |
| `exploded` | Aligned UI layers (base, cards, chips) separating along depth at 3/4 angle | Product anatomy / component stack reveal | `move=explode\|assemble`, `fstop=2.0-2.4`, `loop=1` |

Add `&loop=1` on any layout for a mathematically seamless periodic loop (frame `F+1` matches frame `1` with SSIM > `0.9999`, including motion-blur derivatives).

---

## Live UI Clone Workflow (`clone-ui`)

When the hero product already exists on the web (or as a local web app), do not hand-fake its UI:
1. Run `eden-motion clone-ui <slug> <url> --selector "<css>" --trigger hover|click|scroll|load --duration 3` to capture deterministic frames, CSS/WAAPI styles, element motion tracks, fitted easing curves, and optional WebGL uniforms (`--gl`).
2. Refine the generated `projects/<slug>/custom-scenes/<name>.js` starter (strict `EM.scene` contract).
3. Verify motion/pixel fidelity against the live capture with `eden-motion compare <slug> <ref> --at ... --fidelity motion|pixel|mixed [--blur 3] [--region x,y,w,h]`.

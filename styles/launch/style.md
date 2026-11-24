# Launch Style Bible

Obsidian-canvas product keynote style built for flagship developer tools, AI launches, and high-craft software announcements: dark monochrome luxury, monumental negative space, extreme flat 2D macro UI crops, real-time WebGL silk and dotted globes, and unhurried cinematic holds.

---

## 1. Identity & When to Use

- **Core identity**: High-authority dark-mode product showcase where software feels like machined hardware. Massive obsidian negative space (`80-92%` quiet pixels), razor-sharp flat macro UI framing, sweeping WebGL shaders, and bold single-number monumentality.
- **Best fit**:
  - 30-65 s flagship product launches, major v2.0 announcements, developer tools, AI platforms, and design/engineering software (Raycast, Framer Dark, LandAtlas, Linear, Stripe, Gemini Omni).
  - Music-led (no VO) or sparse-VO films that rely on tight 3-6 word headlines, real macro UI demonstrations, and unmistakable brand prestige.
  - Dark-first products whose native interface shines against deep charcoal and specular light.

## 2. What This Style IS NOT

- **NOT a bright daylight corporate explainer**: `darkShare` sits at **`84.4%`** (`p25 76.9%`, `p75 91.7%`), with `mean luma 25.1` (`p25 23.9`, `p75 29.9`). Polarity flips are virtually absent (`median 0.000`, `p75 0.065`).
- **NOT a frantic hyper-cut edit**: Longest median shot length in `eden-motion` (`2.73 s`, `p25 2.38 s`, `p75 3.55 s`) and slowest cut rate (`2.33 cuts/10 s`). Let the craft breathe.
- **NOT pure `#000000` with neon wireframe glow**: True launch dark worlds live in rich obsidian (`#0f0f11` to `#16161a`) lit by subtle specular silk folds, soft horizon radial blooms, or hairline glass rims (`rgba(255,255,255,0.10)`).
- **NOT forced 38-degree CSS 3D tilted screenshots**: Real product UI is filmed flat (`rotateX=0, rotateY=0`) at extreme macro magnification (`2x-3.5x`) or built in genuine Blender 3D / WebGL space with real lighting.

## 3. Color & Contrast Rules

- **Dark ground floor**: Anchor canvas between `#0f0f11` and `#141418` (`mean luma 23.9-29.9`), never dead flat `#000000` (unless using a volumetric specular light ribbon or luminous rim glow that lifts the scene).
- **Controlled low-key contrast**: Measured frame `contrast` sits at `28.6-38.8` (median `31.5`). Avoid harsh pure-white full-frame boxes; elevate UI surfaces softly (`#16161a` / `rgba(20,20,24,0.85)`) with a crisp `1 px` top specular rim (`rgba(255,255,255,0.10-0.14)`).
- **Monochrome-first saturation discipline**:
  - Ultra-minimalist variant (Raycast): near-zero saturation (`0.009-0.070`), pure monochrome silver/graphite light with tiny single-cell highlight accents.
  - Single-glow variant (LandAtlas / Framer / Gemini): `saturation` `0.14-0.28` (profile median `0.162`), driven by ONE atmospheric brand glow (emerald mint `#28e5a8`, electric blue `#3b82f6`/`#5180ee`, or subtle violet rim) appearing as a bottom horizon bloom, glowing arc, or solid high-contrast stat pill.
- **Strict negative space rule**: Maintain `80-92%` quiet flat/gradient pixels (`Motionimo 92.2%`, `Raycast 88.2%`, `LandAtlas 87.5%`, `Framer Dark 79.6%`). Dark space is the luxury material.

## 4. Typography Rules

- **Family**: Clean, authoritative neo-grotesk or geometric sans (`Inter`, `Inter Tight`, `Geist`, `SF Pro Display` / `Google Sans` class). Never decorative display serifs or busy comic/tech-glitch fonts.
- **Two signature scale modes**:
  - **Editorial whisper headline**: Crisp centered single/two-line statement (`48-72 px` at 1080p, weight `500`, tracking `-0.02em`), pure off-white (`#f2f2f5`) with secondary setup words dimmed to `#6e6e78` (`Most` white + `investors` muted grey; `The Operating System` white + `for modern land investors` grey).
  - **Monumental stat hero**: Giant tight-tracked numerals (`180-240 px`, weight `600-700`, tracking `-0.04em`, e.g. `8,000+`, `600+`) centered over a dark 3D globe or staggered cards, punctuated by 2-3 solid bright accent pill badges (`#28e5a8` fill with `#0c1412` ink) offset asymmetrically at top-left and bottom-right corners.
- **Arrival grammar**: Hard word-by-word reveals with zero fade (`4-6 f` stagger) + smooth block re-centering/scale settle (`1.15 -> 1.0`, `expo.out`), OR crisp left-to-right gradient wipe on the payoff word, OR macro live-caret typing inside a focused search/CTA pill (`Get started for free`, `clip -> clipboard`).

## 5. Camera Movement Table

| Shot Role | Camera Move | Speed / Range (1080p) | Easing | Optical Blur |
|---|---|---|---|---|
| Opening macro UI (button / search bar) | Locked or slow creep push-in at `2.5x-3.5x` zoom | Scale `+2% to +5%/s` | Linear / `power2.out` | None (razor sharp text) |
| Macro-to-wide UI reveal | Smooth optical pull-back from `3.0x` focal element to `1.0x` full interface | `0.5-0.9 s` pull-back | `expo.out` / `power4.out` | Optional slight velocity blur on fastest 3 frames |
| Icon / emoji / tile focus glide | Lateral camera pan tracking active selection cell | `140-260 px/s` step-to-step | `expo.out` (`0.25-0.35 s` per hop) | None |
| 3D card scatter / template wall | Slow Z-depth pull-back or wide sweeping pan | Scale `-3% to -6%/s` or pan `100-180 px/s` | `power3.out` | Real Blender optical DOF on peripheral layers |
| Monumental stat + WebGL globe | Subtle push-in while globe rotates steadily | Scale `+2-4%/s`, globe `8-15 deg/s` | Linear rotation, `expo.out` numeral roll | None |
| Tension beat (flip calendar / problem) | Crisp rhythmic punch cuts or rapid center-axis flip | `0.3-0.7 s` per tension beat | `power3.inOut` | Subtle shutter blur on flip only |
| End card / logo horizon bloom | Soft horizon glow rise + calm static lockup | `0.8 s` reveal -> `2.5-4.0 s` hold | `expo.out` | None |

## 6. Signature Moves & Content Fit

- **Extreme flat macro UI + Framer selection guides** (`macro-ui` with `guides: true`): Start zoomed `3x` on a single CTA button or search bar with blinking caret and `1 px` alignment hairlines, then pull back to reveal the complete interface (`Framer Dark`, `Raycast`).
- **Liquid monochrome silk shader backdrop** (`shader-silk`): Slow specular dark folds gliding behind frosted glass inputs, hotkey modals, and minimalist audio waveform pills (`Raycast`).
- **Dotted 3D WebGL globe + rolling stat + bright accent pills** (`webgl-globe`): High-impact proof beat for scale metrics (`Active 8,000+ builders`, `600+ companies`, global latency/network reach) (`LandAtlas`).
- **3D spatial property/feature scatter**: Floating dark cards orbiting a centered headline before coalescing into a full-bleed hero frame (`LandAtlas` opening, Blender `layers-3d` `wall`/`exploded`).
- **Active-cell hairline focus**: Glide across an oversized dark tile grid where ONLY the focused tile lights up with a razor-thin colored border (`Raycast` emoji/command grid).
- **Prompt-to-proof loop**: Dark rim-lit prompt pill (`answer-stream` or `terminal`) -> music strips bass -> full-bleed proof result slams in (`Gemini Omni` / `Motionimo`).

## 7. Hybrid Tech Mix

| Engine | Target Share | Exact Role in `launch` |
|---|---|---|
| **2D HTML / CSS / GSAP** | **45-55%** | Flat `macro-ui` crops with Framer guides, Raycast-style glass command palettes, `terminal` / `answer-stream` prompts, whisper headlines, monumental rolling stat numbers + pill tags, end card |
| **WebGL2 / GLSL / Three.js** | **25-35%** | `shader-silk` dark metallic ribbons, `webgl-globe` dotted 3D sphere with glowing arcs, `shader-card` iridescent glass/foil cards, `shader-mesh` dark horizon blooms, volumetric light waves (`Motionimo`) |
| **Blender 3D** | **10-20%** | `layers-3d` (`wall`, `fisheye-wall`, `exploded`) for dense template mosaics & 3D card scatters with optical DOF, rim-lit hardware silhouettes (`chrome-object`), physical flip-calendar/object metaphors |
| **AI / Live Footage** | **0-15%** | High-craft full-bleed product outputs inside hero frames or brief live-action hand-held device proof shots (`Motionimo` phone-in-hands, `LandAtlas` dusk property hero) |

## 8. Pacing & Rhythm (`styles/launch/profile.json`)

Measured across 5 dark launch reference films (71 pooled shots: `p10 1.03 s`, `median 2.13 s`, `p90 5.10 s`):

| Metric | p25 | Median | p75 | Direction Rule |
|---|---|---|---|---|
| `shotMedian` (s) | `2.375` | **`2.730`** | `3.545` | Deliberate keynote confidence; let viewers absorb macro UI details |
| `shotP90` (s) | `4.810` | **`6.639`** | `7.538` | Anchor every film with 1-2 sweeping `5-7 s` showcase sequences |
| `shotCV` (`std/mean`) | `0.601` | **`0.669`** | `0.809` | Mix snappy `0.7-1.2 s` tension/stat punches with `4-7 s` UI holds |
| `cutsPer10s` | `1.996` | **`2.332`** | `2.976` | Slowest cut rate of all styles; motion happens *inside* the shot |
| `onGrid` | `0.000` | **`0.000`** | `0.000` | Never metronomic |
| `flashesPerMin` | `0.000` | **`0.000`** | `0.998` | Essentially zero flashes; drama comes from light blooms and scale |
| `eventsPerSec` | `0.415` | **`0.595`** | `0.765` | High restraint; one clear visual event every `1.5-2.0 s` |
| `holdShare` | `0.277` | **`0.385`** | `0.587` | Generous reading holds (Raycast reaches `74.7%` hold share!) |
| `longestHold` (s) | `1.600` | **`3.170`** | `7.440` | Unhurried opening/closing and UI comprehension beats |
| `polarityFlips` | `0.000` | **`0.000`** | `0.065` | Stay committed to the obsidian dark world throughout |
| `darkShare` | `0.769` | **`0.844`** | `0.917` | 80-100% dark framing |

**Narrative arc**: Atmospheric macro hook (`0-12%`) -> Tension / old-way friction (`12-28%`) -> Horizon glow brand reveal (`28-36%`) -> Macro-to-wide UI hero demonstration (`36-68%`) -> Monumental scale/stat proof (`68-86%`) -> Minimalist obsidian end card (`86-100%`).

## 9. Sound & SFX Grammar

- **Music bed**: Deep, atmospheric electronic, minimal synth-house, or cinematic bass-driven score (`95-120 BPM`). Uses strong dynamic contrast: strip sub-150 Hz bass completely (`-20 to -30 dB`) during prompt/typing holds, then drop full low-end cleanly on the reveal/proof cut (`prompt = breath, result = drop`).
- **Tactile precision SFX**: Crisp damped mechanical keystrokes (`-12 dB`) during macro search/prompt typing, subtle low-end sub-thud (`45-70 Hz`) on monumental stat reveals and horizon blooms, glassy harmonic click on active tile hops, clean resonant silence on the end card.
- **Onset alignment**: `cutsOnOnset` median `0.226` (`p75 0.333`); lock the 3-4 major structural reveals (brand horizon bloom, UI reveal, stat climax) within `+/- 60 ms` of a strong bass drop or sub hit.

## 10. Anti-Slop Traps & Fixes

| Anti-Slop Trap | Why It Breaks `launch` | Concrete Fix |
|---|---|---|
| **38-degree CSS 3D tilt on product screenshots** | Blurs typography and screams generic SaaS template | Use `macro-ui` flat 2D (`rotateX=0, rotateY=0`) with `2.5x-3.5x -> 1.0x` optical zoom reveals |
| **Pure `#000000` void + loud `#ffffff` 2 px boxes** | Harsh, flat, amateur contrast | Floor at `#0f0f11`, use `shader-silk` or subtle horizon glow, elevate cards to `#18181c` with `1 px rgba(255,255,255,0.10)` top rim |
| **Over-cutting (`> 5 cuts/10 s`)** | Destroys keynote authority and hides UI clarity | Target `2.0-3.0 cuts/10 s` and `>= 38%` calm hold share |
| **Saturated rainbow backgrounds** | Violates `saturation ~0.16` dark-luxury discipline | Keep 85%+ of frame achromatic obsidian/graphite; deploy ONE brand glow hue strategically |
| **Tiny unreadable dashboard dumps** | Impossible to parse on X/mobile feeds | Crop `2.5x-3.5x` onto ONE interaction (search bar, command shortcut, active chart) before pulling out |

## 11. Reference Anchors

- **Raycast Launch** (`.cache/study/launch/04-@raycastapp-Mi173xGb0ZA.mp4`, `sheets/raycast.jpg`): Peak monochrome luxury (`luma 23.8`, `sat 0.009`, `holdShare 74.7%`, `negSpace 88.2%`), `shader-silk` backdrop, `3x` macro search bar, single-cell hairline tile focus, waveform pill close.
- **Framer Dark** (`.cache/study/launch/01-@Framer-6xJWQRVl9nw.mp4`, `sheets/framer-dark.jpg`): `darkShare 99.7%`, `luma 19.8`, macro CTA button typing with alignment guides, razor-sharp flat dark UI, dense template mosaic wall.
- **LandAtlas by Addxstudio** (`.cache/study/launch/06-@addxstudio-9FlQZyVzINo.mp4`, `sheets/addxstudio.jpg`): `darkShare 93.9%`, `shotCV 1.02`, 3D card scatter, flip-calendar tension beat, emerald horizon glow, dotted WebGL globe + giant rolling stat counters + mint pill badges.
- **Motionimo (Google Gemini Study)** (`.cache/study/analysis-2026-11/motionimo.mp4`, `sheets/motionimo-full.jpg`): `negSpace 92.2%`, rim-lit hardware silhouette, volumetric shader waves, Bezier easing-curve anatomy.
- **Google "Meet Gemini Omni"** (`research/analysis/launch-films.md`): Prompt-breath / result-drop audio architecture and frosted glass over full-bleed proof.

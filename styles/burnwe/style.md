# Burnwe Style Bible

Editorial SaaS explainer style built for voiceover-led product storytelling: bright architectural paper surfaces, continuous gliding cameras, Gaussian focus-pull entrances, hot-tail character typing, and crisp vector UI stages that turn complex B2B workflows into calm, high-trust narratives.

---

## 1. Identity & When to Use

- **Core identity**: High-key, sunlit, human-paced product explainer where the camera never stops moving and every transition is motivated by a concrete visual actor (a glowing orb, a cursor click, a card shrinking into an inline word, a gobo light sweep).
- **Best fit**:
  - 45-75 s B2B SaaS and AI workflow explainers with a voiceover (~140-155 WPM, ~150-165 words per minute).
  - Products that need to explain a multi-step problem -> reframe -> workflow -> quantified ROI arc (finance automation, AI ops, project management, enterprise platforms).
  - Brands wanting executive trust, daylight warmth, and effortless phone/desktop legibility over hype or aggressive flash cutting.

## 2. What This Style IS NOT

- **NOT a dark-mode hype reel**: Only 7.4% of shots are dark (`p25 5.7%`, `p75 8.4%`), reserved strictly for brief problem/agitation or "under-the-hood" workflow interludes.
- **NOT a rapid-cut sizzle or beat-grid strobe**: Zero flashes/whips per minute (`0 / 0 / 0`) and zero metronome grid cutting (`onGrid = 0`).
- **NOT raw full-screen browser recordings**: Product UI is rebuilt or framed as clean, uncluttered vector cards floating with soft parallax, never cramped 12-column live screencasts.
- **NOT bouncy cartoon motion**: Zero rubbery spring overshoot (`back.out` / `elastic.out`) on headlines or cards; arrivals land cleanly via Gaussian defocus (`power3.out` / `expo.out`).

## 3. Color & Contrast Rules

- **Ground polarity**: Predominantly luminous light paper (`mean luma 183.4`, `p25 173.6`, `p75 199.1`), never sterile `#ffffff`. Use warm off-white (`#f5f5f5`, `#fbfafb`, `#ebebeb`) paired with subtle soft window-light gobos or pastel vignette haze (`#e2d9e9`, `#f7e4df`).
- **Two-world polarity flips**: Alternate between light (product, proof, CTA) and dark (`#0c0a12`, `#1e3028`, `#2a2c30`) at structural narrative pivots (`polarityFlips` median `0.195`, `p25 0.125`, `p75 0.333`). Problem and agitation live in dark; solution lives in daylight.
- **Low-contrast softness**: Target measured frame `contrast` `30.3-34.2` (median `32.6`). Achieve depth via gentle luminance elevation (`#ebebeb` canvas -> `#fbfbfb` card, +14-16 luma delta) and soft ambient shadow (`0 24px 50px rgba(0,0,0,0.08)`), never thick black borders (`border: 1px solid rgba(0,0,0,0.06)` max).
- **Single-highlighter saturation discipline**: Keep mean frame saturation ultra-low (`p25 0.088`, **median `0.103`**, `p75 0.110`). Reserve the single brand accent (violet-magenta `#4921cf -> #cd4882`, warm coral-orange `#e3671e`, or Ramp lime `#dcf92a`) strictly for: (1) the newest 3-6 typed characters ("hot tail"), (2) one hero keyword per line, (3) active status tags/toggles, and (4) the single hero token (orb/avatar/disc).
- **Photo duotone-to-natural reveal**: Incoming photographs enter with a 2-stop brand duotone grade and resolve smoothly to natural color over `10-15 frames` (`0.4-0.6 s`).

## 4. Typography Rules

- **Family**: Clean geometric or neo-grotesk sans (`Manrope`, `Poppins`, `Inter Tight`, `Plus Jakarta Sans`). Medium/SemiBold (`500-600`) for headlines, Regular/Medium (`400-500`) for UI labels. Never heavy condensed poster display or harsh brutalist mono as primary voice.
- **Scale & hierarchy**:
  - Opening short phrase (2-3 words): cap height `7.5-9.0%` of frame (`80-96 px` at 1080p).
  - Full centered sentence (after fit-to-width zoom-out): settles to `3.5-4.5%` of frame (`38-48 px`), never exceeding `60%` viewport width.
  - Secondary muted words / supporting captions: `55-65%` luminance attenuation (`#8a8580` on light, `#a0a0aa` on dark).
- **Signature delivery**: **Text is written, never plain-faded.** Every primary headline uses a per-character hot-tail typewriter (`16-20 chars/s`, synced to VO syllables): newest `3-6` characters arrive in accent color with `4-6 px` leading blur and cool to ink over `8-12 frames` (`power2.out`).
- **Line choreography**: Use Fit-to-Width Line Zoom (line gently scales down as clauses append), Two-Tone Stacked Lockups (line 1 charcoal ink, line 2 brand accent), or Inline Image Words (a UI/photo card shrinks between two words and collapses smoothly).

## 5. Camera Movement Table

| Shot Role | Camera Move | Speed / Range (1080p) | Easing | Optical Blur |
|---|---|---|---|---|
| Opening hook / calm statement | Continuous slow drift / gentle pull-back | Scale `-1% to -3%/s`, drift `15-40 px/s` | Linear / subtle `sine.inOut` | None (razor sharp) |
| Emphasis / hero feature | Controlled push-in | Scale `+2% to +7%/s` | `power2.out` | None |
| 3D card cloud / multi-panel workflow | Sweeping lateral truck with parallax | `120-450 px/s` lateral + `+3-5%/s` push | `power3.inOut` | Mild velocity-gated directional blur (`8-14 px`) on fastest trucks only |
| Gantt / vertical timeline / flowchart | Crane up or elbow-line tracking | `40-160 px/s` (up to `350 px/s` following connector elbow) | `power2.inOut` | None below 200 px/s |
| Element arrival / exit | Gaussian focus-pull (not directional slide) | Scale `1.05 -> 1.00`, blur `14-20 px -> 0` over `0.35-0.48 s` | `power3.out` / `expo.out` | Gaussian defocus tied to tween progress |
| World switch (dark <-> light) | Exposure ramp + luminance crossfade | Background starts `30-40%` off target luma, settles in `0.4 s` | `power2.out` | Soft bokeh or bloom white-out (`6 f`) |
| End card | Gentle pull-back to clean hold | Scale `-5%/s` settling to static for final `2.0-3.5 s` | `expo.out` | None |

## 6. Signature Moves & Content Fit

- **Hot-tail typewriter + Fit-to-width line zoom** (`type-reply`, `word-swap`): Ideal for problem statements and VO-driven reframes.
- **Cursor as narrative actor**: Eased arc movement, `0.20-0.25 s` hover anticipation pause, tactile click (`scale 0.92`, `80 ms`) triggering a status flip, dropdown, or orange/violet bloom flood into the next world. Add colored multiplayer role pills (`Project Lead`, `Accountant`) for collaborative SaaS.
- **Focused horizontal card carousel**: Feature cards (`Payroll`, `Accounting`, `Travel`) glide horizontally while the active center card scales to `1.12x` with soft shadow lift (`burnwe-05` Peko pattern).
- **Single hero token thread**: Introduce one geometric brand token (glass orb, agent avatar circle, lime disc) in the hook, carry it through workflow diagrams and integration constellations, and land it in the end card lockup.
- **Counting proof metrics**: ROI and efficiency numbers (`+47% -> +85%`, `8x Faster`) tick continuously beside a growing sparkline or bar across the entire VO clause.
- **Exposure-ramped hard cuts**: Soften structural polarity cuts by ramping background luminance over `10-12 frames` as incoming UI cards focus-pull sharp.

## 7. Hybrid Tech Mix

| Engine | Target Share | Exact Role in `burnwe` |
|---|---|---|
| **2D HTML / CSS / GSAP** | **60-70%** | Hot-tail headlines, vector UI cards, cursors with role tags, tables, gantt charts, counting metrics, horizontal card carousels, end card lockup |
| **WebGL2 / GLSL Shaders** | **15-20%** | `shader-mesh` soft warm daylight/pastel aurora backgrounds, drifting window-light gobos, subtle dark-world violet/orange ambient floor glows |
| **Blender 3D** | **10-15%** | `layers-3d` (`carousel`, `exploded`) for genuine multi-depth card clouds with optical DOF, glass/acrylic hero token (`chrome-object` / orb), 3D perspective card sweeps |
| **AI / Live Footage** | **0-10%** | Optional warm human/interior lifestyle cards entering with brand duotone-to-color cross-grade (`10-15 f`), strictly inside rounded UI frames or split proof panels |

## 8. Pacing & Rhythm (`styles/burnwe/profile.json`)

Measured across 6 Burnwe reference films (121 pooled shots: `p10 0.67 s`, `median 2.10 s`, `p90 7.12 s`):

| Metric | p25 | Median | p75 | Direction Rule |
|---|---|---|---|---|
| `shotMedian` (s) | `1.894` | **`2.150`** | `2.380` | Hold one full VO clause per composition (`2.0-3.5 s` visual unit) |
| `shotP90` (s) | `5.457` | **`5.636`** | `6.461` | Include 1-2 extended continuous workflow journeys (`5-7 s`) |
| `shotCV` (`std/mean`) | `0.777` | **`0.798`** | `0.817` | Never cut evenly; pair short `0.8-1.3 s` transitions with `4-6 s` journeys |
| `cutsPer10s` | `3.098` | **`3.265`** | `3.410` | Calm editorial cadence (~1 cut every 3 s) |
| `onGrid` | `0.000` | **`0.000`** | `0.000` | Strictly VO-clause driven, never metronome-locked |
| `flashesPerMin` | `0.000` | **`0.000`** | `0.000` | Zero strobe/flash frames |
| `eventsPerSec` | `0.654` | **`0.747`** | `0.905` | Steady, readable information flow |
| `holdShare` | `0.342` | **`0.411`** | `0.472` | Over 40% of runtime is calm and readable |
| `longestHold` (s) | `2.240` | **`3.175`** | `4.860` | Always allow a `2.5-4.0 s` closing/hero landing hold |
| `cutsOnOnset` | `0.231` | **`0.269`** | `0.403` | Land major world flips on VO pauses or gentle audio swells |

**Narrative arc**: Hook (`0-6%`) -> Problem/Agitation in dark (`6-25%`) -> Pivot question (`25-30%`) -> Brand reveal (`20-38%`) -> Feature walkthrough in daylight (`38-80%`) -> Quantified proof (`80-88%`) -> Calm CTA + Logo (`88-100%`).

## 9. Sound & SFX Grammar

- **Voiceover is the primary conductor**: Warm, conversational, unhurried VO at `140-155 WPM` (~155 words for a 60-65 s film). Every visual cut lands on a VO clause boundary, never interrupting mid-phrase.
- **Music bed**: Uplifting, clean electronic/indie-corporate pulse (`105-120 BPM`), ducked softly (`-14 to -18 dB`) beneath VO, gently swelling during the brand reveal (`20-35%`) and proof climax.
- **Tactile micro-SFX**: Subtle mechanical soft-click on cursor press (`-10 dB`), soft airy whoosh on focus-pull sweeps and card fans, gentle rising harmonic chime on status flips (`On Hold -> Approved`), faint muted key-tick on typed lines (never harsh typewriter clatter).
- **Silence & breath**: Pull percussion back `0.4 s` before the pivot question ("What if...?") and let the final end card ring out over a warm decaying chord tail with zero harsh logo slam.

## 10. Anti-Slop Traps & Fixes

| Anti-Slop Trap | Why It Breaks `burnwe` | Concrete Fix |
|---|---|---|
| **Static PowerPoint freezes** | Kills the signature continuous spatial flow | Apply subtle `+1-3%/s` push or `15-35 px/s` drift to every mid-film shot; only freeze the end card |
| **Hard neon borders & heavy black shadows on cards** | Looks cheap and breaks `contrast ~32.6` softness | Use `#fbfbfb` cards on `#ebebeb/#f5f5f5` with `border: 1px solid rgba(0,0,0,0.06)` and `0 24px 50px rgba(0,0,0,0.08)` |
| **Full cluttered SaaS screenshots** | Unreadable on mobile, explodes edge density (`> 10`) | Strip UI to 3-5 clean focal elements (one metric, 3 table rows, one active button) inside a crisp vector card |
| **Linear or bouncy slides for text/cards** | Destroys editorial restraint | Enter via Gaussian focus-pull (`blur 16px -> 0`, `scale 1.05 -> 1.0`, `power3.out`, `0.4 s`) |
| **Rainbow multi-accent UI** | Violates `saturation ~0.103` invariant | Restrict color to neutral paper + ink + ONE brand accent highlighter |

## 11. Reference Anchors

- **Burnwe Peko** (`.cache/study/burnwe/05-@Burnwe-PBp7_1J2iH8.mp4`, `sheets/burnwe-05.jpg`): Warm coral-red light world (`luma 200.6`, `darkShare 8%`, `negSpace 88.8%`), horizontal elevated feature carousel, brief dark subscription-pain table.
- **Framer Light / Ossie** (`.cache/study/burnwe/02-@Framer-bv936eeoxmQ.mp4`, `sheets/framer-light.jpg`): High-key macro-to-wide UI pull-out (`luma 158.2`, `holdShare 55%`), crisp design-canvas selection handles, skeleton-to-bento assembly.
- **1Deploy / Foyr / Ramp** (`research/analysis/burnwe.md`): Gold-standard 60-70 s VO explainers establishing hot-tail typing, gobo daylight backgrounds, two-world polarity alternation, and cursor-motivated bloom transitions.
- **Zaro / ElevenLabs** (`.cache/study/burnwe/10-ZaroAI_*.mp4`, `07-ElevenLabs-*.mp4`, `research/analysis/launch-type.md`): Statement + typed reply rhythm, inline slot rolls, and warm off-white paper restraint.

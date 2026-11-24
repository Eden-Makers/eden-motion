# Relate Style Bible

Swiss-editorial 3D craft style modeled after Relate Studio (`t.me/relate_studio`): tactile photoreal chrome, brushed aluminum, matte clay, and tinted acrylic hardware composited with razor-sharp neo-grotesk scale extremes, ghost-echo counters, crisp polarity flips, and zero-gutter 2x2 looping showreels.

---

## 1. Identity & When to Use

- **Core identity**: Industrial design meets Swiss graphic typography. Objects are machined, heavy, and physically lit in Blender Cycles/EEVEE (chrome rods, acrylic card stacks, clay architectural rooms, frosted glass letters) and cut against stark high-contrast neo-grotesk typography with zero dissolve fluff.
- **Best fit**:
  - 10-45 s brand identity launches, fintech/crypto/infrastructure promos, hardware/wallet showcases, and looping X autoplay showreels (`2x2` grids, 10-15 s seamless loops).
  - Brands wanting Swiss gallery taste, sculptural physical metaphors (machined blocks, coins, acrylic cards, lenses), and crisp editorial confidence without voiceover.

## 2. What This Style IS NOT

- **NOT flat vector SaaS clipart**: Product UI is rarely dropped onto a plain rectangle; it is mapped onto machined hardware, frosted glass slabs, angled browser stages, or paired directly with photoreal 3D objects (`Cycles`/`EEVEE`).
- **NOT soft blurry corporate transitions**: Zero sloppy opacity crossfades and zero flashes/whips per minute (`flashesPerMin = 0 / 0 / 0`). Cuts are hard, geometric, or shape-matched (an edge-on card stack hard-cutting to an edge-on hardware device).
- **NOT noisy multi-hue chaos**: Strictly ONE disciplined palette per film (monochrome chrome, bank-green + cream, clay + sage, black + neon mint, or saturated acrylic on white).
- **NOT AI-generated typography or fake AI UI**: AI video is strictly limited to occasional B&W graded human/spectacle inserts (`Frontier Traders`, `Propr`), NEVER UI or product geometry.

## 3. Color & Contrast Rules

- **High editorial contrast**: Measured frame `contrast` sits sharply at **`55.2`** (`p25 40.4`, `p75 66.0`), nearly 1.7x higher than `burnwe` (`32.6`) or `launch` (`31.5`).
- **Balanced studio brightness with rhythmic polarity flips**: Mean `luma` is **`152.3`** (`p25 102.3`, `p75 182.7`) with `darkShare 21.1%` (`p75 30.8%`). Almost a quarter of cuts flip dark <-> light (`polarityFlips` median **`0.257`**, `p75 0.395`), using white/black polarity alternation itself as percussive rhythm.
- **One disciplined brand palette per film**:
  - *Chrome Monochrome*: `#fcfcfc` / `#ececec` / `#101012` (near-emissive studio dome with vertical softbox strips so metallic faces carry clean specular gradients).
  - *Bank Green Editorial*: `#081e14` deep forest / `#f5f2ee` warm paper / `#3c8a60` accent.
  - *Clay & Sage*: `#d8d1c9` warm matte clay / `#3e4831` sage / warm sunlight.
  - *Terminal Neon*: `#0d1110` deep slate / `#66d98e` single neon green highlighter.
  - *Acrylic Studio*: High-key `#f7f7f7` white studio with vivid translucent acrylic cards (`saturation` up to `0.45` only on the physical acrylic props; profile median `0.238`, `p25 0.119`).

## 4. Typography Rules

- **Family**: Swiss neo-grotesk (`Neue Haas Grotesk`, `Helvetica Now`, `Aeonik` class; free local stand-ins `Inter Tight`, `Inter`, `Space Grotesk`), Medium or Light weight, tight negative tracking **`-0.02em` to `-0.05em`**.
- **Pairings**:
  - Primary neo-grotesk + **italic serif emphasis word** (1 word per phrase, `Flex` pattern).
  - Primary neo-grotesk + **crisp monospace micro-copy** (`10-12 px`, corner HUD coordinates / version strings, `Ecliptica` / `Quip` pattern).
- **Extreme scale contrast (signature)**: Pair tiny centered editorial captions (`4-9%` of frame height, `44-96 px`) directly against **giant cropped numerals or words (`25-40%` of frame height, `270-430 px`)** intentionally bleeding off the viewport edges.
- **Kinetic text vocabulary**:
  - **Directional ghost-echo counters**: `4-6` trailing copies offset horizontally with opacity `0.60 -> 0.14` and horizontal-only blur (`feGaussianBlur stdDeviation="6..26 0"`).
  - **Per-word focus-in**: `blur 10-15 px -> 0` over `0.40 s` (`0.10-0.15 s` stagger).
  - **Per-line hard pops**: Zero fade, instant snap arrival for brutalist Swiss headlines.
  - **Word carousel**: Active center item `opacity 1.0`, immediate neighbors `0.35`, outer neighbors `0.12`.
  - **Wordmark whip-in**: High-velocity horizontal slide (`expo.out`, `0.6 s`) with real 180-deg horizontal motion blur (`stdDeviation="14 0"`).

## 5. Camera Movement Table

| Shot Role | Camera Move | Speed / Range (1080p) | Easing | Optical Blur |
|---|---|---|---|---|
| 3D chrome / acrylic object vignettes | Smooth orbital drift or slow macro dolly | `6-15 deg/s` orbit, `+2-4%/s` dolly | `sine.inOut` / continuous ease | True Cycles/EEVEE 180-deg shutter blur; shallow DOF on clay/acrylic macros, sharp on chrome |
| UI screen / card slide arrivals | Fast whip-in to long precision settle | `0.2 s` to peak (`~2000 px/s`), `1.0-1.6 s` settle | `expo.out` / `power4.out` | Horizontal directional blur (`feGaussianBlur stdDeviation="12..24 0"`) on fast 3-5 frames |
| Brand marquee / banner ribbon | Strictly constant continuous scroll | `200-240 px/s` (`Quip` measured `219 px/s`) | `linear` (`ease: "none"`) | None |
| Shape-match transition | Identical geometric silhouette aligned across hard cut | `0 f` hard cut (e.g. edge-on card stack -> edge-on device) | Match-velocity continuity | Matched shutter blur across cut |
| 2x2 zero-gutter looping grid | Independent cell cuts on staggered offsets | Seamless periodic loop (`6.0 s` or `10.5 s`) | Per-cell hard cuts | Per-cell native blur |
| End card lockup | Graphic vocabulary build -> wordmark horizontal whip -> step-down hold | `0.6 s` whip + `3.0-4.0 s` calm hold | `expo.out` | Horizontal blur on incoming wordmark only |

## 6. Signature Moves & Content Fit

- **Near-dome studio chrome 3D (`chrome-object`, Blender Cycles Metal)**: Machined blocks, rods, socket screws, coins, or extruded logos lit by an invisible near-field emissive softbox dome (vertical gradient + softbox strips, camera strictly *inside* the dome) composited via transparent VP9/PNG over flat HyperFrames paper.
- **Tinted acrylic / matte clay 3D product stacks (`card-stack`, `layers-3d` `carousel` / `exploded`)**: Edge-on stacks fanning into exploded views with real optical DOF and shape-match transitions (`Ledger`, `Arcus`).
- **Frosted grunge glass letters (`glass-letters`)**: Blurred background footage/3D plate clipped inside giant SVG `<clipPath><text>` + `feTurbulence` frost + glowing stroke rim (`Frontier Traders`).
- **Directional ghost-echo stat counters**: Big rolling metrics leaving horizontal motion-blurred ghost trails (`stdDeviation="N 0"`).
- **Fast micro-label swaps inside held shots**: Logos, currency pairs, or city tags swapping cleanly every `4-6 frames` (`0.16-0.25 s`) while the 3D scene glides calmly behind.
- **Zero-gutter 2x2 seamless loop grids**: Four independent cells (type, chrome 3D, glass letters, UI) cutting on staggered beats, mathematically looped (`loop=1`) for X autoplay.

## 7. Hybrid Tech Mix

| Engine | Target Share | Exact Role in `relate` |
|---|---|---|
| **Blender 3D** | **35-50%** | The signature backbone: Cycles Metal chrome/brushed metal objects (`chrome-object`), matte clay environments, tinted acrylic `card-stack`, `layers-3d` (`carousel`, `exploded`, `wall`) with true optical DOF and seamless `loop=1` renders (`film_transparent=True`) |
| **2D HTML / CSS / GSAP** | **35-45%** | Swiss neo-grotesk headlines, cropped giant numerals, ghost-echo counters, frosted glass SVG letters, linear marquees, fast label swaps, `macro-ui` / live website stages (`Enoki`), 2x2 grid compositing |
| **WebGL2 / GLSL Shaders** | **5-15%** | Dash flow fields (canvas/GLSL deterministic proxy), subtle gradient shaders (`Shio`), `shader-card` holographic/acrylic foil cards when rapid iteration beats Cycles render time |
| **AI / Live Footage** | **0-10%** | Graded monochrome B&W stock/AI inserts (`Frontier Traders` jets/people) or HEX-locked AI icon packs (`Nano Banana Pro`), strictly framed or high-contrast B&W graded |

## 8. Pacing & Rhythm (`styles/relate/profile.json`)

Measured across 29 Relate reference films (18 multi-shot films, 215 pooled shots: `p10 0.13 s`, `median 1.00 s`, `p90 5.67 s`):

| Metric | p25 | Median | p75 | Direction Rule |
|---|---|---|---|---|
| `shotMedian` (s) | `0.948` | **`1.260`** | `2.652` | Punchy `1.0-1.5 s` montage vignettes for promos; `2.5-4.5 s` for pure UI/website showcases |
| `shotP90` (s) | `2.207` | **`5.551`** | `6.782` | Pair `1 s` hard-cut sprints with `4-6 s` hero 3D or UI sequences |
| `shotCV` (`std/mean`) | `0.443` | **`0.712`** | `1.191` | Deliberate contrast between crisp montage beats and calm holds |
| `cutsPer10s` | `2.830` | **`4.041`** | `6.487` | Confident mid-fast editorial pulse |
| `onGrid` | `0.000` | **`0.000`** | `0.000` | Note: 3/18 pure loop reels use a strict `0.73-1.00 s` grid; full promos vary shot length organically |
| `flashesPerMin` | `0.000` | **`0.000`** | `0.000` | Zero flash-frame gimmicks |
| `eventsPerSec` | `0.457` | **`0.700`** | `1.090` | Clean, focused visual events |
| `holdShare` | `0.111` | **`0.277`** | `0.479` | Always leave breathing room for type and 3D materials to register |
| `longestHold` (s) | `0.770` | **`1.930`** | `3.100` | Anchor the end card at `3.0-4.0 s` |
| `polarityFlips` | `0.000` | **`0.257`** | `0.395` | Use crisp white <-> black cuts to punctuate structural beats |
| `cutsOnBeat` (n=10) | `0.044` | **`0.199`** | `0.343` | Promos lock key 3D cuts to 2-beat intervals at `112-129 BPM` |

## 9. Sound & SFX Grammar

- **Two valid audio modes**:
  1. **Silent seamless loop** (branding/website posts, 2x2 grids): Must work 100% muted on X autoplay via pure visual rhythm.
  2. **Electronic promo score (`112-129 BPM`)**: Minimal techno, crisp house, or industrial electronic bed with zero VO.
- **Pre-cut whoosh/riser anticipation**: Signature Relate edit cue: a tight filtered whoosh or mechanical riser **peaks `0.25-0.30 s` BEFORE the picture cut**, pulling the viewer cleanly into the hard cut.
- **Mechanical/tactile Foley**: Metallic clacks on chrome lock-ins, crisp shutter clicks on fast `4-6 f` label swaps, deep sub-bass drop on shape-match transitions, clean musical tail on the 3-4 s end card.

## 10. Anti-Slop Traps & Fixes

| Anti-Slop Trap | Why It Breaks `relate` | Concrete Fix |
|---|---|---|
| **Flat grey washed-out Cycles chrome** | Infinite world HDRIs make flat metallic faces uniform grey | Use a **near emissive studio dome** (`env_dome`, vertical gradient + softbox strips, camera strictly *inside* the dome) |
| **Boolean modifier empty material slot bug** | Blender EXACT booleans leave grey default faces | Always run `ob.data.materials.clear(); ob.data.materials.append(mat)` and set `material_index = 0` on all polygons |
| **Loose tracking & timid font scale** | Destroys Swiss editorial tension | Tighten tracking to `-0.03em` to `-0.05em` and push hero numerals to `28-40%` frame height cropped at edges |
| **Faking chrome/acrylic in flat CSS gradients** | Looks plastic and thin next to real CG | Render true Blender Cycles/EEVEE alpha plates (`film_transparent=True`) and composite 2D HyperFrames type cleanly on top |
| **Slow soft dissolves between shots** | Kills architectural precision | Use hard cuts, polarity flips, or geometric shape-match cuts with pre-cut whoosh anticipation |

## 11. Reference Anchors

- **Frontier Traders** (`research/analysis/relate.md`, `.cache/study/relate/13-relate_studio-2104546001872719872.mp4`): 24 s Swiss montage + 2x2 seamless loop; Cycles chrome in near-dome studio, ghost-echo counters, frosted glass letters, dash flow fields, B&W stock inserts.
- **Ledger (`196.mp4`)**: Pure 3D tinted acrylic card stacks + soft-touch hardware on high-key white (`129 BPM`), edge-on card stack shape-match cut into hardware profile.
- **Arcus (`222.mp4`, `225.mp4`)**: Matte clay & sage 3D architectural world with warm sun, long lens shallow DOF, and 2x2 looping grid.
- **Enoki (`202.mp4`) & WenAltSeason (`211.mp4`)**: Real HTML/CSS website-as-camera-space motion and Figma-canvas kinetic 2D selection typography.

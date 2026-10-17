# Relate Studio - forensic summary of refs 01-12

Method: ffprobe metadata, ffmpeg scene detection (full frame and per quadrant for grid videos), labeled frame grids every 0.25-0.5 s (frames/<basename>/grid), keyframe sheets (frames/<basename>/sheet_k*.jpg), PIL/cv2 k-means palette sampling, librosa tempo/onsets, Gemini 2.5 video pass (cross-checked; Gemini got several things wrong, e.g. it misread the glass letters in 04 and invented music for 11, so my own frames win).

## Overview
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

## Top 4 candidates for 1:1 recreation
1. **04 Frontier Traders (24 s)** - highest craft density with zero AI: Helvetica editorial type, ghost-trail counters, dash flow field, frosted glass letters, chrome hardware, logo build, all on a strict 24-frame cut grid. Blender + HyperFrames, about 30-45 h. Only the B&W pedestrian/car/hand shots need stock. Bonus: building it also delivers **05** (pure 3D, 8-12 h, feasibility 10, the ideal pilot to build the chrome kit first) and **03** (2x2 loop, about 6-8 h extra).
2. **07 Arcus (10.5 s)** - a completely different look: warm clay and sage product world, long lens, shallow DOF, sun light, frosted pills, 2x2 asynchronous grid. Pure Blender (Cycles) plus a HyperFrames grid. The cost is set dressing (desk, office, chair, globe), about 45-60 h, feasibility 8.
3. **02 Flex (42 s)** - the type-led fintech film: light tight sans with serif-italic emphasis, venn line art, 3D metal card fan, UI morphs, rapid city montage. HyperFrames carries about 60%, Blender the cards and props. The stock clips (about 35% of runtime) are licensed footage, not AI, about 25-35 h, feasibility 6. Pick this for the typography and editorial pacing lesson.
4. **11 Enoki (26.6 s)** - the "website as a motion piece" format: macro camera tracks across UI, button press with cursor, DOF push-ins, light/dark alternation, glyph-scramble hero. Pure HyperFrames, about 15-25 h, feasibility 8. Directly reusable for Edenmakers web/product promos.

Why not the others: 01 and 06 rely on AI-generated hero footage (jets, anime creatures; 06 also has Pokemon/One Piece IP). 09 needs a filmed presenter and client slides. 08, 10 and 12 are low-ambition captures. Note 01's HUD type system (boxed-glyph constellation, caption cards, light-leak wipes) is worth stealing as a standalone HyperFrames module even if the jet shots are skipped.

## Relate house style - cross-video patterns
**Edit and rhythm**
- Metronomic hard cuts: exactly 24 frames (04), 36 frames (05), roughly 2 beats at ~112 BPM (01, 02), 1.9 s slide steps (09). There are almost no dissolves, and transitions are hard cuts, whips, or full-frame-to-card morphs.
- A whoosh or riser peaks on each cut (in 04 the accent sits ~0.3 s ahead of the picture cut).
- 2x2 split grids with zero gutters and asynchronous per-cell cuts (03, 07), designed as seamless loops for X autoplay (03 = 6.00 s loop x2).
- Fast label swaps (6 frames) inside a held shot: logos, currency pairs, city names.

**Typography**
- A neo-grotesk at Medium/Light with tight negative tracking (-2% to -4%): Helvetica Now / Neue Haas (Frontier), Neue Montreal style light (Flex), Space Grotesk style (Propr), Inter style (Jupiter, Enoki, wallet). Free stand-ins are Inter Tight, Inter and Space Grotesk.
- Captions are small and centered (about 4-9% of frame height), set against giant cropped numerals or words (25-40% of height).
- Contrast pairing: sans plus serif italic emphasis (Flex), and sans plus monospace micro copy (Quip).
- Recurring text animations: per-word blur-in (blur 10-15 px -> 0, ~0.4 s, 0.1-0.15 s stagger), typewriter with a block cursor, counters with motion-blur ghost trails, glyph scramble, hard per-line pops, and wordmarks that slide in with horizontal motion blur at the end.

**Color**
- One brand palette per film with almost no extra hues: monochrome (Frontier: #FCFCFC / #ECECEC / #000000, 0% saturated pixels), bank green + off-white (Flex: #081E14 / #F5F2EE / #3C8A60), black + neon green (Propr: #040706 / #66D98E), clay + sage (Arcus: #D8D1C9 / #3E4831), ultramarine (wallet: #2610E9), purple glow on near-black (Enoki: #171423 / #784DF6), cyan-green gradient on black for Jupiter assets (#00BEF0 -> #37E4C3 -> #C7F284 on #0A0A0A, stated in their own article).
- Polarity flipping (white frame / black frame) is used as rhythm.

**3D look**
- Two signature material worlds. (a) Chrome or brushed metal on seamless light grey with soft studio HDRI, no DOF, no grain (Frontier, Flex cards). (b) Soft matte clay with warm sun, long lens and shallow DOF (Arcus).
- Glass in two flavors: frosted grunge glass letters with rim light and bloom on black (Frontier), and emerald emissive glass with god rays (Propr).
- UI is turned into physical objects: extruded list cards, curled paper UI, cubes with data faces, metal stat cards.
- Data and trading metaphors are carried by industrial objects (rods, screws, blocks), candlesticks and coins.

**Production model**
- Promos mix three sources: in-house 3D (C4D/Redshift/Octane look), licensed stock graded to the palette, and AI video for spectacle shots (jets, anime). AI stills are used at scale for icons (Nano Banana 2 prompt system with HEX-locked gradients).
- Case-study posts (08-12) are often silent screen captures. Promos have a music bed plus SFX on cuts.
- They deliver for X: 720p/1080p, 24 fps for 3D-heavy work, 30/60 fps for UI captures, square 1:1 for 3D asset showcases.

## Suggested build order
05 (chrome kit, 1 day) -> 04 (reuse kit, add type/flow field/glass) -> 03 (re-cut into grid) -> 11 (HyperFrames-only) -> 07 (clay world) -> 02 (needs stock licensing).

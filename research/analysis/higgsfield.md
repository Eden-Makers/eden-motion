# Higgsfield promo films: forensic breakdown and eden-motion integration

Source posts (fetched 2026-09-24 via api.fxtwitter.com, raw JSON saved next to the videos):

| id | handle | date | len | fps | file | post text (short) |
|---|---|---|---|---|---|---|
| A 2102408690003587156 | @higgsfield_ai | 2026-09-22 | 34.05 s | 24 | `research/refs/hf_2102408690003587156.mp4` | "1 day left to lock in up to 50% OFF Higgsfield API. Build your own AI app with our product endpoints: Higgsfield Genjutsu, Cinema Studio 4.0, Higgsfield Soul. Plus all frontier video and image models through the same API." 405k views |
| B 2102451022216179935 | @higgsfield | 2026-09-22 | 41.30 s | 24 | `research/refs/hf_2102451022216179935.mp4` | "Introducing Higgsfield x Claude Opus 5.5 ... Pair Opus 5.5 with the Higgsfield MCP and turn your most ambitious ideas into complete products. Available on Claude via Higgsfield MCP and in Higgsfield Supercomputer." 2.49M views. Quotes @claudeai 2102435511222890900 |
| C 2092270930634654094 | @higgsfield_ai | 2026-08-25 | 16.02 s | 30 | `research/refs/hf_2092270930634654094.mp4` | "Ox Alpha is now free via Higgsfield Supercomputer for a limited time. We have capacity for 1 quadrillion token per day." 62k views |
| Q (quoted by B) | @claudeai | 2026-09-22 | 20.05 s | 25 | `research/refs/hf_quote_claudeai_2102435511222890900.mp4` | "Introducing Claude Opus 5.5 ..." Not a Higgsfield edit, kept for context only (see end of section 1). |

All 1920x1080 h264, AAC 48 kHz stereo, no voiceover in any of them (music + SFX only).

Method: ffprobe; ffmpeg scene detection (threshold 0.25); 4 fps contact sheets for the whole of every film; every-frame bursts around 22 transitions/effects (frames in `/private/tmp/claude-501/hf-frames/<id>/burst_*.jpg`); pixel palette quantization and saturated-hue medians on full-res frames; librosa beat/onset/RMS; Gemini 3.1 Pro timecoded pass (raw output `/private/tmp/claude-501/hf-frames/gemini/gem_*.md`). Gemini was coarse and often wrong on transitions (it called nearly everything a "hard cut" and missed every glitch/pixel/halftone move), so the tables below are built from the frames; Gemini was used only as a cross-check for content.

Frame numbers: A and B are 24 fps (1 f = 41.7 ms), C is 30 fps (1 f = 33.3 ms). Pixel sizes are at 1920x1080.

---

## 1. Per-video breakdown

### A. "Higgsfield {API}" (34.05 s, 24 fps)

The API launch film. Almost entirely code-like motion graphics and UI mock on a white technical grid. AI footage appears only inside UI frames or grid cells, as proof. Three colour worlds: white grid (default), dark lime HUD (one 2 s moment), lime flood (two 0.2 s moments).

| # | t_in | t_out | dur | content | AI vs code | effect | transition out | text |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.00 | 0.17 | 0.17 | white field, two thin curved guide arcs | code | none | cut | - |
| 2 | 0.17 | 2.95 | 2.78 | logo lockup build: giant crash-in "Hig" (H magenta, 1 f at ~5x, 1 f at ~1.3x, settle by 0.25), type-on wordmark with bar caret, logo scribble draws, `{API}` box glitches mint then lime, magenta circuit trace draws from top-right, "Product Endpoints" pill in bitmap glyphs then magenta fill L to R | code | crash-in type, type-on, glitch block, stroke draw, pixel-type resolve | glitch-out (6 f) | Higgsfield {API} / Product Endpoints |
| 3 | 2.95 | 3.19 | 0.24 | letters drop out at random, each with a small black tag rectangle | code | letter dropout glitch | cut | fragments |
| 4 | 3.19 | 3.77 | 0.58 | grid hairlines slide to a new layout; two cells fill with magenta-to-yellow gradient with vertical bar halftone | code | grid reflow, stripe-gradient cells | cells shrink, reflow | - |
| 5 | 3.77 | 5.20 | 1.43 | chat prompt box, pink x particles in it, types "Build an AI studio app. Connect Higgsfield API" (hot tail lime then magenta), model chip "GPT-6 Astra Ultra" | code (UI mock) | hot-tail typewriter, x-marker particles | cut | prompt |
| 6 | 5.20 | 5.70 | 0.50 | punch-in crop ~5x on the magenta round send button; arrow rotates 0 to 45 deg | code | punch-in hard cut | cut | Astra Ultra |
| 7 | 5.75 | 6.50 | 0.75 | OpenAI logo alone centre; grid lines draw back in | code | line draw | grid reflow | - |
| 8 | 6.50 | 7.60 | 1.10 | "Your interface is ready" resolves from pink/cyan bitmap glyphs to black grotesk in 0.42 s; lime halftone block grows in the cell below; magenta dither gradient in the corner cell | code | pixel-type resolve, halftone grow | wireframe build | Your interface is ready |
| 9 | 7.60 | 8.75 | 1.15 | wireframe (pink/lime placeholder rects with red corner ticks) builds into "Creative Studio" UI: prompt panel + "Video preview" | code (UI mock) | wireframe-to-UI build | colour flash cycle | Creative Studio, Describe your scene, Video preview |
| 10 | 8.75 | 9.00 | 0.25 | same UI, whole frame tinted 1 f each: pale lime, lime-green, magenta-pink, dark magenta | code | colour flash cycle (4 f) | cut into dark | - |
| 11 | 9.00 | 9.54 | 0.54 | dark olive/black HUD: UI panels exploded into 3D layers with lime hairline outlines, crosshair nodes on connectors, concentric neon rings, glowing circular "{API}" emblem; header bar flips salmon then dark | code | exploded UI, neon HUD, rings | cut | Creative Studio |
| 12 | 9.54 | 11.38 | 1.84 | preview panel as a perspective card (rotY ~ -18 deg, lime 2 px frame); AI footage (feet walking, then fighters) revealed by radial pixel-block dissolve 9.71-10.08; panels orbit in 3D 10.5-11.3 with small yellow tracking tags | AI footage inside code | radial pixel reveal, 3D orbit, tracking tags | pink flash 1 f | Describe your scene, 16:9, Cinematic, Generate video |
| 13 | 11.38 | 11.42 | 0.04 | magenta-tinted frame | code | flash frame | cut | - |
| 14 | 11.42 | 12.30 | 0.88 | flat Creative Studio UI on white with the AI fight video (blond fighter vs big man) playing | AI footage in UI | none, slow drift | grid reflow | - |
| 15 | 12.30 | 13.60 | 1.30 | grid reflows: UI panel slides out left, video grows into the hero cell; lime tag "Cinema Studio 4.0" types on; magenta "Generate video" button; magenta dither cell bottom-left | AI + code | grid reflow, tag type-on | glitch cut | Cinema Studio 4.0, Generate video, {API} Connected to Higgsfield. |
| 16 | 13.60 | 13.90 | 0.30 | cells scramble, pink dither noise, "SAME MOVES" in scan glitch | code | scan glitch | cut | - |
| 17 | 13.90 | 18.75 | 4.85 | Genjutsu 3-cell grid: motion reference clip + 2 transferred clips (subway dancer, gym/dance hall, bedroom), cells swap footage every ~0.7 s; 16.75-17.30 two B/W face close-ups (grayscale fade to over-exposed); echo-stack labels | AI footage in code grid | echo type stack, cell swap | cut | MOTION REFERENCE, SAME MOVES, Genjutsu, Transfer motion |
| 18 | 18.75 | 19.22 | 0.47 | Soul: 3 UGC stills in cells, "Generate image" button | AI stills in code grid | none | punch-in + duotone flash | Soul, Generate image |
| 19 | 19.22 | 19.46 | 0.24 | 1 f punch-in ~1.5x with magenta duotone, then model list as horizontal scan-sliced magenta glitch type (4 f) | code | duotone flash, scanline slice glitch | resolve | model names |
| 20 | 19.46 | 21.64 | 2.18 | drum list: 5-7 model names stacked; active line magenta, neighbours dark grey, outer lines light grey with 3-6 px blur; steps up at 19.5, 20.0, 20.5, 20.75, 21.25; bottom-right label types letter by letter with magenta last char | code | drum/slot list, depth blur, hot-tail type | lime flood | ALL TOP MODELS, Wan 3.0 Prime, Grok Imagine 2.0, Seedance 2.5, Kling 3.0, Cinema Studio 4.0, Higgsfield Genjutsu, Higgsfield Soul, AND HIGGSFIELD PRODUCTS |
| 21 | 21.64 | 21.85 | 0.21 | lime (#d4ff19) floods background, list fades to white | code | colour flood | cut to black | - |
| 22 | 21.85 | 22.30 | 0.45 | black: words scattered on a grid in magenta bitmap type (3 f), cut to white with words still scattered, one cyan-inverted frame, words converge into a left-aligned 3-line block by 22.30 | code | scatter-to-set, pixel type, inversion frame | settle | SEEDANCE 2.5 / IN THE U.S / WITH FACE INPUTS |
| 23 | 22.30 | 23.00 | 0.70 | 3-line block + tilted UGC photo in a grid cell, pink halftone brush stroke behind | AI still + code | none, drift | cell swap | same |
| 24 | 23.00 | 24.20 | 1.20 | face photo (pink duotone first, settles to colour over 6 f), "FACE REFERENCE ACCEPTED" typed with a circle spinner that becomes a check | AI still + code | duotone settle, hot-tail type, spinner to check | cells shrink | FACE REFERENCE ACCEPTED |
| 25 | 24.20 | 25.62 | 1.42 | prompt box with thumbnail, "Create a UGC video featuring @image1" (@image1 magenta) | code (UI mock) | hot-tail type | halftone bloom | prompt |
| 26 | 25.62 | 25.87 | 0.25 | magenta radial halftone grows from the send button; background floods lime (#d4ff19) | code | halftone bloom, colour flood | cut | - |
| 27 | 25.87 | 27.67 | 1.80 | AI UGC selfie (woman, lip gloss, Brooklyn street, golden hour); first 4 f solarized magenta/lime thermal duotone settling to normal; caption bar slides in; reference face thumbnail inset top-left, tilted -6 deg, magenta 3 px border | AI footage + code overlay | duotone settle, caption marquee, pixel sparkle edges | cut | CONSISTENT HUMAN FACES |
| 28 | 27.67 | 29.70 | 2.03 | promo: header "N DAY LEFT" counts 7 to 1 in 5 f; "UP TO" + huge magenta "50%" counts 32 to 50 in 0.54 s while rising from below frame; lime stair-step pixel blocks | code | count-up, rise-in, pixel blocks | cut | 1 DAY LEFT, BUILD YOUR OWN APP, SKIP AI R&D, UP TO 50% |
| 29 | 29.70 | 31.75 | 2.05 | bar chart vs fal: Higgsfield bar lime gradient short, fal bar grey tall, grows | code | bar grow | slide up | HIGGSFIELD API / MOST AFFORDABLE ON THE MARKET |
| 30 | 31.75 | 32.00 | 0.25 | grid slides up and out | code | push | cut | - |
| 31 | 32.00 | 34.05 | 2.05 | end card: tiny caps centred, URL at bottom, static | code | none | end | START BUILDING WITH HIGGSFIELD API NOW / OPEN.HIGGSFIELD.AI |

- **ASL**: 31 segments / 34.05 s = 1.10 s. Excluding 9 sub-0.3 s flash/glitch segments: 22 shots, ASL 1.55 s.
- **Pacing curve**: open 2.8 s hold (logo) -> 3-9 s beats of 0.5-1.4 s -> 9-22 s densest (0.25-1.3 s, 7 flash/glitch events in 13 s; one 4.9 s Genjutsu grid that is internally cut every 0.7 s) -> 22-28 s medium (0.7-1.8 s) -> promo/chart/end 2.0 s each. Classic "hold, sprint, land".
- **Palette** (measured on full-res frames): paper `#fcfcfc`/`#ffffff`; ink `#111111`; magenta `#df167f` (text, pills) to `#eb1f98` (pill fill), deep `#a91756`; lime `#d3ff0b` to `#dbff3f` (highlights, flood `#d4ff19`); mint glitch `#4de8b0` (1 transient); HUD world bg `#131813`/`#1a2114`, HUD neon `#b6f03a`, HUD lime lines `#7a971f`; grid hairlines `#1a1a1a` at 1.5 px; secondary grey text `#bca7aa`.
- **Type**: (1) squared tech grotesk for all caps headlines (flat-sided D/O, Space Grotesk / Neue Machina / Geist family look), weight 700, tracking -2% on 3-line lockups, line height 0.95, cap height 5-7% of frame; (2) geometric sans for UI and wordmark-adjacent text (DM Sans/Manrope look), regular/medium; (3) a transient bitmap/pixel font (8-10 px cells) that every headline passes through on its way in. Coloured type carries a faint 2-3 px glow halo. Mono micro-text (random digits) decorates grid gutters at 10-12 px, 40% grey.
- **Sound**: electronic, dense 16ths, tracker reads 83 BPM (felt 166). No VO. RMS jumps from 0.15 to 0.30 at 5.5 s, exactly on the send-button punch-in (the "drop" is the click). Dips to ~0.17 about 0.3-0.5 s before 12.3, 21.6 and 24.2 (breath before reveal). Cuts are not beat-locked: mean cut-to-beat distance 0.21 s vs 0.18 s random.

### B. "Higgsfield MCP x Claude Opus 5.5" (41.30 s, 24 fps)

A co-brand agent demo. Warm Claude-coral palette over white, Higgsfield lime only for Higgsfield actions. Story: photo of a rusty pickup -> agent analyses -> 3D exploded parts with condition scores -> 3D monster-truck build -> 4 AI design variants -> 3D model -> AI hero shot of the truck backflipping in an arena.

| # | t_in | t_out | dur | content | AI vs code | effect | transition out | text |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.00 | 0.25 | 0.25 | cream/peach field with large soft blurred curve shapes (`#e9dbca` to `#eaae96`) | code | slow gradient drift | - | - |
| 2 | 0.25 | 1.23 | 0.98 | co-brand lockup builds: Higgsfield mark draws, letters glitch-type on, coral asterisk arrives as a blurred glow orb that sharpens | code | glitch type-on, glow orb focus | title rises | Higgsfield MCP x Claude |
| 3 | 1.23 | 2.44 | 1.21 | "OPUS 5.5" in a warm serif rises from below with blur (2 f), letters filled with AI texture plates (pebbles, beads, red fruit, olive stones) that swap every 2 f (~12 swaps/s) | AI texture plates in code type | texture-fill type, texture flicker | settle | OPUS 5.5 |
| 4 | 2.44 | 3.67 | 1.23 | texture resolves per letter L to R (3 f stagger, 6-10 px blur) into flat coral gradient `#e0806a` to `#c95a4e`; hold with drift | code | per-letter blur resolve | dip + depth pass | same |
| 5 | 3.67 | 4.33 | 0.66 | frame darkens ~40%, title fades, cross-dissolve into a red/orange depth-map (near = hot orange, far = dark) of the truck, then luma-dissolve into the photo | AI-looking depth pass + photo | depth-pass reveal | cut | - |
| 6 | 4.33 | 5.32 | 0.99 | photo of a rusty red pickup; the front bumper sags and swings (image-to-video) | AI (i2v of a photo) | subtle AI motion | overexpose | - |
| 7 | 5.32 | 5.44 | 0.12 | exposure +2, +4, +2 stops (3 f bloom white-out) | code | overexposure flash | shrink | - |
| 8 | 5.44 | 7.75 | 2.31 | photo shrinks with motion blur into a 128 px attachment thumb inside a chat input card (5 f), "Turn this rust bucket into a monster truck" types with lime/coral hot tail, "Diagnostic Report" PDF chip pops | code (UI mock) | shrink-to-thumbnail, hot-tail type, pop | punch-in | prompt |
| 9 | 7.75 | 9.07 | 1.32 | tight crop on "Opus 5.5 Adaptive" + coral send square; press = button bleaches to cream with a 40 px coral radial glow for 0.7 s, camera drifts up-left ~40 px | code | press glow bloom | whip blur | Opus 5.5, Adaptive |
| 10 | 9.07 | 10.65 | 1.58 | Claude asterisk + status lines, each line types coral then cools to grey | code | agent status, hot-tail cool | blur swap | Analyzing photo input / Analyzing Diagnostic Report about vehicle |
| 11 | 10.65 | 12.46 | 1.81 | bigger 2-line status, asterisk spins, lines cool coral to black | code | same | cut | Checking if this car can handle a monster truck build |
| 12 | 12.46 | 14.23 | 1.77 | clean 3D render of the pickup on grey studio floor, body lifts off the chassis (exploded view), slow orbit; lime pill "ANALYZE" types in below with red hot tail | 3D render or AI in "3D render" style + code pill | exploded view, hot-tail pill | punch-in hard cut | ANALYZE |
| 13 | 14.23 | 15.02 | 0.79 | ~3.2x punch-in on the pill, background at ~20 px DOF blur; pill "breathes" 1.0 -> 0.85 -> 1.15 with lime glow growing to ~40 px; audio dips to 0.12 RMS | code | punch-in, anticipation pump, audio breath | cut to white | ANALYZE |
| 14 | 15.02 | 16.88 | 1.86 | knolling flat-lay of every truck part on white; parts appear first as flat magenta silhouettes, then texture swaps in ~3 f later, staggered TL to BR over ~0.3 s; 16.0 hard cut 1.5x closer | AI flat-lay still + code reveal | silhouette-to-texture reveal, punch-in | cut 2x crop | - |
| 15 | 16.88 | 17.72 | 0.84 | 2x crop on engine head: "Condition" types 1 char/f, yellow box strokes on (4 f), % counts 0 to 67 | code over AI still | label type, box draw, count | cut | Condition 67% |
| 16 | 17.72 | 18.45 | 0.73 | tires: red box, 16% | code over AI still | same | cut | Condition 16% |
| 17 | 18.45 | 20.00 | 1.55 | chassis frame: green box with 15% green fill, 96% | code over AI still | same | cut | Condition 96% |
| 18 | 20.00 | 21.60 | 1.60 | status text (bold lead-in + grey rest) | code | hot-tail type | fade | Frame is in perfect condition. This rig is a prime candidate for mods. |
| 19 | 21.60 | 23.00 | 1.40 | lime Higgsfield icon + status, magenta hot text cooling | code | same | cut | Using Higgsfield to calculate 3D geometry and testing suspension. |
| 20 | 23.00 | 27.00 | 4.00 | 3D build on grey studio: chassis, wheels fly off, orange roll cage wireframe assembles, tyres appear as flat orange clay then texture, micro captions change every ~1 s; slow orbit; RMS peak 0.53 | 3D render (Higgsfield 3D / AI 3D render look) | exploded assembly, clay-to-texture | fade to white | Building the suspension... / Mapping body and wheel mounts... / Adding oversized wheels and tires / Reassembling the final build |
| 21 | 27.00 | 28.50 | 1.50 | status | code | hot-tail type | text shrinks TL | The truck is ready for any challenge. / Generating Monster Truck design visuals. |
| 22 | 28.50 | 30.75 | 2.25 | text shrinks to top-left (0.25 s), 4 AI monster truck renders pop into a 2x2 grid from scale 0.2 + 15 px blur (4-5 f each, 0.15 s stagger); green one gets a grey selection card | AI stills + code | fly-from-depth pop, select | cut | - |
| 23 | 30.75 | 32.27 | 1.52 | status with lime icon | code | hot-tail type | corner expand | Building the final 3D model |
| 24 | 32.27 | 34.50 | 2.23 | text flies to top-left caption; dark card grows from top-left corner (8 f, directional blur on leading edge, 1-2 px red fringe); inside, the truck turntable swaps colour red -> orange -> green, exposure settles over 6 f | 3D/AI turntable in code card | corner-expand, colour swap, exposure settle | fade | Building the final 3D model |
| 25 | 34.50 | 36.50 | 2.00 | question + Yes/No pills; Yes hover coral | code | pop, hover | cut | Compile a universal build guide? Yes / No |
| 26 | 36.50 | 37.42 | 0.92 | download card, blurs out | code | focus out | cut | Full Build Guide / Download |
| 27 | 37.42 | 41.30 | 3.88 | AI hero shot: green monster truck backflip in a packed arena, slow motion, dust, handheld tracking; small white caps CTA centred, static | AI video | slow motion | end | TRY OPUS 5.5 ON CLAUDE WITH HIGGSFIELD MCP |

- **ASL**: 27 segments / 41.3 s = 1.53 s; without the 3 sub-0.3 s events, 24 shots, ASL 1.70 s.
- **Pacing curve**: 3.7 s title -> 4-15 s UI beats 0.8-2.3 s -> 15-20 s scan sequence 0.7-0.9 s (fastest) -> 23-27 s single 4 s build (slowest, loudest) -> 28-37 s beats of 1.5-2.2 s -> 3.9 s AI payoff.
- **Palette**: paper `#fefefe`; cream `#e9dbca`/`#ead4bf`; coral `#d4755f` (Claude accent, send button), coral light `#eaae96`; Higgsfield lime `#ddff2d` (Higgsfield-owned actions only: ANALYZE pill, icon); status colours yellow `#e8e04a`, red `#d0305a`, green `#9ed84a`; grey studio `#dadad7`; ink `#1a1a1a`.
- **Type**: warm high-contrast serif only for "OPUS 5.5" (cap height ~12% of frame); everything else a neutral grotesk (Inter/Söhne look) at 28-40 px for status lines, sentence case, bold lead-in + regular grey tail; CTA in 20 px caps.
- **Sound**: 112 BPM electronic. RMS dips to 0.12-0.18 about 0.5 s before each section reveal (14.5, 22.5, 31.5, 37.0) then jumps (0.47-0.53 at 23-24 s). Cuts land on strong onsets 84% of the time vs 68% random: the only one of the three with measurable sync.

### C. "Ox Alpha, free in Higgsfield Supercomputer" (16.02 s, 30 fps)

A 2.3 s kinetic logo hook that literalises "1 quadrillion", then a chat demo with one comic beat (number types and deletes), a beat-pumped send button, and a caps end card. All code, no AI footage.

| # | t_in | t_out | dur | content | AI vs code | effect | transition out | text |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.00 | 0.23 | 0.23 | magenta neon stroke (20 px glow) draws a "1", turns lime, then solid black | code | light-stroke draw, colour cycle | - | 1 |
| 2 | 0.23 | 0.45 | 0.22 | black "1" holds centre | code | - | - | 1 |
| 3 | 0.45 | 0.70 | 0.25 | zeros sprout from the 1, one per 2 f, each flickering red -> lime -> black, receding in perspective; dust specks | code | sprout, colour flicker, particles | camera swings | 1000... |
| 4 | 0.70 | 1.45 | 0.75 | zeros form a 3D helix chain; camera flies along it; motion blur up to ~60 px; speed streaks | code (3D) | chain flythrough, motion blur | zoom-through the last 0 | 0000 |
| 5 | 1.45 | 1.63 | 0.18 | inside the 0: colours invert to magenta/black/lime concentric rings; brand arrow + pixel ring inside | code | inversion rings | bloom | - |
| 6 | 1.63 | 1.83 | 0.20 | white/lime bloom dissolves the pixel ring | code | bloom dissolve | plexus | - |
| 7 | 1.83 | 2.25 | 0.42 | plexus lines + nodes collapse to centre; "Ox Alpha" letters assemble while 3 black strike lines rotate through, with blur | code | plexus, strike-line assemble | settle | Ox Alpha |
| 8 | 2.25 | 3.70 | 1.45 | lockup: subline words colour-cycle magenta -> lime -> black (2-3 f each, staggered), lime gradient pill with 20 px glow | code | colour-cycle words, glow pill | lines collapse | Ox Alpha / now in Higgsfield Supercomputer / FOR FREE |
| 9 | 3.70 | 4.20 | 0.50 | lines collapse into dashes, camera swings/blurs | code | line collapse | cut | - |
| 10 | 4.20 | 6.50 | 2.30 | prompt box "Ask Supercomputer anything", types "What is your token capacity?"; 6.0-6.5 lime pixel-block band (~200 px, 24 px blocks) sweeps R to L = send | code (UI mock) | typewriter, pixel shimmer sweep | bubble fly | question |
| 11 | 6.50 | 7.20 | 0.70 | message bubble slides to top-right with 8 px blur | code | fly | reply types | What is your token capacity? |
| 12 | 7.20 | 9.40 | 2.20 | reply types; camera pushes to 1.6x; "1,000,000,000,000,0" types then backspaces to "1" (8.0-8.97), holds 8 f, then bold "QUADRILLION" types (11 chars in 5 f) | code | type/backspace gag, push-in | whip | Ox Alpha / We have 1 QUADRILLION |
| 13 | 9.40 | 10.20 | 0.80 | whip left, ~80 px horizontal blur, lands at ~2.2x on "1 QUADRILLION token capacity" | code | whip pan | pull back | 1 QUADRILLION token capacity |
| 14 | 10.20 | 13.00 | 2.80 | pull back: next question bubble, reply "We can do many, MANY things" + fire emoji; blur pull at 11.25, closer crop | code | push/pull, blur swap | cut | How many free... / We can do many, MANY things |
| 15 | 13.00 | 14.20 | 1.20 | lime send button close-up pumps on the beat: 1.0, 0.62, 1.05, 0.75, 1.1, 0.8, 1.2 (every 3-4 f, accelerating like a snare roll), then glow blur out | code | beat pump | cut | - |
| 16 | 14.20 | 16.02 | 1.82 | end card, 20 px caps, 2 lines, static | code | none | end | OX ALPHA AVAILABLE NOW / IN HIGGSFIELD SUPERCOMUPTER FOR FREE (typo is in the original) |

- **ASL**: 16 segments / 16.02 s = 1.00 s; hook section 0-2.25 s has 7 events (0.32 s average).
- **Palette**: paper `#ffffff`, UI card `#f6f6f6`; ink `#1e1f1e`; lime `#c2ff23` to `#d2ff59` (pill `#a8ff4b` to `#d5ff51` gradient); magenta `#e700f2`/`#e403d8` (hook only); red `#c0141a` (zero flicker).
- **Type**: grotesk (Inter look), chat 28-40 px, bold for the key number; end card 20 px caps.
- **Sound**: 89 BPM (felt 178). Onsets dense through the hook; send-button pump matches a roll.

### Q. Quoted @claudeai film (context only)

Not a Higgsfield edit. A strobe montage of curved horizons (planet limb, lace, leaves, pottery, cells) match-cut on the arc, accelerating from 1.0 s to 0.25-0.4 s per image, serif words "There's / more to / discover" pinned at the same screen position across images, end on "Opus 5.5" / Claude asterisk over the planet limb. Useful as a separate technique ("shape match-cut strobe", T24) but it is not part of the Higgsfield DNA.

---

## 2. Higgsfield style DNA (rules with numbers)

1. **The canvas is a technical grid, not a void.** White `#fcfcfc` field with 1.5 px black hairlines forming 2-5 cells, magenta 12 px "x" crosshairs at 3-6 intersections, 10-12 px mono micro-digits in gutters at 40% grey, and 1-2 corner cells with a gradient (magenta->yellow or lime->white) rendered through a halftone, dither or vertical-bar screen. Content lives inside cells.
2. **Layouts reflow instead of cutting.** Grid lines slide to new positions in 0.4-0.6 s (`expo.inOut`) and the content cells resize with them (A 3.19, 12.30). A new "scene" is often the same grid rearranged.
3. **Everything arrives through a digital state.** Headlines pass through a bitmap/pixel font (8-10 px cells) in magenta and cyan for 6-10 f before resolving to vector type; words resolve with 2 f stagger. Footage passes through pixel blocks (radial dissolve, 40-60 px blocks) or a thermal duotone (magenta/lime) for 3-4 f before becoming natural. Nothing fades in.
4. **Micro flashes punctuate every section change.** 1 f full-frame tint flashes (magenta, lime, dark), 4 f colour cycles (white -> lime -> pink -> dark), 3 f overexposure (+2/+4/+2 stops), 1 f punch-in duotone. A has 9 such events in 34 s (one every 3.8 s), B has 3 in 41 s, C has 4 in 16 s.
5. **Two accents, strict roles.** Magenta `#df167f` = product names, CTA buttons, captions, hot text. Lime `#d4ff19` = highlight boxes, "free/new" pills, floods, pixel sparkles. Black ink for everything else. In co-brand films the partner colour replaces magenta (B: coral `#d4755f`) and lime is reserved for Higgsfield-owned actions.
6. **Hot-tail typing everywhere.** Prompts, labels, pills and lists type at 1 char per frame (24-30 chars/s, faster than Burnwe's 17), newest 1-3 chars in magenta/coral/red, cooling to base in 6-10 f. Status lines cool from accent to grey as a whole line in ~0.4 s.
7. **The UI is a mock, rebuilt clean, and the click is the drop.** Prompt box (white card, radius 14-20 px, soft shadow), model chip, round/square send button. The send click is always the biggest moment: punch-in to 3-5x on the button, a bloom (glow 40 px or halftone radial), and the music jumps (A RMS 0.15 -> 0.30 at the click).
8. **Punch-ins are hard cuts, not zooms.** 1.5x, 2x, 3.2x, 5x crops on the same layout, cut on a frame (A 5.20, B 14.23, 16.0, 16.88). Push-ins inside a shot are slower (1.6x over 1.4 s in C).
9. **AI footage is proof inside a frame.** It appears in a UI preview, a grid cell, a perspective card, or with an overlay caption; only the final payoff (B 37.4) is full-frame and clean. Each AI clip holds 0.7-1.8 s, the payoff 3.9 s.
10. **Numbers always perform.** Day countdown 7 to 1 in 5 f, percent 32 to 50 in 0.54 s rising from below with blur, condition 0 to 67% in 0.25 s, a number that types and deletes itself (C). Never a static stat.
11. **Depth is faked with blur and 3D layers.** Drum list outer items at 3-6 px blur; ANALYZE punch-in with 20 px background DOF; exploded UI layers in 3D with lime outlines on the dark HUD; perspective cards at rotY -15 to -20 deg.
12. **Pace: hold, sprint, land.** Logo hold 2.3-3.7 s, then beats of 0.25-1.5 s (ASL 1.0-1.5 s with flashes, 1.5-1.7 s without), a single long 2-4 s "build" beat in the second half, promo/chart/end beats of 2 s, and an end card of 1.8-2.1 s with tiny 20 px caps (cap height ~1.3% of frame), static, no logo animation.
13. **Audio breathes before reveals.** Music RMS drops 35-60% for 0.3-0.5 s right before each major reveal, then returns on the reveal frame. Cuts are not locked to the beat grid (A and C match random), but the click, the flood and the payoff land on hits.
14. **End cards are anti-climactic on purpose.** Plain white, 2 lines of small caps, URL bottom-centre, 2 s. The energy ends on the last demo or AI shot, not on the logo.

---

## 3. Technique catalog (24 techniques)

Legend: **HF** = Higgsfield preset/model that generates it (exact names from the MCP listing, see section 5); **Code** = implementation in eden-motion (GSAP/CSS/ffmpeg). Times in seconds at 24 fps unless noted.

### Typography

**T1. Crash-in lockup** (A 0.17-0.25)
- Params: first 2-4 letters appear at scale 5-6 (overflowing the frame), first letter in magenta; 1 f later scale 1.3; settle to 1 by frame 3. No blur. Then the rest types on at 1 char/f with a 3 px bar caret.
- HF: none (code only). Closest look: Marketing Studio motion "Break Typography".
- Code: `tl.set(head,{scale:5.5,color:magenta},t).set(head,{scale:1.3},t+f(1)).to(head,{scale:1,color:ink,duration:f(2),ease:"expo.out"},t+f(2))`, then `fx.typeText(tl, rest, text, t+f(2), {cps:24})`.

**T2. Pixel-type resolve** (A 1.08-1.46, 6.50-6.93, 19.30-19.46, 21.85-22.10)
- Params: each word first renders as a bitmap glyph (8-10 px cells) in magenta or cyan with a 3-6 px RGB offset, for 6-10 f, then snaps to vector black; words staggered 2 f; optional 1 f colour inversion frame (cyan on white).
- HF: none direct. Look reference: Marketing Studio motion "One Bit", "Pixel Block Yard".
- Code: render the word twice: a pixel layer (`font-family: "Press Start 2P"` or a canvas-rasterised copy scaled up with `image-rendering: pixelated`) and the vector layer. `tl.set(pix,{autoAlpha:1},t).set(pix,{x:"+=4"},t+f(2)).set(pix,{autoAlpha:0},t+f(8)).set(vec,{autoAlpha:1},t+f(8))`. Deterministic jitter from `ctx.rng`.

**T3. Scanline slice glitch** (A 19.30-19.43, 13.60-13.90)
- Params: text split into 4-6 px horizontal slices, each shifted x by rng(-30, 30) px, 20% of slices dropped, magenta; 4 f; a dashed pink scan bar runs across the top edge.
- HF: Marketing Studio motion "Shutter Bands" (bands), viral "Fragments".
- Code: clone the element N=12 times inside `overflow:hidden` strips (`clip-path: inset(y0 0 y1 0)`), `tl.set(strips[i],{x: rng()*60-30}, t+k*f(1))` for k in 0..3, then set all to 0. Or ffmpeg post: `geq` with row-dependent offset for the flagged frames.

**T4. Hot-tail type, fast variant** (all three)
- Params: 1 char per frame (24-30 cps), newest 1-3 chars magenta/coral/red, cool 6-10 f; status lines cool as a block from accent to grey (#8a8a8a) in 0.4 s; bold lead-in words stay black.
- HF: none (code). This is `fx.hotType` with `cps: 26, cool: 0.3`.
- Code: already exists; add `tailColor` prop and a `lineCool` mode that tweens the whole line colour after the last char.

**T5. Echo stack** (A 14.0-18.5)
- Params: 4-6 copies of a label stacked at 14-16 px steps (downward for one label, upward for its partner), opacity 0.8 -> 0.15, colour magenta -> pale pink (or grey -> cyan), each copy appears 2 f after the previous, retracts after ~0.4 s, loop period ~0.8 s; a blinking 10 px "x" marker under it.
- HF: Marketing Studio motion "Echo Wave".
- Code: `fx.echoStack(tl, el, t, {copies:5, dy:15, stagger:f(2), hold:.4, dir:1})` creating clones with `aria-hidden`, animating `y` and `autoAlpha`; loop by scheduling explicit repeats up to scene end (no `repeat:-1`).

**T6. Drum list with depth blur** (A 19.46-21.64)
- Params: 5-7 lines, line pitch ~1.15 em; active line magenta 64 px, next ring dark grey 56 px, outer ring light grey 48 px with 3 px / 6 px blur; step = one line up in 0.2 s `power3.inOut`; steps every 0.25-0.5 s (on beats or VO onsets); a corner label types with a magenta last char.
- HF: Marketing Studio motion "Slot Roll", "Word Roll".
- Code: stack of spans in a column; per step, tween the column `y` by pitch and re-tween each span's `color`, `fontSize` (as scale) and `filter` from its new distance to the centre.

**T7. Scatter-to-set headline** (A 21.85-22.30)
- Params: words start at grid-snapped scattered positions (random x within the 12-col grid, 3 rows) on black in magenta pixel type (3 f), cut to white, 1 inversion frame, then words fly to a left-aligned 3-line block in 8 f `expo.out`; middle line magenta.
- HF: none. Look: Marketing Studio motion "Falling Type Mosaic".
- Code: measure final positions (layout pass), set `x/y` offsets from `ctx.rng` snapped to 80 px, tween to 0.

**T8. Texture-fill display type** (B 1.23-3.10)
- Params: big serif word, `background-clip:text` filled with image plates; plate swaps every 2 f for ~1.2 s (8-12 plates); then per-letter resolve L to R (3 f stagger) to a flat 2-stop gradient with a 6-10 px blur crossfade. Enters rising 60 px from below with 12 px blur in 2 f.
- HF: plates from `nano_banana_pro` (or Soul Cinema `soul_cinematic`) as seamless macro textures; viral "Magazine"/"Marble" for looks.
- Code: `EM.scene("texture-type")`: per-letter spans, each with `background-image` set to the current plate; `tl.set(letters,{backgroundImage:url(p[k])}, t+k*f(2))`; resolve by crossfading a second gradient-filled copy per letter.

**T9. Colour-cycle words** (C 2.17-2.40)
- Params: each word steps magenta -> lime -> black, 2-3 f per colour, 2 f stagger between words; no motion.
- HF: none (code).
- Code: `tl.set(w,{color:m},t+i*f(2)).set(w,{color:l},t+i*f(2)+f(2)).set(w,{color:ink},t+i*f(2)+f(5))`.

### UI choreography

**T10. Send click = drop** (A 5.20, A 25.62, B 7.75-9.0, C 6.0, C 13.0)
- Params: hard cut to a 3-5x crop of the send button; the arrow rotates 0 -> 45 deg in 4 f; the press is either (a) bleach to cream + 40 px radial glow in the accent, 0.7 s, or (b) a halftone radial bloom (T15), or (c) a lime pixel shimmer band sweeping R to L across the prompt bar (24 px blocks, 200 px band, 0.5 s), or (d) a beat pump (scale 1.0/0.62/1.05/0.75/1.1/0.8/1.2 every 3-4 f). Music jumps on the click frame.
- HF: none (code).
- Code: new `fx.pressBloom`, `fx.pixelShimmer`, `fx.beatPump(tl, el, times)`; the punch-in is the `punch-in` transition (section 4).

**T11. Shrink-to-attachment** (B 5.44-5.65)
- Params: full-frame photo scales to a 128 px thumb at the prompt card's attachment slot in 5 f, 15-20 px motion blur along the path, radius 0 -> 14 px, lands 1 f oversized then settles.
- HF: none (code).
- Code: FLIP between the media element and the slot (`fx.layoutCenter`), `tl.to(img,{x,y,scale,borderRadius:14,duration:f(5),ease:"expo.in"})` plus velocity blur (see motion blur note in burnwe.md).

**T12. Agent status stream** (B 9.1-12.4, 20.0-23.0, 27.0-28.5, 30.75-32.2)
- Params: 20-24 px brand glyph (asterisk or Higgsfield icon) spinning 180 deg/s left of 1-2 lines; line 1 types in accent and cools to grey; line 2 follows; the next status replaces it with a 6 f blur swap; sizes 28-40 px, left aligned at x = 38% of frame.
- HF: none (code).
- Code: `EM.scene("agent-status")`, props `{steps:[{icon, lines:[...], bold}]}`, uses `fx.hotType` + `fx.focusOut`.

**T13. Condition scan (box + label + count)** (B 16.88-20.0)
- Params: hard-cut crops (2x) of a flat-lay; label types 1 char/f; box strokes on in 4 f (2 px); percentage counts up in 0.25 s top-right inside the box; colour by value: <30 red `#d0305a`, 30-80 yellow `#e8e04a`, >80 green `#9ed84a` with 15% fill; each crop holds 0.7-1.5 s.
- HF: flat-lay from recipe `flatlay` (product recipes) or `nano_banana_pro`.
- Code: `EM.scene("condition-scan")`, props `{image, crops:[{x,y,w,h,label,value}]}`; box via `fx.draw` on an SVG rect, value via `fx.countUp`.

**T14. Wireframe-to-UI build** (A 7.60-8.75)
- Params: placeholder rects in pink/lime with red corner ticks draw first (0.3 s), then real UI panels fade in over them in 0.4 s; tags "16:9", "Cinematic" pop 2 f apart.
- HF: viral "Windows" (overlapping UI windows) for an AI-rendered version.
- Code: extend `ui-window` with `wireframe:true` (draw rect outlines with `fx.draw`, then `fx.focusIn` the panels).

### Transitions and image treatments

**T15. Halftone radial bloom** (A 25.62-25.87)
- Params: magenta dot screen (dot pitch 12 px, dot size = radial falloff) centred on the button, radius 100 -> 700 px in 5 f; background floods lime `#d4ff19` on f 3; hard cut to the next shot on f 6.
- HF: Marketing Studio motion "Halftone Street Collage" (look).
- Code: a canvas or CSS `radial-gradient` masked by a `radial-gradient(circle, #000 35%, transparent 36%) 0 0/12px 12px` dot pattern; tween mask size.

**T16. Radial pixel-block reveal** (A 9.71-10.08)
- Params: footage appears inside a growing disc whose edge is made of 40-60 px square blocks (lime tinted, glowing), 9 f; interior starts over-exposed/pink and normalises; the last edge blocks pop off 2 f after the disc fills the frame.
- HF: Marketing Studio motion "Pixel Block Yard", "Blocks".
- Code: CSS grid of block divs over the media, each block's reveal time = distance-from-centre / speed + rng jitter(0-2 f); `tl.set(block,{autoAlpha:0},tb)` with a lime flash 1 f before.

**T17. Thermal duotone settle** (A 25.87-26.04, 23.0)
- Params: the first 2 f of a new AI shot are a solarized magenta/lime gradient map, 1 f posterized half-way, natural by f 4. Also used as 1 f punch-in flash (A 19.22).
- HF: viral "Two color", "Acid", "Toxic", "Ultraviolet"; or `kling_video_edit` / `seedance_2_5` mode `video_edit` to bake it.
- Code: SVG filter `feColorMatrix` + `feComponentTransfer` (table values for a 3-stop map) on the media, `tl.set` the filter's mix via two stacked copies (graded copy opacity 1 -> 0.5 -> 0 over 4 f). ffmpeg alternative: `curves` + `colorbalance` on the first 4 frames of the clip.

**T18. Colour flash cycle / flash frame** (A 8.75-9.0, 11.38, 21.64)
- Params: 1 f per colour, overlay blend `multiply` at 60-80%: pale lime, lime-green, magenta, dark; or a single 1 f magenta/lime flood; always on a section change.
- HF: viral "Random Glow" (look).
- Code: a full-frame overlay div, `tl.set` backgrounds per frame. Transition `flash-cycle`.

**T19. Overexposure bloom-out** (B 5.32-5.44)
- Params: exposure +2 / +4 / +2 stops over 3 f (brightness 1.8 / 3.5 / 1.8, contrast 0.8), highlights clipping to white first.
- HF: viral "Overexposed".
- Code: `filter: brightness() contrast()` stepped with `tl.set`, or transition `overexpose`.

**T20. Depth-pass reveal** (B 3.67-4.33)
- Params: previous shot dims 40% (4 f); cross-dissolve into a colourised depth map (magma ramp, near = orange `#ff7a1a`, far = near black) of the next image, held 8 f with a slow push; luma-keyed dissolve into the photo over 4 f (bright areas first).
- HF: depth map from Magnific `images_depth_map` (outside Higgsfield) or viral "Lidar transition" for an AI-generated version.
- Code: stack depth PNG (colourised offline with ffmpeg `lut1d`/`pseudocolor=preset=magma`) and photo; photo revealed via `mask-image` using the depth map's luminance with a tweened threshold (CSS `mask` + `mask-mode: luminance`, threshold animated through a `linear-gradient` levels trick) or pre-render the dissolve in ffmpeg (`blend=all_expr`).

**T21. Punch-in hard cut** (A 5.20, B 14.23, 16.0, 16.88)
- Params: next shot = same composition cropped 1.5x, 2x, 3.2x or 5x on the subject, cut on one frame, background gets 12-20 px DOF blur at 3x+; the element then "breathes" (scale 1 -> 0.85 -> 1.15 with glow) for 0.6-0.8 s during the audio breath before the reveal.
- HF: recipe `feature-zoom` (stills), `push-in` (video).
- Code: transition `punch-in` with prop `scale` and `target` (element to centre on), zero-length cut + optional `breathe:true`.

**T22. Corner-expand card** (B 32.27-32.60)
- Params: text shrinks to a 14 px caption top-left in 0.25 s; a dark media card grows from the top-left corner to 1560x880 in 8 f `expo.out`, 20 px directional blur on the leading right/bottom edges, 1-2 px red fringe; content exposure -40% -> 0 over 6 f.
- HF: none (code). Look: Marketing Studio motion "Frames", "Corners Pop".
- Code: animate `clip-path: inset()` from `inset(0 100% 100% 0 round 16px)` to `inset(0 0 0 0 round 16px)`, plus a blurred duplicate of the edge.

**T23. Fly-from-depth grid pop** (B 28.55-29.1)
- Params: 2x2 (or 3-up) images, each from scale 0.2, blur 15 px, opacity 0 to scale 1, blur 0 in 4-5 f `expo.out`, 0.15 s stagger in reading order; a selection = grey card behind the chosen one.
- HF: images from `nano_banana_pro` / `soul_2` batch (4 variants from one key image).
- Code: `fx.focusIn(tl, cells, t, {scale:0.2, blur:15, dur:f(5), stagger:.15})`.

**T24. Number chain flythrough / zoom-through the glyph** (C 0.0-1.63)
- Params: a glyph sprouts copies (one per 2 f, receding), they form a 3D helix; camera travels along it for 0.75 s with up to 60 px motion blur; ends by flying through the counter of the last "0" into an inverted ring world (magenta/black/lime) for 3 f, then a bloom.
- HF: viral "Eyes in" (dive through an opening), "Earth zoom" (one unbroken plunge).
- Code: CSS 3D (`preserve-3d`, `translateZ`) chain positioned on a helix (x = r cos a, y = r sin a, z = -k i), camera = parent `translateZ` tween; supersampled motion blur (tmix) at render; the ring world = 4 concentric circles with inverted palette. Also the existing `zoom-through` transition can be driven into the counter.

**Extra (from Q, not Higgsfield): Shape match-cut strobe.** Images sharing one shape (horizon arc) aligned to the same screen position, cut at 1.0 s then accelerating to 0.24-0.4 s, words pinned in place across cuts. Code: `montage` scene with `align:"arc"` metadata and an accelerating cut list.

---

## 4. Integration proposal for eden-motion

### 4.1 New code scenes, transitions and helpers

Scenes (`runtime/scenes/*.js`, `EM.scene(name, {build})`, all copy from props):

| scene | props (storyboard.json) | notes |
|---|---|---|
| `grid-stage` | `cells:[{x,y,w,h,fill:"media"\|"text"\|"stripe-gradient"\|"halftone"\|"dither"\|"blank", src?, text?, tag?}]`, `layouts:[[cells...],...]`, `reflowAt:[s,...]` (or `reflowOnWords:[...]`), `crosshairs:4`, `microDigits:true`, `lineWidth:1.5`, `tone:"light"\|"hud"` | The Higgsfield canvas. Reflow tweens every line and cell rect 0.5 s `expo.inOut`. Children can host other scene content (media, prompt box). |
| `glitch-lockup` | `wordmark`, `badge` ("{API}"), `badgeColor:"lime"`, `pill` ("Product Endpoints"), `crashScale:5.5`, `trace:true` | T1 + T2 + stroke-drawn circuit trace + pill fill L to R. |
| `drum-list` | `label`, `items:[...]`, `active:[indices or times]`, `stepEvery:0.44` or `stepOnWords`, `tail` (corner label), `blur:[0,3,6]` | T6. |
| `scatter-set` | `lines:[{text, accent?}]`, `scatterBg:"black"`, `grid:80`, `settle:0.33` | T7 (+ T2 inside). |
| `texture-type` | `text`, `font:"serif"`, `plates:[paths]`, `swapFrames:2`, `resolveTo:["#e0806a","#c95a4e"]`, `resolveAt` | T8. Plates come from the AI route. |
| `agent-status` | `steps:[{icon:"asterisk"\|"brand", lines:[{text, bold?}], at?}]`, `accent` | T12. |
| `condition-scan` | `image`, `crops:[{x,y,w,h,label,value}]`, `holdEach:0.8` | T13; first beat shows the whole flat-lay with silhouette-to-texture reveal (`silhouette:true` needs a mask PNG or alpha). |
| `split-cells` | `cells:[{src, label, labelEcho?:true, tag?}]`, `swap:[{cell, src, at}]`, `button:{text}` | Genjutsu-style 3-up comparison with echo labels (T5). |
| `hud-explode` | `layers:[{src or ui}]`, `emblem`, `rings:4`, `tilt:{rx:12, ry:-22}`, `neon:"#b6f03a"` | Dark lime HUD world with exploded UI and crosshair connectors. |
| `persp-card` | `src`, `rotY:-18`, `frame:"lime"`, `reveal:"pixel-radial"`, `tags:[...]` | T16 reveal inside a perspective card, optional orbit. |
| `caption-bar` (overlay) | `text`, `color:"magenta"`, `sparkle:true`, `inset:{src, rot:-6}` | AI-shot overlay: marquee-in caption with lime pixel edges + reference thumbnail. |
| `promo-count` | `kicker:{from:7,to:1,suffix:" DAY LEFT"}`, `prefix:"UP TO"`, `stat:{from:32,to:50,suffix:"%"}`, `sub:[...]`, `blocks:true` | T10-style numbers; extends `stat-hit`. |
| `number-chain` | `glyph:"1"`, `count:12`, `helix:{r:260, pitch:180}`, `enterAt:"last"`, `ringsPalette` | T24 hook. |
| `endcard-caps` | `lines:[...]`, `url`, `size:20` | Plain white, 2 s. |

Transitions (`runtime/transitions.js`, `T(name, ({tl, prev, next, at, d}) => ...)`):

| transition | props | frames |
|---|---|---|
| `flash-cycle` | `colors:["#e5f5b0","#b8e04a","#e0379a","#1a2114"]`, `blend:"multiply"` | 1 f per colour |
| `flash-frame` | `color`, `frames:1` | 1-2 f |
| `overexpose` | `stops:[2,4,2]` | 3 f |
| `pixel-dissolve` | `block:48`, `origin:"center"\|[x,y]`, `tint:"lime"`, `radial:true` | 8-10 f |
| `halftone-bloom` | `origin` (element id or xy), `dot:12`, `color:"magenta"`, `flood:"lime"` | 5-6 f |
| `grid-reflow` | `from` layout, `to` layout (only between two `grid-stage` scenes) | 12-14 f |
| `punch-in` | `scale:3`, `target`, `dof:16`, `breathe:false` | 0 f cut |
| `shrink-to-thumb` | `target` (slot selector in next scene) | 5 f |
| `corner-expand` | `corner:"tl"`, `fringe:true` | 8 f |
| `depth-pass` | `depth` (png), `ramp:"magma"` | 16 f total |
| `duotone-settle` | `colors:["#e0379a","#d4ff19"]`, `frames:4` | 4 f (applies to next scene's media) |
| `scan-glitch` | `slices:12`, `maxShift:30` | 4 f |
| `whip` (extend) | add `blurPx:80`, `dir` | 3-4 f |

Helpers (`runtime/fx.js`): `fx.pixelType`, `fx.echoStack`, `fx.colorCycle`, `fx.pressBloom`, `fx.pixelShimmer`, `fx.beatPump(tl, el, times)`, `fx.scanSlice`, `fx.hotType` gains `{cps, tailColor, lineCool}`. Tokens: add a `higgsfield` tone/brand preset in `base.css` (`--accent:#df167f; --accent2:#d4ff19; --bg:#fcfcfc; --line:#1a1a1a; --hud-bg:#131813; --hud-neon:#b6f03a`) so the style can be applied to any brand by swapping the two accents. Style law additions for this tone only: rule 1 ("no overshoot, focus pulls") is relaxed to "arrive through a digital state (pixel, halftone, duotone) in 3-10 f"; flash frames are allowed (max 1 every 3 s); `filter: blur` budget stays under 12 elements (pixel blocks are opacity only).

### 4.2 "AI shot" route (Higgsfield models and presets per storyboard need)

Add `type: "ai-shot"` to storyboard.json with `{need, model, refs, prompt, dur, cutIn, cutOut, frame:"full"|"card"|"cell"}`; the render step fetches the clip, trims `[cutIn, cutOut]` and places it in the named frame. House rules apply: stills via Nano Banana Pro (in Magnific by default, `nano_banana_pro` on Higgsfield as fallback); Flux is banned, so `flux_3_video` / `flux_2` are never used; always `no music` in the prompt; render **3 s longer than the cut**; set `generate_audio:false` (or `sound:"off"`) because the audio step owns the mix; look at every generation before it becomes an input; log prompt + job id into the project folder.

| storyboard need | Higgsfield model / preset | notes |
|---|---|---|
| Cinematic narrative proof shot (fight, drama) | `cinematic_studio_3_0` (Cinema Studio Video 3.0), `genre:"action"`, 1080p; or `cinematic_studio_video_v2` with `speedramp:"impact"` and `multi_shots` | A's fight clip is "Cinema Studio 4.0" in the film; 3.0 is what the MCP exposes today. |
| Multishot from 2+ reference images | `seedance_2_0` (images as `image_references`), `seedance_2_5` mode `omni_reference` (up to 30 s) | Timecoded beats (templates below). |
| UGC selfie with a locked face | `seedance_2_0` / `seedance_2_5` omni_reference with the face as `image_references`; face still from `soul_2` (Soul 2.0) or `soul_cast` | A 25.9 "Consistent human faces". |
| Motion transfer "same moves" | `hf_mult_motion_control` (Genjutsu motion transfer): 1 `video_references` + character `image_references` | A 13.9-18.7. |
| Replace an object in existing footage | `hf_mult_replace_object` (Genjutsu object replacement) | Brand product swaps. |
| Animate a still (bumper sag, subtle life) | `kling3_0` (image as start frame, but prompt as reference), `seedance_2_0` | B 4.3. |
| Hero product payoff, slow motion | `cinematic_studio_video_v2` `speedramp:"slowmo"` or `seedance_2_0` `genre:"action"` | B 37.4 truck backflip. |
| Clean 3D software turntable / exploded view | viral preset "3D render" (look); real mesh: `meshy_v7_image_to_3d` or `tripo_h3_1_image_to_3d` from the hero still, then Blender or scene builder turntable | B 12.5, 23.0, 32.3. |
| Knolling flat-lay of parts | product recipe `flatlay` or `nano_banana_pro` 4K, plus `image_background_remover` for silhouettes | B 15.0. |
| Texture plates for `texture-type` | `nano_banana_pro` 2K, 8-12 plates, "seamless top-down macro of ..." | B 1.2. |
| 4 design variants from one key image | `nano_banana_pro` edits of one key image (colour/material variants), not 4 fresh generations | B 28.5. |
| Stylised look pass on a finished clip | `seedance_2_5` mode `video_edit`, `kling_video_edit` (Kling 3.0 Omni Edit) | duotone/thermal or restyle; or viral "Two color", "Acid", "Overexposed". |
| Surreal VFX hooks | viral presets "Eyes in", "Earth zoom", "Bullet time", "Cutout", "Lidar transition", "Act natural", "Frozen in motion", "Clones", "World morphing", "Melting", "Vanish" | `execute_preset` only after explicit approval (credits). |
| Camera recipes on product | recipes `push-in`, `pull-back`, `whip-pan`, `crane-reveal`, `product-spin`, `half-turn`, `light-sweep`, `impact`, `macro-glide`, `detail-scan`, `topdown-dive`, `sunrise-pass` | resolve with `get_preset_instructions`. |
| Upscale / clean | `bytedance_video_upscale` preset `aigc`, `topaz_video`, `video_deflicker` | before placement in full-frame shots. |

Prompt templates (direct, timecoded, one copy-paste prompt per shot; durations are cut length + 3 s):

UGC selfie with locked face (Seedance 2.0, 8 s for a 5 s cut, refs: @image1 = face still, @image2 = product):
```
@image1 is the woman, keep her face exactly. @image2 is the lip gloss she holds.
Handheld front-camera selfie, arm's length, golden-hour Brooklyn sidewalk, shallow depth of field, natural skin, slight wobble.
0:00-0:03 she raises the gloss into frame, eyes on the lens, starts applying it.
0:03-0:06 finishes, presses lips, small smile, camera drifts left with her walk.
0:06-0:08 she winks and tilts the gloss toward the lens.
Natural street ambience only, no music, no text, no cut.
```

Cinematic proof shot (Cinema Studio Video 3.0, genre action, 7 s for a 4 s cut):
```
Low-lit underground fight hall, crowd in soft focus behind, warm practical bulbs.
0:00-0:02 medium two-shot, the blond fighter circles, camera tracks right at walking pace.
0:02-0:05 the big man swings a staff, camera whip-follows the strike, fighter ducks under it.
0:05-0:07 push-in to the blond fighter's face, breath visible, stare into the lens.
Punches and cloth whoosh SFX only, no music, no slow motion, no cut.
```

Motion transfer (Genjutsu `hf_mult_motion_control`, video ref = dance clip, image refs = 2 characters): no prompt needed beyond "match the reference choreography beat for beat, keep camera path of the reference, keep each character's face and outfit, no music". Render the reference 3 s longer than the cut.

Hero payoff, slow motion (Cinema Studio Video v2, speedramp slowmo, 8 s for a 4-5 s cut, ref: approved monster-truck still):
```
@image1 is the truck, keep its paint and wheels exactly.
Packed indoor arena at night, dust in the stadium lights.
0:00-0:02 truck hits the ramp at speed, camera low and tracking.
0:02-0:06 full backflip in slow motion, camera orbits 30 degrees under it, dirt spraying from the tyres.
0:06-0:08 lands, suspension compresses, camera shakes once.
Engine and crowd roar SFX, no music, no cut.
```

3D exploded view (Seedance 2.0 when a mesh is not needed; ref: product still):
```
@image1 is the pickup. Clean 3D software viewport look, grey infinite studio floor, soft top light.
0:00-0:03 slow 20 degree orbit around the intact truck.
0:03-0:06 the body lifts straight up off the chassis, parts separate along clean axes, exploded technical view.
0:06-0:08 hold on the exploded view, orbit continues.
Soft mechanical clicks only, no music, no text, no cut.
```

Texture plates (Nano Banana Pro, 2K, 1:1, 8-12 variants as edits of one key plate):
```
Seamless top-down macro of polished river pebbles packed edge to edge, even soft light, no shadows at the borders, no vignette, tileable.
```

### 4.3 Editing grammar the audio/render steps should support

1. **Flash events as first-class timeline items.** `{type:"flash", at, colors, frames}` that the render places frame-exactly (1 f = 1/fps) independent of scene boundaries. Budget: at most one every 3 s.
2. **Punch-in cuts.** `{type:"punch", at, scale, target}`: a frame-accurate crop jump on the running layout (no tween), used 2-4 times per minute.
3. **Click = drop.** The audio step should place the music drop (or a hit + bass swell) on the send-click frame; the storyboard marks it with `drop:true` on a scene or a `fx.cursorClick`. If the chosen track has a known drop, the timeline shifts so the click lands on it (search window +/- 0.25 s).
4. **Breath before reveal.** Automatic music duck of -6 to -9 dB for 0.3-0.5 s ending exactly on each scene marked `reveal:true`, then back to 0 dB on the reveal frame (sidechain-style gain curve in the mix, `volume` automation in ffmpeg `afade`/`volume=enable`).
5. **SFX per effect.** New cue types emitted by helpers: `glitch` (T2/T3, 60-120 ms digital crunch), `pixel` (T16, granular sparkle), `flash` (T18/T19, short noise swell), `whoosh` (whip, shrink-to-thumb), `click` (existing), `pump` (T10 beat pump, snare-roll ticks), `tick` (counters, one per value change, capped at 30/s). Map them in `sfx-library`.
6. **Cuts follow events, not the grid.** Do not snap cuts to the beat grid (Higgsfield doesn't: A and C are at chance level); snap only the drop, the flood/flash and the payoff shot to the nearest strong onset within 80 ms (B's 84% onset hit rate comes from these).
7. **Speed ramp for AI payoff.** Support `speed:[{at, rate}]` on `ai-shot` clips (ffmpeg `setpts` segments with `minterpolate` for slow-down below 0.5x) and a default `impact` ramp: 1.0x -> 0.35x over 6 f at the peak action -> 1.0x. Source clip must be rendered 3 s longer than the cut so the ramp has material.
8. **Motion blur on fast moves only.** Keep the existing policy: velocity-driven blur or tmix supersampling for whip, shrink-to-thumb, chain flythrough and scatter-to-set; everything else is sharp.
9. **Pacing template "hold, sprint, land".** Storyboard generator targets: logo 2.3-3.7 s; demo beats 0.7-1.5 s; one long build beat 2.5-4 s at 60-75% of runtime; promo/stat/chart beats 2.0 s; AI payoff 3-4 s; end card 1.8-2.1 s tiny caps. Overall ASL 1.1-1.5 s including flash events.
10. **End card is quiet.** Music tail continues, no logo sting, no SFX on the end card; last hit belongs to the payoff or the final click.

---

## 5. Higgsfield MCP listing used (read-only browse, no generation, no credits)

Tools called: `get_preset_instructions` (no arg), `get_presets` (source viral all 87; marketing_studio motion first 50 of 231; saas query 42), `get_explainer_presets`, `models_explore list` (video, image, 3d). Nothing was executed.

- **Viral Hub effects (87)**, relevant: Floating fall, Vanish, Eyes in, Cutout, Wild ride, Lidar transition, Smash and grab, Incline, Clones, Infinite clones, Selfception, Act natural, Monster dab, Street colossus, World morphing, Studio slide, High flip, Lacewalker, Burning man, Melting, boarding pass, Frozen in motion, Architecture wave, Scrapbook collage, Stop world, Earth zoom, Bullet time, Particles, Windows, Tracking, Fragments, Multiverse, Overexposed, Two color, Acid, Toxic, Ultraviolet, Random Glow, Broken mirror, Comic, Flash comic, Magazine, Cold vision, LSD, Noir, 3D render, Orbit 360, Action figure, Sticker peel, Ink Riot, Modern, Origami.
- **Marketing Studio motion** (saas_motion 42): Echo Wave, Ink & Ribbon, Vibrant Carousel, Acid Graphic, Nova, Paper Carousel, Simple, Shutter Bands, Flat Beat, Dynamic, Magnet, Manifesto Pop, Atomic, Frames, Smooth Wipes, One Bit, Blocks, Masks, Rhytmic, Aurora SaaS, Chalk Blueprint, Liquid Carousel, Sticker Bounce, Folder Pop, Corners Lines, Relight, Premium, Corners Pop, Transluscent, Word Roll, Break Typography, Flip Board, Quantum, Cards & Text, PC Flat, Slot Roll, Liquid Blob, Color Wipes, Velocity, Adapts, Push In, Isometric Card Flight. Other motion types seen: Monospace Callouts, Pixel Block Yard, Halftone Street Collage, Signal Red HUD, Candy Color Swap, Expanding Type Rings, Split Flap Scoreboard, Falling Type Mosaic, Pill Stack Logo, Radial Red Spin.
- **Product recipes** (`get_preset_instructions`): video `crane-reveal`, `detail-scan`, `floating-roll`, `half-turn`, `impact`, `label-trace`, `light-sweep`, `liquid-wrap`, `macro-glide`, `paint-wave`, `product-spin`, `pull-back`, `push-in`, `shadow-motion`, `sunrise-pass`, `texture-track`, `topdown-dive`, `whip-pan`; image `flatlay`, `feature-zoom`, `how-it-works`, `specs`, `hero-shot` and others.
- **Explainer presets**: Editorial Motion Graphics, Mixed Media, Studio 3D, 3D Mix, Isometric Flat Vector, Pixel Art, Poster Vector, and 15 more illustrative styles.
- **Video models**: `cinematic_studio_3_0`, `cinematic_studio_video_v2` (speedramp auto/linear/slowmo/speedup/impact, multi_shots), `seedance_2_0`, `seedance_2_0_mini`, `seedance_2_5` (t2v, omni_reference, video_edit, video_extension, 4-30 s), `ad_multiplier`, `kling3_0`, `kling3_0_turbo`, `kling_video_edit`, `hf_mult_motion_control` + `hf_mult_replace_object` (Genjutsu), `minimax_h3`, `wan3_0`, `wan3_0_prime`, `veo3_1`, `gemini_omni_flash_1_1`, `grok_video_v15`, `happy_horse_video`, upscalers (`bytedance_video_upscale`, `topaz_video`), `video_deflicker`, `sam_3_video` (background removal). (`flux_3_video` exists but is banned by house rules.)
- **Image models**: `soul_2` (Soul 2.0), `soul_cinematic`, `soul_cast`, `soul_location`, `nano_banana_pro`, `nano_banana_2`, `gpt_image_2`, `gpt_image_2_5`, `cinematic_studio_2_5`, `seedream_v5_pro`, `recraft_v4_1`, `image_background_remover`, `topaz_image`.
- **3D models**: `meshy_v7_image_to_3d`, `tripo_h3_1_image_to_3d`, `tripo_h3_1_multiview_to_3d`, `hunyuan3d_v3_image_to_3d`, `sam_3_3d`, `meshy_rigging`.

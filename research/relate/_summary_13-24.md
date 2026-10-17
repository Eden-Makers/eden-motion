# Relate Studio - forensic summary, posts 13-24 + extras 193, 196

Method: scene-cut detection (ffmpeg, threshold 0.25), timestamped 0.25-0.5 s frame grids + full-res stills per video (`frames/<basename>/`), k-means palette sampling + region pixel sampling (PIL/cv2), phase-correlation for scroll/pan speeds, librosa for audio onsets/tempo. The Gemini video MCP was tried 6 times and timed out or dropped every call, so all findings come from frame inspection, not from Gemini.

## Overview table
| # | post | title | dur (s) | res / fps | audio | dominant technique | 1:1 feasibility without AI (1-10) |
|---|---|---|---|---|---|---|---|
| 13 | 225 | Branding & Website for Neuron | 8.9 | 848x848 / 30 | no | Brand slideshow, 12 slides at 0.73 s (3D + UI + photo mockups) | 4 |
| 14 | 224 | Branding & Website for Shio | 22.9 | 1280x960 / 30 | no | Website UI motion in browser frame on brand blue | 9 |
| 15 | 223 | Banner Templates for Quip | 20.0 | 1280x800 / 60 | no | Linear marquee (219 px/s) of animated 2D banners | 8 |
| 16 | 222 | Promo Video for Arcus | 48.0 | 1280x720 / 60 | music ~118 BPM | Full 3D clay-world narrative (Blender-grade CG) | 7 |
| 17 | 218 | Branding for Shio (4 clips) | 4.2 + 2.0 + 11.3 + 10.4 | 1280x720 / 30 | no | Gradient shaders + UI theme cycling + card carousel | 9 |
| 18 | 214 | Branding & Website for Flipit (2 clips) | 2.8 + 18.4 | 1920x1080 / 60 | no | 3D coin arc inside website hero + responsive UI demo | 8 |
| 19 | 213 | AIVM by ChainGPT | 5.0 | 1920x1080 / 60 | no | Static bento of looping 2D tiles | 7 |
| 20 | 211 | Branding for WenAltSeason | 21.5 | 1280x720 / 60 | no | Figma-canvas kinetic 2D (selection boxes, cursor, typewriter) | 8 |
| 21 | 202 | Website for Neuron | 24.1 | 2394x1440 / 30 | silent track | Live 3D glass/steel hero + HTML cards sliding up (expo.out) | 8 |
| 22 | 201 | Promo Videos for Jupiter (reel) | 36.1 | 1280x720 / 60 | music ~112 BPM | Mixed: bento of clips, 3D phones/hands/gift, kinetic type with glows | 6 |
| 23 | 200 | 1000 tasks with ChainGPT | 4.9 | 1280x720 / 30 | no | AI video (robots + neon) with 2D overlay | 2 |
| 24 | 199 | Jupiter Onchain Media | 6.9 | 1280x720 / 30 | no | 1.0 s slideshow of AI/photo brand mockups | 3 |
| x | 196 | Promo Video for Ledger | 20.0 | 1920x1080 / 60 | music ~129 BPM | Pure 3D product on white, beat-cut, shape match transition | 9 |
| x | 193 | Promo Video for Ecliptica | 31.3 | 1920x1080 / 30 | music ~118 BPM | Dark sci-fi HUD (2D) + 3D crystal/cards; stylized character opening | 6 |

## Top 4 candidates for 1:1 recreation
1. **196 Ledger** (feasibility 9). 20 s, all CG, white world, one device model + translucent card stack. Signature stack-to-device match cut, beat-cut on 129 BPM. Fastest route to a premium 1:1. Blender 100%, HyperFrames for the 2 end type cards.
2. **16 Arcus** (feasibility 7). 48 s narrative, the highest-craft piece in the set: monochrome clay world, UI turned into physical objects (frosted notification pills, curling paper UI, extruded ticker rows), day/night light transitions, flip-clock bookends. Heavy but pure Blender; the office set is the main modeling cost.
3. **193 Ecliptica** (feasibility 6). Different universe (dark navy + mint, HUD). 6-31 s = HyperFrames HUD (SVG orbits, markers, typewriter data on a 117.5 BPM grid) + Blender crystal, chained cards and outline-shaded console. Only the 4 s character/hand opening and 5 card portraits need a stylized Blender NPR build or AI stills. Shows the HyperFrames + Blender hybrid best.
4. **21 Neuron website** (feasibility 8). A cinematic glass/steel kitbash scene rendered as a living hero (power-up emission, digit ticker) with HTML cards sliding over it. Good test of compositing a Blender plate under a HyperFrames UI layer; reusable for post 13 too.

Runners-up: **22 Jupiter** (its 17-36 s type/glow/gift section is 9/10 and a perfect HyperFrames exercise, but the full reel needs a dozen sub-clips and stylized 3D hands), **18_0 Flipit coins** (2.8 s, excellent small Blender study: 12 pink metal coins on a path with offset spin + DOF).

Avoid for 1:1: 23 (AI video), 24 and 13 (photographic/AI mockup slideshows).

## Relate house style (cross-video patterns)
- **Easing:** expo.out / power4.out everywhere for UI moves: 0.2 s acceleration to peak, 1.0-1.6 s settle (measured: Shio carousel peak ~2200 px/s, Neuron card slides ~2000 px/s settling in ~1.2 s, Flipit breakpoint resize ~0.8-1.0 s). Linear only for marquees (Quip 219 px/s = 17% width/s). 3D cameras: slow ease-in-out drifts, 2-5 s holds.
- **Inset frame on brand field:** website/UI shown in a rounded white frame (radius ~1.2-1.5% width, ~85% width) floating on a saturated brand color (#2712e8 Shio, magenta satin Flipit, #0d2105 Flipit, 3D scene Neuron). The field color itself morphs between sections.
- **Loops:** branding/website posts are seamless loops (14, 17_3, 18_1, 20, 21) built for autoplay; promo videos are linear with a logo end card.
- **One brand accent on neutrals:** Shio #2712e8, WenAltSeason #f7c909, Jupiter lime #9ef2a3 on #060b11, Ecliptica mint #19ff97 on #08081c, Arcus green #648556 on clay #c2beb5, Ledger saturated cards on #ffffff.
- **Typography:** neo-grotesk (Neue Haas / Aeonik / Haffer class; free stand-in Inter Tight) with tight tracking (-3 to -5%), large heroes (cap height 10-14% of frame), lowercase headlines for softer brands. Serif only when the brand demands (Arcus, Quip). Mono for crypto-native/meme brands (WenAltSeason, Quip labels, Ecliptica HUD).
- **Text animation vocabulary:** center-out mask reveal from between the relate arrows; per-word stagger with gradient fill that settles to solid color; per-letter scatter-to-place; typewriter/scramble for data; whip slide with real motion blur; word carousel with neighbor words faded (1.0 / 0.35 / 0.12 opacity).
- **UI as material:** product UI is never a flat screen recording only; it is mapped onto 3D phones, frosted pills, curling paper, extruded rows, floating exploded cards.
- **3D look:** soft studio or warm natural light, matte/satin materials (clay, soft-touch plastic, anodized metal, tinted acrylic), strong DOF on macros, real motion blur, restrained bloom; no busy particle FX. Object choreography (coin arcs, card fans, stacks) over camera acrobatics.
- **Micro-life in static frames:** digit tickers, gradient drift, pixel mandalas, aurora bars; nothing is ever fully still.
- **Pacing:** brand slideshows 0.73-1.0 s per slide; promo shots 1.2-3.7 s cut on the beat (112-129 BPM); end cards hold 3-4 s.
- **Sound:** only promo videos carry music (electronic, 112-129 BPM) with cuts and UI pops on the beat grid; branding/website posts are silent.
- **Signature mark:** the relate "→←" arrows appear as opener/closer (22) and "designed by →←relate" chips (20, 23).
- **AI usage:** AI imagery/video is used for people, events and mascots in brand-world mockups (13, 23, 24, possibly the Ecliptica character), never for UI or product shots.

## Files
- Per-video reports: `research/relate/<basename>.md` (multi-clip posts 17 and 18 combined into one file each, without the _N suffix).
- Frames and grids: `frames/<basename>/`.

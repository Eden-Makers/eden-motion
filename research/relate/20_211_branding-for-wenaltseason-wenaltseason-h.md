# 20 / post 211 - Branding for WenAltSeason

## Meta
- File: `ref/20_211_branding-for-wenaltseason-wenaltseason-h.mp4`
- Duration: 21.52 s
- Resolution: 1280x720, 60 fps
- Audio: none.
- Frames: `frames/20_211_branding-for-wenaltseason-wenaltseason-h/` (grid_00..02, hi_4.2, hi_11.0, hi_13.5)
- Hard cuts at 9.45, 15.42, 16.67; everything else is continuous zoom/push inside a Figma-like canvas.

## Shot list
| # | in-out | on screen | camera + easing | transition | technique |
|---|---|---|---|---|---|
| 1 | 0.00-1.40 | Yellow #f7c909 canvas with a rotated (~-15 deg) collage of banner templates: "Major Breach At Bonk.Fun", "Solana Up Memes Up", "GM", "Black Friday", meme crowd illustration, cartoon characters | Slow diagonal pan | Zoom into one banner (1.4-2.0, expo.out), rotation straightens | 2D |
| 2 | 2.00-6.40 | Single banner as a selected Figma object (bounding box with square handles). Banner content swaps: "Solana Up Memes Up" with meme coin row -> collage of meme stickers popping in -> "Memecoin Black Friday" (old headline greyed, new one typed letter by letter) -> chart "24H 85%" -> "Do Memecoins Need Utilities?" typed | Elements pop with back.out; headline typewriter ~18 chars/s; frame re-centers with small expo moves | Zoom out to logo (6.5) | 2D kinetic |
| 3 | 6.50-8.00 | Huge "WEN? Altseason" logo (mascot in yellow circle + mono wordmark) on white, cropped, sliding left | Push/slide, expo.out | Zoom out to logo + collage strip (8.0) | 2D |
| 4 | 8.00-9.45 | Logo badge over a strip of meme stickers, cursor | Slight drift | Hard cut (9.45) | 2D |
| 5 | 9.45-12.00 | Black: giant mono word "personal" (with custom glyphs: hooked "r", flag "l") typed and scrolling left, "Your personal support" | Text scroll left linear, letters typed; last letter flashes yellow | Zoom out (11.8) reveals website frame | 2D kinetic type |
| 6 | 12.00-15.42 | Website mockup on black: yellow top bar, "Your personal support on the way from idea to 1B Mcap", buttons "@wenaltseason" (X, Telegram), meme stickers scattered as selectable objects with handles, shrugging mascot bottom center, cursor drags stickers | Stickers pop in with stagger, cursor moves with ease-in-out | Hard cut (15.42) | 2D UI |
| 7 | 15.42-16.67 | Yellow bg, logo pill "WEN? Altseason" selected with handles, cursor | Static, slight scale | Hard cut | 2D |
| 8 | 16.67-19.50 | White, "designed by" + relate chip "→←relate" selected with handles, cursor moves around | Cursor drift | Yellow frame border expands from corner (19.5) | 2D |
| 9 | 19.50-21.52 | Yellow wipe, collage returns rotated, loop point | Expo push | Loop to 0.00 | 2D |

## Typography
- Brand: monospace with custom alternates (hooked r, flag-shaped l), regular weight. Big word "personal" cap ~22% of frame height; website headline ~6%. Free alt: JetBrains Mono 400 or Martian Mono with glyph swaps (or draw r/l as SVG).
- "designed by": neo-grotesk (Inter-like) ~3% height.
- Verbatim: "Major Breach At Bonk.Fun", "Solana Up Memes Up", "GM", "Black Friday", "Memecoin Black Friday", "24H", "85%", "Do Memecoins Need Utilities?", "WEN? Altseason", "Your personal support on the way from idea to 1B Mcap", "@wenaltseason", "designed by", "relate".

## Color palette (sampled)
- Yellow #f7c909 / #f6c809, black #000000, white #fefffe
- Supporting meme colors: green #489b13, blue #496cca, brown #a97226, plum #43202f

## 3D / materials / lighting
- None.

## Signature techniques
- Figma-canvas aesthetic: selection boxes, handles, cursor, as part of the design story.
- Typewriter headline replacement with old text left greyed.
- Rotated collage -> zoom-into-artboard opener; loop structure.
- Sign-off "designed by →←relate" as a selected object.

## Recreation plan
| Part | Tool | Difficulty | Assets |
|---|---|---|---|
| All | HyperFrames (GSAP, CSS transforms, typewriter, cursor path) | 2 | Mascot SVG, meme sticker images (copyrighted memes, use placeholders), mono font |

- 1:1 feasibility WITHOUT AI video: **8/10** (assets, not technique, are the limit).

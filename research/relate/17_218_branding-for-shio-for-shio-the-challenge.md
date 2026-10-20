# 17 / post 218 - Branding for Shio (4 clips)

## Meta
- Files (all 1280x720, 30 fps, no audio):
  - `_0` 4.20 s - logo on swirling gradient
  - `_1` 2.03 s - swap card hero
  - `_2` 11.27 s - wallet app theme cycling
  - `_3` 10.37 s - card carousel on aurora gradient
- Frames: `frames/17_218_branding-for-shio-for-shio-the-challenge_{0..3}/` (grids, hi_2.jpg in _0, hi_4.jpg in _2)
- No hard cuts in any clip. Carousel motion in _3 measured with phase correlation.

## Shot list
| # | in-out | on screen | motion + easing | transition | technique |
|---|---|---|---|---|---|
| _0 | 0.00-4.20 | Full-frame mesh gradient swirl (electric blue #2945e8 core, magenta #c236eb, pink, cyan, lilac) rotating like a soft vortex; centered logo (S-in-circle mark + "Shio") in white with overlay/soft-light blend so it is tinted by the gradient; logo ~11% frame height | Slow swirl rotation (~20 deg/s), gentle hue drift; logo static | Loop | 2D shader gradient |
| _1 | 0.00-2.03 | Iridescent flowing bg (white/lilac/cyan/blue), headline "maximize your gains from the very first swap" with gradient-filled text (lilac -> cyan -> blue), white swap card below (sell 9.64 / buy 3.54441, blue "continue" button) cropped at bottom; tiny "shio" logo top | Bg flows; static UI | Loop | 2D shader + UI |
| _2 | 0.00-11.27 | Light grey #f5f5f4 bg; centered phone UI: gradient header with balance "$532.14", "+2.94% ($212.44)", 2x2 frosted glass buttons "buy", "receive", "send", "swap"; white sheet "tokens" / "defi" tabs, "SUI 300 SUI $21523.99 +2.01%", "USDC 10 USDC $9.99 +0.01%", bottom nav icons. Header gradient cycles themes: teal/green -> blue/green -> pastel lilac -> electric blue -> lime/mint -> pink/rose -> purple/blue -> teal | Theme swap every ~1.25-1.5 s; transition = gradient crossfade with a brief blur on balance text and buttons (0.3 s); buttons tint to match | Loop | UI motion |
| _3 | 0.00-10.37 | Aurora gradient bg (cyan, lilac, cream, violet), white rounded cards in a horizontal carousel: two charts "bundles 80,110,622" + "tips 139,754 SUI" -> "provide liquidity on shio" card (with metrics + "sushi" logo) -> "explorer" table card -> pill "unclaimed reward 1.7654 SUI claim ↗" -> back to charts | Slides at 0.3, 3.1, 5.8, 8.5 s; each slide ~1 frame width, accel 0.2 s, peak ~2200 px/s, long settle ~1.6 s (expo.out / power4.out) | Loop | UI motion |

## Typography
- Neo-grotesk, lowercase-first, medium. Logo "Shio" in rounded grotesk. Free alt: Inter Tight 500 (headlines -0.04em), Inter 400 UI.
- _1 headline cap ~9% of frame height, gradient text fill.
- _2 balance "$532" ~6% height with ".14" smaller superscript-ish.
- Verbatim: "Shio", "maximize your gains from the very first swap", "swap", "9.64", "3.54441", "continue", "$532.14", "+2.94% ($212.44)", "buy", "receive", "send", "swap", "tokens", "defi", "SUI", "300 SUI", "$21523.99", "+2.01%", "USDC", "10 USDC", "$9.99", "+0.01%", "bundles", "80,110,622", "tips", "139,754 SUI", "provide liquidity on shio", "explorer", "unclaimed reward 1.7654 SUI", "claim".

## Color palette (sampled)
- Shio blue #2945e8 / #3d54df, magenta #c236eb, pink #f3a6ee, cyan #71e0ee, lilac #8d95e8, ice #cde9ef, sky #5597e4
- Neutral bg #f5f5f4, white cards #ffffff, navy text #10105a

## 3D / materials / lighting
- None. Frosted glass buttons via backdrop-filter blur + white 20% fill.

## Signature techniques
- Brand gradient system as a living material (swirl, aurora, iridescent flow).
- Logo blended into gradient instead of sitting on it.
- Theme cycling to show identity flexibility.
- Carousel with sharp expo.out, long settle.

## Recreation plan
| Clip | Tool | Difficulty | Assets |
|---|---|---|---|
| _0, _1 | HyperFrames + WebGL mesh-gradient shader | 2 | Logo SVG |
| _2 | HyperFrames (CSS phone UI, gradient themes) | 2 | Icons |
| _3 | HyperFrames (cards, SVG charts, GSAP expo.out) | 2 | |

- 1:1 feasibility WITHOUT AI video: **9/10**. Simple but very on-brand; good as a sub-module, not as a hero recreation.

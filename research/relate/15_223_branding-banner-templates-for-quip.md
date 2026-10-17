# 15 / post 223 - Branding & Banner Templates for Quip

## Meta
- File: `ref/15_223_branding-banner-templates-for-quip.mp4`
- Duration: 20.02 s
- Resolution: 1280x800 (16:10), 60 fps
- Audio: none.
- Frames: `frames/15_223_branding-banner-templates-for-quip/` (grid_00..01, hi_1.0, hi_7.0, hi_11.5)
- Motion measured: perfectly constant horizontal scroll of -219 px/s (17.1% of frame width per second), zero vertical, linear, for the full 20 s.

## Shot list
| # | in-out | on screen | motion | transition | technique |
|---|---|---|---|---|---|
| 1 | 0.00-20.02 | Infinite marquee of banner templates on black, vertically centered (band from y=19% to y=81%), rounded corners ~1% width, gaps ~28 px (2.2% width). Banners in sequence: holographic pink/orange gradient with tiny announcement text box; light grey "ANNOUNCE" "Quantum computing will be an $850B industry by 2040" "COLTON@QUIP.NETWORK" over faint pixel blocks; diagonal pixel-stripe pattern; black square "We build infrastructure for 10 years" / "Quantum internet is for everyone" with tiny "SHARE WORK", "PUNISH BAD ACTORS", "ENSURE PAYMENT" and a rotating pixel mandala; yellow/magenta/cyan gradient square with mono caps "USE QUIP'S QUANTUM MINERS FOR QUANTUM COMPUTING JOBS OFFERING AI TRAINING, ARBITRAGE, KEY RECOVERY, HASH MINING, INTENT SOLVING, AND MORE. TAKE ADVANTAGE OF QUIP'S SDKS FOR SIMPLE POST-QUANTUM ENCRYPTION." + "quip" and pixel ornaments; black/white pixel noise mandala square; white "Special devices can connect on A Quantum Internet"; green/yellow gradient with white pixel airplane / eye / heart icons and "Think fast think together"; white "Quantum internet is for everyone" with columns of body copy and side gradient | Linear scroll -219 px/s; each banner animates internally (gradient drift, pixel mandala rotation, pixel icons swapping airplane -> eye -> heart, stripe scroll) | Continuous, loops | 2D animated banners |

## Typography
- Display serif (transitional/old-style, bold-ish, like Editorial / Caslon-style), headline cap ~4.5% frame height in wide banners. Free alt: Newsreader Display 500 or Libre Caslon Display.
- Mono pixel caps for body/labels (bitmap-like). Free alt: VT323 or Space Mono 400 uppercase, tracking +2%.
- Verbatim: "ANNOUNCE", "Quantum computing will be an $850B industry by 2040", "COLTON@QUIP.NETWORK", "We build infrastructure for 10 years", "Quantum internet is for everyone", "SHARE WORK", "PUNISH BAD ACTORS", "ENSURE PAYMENT", "USE QUIP'S QUANTUM MINERS FOR QUANTUM COMPUTING JOBS OFFERING AI TRAINING, ARBITRAGE, KEY RECOVERY, HASH MINING, INTENT SOLVING, AND MORE.", "TAKE ADVANTAGE OF QUIP'S SDKS FOR SIMPLE POST-QUANTUM ENCRYPTION.", "quip", "Special devices can connect on A Quantum Internet", "Think fast think together", "Take advantage of Quip's SDKs for simple post-quantum encryption".

## Color palette (sampled)
- Black #020101, off-white #eeeeed, warm grey #d1c2bc
- Gradient accents: gold #b58f42, pink #d5457f, wine #913a47, green #5a971e, olive-yellow #c5c17c
- Iridescent cyan/pink highlights inside gradients

## 3D / materials / lighting
- None. Grain-heavy blurred gradients, 1-bit pixel art patterns.

## Signature techniques
- Template system shown as a single linear marquee (no cuts), each card alive.
- Pixel/bitmap generative ornaments (mandalas, icons) contrasted with an elegant serif.

## Recreation plan
| Part | Tool | Difficulty | Assets |
|---|---|---|---|
| Marquee + banners | HyperFrames (CSS translateX linear 219 px/s; canvas for pixel mandalas; CSS/WebGL gradients) | 2 | Serif + pixel mono fonts, pixel icon sprites |

- 1:1 feasibility WITHOUT AI video: **8/10** (generative pixel mandalas need a small custom canvas generator).

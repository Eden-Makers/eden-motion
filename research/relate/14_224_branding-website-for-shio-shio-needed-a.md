# 14 / post 224 - Branding & Website for Shio

## Meta
- File: `ref/14_224_branding-website-for-shio-shio-needed-a.mp4`
- Duration: 22.93 s
- Resolution: 1280x960 (4:3), 30 fps
- Audio: none.
- Frames: `frames/14_224_branding-website-for-shio-shio-needed-a/` (grid_00..02)
- No hard cuts (scene detection returned none): continuous scroll/animation take that loops.

## Shot list
| # | in-out | on screen | motion + easing | transition | technique |
|---|---|---|---|---|---|
| 1 | 0.00-1.00 | Rounded browser frame (white, radius ~1.5% width, ~85% frame width) centered on electric blue #2712e8. Hero with iridescent blue/cyan/white flowing gradient, headline "maximize your rewards on sui with mev-boosted yields" in gradient-filled text, "START EARNING ↗", ">$70M" stat | Gradient bg flows slowly | Page scrolls up (1.0-1.5, expo.out) | HTML |
| 2 | 1.50-12.00 | Section "giving the power back to users" (big centered lowercase), three feature columns with icons: "the first MEV solution in the move ecosystem", "proven technology & core integration", "designed to benefit the entire ecosystem" + progress underline that fills per feature. Headline fades to ~10% grey and a center widget animates through states: "Provide liquidity or trade" card -> gradient tile with Shio icon -> solid blue "SIP-19" tile -> stacked pills "Burninate", "Protect", "SIP-19" -> "MEV rewards back" dot diagram -> "to Sui ecosystem" node tree | Widget morphs every ~1.3 s with scale + crossfade (power3.inOut), progress line advances in sync | Whole page slides left (12.0, expo.out) while the outer bg morphs blue -> lavender #b2bbe3 -> light grey #f3f3f3 | HTML |
| 3 | 12.50-18.00 | Section "backed by top sui projects" with three partner cards "cetus dex", "turbos dex", "mysten labs"; cursor-less hover state turns cetus card into cyan/blue gradient with description, then back | Hover fade 0.4 s | Viewport shrinks to mobile (18.0-18.5) | HTML |
| 4 | 18.50-21.00 | Same section reflowed to a narrow mobile column, centered small on grey | Width tween expo.out | Expands back to desktop (21.0), slides right | HTML |
| 5 | 21.50-22.93 | Hero returns, bg back to electric blue | Slide + color tween | Loop | HTML |

## Typography
- Headlines: neo-grotesk, all lowercase, medium 500, tight leading 0.9, tracking about -4%; "giving the power back to users" cap height ~6% of frame height. Free alt: Inter Tight 500.
- Hero headline gradient fill (lavender -> cyan -> blue), ~7% height.
- Body: small grotesk ~1% height, blue/navy.
- Verbatim: "shio", "maximize your rewards on sui with mev-boosted yields", "START EARNING ↗", ">$70M", "giving the power back to users", "the first MEV solution in the move ecosystem", "proven technology & core integration", "designed to benefit the entire ecosystem", "Provide liquidity or trade", "SIP-19", "Burninate", "Protect", "MEV rewards back", "to Sui ecosystem", "backed by top sui projects", "GET IN TOUCH ↗", "cetus dex", "turbos dex", "mysten labs", "GO TO SHIO APP".

## Color palette (sampled)
- Electric blue: #2712e8 (secondary #3b2ce7)
- Page grey/white: #f3f3f3, #fcfdfc
- Lavender: #b2bbe3, #8b8eca
- Cyan accents: #3cc6f1, #3e79e7, ice #ccdced
- Navy text: #10105a

## 3D / materials / lighting
- None in 3D. Iridescent gradients are fluid/mesh gradients (could be WebGL shader).

## Signature techniques
- Browser frame floating on saturated brand color, color of the page bg morphing between sections.
- Faded-headline-behind-widget trick: section title drops to 10% while a central explainer widget cycles states.
- Responsive breakpoint as animation.
- Loop structure.

## Recreation plan
| Part | Tool | Difficulty | Assets |
|---|---|---|---|
| All | HyperFrames (HTML/CSS + GSAP + WebGL gradient) | 2 | Shio logo, Inter Tight, partner icons |

- 1:1 feasibility WITHOUT AI video: **9/10**. Pure UI motion, but low "wow" for a recreation showcase.

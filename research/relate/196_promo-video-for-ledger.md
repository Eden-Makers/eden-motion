# extra / post 196 - Promo Video for Ledger (Nano Gen5)

## Meta
- File: `ref/extra/196_promo-video-for-ledger.mp4`
- Duration: 20.00 s
- Resolution: 1920x1080, 60 fps
- Audio: YES. Loud music bed (-8 to -10 dBFS, beat tracker ~129 BPM), punchy. Strong transients 0.51, 0.98, 1.21 (cards burst from phone), 2.37-2.60 (into stack cut 2.87), 4.11 (stack collapse), 5.36-6.06 (stack -> device match), 9.75-9.98 (macro cut), 12.75-13.44 (device flip to front), fade-out from 16.8, silent by 18.5.
- Frames: `frames/196_promo-video-for-ledger/` (grid_00..01, hi_1.0, hi_3.6, hi_7.6, hi_15.2)
- Gemini cross-check: attempted, MCP connection closed / timed out. Frame-based analysis only.

## Shot list
| # | in-out | on screen | camera + easing | transition into next | technique |
|---|---|---|---|---|---|
| 1 | 0.00-1.20 | White phone (iOS) seen from low angle at its top edge, screen shows Ledger Live device list "Stax", "Flex", then "Looking for Ledger Flex..." with pulsing blue Bluetooth disc | Fast push/tilt up toward the screen, expo-out settle | Cards erupt from screen toward camera | 3D render + UI texture |
| 2 | 1.20-2.87 | Translucent rounded "crypto cards" (Tether teal with T logo, BTC orange, Solana purple, red) fly up and tumble, separating in air | Camera tilts up following, ease-out | Hard cut on beat (2.87) | 3D render |
| 3 | 2.87-4.72 | Low frontal view of a neat stack of glossy cards: orange BTC (top, flying off upward), purple Solana, magenta, green, yellow, taupe, blue; top card lifts out of frame | Slow push, cards pop off with ease-out | Cut (4.72) | 3D render |
| 4 | 4.72-6.00 | Stack compressed, seen edge-on as thin colored lines, rotating to perfectly flat; motion-blurred | Camera rises to exact edge-on, stack collapses to a line | MATCH CUT: the flat stack line becomes the black device seen edge-on (~5.9) | 3D render |
| 5 | 6.00-9.20 | Black rounded slab (Ledger Nano Gen5) edge-on, rotates in a swooping arc to show its face: e-ink screen "[LEDGER] The most trusted security for your digital assets" "Tap to continue"; at 8.5 a grey square button with pixel cherry icon flies in and snaps to the lower-right corner | Object rotation with ease-in-out (approx 1.2 s per 90 deg), camera slow push | Cut (9.20) | 3D render |
| 6 | 9.20-10.87 | Macro: lower corner, grey cherry button, then bracket logo emboss on black body; screen text "Tap to continue" blurred above | Slow slide left, very shallow DOF, rack focus | Cut (10.87) | 3D render |
| 7 | 10.87-12.08 | Macro: top-right corner, side button, screen edge with "Ethereum", "Bitcoin" app labels | Slow push/tilt | Cut (12.08) | 3D render |
| 8 | 12.08-15.83 | Device back (matte black) floating, rotates edge-on (12.5) then to front showing app grid: "Bitcoin", "Ethereum", "Solana", "XRP", "Security Key", "Add app", settings + battery icons. From 14.0 colored cards fan out behind the device left and right (Tether teal, Solana pink, BTC orange, blue, green) | Device Y-spin ease-in-out, settles centered; cards spread with expo-out stagger | Cut to white (15.83) | 3D render |
| 9 | 15.83-16.90 | White, small centered text "Meet Ledger Nano™ Gen5" | Static | Cut | 2D type |
| 10 | 16.90-20.00 | White, bracketed "[LEDGER]" logo centered, holds, fades out 18.6-19.6 | Static | Fade to white | 2D type |

## Typography
- "Meet Ledger Nano™ Gen5": neo-grotesk medium, ~2.2% frame height (cap ~1.6%), black on white, tracking 0. Free alt: Inter 500.
- "[LEDGER]": Ledger wordmark, monospaced caps inside corner brackets, ~3% frame height. Free alt for bracket text: JetBrains Mono 500 / Space Mono + 4 corner bracket strokes.
- On-device UI: humanist grotesk (Inter-like), black on light grey e-ink.
- Animation: none kinetic; hard cuts in and a simple fade out.
- Verbatim: "Stax", "Flex", "Looking for Ledger Flex...", "LEDGER", "The most trusted security for your digital assets", "Tap to continue", "Bitcoin", "Ethereum", "Solana", "XRP", "Security Key", "Add app", "Meet Ledger Nano™ Gen5".

## Color palette (sampled)
- Background: #ffffff (pure white, 72% of all pixels)
- Device body: #181818, highlights #3d3a3a, e-ink screen #e0e0e0, grey button #646464
- Card stack: purple #85019a / #8113bb, magenta #af0046, green #507f05, yellow #be9c04, taupe #887568, blue #174ec9, orange #ddb14b / #edc08d
- Fan cards (lighter, translucent): teal #b8e1d8, pink #dd86ee

## 3D / materials / lighting
- High-key white cyclorama, soft overhead softbox, no visible floor, very soft contact shadow only when close to camera.
- Cards: glossy tinted acrylic/glass (transmission ~0.3, roughness 0.1, IOR 1.45), slight thickness, emboss logos, strong fresnel rim; lighter fan cards in final shot more transmissive.
- Device: matte soft-touch black (roughness 0.6) with satin highlight band, debossed bracket logo, e-ink screen emission low (0.3), grey rubber button.
- Phone: glossy white glass with UI texture.
- Motion blur strong on fast moves (shot 4 frames are smeared), DOF shallow in macros, no grain, clean commercial grade.

## Signature techniques
- Shape match transition: thin card stack edge-on -> black device edge-on (the key move).
- Beat-cut editing on a 129 BPM track, 1.2-3.7 s shots.
- Product hero on pure white with saturated translucent "asset cards" as the only color.
- Final hero: device center, cards fanned behind like a hand of cards.
- Sign-off on white with tiny type, lots of negative space.

## Recreation plan
| Shot | Tool | Difficulty | Assets |
|---|---|---|---|
| 1 phone | Blender + HyperFrames UI texture | 2 | Phone model (rounded box + notch), Ledger Live UI screens built in HTML, rendered to PNG |
| 2-4 cards | Blender | 2 | Rounded rectangle card mesh, coin logos as SVG -> curves -> emboss, keyframed or simple rigid body |
| 4-5 match + device | Blender | 3 | Device model (bevelled slab, recessed screen, side button, cherry button), e-ink UI texture; match edge-on silhouettes exactly |
| 6-7 macros | Blender | 2 | Same model, f/1.2 DOF |
| 8 fan | Blender | 2 | Card fan rig (empties with stagger) |
| 9-10 type | HyperFrames | 1 | Inter, bracket logo SVG |
| Audio | 129 BPM electronic bed + whoosh hits | 2 | |

- 1:1 feasibility WITHOUT AI video: **9/10**. Simple geometry, white world, all product CG. Best "quick win" candidate.

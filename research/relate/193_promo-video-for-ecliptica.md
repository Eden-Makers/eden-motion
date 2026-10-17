# extra / post 193 - Promo Video for Ecliptica (Strata)

## Meta
- File: `ref/extra/193_promo-video-for-ecliptica.mp4`
- Duration: 31.33 s
- Resolution: 1920x1080, 30 fps
- Audio: YES. Starts as a low riser (-37 dBFS at 0 s, -13 dBFS at 5 s), then dense music at -7 to -10 dBFS from ~5.5 s, ~117.5 BPM. Onsets land on a 0.51 s grid from 7.48 s (7.48, 7.99, 8.50, 10.03, 12.61, 13.63, 14.14, 14.65, 19.27-21.32): UI elements are cut/popped to the beat. Fades 29-31 s.
- Frames: `frames/193_promo-video-for-ecliptica/` (grid_00..03, hi_2.5, hi_5.0, hi_13.5, hi_20.0, hi_24.0, hi_30.0)
- Gemini cross-check: attempted, MCP timed out. Frame-based analysis only.

## Shot list
| # | in-out | on screen | camera + easing | transition into next | technique |
|---|---|---|---|---|---|
| 1 | 0.00-0.45 | Black | - | Hard pop | - |
| 2 | 0.45-1.40 | White Ecliptica mark (two rows of vertical bars forming an hourglass/bow-tie pattern with a central dot) centered on black, ~25% frame height | Static | Logo fill turns holographic (character imagery visible through the mark), dissolve to character 1.4-2.0 | 2D |
| 3 | 1.50-4.07 | Stylized figure: wide conical/folded hat, mask with circuit-eye patterns, symmetric blue body; one green hatched hand reaches toward camera. Background: concentric tech rings, glyph panels. Duotone blue #191dd7 + teal/green | Slow push-in, hand drifts forward, ease-in-out | Hard cut (4.07) | Stylized CG (3D with NPR hatching/duotone shader) or AI image-to-video, see notes |
| 4 | 4.07-5.83 | Close-up: green hatched hand presses a round button on a circular console of concentric rings, blue machinery | Slow push, finger press at ~5.3 | Cut to flash (5.83) | Same as shot 3 |
| 5 | 5.83-6.17 | Navy flash frame with a tiny glyph | - | Cut | 2D |
| 6 | 6.17-7.40 | Navy #08081c: boot log center-right "System initialization DONE", "Running scripts 55", "Launching UI 5" (counters tick, status turns green "DONE") | Static | Cut on beat (7.48) | 2D UI |
| 7 | 7.40-12.40 | HUD: thin white line ellipse draws on, cross-hairs, orbit ellipses form a wireframe sphere; teal ring reticle pulses; green square markers pop in with tickers "DCR", "LINK", "ETH", "XMR", "HYPE"; corner bracket frame; "://Ecliptica System" top-left; "status : operational" bottom-right; glitchy character portrait card top-right | Virtual camera zooms into sphere at 10.8-11.5 (scale 1 -> 2.5, expo-in), sphere lines pass by; ETH marker isolated | Zoom-through to ETH marker | 2D vector HUD (SVG/canvas) |
| 8 | 12.40-15.50 | "ETH" marker, then "Fetching Market Data..." typed; green glass ETH octahedron materializes (scale up from 0) and spins on Y | Static camera, crystal spin ~180 deg/s ease-out | Crystal slides left and grows | 3D render (crystal) over 2D HUD |
| 9 | 15.50-20.40 | Big ETH crystal left, callout lines draw to right with "+" end ticks; data panel types in: "Gamma exposure" "+$2.4B (78th %ile)" then content swaps to "Primary opportunity" "Long" with stats grid (see copy) | Static; crystal slow spin; text typewriter / scramble, lines draw with ease-out | Glitch (20.4-20.9): horizontal slice displacement, blue character bleeding through | 3D crystal + 2D type |
| 10 | 20.90-25.20 | Green radial streak tunnel bg; a card hanging on chains swings in ("Beginner 0-6m", "$1K-10K", "Risk-Averse Starter" with character art), then 4 more cards fan out behind left/right: "$50K-250K Scalper Elite", "$100K-500K Position Builder", "...tum", "...vative Trader" | Cards swing (pendulum, damped), camera slight push; fan with stagger | Zoom blur back / out (25.0-25.5) | 3D render (cards) + illustration textures |
| 11 | 25.50-27.50 | Dark: wireframe outline of an arcade/terminal console, glowing green edges, screen fades on showing trading terminal (candle chart) | Camera tilts/dollies over console | Continuous | 3D render (line/outline shader) + UI texture |
| 12 | 27.50-31.33 | End card: "Ecliptica Strata" (2 lines) top-left, "AI-Powered Asymmetry for Strategic Advantage" under it, mint CTA pill "www.ecliptica.ai ↗" bottom-left; terminal with chart at an angle right; green edge glow intensifies | Very slow drift; title fades up 27.5-28.0 | Fade to black at end | 3D + 2D type |

## Typography
- Title "Ecliptica Strata": neo-grotesk regular, white, 2 lines, cap height ~6.5% frame height, line height 1.0, tracking -2%. Free alt: Inter 400 (or Inter Tight 400).
- Subtitle: same family ~1.8% frame height.
- HUD labels: grotesk small caps-ish, 1.3-1.6% height; section headers in mint green "Primary opportunity", "Gamma exposure", "Position recommendation"; values white. Monospace for the scramble block bottom-left. Free alt: Inter + JetBrains Mono.
- Animation: typewriter + character scramble for data, counters for numbers, line draw-on for callouts, all popped on the 117.5 BPM beat.
- Verbatim (end card + HUD): "://Ecliptica System", "status : operational", "System initialization DONE", "Running scripts", "Launching UI", "DCR", "LINK", "ETH", "XMR", "HYPE", "Fetching Market Data...", "Gamma exposure", "+$2.4B (78th %ile)", "Primary opportunity", "Long", "Overall 88/100", "Edge type Options flow", "Base confidence 76%", "://GEX REGIM:", "EXPLOSIVE GAMMA WALLAT AT 3.5K$", "DEALER HEDGING FLOWS AMPLIFYING DOWNSIDE", "://GAMMA EXPOSURE:", "Total GEX: -$10.54B (7th %ile)", "GEX Regime: EXPLOSIVE", "zero Gamma: $3,500", "Key Gamma Walls: $3,500, $3,400, $3,600", "Dealer Positioning: Short Gamma", "Gamma wall at $3,500 aligning with current price.", "Dealer hedging flows amplifying downside.", "Position recommendation", "Direction Long", "Entry $4,060 - $4,080", "Stop $3,850", "Targets $4,200, $4,500, $5,000", "Size 5.0% of account", "Leverage 2.5x", "Beginner 0-6m", "$1K-10K", "Risk-Averse Starter", "$50K-250K", "Scalper Elite", "$100K-500K", "Position Builder", "Ecliptica Strata", "AI-Powered Asymmetry for Strategic Advantage", "www.ecliptica.ai". (Typos like "REGIM" and "WALLAT" are in the source.)

## Color palette (sampled)
- Navy bg: #08081c / #04061b, black #000000
- Teal vignette: #103637, #0b272c, #154543
- HUD green text: #62cea0, line green #1fa47b
- Crystal edge glow: #5eb787, face #0d3514
- Character electric blue: #191dd7, #203099
- CTA mint: #19ff97
- Text white: #ffffff at 90%

## 3D / materials / lighting
- ETH crystal: dark green glass with emissive edges (wireframe modifier or fresnel edge emission), strong bloom, scanline overlay.
- Character: flat duotone (blue body, green hand) with engraving-style line hatching on forms, glitch/kaleidoscope textures on mask. Reads as either NPR 3D (Blender: line art + halftone/hatch shader + color ramp duotone) or AI image-to-video with a stylization pass. Motion is minimal (hand drift, finger press), which suggests image-to-video.
- Cards: thick bevelled frames with emissive teal edges, chains, illustrated faces as textures; radial-blur tunnel bg.
- Overall: CRT scanline overlay on HUD shots, chromatic glitch on transition, bloom everywhere, slight grain.

## Signature techniques
- Beat-locked UI: every HUD element appears on a 0.51 s grid.
- 2D HUD + single 3D hero object (crystal) composited in the same frame.
- Glitch slice transition from data to collectible cards.
- Pendulum-swinging cards on chains as a "choose your profile" moment.
- End card with product terminal at an angle and one mint CTA pill.

## Recreation plan
| Shot | Tool | Difficulty | Assets |
|---|---|---|---|
| 2 logo | HyperFrames | 1 | Mark traced as SVG |
| 3-4 character + hand | Blender NPR (Freestyle/line art + hatch shader) or AI image-to-video | 5 | Character model or key image; hand model. This is the only part that may need AI |
| 5-7 boot + HUD sphere | HyperFrames (SVG + GSAP) | 2 | Ellipses, reticles, markers, portrait card |
| 8-9 crystal + data | Blender (crystal pass, alpha) + HyperFrames (HUD, typewriter) | 2 | Octahedron mesh, emissive edges |
| 9 glitch | HyperFrames (slice displacement shader / canvas) | 2 | |
| 10 cards on chains | Blender | 3 | Card frames, chain (array + curve), illustration textures (need 5 character portraits) |
| 11-12 console + end card | Blender (outline shader) + HyperFrames type | 2 | Console model, terminal UI texture |
| Audio | 117.5 BPM synth track, glitch SFX | 2 | |

- 1:1 feasibility WITHOUT AI video: **6/10**. 80% of runtime (6-31 s) is HUD + simple 3D, fully reproducible. The character/hand shots (1.5-5.8 s) and the 5 card portraits are the blocker: they need either a stylized character build in Blender (high effort) or AI stills.

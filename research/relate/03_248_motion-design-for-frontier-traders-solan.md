# 03 - Motion Design for Frontier Traders (Solana), 2x2 grid loop

## Meta
| Field | Value |
|---|---|
| Title | Motion Design for Frontier Traders (Solana) - Relate post 248 |
| File | ref/03_248_motion-design-for-frontier-traders-solan.mp4 |
| Duration | 12.00 s = one 6.00 s loop played twice (frame 0-144 identical to 144-288) |
| Resolution / fps | 1920x1080, 24 fps, split into four 960x540 cells, no gutters |
| Audio | Yes. Same minimal electronic bed as 04/05 (librosa 161.5 / 80.7 BPM ambiguous). Short "tchk" clicks on cell cuts, finger-tap click at ~3.5 s (phone cell). |
| Frames | frames/03_248_motion-design-for-frontier-traders-solan/ |

## Structure
A "brand system reel": four independent mini-edits of the 04 material running simultaneously in a 2x2 grid. Each cell cuts on its own schedule, so the grid never changes all at once. Cells: TL = typography (white), TR = chrome 3D (light grey #ECECEC), BL = glass letters / footage (black), BR = data and product (white/grey).

Per-quadrant cut times measured with ffmpeg scene detection on cropped cells (first loop):
- TL: no hard cuts detected - continuous type animation (headline -> rods -> dash field -> logo icon).
- TR: 0.75, 1.58, 2.42, 3.21 (then loops at 6.0).
- BL: 2.17, 2.71, 4.08, 4.50, 4.75 (plus label swaps every ~0.25 s on glass).
- BR: 1.00, 5.00 (+ 6.00 loop point).

## Shot list (per cell, first 6 s loop)
| # | In-out | Cell | On screen | Camera + easing | Transition | Technique |
|---|---|---|---|---|---|---|
| TL1 | 0.00-1.40 | TL | "The Frontier / is the edge / of opportunity" builds line by line (0.00, 0.25, 0.50) | Locked | Continuous | 2D type |
| TL2 | 1.40-3.70 | TL | Chrome rods drop one by one onto the headline until it is buried (1.50-3.25), text then removed leaving the rod pile | Rods fall, ease-in, bounce | Continuous | 3D rods over 2D type |
| TL3 | 3.70-5.00 | TL | Rod pile dissolves into the dash flow field, dashes swirl | Field motion ease-in-out | Continuous | 2D procedural |
| TL4 | 5.00-6.00 | TL | Radial chrome bolts spinning and imploding (5.25-5.75) | Spin + implode | Loop | 3D render |
| TR1 | 0.00-0.75 | TR | Chrome holed block rotating | Rotate, ease-in-out | Hard cut | 3D |
| TR2 | 0.75-1.58 | TR | Macro of block face with bore and tapped hole | Slow push | Hard cut | 3D |
| TR3 | 1.58-2.42 | TR | Block sliding along rod | Rotate + push | Hard cut | 3D |
| TR4 | 2.42-3.21 | TR | Rod + block T-junction macro | Drift | Hard cut | 3D |
| TR5 | 3.21-4.20 | TR | Scaffold assembly (2 rods, 2 blocks, pins) | Pull back | Hard cut | 3D |
| TR6 | 4.20-5.00 | TR | FT logomark bars assembling (black on light grey) | Bars ease-out | Continuous | 2D |
| TR7 | 5.00-6.00 | TR | Lockup "FT Frontier Traders", wordmark blur-slides in | Expo-out | Loop | 2D |
| BL1 | 0.00-2.17 | BL | Giant glass letters on black, crypto logo in center swaps every 0.25 s (Solana, Jupiter-like rings, Orca, pump.fun pill, X, robot, striped sphere, X, hexagon "R" Raydium) | Slow truck | Hard cut | 3D glass + 2D plates |
| BL2 | 2.17-3.00 | BL | B&W car passing, motion blur | Footage | Hard cut | Stock |
| BL3 | 3.00-4.08 | BL | Glass letters + currency pairs swapping every 0.25 s: USD/JPY, AUD/USD, EUR/JPY, USD/SEK, USD/MXN (GBP/JPY seen at 3.6) | Slow truck | Hard cut | Mixed |
| BL4 | 4.08-4.75 | BL | B&W pedestrians, motion blur | Footage | Hard cut | Stock |
| BL5 | 4.75-6.00 | BL | Word stack scrolling behind glass ("Compression, Decision, Break, Risk, Execution, Flow, Book... Counterparty, React, Respond, First, Market, Adrenaline, Hold...") | Linear scroll | Loop | Mixed |
| BR1 | 0.00-1.00 | BR | Counter "Trades 197,124... -> 528,043..." / "Value $145,293 -> $233,696" with ghost trails | Locked | Hard cut | 2D |
| BR2 | 1.00-2.00 | BR | Bar chart card on grey, tooltips 4.2% / 3.6% | Bars grow | Cut | 2D UI |
| BR3 | 2.00-3.00 | BR | Dash flow field (black on white) | Field | Cut | 2D |
| BR4 | 3.00-5.00 | BR | Metal stat card "79,367" flipping into view and holding | Ease-out flip | Hard cut | 3D |
| BR5 | 5.00-6.00 | BR | B&W hand holding phone with Frontier app (stats "8,889", "$14,..."), finger tap | Footage | Loop | Stock / photo composite with UI screen |

## Typography
Same system as 04: Neue Haas Grotesk / Helvetica Now Display Medium, free alternative **Inter Tight 500**, tracking -0.02 to -0.03em. Sizes relative to cell height h (540 px): headline ~0.11h, counter numerals ~0.40h (cropped), currency pairs ~0.15h, word stack ~0.13h, lockup wordmark ~0.07h. Verbatim copy as listed in the shot list and in 04.

## Color palette (sampled)
| Role | Hex |
|---|---|
| TL / BR paper | #FCFCFC |
| TR 3D stage | #ECECEC |
| BL black | #010101 |
| UI grey | #DADADA |
| Chrome mids | #BDBDBD, #8B8B8B, #4D4D4D |
| Accent | none (monochrome) |

## 3D / materials / lighting
Identical to 04/05 (chrome on seamless light grey, soft studio light, no DOF, no grain; frosted grunge glass letters on black with bloom). Each cell rendered at 960x540.

## Signature techniques
- 2x2 grid with zero gutters and asynchronous cuts per cell; polarity per cell fixed (TL white, TR grey, BL black, BR white), so the grid reads as a checkerboard of tones.
- Seamless 6.00 s loop (end state of each cell matches its start), designed for X/Twitter autoplay.
- Rapid 6-frame swaps (0.25 s) for logos and currency pairs inside a held 3D shot.

## Recreation plan
| Cell | Tool | Difficulty | Notes |
|---|---|---|---|
| TL | HyperFrames type + Blender rod drop (alpha) + canvas flow field + bolt render | 3 | Rods must land on the type layout |
| TR | Blender chrome renders + HyperFrames logo build | 3 | Same assets as 04/05 |
| BL | Blender glass letters (alpha) + HyperFrames swapping plates + stock B&W | 4 | |
| BR | HyperFrames counter/chart/field + Blender metal card + stock hand-with-phone (or 3D phone + photo hand) | 3 | |
| Grid | HyperFrames: 4 sub-compositions in a CSS grid, 6 s loop x2 | 1 | |

- Assets: everything from 04, plus a hand-holding-phone clip.
- Effort: ~6-8 h incremental after 04 is built (re-cut and re-render at cell size); 35-50 h standalone.
- **1:1 feasibility without AI video: 8/10.**

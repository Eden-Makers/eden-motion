# 08 - Custom Tool for Quip (generative pattern generator)

## Meta
| Field | Value |
|---|---|
| Title | Custom Tool for Quip - Relate post 231 |
| File | ref/08_231_custom-tool-for-quip.mp4 |
| Duration | 28.80 s |
| Resolution / fps | 1280x800, 30 fps |
| Audio | **No audio stream.** |
| Frames | frames/08_231_custom-tool-for-quip/ |

## Structure
A single continuous screen recording of an in-house web tool ("QUIP GEN") on a white page: dark app window, left control panel, square canvas showing a symmetric generative pattern that changes mode/palette about every 0.5-1.5 s. Scene detection only fires on big palette jumps (12.73, 22.33, 25.20, 28.63).

## Shot list
| # | In-out | On screen | Camera | Transition | Technique |
|---|---|---|---|---|---|
| 1 | 0.00-1.40 | Pixel mandala (kaleidoscope symmetry), palette cycles pink -> green -> blue on white | Static screen capture | Param change | UI screen recording |
| 2 | 1.40-3.80 | Black and white noise-line patterns, then dot-grid patterns in grey and olive on black | Static | Param change | Screen rec |
| 3 | 3.80-6.00 | Red/pink dot mandalas on white, increasingly dense | Static | Mode change | Screen rec |
| 4 | 6.00-9.00 | "Star waves" mode: radial dashed rings (red), ripple interference, radial burst (black) | Static | Mode | Screen rec |
| 5 | 9.00-12.70 | Teal/blue radial, then green ring mandalas on white | Static | Palette | Screen rec |
| 6 | 12.70-22.30 | Black bg + acid lime #BCED55 / mint palette: plasma rings, crystal stars, maze-like symmetric pixel blocks; canvas zooms out to small then back to full (14.0) | Static | Palette | Screen rec |
| 7 | 22.30-25.20 | Magenta/pink on white, concentric ornamental mandala, then radial petals | Static | Palette | Screen rec |
| 8 | 25.20-28.80 | Dark mode pink pixel scatter, black/white crystal pattern, pink/pastel pixel crosses | Static | End | Screen rec |

## Typography
UI only, tiny monospace caps labels (like "QUIP GEN", "PATTERN", "RADIAL SYM", "CIRCLE MASK", mode buttons such as "NOISE LINES", "STAR WAVES", "MANDALA", "CRYSTAL", "PLASMA", "SPACING", "MIX") - legible only partially at 1280x800. Free alternative: **JetBrains Mono** / **IBM Plex Mono** 400, ~0.012H.

## Color palette (sampled)
| Role | Hex |
|---|---|
| Page white | #FBFBFB |
| App window | #111110 |
| Acid lime | #BCED55, #80AA44 |
| Olive dark | #5C6B36 |
| Magenta pink | #C45479, #C35D81 |
| Periwinkle | #6466A9 |
| Swatch rows | red, blue, green, purple, orange + pastel gradient column |

## 3D / materials / lighting
None - pure 2D generative graphics (pixel grid quantization, N-fold mirror symmetry, radial masks, noise fields).

## Signature techniques
- Kaleidoscopic N-fold symmetry over a quantized pixel/dot grid.
- Two-tone palettes (ink + paper) swapped in real time; dark and light modes.
- Pattern modes: noise lines, star waves, mandala, crystal, plasma.

## Recreation plan
| Part | Tool | Difficulty | Notes |
|---|---|---|---|
| Pattern engine | HyperFrames + WebGL/Canvas fragment shader (polar fold, noise, quantize to grid, palette map) | 3 | Deterministic seeded params per segment |
| Tool UI chrome | HTML/CSS | 2 | Control panel replica |
| Recording | HyperFrames render | 1 | |

- Assets: none external (palette and UI can be recreated). Quip mark optional.
- Effort: 10-16 h.
- **1:1 feasibility without AI video: 9/10** (exact patterns would need reverse engineering; the look is fully code-reproducible). Visually it is a tool demo rather than a motion piece.

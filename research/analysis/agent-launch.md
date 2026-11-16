# Agent launch film (voice-AI agents, 2026): measured rules

Source: a 67 s launch film for an agent builder, 60 fps, 22 cuts, reversed frame by frame with HyperFrames.
The type layer (intro, lockups, integrations line, closing line) was rebuilt and measured; the product UI was
cut, not rebuilt. Numbers at 1920x1080, frames at 60 fps.

## Pacing and look
- Long shots (median ~4 s), almost all movement inside the shot; only the integrations line hard-cuts every
  40 frames (0.67 s).
- Warm paper #f2f2f2 with faint texture (rounded grid, letter cloud); one grotesk (Inter-like) at 50-67 px for
  lines, 56 px for the lockup; ink #141414, the product name in a soft lavender. Mesh gradients with heavy blur
  and grain (sand, rose, plum, ink blue) carry the colour.

## Techniques (scene names in eden-motion)
1. Morph chain intro: two pause bars (20x44 px) grow to 71 px and thin to 13 px in 0.5 s, split apart and
   become two 13 px dots that ride out to x 260 / 1671 while "Your agents" opens from its centre (8 frames).
   The line then squeezes back into its centre (15 frames), a square grows from it (40, 76, 200 px in 10
   frames) and becomes a gradient tile with micro caps labels around it; the tile grows in steps and fills
   the frame.
2. `fx.squeeze`: clip a line from both sides to its centre with two dots riding the clip edges; the end of one
   idea becomes the seed of the next element.
3. `split-lockup`: two bars 33-42 px apart split to the wordmark edges in 0.2-0.5 s, the wordmark is revealed
   from the centre (309, 390, 436 px in 12 frames), holds 0.3 s, slides left 120-140 px with power3 in-out over
   24 frames while the product name fades and reveals left to right over 36 frames. Used as both bookends.
4. `tool-swap`: "Connect Architect to - tool": static stem, 80 px hairline dash, tool name 1.1x the stem; tool
   name and the full-bleed gradient behind it change together every 40 frames; the whole line shrinks 1.0 to
   0.84 over 3 s around the centre; the last gradient closes into a circle.
5. `inline-orb`: the circle lands in the gap of "Improve ( ) your agents", breathes, then the halves close.
6. Closing line on a letter cloud: "Elevate" alone, then "your customer" in ink and "experiences" in light
   grey for 36 frames, then all ink; the line grows 3% and squeezes into the pause bars that open the lockup.

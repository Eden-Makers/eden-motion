# Editorial launch film (image-model launch, 2026): measured rules

Source: a 47 s launch film for an image model, 24 fps, 63 cuts, rebuilt frame by frame with HyperFrames
reverse (SSIM 0.957 against the original, 61 of 63 cuts). Footage is generated stills and clips; the type
layer is what carries the film. Numbers below are measured at 1920x1080.

## Pacing
- Median shot 0.5 s in the cold open (6 labelled shots in 3.3 s), 2-4 frames per image in the flash
  under one held line, 0.5-1 s per verb shot, a 6 s close.
- Cuts land on the image change; type moves on twos (every 2 frames) in the scattered section.

## Type
- One soft, low-contrast serif for everything, letterpress edge (slight displacement), on paper #eeeeee
  with grain, ink #1c1c1c. White type over footage. One accent: lavender #a27ae7 (pale #c3ade5).
- Sizes: labels 136 px, scattered words 82 px, title line 113 px, headline 119 px, verb words 250-925 px.

## Techniques (scene names in eden-motion)
1. `label-flash`: four 14 px square marks 38 px outside the ink, ~110 px above and below the centre. On each
   cut, for 1-3 frames, the marks are two dashes (26 and 30 px by 10 px) in a colour taken from the shot and
   the word is condensed (scaleX 0.8) or wide-tracked (+0.13 em). Last word scales 1.37 then 1.56 into the cut.
2. `scatter-line`: tiles snap to a 120 px grid (2x2, 2x3, 4x2.5 cells), words on white chips jump three to four
   times on twos toward the middle, collapse into one line that grows 15% in 0.6 s, tiles scale out.
3. Scramble (`fx.scramble`): letters drop out at random for 3 frames, the title fills in the accent for
   2-3 frames, then turns ink. One word then swaps font every 3 frames (serif, mono, bold) before the cut.
4. Logo as a selection: mark grows 250 to 380 px with ease out over 17 frames, four handles 46 px outside
   its corners twitch inward once, the mark turns pale and slides out left 20-140 px per frame.
5. Giant arrival: headline at 4.4x slides in from the lower right, a blurred image blooms from the lower left
   behind it (opacity 0.35 to 1 in 12 frames), the type wipes ink to white left to right as it crosses the
   bloom, then cuts to 1x over the next shot with the words on a wave baseline (0, -8, +12, +30, +44 px)
   that flattens in 0.75 s.
6. One line over a flash: the headline holds while 10 blurred chromatic images change every 2-9 frames;
   ends on paper with a multi-colour gradient fill.
7. `type-behind`: one verb per shot ("Mask it", "Edit it", "Write on it", "Launch it"), the product in front of
   the type; "Write" at 925 px rises from below in 9 frames, drifting up and left.
8. Mask erases type: a selection box over the subject removes the part of the line inside it.
9. Text as a window: three stacked copies of the line (318-440 px) filled with the next shot, 6 frames.
10. `frame-grow`: frame widens 586 to 1785 px in three pushes with expo out (object-fit cover anchored at 75%),
    word under it grows 132 to 205 px, tracking 0 to 45 px; ghost giant word (1220 px, 6% ink) behind.
11. Close: line typed on with lavender corner marks, marks burst to the centre, icon grows 87 to 171 px in
    10 frames, lockup lands 300 px right and slides into place in 18 frames, CTA 1 s later.

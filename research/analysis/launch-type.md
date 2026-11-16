# Launch type: measured from a SaaS launch film (Zaro, 68.5 s, 28 shots)

Reverse-engineered frame by frame with HyperFrames (`reverse-any-video`), rebuilt to SSIM 0.937 over 2056 frames.
Only the measurements and techniques live here; the rebuild and every cut-out asset stay local.

## Measured rules
- **Pacing.** No metronome grid. Median shot 1.8 s; type holds 2-2.5 s; UI shots 1-4 s; one 7.7 s sequence.
- **Palette.** Four grounds (ink #1f1313, taupe #514643, paper #edebe5, stone #c1beaf), one accent (lavender
  #bcacf4) for hot words, carets, pills and the CTA. Type #f8f6f3, secondary #a8a29c.
- **Hot word.** A word lands in the accent, rises ~46 px in 0.42 s (expo.out) and cools to its role colour 0.27 s
  later: content words white, connectors (and, your, with) grey.
- **Statement + typed reply.** Line 1 present, line 2 typed grey with an accent caret, 13-19 chars/s with uneven gaps,
  2-3 caret blinks, then the block scales to 0.97 into the cut. Four uses in one film.
- **Inline slots.** The sentence opens 0.6 s in (0.33 s expo.out), a card and a pill grow from 0.45 and roll
  13 examples in 1.4 s. Pills have stepped pixel corners.
- **Word swap.** Last word deleted at ~20 chars/s and retyped (mess. -> files. -> tools.), stem stays put.
- **Light sweep.** An accent band crosses a held line in 0.66 s, twice, 1.3 s apart.
- **Dot matrices.** 22 px dot ground (circles and rounded squares, 2-8 px, noise clusters); dot-matrix speech
  bubbles at 12.5 px pitch drifting round a headline; a dot-matrix headline that pops in and shrinks to the accent.
- **Pixel mosaic cut.** Two or three frames of 160 px blocks, then 128 px blocks, out in three steps.
- **Giant prompt.** The prompt bar at 4.4x with only "+ What|" visible, then a hard cut to the same bar at 1x while
  typing goes on; the cursor clicks send (0.9 scale, 80 ms).
- **Status ticker.** A new status line every 0.08 s, newest dark, older grey, the list scrolls beside the panel
  of sources.
- **Split screen.** 50/50: hot-word headline on the dark half, product UI with its own camera on the light half.
- **Close.** Soft iris (30 px blur) in 4 frames to paper, a dot grows into the mark with a turn, the wordmark types
  on letter by letter, a mono CTA chip in the accent.

In the engine: `type-reply`, `slot-line`, `word-swap`, `status-roll` scenes and the helpers in `runtime/scenes/reply.js`.

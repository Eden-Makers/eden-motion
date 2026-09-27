# Director's brief (long-form or flagship films)

Viral "one prompt" code films are rarely one prompt. The Claude Pop music video (3.2M views) came
from a ~9,500-character dictated brief and a 12-hour autonomous run; the Pip robot film used 19,000
characters; a 45 s watercolour short took 163 model calls. Short prompts that work trigger a prepared
skill or project folder: the project directory is input. They don't describe a video, they hire a crew.

## Template (fill every section, paste style bibles verbatim: paraphrase causes drift)
```
You are the director, animator, sound designer and render engineer for a [DURATION] film made in code.
Treat this as a multi-session production. Don't rush to a final render.

## The film in one line
[LOGLINE. What the viewer should feel at the end.]

## References and inputs
- refs/: [video / frames / image library]. Take the grammar, never the content, logos or characters.
- audio/track.wav: use it unchanged. Measure the beat grid first.
- Skills: eden-motion (this repo). APIs in .env: [ELEVENLABS_API_KEY, GEMINI_API_KEY, Higgsfield CLI].
  Budget: [credits / $]. Be economical.

## Look
[3-5 lines: palette, type, texture, camera language. Banned looks.]

## Character bible (if any)
Proportions, palette sampled from the sheet's swatches, expressions, an identity lock that survives
every style change. Gate: a lineup still of the rig next to its reference sheet must pass first.

## Beat sheet (a row per shot)
time | what we see | the read and its hold | camera (and what must NOT move) | text on screen | SFX
0:00-0:02 hook: the single most striking image, opened mid-action (frame 0 never empty)
...       a new visual payoff every 3-5 s; feelings written as behaviour, not labels
[END]     the last frame sets up the first (loop) or lands the CTA

## Text on screen
When lyrics or captions go huge and when they sit like subtitles. Compose shots to leave room.

## Workflow, with gates
1. docs/style_guide.md + docs/shotlist.md (every shot: frames, camera, text, reads, SFX). Show them.
2. Stills for every shot, contact sheet, critique.
3. Animatic at 960x540 with placeholder audio. Fix pacing before polish.
4. Full animation, polish pass, sound pass, final render.
5. Chapters in parallel subagents (below).

## Critique loop (every shot, 3 rounds minimum)
`eden-motion critique`; log scores + 3 biggest problems in renders/review_log.md; fix; repeat until 8+.

## Deliverables
final.mp4 · loop check (the film concatenated with itself) · poster.png · contact sheet · README
```

## Parallel chapters (60 s and longer)
Pattern from the PDoom music video repo: before any subagent starts, the lead writes
`docs/ANIMATION_GUIDE.md` (the house style as code rules, helpers to use, banned moves) and
`docs/STORYBOARD.md`. Each chapter is its own file in `custom-scenes/` owning a time window; shared
runtime files are read-only for subagents (they report bugs, and write missing helpers privately in
their own file). Every subagent verifies its own chapter with a draft render of its window plus
`critique` strips before handing back. The lead merges, then runs the full critique loop.

## Techniques worth reaching for
- **Generate, then trace:** Seedance renders base shots for character acting and physics; the film
  redraws everything in code on top so the viewer only sees the code-drawn layer. Motion that is hard
  to hand-animate, a look that stays consistent and ownable.
- **Snap, then hold:** pops and stamps change in 1-2 frames and ease only on the settle.
- **Hit-stop:** freeze scene time 2-3 frames (0.083 s, 0.125 s for a big hit) on contact while effects
  keep running; a hit is five things on one frame (flash capped at 0.6, sparks, ring, word, shake).
- **Regeneration transition:** the frame dissolves edge-inward into diffusion-style noise, holds a few
  frames, the new world denoises coarse to fine; the subject lags one beat half old style, half new.
  8-12 frames, new seed and direction each time. On-brand for an AI studio.
- **Film finish:** 4 precomputed grain tiles cycled with random offsets per frame plus +-2.5% flicker,
  instead of one static grain overlay. Light is additive (a glow texture), never pigment-mixed.
- **Character acting:** mood changes never snap (a 0.16 s squint, a squash take, overshoot, emote pops
  in); each emotion has its own beat-locked idle; turns step through drawn key views with smears;
  avoid twinning (offset arms, blinks, crowds).
- **Stills to 2.5D:** generate characters on pure #00FF00 (asking for transparency returns a fake
  checkerboard), make pose variants as edits of the base, depth map (Depth Anything V2) drives
  per-pixel parallax instead of flat pushes.
- **Spatial SFX:** pan each one-shot by its element's screen x (`x` on the cue), low-pass far layers.

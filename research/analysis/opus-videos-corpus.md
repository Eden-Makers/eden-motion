# awesome-opus5-5-videos + image-blaster: what eden-motion can take (2026-10-18)

Sources: github.com/yihui-dev/awesome-opus5-5-videos (MIT, 703 prompts for videos people made with
Claude Opus 5.5 as code, 418 with live remakes on Skillry) and github.com/neilsonnn/image-blaster
(MIT, image-to-world skillset for Claude). Found via x.com/HurricaneCrypt0.

## Corpus facts
- Categories: motion 369, 3d 117, explainer 116, interactive 101. Tech: canvas 267, svg 183,
  threejs 131, shader 92, gsap 86. 15 s is the most asked length, then 30 s; 1080p/60.
- Most prompts are one-liners ("make a 15 s motion graphics video ... go all out"); the strong
  minority are tagged briefs (<inputs> <direction> <structure> <build> <gotchas>, the
  twoclipping-* family). 35 demand every frame be a pure function of t; 21 ask for a contact
  sheet before the full render (both things eden-motion already does).

## Techniques we do not have yet (slugs = examples in data/videos.json)
1. scale-dive: one unbroken zoom through nested scales with a scale ruler (acoramaa-053577).
2. explode-cutaway: product slides apart on an axis, leader-line labels (aichrislee-408244). Blender + HF labels.
3. live-sim: a real seeded simulation as the proof, with counters (astrothewizard-618782).
4. type-architecture: words take physical roles, lintel, load, trajectory (gdgtify-929495).
5. mechanism-proof: number wheels, belts, gauges demonstrate a claim (gdgtify-393073).
6. tile-reveal: thousands of tiles flip in to assemble the logo (tanabe-fragm-322001). Blender geo nodes.
7. clip-wall scan + 3D carousel + whip onto the hero (twoclipping-000267).
8. inside-the-dot film + flood-contract and goo-morph transitions (twoclipping-747965, thejohnnyhuy-282154).
9. wireframe-to-final ink stages (heyiamnick-119558, archiveexplorer-560622).
10. frame-breakout: the feature bursts out of the phone and changes the world (bilimfili1-459762).
11. print style pack: halftone, riso, misregistration on impacts, die-cut stickers (techhalla-498547).
12. paper / pencil narrative style with line boil (songkeys-384673).
13. timeline-scroll with a year counter and a parallel track (astrothewizard-618782).
14. shader-hero: raymarched fractal gaining detail per beat, carved into the logo (xanares-738984).
15. light-reveal: blocks fall away and light projects the logo on the floor (agioyaz-397647). Blender.

## Prompt craft to fold into script/storyboard prompts
- Beat grid first (bars at a BPM, one move per bar); effects scale with song energy (40/70/100 %).
- Explicit banned list per film; transitions must demonstrate a feature, not swap cards.
- Locked copy + facts file (no invented numbers); hex palette; safe border; >= 2.5 s per feature;
  must work muted; wireframe pass, one still per beat, scored self-review before final.

## Using the corpus
- Benchmark suite (~24 prompts: showreel one-liners, structured launch briefs, explainers,
  kinetic type, UI morph) rendered by eden-motion and critiqued side by side with the Skillry remakes.
- Reference picker: embed the 703 prompts, pull the closest <direction> and banned blocks into the
  storyboard prompt per brief. Tagged twoclipping briefs as a few-shot output format.
- Mine the banned lists into the critique rubric, the gotchas into HyperFrames lint rules.

## image-blaster (BORROW)
Not local 3D: Claude analyses the image, Nano Banana 2 (FAL) cleans the plate, World Labs Marble
1.1 API returns Gaussian splats (.spz) + collider .glb, Hunyuan3D/Meshy for objects, a React Three
Fiber + Spark viewer with a patched DOF shader. No camera paths, no video export.
Take: (1) the Marble client (one paid call per approved still, cache .spz), (2) the Spark DOF
shader patch, for a new HyperFrames "splat-camera" scene (Three.js + Spark, seek-driven GSAP
camera: probe-lens pushes, orbits) = true 3D moves through an AI still without paying for AI video.
Risks: World Labs lock-in and pricing (not in Eden Gen, needs a deliberate exception), splats break
on wide moves away from the source view, Hunyuan3D licence excludes the EU.

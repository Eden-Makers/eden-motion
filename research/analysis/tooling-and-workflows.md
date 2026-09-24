# Tooling and workflows for an agent-driven motion-graphics explainer pipeline

Research date: 2026-09-24. Goal: company name in, finished explainer out (VO, story, kinetic type, UI mockups, motion blur, SFX), authored by coding agents (Claude Code, Codex, others).

All local artifacts live under `~/Dev/eden-motion/research/`:

| Path | What |
|---|---|
| `astra-remotion/` | Cloned repo, `npm install` done, `out/astra-switch.mp4` full render + 4 stills |
| `refs/x_2102427282333901111.mp4` | Tejas (@makwanatejas170), "Dan Koe style" HyperFrames piece, 48 s, 1080p30 |
| `refs/x_2096240164138004729.mp4` | Miao Yang (@WaterrrMiao), HyperFrames recreation of the GPT-6 Astra launch, 27 s |
| `refs/x_2095595741528125780_openai_astra_original.mp4` | The original OpenAI Astra launch video (the thing both repos recreate) |
| `refs/vimeo_1204604440.mp4` | Anyway Studio, "Lovable Design Launch Video", 54 s, 1080p |
| `refs/vimeo_1204604724.mp4` | Anyway Studio, "Lovable x Google", 46 s, 1080p |
| `refs/sheets/*.jpg` | 20-frame contact sheets of every reference and of the Astra render |

---

## 1. astra-remotion (github.com/Tejashmakwana/astra-remotion)

### What it is
A single parody film ("Astra Switch": "We're moving to Astra. Until the next release.") recreating the look of the OpenAI Astra launch video. README links the video at x.com/aymannpk/status/2096649103619043400. One commit, no agent/prompt files, no skills, no CLAUDE.md. It is clearly one-shot agent output (dense, minified style, everything in one file).

### Architecture
- `src/index.ts` registers root, `src/Root.tsx` defines one `<Composition id="AstraSwitch">` 1920x1080, 25 fps, 1048 frames (41.9 s).
- `src/Film.tsx` (76 lines, very long lines) holds everything: helpers, 8 scene functions, and the master switch.
- `public/`: `openai-mark.png` + `soundtrack.m4a` (a single pre-mixed music/SFX bed; no per-event SFX, no VO).
- Dependencies are the bare minimum: `remotion`, `@remotion/cli`, `@remotion/renderer`, `@remotion/bundler` 4.0.521, React 19. **No `@remotion/transitions`, no `@remotion/motion-blur`, no fonts package.** Font is plain Arial/Helvetica.

### Scene structure
The master component is a hand-rolled frame router, not `<Sequence>`/`<TransitionSeries>`:
```
if(frame<120) Intro; else if(frame<225) Connect; ... else Outro   // each gets f = frame - sceneStart
```
Scenes: Intro (kinetic word swaps), Connect (dark app pill -> cursor -> "Astra" pill -> node graph of app icons wired with bezier SVG paths), Chat (ChatGPT-like UI, zoom-in, typed prompt with blinking caret, moving cursor), Plan (answer text + 4 staggered cards), Actions (4 skeleton-loader pills that resolve into checked items), Report (scrolling chat document + cursor), Notification (Slack-like toast on spring scale), Outro (kinetic type beats with glow, pill logo lockup, gradient bg). Transitions between scenes are **hard cuts**; all the perceived smoothness comes from in-scene entrances/exits.

### Animation primitives (the whole vocabulary)
- `ease(f,a,b,x,y)`: `interpolate` with clamp and a cubic ease-out `1-(1-t)^3`. Used for everything.
- `enter(f,delay)`: the "house entrance": opacity 0->1 over 7 frames, translateY 32->0 over 15 frames, **CSS `filter: blur(9px -> 0)` over 10 frames**. This blur-to-sharp entrance is the main reason it reads as "motion blurred".
- `KineticText`: splits text into characters; each char staggered 0.45-1.3 frames, 6-frame ramp: opacity, translate(24px, 8px) -> 0, blur 16 -> 0. Exit: whole line slides left 320 px, scales 0.975, blurs to 13 px and fades over 5 frames. Accent color and glow (`textShadow` double bloom) from a character index.
- Typing: `prompt.slice(0, floor(ease(...)*len))` + caret blink `f%20<12`.
- Cursor: SVG arrow with drop shadow, position via `ease` (straight line, ease-out).
- Camera: `transform: scale()` on a wrapper with a chosen `transformOrigin` (zoom in 1 -> 1.46, zoom out later).
- One `spring({damping:16, stiffness:140})` for the notification pop.
- Skeleton loaders (blue bars) that swap to content at a frame threshold.

### Why it looks good (despite being 76 lines)
1. **Per-character stagger with blur + offset** (Apple-keynote style type). Blur on entrance and exit fakes shutter blur convincingly at 25 fps.
2. **Fast, front-loaded ease-out** (cubic) on every move, 5-15 frame durations. Nothing linear, nothing slow.
3. **Tight scene rhythm**: 8 scenes in 42 s, 3-7 s each, with 2-4 beats inside each scene. Intro swaps a new line every ~20-40 frames.
4. **Restraint**: white canvas, one accent (`#87A7FA`), grey hairline borders, huge negative tracking on big type (`letterSpacing: -0.055em`), rounded panels. It copies the source brand language exactly.
5. **UI as story**: chat box, cards, loaders, notification, all built in pure CSS, no screenshots.
6. **Cursor + typing + zoom** sells "product demo" with zero assets.

Weak points: no real motion blur on translations (only blur-in), hard cuts only, no SFX sync (one baked track), Arial, no VO, no captions, all magic numbers inline (not parametric).

### Did it render?
Yes. Node 22.17, `npm install` 3 s (253 pkgs). `npx remotion still src/index.ts AstraSwitch out/still_N.png --frame=N` works for frames 60/300/500/900. Full `npm run render` (1048 frames, 1080p, CRF 16): **30.4 s wall clock** on this Mac, 4.7 MB output. So roughly 35 fps render throughput for a CSS-only composition.

### Reusable for us
- The `ease` / `enter` / `KineticText` trio is a complete, tiny kinetic-type kit; port it 1:1 to GSAP in HyperFrames or keep as a Remotion util.
- The scene pattern "UI mockup built in CSS + cursor path + typed prompt + staggered cards + loader-to-result" is exactly the SaaS explainer grammar. Worth turning into parametric blocks (props: product name, prompt text, card copy, accent color).
- The overall recipe (recreate a famous launch film's grammar, swap copy) is the fastest way to a good-looking first output.

---

## 2. X posts

### @makwanatejas170 (Tejas, "17 yr agentic engineer", building finalmotion.video), 2026-09-22
Full text: "You can now make @thedankoe style motion graphics in one shot. FinalMotion + HyperFrames." 48 s video, 1.5k views. No replies returned by the fxtwitter conversation API (post shows 2 replies). No workflow details, no prompt shared.
- Video: pure black, thin white line geometry (orbits, ellipses, concentric rings, starburst, stair-step bars) around one glowing white dot; small centered caption line under each shape, synced to a calm VO about habits ("Most days do not fall apart all at once ... starts to feel like yours again"). **Zero hard cuts in 48 s**: one continuous world where each shape morphs into the next on every VO phrase. This is the Dan Koe essay-video aesthetic.
- FinalMotion (finalmotion.video) is a "coming soon" waitlist product: "motion graphics, video editing, clip creation" in one AI workspace. Nothing technical disclosed. Tejas is also the author of astra-remotion, so he uses both Remotion and HyperFrames.

### @WaterrrMiao (Miao Yang), 2026-09-05
Full text: "That's crazy. I used GPT-6 Astra with @HyperFrames_ to recreate Astra's own launch video!!! It's all HTML, and you can edit it right in the HyperFrames preview. Inspired by @vedu_boi". Quotes the OpenAI Astra launch tweet. 34.8k views, 121 likes.
Author replies in thread:
- "Start from: https://github.com/heygen-com/hyperframes"
- To "Could you provide proof of how you did this?": "For now, this one-shotted using our secret tool, DM me for access (enterprise-only)". So: one-shot, but through an unreleased internal (probably HeyGen) tool on top of HyperFrames; no prompt shared.
- Video (27 s): mint/teal gradient mesh backgrounds, photographic stills of office workers (AI stock) with floating glass chat bubbles and "Hours saved 890" stat cards, grid-split panels, big thin serif italic words over photos ("Computer use", "Coding", "Science"), a 72.6 benchmark number, ends on "For you". 14 scene cuts in 27 s (ASL ~1.9 s).

### What they claim about workflow
- "One shot" with a frontier model (GPT-6 Astra / Claude) + HyperFrames skills. Time claimed: implicitly minutes. No prompts, no skill list published, and the best one relies on a private tool. Treat "one shot" as marketing: the grammar they recreate comes from a strong reference video, which the agent copies.
- Common thread: **reference video -> agent recreates its grammar in HTML -> edit in preview -> render.**

---

## 3. Vimeo references (downloaded)
`player.vimeo.com/video/<id>/config` via curl is blocked by a Cloudflare challenge. Worked: open `player.vimeo.com/video/<id>?app_id=122963` in the built-in browser, read `window.playerConfig.request.files.hls.cdns[default_cdn].avc_url`, then `yt-dlp -f "bv*[height<=1080]+ba/b"` on that signed m3u8 (no cookies needed, URL expires in ~1 h).

| File | Title | Author | Length | Notes |
|---|---|---|---|---|
| `vimeo_1204604440.mp4` | Lovable "Design" Launch Video | Anyway Studio (vimeo.com/anywayagency), uploaded 2026-06-25 | 54 s | 22 hard cuts (ASL ~2.5 s). Opens on a typographic montage (chrome "design", 3D bubble letters, "TYPOGRAPHY" stretched serif, "DESIGN PARTNER" with heavy real vertical motion blur), then the Lovable prompt box ("Hey Lovable, design something cool") typing with cursor, generated site mockups pushed in, comment thread UI, ends "It used to take time" -> logo. Saturated pink/orange/blue gradient mesh behind dark rounded UI cards. |
| `vimeo_1204604724.mp4` | Lovable x Google | Anyway Studio | 46 s | 16 cuts. Same system: prompt box types "Create a sales dashboard from my BigQuery data", big hand cursor clicks submit, UI mockups (dashboard, shoe store, booking slots, Gmail inbox, map store locator) zoomed to macro crops, integration pills (BigQuery, Google Sheets, Gmail), fan-out collage of many app screens, logo. |

Takeaways from Anyway Studio: huge macro crops of UI (a single button filling the frame), an oversized hand cursor, gradient-mesh backgrounds with dark glass cards, typed prompts as the story spine, real motion blur on every fast push, and a collage "explosion" before the logo.

---

## 4. Web research: how people make these in 2025-2026

### Engines
- **HyperFrames (HeyGen)**, github.com/heygen-com/hyperframes. Apache 2.0, ~52.8k stars (launched April 2026, 19k by May, 33k by July). Write HTML/CSS + a paused GSAP timeline (or Lottie, Three.js, Anime.js, CSS, WAAPI, TypeGPU via adapters); every timed element has `data-start` / `data-duration` / `data-track-index`. Renderer never plays: it seeks to each frame and captures via Chrome `HeadlessExperimental.beginFrame` (deterministic mode on Linux), parallel Chrome workers, FFmpeg concat. No build step, compositions open as plain `.html`. Ships ~21 agent skills (`npx skills add heygen-com/hyperframes`) for Claude Code, Codex, Cursor, Gemini CLI. Includes TTS (HeyGen / ElevenLabs / local Kokoro), BGM, Whisper transcription, captions, beat detection, shader transitions, audio mixing with ducking, Lambda / Cloud Run / HeyGen cloud rendering, `--batch` rendering from JSON rows. Latest CLI checked: 0.8.72.
- **Remotion**, React components, `useCurrentFrame()`, `interpolate`, `spring`, `<Sequence>`, `<TransitionSeries>`. Official agent skills `remotion-dev/skills` (Feb 2026; `/remotion-create`, `/remotion-markup`). Mature packages: `@remotion/transitions`, `@remotion/motion-blur`, `@remotion/captions`, `@remotion/media`, `@remotion/light-leaks`, `@remotion/sfx`, `@remotion/three`, `@remotion/lottie`, Lambda / Cloud Run. **License: free only up to 3 people; companies need Creator seats ($25/seat/month) or Automator ($0.01/render, $100/month minimum), enterprise from $500/month.** An automated company-name-to-video pipeline is squarely "Automator".
- **Motion Canvas**: generator-based (`yield*`), great for hand-crafted math/diagram animation, editor-first, ~8k weekly downloads. Weak for agents (imperative, less training data, audio limited).
- **Revideo**: Motion Canvas fork with headless render API and audio; now part of Midrender. ~3k weekly downloads. Niche.

### Motion blur in code-rendered video
1. **True temporal accumulation (best quality).** Remotion `<CameraMotionBlur shutterAngle={180} samples={5-10}>` renders N sub-frame time offsets and averages them. Cost is ~N x render time; docs warn it is "destructive to colors" (averaging darkens/shifts some colors) and children must be absolutely positioned. Common mistake: `useCurrentFrame()` must be called inside a child of the blur wrapper, not in the parent. `<Trail layers lagInFrames trailOpacity>` is the cheaper ghost-trail version.
2. **Render at high fps, blend down with FFmpeg (engine agnostic).** Render at 4x or 8x target fps (HyperFrames supports `--fps 120/240`; in Remotion set composition fps and scale timings), then e.g. for 30 fps out with a 180 degree shutter from 240 fps: `ffmpeg -i in_240.mp4 -vf "tmix=frames=4,fps=30" out.mp4` (4 of each 8 sub-frames = 180 degree). `frames=8` gives 360 degree (smear). Render in PNG sequence or ProRes to avoid double compression. Same N x cost as CameraMotionBlur, but works on any engine, and can be applied only to the shots that need it.
3. **Faked per-element directional blur (cheap, what most agent output does).** SVG `feGaussianBlur stdDeviation="X 0"` tweened with the same ease and window as the position (peak blur at peak velocity, 0 at settle), or CSS `filter: blur()` on entrances (astra-remotion), or 2-4 ghost copies. The local HyperFrames skill `hyperframes-animation/rules/motion-blur-streak.md` encodes exactly this, including a camera-wrapper variant with caps (~30 px per element, ~18-20 px full frame). Isotropic CSS blur reads as "focus pull", not motion; directional SVG blur reads as motion.
4. Gotcha reported with HyperFrames + blur: multi-worker renders can produce flicker bands on blur-heavy frames; fix with `--workers 1` for those renders (claudecodeformarketers.com).

Recommendation: use (3) everywhere as the authoring default (free, previewable), and (2) as a final pass on camera moves and whip transitions for the premium tier.

### Top 10 concrete tips (with sources)
1. **Start from a reference video and recreate its grammar, not from a blank prompt.** Every strong demo (Astra recreations, Tejas's Dan Koe piece, Jake's workflow) copies a proven film's structure and motion vocabulary. Jake's 5 steps: gather assets + frame.md, storyboard.md, pull animations from existing HyperFrames launches, review static frames, build and polish. (creatoreconomy.so tutorial; X posts above)
2. **Plan before code: STORYBOARD.md / SCRIPT.md / design.md first, then build.** Ask the agent for insertion points and strategy before any HTML; review static key frames before rendering motion. (hyperframes.heygen.com/prompting; claudecodeformarketers.com)
3. **Every prompt carries duration, aspect ratio, mood, key elements; audio carries VO tone, BGM level (for example -18 dB) and beat sync.** (hyperframes.heygen.com/prompting/overview)
4. **Run `hyperframes check` (lint + runtime + layout + contrast) before every render**: "A render that took ten minutes will happily contain a defect check would have named in seconds." (HyperFrames prompt guide)
5. **One or two easing profiles for the whole film; front-loaded ease-out (cubic/expo) for entrances, `back.out` overshoot only on pops; squash/stretch 2-3 frames at impact.** Premium SaaS motion is 60 fps smooth with slight overshoot then settle. (trydemotion.com SaaS motion guides; astra-remotion code; HyperFrames `spring-pop-entrance` rule)
6. **Blur on entrance, sharp on settle, and couple the blur envelope to velocity.** Peak blur at peak speed, crisp and held >= 1 s at rest; the contrast is the effect. (HyperFrames `motion-blur-streak` rule; astra-remotion `enter()`)
7. **Per-character or per-word stagger for kinetic type (0.5-1.3 frames per char at 25 fps), tight negative tracking on large sizes, one accent color with glow on the key word.** (astra-remotion `KineticText`)
8. **Cut rhythm: ASL ~2-3 s for launch films (Lovable 2.5 s, Astra recreation 1.9 s), several beats inside each shot; essay-style pieces instead use one continuous morphing world with zero cuts, changing on every VO phrase.** (measured on refs with ffmpeg scene detection)
9. **Sound design is subtle and event-locked: clicks on cursor clicks, soft whooshes on camera moves, pops on card entrances, riser into the logo; music sets the emotion.** SFX make visuals feel responsive, they should not be noticed. (motiontheagency.com sound design for explainers; local media-use SFX set)
10. **Iterate surgically, never regenerate.** "Claude gets you structurally close on the very first render. Everything after that is small, targeted tweaks." Render the first item of a batch for approval before the rest; close other apps for RAM. (claudecodeformarketers.com; creatoreconomy.so)

Burnwe (burnwe.com): SaaS/AI explainer agency, 1,200+ videos for 450+ clients since 2018. Process: onboarding -> script -> storyboard -> VO/music selection (1,200+ VO artists) -> animation, unlimited revisions, typically 4-6 weeks, mockups from Figma, "We use AI as an assistant, not a replacement", "No templates". This is the incumbent timeline our pipeline undercuts.

---

## 5. What is installed locally

- **HyperFrames CLI**: not installed globally, but `npx -y hyperframes@latest` resolves instantly to **v0.8.72** (cached). Commands available: init, add, catalog, capture (website capture), preview, render (mp4/webm/mov/gif/png-sequence/hls, `--fps` up to 240, `--workers`, `--batch`, `--variables`, `--resolution 4k` via DPR), check/lint/validate/inspect/snapshot/keyframes/compare/grade-compare, **beats** (music beat detection to JSON), **transcribe** (word timestamps), **tts** (Kokoro local; HeyGen/ElevenLabs via media skill), remove-background, normalize-audio, cloud/lambda/cloudrun, skills. **No native shutter/motion-blur render flag.**
- **HyperFrames skills in `~/.claude/skills`** (installed 2026-09-03 / 2026-06-16): `hyperframes` (router), `hyperframes-read-first`, `hyperframes-core` (composition contract), `hyperframes-animation` (48 motion rules, scene blueprints like `kinetic-type-beats`, `cursor-ui-demo`, `prompt-type-submit-generate`, `camera-journey`, `grid-card-assemble`, `logo-assemble-lockup`, `dataviz-countup`; a transition catalog: css blur/push/scale/radial/3d/dissolve/destruction/shader; 7 runtime adapters), `hyperframes-creative` (design.md, palettes, typography, narration, beat planning, audio-reactive), `hyperframes-media` (TTS chain HeyGen/ElevenLabs/Kokoro, BGM Lyria/MusicGen, Whisper, captions), `hyperframes-audio` (fades, ducking/VO carve, EQ/comp/reverb chains, automation), `hyperframes-keyframes`, `hyperframes-cli`, `hyperframes-registry` (installable blocks), plus workflows `faceless-explainer`, `product-launch-video`, `motion-graphics`, `general-video`, `embedded-captions`, `graphic-overlays`, `pr-to-video`, `remotion-to-hyperframes`, and `media-use` (media OS with a bundled SFX kit: whoosh, whoosh-short, whoosh-cinematic, click, click-soft, pop, ping, chime, sparkle, riser, impact-bass x2, typing, key-press, notification, glitch x3, error; plus LUTs).
  - Motion blur: yes, faked (directional SVG blur, ghost trails, camera-wrapper blur) via `motion-blur-streak` and `depth-of-field-blur`.
  - Transitions: yes, big catalog incl. shader transitions.
  - TTS: yes (with word timestamps via HeyGen, else transcribe after).
  - Captions: yes (`embedded-captions`, many themes).
  - Beats: yes (`hyperframes beats` + creative beat planning).
  - SFX: yes (media-use kit + resolve/generate).
- **Remotion skills**: `remotion-official` (= remotion-dev/skills "remotion-best-practices": 37 rule files incl. animations, sequencing, timing, transitions via `@remotion/transitions`, text-animations, captions/subtitles/transcribe, voiceover via ElevenLabs + `calculateMetadata`, sfx via `@remotion/sfx` (11 remote wavs), light-leaks, 3d, lottie, charts, maps, fonts, audio-visualization) and `remotion` (toolkit custom transitions). **Neither mentions `@remotion/motion-blur`**, so an agent would not reach for `<CameraMotionBlur>` unless told. No beat detection.

---

## Recommendation: build on HyperFrames, keep an FFmpeg sub-frame blur pass as the premium layer

| Criterion | HyperFrames | Remotion |
|---|---|---|
| Agent authoring | Plain HTML + GSAP, no build, 20+ workflow skills already installed incl. an explainer workflow, storyboard/script formats, check gate, preview studio | React/TSX, good official skills, but one bundle vs a full production workflow; build step |
| Motion blur | Faked per element (good skill coverage); true blur via `--fps 120/240` + `ffmpeg tmix` | Native `<CameraMotionBlur>` true accumulation (N x cost, color shift) + `<Trail>`; also works with tmix |
| Render speed | Parallel Chrome workers, fast-capture on macOS GPU, Lambda/Cloud Run/HeyGen cloud, `--batch` | Measured 30 s for 42 s 1080p CSS film locally; Lambda/Cloud Run mature |
| Cross-harness | Skills explicitly for Claude Code, Codex, Cursor, Gemini CLI; HTML is the most model-native format | Skills for Claude Code/Codex/Cursor too; React also well known |
| Audio | TTS, BGM, transcribe, beats, SFX kit, Web Audio mixing with ducking in the composition | Audio tags, ElevenLabs recipe, 11 SFX; mixing mostly manual |
| License | Apache 2.0 | Paid for companies >3 people; automated pipeline = Automator ($100/month min) |

HyperFrames wins on everything except native true motion blur, and that gap is closed engine-agnostically by rendering hero shots at 4-8x fps and blending with `tmix` (or just by the faked directional blur, which is what every reference except Anyway Studio actually uses). Port the astra-remotion primitives (`ease`, `enter`, `KineticText`, cursor/typing/zoom UI scenes) into GSAP HyperFrames blocks as our house kit.

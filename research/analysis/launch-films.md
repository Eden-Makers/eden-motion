# Launch films: forensic breakdown and rebuild spec

Three reference launch films, reverse-engineered frame by frame so the style can be rebuilt in code (HyperFrames HTML+GSAP or Remotion) plus AI footage.

| id | film | length | fps | style family |
|---|---|---|---|---|
| `2m5BCWB02jY` | Google "Meet Gemini Omni" | 50.76 s | 30 | Google generative: black canvas, rim-lit prompt UI, AI video results |
| `_fuimO6ErKI` | Google "Welcome to the Gemini era" | 60.09 s | 29.97 | Google ecosystem sizzle: UI blitz + live action vignettes |
| `xDwR1_vrIg8` | Lovable 2.0 launch | 80.46 s | 30 | Product-led: kinetic type on aurora gradients + tilted UI demo |

## 0. Method and confidence

- Cut detection: `ffmpeg select='gt(scene,0.25)'` plus a full per-frame scene-score dump (threshold 0.12) to catch soft transitions. Scene detection badly undercounts these films because most "cuts" are continuous moves inside UI or text changes on the same background, so every shot table below was hand-built from 0.5 s contact sheets and 12-32 frame bursts at native frame rate (33 bursts total).
- Timestamps: hard cuts are frame-accurate (plus or minus 1 frame). Soft transitions are given as the frame range where the change happens.
- Palette: pixels sampled from full-res PNG frames (median-cut quantization plus column/row probes through gradients).
- Type sizes: bounding boxes of text pixels in full 1920x1080 frames. Font sizes are estimated from ascender-to-baseline height, so treat them as plus or minus 10%.
- Music: librosa beat tracking plus autocorrelation cross-check (the three BPM values are stable across priors), RMS and sub-150 Hz energy in 0.25 s windows to locate drops, stops and breakdowns.
- Gemini 3.1 Pro (API, video at 2 and 4 fps) was used for a first-pass shot list, the audio/SFX read and the dialogue transcript. Its claims were checked against frames. It was wrong about several transitions (for example it called the Omni card shrink a "zoom-through at scale 10" and guessed BPMs of 95/105/125 that do not match the audio), so frames win wherever they disagree.
- Copy and VO: this file does not transcribe brand copy or dialogue verbatim (copyright). Section 1-3 give every line's timing, word count, speaker and a paraphrase, which is what a rebuild needs (we write our own copy into the same slots). The music in the Gemini era film opens on a famous hip-hop vocal sample, which is only described, never transcribed.

Contact sheets (0.5 s grid, timestamps burned in) and named transition bursts live in `sheets/`:
`<id>_sheet_NN.jpg` and `<id>_burst_<technique>.jpg`.

---

## Summary

| | Gemini Omni | Gemini era | Lovable 2.0 |
|---|---|---|---|
| Hard cuts | 25 (26 shots) | ~47 (48 shots) | 15 (16 shots) |
| ASL, hard cuts | 1.95 s (2.76 s excluding the 1 s flash open) | 1.28 s | 5.0 s |
| ASL, visual units (cuts + morphs + zoom-throughs + text swaps) | 1.45 s (35 units) | ~1.25 s | 1.18 s (68 units) |
| Shortest shot | 3 frames (100 ms) | 4 frames (133 ms) | text swap every 8 frames (267 ms) |
| Background | pure black `#000000` | white `#FEFEFE` / near-black `#131313` alternating | cream `#F7F2EB` / aurora gradients / navy `#0B0B18` |
| Type | Google Sans, regular/medium, white + one blue accent word | Google Sans, gradient-filled hero text | neo-grotesk semibold/bold, near-black on cream, white on gradient |
| Imagery | ~70% AI video (the product IS the footage) | ~45% live action, ~40% UI, ~15% 3D/AI | ~90% code-drawable (type, UI, gradients) |
| VO | none (song with vocal) | sparse dialogue + VO, ~35% of runtime | none |
| Music | pop/hip-hop, acoustic guitar + female vocal, **117.5 BPM** | boom-bap hip-hop, **89 BPM** | four-on-floor synth-pop / tech-house, **112 BPM** |
| Signature move | prompt box -> AI result revealed inside a liquid-glass frame | UI chip overdrive with 4-frame background swaps | per-word kinetic type on grainy aurora + pill-to-window morph |

---

## 1. Google "Meet Gemini Omni" (`2m5BCWB02jY`)

50.76 s, 30 fps, 1920x1080. No VO: carried by a vocal pop track and on-screen copy.

### 1.1 Shot table

`AI` = generative video, `LA` = live action, `UI` = code-drawable interface, `TXT` = type on black.

| # | t_in | t_out | dur | visual | motion | transition out | copy on screen (paraphrased, word count) |
|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0.133 | 4f | AI: comic/sticker-style guitarist on green+pink cloud pattern | static | hard cut | none |
| 2 | 0.133 | 0.267 | 4f | AI: woman underwater, coral, bubbles | static | hard cut | none |
| 3 | 0.267 | 0.400 | 4f | AI: chrome statue guitarist on blue sky | static, sparkle glints | hard cut | none |
| 4 | 0.400 | 0.500 | 3f | AI: claymation woman driving convertible | static | hard cut | none |
| 5 | 0.500 | 0.633 | 4f | AI: guitarist sitting on clouds | static | hard cut | none |
| 6 | 0.633 | 0.767 | 4f | AI: latex-clad portrait on olive with halo disc | static | hard cut | none |
| 7 | 0.767 | 0.900 | 4f | AI: torn-paper collage guitarist | static | hard cut | none |
| 8 | 0.900 | 1.000 | 3f | AI: yeti dancing in flower field | static | hard cut | none |
| 9 | 1.000 | 3.000 | 2.0 s | LA: street busker, wide, fruit stand | locked-off | hard cut | product name, white, centred at y=50%, hard-on with the cut (2 words) |
| 10 | 3.000 | 4.400 | 1.4 s | LA: close-up hands on guitar | locked-off; white pointer cursor enters bottom-left at 4.23, reaches fretboard 4.57 | frame shrinks to card | none |
| 11 | 4.400 | 7.300 | 2.9 s | UI: footage becomes a rounded card (scale 1.0 -> ~0.35, radius 0 -> ~40 px) held by the cursor, docked bottom-right, tilted -8 to +8 deg, bobbing | card follows cursor with lag, rotation wobble | hard cut, card flight continues across the cut | 3-line positioning line "it is like [our image model] for video", model name in accent blue (6) |
| 12 | 7.300 | 11.100 | 3.8 s | UI: prompt box on black, rim-lit cyan. Card flies into top-left chip slot (7.3-7.8), second chip pops 8.5, prompt typed 9.0-10.0, send 10.3 | box static, scale 1.00 -> 1.03 | in-box generative reveal | prompt: edit the video, place me on clouds (8) |
| 13 | 11.100 | 12.100 | 1.0 s | UI->AI: box content Gaussian-blurs out (0 -> ~20 px in 8 frames), halftone dot field sweeps in from the right edge, teal noise, cloud video resolves inside | box grows 1.0 -> 1.08 | box becomes glass frame | none |
| 14 | 12.100 | 14.030 | 1.9 s | AI inside a liquid-glass squircle (thick refracting rim, pinched top edge) | frame scales 1.08 -> 1.25, then expands past the edges 13.9-14.03 | frame bursts to full bleed | none |
| 15 | 14.030 | 16.530 | 2.5 s | AI: denim guitarist on clouds, full frame; Gemini spark watermark bottom-right | slow push, ~2% | hard cut | none |
| 16 | 16.530 | 19.870 | 3.3 s | UI: pill prompt, typed 16.6-18.0; stack of 3 style thumbnails dragged in by cursor 18.3-19.3 | camera tracks the caret (pill slides left); push 1.00 -> 1.15 over 3 frames at 19.77 | hard cut | prompt: love it, now show it in several styles (9) |
| 17 | 19.870 | 20.600 | 0.73 s | AI: collage/torn-paper style | static | generative morph 20.60-21.07 (14f) | none |
| 18 | 21.070 | 22.330 | 1.26 s | AI: retro comic sticker style | static | generative morph 22.33-22.60 (8f) | none |
| 19 | 22.600 | 22.930 | 0.33 s | AI: chrome statue style | static, glints | hard cut | none |
| 20 | 22.930 | 24.930 | 2.0 s | TXT: 2-line headline built word by word | block shrinks and re-centres as words land | hard cut | the evolution of [editing] (4), last word blue |
| 21 | 24.930 | 26.970 | 2.0 s | TXT: 2-line headline | same | hard cut | get more from your [camera roll] (6) |
| 22 | 26.970 | 27.800 | 0.83 s | LA: girl dancing in flower field, mountains | locked-off | liquid-glass warp switches on in-shot | none |
| 23 | 27.800 | 30.570 | 2.8 s | same shot, edges barrel-warped with dark refracting rim, background blurred ~12 px; frosted white glass prompt box centred; typing 27.9-29.6 | box push 1.0 -> 1.1 at 30.3-30.57 | hard cut, identical framing | prompt: now turn me into a yeti (6) |
| 24 | 30.570 | 31.600 | 1.0 s | AI: yeti in the same field, same choreography | 3-frame focus pull (blur -> sharp) on the cut | compare line enters | none |
| 25 | 31.600 | 33.900 | 2.3 s | AI+LA: before/after compare, 2 px white divider with small grip; left = original girl, right = yeti | divider travels x=0 -> 48% (31.6-32.0), then drifts 40-55% | hard cut | none |
| 26 | 33.900 | 35.600 | 1.7 s | TXT: 1 line, first word blue | word-by-word | hard cut | step into the story (4) |
| 27 | 35.600 | 38.870 | 3.3 s | UI: prompt box with avatar chip; typing 35.8-37.0; dotted glow blooms lower-right 37.5 | push 1.00 -> 1.12 at 38.4-38.87 | hard cut | prompt: show @user across 3 surreal worlds (6) |
| 28 | 38.870 | 39.870 | 1.0 s | AI: claymation driver (legal micro-text bottom) | static | hard cut | disclaimer line, ~12 px |
| 29 | 39.870 | 40.530 | 0.66 s | AI: latex portrait | static | hard cut | disclaimer |
| 30 | 40.530 | 41.930 | 1.4 s | AI: underwater portrait | slow drift | hard cut | disclaimer |
| 31 | 41.930 | 43.870 | 1.94 s | TXT: 2 lines | word-by-word, shrink | hard cut | instant inspiration with [templates] (4) |
| 32 | 43.870 | 46.030 | 2.16 s | AI/UI: masonry grid of template videos in liquid-glass tiles | grid pans left ~120 px/s, tile edges wobble | hard cut | none |
| 33 | 46.030 | 48.700 | 2.67 s | TXT: 3-line sign-off built line by line (46.0, 46.5, 47.0), last line blue | block scale 1.10 -> 1.00 continuous | hard cut | welcome to the [product]-verse (5) |
| 34 | 48.700 | 50.760 | 2.06 s | end card: wordmark, spark logo, CTA | spark lands at ~3.2x and shrinks to 1.0 with ~-25 deg rotation in 10 frames | fade to silence | wordmark (2) + CTA (3) |

### 1.2 Beats

| beat | t | % runtime |
|---|---|---|
| Cold open: 8 AI outputs flashed at 3-4 frames each (a preview of every demo) | 0.0-1.0 | 2% |
| Brand + real source footage (what the user starts with) | 1.0-4.4 | 7% |
| Positioning line (analogy to an existing hit product) | 4.4-7.3 | 6% |
| Demo 1: edit the scene (prompt -> result) | 7.3-16.5 | 18% |
| Demo 2: restyle x3 (prompt -> morph montage) | 16.5-22.9 | 13% |
| Title interstitial x2 | 22.9-27.0 | 8% |
| Demo 3: character swap + before/after | 27.0-33.9 | 14% |
| Title | 33.9-35.6 | 3% |
| Demo 4: avatar across 3 worlds | 35.6-41.9 | 12% |
| Templates | 41.9-46.0 | 8% |
| Sign-off line + logo | 46.0-50.8 | 9% |

Every demo repeats the same 3-step loop: **source -> prompt UI (music strips down) -> AI result full frame (music slams back)**.

### 1.3 Pacing curve

Hard cuts per 10 s: `10, 2, 3, 5, 5, 0`. Units per 10 s: `12, 5, 7, 6, 5`.
Shape: a spike (the 1 s flash open, 8 cuts in 30 frames), then long 3-4 s UI/prompt shots, then acceleration inside each result montage (1.0, 0.66, 1.4 s AI shots at 38.9-41.9), then a slow 2.7 s + 2.1 s close. The rhythm alternates slow (prompt, 3-4 s) and fast (result, 0.3-1.4 s).

### 1.4 Palette

| role | hex |
|---|---|
| canvas | `#000000` |
| title white | `#F2F2F2` to `#FFFFFF` |
| accent word blue (sampled on 3 cards) | `#5D71D0`, `#5180EE`, `#4D79E8` (use `#5180EE`) |
| prompt box fill (top -> bottom) | `#070C16` -> `#1A344E` |
| prompt box rim glow | `#18557F` core, bright edge ~`#3AA0FF` (estimate), outer bloom `#4C7D96` |
| pill prompt fill | navy-black `#05080F` with bottom rim `#1AA7FF`-ish |
| liquid-glass frame on sky footage | `#8FA7BC`, `#547291` |
| frosted glass box over footage | white at ~20-25% over 12 px blurred footage |
| end-card spark | Google 4-colour conic (blue, red, yellow, green) |

### 1.5 Type treatment

- Google Sans (display cut). Titles ~130-140 px at 1080p (ascender-to-descender box 132 px on a one-line title), regular to medium weight, tracking about -1%, line-height ~1.1. Sign-off lines tighter: 3 lines at ~105 px with a 97 px pitch (line-height ~0.93). End card wordmark ~110 px, CTA ~70 px.
- One accent per card: the payoff word (or first word) in blue `#5180EE`, revealed by a left-to-right soft gradient wipe (black -> blue, edge about one word wide, ~0.3 s).
- Words land hard (0-frame fade) at 4-6 frame intervals. When a word is inserted its neighbouring space opens from 0 to full width over ~4 frames (visible in 23.13 as a joined word that separates by 23.26), and the whole block shrinks and re-centres continuously (1.35x -> 1.0 over ~1 s, expo-out). See `sheets/2m5BCWB02jY_burst_word-accumulate-headline.jpg`.
- Prompt text inside UI: Google Sans Text ~22-26 px equivalent, white. Typing speed 31-36 characters/s, delivered in 2-4 character chunks per frame group, not per character.

### 1.6 Sound

- Pop/hip-hop with acoustic guitar and female vocal, 117.5 BPM (beat 0.511 s). The 4-frame flash cuts (0.133 s) are 16th notes at this tempo (0.128 s).
- Bass is pulled out under every prompt moment and returns on the result: sub-150 Hz energy drops ~30 dB at 7.0-7.25 (cut to prompt box at 7.3), returns at 9.0 when typing starts; drops again 16.0-18.75 (pill prompt), full-band return at 19.0 as the style cards are dragged in, 0.87 s before the first style cut. Quieter bars also at 26 s, 33-34 s and 41-42 s (the title cards). Rule: **prompt = breath, result = drop.**
- Outro: bass out at 48.0, silence from 49.25; the logo lands at 48.7 inside the decaying tail.
- SFX: UI pop on box appear, typing clicks, a shimmer/whoosh on each generation (~10.0, 30.0, 38.0), paper-shuffle on the card stack (18.5).

---

## 2. Google "Welcome to the Gemini era" (`_fuimO6ErKI`)

60.09 s, 29.97 fps. Ecosystem sizzle: UI blitz, live action vignettes, sparse VO.

### 2.1 Shot table

| # | t_in | t_out | dur | visual | motion | transition out | copy / VO (paraphrased) |
|---|---|---|---|---|---|---|---|
| 1 | 0.00 | 1.90 | 1.9 s | UI: classic search homepage, white | locked | in-shot change | none |
| 2 | 1.90 | 5.40 | 3.5 s | UI: second letter of the logo replaced by the spark (1.9); logo splits in two and feature chips inflate from the seam, one every ~0.2 s (2.7-4.5), overflowing the frame | slow push 1.0 -> 1.15 | hard flip | chip labels (break it down, generate, help me write...) |
| 3 | 5.40 | 5.53 | 4f | same UI, background flips to `#202124`, UI turns into white outlines | push accelerates | hard cut | none |
| 4-7 | 5.53 | 6.51 | 4-5f each | white outline UI over swapped 3D backgrounds: glossy green/pink blobs (5.53), orange porous coral (5.70), iridescent fibre (5.87), red crumple (6.21) | push 1.3x -> 3x in 0.6 s, chips grow off-frame | hard cuts every 4-5 frames | none |
| 8 | 6.51 | 7.11 | 0.6 s | flat blue spark on white | scale-in | hard cut | none |
| 9 | 7.11 | 7.64 | 0.53 s | UI: "help me write" card, 3D-tilted, macro close | drift | hard cut | card copy |
| 10 | 7.64 | 7.90 | 0.26 s | UI: assistant chat (recipe answer) | drift | hard cut | chat copy |
| 11 | 7.90 | 8.30 | 0.4 s | UI: code editor with "explain" chip, tilted | drift | hard cut | none |
| 12 | 8.30 | 9.44 | 1.14 s | UI: search results with AI overview | push into the overview spark icon, chromatic fringes at 9.3 | icon portal | none |
| 13 | 9.44 | 9.98 | 0.54 s | spark on black grows 1 -> ~8x; its concave centre opens as a window | expo-in scale | portal reveal | none |
| 14 | 9.98 | 10.51 | 0.53 s | collage of AI images/video tiles on deep space | parallax drift | hard cut | none |
| 15 | 10.51 | 11.31 | 0.8 s | UI: search pill with spark, spark spins; becomes dark toggle pill (search / assistant) | spin | hard cut | none |
| 16 | 11.31 | 12.71 | 1.4 s | TXT: giant greeting, gradient fill blue -> violet -> rose on `#131313` | typed | hard cut | "hi I am [assistant]" (3) |
| 17 | 12.71 | 13.38 | 0.67 s | 3D phone (tilted) showing greeting | rotate | hard cut | greeting (8) |
| 18 | 13.38 | 14.00 | 0.62 s | "generating" line with coral spark on white | pulse | hard cut | 1 word |
| 19 | 14.00 | 14.68 | 0.68 s | UI: model picker | push into the premium model spark | hard cut | 2 items |
| 20 | 14.68 | 15.75 | 1.07 s | UI: dark pill, typed prompt at ~28 chars/s with caret, chromatic rim (blue top, red bottom) | locked | hard cut | prompt: draw [onomatopoeia] (2) |
| 21 | 15.75 | 18.22 | 2.47 s | UI: answer line + pink/violet light streaks that resolve into two generated splash images | streak wipe | hard cut | answer line (5) |
| 22 | 18.22 | 19.39 | 1.17 s | LA: top-down desk, hands pick up phone | handheld | hard cut | none |
| 23 | 19.39 | 22.09 | 2.7 s | LA POV: whiteboard doodle of two cats + box, AR label | handheld | hard cut | VO F: asks what this reminds you of, answer: a famous physics thought experiment (8 words) |
| 24 | 22.09 | 23.62 | 1.53 s | LA: man at mic laughing, window flare | static | hard cut | on-camera reaction (1) |
| 25 | 23.62 | 24.22 | 0.6 s | LA: musician in pink boots | static | hard cut | none |
| 26 | 24.22 | 26.79 | 2.57 s | LA+UI: circle-to-search on phone over the boots, results scroll (inner cuts 24.49, 25.43) | handheld | hard cut | on-camera reaction (2) |
| 27 | 26.79 | 28.09 | 1.3 s | LA: three track athletes around a phone | handheld | hard cut | none |
| 28 | 28.09 | 29.10 | 1.0 s | LA: athlete close-up smiling | static | hard cut | none |
| 29 | 29.10 | 31.53 | 2.4 s | UI: mail thread, "summarize" chip, assistant sheet slides up, lines type in | push | tilt-whip | VO F: tools together are powerful (11) |
| 30 | 31.53 | 31.80 | 8f | card rotates in X/Z with directional blur and pink radial glow | whip | lands on search bar | none |
| 31 | 31.80 | 35.20 | 3.4 s | UI: search bar with pink glow, typed question, AI overview with original/simpler/break-it-down chips | push into chips | hard cut | question (8); on-camera: amazed (4) |
| 32 | 35.20 | 36.24 | 1.04 s | LA: two people leaning in, low-key | static | hard cut | on-camera: "a whole suite of possibilities" (9) |
| 33 | 36.24 | 36.70 | 0.46 s | UI: docs "help me write" chip | static | cut | none |
| 34 | 36.70 | 37.24 | 0.54 s | UI: docs window zooms out, duplicates into a receding fan of ~8 windows | pull back + fan | hard cut | none |
| 35 | 37.24 | 38.24 | 1.0 s | LA keyed on black: presenter, carousel of feature cards behind | cards slide left | hard cut | none |
| 36 | 38.24 | 39.11 | 0.87 s | UI: photos grid on phone, push into "ask" tab | push | hard cut | none |
| 37 | 39.11 | 41.30 | 2.2 s | UI: chat question + answer revealed word by word in blue fading to black, then a photo | locked | hard cut | question (6) + answer (19) |
| 38 | 41.30 | 42.88 | 1.58 s | LA: phone on table, thumb, input hint | handheld | hard cut | hint (6) |
| 39 | 42.88 | 45.25 | 2.37 s | LA: top-down phone on wood desk, live-mode gradient orb blooms | static | hard cut | VO F: greeting (3) |
| 40 | 45.25 | 46.30 | 1.05 s | LA: woman at desk, mug in foreground, rack focus | static | hard cut | none |
| 41 | 46.30 | 47.91 | 1.6 s | UI: dark AI Studio, file cards dropped in by hand cursor, "uploading N sources" | drift | hard cut | UI label |
| 42 | 47.91 | 52.20 | 4.3 s | LA POV: hand holds phone at window, camera app answers | handheld | push through screen | VO F: asks which neighbourhood; answer names the district (17) |
| 43 | 52.20 | 52.40 | 6f | rack-focus blur + prism/chromatic flare, push into the phone screen | zoom-through | match | none |
| 44 | 52.40 | 54.09 | 1.7 s | photoreal 3D city flythrough with blue route line and pin | fast forward dolly | hard cut | VO F: together we make a new era (6) |
| 45 | 54.09 | 55.36 | 1.27 s | UI: white toolbar (share, spark, avatar); cursor hovers spark, tooltip | push-in | hard cut | tooltip (2) |
| 46 | 55.36 | 57.00 | 1.64 s | TXT on black: end line written left to right with glow halo, last two words gradient | L->R glow write-on | horizontal collapse | end line (5) |
| 47 | 57.00 | 57.27 | 8f | line squashes horizontally into a point with motion smear | collapse | continuous | none |
| 48 | 57.27 | 60.09 | 2.8 s | glowing point -> 4-point spark (rotating) -> morphs into the G logo (draw-on arc 58.0-58.4) -> hold | morph | end | none |

### 2.2 Beats

| beat | t | % |
|---|---|---|
| Familiar UI hook (homepage mutates) | 0-5.4 | 9% |
| Drop: capability blitz | 5.4-11.3 | 10% |
| Assistant intro + generation demo | 11.3-18.2 | 12% |
| Human, real-world multimodal vignettes | 18.2-29.1 | 18% |
| Productivity (mail, search, docs) | 29.1-38.2 | 15% |
| Personal (photos, live voice) | 38.2-46.3 | 13% |
| Developer + camera assistant + 3D world | 46.3-54.1 | 13% |
| End line + logo | 54.1-60.1 | 10% |

### 2.3 Pacing curve

Hard cuts per 10 s: `14, 9, 8, 7, 5, 4`. Monotonic deceleration: sub-5-frame montage in the first 10 s, 1-2.5 s vignettes in the middle, 1.6 s + 2.8 s title/logo holds at the end.

### 2.4 Palette

| role | hex |
|---|---|
| light canvas | `#FEFEFE` |
| dark canvas | `#131313`, `#111111`, UI dark `#202124` |
| hero gradient text (L -> R) | `#1572D8` -> `#0F78D8` -> `#5F71C1` -> `#7E6FBF` -> `#9864A0` -> `#B54861` -> `#B84052` |
| pink search glow (centre -> out) | `#FDCCF1` -> `#FDDBF5` -> `#FFE8F9` -> `#FEF8FC` -> white |
| end line gradient tail | rose ~`#DE8F96` |
| generating spark | coral ~`#E8574A` |
| Google brand | `#4285F4`, `#EA4335`, `#FBBC05`, `#34A853` |

### 2.5 Type

Google Sans. End line ~110 px medium, single centred line, white with blue -> rose gradient on the last two words. Greeting card ~260 px with horizontal gradient. The end line is written left to right: each glyph fades in from a blurred, over-bright state with a soft coloured halo (~20 px bloom), about 3 characters per frame at 30 fps, then holds 0.6 s before collapsing.

### 2.6 Sound and VO

- Boom-bap hip-hop instrumental, 89 BPM (beat 0.673 s). Quiet open (-32 dB), a near-silent dip at 2.0-2.5 s, then a rap vocal sample intro (not transcribed) builds to the bass entry at **5.25 s**, and the picture flips to the dark montage at **5.40 s** (5 frames later).
- Music ducks under dialogue. It drops out at 56.0 after the end line appears (55.4) and a small sting at 58.75 sits on the logo morph.
- VO/dialogue: 61 words total (12 lines, one female assistant voice plus on-camera reactions). Speech is active ~21 s of 60 s (35%). 61 WPM across the film, ~174 WPM while speaking. Reactions are 1-2 words ("wow"-type), assistant lines are 3-11 words.
- SFX: UI pops on the chip inflate (1-4 s), whooshes on the montage zooms (5-10 s), typing (14 s, 31 s), marker squeak (19 s), UI chime on live mode (42 s), sub impact + shimmer under the end line (55 s).

---

## 3. Lovable 2.0 launch (`xDwR1_vrIg8`)

80.46 s, 30 fps. No VO: kinetic type + UI demo on a 112 BPM electronic track.

### 3.1 Shot / unit table

Most units are word swaps on a continuous background, so "transition" says how the text or frame changes.

| # | t_in | t_out | dur | visual | motion | transition out | copy (paraphrased, words) |
|---|---|---|---|---|---|---|---|
| 1 | 0.00 | 1.30 | 1.3 s | glossy 3D spheres (magenta/pink/orange/violet) on cream, centre sphere carries a word | push-in, spheres grow ~2x (expo-in) | spheres fade and shrink into a dot grid, centre sphere shrinks to an icon | "today" (1) |
| 2 | 1.50 | 2.50 | 1.0 s | line with the shrunk sphere now an inline globe icon | words appear around the icon | icon becomes caret | stat hook: less than 1% of the world (6) |
| 3 | 2.50 | 3.00 | 0.5 s | tall vertical gradient caret (pink -> orange) alone | blink | typing starts | none |
| 4 | 3.00 | 4.70 | 1.7 s | typed line, pink caret; blue->pink gradient curly braces slide in from the frame edges and close in | text shrinks 1.0 -> 0.8 | braces exit | "...knows how to code" (4) |
| 5 | 4.70 | 6.15 | 1.45 s | line on cream with soft pink corner blooms; last word fades grey -> black | shrink | cut | "but that is about to change" (5) |
| 6 | 6.15 | 7.00 | 0.85 s | single word, per-letter blur-rise, gradient fill | word slides from left to centre | hard cut | "meet" (1) |
| 7 | 7.00 | 8.83 | 1.83 s | logo lockup, white, on a blue -> pink -> orange sunrise gradient; heart icon morphs into the logomark | letters arrive with scale; gradient hue shifts blue -> warm | hard cut on the drop | brand (1) |
| 8 | 8.83 | 10.50 | 1.67 s | navy with two big glossy spheres (blue top-left, red bottom-right) drifting | word swap every ~0.27 s | hard cut | "start building" + apps / websites / tools / ideas (6) |
| 9 | 10.50 | 12.40 | 1.9 s | giant word on warm gradient, then words accumulate | each add shrinks the block | cut | "faster than ever before" (4) |
| 10 | 12.40 | 14.80 | 2.4 s | cream + pink corner blooms | words enter from the right and push the line left (camera pan) | swap | "join other builders creating" (4) |
| 11 | 14.80 | 16.30 | 1.5 s | big italic counter, dark gradient fill, with a gradient spline drawing underneath (white glowing dot head) | counter +~3000 every 3 frames, whole group drifts right and scales up ~5% | swap | number (1) |
| 12 | 16.30 | 18.00 | 1.7 s | "new apps" -> "every" -> "day", each word bigger | scale up | zoom-through letterform | (4) |
| 13 | 18.00 | 19.00 | 1.0 s | zoom into the counter of the "a": inside is a pink flower blob with a small 4-point star; the star grows into a star-shaped window onto a dark purple website | scale ~1 -> ~40x through the letter, then star mask 0.1 -> fill | mask fills frame | none |
| 14 | 19.00 | 19.55 | 0.55 s | generated website hero, full frame (dark purple) | locked | pull back | site copy |
| 15 | 19.55 | 20.70 | 1.15 s | pull back reveals a masonry wall of ~10 generated websites, then pan right | dolly out 1 -> 0.45, pan | push in | site copy |
| 16 | 20.70 | 21.47 | 0.77 s | drone-shop website full frame | locked | cut | none |
| 17 | 21.47 | 23.00 | 1.53 s | same site on a laptop on dark rocks (photoreal render) | slow push | hard cut | none |
| 18 | 23.00 | 25.20 | 2.2 s | giant black prompt pill with orange/pink/violet glow ring; placeholder then typed prompt (~18 chars/s) | camera very close, pulls back 2.2x -> 1.0 in 0.3 s (24.9-25.2, expo-out) | cursor clicks send | placeholder (4) + prompt: create a social marketplace (5) |
| 19 | 25.20 | 26.80 | 1.6 s | text erases left to right, pill shrinks to a thin bar, bar morphs into a window | shape morph, glow ring follows the shape | morph | none |
| 20 | 26.80 | 27.90 | 1.1 s | editor window (chat left, generated shop right) inside the glow ring | push-in 1.0 -> 1.15 | continuous push | none |
| 21 | 27.90 | 31.50 | 3.6 s | tilted close-up of the chat input; follow-up prompt typed (~20 chars/s), send at 30.5 | tilt rotateX ~10 deg, drift | pull back | prompt: add a sidebar with profile stats and balance (11) |
| 22 | 31.50 | 33.10 | 1.6 s | window with the new sidebar, 3D tilted | dolly | hard cut | none |
| 23 | 33.10 | 34.93 | 1.83 s | cream: words + two multiplayer cursor tags (pink, orange) flying in | words build, cursors ease in | cut | "now with collaboration" (3) |
| 24 | 34.93 | 35.93 | 1.0 s | close-up of invite/publish buttons, tilted | cursor click | cut | none |
| 25 | 35.93 | 37.30 | 1.37 s | invite dialog, email typed | push-in 1.0 -> 1.6 | cut | email (1) |
| 26 | 37.30 | 38.50 | 1.2 s | 5 avatar faces pop in overlapped, then shrink into the toolbar | pop, then scale to toolbar slot | match move | none |
| 27 | 38.50 | 41.10 | 2.6 s | toolbar -> dashboard app with 3 named cursors editing | pan + push | cut | none |
| 28 | 41.10 | 42.50 | 1.4 s | cream with pink ring vignette; second word blurs in | blur-in | iris | "edit in preview" (3) |
| 29 | 42.50 | 43.00 | 0.5 s | ring gradient zooms in, becomes a target icon on pink, background floods blue, icon shrinks | iris zoom + scale | icon becomes the UI chip | none |
| 30 | 43.00 | 44.97 | 1.97 s | chat input close-up, cursor clicks the edit chip | pull back 1.4 -> 1.0 | hard cut | placeholder (2) |
| 31 | 44.97 | 50.10 | 5.1 s | website in editor, tilted; zoom to heading; edit panel; heading typed; size dropdown | slow push 1.0 -> 1.5 across 5 s | hard cut | heading (4) |
| 32 | 50.10 | 51.10 | 1.0 s | macro of the heading with selection | locked | cut | none |
| 33 | 51.10 | 52.43 | 1.33 s | colour picker; blue swatch clicked; heading line turns blue | locked | pull back | none |
| 34 | 52.43 | 53.70 | 1.27 s | full editor | pull back | hard cut on the re-drop | none |
| 35 | 53.70 | 56.80 | 3.1 s | pink -> violet gradient: word hits, "built" huge with gradient-filled white | per-word swaps, scale | cut | "instantly share what you have built with your own domains" (9) |
| 36 | 56.80 | 57.80 | 1.0 s | close-up publish button, click | tilt | cut | none |
| 37 | 57.80 | 60.20 | 2.4 s | publish dialog floating tilted; domain line cycles through 5 domains every ~0.5 s | float | hard cut | domains |
| 38 | 60.20 | 61.77 | 1.57 s | browser window dollies in from blur (rack focus), pans down the site | dolly + focus pull | hard cut | site copy |
| 39 | 61.77 | 63.00 | 1.23 s | same site on a laptop on a styled desk (photoreal render) | slow push | hard cut | none |
| 40 | 63.00 | 64.97 | 1.97 s | dark with violet floor glow: word blurs in (63.0-63.4), then feature name typed with code glyphs as caret, gradient fill | type-on | cut | "introducing" + "/dev mode" (3) |
| 41 | 64.97 | 66.37 | 1.4 s | code toggle chip, cursor click, toggle fills with gradient | click | hard cut | none |
| 42 | 66.37 | 67.23 | 0.86 s | UI macro blurred -> sharp (rack focus), pull back to dashboard | pull back 1.8 -> 1.0 | dissolve 4f | none |
| 43 | 67.23 | 69.23 | 2.0 s | code editor view, tilted | drift | hard cut | none |
| 44 | 69.23 | 72.27 | 3.04 s | dark: words build | per-word swaps | hard cut | "edit code right on the spot or in GitHub" (9) |
| 45 | 72.27 | 75.90 | 3.63 s | grainy violet -> magenta -> orange gradient; the orange core morphs into a heart shape | per-word swaps | heart blob shrinks | "now it is your turn" + "what are you building?" (8) |
| 46 | 75.90 | 76.80 | 0.9 s | blurred heart on black shrinks into the sharp heart icon | scale 3x -> 1x, blur 40 -> 0 px | icon shifts left | none |
| 47 | 76.80 | 78.40 | 1.6 s | heart morphs into the logomark as the wordmark writes on letter by letter (grey -> white) | write-on L -> R, 2 frames per letter | swap | brand (1) |
| 48 | 78.40 | 80.46 | 2.06 s | URL alone, small; orange glow top edge, magenta corners | hold | end | URL (1) |

### 3.2 Beats

| beat | t | % |
|---|---|---|
| Problem hook (stat) | 0-6.1 | 8% |
| Name reveal | 6.1-8.8 | 3% |
| Drop: value props | 8.8-12.4 | 4% |
| Social proof counter | 12.4-18.0 | 7% |
| Output showcase (site wall) | 18.0-23.0 | 6% |
| Feature 1: prompt -> app | 23.0-33.1 | 13% |
| Feature 2: collaboration | 33.1-41.1 | 10% |
| Feature 3: visual edit | 41.1-53.7 | 16% |
| Feature 4: publish + domains | 53.7-63.0 | 12% |
| Feature 5: dev mode | 63.0-72.3 | 12% |
| CTA + logo | 72.3-80.5 | 10% |

Every feature block = **type interstitial on gradient (1.4-3 s) -> tilted UI demo (3-9 s)**.

### 3.3 Pacing curve

Units per 10 s: `11, 15, 6, 6, 4, 9, 9, 8`. Fast kinetic open (0-20 s: one change every 0.77 s, word swaps at 0.27 s), slow product middle (40-50 s: one unit per 2.5 s, the single longest shot is the 5.1 s visual edit demo), re-acceleration through the interstitials and the end.

On-screen reading rate: ~73 headline words in 80 s (54 WPM overall), but 37 words in the first 18 s (123 WPM). One to three words on screen at any moment.

### 3.4 Palette

| role | hex |
|---|---|
| cream canvas | `#F7F2EB` (`#F5EFE5` in pink-bloom sections) |
| ink on cream | `#111111`; counter numerals gradient top -> bottom `#2B2428` -> `#4A3F44` -> `#6A5B63` |
| corner blooms on cream | `#EFADAD`, `#F6E2DE`, pink `#F4BEDB` |
| "sunrise" gradient (top -> bottom, 7.0-8.8) | `#788EFD` -> `#C69DFD` -> `#F697F3` -> `#FC63CB` -> `#FB3093` -> `#FD422D` -> `#FF5F1E` |
| warm gradient (10.5-12.4) | `#FC2781` -> `#FD383C` -> `#FD5C21` -> `#FB9761` -> `#FCAD80` |
| pink-violet gradient (53.7-56.8) | `#7188FB` -> `#B895FF` -> `#E780E5` -> `#FA63CA` -> `#FD2378` -> `#FF412D` |
| CTA gradient (72.3-75.9) | `#8C92F8` -> `#6955E9` -> `#A940D8` -> `#E54ECE` -> `#E32686` -> `#F4433C` -> `#FF8150` |
| navy section | `#0B0B18`, `#121026`, sphere glow `#6B42A1` |
| prompt glow ring, inside -> out (vertical) | pill `#000000` -> `#F05505` -> `#F3480C` -> `#F6492F` -> `#F66C77` -> `#F29BB4` -> `#AD80C4` -> `#4E4575` -> `#1F1A2E` -> black |
| prompt glow ring, horizontal edge | `#FA577A` -> `#F66EC8` -> `#F290D4` -> `#D3A1E3` -> `#6C79DD` -> `#324068` -> `#0C0D16` |
| "meet" letter gradient (L -> R) | `#7794F4` -> `#B98AEA` -> `#F682D2` -> `#F58E8E` -> `#F89D5C` |
| "/dev mode" gradient (L -> R) | `#768DF1` -> `#C1ADFD` -> `#F2A1FB` -> `#FF4EA8` -> `#FA3163` -> `#FC522E` |
| UI accent blue | ~`#2F6BF2` (publish button, edit chip, blue flood at 42.7) |

Grain: visible monochrome noise on every gradient section (strongest 72-76 s), roughly 8-12% overlay.

### 3.5 Type

- Neo-grotesk, semibold to bold, tight tracking (about -2%). Closest free: Inter Tight 600-700 or Geist. Body kinetic lines ~105 px (78 px ascender box on a one-line phrase); single-word hits 200-330 px bold ("faster", "built", "meet"); wordmark ~170 px; URL ~66 px.
- Near-black on cream, white on gradients and navy; hero single words get a gradient fill.
- Counter: italic (skew about -10 deg), dark vertical gradient fill, tabular figures.
- Per-letter blur-rise on hero words: blur ~20 px -> 0, y +20 px -> 0, opacity 0 -> 1, 4 frames per letter, 2 frame stagger (see `sheets/xDwR1_vrIg8_burst_per-letter-blur-rise.jpg`).
- Word swaps: the old word is cut, the new word appears already in place (no slide), every ~0.27 s = half a beat at 112 BPM. The block scale changes per word (bigger for the payoff word).

### 3.6 Sound

- Four-on-floor synth-pop / tech-house, 112.3 BPM (beat 0.534 s, half-beat 0.267 s, which is exactly the word swap interval).
- Hard **stop** at 8.00-8.25 (-56 dB, full silence), then the drop, and the hard cut to the navy "start building" scene at 8.83.
- Breakdown 49.25-50.0 (near silence) during the visual edit demo, rebuild 50-52.5, **re-drop** at 52.5, cut to the "instantly share" hits at 53.7.
- Music runs to 78.75 under the logo, fades 79.0-80.0.
- SFX: whoosh on the sphere push, digital ticks on the counter, typing on each prompt, UI click on every cursor press, switch click on the dev-mode toggle, impact/shimmer on the final logo.

---

## 4. Launch film DNA

### 4.1 Shared rules (all three)

1. **Runtime 50-80 s, 10-11 beats.** Hook <= 9% of runtime, logo/CTA ~10%, features are 60-70% of the film, each feature 8-18%.
2. **Cold open with the payoff.** Omni flashes 8 finished AI outputs in 30 frames before any branding; Lovable opens on the stat problem; the Gemini era film opens on a UI everyone knows and mutates it. The brand name lands between 1.0 s (Omni) and 7.0 s (Lovable).
3. **One visual system per film, zero stock transitions.** No dissolves except one 4-frame dissolve (Lovable 67.2). Transitions are hard cuts, shape morphs, zoom-throughs, or blur states.
4. **Blur is the transition currency.** Gaussian blur-outs (0 -> 20 px in 8 frames), focus pulls on cut-in (3-8 frames, 12 px -> 0), per-letter blur-in (20 px -> 0). True motion blur is rare and reserved for whips and collapses in the Gemini era film.
5. **Prompt UI is the hero prop.** Every film stages "the prompt": a single oversized input (Omni box ~1040 px wide on black, Lovable pill filling the frame), typed at 18-36 chars/s in chunks, sent with a visible cursor click, then transformed into the result.
6. **Camera lives inside the UI.** UI is never shown flat and static for long: push-ins of 1.03-1.6x over 1-5 s, caret-following pans, tilted planes (rotateX 8-12 deg, rotateY about -10 deg), rack focus in and out.
7. **Headlines are 2-6 words, delivered 1-3 words at a time,** word interval 4-8 frames, block scale adjusts per word, one accent word or gradient word per card.
8. **Cuts are phrase-synced, not beat-locked.** Measured phase-lock of cuts to the beat grid is weak (R = 0.20-0.30) and cuts land within 1 frame of a transient only 11-24% of the time (near chance). What IS locked: drops, stops and the logo, each within 0-5 frames of a music event, and rapid sequences on subdivisions (Omni flash cuts = 16th notes, Lovable word swaps = 8th notes).
9. **Music structure mirrors the demo loop.** Energy drops under the prompt (Omni bass out 7.0-9.0 and 16.0-18.75; Lovable stop 8.0-8.25, breakdown 49.25-50.0) and returns on the result or reveal.
10. **End card is 2-3 s, logo lands in the last 2-3 s of music, and music ends 1-2 s before picture** (Omni silence from 49.25 of 50.76; Lovable fade 79.0 of 80.46; Gemini era music out at 56.0 with a sting at 58.75).

### 4.2 Google vs Lovable

| | Google (Omni, era) | Lovable |
|---|---|---|
| Canvas | black (Omni) or white/near-black (era), no gradients behind type | gradients are the canvas: cream + blooms, sunrise, warm, violet, grain |
| Glow | light lives on UI edges: cyan rim on the prompt box, chromatic rim on pills, pink bloom under the search bar | light lives in the background: giant soft glow rings and aurora fields |
| Type | Google Sans regular/medium, white, one blue word, quiet | heavy grotesk, per-word hits at 2-3x scale, gradient-filled hero words, loud |
| Proof | the output footage (AI video, live action people) | the product UI itself, tilted and zoomed |
| Imagery source | Omni ~70% AI video; era ~45% live action | ~90% code (type, UI, gradients); AI only for laptop scene plates and site screenshots |
| Cut density | high (ASL 1.3-2.0 s by hard cuts) | low hard-cut count (ASL 5 s) but high unit density (1.18 s) because the type changes constantly |
| Rhythm | alternates slow prompt shots (3-4 s) and fast result bursts (0.1-1.4 s) | alternates fast type interstitials (0.27 s swaps) and slow UI demos (3-5 s) |
| Motion character | calm, expo-out lands, little overshoot, blur states | snappy scale hits, expo-out pullbacks (2.2x -> 1.0 in 0.3 s), rack-focus dollies |
| Transitions | morph inside the product frame (box -> glass frame -> full bleed), icon portals | shape morphs (pill -> bar -> window, heart blob -> icon), letterform zoom-through |

---

## 5. Technique catalog

Conventions: 1920x1080 composition, 30 fps, one paused GSAP master timeline `tl` (HyperFrames rule: deterministic, seek-safe, no unseeded `Math.random`, no CSS transitions). Frame counts assume 30 fps. "MB" = motion blur approach.

Global motion blur recipes (referenced below):
- **MB-A (true shutter):** render at 120 fps, then `ffmpeg -i in.mp4 -vf "tmix=frames=2:weights='1 1',fps=30" out.mp4` for a 180 deg shutter (use `frames=4` for 360 deg). Remotion: `<CameraMotionBlur shutterAngle={180} samples={6}>` from `@remotion/motion-blur`.
- **MB-B (directional fake):** SVG filter on the moving layer, `feGaussianBlur stdDeviation="X 0"`, with X driven by velocity (px moved per frame x 0.5).
- **MB-C (zoom smear):** 4 stacked clones of the layer at scale s, s*1.03, s*1.06, s*1.09 with opacity 1, .5, .3, .15, only during the fastest 3-6 frames of a zoom.
- **Grain:** full-frame `<canvas>` or pre-rendered 256 px noise PNG, `mix-blend-mode: overlay`, opacity 0.08-0.12, background-position jumped by a seeded offset every frame.

### T1. Aurora sunrise field (Lovable 7.0, 10.5, 53.7, 72.3)
- What: full-frame radial gradient whose bright horizon sits at 60-75% height, colours shift hue over the shot, heavy grain.
- When: brand name, single-word hits, CTA.
- Params: ellipse 140% x 90% centred at (50%, 110%); stops from the Lovable palette table; hue drift of the whole field 20-40 deg over 2 s; grain 10%.
- Sketch:
```html
<div class="aurora"></div>
<style>.aurora{position:absolute;inset:0;background:
 radial-gradient(140% 90% at 50% 110%,#FF5F1E 0%,#FD422D 22%,#FB3093 40%,#FC63CB 52%,#F697F3 64%,#C69DFD 78%,#788EFD 100%);}</style>
<script>tl.fromTo('.aurora',{filter:'hue-rotate(-30deg)'},{filter:'hue-rotate(0deg)',duration:1.8,ease:'none'},7.0);</script>
```
- MB: none; it is a field. Animate `background-position` or a scale 1.0 -> 1.08 for life.

### T2. Cream canvas with corner blooms (Lovable 4.7, 12.4, 33.1, 41.1)
- What: flat cream `#F7F2EB` with 3-4 blurred pink/coral blobs parked half off-frame at the edges.
- Params: blobs 600-900 px circles, colours `#F4BEDB`, `#EFADAD`, `#FC63CB` at 60-80% opacity, `filter: blur(140px)`, drift 20-40 px per 2 s (sine, seeded phase).
- Variant "ring vignette" (41.1): one radial gradient, transparent centre 0-35%, `#F66EC8` 55%, `#FA577A` 75%, `#788EFD` 100%; animate the inner radius to 0 for the iris in T29.

### T3. Glow-ring prompt pill (Lovable 23.0-27.9) [prompt box typing demo, Lovable flavour]
- What: black pill with a thick soft glow ring (orange core, pink, violet, fade to black) on black.
- Params: pill 1500x170 px at start (camera close), radius 999 px, fill `#000`, text 64 px white. Ring = 3 blurred copies of the pill shape behind it: `#F05505` spread 40 px blur 30 px; `#F66EC8` spread 110 px blur 70 px; `#6C79DD` spread 190 px blur 120 px. Grain 8%.
- Choreography: placeholder 0.7 s; typing 18 chars/s with a 2 px white caret blinking at 2 Hz only while idle; at send: camera pull back 2.2 -> 1.0 in 0.3 s `expo.out`; cursor click (scale 0.9 -> 1 in 4 frames).
- Sketch:
```js
const txt='Create a social shopping marketplace';
tl.to({n:0},{n:txt.length,duration:txt.length/18,ease:'none',
  onUpdate(){q('.p-text').textContent=txt.slice(0,Math.round(this.targets()[0].n));}},23.6);
tl.fromTo('.cam',{scale:2.2},{scale:1,duration:0.3,ease:'expo.out'},24.9);
```
- MB: MB-C on the 0.3 s pullback (frames 1-4 only).

### T4. Rim-lit prompt box on black (Omni 7.3-11.1) [prompt box typing demo, Google flavour]
- What: dark glass card with a cyan rim that is brighter on the bottom edge, inner glow, chips row, send button.
- Params: ~1040x500 px incl. glow, radius 48 px, fill `linear-gradient(180deg,#070C16,#1A344E)`, border 2 px `rgba(58,160,255,.9)` masked brighter at the bottom, `box-shadow: 0 0 60px rgba(24,85,127,.8), inset 0 -30px 60px rgba(58,160,255,.25)`. Prompt 26 px Google Sans Text white. Typing 36 chars/s in 3-char chunks (update every 3 frames). Idle scale drift 1.00 -> 1.03 over the shot.
- MB: none.

### T5. Caret-follow pill typing (Omni 16.5-19.9, era 14.7)
- What: text longer than the frame; the camera pans so the caret stays at ~70% of frame width; final push-in before the cut.
- Params: pill height 110 px, fill `#05080F`, bottom rim `#1AA7FF` 3 px + 20 px blur; typing 31 chars/s; camera x = -(caretX - 0.7*1920) clamped at 0, smoothed with a 4-frame lag (`power2.out`); last 3 frames scale 1.00 -> 1.15 then hard cut. Gemini era variant: chromatic rim (top edge `#4A90FF`, bottom edge `#FF4A5A`, 12 px blur), 28 chars/s, caret removed 4 frames after the last char.
- MB: MB-B on the final push (X = 6 px).

### T6. Send-and-collapse: pill -> bar -> window (Lovable 25.2-26.8)
- What: after send the text erases left to right, the pill narrows to a thin bar, then the bar grows into a rounded app window; the glow ring tracks the shape.
- Params: text erase = `clip-path: inset(0 0 0 X%)` X 0 -> 100 over 12 frames `power1.in`; pill width 1500 -> 900, height 170 -> 60 over 0.5 s `power3.inOut`; window morph height 60 -> 560, width 900 -> 1000, radius 30 -> 18 over 0.4 s `expo.out`; screenshot content fades in 0 -> 1 during the last 6 frames.
- Sketch:
```js
tl.to('.p-text',{clipPath:'inset(0 0 0 100%)',duration:0.4,ease:'power1.in'},25.3)
  .to('.pill',{width:900,height:60,duration:0.5,ease:'power3.inOut'},25.6)
  .to('.pill',{height:560,width:1000,borderRadius:18,duration:0.4,ease:'expo.out'},26.35)
  .to('.pill .shot',{opacity:1,duration:0.2},26.55);
```
- MB: none.

### T7. In-box generative reveal (Omni 11.1-12.1)
- What: the submitted prompt box blurs into a teal haze, a halftone dot field sweeps across from the right edge, and the generated video resolves inside the same box.
- Params: `filter: blur(0 -> 20px)` over 8 frames `power2.in`; dot field = canvas grid 8 px pitch, dot radius 1-3 px mapped from a moving noise band (band 300 px wide travelling right -> left in 0.7 s), colour `#6FD3FF` at 60%; video layer opacity 0 -> 1 and blur 20 -> 0 over 10 frames starting at 11.7; box scale 1.0 -> 1.08.
- AI: the result clip itself. Code: everything else.
- MB: none (blur state carries it).

### T8. Liquid-glass frame (Omni 12.1-14.0, 27.8-30.6, 43.9-46.0)
- What: footage seen through a thick glass squircle: edges refract (content stretched outward near the rim), bright specular rim, top edge pinched inward in the middle, the frame breathes.
- Params: squircle radius ~18% of height; rim thickness 30-40 px; refraction via SVG `feDisplacementMap scale=40` using a pre-rendered displacement map (radial edge ramp, flat centre); specular = inset box-shadow `inset 0 2px 0 rgba(255,255,255,.7), inset 0 -6px 18px rgba(255,255,255,.25)`; dark outer rim `0 0 0 6px rgba(0,0,0,.35)`; top pinch = animate a path control point 0 -> 24 px.
- "Warp-on" variant (27.8): on a full-frame shot, barrel-warp only the outer 12% of the frame within 3 frames, background blur 0 -> 12 px, frosted box over it (`backdrop-filter: blur(24px); background: rgba(255,255,255,.22)`).
- Build: WebGL shader is cleanest (Three.js or TypeGPU adapter); SVG filter works for one layer at 1080p.
- MB: none.

### T9. Frame expands to full bleed (Omni 13.9-14.03)
- What: the glass frame scales past the frame edges in ~4 frames and the rim is pushed off-screen, leaving the footage full frame.
- Params: frame scale 1.25 -> 2.2, rim displacement scale 40 -> 0, `expo.in` over 4 frames; footage inside counter-scaled so it ends at exactly 1.0.
- MB: MB-C on the rim only.

### T10. Full frame -> cursor-held card (Omni 4.2-4.8)
- What: a white hand cursor enters, "grabs" the footage and the whole frame shrinks into a tilted rounded card.
- Params: cursor path bottom-left -> fretboard over 10 frames `power2.out`; frame scale 1.0 -> 0.35, radius 0 -> 40 px, rotate 0 -> -6 deg over 0.5 s `expo.out`, anchored at the cursor point; then idle wobble rotate +-6 deg, y +-8 px at 0.8 Hz (seeded sine).
- MB: none.

### T11. Drag-and-drop dock into chip (Omni 7.3-7.8) [object-continuity cut]
- What: the card keeps flying across a hard cut and lands in the new UI's attachment slot.
- Params: card position/rotation continuous across the cut (compute its screen position in both layouts); land in 15 frames: scale 1.0 -> 0.35, rotate -> 0, `back.out(1.4)`; chip border fades in on landing; second chip pops at +1.2 s (scale 0.6 -> 1, `back.out(2)`, 8 frames).
- MB: MB-B during the flight (X = 8-12 px).

### T12. Word-accumulating centred headline (Omni 22.9-26.9, 33.9, 41.9, 46.0)
- What: words land one by one with no fade; the block re-centres and shrinks as it grows; inserted spaces open from zero.
- Params: word interval 4-6 frames; each new word `opacity 0 -> 1` in 1 frame; space element width 0 -> 0.28em over 4 frames `power2.out`; block scale 1.35 -> 1.0 over the whole build `expo.out`; line-height 1.1; after the last word hold 0.8-1.2 s, then hard cut.
- Sketch:
```js
words.forEach((w,i)=>{const t=22.93+i*0.17;
  tl.set(w,{opacity:1},t).fromTo(w.previousElementSibling,{width:0},{width:'0.28em',duration:0.13,ease:'power2.out'},t);});
tl.fromTo('.head',{scale:1.35},{scale:1,duration:1.0,ease:'expo.out'},22.93);
```
- MB: none.

### T13. Accent-word gradient wipe (Omni payoff words)
- What: the payoff word in blue appears via a soft left-to-right mask.
- Params: `mask-image: linear-gradient(90deg,#000 0%,#000 var(--p),transparent calc(var(--p) + 1.2em))`, `--p` -20% -> 100% over 9 frames `power1.out`; colour `#5180EE`.
- MB: none.

### T14. Per-letter blur-rise gradient word (Lovable 6.15 "meet", 10.5, 55.0)
- What: letters rise out of blur in sequence; the word carries a horizontal gradient.
- Params: per letter `filter: blur(20px) -> 0`, `y: 24 -> 0`, `opacity 0 -> 1`, duration 4 frames `power2.out`, stagger 2 frames; word x from -8% to 0 over 0.6 s `expo.out`; fill `background: linear-gradient(90deg,#7794F4,#B98AEA,#F682D2,#F58E8E,#F89D5C); -webkit-background-clip:text; color:transparent`.
- MB: none (blur does it).

### T15. Glow write-on title (Gemini era 55.4-57.0)
- What: the end line is written left to right; each glyph arrives over-bright and blurred with a coloured halo, then settles to white; last two words gradient.
- Params: per character: `filter: blur(8px) brightness(2.2) -> blur(0) brightness(1)` over 6 frames, stagger 1 frame (3 chars per frame at 29.97 fps is too dense for DOM text, so stagger 0.033 s and accept ~1 s total); halo = `text-shadow: 0 0 24px rgba(120,170,255,.8)` fading to 0 over 12 frames; gradient on the last words `#8AB4F8 -> #C58AF9 -> #DE8F96`.
- MB: none.

### T16. Horizontal collapse -> point -> spark -> logo (Gemini era 57.0-58.4) [logo resolve A]
- What: the finished line squashes horizontally into a glowing point with motion smear, the point becomes a rotating 4-point spark, the spark morphs into the logo.
- Params: `scaleX 1 -> 0.02, scaleY 1 -> 0.6` over 8 frames `expo.in`, with MB-B X = 30 -> 60 px; point = 12 px white dot with 40 px bloom, 4 frames hold; spark scale 0 -> 1, rotate -90 -> 0 over 10 frames `expo.out`; spark -> G logo via SVG path morph (MorphSVG or flubber) over 12 frames, G arc drawn with `stroke-dashoffset` over 10 frames.
- MB: MB-B on the collapse, MB-A if rendering at 120 fps.

### T17. Oversized logo slam-shrink (Omni 48.7-49.0) [logo resolve B]
- What: the logo appears on a hard cut at ~3.2x and decelerates down to size with a small rotation; wordmark above settles slightly.
- Params: spark scale 3.2 -> 1.0, rotate -25 -> 0 deg over 10 frames `expo.out` (measured sizes per frame decay with a ~4 frame time constant); wordmark scale 1.08 -> 1.0 over 12 frames; CTA 70 px fixed.
- Sketch: `tl.fromTo('.spark',{scale:3.2,rotation:-25},{scale:1,rotation:0,duration:0.34,ease:'expo.out'},48.7);`
- MB: MB-C for the first 3 frames.

### T18. Heart blob -> icon -> wordmark write-on (Lovable 75.0-78.4) [logo resolve C]
- What: the background colour core morphs into a heart, cut to black where a blurred giant heart shrinks to the sharp icon, the icon slides left and morphs into the logomark while the wordmark writes on.
- Params: gradient core path morph ellipse -> heart over 0.9 s `power2.inOut`; heart on black scale 3.0 -> 1.0, blur 40 -> 0 px, 8 frames `expo.out`; icon x 0 -> -330 px over 0.5 s `power3.inOut`; letters opacity 0 -> 1 and colour `#7A7A7A -> #FFFFFF`, stagger 2 frames; hold, then lockup scale 1.0 -> 0.8 and swap to URL at 78.4.
- MB: none.

### T19. Word-swap slot on the half-beat (Lovable 8.83-10.5, 53.7-56.8, 69.2-75.9)
- What: one word position is replaced in place every half-beat; no slide.
- Params: interval = 60/BPM/2 (0.267 s at 112 BPM = 8 frames); new word `opacity 1` on its frame, old word `opacity 0` on the same frame; optional scale pop 1.06 -> 1.0 over 4 frames.
- Sketch: `list.forEach((w,i)=>tl.set(w,{opacity:1},t0+i*0.267).set(list[i-1]||{}, {opacity:0},t0+i*0.267));`
- MB: none.

### T20. Stat counter with drawing spline (Lovable 14.8-16.3)
- What: an italic counter races up while a gradient line chart draws underneath with a glowing dot at its head.
- Params: counter from ~22,900 to ~53,000 over 1.5 s, update every 3 frames (+~3,000), `power1.out`, tabular numerals, `transform: skewX(-10deg)`, fill gradient `#2B2428 -> #6A5B63`; spline SVG path, `stroke-dashoffset` 100% -> 0 in sync, stroke 10 px gradient `#788EFD -> #FB3093`, head dot 22 px white with 20 px glow; group x +40 px, scale 1.0 -> 1.05 over the shot.
- MB: none.

### T21. Letterform zoom-through (Lovable 18.0-19.0) [text-to-visual match cut]
- What: camera dives into the counter of a letter; inside the counter a new world waits (a blob with a star); the star grows into a star-shaped window onto the next scene.
- Params: text scale 1 -> 40 with transform-origin at the counter centre of the "a", 0.35 s `expo.in`; inner blob layer pre-placed inside the counter, revealed as the letter passes; star mask (`clip-path: path()` 4-point star) scale 0.05 -> 12 over 0.5 s `power3.in`; next scene counter-scaled 1.3 -> 1.0 inside the mask.
- MB: MB-C on the letter during the last 5 frames of the dive.

### T22. Icon portal zoom-through (Gemini era 9.3-10.0) [text-to-visual match cut]
- What: push into a small UI icon until it fills the frame on black; its concave centre becomes the window onto a montage.
- Params: UI layer scale 1 -> 6 with origin at the icon, 4 frames `expo.in`, chromatic aberration (red/blue copies offset +-6 px) during those frames; cut to the icon on black at 0.2 of frame height, scale 1 -> 8 over 0.5 s `expo.in`; montage layer masked by the inverted star (visible through the growing centre).
- MB: MB-C + chromatic split.

### T23. Flash-frame cold open (Omni 0.0-1.0) [rapid montage beat]
- What: 8 finished outputs at 3-4 frames each, hard cuts, no effects, then the brand on the next cut.
- Params: shot length = one 16th note (60/BPM/4 = 0.128 s at 117.5 BPM, rounded to 4 frames; alternate 4 and 3 frames to stay on grid); sequence alternates cool/warm colour to maximise flicker contrast; brand appears on the downbeat after 2 beats.
- MB: none.

### T24. UI overdrive with background swaps (Gemini era 5.40-6.51) [rapid montage beat]
- What: on the drop the UI turns into white outlines and stays locked while the background behind it swaps to a new 3D texture every 4-5 frames, and the camera accelerates in.
- Params: UI restyle = `filter: invert(1)` on a transparent-background SVG, or an outline variant of each chip (1.5 px white stroke); backgrounds swapped at 5.40, 5.53, 5.70, 5.87, 6.21, 6.37 (4-5 frame intervals); camera scale 1.3 -> 3.0 over 0.6 s `power3.in`.
- AI: 5-6 abstract 3D macro clips (see section 6). Code: the UI and the swap timing.
- MB: MB-C during the last 8 frames of the push.

### T25. Logo split and chip inflate (Gemini era 1.9-5.4)
- What: a letter of a familiar logo becomes the brand spark; the logo parts at the seam and feature chips inflate outward from the centre, overflowing the frame.
- Params: logo halves x +-(total chip width / 2) `power3.inOut` in step with each chip; each chip scale 0 -> 1 from its own centre, 10 frames `back.out(1.6)`, stagger 0.2 s, chips alternate left and right of centre; camera 1.0 -> 1.15 over 3.5 s `none`.
- MB: none.

### T26. Tilted UI plane with depth-of-field dolly (Lovable 27.9-33.1, 44.97-53.7, 57.8-61.8, 66.4) [product UI zoom-and-pan]
- What: a real UI screenshot on a 3D-tilted plane; the camera drifts across it while the far edge is out of focus; shots start with a focus pull.
- Params: `perspective: 1800px`; plane `rotateX(10deg) rotateY(-12deg) rotateZ(-2deg)`; push scale 1.0 -> 1.35 over 3-5 s `power2.inOut` with x pan 80-200 px toward the next click target; DOF = duplicate layer blurred 10 px with `mask-image: linear-gradient(100deg,transparent 45%,#000 85%)`; cut-in focus pull blur 12 -> 0 px over 8 frames `power2.out`; UI shadow `0 60px 120px rgba(0,0,0,.35)`.
- Sketch:
```js
tl.fromTo('.ui-plane',{scale:1,x:0,rotateX:10,rotateY:-12,rotateZ:-2},
  {scale:1.35,x:-160,duration:4,ease:'power2.inOut'},44.97)
  .fromTo('.ui-plane .sharp',{filter:'blur(12px)'},{filter:'blur(0px)',duration:0.27,ease:'power2.out'},44.97);
```
- MB: none (slow moves).

### T27. Cursor choreography (all UI demos)
- What: a large system hand/arrow cursor (Lovable ~64 px, Omni ~48 px, white fill with black outline) that travels on curved paths and presses.
- Params: travel 8-15 frames per move, path = quadratic bezier with the control point offset 15% perpendicular, `power2.inOut`; press = scale 1 -> 0.85 -> 1 over 5 frames plus the target button `scale 0.96`; after a click the camera starts its next move 3-6 frames later. Multiplayer tags (Lovable 33.1): arrow + name pill (pink `#F66EC8`, orange `#FD5C21`), enter from off-screen 12 frames `expo.out`, idle drift 6 px.
- MB: MB-B on fast travels (X = velocity x 0.4).

### T28. Tilt-whip transition (Gemini era 31.53-31.80)
- What: the current UI card whips away with a 3D rotation and directional blur through a coloured glow, landing on the next UI.
- Params: outgoing card `rotateX 0 -> 35deg, rotateZ 0 -> -12deg, y 0 -> -300px` over 5 frames `power3.in`; incoming layer `rotateZ 8 -> 0, scale 1.4 -> 1.0` over 5 frames `expo.out`; pink radial glow `#FBE7F6` flash peaking on the switch frame; MB-B X = 40 px at peak.
- MB: MB-B (or MB-A at 120 fps).

### T29. Iris-to-icon match (Lovable 42.3-43.0)
- What: a ring vignette closes into a target-shaped icon, the background floods to UI blue, the icon shrinks into the UI chip it represents in the next shot.
- Params: ring inner radius 35% -> 0 over 6 frames `power2.in`; icon scale 2.5 -> 1 over 8 frames `expo.out`; background colour tween pink -> `#2F6BF2` over 6 frames; hard cut to the UI when the icon reaches the chip's size and position.
- MB: none.

### T30. Before/after compare slider (Omni 31.6-33.9)
- What: original footage and AI-transformed footage with identical motion, split by a thin white line with a grip.
- Params: divider 2 px white, grip 10x40 px rounded; x 0% -> 48% over 12 frames `expo.out`, then drift between 40% and 55% (sine, 0.4 Hz); left = `clip-path: inset(0 calc(100% - var(--x)) 0 0)`.
- AI: requires a motion-matched pair (same choreography). See section 6.
- MB: none.

### T31. Generative style morph montage (Omni 19.9-22.9)
- What: the same subject and pose cycles through styles; each change is a 0.3-0.5 s morph, not a cut.
- Params: shot lengths 0.73 s, 1.26 s, 0.33 s; morphs 14 frames and 8 frames. In code a morph is a crossfade with a displacement/luma-key wipe (`mix-blend` of the next clip revealed by an animated noise threshold), but the real thing is a model-generated transition (see section 6).
- MB: none.

### T32. Masonry wall pullback (Lovable 19.0-21.5)
- What: from one full-frame result, pull back to reveal it is one tile in a wall of results, pan, and push into another tile.
- Params: wall of 10-14 screenshots, gaps 16 px, tiles rounded 12 px; camera scale 1.0 -> 0.45 over 0.6 s `power3.inOut`, pan x -500 px over 0.5 s, push into the target tile 0.45 -> 1.0 over 0.4 s `expo.in`.
- MB: MB-B on the pan.

### T33. Screen push-through into a 3D world (Gemini era 52.2-52.4)
- What: push into a handheld phone screen; rack blur + prism flare; land in a photoreal 3D flythrough that continues the screen's content.
- Params: 6 frames: phone plate scale 1 -> 2.5, blur 0 -> 18 px, chromatic split +-10 px, rainbow edge flare; world clip starts at blur 18 -> 0 over 4 frames, dolly forward.
- AI: the phone plate (or real footage) and the flythrough. Code: the blend frames.

### T34. Fan-stack window pullback (Gemini era 36.7-37.24)
- What: a single document window pulls back and duplicates into a receding 3D fan.
- Params: 8 clones, each `translateZ(-i*120px) translateX(i*60px) rotateY(-25deg)`, revealed with stagger 1 frame; camera pull back 1.0 -> 0.6 over 0.5 s `power2.out`.
- MB: none.

---

## 6. AI footage vs pure code

Generation stack per house rules: stills in Nano Banana Pro (Magnific) at 2K, 4K for UI/screen plates; video in Seedance 2.0 or Kling 3.0 omni with references; chain from one approved key image; render 3 s longer than the cut; `no music` in every video prompt.

### Gemini Omni style
| shots | need | how |
|---|---|---|
| 9-10, 22 (source footage) | "real" camera footage of one hero subject (busker; dancer in a field) | live shoot or photoreal AI video; lock a key still first |
| 1-8, 15, 17-19, 28-30 (results) | the same subject restyled: clouds, torn-paper collage, retro comic sticker, chrome statue, claymation, latex portrait, underwater | one key image -> style variants as edits of that key (never fresh generations), then animate each with Kling 3.0 omni using the variant as reference; 1.5-4 s each |
| 17-19 morphs | style-to-style transitions | Seedance 2.0 multishot with timecoded beats (style A 0:01-0:03 / style B 0:04-0:06) or Kling start+end frames; fallback: T31 code wipe |
| 24-25 (yeti) | character swap with identical choreography for the compare slider | video-to-video with motion control (Kling motion control / Higgsfield motion transfer) driven by the source dance clip; must be frame-aligned |
| 32 (templates) | 10-12 short varied template clips | batch generate, 3 s each |
| everything else (prompt box, pill, chips, cursor, glass frame, text, slider, logo) | code | T4, T5, T7-T13, T17, T30 |

### Gemini era style
| shots | need | how |
|---|---|---|
| 4-7 (drop backgrounds) | 5-6 abstract macro 3D textures (glossy blobs, porous coral, iridescent fibre, crumpled material) | AI video, 2 s each, slow camera drift, no subject; or Blender |
| 14 (collage) | 8-12 AI images/videos tiled | stills + light animation |
| 21 (generated result) | two stylised images | stills |
| 22-28, 32, 35, 38-40, 42 (people, POV) | live action vignettes: reactions, hands with phone, athletes, desk POV | live shoot is best; photoreal AI video possible. Phone screens: shoot or generate with a flat green screen and composite the UI in code |
| 44 | photoreal 3D city flythrough | Google Earth Studio export or AI video |
| UI screens, chips, type, logo | code | T5, T15, T16, T22, T24, T25, T28, T34 |

### Lovable style
| shots | need | how |
|---|---|---|
| 1 (glossy spheres) | could be AI, but code is better | CSS radial-gradient spheres with blurred highlights, or Three.js spheres with a physical material |
| 14-16 (site wall) | 10-14 believable website designs | build real pages, or Nano Banana Pro at 4K as UI screenshots |
| 17, 39 (laptop scenes) | photoreal laptop on dark rocks / on a styled desk, screen facing camera | Nano Banana Pro still with a flat screen; composite the UI screenshot in code with CSS perspective, add a 1-2% push |
| 26 (avatars) | 5 diverse portrait headshots | stills |
| everything else (type, gradients, pill, UI demo, cursors, counter, logo) | code | T1-T3, T6, T12, T14, T18-T21, T26, T27, T29, T32 |

---

## 7. Sound design rules

| film | genre | BPM | beat | key events |
|---|---|---|---|---|
| Omni | pop/hip-hop, acoustic guitar, female vocal | 117.5 | 0.511 s | flash cuts on 16ths (0-1 s); bass out 7.0-9.0 and 16.0-18.75 under prompts; full return 19.0; bass out 48.0; silence 49.25 |
| Gemini era | boom-bap hip-hop instrumental with a vocal sample intro | 89 | 0.673 s | quiet open -32 dB; dip 2.0-2.5; bass entry 5.25 -> picture drop 5.40; music out 56.0; sting 58.75 on logo |
| Lovable | four-on-floor synth-pop / tech-house | 112.3 | 0.534 s | full stop 8.00-8.25, drop and cut 8.83; word swaps every half-beat; breakdown 49.25-50.0; re-drop 52.5 -> cut 53.7; fade 79.0 |

Placement rules to reproduce:
1. Put the biggest structural cut (brand -> product world) 0-5 frames AFTER the drop transient, never before (era +5 frames, Lovable drop 8.5-9.0 with cut at 8.83).
2. Precede the drop with a hard stop of 8 frames (Lovable) or a strip-down to no bass (Omni) so the reveal lands on contrast.
3. Strip the bass (high-pass ~200 Hz or mute the kick/bass stems) for the entire prompt-typing moment; bring it back on send or on the result.
4. Rapid sequences use subdivisions: 16th notes for flash frames, 8th notes for word swaps. Everything else follows the picture rhythm, not the beat grid; do not force every cut onto a beat.
5. Logo lands in the last 1-2 bars; music stops or fades 1.0-1.5 s before the final frame, leaving silence or a single sting on the logo.
6. SFX layer: typing (chunked, matching the 3-character updates), UI click on every cursor press, soft whoosh on every zoom-through or pullback (length = transition length), shimmer on each AI generation, a sub impact under the end line.
7. HyperFrames: run `hyperframes beats` on the chosen track and snap only section boundaries, drops and logo to its markers; snap word swaps to the half-beat grid.

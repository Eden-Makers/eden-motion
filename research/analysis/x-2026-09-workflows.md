# X references 2026-09: code-native UI morph, AI motion workflow, Apple framework

Three X posts (2026-09-26), analysed from the videos. Numbers come from frames first; Gemini was a first pass only and was wrong in several places (see 0.2).

| id | post | video(s) | length | fps | what it is |
|---|---|---|---|---|---|
| `twoclipping` | @twoclipping 2103273003555402193 | 1 x 1440x1440 | 14.00 s | 60 | "one shape never cuts" UI morph film, all code |
| `rexan` | @rexan_wong 2103707054108299437 | 1 x 2016x1512 | 11.00 s | 60 | screen recording of the reference/prompt workflow (no audio) |
| `leo_*` | @leomeethewoo article "Make your product videos look expensive (Apple Framework)" | 7 videos | 2-25 s | 30/60 | Apple-style montage grids, studio reel, Figma-vs-result, storyboard canvas, easing graphs, transition, music demo |

Files: `research/refs/x-2026-09-26/` (mp4s, `frames/` contact sheets and bursts, `gemini/*.md`, `two_track2.json` per-frame shape track, `two_cursor.json` per-frame cursor track, `two.wav`, scripts `sheet.py`, `track2.py`, `gemini_pass.mjs`). `track2.py` reads `frames/two_all/%04d.png` (720x720 dump, regenerate with `ffmpeg -i twoclipping.mp4 -vf scale=720:720 frames/two_all/%04d.png`).

## 0. Method

### 0.1 Measurement
- Contact sheets every 0.25 s (twoclipping) or 0.5-1 s (others), timestamps burned in with PIL (the local ffmpeg has no drawtext). Every-2-frame bursts (30 fps) around every twoclipping morph: `two_b1_island`, `two_b2_player`, `two_b3_tab`, `two_b4_cmdk`, `two_b5_toast`, `two_b6_vol` (20 fps).
- Shape track: every frame at 720 px, largest external contour of dark (gray < 110) or light (gray > 243) pixels, hole-filled; width, height, corner radius from `r = sqrt((w*h - area) / (4 - pi))` (checks: the 644x208 pill measures r = 104 = h/2). All sizes below are full-res px of the 1440 frame.
- Spring fit: least-squares fit of a closed-form damped step response (grid over zeta 0.3-1.0, wn 6-45 rad/s, onset offset) per axis per morph. Only fits with rms < 7 px are used for the rule.
- Cursor: template match (6 scales) on every frame. Reliable only on light surfaces; over dark surfaces the cursor inverts (see 1.6), so those frames were read by eye.
- Beat: librosa beat track + onset detect on the mixed audio. Scene cuts: `select='gt(scene,0.25)',showinfo`.

### 0.2 Where Gemini was wrong (frames win)
- twoclipping: said ~109 BPM and "morphs hard-synced to downbeats". Measured 117.5 BPM and morphs are NOT on the music beat (offsets -144 to +144 ms, see 1.8).
- Said 10-15% overshoot on every morph and a button press scale-down. Measured 3-5% (9% on the single biggest expansion) and no press scale (644 -> 640 px, 0.6%).
- Said "camera static, no zoom". The UI scale does change per state (tab bar labels shrink to ~0.55-0.67x when the chart opens), see 1.7.
- rexan: correct that it is a plain screen recording, but it missed that the middle page is a prompt library with the workflow in it.

---

## 1. twoclipping: "one shape never cuts"

### 1.1 State table (morph onset = first frame the shape moves)
| # | state | onset s | hold s | settled size w x h | radius | fill | trigger |
|---|---|---|---|---|---|---|---|
| 0 | "Generate" pill | 0.00 | 0.48 | 644 x 208 | 104 (pill) | #000000 | cursor enters from bottom right, 567 px in 0.37 s |
| 1 | loader circle | 0.48 | 0.52 | 224 x 224 | 112 | #000 | click; label blurs out, spinner blurs in |
| 2 | check | 1.00 | 0.27 | 224 (pulse to 240, +7%) | 112 | #000 | spinner arc shrinks away 0.85-0.95, check draws 0.98-1.03 |
| 3 | dynamic island | 1.27 | 0.50 | 860 x 220 | 110 (pill) | #000 | auto; art thumb + equaliser bars blur in |
| 4 | music player | 1.77 | 1.98 | 992 x 630 | 83 | #000 | click on equaliser; play->pause click 2.1, scrub drag 2.7-3.5 |
| 5 | volume slider | 3.75 | 0.97 | 1084 x 188 | 94 (pill) | #000 | progress bar becomes the volume track; drag to 0 then past max |
| 5b | rubber-band stretch | 4.72 | 0.30 | 1172 x 184 (+8.1% w, -2% h) | pill | #000 | cursor pulls past the end |
| 5c | release | 5.02 | 0.23 | back to ~1070 | pill | #000 | spring back, 3.9% overshoot |
| 6 | toggle | 5.25 | 1.05 | 496 x 276 | 138 (pill) | track #000 / #4A4A4A, knob #FFF | two clicks 0.5 s apart, knob stretches ~+20% in travel |
| 7 | segmented tabs | 6.30 | 0.95 | 1168 x 168 | 84 (pill) | bar #FDFDFD, indicator #000 | the toggle KNOB becomes the tab indicator; Day -> Week -> Month |
| 8 | chart card | 7.25 | 2.50 | 1100 x 844 | 59 | #FDFDFD | tab bar rides up into the card; line draws, number rolls, hover tooltip, Week click |
| 9 | Cmd K palette | 9.75 | 2.00 | collapse to 868 x 168 search pill (10.00), open to 1032 x 644, filter to 1260 x 380 | ~40-60 | #FDFDFD | typing "frame" 10.45-11.0, arrow to row 2, Enter 11.5 |
| 10 | toast | 11.75 | 1.02 | 972 x 180 | 90 (pill) | #000 | the selected ROW becomes the toast (card white -> black while collapsing) |
| 11 | "Generate" pill | 12.77 | 1.23 | 644 x 208 | 104 | #000 | toast shrinks back; last frame pixel-identical to frame 0 (loop) |

Pacing: 13 shape events in 14 s, mean hold 1.0 s, median 0.95 s; interaction states (player, chart, Cmd K) hold 2.0-2.5 s, pass-through states (loader, check, island, stretch) 0.23-0.52 s. The shape centre never leaves (720, 720).

### 1.2 Palette and type
- Background: soft radial light, `#F0F0EB` centre, `#EAEBE6` mid, `#E5E6DF` corners. Never pure white, never flat.
- Shape: `#000000`. Cards: `#FDFDFD` (253). Grey states for knob and toggle track: `#DDDDDD`, `#AAAAAA`, `#777777`, `#444444`, `#4A4A4A`. Secondary text ~`#8A8A8A`.
- One accent only, the album art: diagonal gradient `#FFA363` (top left) -> `#FE5865` -> `#DE6179` (centre) -> `#C45888` -> `#A24DB5` (bottom right).
- Shadow under every state: soft, low, wide (y ~20-30 px, blur ~60 px, ~10% black), stays with the shape.
- Type: neutral grotesk (Inter / SF-like), semibold for labels, regular for secondary, tight tracking. Label cap height 20-51 px = 1.4-3.5% of the 1440 frame ("Generate" 51 px incl. glyph height, toast 38 px incl. descender, tab label 39 px, chart tab label ~26 px).

### 1.3 Spring (measured)
| morph / axis | from -> to px | overshoot % of delta | peak at s | settle to 1% s | fit zeta | fit wn rad/s |
|---|---|---|---|---|---|---|
| button -> loader, w | 644 -> 240 | 4.5 | 0.33 | 0.70 | 0.72 | 15.0 |
| loader -> island, w | 224 -> 865 | 4.8 | 0.25* | 0.55 | 0.72 | 18.0 |
| island -> player, h | 220 -> 630 | 9.3 | 0.25 | 0.51 | 0.60 | 16.0 |
| player -> volume, h (collapse) | 630 -> 188 | 0.9 | 0.31 | 0.25 | 0.84 | 18.0 |
| tab -> chart, h | 168 -> 844 | 3.3 | 0.27 | 0.44 | 0.72 | 17.0 |
| chart -> search pill, h (collapse) | 844 -> 202 | 5.3 | 0.25 | 0.26 | 0.70 | 16.5 |
| toast -> button, w | 972 -> 644 | 4.9 | 0.26 | 0.45 | 0.70 | 17.0 |
| volume release, w | 1172 -> 1070 | 3.9 | 0.25 | 0.20 | 0.56 | 12.0 |

*island width peaks at 888 px at 1.50 s (0.23 s after onset), then eases down to 860 by 1.75 s.

Consensus: **zeta 0.70, wn 16.5 rad/s** (f = 2.6 Hz). Mass 1: **stiffness k = 272, damping c = 23**. SwiftUI terms: response 2*pi/wn = **0.38 s, dampingFraction 0.70**. Framer Motion terms: `{ type: "spring", stiffness: 270, damping: 23, mass: 1 }`. Result: one visible overshoot of 3-5% (9% on the largest growth), peak 0.25 s after onset, settled within 1% in 0.45-0.55 s, no second visible wobble.
- The two axes of one morph run on the same clock but the growing axis carries the overshoot; a collapsing axis often lands with <= 1% (zeta ~0.84 fits). Width and height of the player overshoot together (1068 x 666 at 1.95 s -> 992 x 630).
- Corner radius does not overshoot: it re-targets inside the same 0.25 s (island 110 -> player 85 by 2.05 s) and follows `min(r_target, h/2)` so pills stay pills.
- A retarget mid-flight (Cmd K: collapse to pill at 10.0, reopen at 10.05, filter per keystroke) is a new spring from the current value and velocity, no pause.

### 1.4 Morph grammar
1. One element, always centred. Size, radius and fill change; the element never unmounts and there is no cut in 14 s.
2. **Shared-element continuity per step** (this is the real trick, more than the spring): album art thumb island -> player (grows 36 -> 222 px), progress bar -> volume track, toggle knob -> tab indicator, tab bar -> chart header, selected Cmd K row -> toast, toast -> button. Each state hands one piece to the next.
3. Content exit: old content blurs + fades out in **0.07-0.10 s**, starting on the morph onset frame ("Generate" 0.53-0.65, player content 3.72-3.82).
4. Content enter: new content blurs in over **0.08-0.13 s**, starting **0.10-0.18 s after onset** (spinner 0.65, island art 1.37, player title 1.93, which is the shape's overshoot peak). Stagger **0.035-0.07 s**, top-to-bottom / left-to-right (player: title 1.93, subtitle 2.00, progress 2.07, times 2.10, controls 2.13; tabs: Day 6.42, Week 6.48, Month 6.55; Cmd K rows 10.17-10.33).
5. Fill colour ramps linearly in lightness over **0.10-0.17 s** alongside the size spring: knob white -> black 6.28-6.45 (0.17 s), Cmd K row highlight grey -> black 11.50-11.60, whole card white -> black 11.77-11.93 while collapsing into that row.
6. Shape edges soften to **10-20 px** (10-90% edge width) at peak edge velocity (~30 px/frame at 60 fps) and are 2 px at rest. That is what a 180 deg shutter gives; our final-render motion blur covers it, no extra filter needed.
7. Liquid indicator (measured edges, 60 fps): Day -> Week leading edge travels 516 -> 900 px in ~0.20 s with an ease-out and no overshoot; trailing edge lags 1-2 frames and keeps closing after the leading edge has landed; width stretches **356 -> 472 px (+33%)** at 0.10 s into the move, back to rest by 0.25 s. Week -> Month identical (388 -> 478, +23%).
8. Rubber band: while dragged past the end the track stretches with the cursor (+88 px = 8.1% of width in 0.17 s) and thins 2% (188 -> 184); on release it springs back with zeta ~0.56 (3.9% overshoot, 0.20 s).
9. Micro-feedback pulses: the check state pulses 224 -> 240 -> 224 (+7%) over 0.25 s.
10. Numbers roll with per-digit vertical blur (68,583 -> 83,806 -> 84,320 over ~0.5 s; 84,320 -> 24,806 -> 19,204 over 0.3 s after the Week click); chart line draws left to right in ~0.4 s and morphs to the new data on tab change.

### 1.5 Cursor grammar
| move | distance px | time s | avg px/s | shape |
|---|---|---|---|---|
| enter to "Generate" | 567 | 0.37 | 1550 | straight, peak speed at 14% of move (ease-out) |
| retreat after click | 410 | 0.35 | 1170 | straight, peak mid-move (in-out) |
| to chart point | ~800 | ~0.35 | ~2200 | straight |
| chart point -> Week tab | 565 | 0.23 | 2420 | straight |
| away before Cmd K opens | 602 | 0.40 | 1500 | near straight (2.8% arc) |
| idle drift after Cmd K click | 593 | 0.88 | 670 | slowing drift |
| idle drift during toast | 78 | 0.50 | 155 | slow drift |

- Paths are straight lines (arc deviation 0.2-3% of distance), not arcs. Moves take **0.2-0.4 s**, **0.8-1.7 frame widths per second**, eased out (approach) or in-out (retreat).
- Dwell before a click is short: **0.03-0.15 s** (Generate ~0.1 s, Week ~0.15 s, Month ~0.03 s).
- No visible press scale on the cursor (template scale stays within noise, <5%) and no ripple: the target's morph starting 1-2 frames after arrival IS the click.
- After a click that makes the shape grow, the cursor retreats 300-600 px out of the new footprint within ~0.35 s so it never covers the morph, then drifts slowly (80-670 px/s decaying). It is never perfectly still except during typing.
- Over black surfaces the cursor renders white-filled with a dark outline (visible 0.45 s, 1.7 s, 2.1 s); on light surfaces black with white outline.
- Cursor size is constant through all states while the UI scale changes, so the cursor lives in screen space above the camera.
- Keyboard beats (Cmd K typing, arrow, Enter) happen with the cursor parked; typing speed ~9 chars/s (5 chars in 0.55 s), list filters with a spring on each keystroke.

### 1.6 Camera per state
- The shape centre is locked at frame centre; during holds size is constant to the pixel (992 x 630 for 1.4 s, 1100 x 844 for 1.9 s), so there is no drift or push.
- What changes is the UI scale per state, so each state fills a planned share of the frame: button 45% of width, island 60%, player 69% x 44%, volume 75%, toggle 34%, tabs 81%, chart 76% x 59%, Cmd K 72-88%, toast 68%. Proof of scaling: the tab bar that becomes the chart header shrinks (tab indicator 394 px -> ~218 px, label height 39 -> ~26 px, i.e. **0.55-0.67x**) while the card grows.
- The scale change rides the same spring as the morph (no separate camera move, no zoom easing of its own).

### 1.7 Music and sync
- Track: mellow electronic groove, **117.5 BPM** (beat period 0.511 s, first beat 0.093 s), steady 8th-note onsets, RMS flat at -15 to -20 dB per 0.5 s with small dips at 1.5, 9.5 and 13.5 s. No discernible UI SFX (clicks, whooshes) above the music.
- Morph onsets: 0.48, 1.00, 1.27, 1.77, 3.75, 4.72, 5.02, 5.25, 6.30, 7.25, 9.75, 11.75, 12.77 s. These sit on a **0.25 s authored grid** (an 8th note at 120 BPM), but against the real 117.5 BPM track they land -144 to +144 ms off the nearest beat. So the film was timed to a 120 BPM grid in code and the music was laid under without conforming. It still feels rhythmic because everything is on one grid and holds are grid multiples (0.25, 0.5, 1.0, 2.0 s).

### 1.8 Loop
Frame 839 = frame 0 (644 x 208 pill, same cursor-free composition; the cursor exits bottom right in the last 0.1 s as it entered).

---

## 2. rexan: the workflow (screen recording, 11 s, silent)
| s | screen | what it shows |
|---|---|---|
| 0.0-5.0 | "What Ships" gallery (2221 startup launch videos from X, category filter, 4-column grid of video cards) | step 1: pick a REFERENCE video, not a vibe |
| 5.0-8.0 | detail page of one entry (a 16:9 10 s HTML/JS kinetic-type launch film) with tabs Prompt / Storyboard (7) / Details, a "Paste-ready prompt" and "Copy prompt" | step 2: the reference comes with a reusable agent prompt and a 7-board storyboard |
| 8.0-11.0 | 21st.dev component gallery (cards, charts, sidebars) | step 3: real UI components as the building blocks |

Cuts at 5.0 and 8.0 s (hard), native linear scrolls, no cursor. The prompt on screen describes the pipeline this thread argues for: stack = HyperFrames HTML + GSAP; (1) intake: read the product URL, pull logo, brand colours as hex, fonts, 3 personality adjectives, 4 use cases, tagline; (2) beat sheet mapped onto the reference's beats with the same timing, every on-screen line written; (3) storyboard: one board per beat (layout, exact text, what moves, transition in/out) saved as STORYBOARD.md, **then stop for approval**; (4) build one composition per beat with shared design tokens and one continuous visual thread (a single orange dot that draws a line, dots the i, becomes the decimal).

Combined with the thread text, the workflow is: reference video -> brand context -> 3 storyboard variants -> one still frame per scene -> director notes in camera words -> build.

---

## 3. Leo: "Apple framework" videos
| video | size / length / fps | content | measured |
|---|---|---|---|
| `leo_2103527016452833281` (opener) | 1920x1080, 9.4 s, 60 | 2x2 grid of four Apple ads (Siri orb, sequencer UI, Watch, iPhone Dynamic Island) | black #000, white type, one saturated colour per quadrant (green sequencer, violet track, Siri gradient); **123 BPM**; hard cuts inside quadrants |
| `leo_2103527016419192832` (studio reel) | 1920x1080, 10.4 s, 60 | 2x2 grid: crypto card app (3D pouch, "$1,100,000" 3D numerals with sunburst, Deposit pill, phone UI with Credit line card) | lime `#BBFD67`/`#D1FF35` on `#F6FFD9`, orange gradient pill `#E27D5E` -> `#F38B53`; **161.5 BPM** (hype, or 81 half-time); state changes every ~0.4 s |
| `leo_2103527016440139776` (Design) | 1920x1920, 25 s, 30 | split: "Design Layout" Figma strip on top, "Result" render below, frame for frame | `#000`/`#F0F0F0` + one orange gradient `#F05040`-`#F08040`; key text centred, 5-8% frame height; **107.7 BPM**; shows the render matches the Figma frames 1:1 |
| `leo_2103527016561848320` (storyboard) | 1464x720, 14.8 s, 30 | Figma canvas zooming 24% -> 3%, 7 labelled rows (Scene 1 Hook ... Scene 5 Off-Ramp / Utility ...), dozens of frames per scene | the storyboard IS keyframes: every animation step drawn as its own frame before animating |
| `leo_2103527016649867264` (Smoothness) | 1300x500, 6.3 s, 30 | four balls + AE speed graphs, handles dragged, then playback | progress at 10..90% of time: in-out gentle 0.05/0.12/0.24/0.35/0.50/0.65/0.76/0.88/0.95 (sine.inOut); extreme in-out 0.02/0.03/0.07/0.15/0.73/0.87/0.94/0.97/0.99 (expo.inOut); ease-in 0.02/0.04/0.07/0.11/0.17/0.26/0.41/0.68/0.93; ease-out 0.40/0.57/0.71/0.79/0.86/0.91/0.95/0.97/0.99 (power3-4.out, long tail) |
| `leo_2103527016599597056` (Dynamic transitions) | 1920x1080, 2.15 s, 60 | real 3D coin flipping between buildings -> becomes the coin on the phone screen -> "100%" orb -> lime ring swoosh -> transaction row "paid by cero" | object-motivated match transition at 0.22 s, then continuous push-in ~4x onto one row with background blur; no cut after the match |
| `leo_2103527016821833728` (Music) | 1920x1080, 22.2 s, 60 | Apple Watch ad with waveform strip: Siri UI, three watches, "24-hour" green glow, fast charging icon, "Stunning finishes" crown, "Tougher than" glass, "work of heart.", product, logo | **123 BPM** (beat 0.488 s); cuts at 5.20, 7.17, 8.20, 9.17, 12.10, 14.53 s = intervals of **4, 2, 2, 6, 5 beats**; dark/light alternation (black product shots vs white #FFFFFF finish shots); logo end card 2 s |

Article principles (paraphrased): intention behind every choice (font, background, music, colour); give yourself hard rules (3 colours per video type, same backgrounds, one music family per project type); design before animation (product designers storyboard every frame in Figma first); one shot = one idea; every scene has room to breathe; key object centred; background follows brand rules and never competes; smooth eased overlapping motion (linear reads cheap); dynamic transitions over direct cuts unless the cut carries meaning; adaptive rhythm (speed up, slow down, hold); BPM by mood: 60-80 regal / cinematic / heritage, 90-110 smooth / cool / effortless, 115-123 elite / kinetic / sophisticated, above that hype; sound design last and sparing, remove any effect that is loud, out of place or does not help understanding.

---

## 4. What to adopt (engine and pipeline rules)

### 4.1 `EM.spring` defaults
- Default UI spring: **zeta 0.70, wn 16.5 rad/s** (k 272, c 23, m 1; response 0.38 s). Closed form: `x(t) = xf + (x0 - xf) * e^(-z*wn*t) * (cos(wd*t) + (z*wn/wd) * sin(wd*t))`, `wd = wn*sqrt(1 - z^2)`. Expect 4-5% overshoot, peak at 0.25 s, 1% settle at ~0.5 s.
- Presets: `ui` (0.70, 16.5) for growth; `collapse` (0.84, 18) for shrinking to a pill (<= 1% overshoot, 0.25 s); `release` (0.56, 12) for rubber-band snap back; `pulse` = ui spring on scale 1 -> 1.07 -> 1 over 0.25 s for confirmations.
- A retarget = new response starting from current value AND current velocity (sum of responses stays a pure function of time, matches SCENE_API rule 13).
- Radius is not sprung on its own: `r = min(r_target_eased, h/2)` with the same clock; fill colour is a separate 0.10-0.17 s linear lightness ramp.
- This amends style law 1 ("no overshoot") for the UI-morph style only: arrivals of type and cards keep the focus pull; shape morphs, knobs and indicators use the spring. Never `back.out` as a stand-in (it overshoots once on a fixed curve and cannot retarget).

### 4.2 Morph scene (`ui-morph`)
- One persistent container, centred, never unmounted. State list = `{w, h, r, fill, content, share}` where `share` names the element handed to the next state (thumb, progress bar, knob, row). Plan the chain of shared elements before anything else.
- Content: exit 0.08 s (blur 0 -> 12 px + fade) on the onset frame; enter 0.10 s (blur 12 -> 0) starting at onset + 0.12 s (on the overshoot peak), stagger 0.04-0.06 s in reading order.
- Pass-through states 0.25-0.5 s, interactive states 2.0-2.5 s; everything on a 0.25 s grid.
- Indicator / knob = two-edge spring: leading edge ease-out 0.20 s no overshoot, trailing edge same curve delayed 0.03 s; target peak stretch +25-33% of rest width at mid-travel. Toggle knob stretch ~+20%.
- Rubber band: track extension = 0.3-0.5 x cursor overshoot past the end, capped ~8% of width, thickness -2%; release with `release` preset.
- Numbers: digit roll with per-digit vertical blur, 0.3-0.5 s; chart line draw 0.4 s left to right, data change morphs points with the ui spring.
- Background: soft radial off-white (`#F0F0EB` -> `#E5E6DF`), black shape, one gradient accent object.

### 4.3 Cursor
- Update `fx.cursorMove` default for this style: straight path, **0.25-0.35 s**, `power3.out` for approach, `power2.inOut` for retreat; speed target 0.8-1.7 frame widths/s (clamp duration to 0.2-0.45 s from distance).
- Dwell **0.08 s** default before click (range 0.03-0.15), not 0.2 s. Keep the existing press (0.85 cursor, 0.96 target) only for the Burnwe style; in the UI-morph style no press scale, the morph is the click.
- After a click that grows the target: auto-retreat outside the new bounds (+60 px margin) within 0.35 s, then decaying drift 150-600 px/s. Never dead still except while typing.
- Invert cursor fill over dark surfaces (white fill, dark outline). Cursor in screen space, outside the camera scale.
- Typing: 9 chars/s default for command palettes (Burnwe hot-tail stays 17 chars/s).

### 4.4 Camera per state
- Per state, compute a scale so the settled state fills a planned fraction of the frame: small controls 35-45% width, bars 60-80%, cards 70-88% width and <= 60% height. Apply the scale on the same spring as the morph, locked to frame centre. No drift during holds in this style (the object's own life carries the frame); the rest of the engine keeps the 0.4-2%/s drift.

### 4.5 Beat and timing
- Author on a grid: 0.25 s steps = 8th notes at 120 BPM. Then either (a) generate/choose music at exactly the grid tempo (120) or (b) re-snap the grid to the measured beats of the chosen track (`hyperframes beats` / librosa). twoclipping skipped this and lands up to 144 ms off; we should not.
- Cuts and big state changes on beat multiples, varied: the Apple Watch film uses 4, 2, 2, 6, 5 beats. Holds of 2-6 beats for proof and reveal, 1-2 beats in montage (adaptive rhythm).
- Music BPM by mood (Leo): 60-80 regal / cinematic / heritage, 90-110 smooth / cool / effortless, 115-123 elite / kinetic / sophisticated (Apple's own films here: 123), > 125 hype only when the brand is hype (the crypto reel at 161). Put this in the storyboard as a required field `music.bpm` + mood word.
- SFX sparing: UI-morph films can run music only. Default max 1 SFX per 2 s; a final pass drops any SFX that is louder than the music bed peak -6 dB or that does not mark a state change.

### 4.6 Apple composition rules for the storyboard validator
- One shot = one idea: one headline or one product action per shot, max ~8 words on screen.
- Key object centred (centre of mass within 10% of frame centre) unless a split layout is intended; >= 25% of frame area left empty (breathing space).
- Brand rules locked per film: max 3 colours (bg, fg, one accent) + neutrals, one type family, one background family, alternate dark and light worlds on purpose (Watch film: black product, white finishes).
- Transitions: default motivated (shared element, object match, push-through like the coin -> phone row); a hard cut must carry meaning (beat accent, world change).
- Eased overlapping motion only; the linear ease is banned except for scroll simulations and counters.

### 4.7 Pipeline (rexan workflow, adopt as eden-motion stages)
1. **Reference**: pick one real reference video (gallery such as What Ships, or the user's link); measure its beats and shot lengths first and map our beats onto the same timing.
2. **Brand context**: URL intake -> logo, colours (hex), fonts, 3 personality adjectives, 4 use cases, tagline (we already do most of this; add the adjectives and use cases as required fields).
3. **3 storyboard variants**, each one board per beat (layout, exact text, what moves, transition in/out), plus one continuous thread object across all boards (orange dot, one shape, hero token). **Stop for approval.**
4. **One still per scene** (render the HyperFrames composition at the beat's key frame, or a Nano Banana Pro frame for AI shots) and review stills before any full render.
5. **Director notes in camera words** per scene (push, truck, whip, rack focus, hold, match cut), feeding the scene props and camera track.
6. Build one composition per beat with shared tokens; components come from a real library (21st.dev style) rather than invented UI.
7. Design first (Leo): the storyboard frames are the keyframes; the render must match them 1:1 (split "layout vs result" review like Leo's Design video is a good QA view).

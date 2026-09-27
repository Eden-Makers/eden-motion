# Style DNA (measured from the reference films)

Sources: 4 Burnwe SaaS explainers (1Deploy, Foyr, EyeQ, Ramp), Google "Meet Gemini Omni", Google
"Welcome to the Gemini era", Lovable 2.0, Lovable "Design" + "Lovable x Google" (Anyway Studio).
Full forensic notes: `~/Dev/eden-motion/research/analysis/`.

## Story and pacing
| rule | value |
|---|---|
| Length | 50-80 s. 60 s default. |
| Words | ~150 per 60 s, 140-155 wpm (Burnwe 157 words / 65 s). |
| Beats | hook <= 9% of runtime, brand named by 16-38%, features 40-65%, one number proof 5-7%, tagline + brand + CTA last 10-12%. |
| Shot length | one VO clause per shot: 2.5-4 s. A new composition every 3.1-3.8 s (camera moves inside shots count). |
| Cuts | land on VO phrase ends, NOT on the beat grid. Only drops, stops and the logo lock to music. |
| Worlds | alternate dark (problem, question, under the hood) and light (product, proof, close) every 5-13 s. |
| Hero token | one recurring object (orb, avatar, logo puck) in hook, reveal, features and end card. |
| End card | 2-3 s hold, logo lands in the last 2-3 s of music, music ends 1-2 s before picture. |

## Motion
| move | params |
|---|---|
| Arrival (default) | focus pull: blur 12-20 px -> 0, scale 1.06 -> 1 (small icons 0.92 -> 1), opacity 0 -> 1, 0.3-0.5 s, `power3.out` / `expo.out`. |
| Exit | blur 0 -> 20 px + fade, ~0.25 s, `power2.in`. |
| Overshoot | none for layout and type (no `back.out` bounces). Exception: UI morphs ride springs with 3-5% overshoot (damping ratio ~0.70, 2.6 Hz, settle 0.45-0.55 s). |
| Camera | never still: 0.4-2%/s zoom and 15-60 px/s truck, linear, alternating direction per shot. Emphasis push 5-7%/s. |
| Lists | stagger 0.12-0.32 s. |
| Cursor | eased arcs 0.5-0.7 s `power2.inOut`, dwell 0.2 s, press = cursor 0.85 + target 0.96, click triggers a state change. |
| Counters | tick through the whole VO clause (3-4.5 s), never snap. |
| Transitions | motivated by an object (zoom into a numeral, click bloom, orb bloom, line the camera follows). Hard cuts get an exposure ramp (bg 35-40% off, settles in 0.4 s). Blur is the transition currency. Crossfades almost never. |
| Motion blur | gaussian defocus on arrivals everywhere; true shutter blur only matters on fast pushes, whips and zoom-throughs. The renderer does real 180 deg shutter blur on final renders. |

## Typography
- Burnwe: text is TYPED, ~17 chars/s, word onsets synced to VO; newest 3-6 characters in the accent ("hot tail"), cooling to base in ~0.4 s. One centred line that scales down as it grows (fits 60% of frame width). Cap height 8-9% of frame at start, ~4% when full. Medium weight geometric grotesk.
- Lovable: giant single words (2-3x scale) swapped every half beat; gradient-filled hero words; per-letter blur-rise.
- Google: calm, regular/medium weight, white on black, one blue keyword, word-accumulating centred headline.
- One accent colour used as a highlighter: newest text, one keyword, one button, one chart line.

## UI as a stage prop
White cards, radius 12-26 px, hairline border `rgba(0,0,0,.06)`, soft shadow (y 20-30, blur 40-60, 8-15% black), 2-4 depth layers with parallax, 3D tilt 20-40 deg on entry settling flat. Real product screenshots on a tilted plane with a slow push (1.0 -> 1.35 over 3-5 s) toward the next click target.

## Sound
- Music bed (tech house / chill-hop 107-120 BPM for SaaS; synth-pop 112 for launches), ducked under VO.
- Whoosh on every scene change and fast move (~1 per 3-4 s), click on every cursor press, quiet pops (-18 dB under VO) per staggered arrival, riser 1.5-3 s into the reveal resolving on an impact.
- The main dynamic device: music dips or drops out under the pivot question / the prompt, and returns on the answer / the result.

## Apple framework (Leo, "Make your product videos look expensive", 2026-09)
- Intention is everything: font, background, music and colour are each chosen on purpose. Give the brand
  hard rules (3 colours per video type, the same backgrounds, one music family) and keep them film to film.
- One shot = one idea. Every shot has room to breathe. The key object sits in the centre of the frame. The
  background never competes with it.
- Motion is eased and overlapping; linear motion reads cheap. Prefer motivated transitions over direct cuts
  unless the cut carries meaning. Rhythm adapts: faster in lists and montages, slower on reveal and proof.
- Music by mood: 60-80 BPM regal/cinematic/heritage, 90-110 smooth/cool/effortless, 115-123
  elite/kinetic/sophisticated, faster only for hype. Premium: no rap, no trailer cliches.
- Sound design with restraint: after the mix, remove every effect that is too loud, out of place, or does not
  help the viewer stay engaged or understand the product.

## Code-native UI motion (open prompt by @twoclipping, 2026-09)
- One shape never cuts: the same element morphs size, radius and colour through every UI state; content
  swaps with a short blur on its own enter/exit timing. A cursor drives every change with real clicks and drags.
- Springs everywhere, a tiny overshoot at most. Springs are closed-form step responses; a value retargeted
  many times is the sum of one response per change, so it stays a pure function of time (`EM.spring`).
- Two-edge springs for indicators and knobs: the leading edge stretches ahead of the trailing one.
- Drags are direct manipulation: value from cursor position while held, spring back on release.
- Morphs sit on a steady grid (0.25 s in the reference, not beat-locked to its 117.5 BPM track); UI sounds placed by their measured peak. Measured spring: damping ratio 0.70, 16.5 rad/s, 3-5% overshoot; content blurs out 0.07-0.10 s, new content in 0.08-0.13 s starting at the overshoot peak.
- Camera zooms so each state fills the frame. Loops: last frame identical to the first, cursor included.
- Never `will-change` on camera-scaled elements (blurry text). Render one still per beat before the full render.

## Keyframe-table films (open prompts by @notdwd and @twoclipping, 2026-09-27)
Two more "everything is code" launch films, both one continuous take, both banning crossfades, blur-ins,
glows on text and anything template-like. What transfers:
- **Direction is written in frames, not adjectives.** Every move is a table `kf(frame, [[f, v], ...], ease)`
  interpolating numbers or arrays (positions, sizes, colours). Write the storyboard the same way when a
  scene matters: "box x884 y635 709x112 eases to x570 y477 778x130, 90% there by f12".
- **Typed text settles colour:** each new character arrives in an accent, passes through a second hue and
  settles to ink over ~13 frames (`HL3.settleType` in the Hlas project is the reference implementation).
- **Charge before the payoff:** a solarised colour wash floods the frame, the object tilts back (rotateX
  up to 12 deg), selection handles fly to the frame corners, a glyph field appears at the edges, then the
  rest of the content bursts in at ~50 characters per frame.
- **Press = hard cut to a 3x macro of the button,** cursor swings in, squashes to 0.9 on the press, the
  button inflates 12% and flashes the brand colour, the container edge bulges under it. The zoom is a cut,
  never an animated zoom.
- **Container becomes the page:** the prompt box drops, goes grey then dark from the bottom while a cyan
  band sweeps down and wipes its text, then grows to full frame on a fast ease-out while every page element
  slides out from inside it on one shared progress curve (overflow hidden). Finish by pulling the page
  back onto a flat neutral ground.
- **Menu-bar origin** (Frame by Frame film): click the menu-bar icon, the prompt field drops out of the
  menu bar over a line-graphic wallpaper, the product lives where the user meets it.
- **Launch-film grammar (twoclipping v2):** every scene is made out of the previous one. Wordmark squeezes
  into its own period like an accordion (letters move toward the dot by one factor and narrow their wdth
  axis so they keep touching), the dot grows into a pill, six iris blades close and snap open onto a photo,
  a grid unfolds from behind a tile like a paper map, a black shape floods the frame and contracts into the
  next scene. Floods overscale past the corners and take ~0.3 s or half the screen changes in one frame.
- **Liquid glass without backdrop-filter(url()):** Chromium misreads displacement maps there, so each glass
  element holds its own clone of the scene behind it, filtered by an SVG feImage distance field through
  three feDisplacementMaps at slightly different scales (chromatic edge) plus a rim light. Goo = blur +
  alpha threshold, then composite the sharp source on top.
- **Gotchas they list:** measure text only after fonts load; a child with `visibility: visible` shows
  through a hidden parent (use `inherit`); text swapping inside a morphing shape needs its own mask;
  footage re-encoded all-intra (`-g 1`) seeks exactly.
- **QC they run:** one still per beat before the full render, then a scan for single-frame pops (frame
  difference spikes 3x their neighbours).

## Opus 5.5 motion wave, measured (19 viral films, 2026-09-28)
Cut detection over the films the "motion design studio" course collected:
- Two families. **One-take morph films** have zero cuts (twoclipping UI loop, MakerMap, TypingMind,
  hand-drawn shorts): one container changes state on a 120 BPM grid for 14-20 s. **Showreels and
  launch reels** cut every 1.5-2.7 s (the "résumé showreel" prompt on max/xhigh: ASL 1.5-2.2 s).
  Music videos run 1.0-1.4 s per shot. Pick the family on purpose; mixing them reads as indecision.
- Product reels that did numbers mix a clean sans with **one italic serif accent word** per line
  ("Posted when your audience is *awake*", "Sell *memberships*"), big number stacks ("11,294+
  creators / 400K+ posts / 5B+ impressions"), a mascot or presenter carrying the product, real UI.
- Light motion/UI films got about twice the median likes of dark ones in the dataset sample (104 vs
  50, 22 posts each; descriptive, not causal). Default dark is not automatically premium.
- The course's rule set, now in the storyboard prompt: banned AI tells (centered title on a gradient,
  everything fading in, corner labels and frame borders, glow on UI chrome, particle bursts), a new
  thing every 2-4 s, reads with held time, real product UI only.
- Spring roles (`EM.spring.PRESETS`): snappy for buttons, toggles and leading edges; default
  (critically damped) for cards, containers and camera; heavy for big type, 3D and logo lockups;
  playful (visible overshoot) only for mascots and stickers; ui is the measured 3-5% reference.
  Helpers: `EM.spring.indicator` (two-edge stretch), `swapAlpha` (text in a morphing box never
  overlaps), `loopT`.

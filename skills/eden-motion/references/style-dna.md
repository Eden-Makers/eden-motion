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
| Overshoot | none. No `back.out` bounces anywhere. |
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
- Something happens on every beat (120 BPM, measured grid); UI sounds placed by their measured peak.
- Camera zooms so each state fills the frame. Loops: last frame identical to the first, cursor included.
- Never `will-change` on camera-scaled elements (blurry text). Render one still per beat before the full render.

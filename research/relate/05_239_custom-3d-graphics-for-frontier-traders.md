# 05 - Custom 3D Graphics for Frontier Traders

## Meta
| Field | Value |
|---|---|
| Title | Custom 3D graphics for Frontier Traders - Relate post 239 |
| File | ref/05_239_custom-3d-graphics-for-frontier-traders.mp4 |
| Duration | 9.00 s |
| Resolution / fps | 1080x1080 (square), 24 fps |
| Audio | Yes. Same minimal electronic bed as 03/04. Strong onsets at 3.39, 4.50, 5.62, 6.73, 7.48, 8.48: metallic clinks/impacts land on or just before the 1.5 s cuts. |
| Frames | frames/05_239_custom-3d-graphics-for-frontier-traders/ |

## Structure
Six 3D vignettes, each exactly 1.50 s (36 frames), hard cuts at 1.5 / 3.0 / 4.5 / 6.0 / 7.5. Every shot is a chrome or brushed-metal object on a flat #ECECEC seamless, no text overlays.

## Shot list
| # | In-out | On screen | Camera + easing | Transition | Technique |
|---|---|---|---|---|---|
| 1 | 0.00-1.50 | Long thin chrome rods (with small end chamfers and a groove) dropping into frame one after another, 2 -> ~12 rods, crossing like pick-up sticks | Top-down 3/4 view, slow dolly out, ease-out. Rods fall with gravity, slight rotation | Hard cut | 3D (rigid body or keyed) |
| 2 | 1.50-3.00 | Three M8-style socket-cap screws (knurled heads, hex socket, full thread) tumbling slowly, settling into a loose "V/N" arrangement | Locked, objects rotate ~40 deg, ease-out | Hard cut | 3D |
| 3 | 3.00-4.50 | Two stacked brushed-steel cards flip from edge-on into a 3/4 hero angle. Front card: FT mark, "79,367", "First Trade / Nov 2023 / WSOL on Raydium", "Most Traded / RAY / 8,193 trades", "Favorite Trade / Raydium / 85,935 trades", thin divider lines | Card rotation ~70 deg, ease-out (expo), small overshoot | Hard cut | 3D, text as engraved/printed decal |
| 4 | 4.50-6.00 | Chrome machined block (cube, 2 large bores, 1 medium bore, 4-6 small tapped holes) tumbling | Object rotates ~120 deg on 2 axes, ease-in-out; slight motion blur | Hard cut | 3D |
| 5 | 6.00-7.50 | 10 socket-cap screws in a radial star (heads outward) spin around the center and collapse into a dense cluster, motion blur on heads | Spin accelerates, implode ease-in | Hard cut | 3D |
| 6 | 7.50-9.00 | Block sliding onto a long rod (rod enters from top right, block rotates to reveal bores, a smaller rod/pin with rounded tip passes through) | Orbit + push, ease-in-out | End | 3D |

## Typography
Only on the card (shot 3): Neue Haas / Helvetica Now style, numbers ~0.07 of frame height on the card face, labels tiny (~0.012 H). Free alternative: Inter Tight. Copy verbatim as above.

## Color palette (sampled)
| Role | Hex |
|---|---|
| Seamless bg | #EBEBEB / #ECECEC (73% of all pixels) |
| Chrome highlights | #DADADA, #CACACA, #B8B8B8 |
| Chrome mids | #A8A8A8, #929292, #797979 |
| Chrome darks | #5E5E5E, #454545, #212121 |
| Accent | none |

## 3D / materials / lighting
- Material: polished stainless/chrome, metallic 1.0, roughness 0.08-0.15 on rods and screws, slightly higher (0.2) and anisotropic on cards (brushed). Cards: fine brushed noise along long axis, text slightly darker and less rough.
- Light: soft studio HDRI (large white softboxes) giving long white reflection strips; environment reflects a light grey gradient, no visible floor, no contact shadows. Background is a flat emission/holdout #ECECEC, not part of reflections (reflections are a gradient studio).
- Camera: ~50-85 mm, no DOF, motion blur on fast spins (shot 5). No grain, no CA, no bloom.

## Signature techniques
- Industrial "hardware as brand" metaphor: engineering parts (rods, screws, blocks) as abstract assets for a trading brand.
- 1.5 s per shot, one object idea per shot, all objects share one material and one light rig.
- Collapsing radial array (shot 5) and rigid-body drop (shot 1) as the two motion "verbs".

## Recreation plan
| Shot | Tool | Difficulty | Notes |
|---|---|---|---|
| 1 rods drop | Blender rigid body (passive invisible floor), bake, render | 2 | |
| 2 screws | Blender: screw modifier thread + knurl displacement, keyed rotation | 2 | Model once, reuse |
| 3 cards | Blender: rounded rect, brushed metal shader, text from SVG/PNG as roughness+color decal | 3 | Text texture can be rendered from HyperFrames/HTML |
| 4 block | Blender: cube with boolean bores, bevel modifier | 2 | |
| 5 radial implode | Blender: array of screws, drivers for spin + radius collapse, motion blur | 2 | |
| 6 block on rod | Blender | 2 | |
| Edit | HyperFrames or ffmpeg concat, 1080x1080, music + clinks | 1 | |

- Assets: FT mark (redraw), Inter Tight, studio HDRI (Poly Haven, CC0), music + metal SFX.
- Effort: 8-12 h (modeling 3 h, shading/lighting 2 h, animation 3 h, render ~2 h at 1080x1080x216 frames Cycles).
- **1:1 feasibility without AI video: 10/10.** Ideal pilot: it builds the full asset kit for 03 and 04.

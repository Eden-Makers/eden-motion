# 12 - How we used AI to create 100+ branded icons for Jupiter

## Meta
| Field | Value |
|---|---|
| Title | "How we used AI to create 100+ branded icons for Jupiter..." - Relate post 226 |
| File | ref/12_226_how-we-used-ai-to-create-100-branded-ico.mp4 |
| Duration | 11.98 s |
| Resolution / fps | 848x848 (square), 60 fps |
| Audio | **No audio stream.** |
| Frames | frames/12_226_how-we-used-ai-to-create-100-branded-ico/ |

## Structure
A fast scroll-through screen recording of Relate's own X Article (dark mode): tweet card -> click -> article header image (icon collage) -> body text and inline images scrolled at speed -> reply box. It is a teaser for the article, but it documents Relate's AI pipeline and exact color specs.

## Shot list
| # | In-out | On screen | Camera | Transition | Technique |
|---|---|---|---|---|---|
| 1 | 0.00-1.30 | Black, X post card "Relate Studio @relate_studio" with article preview (icon collage, "How we used AI to create 100+ branded icons for Jupiter"), hand cursor clicks | Static, slight zoom on click | Fade/zoom into article | Screen recording |
| 2 | 1.30-2.80 | Article header collage (Bitwise puzzle piece, USD coin, key, Jupiter Lend tag, V8 tile, alarm clock, "100+ more") rising, title + metrics row | Scroll up, ease-out, fade in | Scroll | Screen rec |
| 3 | 2.80-11.30 | Fast scroll through body: intro, embedded promo video tweet, references collage, prompts in quote blocks, "specified vs guessed" comparisons (Jupiter Lend tag, alarm clock), shield + padlock renders, master prompt, closing paragraphs | Continuous scroll (eased per paragraph) | Scroll | Screen rec |
| 4 | 11.30-11.98 | Footer, "Post your reply" | Static | End | Screen rec |

## Key content from the article (paraphrased, for house-style research)
- Relate produces 20+ videos and 40+ static banners per month for Jupiter (stated in the article intro).
- They built a reusable prompt system for **Nano Banana 2** to generate on-brand 3D icons instead of modeling each in C4D.
- Look spec: dark matte anodized titanium body with micro-grain brushed surface, frosted glass inlay with an internal cyan-to-green glow gradient **#37E4C3 -> #C7F284** (later also **#00BEF0 -> #37E4C3 -> #C7F284**), soft subsurface glow kept inside, pure black background **#0A0A0A**, no floor, no shadow, slight dynamic tilt, "Cinema 4D / Redshift / Octane quality".
- Rules they learned: one job per reference image, exact HEX codes instead of words like "cool light", mutually exclusive descriptions when two objects share a frame, a growing avoid-list, and edit-in-place prompts for fixes.

## Typography
X UI (Chirp). Free alternative: **Inter** 400/700. Article title ~0.045H bold.

## Color palette (sampled)
| Role | Hex |
|---|---|
| X dark bg | #000000, #0A0C0E |
| Icon glow greens | #26665B, #368B75, #56B38A, #78E2A3, #36CD81 |
| Specified brand gradient (from article text) | #00BEF0, #37E4C3, #C7F284, bg #0A0A0A |

## 3D / materials / lighting
The icons shown are AI-generated stills imitating C4D/Redshift: matte dark titanium, frosted glass inlays with cyan-green internal glow, black void, rim highlights.

## Signature techniques
Relate openly mixes AI stills into the pipeline for asset volume, but locks look with exact HEX gradients and material language; motion work remains classic.

## Recreation plan
| Part | Tool | Difficulty |
|---|---|---|
| Article page + scroll | HTML replica + HyperFrames scroll | 1 |
| Icon images | Either reuse article images, generate with Nano Banana Pro using their spec, or model in Blender (titanium + frosted glass + emissive gradient) | 2-3 |

- Effort: 4-6 h.
- **1:1 feasibility without AI video: 9/10** for the video itself (no AI video); the icons are AI stills, reproducible in Blender with more time.

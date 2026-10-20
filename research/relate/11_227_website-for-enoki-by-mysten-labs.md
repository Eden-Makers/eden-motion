# 11 - Website for Enoki by Mysten Labs

## Meta
| Field | Value |
|---|---|
| Title | Website for Enoki by Mysten Labs - Relate post 227 |
| File | ref/11_227_website-for-enoki-by-mysten-labs.mp4 |
| Duration | 26.63 s |
| Resolution / fps | 1280x800, 30 fps |
| Audio | **No audio stream.** (Gemini claimed music - wrong; ffprobe shows video only.) |
| Frames | frames/11_227_website-for-enoki-by-mysten-labs/ |

## Structure
Website showcase built as a motion piece, not a plain scroll capture: a hero device object with a scrambling character field, a zoom-out to the hero section, macro push-ins on UI details (logo, "Launch Portal" button with hand cursor), and section-by-section reveals with depth blur, whip pans between full-page cards on a light grey stage #E4E4E8, alternating light and dark (#171423 with purple glow) sections.

## Shot list
| # | In-out | On screen | Camera + easing | Transition | Technique |
|---|---|---|---|---|---|
| 1 | 0.00-1.30 | Top-down rounded device/card (white bezel, dark screen) full of scrolling random alphanumerics (glyph scramble), a "?" shape hidden in the noise | Locked, slight push | Card flips (Y rotation) | 2.5D UI |
| 2 | 1.30-2.00 | Card flips to reveal login card: avatar "user", provider icons (Microsoft, Google, Apple, Twitch) | Y-flip with motion blur | Card spins edge-on, pull back | 2.5D |
| 3 | 2.00-3.90 | Pull back to full hero: nav (Enoki, Features, For Devs, Platform, Usecases, Pricing, Launch Portal), card "user@yourapp" with cycling provider icons, headline "Developer-centric blockchain infrastructure for Sui apps", body copy, purple CTA | Zoom out, ease-out; headline blur-in per word | Whip to macro | Website capture + camera |
| 4 | 3.90-5.70 | Macro on the nav pill: Enoki logo + wordmark with dotted halftone fade | Lateral track right, ease-in-out, shallow DOF | Continuous track | 2.5D |
| 5 | 5.70-7.30 | Track ends on "Launch Portal" button; hand cursor hovers, button turns purple, press | Settle, ease-out | Pull back blur | 2.5D |
| 6 | 7.30-9.00 | Stats grid "1000+ Apps built on Enoki", "70M+ Sponsored transactions", "500+" (counters 929+ -> 995+ -> 1000+, 68M+ -> 70M+, 494+ -> 500+), feature tiles "Password-free wallets / Powered by zkLogin", "Gas-free transactions / Seamless integration", "Built for enterprise scale / Built-in RPC support" | Blur-in, slight push | Scroll into dark | Website capture |
| 7 | 9.00-11.50 | Dark section "Built-in RPC is coming soon", "Developer-first tooling", "API keys for everything", code card on purple gradient, carousel slides | Scroll + push, ease-in-out | Scroll | Website capture |
| 8 | 11.50-14.80 | "Web3 freedom meets Web2 familiarity": bento cards "Usernames, not hashes" (giant "you@app" sliding), "No passwords or seed phrases", "No gas fees for your users", dark "Seal - robust encryption & onchain access control for sensitive data" | Scroll + per-card reveals | Scroll | Website capture |
| 9 | 14.80-15.80 | "Enoki in action" testimonials: "We sold $20M of NFTs in an otherwise down market.", "Our known audience grew by 25% in just 8 days." | Horizontal slide | Zoom into dark | Website capture |
| 10 | 15.80-18.80 | Dark purple: "Manage features, teams, and integrations without complexity" per-word blur-in, tabs "Manage your apps", "Onboard teammates", "Control your plans", dashboard (Quantum Forge, "Member invited" modal, "Enhanced Accounts $100") | Push in with heavy DOF blur, ease-out | Zoom out to light | Website capture + camera blur |
| 11 | 18.80-21.20 | Pricing "Start as you need to": Starter $69/month, Professional $120/month, Enterprise Custom | Push, then scroll | Whip pan | Website capture |
| 12 | 21.20-24.00 | "Enoki for games, powered by Parasol" with app icon carousel sliding | Whip pan in, carousel slides | Whip pan | Website capture |
| 13 | 24.00-26.63 | Dark CTA "Give your project a crypto boost", "Try for free", circuit graphic with Enoki chip and purple glow | Settle, slow pull back | End | Website capture |

## Typography
- Website font: geometric/neo-grotesk (close to **Inter** or **Manrope**). Free alternative: **Inter** 500 headlines with -2% tracking, 400 body.
- Sizes (frame height H=800): hero headline ~0.03H at full-page view; in macros up to ~0.09H ("Enoki", "Launch Portal").
- Animation: per-word blur-in on headlines, counters, glyph scramble on the device screen, giant "you@app" text sliding inside a card.
- Verbatim copy: see shot list (all copy is the client site).

## Color palette (sampled)
| Role | Hex |
|---|---|
| Stage grey | #E4E4E8 / #E3E3E7 |
| Page white | #F7F7F7, #F0F0F2 |
| Dark section | #171423 / #14121C |
| Enoki purple (CTA) | #784DF6 / #7958EF |
| Deep purple glow | #530390, #3B1C69 |

## 3D / materials / lighting
Fake 3D only: page cards on a grey stage with soft drop shadows, card flips with perspective, depth-of-field blur on push-ins (gaussian blur on non-focused layers), purple bloom glow in dark sections.

## Signature techniques
- Website treated as objects in a camera space (macro track on nav, button press with cursor).
- Alternating light/dark sections as rhythm; DOF blur as transition.
- Glyph-scramble hero object.

## Recreation plan
| Part | Tool | Difficulty | Notes |
|---|---|---|---|
| Page rebuild or full-page captures | HyperFrames (website-to-video style), DOM rebuild of sections | 3 | Needs the Enoki site or a rebuilt replica |
| Camera moves, DOF, whips, cursor | HyperFrames GSAP + CSS filters | 2 | |
| Glyph scramble device | HyperFrames | 2 | |

- Assets: Enoki logo, site screenshots/HTML, provider icons.
- Effort: 15-25 h.
- **1:1 feasibility without AI video: 8/10.**

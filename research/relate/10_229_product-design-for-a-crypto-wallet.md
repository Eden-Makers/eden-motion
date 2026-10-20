# 10 - Product Design for a crypto wallet (Sui wallet UI)

## Meta
| Field | Value |
|---|---|
| Title | Product Design for a crypto wallet - Relate post 229 |
| File | ref/10_229_product-design-for-a-crypto-wallet.mp4 |
| Duration | 14.93 s |
| Resolution / fps | 1280x960 (4:3), 30 fps |
| Audio | **No audio stream.** |
| Frames | frames/10_229_product-design-for-a-crypto-wallet/ |

## Structure
Flat app screens (no device frame, rounded 9:19.5 cards with white UI) on saturated ultramarine #2610E9. Pairs of screens slide in horizontally, then a single screen demonstrates a scroll/collapse interaction.

## Shot list
| # | In-out | On screen | Camera + easing | Transition | Technique |
|---|---|---|---|---|---|
| 1 | 0.00-0.85 | Two screens: wallet home "vacay", "$532.14", "+2.84% ($212.44)", buy / receive / send / swap tiles, tokens list (SUI 300 SUI $21523.99, USDC 10 USDC $9.99); swap screen "pay with USDC 9.64", "you receive SUI 3.54441", "continue" | Static | Horizontal slide left (~0.3 s, ease-in-out) | UI mockup animation |
| 2 | 0.85-3.65 | "history" (all / withdrawals / deposits / ETH tabs, today / last week list of ethereum, bitcoin, USDT txs) and pending tx detail "+512.22 USDT" with soft green radial glow, chain SUI, time "feb 29, 2024 16:25", "view in sui explorer", "view in sui vision" | Static | Slide | UI |
| 3 | 3.65-6.50 | Onboarding "make it yours" (grid of 16 iridescent gradient backgrounds, "select", "skip") and "almost ready..." (gradient wallet card, "wallet name", "proceed to the app") | Static | Slide | UI |
| 4 | 6.50-7.20 | Single screen "your wallet is ready!" with QR on iridescent card, "wallet for everyone", "proceed to the app" | Slide in | Dissolve/morph | UI |
| 5 | 7.20-14.93 | Home screen with chosen blue gradient header "$532.14"; user scrolls: header collapses, action tiles fade, token list expands (SUI, USDC, MOVE, FUD, XUI, USDT), then scrolls back | Real interaction timing (ease-out scroll physics) | End | UI prototype recording |

## Typography
- UI font: neo-grotesk with lowercase-only microcopy (Inter-like). Free alternative: **Inter** 400/500/600, balance ~0.035H in screen, labels ~0.01H.
- Verbatim: "vacay", "$532.14", "buy", "receive", "send", "swap", "tokens", "defi", "swap", "pay with", "you receive", "continue", "history", "all", "withdrawals", "deposits", "today", "last week", "+512.22 USDT", "Pending", "chain", "time", "transaction digest", "gas fee", "view in sui explorer", "view in sui vision", "make it yours", "select", "skip", "almost ready...", "proceed to the app", "your wallet is ready!", "wallet for everyone".

## Color palette (sampled)
| Role | Hex |
|---|---|
| Ultramarine bg | #2610E9 |
| UI white | #FAFAFA, #E8ECEF |
| Gradient header blues | #C2CFE7, #92ABEA, #6891E6, #545FE3, #1E46E6, #2189ED |
| Positive green | Tether green glow ~#26A17B |

## 3D / materials / lighting
None (soft glassy gradients only).

## Signature techniques
Saturated single-color stage + paired screens sliding as a carousel; one real interaction captured at the end.

## Recreation plan
| Part | Tool | Difficulty |
|---|---|---|
| Screens | HTML/CSS rebuild (or Figma exports) | 2 |
| Carousel + scroll interaction | HyperFrames GSAP | 2 |

- Effort: 6-10 h (mostly UI rebuild).
- **1:1 feasibility without AI video: 9/10.** Low motion-design ambition.

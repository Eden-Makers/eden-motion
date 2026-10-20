# 18 / post 214 - Branding & Website for Flipit (2 clips)

## Meta
- Files: `ref/18_214_branding-website-for-flipit_0.mp4` (2.77 s, 1920x1080, 60 fps), `ref/18_214_branding-website-for-flipit_1.mp4` (18.42 s, 1920x1072, 60 fps)
- Audio: none on either clip.
- Frames: `frames/18_214_branding-website-for-flipit_0/` (grid_00, hi_1.25, hi_2.4), `frames/18_214_branding-website-for-flipit_1/` (grid_00..01)
- Motion measured with phase correlation (clip _1).

## Shot list
| # | in-out | on screen | camera / motion + easing | transition | technique |
|---|---|---|---|---|---|
| _0.1 | 0.00-2.77 | Website hero in rounded white frame (radius ~1.2% width) over magenta satin/chrome folds bg. Nav "Flipit", "(1) Market Making", "(2) Venture Capital", "(3) For Devs"; headline "The Future of Coins"; sub "We're the most trusted place for people and businesses to buy, sell, and manage crypto"; "Start your portfolio & discover crypto"; gradient button "GET STARTED ↗". 12 glossy pink metallic coins enter from left in a smile-shaped arc (0.5-1.0), travel along it, each spinning on its own axis; by 2.0-2.7 the wave flips coins flat/facing and they swing up the right side, nearest coins large + defocused | Coins follow a path (follow-path, offset per coin ~0.06), ease-in-out, per-coin rotation phase offset creates a "domino wave"; frame static | Ends (loop post) | 3D render (coins) composited inside HTML hero |
| _1.1 | 0.00-2.95 | Dark green #0d2105 bg with faint world-map line art. White wide card "Our offices": "We have office in Portugal, UAE, Turkey, US, UK and Armenia", grid of city labels "London", "Lisbon", "Yerevan", "New York", "Izmir", "Dubai". A magenta-gradient hover card slides between city cells (London, UK -> Lisbon, Portugal) | Hover card moves cell to cell with expo.out ~0.5 s | Card resizes to tablet width (3.0, peak ~2400 px/s, settles by 4.0, expo.out) | HTML |
| _1.2 | 3.00-7.00 | Same section at tablet width, cities reflowed diagonally; hover card visits New York, US and Dubai, UAE | Same | Card resizes to mobile width (7.0, expo.out ~0.8 s) | HTML |
| _1.3 | 7.00-8.60 | Mobile width card | Hold | Whole layer slides out left (8.6, peak ~18000 px/s, settles 10.0) | HTML |
| _1.4 | 8.70-17.00 | Three phone screens side by side: "370+ Cases at launch" list (KuCoin, Walken, ...), "No KYC or AML checks: a New Era of Crypto Liberation" with portrait + pink 3D petals, "BTC ups & down Flipit is solid" chart "Venture ARM", "100+ team members", "V2 Platform Released", "Web3 Domination". Screens scroll internally (left screen alternates to magenta "Walken" case) | Internal scroll loops, power2.inOut | Slide out left (17.0) | HTML / UI |
| _1.5 | 17.00-18.42 | Back to desktop "Our offices" card | Slide in, expo.out | Loop | HTML |

## Typography
- Headline "The Future of Coins": neo-grotesk display regular (Helvetica Now Display / Neue Haas Display style), cap height ~12% of frame height, tracking about -4%. Free alt: Inter Tight 400 (-0.045em) or Geist 400.
- Nav: numbered labels in parentheses "(1)" above words, ~1.6% height, regular.
- Offices: ~1.8% headline, city labels ~1.1%.
- Phones: "370+" big numerals, grotesk.
- Verbatim: "Flipit", "(1) Market Making", "(2) Venture Capital", "(3) For Devs", "The Future of Coins", "We're the most trusted place for people and businesses to buy, sell, and manage crypto", "Start your portfolio & discover crypto", "GET STARTED ↗", "Our offices", "We have office in Portugal, UAE, Turkey, US, UK and Armenia", "London", "Lisbon", "Yerevan", "New York", "Izmir", "Dubai", "London, UK", "Lisbon, Portugal", "New York, US", "Dubai, UAE", "370+", "No KYC or AML checks: a New Era of Crypto Liberation", "BTC ups & down Flipit is solid", "100+ team members", "V2 Platform Released", "Web3 Domination".

## Color palette (sampled)
- Coins: #b44c97 mid, highlights #cc8bb7, shadows #7c286c
- Satin bg: light #d3b9c7, deep #63115a
- CTA gradient: #510d20 -> #c86bdc
- Dark green bg: #0d2105
- White card #fcfcfc, text #0a0a0a

## 3D / materials / lighting
- Coins: pink anodized metal (metallic 1, roughness 0.25, base #c25aa5), bevelled rim, soft white studio light, environment reflection of white; near coins get heavy DOF blur (f/1.8 equivalent) giving a premium "macro" feel.
- Bg satin folds: cloth-like chrome ribbons, static or very slow.

## Signature techniques
- 3D object choreography living inside a website hero (coins as the brand idea "flip it").
- Responsive breakpoint demo as an animation (desktop -> tablet -> mobile) with expo.out resize.
- Rounded inset frame on brand bg.

## Recreation plan
| Part | Tool | Difficulty | Assets |
|---|---|---|---|
| Coin arc (_0) | Blender (coins on curve, array + follow path, rotation driver by offset), render with alpha | 2 | Coin mesh, pink metal shader |
| Hero UI + satin bg | HyperFrames; satin bg as Blender still or cloth render | 2 | Font, logo |
| Offices + phones (_1) | HyperFrames | 2 | UI layouts, portrait photo (needs asset), map line art |

- 1:1 feasibility WITHOUT AI video: **8/10** (portrait photo in phone screen is the only external asset).

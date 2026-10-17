# 21 / post 202 - Website for Neuron

## Meta
- File: `ref/21_202_website-for-neuron.mp4`
- Duration: 24.08 s
- Resolution: 2394x1440 (5:3), 30 fps
- Audio: track present but digital silence (-180 dB). Treat as silent.
- Frames: `frames/21_202_website-for-neuron/` (grid_00..02, hi_0.3, hi_3.0, hi_9.0, hi_15.0)
- Scroll motion measured with phase correlation (px/s at source res).

## Shot list (one continuous screen capture-style take, no hard cuts)
| # | in-out | on screen | camera / motion + easing | transition | technique |
|---|---|---|---|---|---|
| 1 | 0.00-4.30 | Hero: nav "Neuron" logo, "About", "4DSKY", "News", "Contact us", "Join Discord", "Go to Explorer". Headline "Enabling machine to machine commerce", sub "An edge-network infrastructure, enabling secure machine-to-machine communication & settlement", buttons "Access App", "Read Docs". Full-bleed 3D bg: dark glass/chrome "city" of machine blocks (concentric-ring pad, capsule device, fan array, display panel with digits) | 3D bg powers up 0-2 s (emissive strips and fans fade from dark to bright blue-white, staggered), digit panel randomizes ~every 0.25 s, very slow camera drift (dolly ~2% frame / 4 s) | Section card slides up | HTML + 3D render bg |
| 2 | 4.30-7.40 | White inset card (margins ~10% each side) slides up over the hero (peak ~2000 px/s, settles over ~1.2 s, expo.out): "We help developers directly access machine resources enabling them to build higher-performance", stats "$3.3M+ Of projects won", "32M+ Network transactions", "14+ Enterprise app integrations", "12TB Of data transferred", "Backed by" logos | Card y from +100% to 0, expo.out ~1.0 s; small secondary settle at 5.8 s; bg keeps living behind | Next card slides up from bottom (7.4) | HTML |
| 3 | 7.40-13.40 | White card: horizontal word carousel "AI Agents  Compute  Robots  Sensors" (active word black, neighbors fading to ~15% grey both sides), center icon tile (white rounded square with 3D device render that changes per word), right text "The Universal Gateway to Machine Resources" + paragraph | Carousel steps every ~1.25 s (8.0, 9.3, 10.5, 11.8, 13.0), slide ~1 word width, power3.inOut ~0.6 s; icon cross-fades with slight rotation | Dark card slides up (13.4, expo.out 1.2 s) | HTML + small 3D icon renders |
| 4 | 13.40-20.00 | Dark navy card: "Neuron gateway" vs faded "Cloud networks" comparison table (Optimized Performance, Reduced costs, Minimize risks, More control), paragraph left, image card "Integrate machines" with blue streak render and "Read more" button | Static hold ~6 s, bg drifts | Fast reverse scroll (20.0-22.5): cards drop down, peak ~2900 px/s, long ease-out to 23.5 | HTML |
| 5 | 20.00-24.08 | Back to the hero (loop point), bg now darker (lights dimmed again) | Ease-out settle | Seamless loop to 0.00 | HTML + 3D |

## Typography
- Headline: neo-grotesk (Neue Haas / Aeonik style) regular 400, cap height ~10.4% of frame height, 2 lines, line height ~0.95, tracking about -4%. Free alt: Inter Tight 400, letter-spacing -0.04em.
- Card headline: same family ~4.5% frame height, tracking -3%.
- Carousel words: same, ~5% height; inactive opacity ramp 1.0 -> 0.35 -> 0.12.
- Stats: "$3.3M+" with grey "$", ~5% height; labels tiny ~1%.
- Nav + buttons: same family 500, ~1.6% height; pill buttons white with black text and arrow-circle icon.
- Verbatim: "Neuron", "About", "4DSKY", "News", "Contact us", "Join Discord", "Go to Explorer", "Enabling machine to machine commerce", "An edge-network infrastructure, enabling secure machine-to-machine communication & settlement", "Access App", "Read Docs", "We help developers directly access machine resources enabling them to build higher-performance", "$3.3M+", "Of projects won", "32M+", "Network transactions", "14+", "Enterprise app integrations", "12TB", "Of data transferred", "AI Agents", "Compute", "Robots", "Sensors", "The Universal Gateway to Machine Resources", "Neuron is an edge-network infrastructure that facilitates trusted, peer-to-peer communication and value exchange between machines, enabling a range of applications", "Neuron gateway", "Cloud networks", "Integrate machines", "Read more".

## Color palette (sampled)
- Hero bg near-black: #010509, #0b161f
- Steel blues: #182a3e, #2f435a, #305988, #4275ae
- Emissive glow: #c6e0f5
- Deep shadow: #020c0e
- Card white: #f6f6f6, text #0b0b0b, muted grey #8da0af
- Dark card: #0b0f1a

## 3D / materials / lighting
- Bg scene: brushed/polished blue-steel and clear glass blocks laid out like a circuit board, emissive light strips between tiles, fan arrays with lit rings, a display panel with randomizing white digits (rotated in perspective).
- Lighting: cool 7000K, emissive-driven, rim highlights on glass edges, strong bloom on strips.
- Camera: ~35 mm, 40 deg downward angle, very slow drift; DOF slight at far edges.
- Power-up animation: emission strength 0 -> 1 with per-element delay (0-2 s).

## Signature techniques
- Live 3D render as website hero, persisting behind inset cards (cards never fully cover it).
- Section transitions as cards sliding up with expo.out, ~1 s, no fades.
- Word carousel with opacity falloff on neighbors.
- Seamless loop: scroll back to top at the end.

## Recreation plan
| Shot | Tool | Difficulty | Assets |
|---|---|---|---|
| 3D bg (all) | Blender (Eevee or Cycles), 24 s loopable plate, separate emission pass for power-up | 3 | Kitbash blocks: ring pad (array of bevelled rounded squares), capsule, fans, glass prisms, digit panel (text object driven by frame) |
| UI layer | HyperFrames (HTML/CSS + GSAP) | 2 | Inter Tight, logos, 4 small icon renders from Blender |
| Card slides, carousel, reverse scroll | HyperFrames GSAP (expo.out 1.0-1.2 s) | 1 | |

- 1:1 feasibility WITHOUT AI video: **8/10**. Only effort is a convincing glass/steel kitbash scene.

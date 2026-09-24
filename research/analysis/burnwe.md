# Burnwe motion style - forensic breakdown

Source: 4 Burnwe SaaS explainers (all 1920x1080, 25 fps). Method: ffmpeg scene detection (threshold 0.25 for hard cuts, 0.08 for soft scene changes), 0.5 s contact sheets, per-frame bursts around 20 transitions, ORB feature tracking for measured camera drift (scale and px per second), k-means palette sampling, librosa beat/onset analysis, Gemini 2.5 Pro for timecoded breakdown and VO transcript. Gemini output was cross-checked against frames. Where it disagreed with the frames, the frames win (noted inline).

Reference images: `sheets/` next to this file.
- `<id>_sheetN.jpg` - 6x5 contact sheets, 0.5 s per tile, timestamp in the corner.
- `<id>_burst_<t>.jpg` - 18 consecutive frames (40 ms apart) starting 0.28 s before a transition.
- `<id>_text_<name>.jpg` - 16 consecutive frames, cropped on a text reveal.

| id | product | length | hard cuts | shots | ASL (hard cuts) | scene segments | ASL (segments) | VO words | VO wpm |
|---|---|---|---|---|---|---|---|---|---|
| QTIOUAiPFkI | 1Deploy (AI ops) | 68.2 s | 12 | 13 | 5.2 s | 22 | 3.1 s | 157 | 144 |
| hjPal2l3SbA | Foyr (interior AI agent) | 64.3 s | 9 | 10 | 6.4 s | 21 | 3.1 s | 158 | 155 |
| Pj_8HB3S6VQ | EyeQ Retouching 2.0 | 58.1 s | 13 | 14 | 4.2 s | 18 | 3.2 s | 0 (no VO, ~95 on-screen words = 98 wpm reading) | - |
| TaFObXdED08 | Ramp accounting | 71.6 s | 6 | 7 | 10.2 s | 19 | 3.8 s | 157 | 139 |

Key number: the hard-cut ASL is misleading (4-10 s). The real visual change rate is one new composition every **3.1-3.8 s**, because most scene changes happen inside a continuous camera move, a luminance crossfade, or an element that becomes the next scene. Every VO script is almost exactly **157 words for 60-70 s**.

---

## 1. Per-video breakdown

### 1.1 1Deploy - QTIOUAiPFkI (68.2 s)

**Palette (sampled)**
- Dark world: bg `#0c0a12` (29% of all pixels), mid navy-violet `#1e1637`, glow violet `#4921cf` / `#5f43a9`, dusty plum `#422668`.
- Light world: bg `#f0eef1`, lavender haze `#e2d9e9`, pink-violet vignette edges `#c1a2bc`.
- Brand gradient (logo, text tail, orb, charts): `#4921cf` -> `#983bc6` -> `#cd4882`. Secondary periwinkle `#7173d8`, teal task highlight around `#37d5d0`.
- Duotone map for all photos: shadows `#4921cf` blue-violet, highlights `#ff3b6b`-ish hot pink/red.

**Typography**: Manrope-like geometric grotesk, SemiBold, Title Case On Every Word. Single centered line. Short phrase cap height about 9% of frame (about 95 px); full sentence settles at about 4.5% (about 48 px) because the line zooms out as it grows (move M2). Keywords stay tinted after settling ("Days", "Not Quarters" in `#5638af`).

**Shot list**

| t_in | t_out | dur | visual | motion | transition out | VO |
|---|---|---|---|---|---|---|
| 0.00 | 3.04 | 3.0 | Glass orb with "AI" glyph + sparkle, starfield, pills "We Need AI" / "Let's Adopt" pop under it, 2 outlined cursor arrows drift | slow pull-back, scale -2 to -5%/s, drift +26 to +56 px/s | hard match-scale cut to 4x crop of the same orb (Gemini said zoom-through; frames show a hard cut) | Every company is rushing to adopt AI. |
| 3.04 | 6.00 | 3.0 | Extreme crop of orb top + "AI" letters; card "Boards demand it" then "CEOs want a plan", photos duotone -> color | truck left about 42 px/s, cards enter with focus-pull | soft: cards leave, text scene | Boards demand it. CEOs want a plan. |
| 6.00 | 8.00 | 2.0 | Dark, "Companies Do" -> "...What They've Always Done", outlined arrow below | line zooms out as words are added; arrow outline color-sweeps white -> brand gradient | hard cut + exposure ramp dark -> light, new cards start defocused | So companies do what they've always done. |
| 8.00 | 11.64 | 3.6 | Light 3D card cloud: Hire consultants, Advisors, Workshops, Files, Strategy Deck "integrating AI", app icons | 3D truck left **450-490 px/s** + push **+4 to +5%/s**, strong parallax | hard cut to wide | Hire consultants, run workshops, build strategy decks, |
| 11.64 | 13.44 | 1.8 | Wide: all cards on a 3D helix, blurred pink "?" condenses in the middle | pull-back reveal, +3.6%/s | "?" defocuses and turns violet, hard cut to dark | all to answer one question. |
| 13.44 | 16.68 | 3.2 | Dark, "Where" (pink -> white), CEO card duotone -> color, "AI / Will / Drive / The most ROI?" around card, violet bars | push +7%/s | soft cut | Where will AI drive the most ROI? |
| 16.68 | 18.00 | 1.3 | Dark card "Six Months Later", month names (June, July, September, October) float in 3D around it | push | soft cut | Six months later, |
| 18.00 | 21.16 | 3.2 | Roadmap gantt (violet/pink bars) + flat ROI line, cursor | push +6%/s | soft | they have a roadmap, but still nothing running in production. |
| 21.16 | 23.36 | 2.2 | Dark, "The Real Problem" -> "Isn't The AI" | static-ish, -1.5%/s | orb rises into frame from below the text | Because the real problem isn't the AI, |
| 23.36 | 26.16 | 2.8 | Orb center, pills "Where it will" / "actually work?", starfield | -1.9%/s pull | **orb bloom white-out**: 6 frames of magenta/red edge flash, orb goes white, cut to white | it's knowing where it will actually work. |
| 26.16 | 28.50 | 2.3 | White + pink/violet vignette; logo arc strokes on, second stroke, fill; "1Deploy" types on | static | logo shrinks into a pill, world builds around it | That's where 1Deploy comes in. |
| 28.50 | 33.40 | 4.9 | Logo pill center, constellation of tool icons (Trello, AWS, Slack, Teams), avatars with role labels, "Observes How Work Happens" | slow pull -0.4 to -0.75%/s | hard cut | 1Deploy observes how work actually happens in your organization |
| 33.40 | 35.68 | 2.3 | Three tall cards "Teams / Tools / Workflows", duotone -> color, enter one by one L -> R | pull -5%/s | hard cut to dark | across teams, tools, and workflows, |
| 35.68 | 38.00 | 2.3 | Dark "Zero Integrations Required" | static; violet light leak sweeps in from right edge | leak becomes next scene | with zero integrations required. |
| 38.00 | 43.44 | 5.4 | Dark gantt of violet task pills, orb logo in the middle, some pills turn teal | camera cranes up **38-62 px/s** | hard cut to light | In days, it learns how tasks move, how decisions are made, and where time is lost. |
| 43.44 | 47.50 | 4.1 | Light, dark "Identifying" card with pink bar chart, orb, flow nodes (Teams, Jira, Slack) wired with lines | push +1 to +2.8%/s | push into button | Then identifies the highest value opportunities for AI. |
| 47.50 | 48.76 | 1.3 | Close on "Deploy Agents" button, cursor clicks | fast push | hard cut | 1Deploy learns your workflows |
| 48.76 | 52.68 | 3.9 | Dark gantt, glowing agent puck travels, touched tasks get diagonal stripes + glow | crane up 41-53 px/s | hard cut | and deploys AI agents to automate them |
| 52.68 | 55.20 | 2.5 | Dark "Full Visibility" -> "& Control" | violet leak sweeps in from right in last 6 frames | hard cut | with full visibility and control. |
| 55.20 | 60.28 | 5.1 | Split: left duotone photo "Everyone Else", right white panel "Your Company", ROI counter +47% -> +85%, gradient line with logo puck | divider slides left about 15 px/frame for 6 frames then settles | right panel takes the frame | While everyone else is still planning an AI strategy, your company is already running on it. |
| 60.28 | 64.00 | 3.7 | Light, "Know Where" -> "Deploy AI In Days, Not Quarters" | static | text clears, logo draws | Know where to deploy AI in days, not quarters. |
| 64.00 | 68.15 | 4.2 | Logo stroke-draw, fill, wordmark, "1deploy.ai" | static | end | With 1Deploy. |

**Structure**: hook 0-3 (4%) / problem 3-8 (7%) / agitation 8-21.2 (19%) / reframe 21.2-26.2 (7%) / reveal 26.2-28.5 (3%) / features 28.5-55.2 (39%) / proof 55.2-60.3 (7%) / CTA + logo 60.3-68.2 (12%). Product name first said at **38%** of runtime.

**Rhythm**: dark and light worlds alternate: dark 0-8, light 8-13.4, dark 13.4-26.2, light 26.2-35.7, dark 35.7-43.4, light 43.4-48.8, dark 48.8-55.2, light 55.2-end. Problem lives in dark, product lives in light; the product returns to dark only for "under the hood" gantt views.

---

### 1.2 Foyr - hjPal2l3SbA (64.3 s)

**Palette (sampled)**
- bg near white `#fbfafb` (48%), warm paper `#ece9e4`, `#dddad1`, window-shadow blue-gray `#999d9d`, charcoal `#362c2c`.
- Brand orange `#e3671e`, soft orange `#e58d4c`, highlight yellow-amber `#f5b748`, dark tail brown `#6b3820`.
- Accent teal/green in gantt `#49c9a3`, violet gantt `#8a6cf0`-ish.
- Dark interlude (53.6-57.4): charcoal `#2a2c30` with orange glow bottom-center.

**Typography**: Poppins SemiBold for headlines, Poppins Regular/Medium in UI. Title Case. Two-line lockups: line 1 near black `#111`, line 2 brand orange ("World's First / AI Super-Agent"). Cap height about 7.5% of frame for 2-word phrase, about 3.3% once the full sentence is on.

**Background**: warm off-white with a soft diagonal window-light gobo (blue-gray shadow shafts at about 35 deg, blur about 60 px, opacity 25-40%) that slowly drifts. 1Deploy uses a starfield; Foyr uses daylight.

**Shot list**

| t_in | t_out | dur | visual | motion | transition out | VO |
|---|---|---|---|---|---|---|
| 0.00 | 3.00 | 3.0 | Faint grid bg; interior photo card + cursor; card shrinks to an inline "image word" between "Every" and "Project", then collapses to 0 width, words close up; line zooms out; "Has a Chokepoint" types orange -> black | card scale 1 -> 0.45 over 10 frames, line scale 1 -> 0.55 | soft | Every project has a choke point. |
| 3.00 | 7.72 | 4.7 | Client signature card (orange tag) + material list; statuses flip "In progress" -> orange "On Hold"; photo panel "Your Crew Waiting" | crane up 74 px/s | hard cut | A missing client sign off that delays material sourcing and leads your crew waiting on site. |
| 7.72 | 10.00 | 2.3 | Calendar "Deadline May 15" on gobo bg; week rows turn orange one per beat; agent avatar enters bottom-right | crane up 34 px/s | **blur-out**: calendar blurs 0 -> about 20 px over 6 frames while fading | Holding up your install schedule. |
| 10.00 | 13.48 | 3.5 | "World's First / AI Super-Agent" types, avatar right; orange diamond -> ".foyr manage" slides in, lockup reflows left with divider | pull -0.3%/s | cut | Introducing the world's first AI super-agent by Foyr, |
| 13.48 | 16.20 | 2.7 | Blurred living room photo bg; white chat UI card with avatars; "Built For Interior Design & Construction Teams" types | static | hard cut | built for interior design and construction teams. |
| 16.20 | 18.40 | 2.2 | White; avatar center, faint concentric rings, app icons (Gmail, Docs, Sheets, WhatsApp, QuickBooks, Excel, Slack) pop onto rings; "One Agent Multiple Roles" | push +5.3%/s | hard cut | One agent, multiple roles. |
| 18.40 | 19.36 | 1.0 | Storefront "Living Space" with agent chat popup | static | hard cut | Capture new leads |
| 19.36 | 22.36 | 3.0 | Leads table, agent chat card, new rows appear | truck left 42 px/s | soft | automatically, no manual entry, no missed opportunities. |
| 22.36 | 23.00 | 0.6 | Black pills "Manual" / "Ai+", cursor clicks Ai+ | static | **click bloom flood**: orange glow ring blooms off the pill, bg floods with blurred orange blocks (preview of next UI) | (beat) |
| 23.00 | 26.96 | 4.0 | Dashboard + "Interior Design Project Brief"; yellow highlight bars sweep across fields; "Project brief" file chip flies into Documents list | static | soft | Collect client preferences, budgets, timelines and site details without long calls. |
| 26.96 | 30.52 | 3.6 | Orange chat bubbles on gobo bg; doc cards (BOQ, Design agreement, Asset Inventory) fan out in 3D around chat | push +1.9%/s | soft | Turn conversations into clear project scopes and procurement plans. |
| 30.52 | 36.00 | 5.5 | "Project Schedule" table; rows blur-in with stagger; camera slides to right columns | truck + push | hard cut | Build task lists and timelines in seconds, mapping dependencies across teams, vendors, and installs. |
| 36.00 | 39.00 | 3.0 | Chat card on gobo bg: agent sends PDF proposal, client approves, PDF invoice | push +3.5%/s, crane up | soft | Generate client-ready quotes and invoices in minutes. |
| 39.00 | 42.80 | 3.8 | Avatar left + big label (Track Approvals / Messages / Payments / Key Decisions); sidebar nav scrolls vertically, orange active item | nav column scrolls about 400 px/s | soft | Track approvals, messages, payments, and key decisions |
| 42.80 | 44.76 | 2.0 | Dashboard with role tags ("Project Lead", "Design Manager") on collaborative cursors | static | hard cut | in one place, so everything is easy to find. |
| 44.76 | 48.56 | 3.8 | "The Result?" (orange ?) -> "Sign the contract" modal, signature draws, click -> "Congratulations" check | drift | hard cut | The result? Sign-offs move forward without constant follow-ups. |
| 48.56 | 51.64 | 3.1 | Project schedule in 3D tilt (rotateY about -20 deg), checkboxes tick amber in sequence, rows glow | truck right 32-56 px/s | hard cut | Installs stay on schedule across teams and sites. |
| 51.64 | 53.60 | 2.0 | Frosted gantt over blurred interior, avatar puck | push +1.9%/s | hard cut to dark | Every detail stays organized. |
| 53.60 | 57.44 | 3.8 | Charcoal bg, orange floor glow; flowchart nodes (Design -> Designing floor plan -> Ceiling Design check -> Execution -> Floor Landscaping -> Fall Ceiling check) | camera follows the elbow line down and right, **258-414 px/s** | soft to light | AI handles the project admin, while you stay in full control. |
| 57.44 | 60.56 | 3.1 | Avatar center, defocused task cards floating around at 3 depths | push +1.4%/s | soft | Your projects move forward even when you're not chasing them. |
| 60.56 | 64.30 | 3.7 | End card: avatar + orange diamond rotates 45 -> 0 to a square, becomes the "." of ".foyr manage"; orange button "Book Your Demo Today" | pull -6.9%/s then hold | end | Book your demo today. |

**Structure**: hook + problem 0-3 (5%) / agitation 3-10 (11%) / reveal 10-16.2 (10%, product named at **16%**) / features 16.2-44.8 (44%) / result + proof 44.8-57.4 (20%) / CTA 57.4-64.3 (11%).

---

### 1.3 EyeQ Retouching 2.0 - Pj_8HB3S6VQ (58.1 s, no VO)

**Palette (sampled)**
- bg `#0b1418` (36%), deep teal `#182c2c`, mid teal `#166162`, `#308f93`, neon mint accent `#4ef2d1` / `#3af0c2`.
- Warm photo tones `#da8a2c` orange, skin `#b19a85`, `#866b57`.
- Duotone map for photos: magenta `#c43ad0` + cyan, or green-yellow `#9ccf3a` on first appearance, then natural color.

**Typography**: Poppins Regular/Medium, sentence case, white, centered or left-set inside a colored block. Cap height 3-4% of frame. Giant numerals ("25", "14") in a heavy geometric sans at 45-60% of frame height, filled with a mint -> white vertical gradient or masked photos.

**No voice-over**: the typewriter text IS the narration (about 95 words). Music carries energy (full beat from frame 0).

**Shot list**

| t_in | t_out | dur | visual | motion | transition out | on-screen text |
|---|---|---|---|---|---|---|
| 0.00 | 3.60 | 3.6 | 3D grid of square portraits at 3 depths (duotone magenta/cyan/orange), tiny floating squares | pull-out -0.6 to -7%/s | portraits blur + fade over 6 frames | Millions of photos / one chance / to get them out fast |
| 3.60 | 7.92 | 4.3 | Collage: solid color blocks pop first, then photos fill them (green duotone -> natural orange); big male portrait, face crops with warning triangles; text in orange block | push +2.5%/s | hard cut | Retouching that looks / Retouched? / No longer good enough |
| 7.92 | 9.92 | 2.0 | Giant "25", photo-masked, then fills mint gradient; micro-labels ("Engineering the future", "Delivering quality") | static | soft cut | Years of imaging innovation |
| 9.92 | 11.52 | 1.6 | Giant "14" with photo cards around | -3%/s | **numeral zoom-through**: "14" scales about 1 -> 6 in 12 frames, next shot visible in the gap between 1 and 4 | 14 Years ago |
| 11.52 | 15.56 | 4.0 | Inside the "14": portrait with detection squares + retouch panel | push +1%/s | hard cut | First to launch automated retouching |
| 15.56 | 18.20 | 2.6 | Horizontal mint light streaks, left -> right, at 3 speeds | streak field only | continuous | Now it's time for / next generation |
| 18.20 | 21.40 | 3.2 | "Introducing" + a line that draws into a bracket -> "Retouching 1.0" -> "2.0" in a mint gradient box; frame lines extend to frame edges | truck +84 px/s | hard cut | Introducing / Retouching 2.0 |
| 21.40 | 25.56 | 4.2 | UI panel on black, tilts up from rotateX about 35 deg to 0 while scaling 0.55 -> 1 over 14 frames; mint before/after scan line sweeps the face | then +0.2%/s | soft | ...masking the beauty, keeping it real |
| 25.56 | 28.12 | 2.6 | Big face + crops (eye, mouth), stat bars Retouch 2.0 94-95% vs 1.0 56-63%, counters | pull -1.2%/s | hard cut | 95% higher detection accuracy |
| 28.12 | 29.84 | 1.7 | Monitor on desk (teal), UI cards fly out around it | push | hard cut | 8 powerful retouching tools |
| 29.84 | 36.12 | 6.3 | Floating UI cards montage (Perfect Face, AI Blemish Removal, Skin Tone, Depth & Volume), cards slide into a 3D collage | trucking, one fast slide about 215 px/s at 34 s | hard cut | (UI labels) |
| 36.12 | 39.88 | 3.8 | Stock: hands typing, then a vertical split wipe reveals a developer clip; teal grade | truck left 126 px/s | hard cut | 18 months of development / to get it right / 15 development years |
| 39.88 | 42.84 | 3.0 | Dark teal gradient with floating code fragments | static | hard cut | Smart algorithms / Real intelligence |
| 42.84 | 44.80 | 2.0 | Stock: developer at iMac | -2.5%/s | hard cut | Built by our imaging experts with over |
| 44.80 | 46.64 | 1.8 | Split portraits with small dark UI panels | truck | hard cut | 500 years of experience |
| 46.64 | 51.44 | 4.8 | Monitor close-up; icon chips "Available on Cloud", "Deploy On-Premise", double chevron | truck 19-57 px/s | hard cut | Incredibly robust / Simply real / built to scale for faster delivery |
| 51.44 | 54.72 | 3.3 | Billboard "FUTURISTIKA" + photo card; counter 62.6% -> 77.8% with sparkline | static | hard cut | higher revenue |
| 54.72 | 58.14 | 3.4 | Endcard: line draws into bracket, "Retouching 1.0" -> "2.0" | static | end | Retouching 2.0 |

**Structure**: hook 0-3.6 (6%) / problem 3.6-7.9 (7%) / heritage 7.9-15.6 (13%) / reveal 15.6-21.4 (10%, named at **31%**) / features 21.4-36.1 (25%) / credibility 36.1-51.4 (26%) / proof 51.4-54.7 (6%) / logo 54.7-58.1 (6%).

---

### 1.4 Ramp - TaFObXdED08 (71.6 s)

**Palette (sampled)**
- bg light gray `#ebebeb` (43%), card white `#fbfbfb`, taupe `#dedcd7` / `#d0cec9`, secondary text taupe `#bdb5a6`, near black `#111`.
- Brand lime `#dcf92a` (hot) and `#e1f85f`, olive shadow `#829c31` / `#616e29`.
- Dark interludes: forest `#1e3028` ("What if"), charcoal `#3d3e3b` (Ramp Intelligence intro), dark olive gradient (8x Faster).

**Typography**: TWK Lausanne-like neo-grotesk (Ramp brand font; Inter Tight is a free stand-in). Regular/Medium. Primary black, secondary taupe `#bdb5a6`. Large statements set left-aligned under the wordmark ("Ultimate finance / Automation platform"), 2 lines, cap height about 5%. The only centered statements are the dark-bg questions.

**Shot list**

| t_in | t_out | dur | visual | motion | transition out | VO |
|---|---|---|---|---|---|---|
| 0.00 | 5.80 | 5.8 | Floating white cards on gray: Balance 483K, Invoices/Statements/Tax records with a lime folder, compliance checklist, bank statements, email, budget; big word inside card "Complicated" -> "manual" -> "draining" | crane down **228 px/s** easing to about 15 px/s, cursor clicks folder | continuous | Accounting can be complicated, manual, and draining. |
| 5.80 | 9.00 | 3.2 | Sheets-style "Cash Flow Statement", cursor with green "Accountant" name tag | truck left 58 px/s | continuous | We all know what it's like to be frustrated by too many spreadsheets and pivot tables, |
| 9.00 | 13.96 | 5.0 | "Transactions" panel over sheet; panels swing into 3D (rotateY about 30-40 deg) | truck left 118-221 px/s, push +2.3%/s | **iris wipe**: forest-green circle grows from the left edge, covers frame in 6 frames | or sorting through incomplete transaction data to just close month-end books as fast as you can. |
| 13.96 | 16.40 | 2.4 | Forest green, "What if there's smarter approach?" types white, line scrolls left like a ticker | static | **luminance crossfade**: bg goes forest -> light gray over 8 frames with soft white bokeh blobs | What if there's a smarter approach? |
| 16.40 | 20.00 | 3.6 | "ramp" types char by char gray -> black, mark wipes on; lockup moves up-left; Ramp Card UI slides in from right; "Ultimate finance / Automation platform" types taupe | truck left 58 px/s | continuous | Meet Ramp, the ultimate finance automation platform |
| 20.00 | 24.00 | 4.0 | Horizontal hairline with line-icon nodes in circles: "Simplifying / Spend management", "Eliminating / Prone-to-error tasks" | truck along the line 59-80 px/s | continuous | that simplifies spend management and eliminates tedious tasks. |
| 24.00 | 29.00 | 5.0 | Integrations card: lime disc with Ramp mark center, partner logos (pilot, qb, xero, NetSuite, SAP, sage, Workday) pop around, connector lines, orbit ring; left list checks | push +4.6%/s | continuous | Get seamless integrations to your existing providers and automated accounting rules. |
| 29.00 | 33.40 | 4.4 | Accounting table; transaction rows lift out as 3D slabs with shadows; cursor sets category "Advertising" | slow | continuous | Spend data from employees, expenses coding, |
| 33.40 | 35.72 | 2.3 | Two panels, left in 3D rotateY about 25 deg, "Review & sync" modal with checks | truck left 92 px/s | hard cut | and easier transaction syncing. |
| 35.72 | 38.90 | 3.2 | Line-art briefcase in circle; "Have multiple entities?" types taupe with blurred leading char | pull-back **-5.8%/s** reveals scattered small briefcase icons on faint map | continuous | Have multiple entities? International operations? |
| 38.90 | 45.04 | 6.1 | "Create legal entity" form + "Entities" list; cursor fills, rows added | truck left 46 px/s | hard cut | It's simple to accurately manage all your related businesses' spend data in one single account. |
| 45.04 | 46.00 | 1.0 | Charcoal, lime circle-plus line icon; bg lifts to light over 6 frames | static | hard cut | Plus, |
| 46.00 | 48.00 | 2.0 | "ramp / Accounting automation" + "Ramp Intelligence" badge, category pills; cursor selects "Travel Transport" | static | continuous | Ramp's accounting automation |
| 48.00 | 50.30 | 2.3 | Transaction "$58.92" Uber detail, AI spinner, suggestion chips | static | a vertical line grows out of the card bottom | suggests how to code data based on past transactions, |
| 50.30 | 53.30 | 3.0 | Line drops to clock icon "Saving time", elbows to gear "Manual effort" | camera tracks the line down 160 px/s | continuous | saving you time and manual effort. |
| 53.30 | 58.00 | 4.7 | Ramp Card table, spreadsheet slides under it, bell icon with connector | pull -1.6%/s | camera tilts down | The reconciliation tool double-checks discrepancies, so data is always accurate. |
| 58.00 | 61.00 | 3.0 | Text on a perspective floor plane: "Any resolution steps are auto-prompted" (taupe) | tilt down 70 px/s | hard cut to dark | And any resolution steps are auto-prompted. |
| 61.00 | 64.48 | 3.5 | Dark olive; cards Asana/UPS/Furniture Corp + rule chips ("if category is Software", "require IT approval"); gauge arc fills lime, "8x Faster" | bg darkens over 12 frames, cards focus-pull in | hard cut | Imagine closing your books up to eight times faster. |
| 64.48 | 71.59 | 7.1 | Light; "ramp" types, mark wipes; "It can be a reality" -> lime "Sign up today" button, cursor click | static | end | With Ramp, it can be a reality. Sign up for Ramp today. |

**Structure**: hook 0-5.8 (8%) / agitation 5.8-14 (11%) / pivot question 14-16.4 (3%) / reveal 16.4-20 (5%, named at **23%**) / features 20-61 (57%) / proof 61-64.5 (5%) / CTA 64.5-71.6 (10%).

---

## 2. Burnwe style DNA (rules that hold across all 4)

Frame numbers are at 25 fps (multiply by 1.2 for 30 fps).

1. **Text is written, never faded.** Every headline is a per-character typewriter synced to VO syllables, about 1 char per 1.2-1.5 frames (16-20 chars/s, close to the 13-15 chars/s of 140-155 wpm speech). The newest 3-6 characters form a "hot tail": they are born in the accent state (brand gradient, accent color, 25% gray, or blurred) and settle to the base color over **8-12 frames**. See `*_text_*.jpg`. Gemini described this as "mask slide-up" or "blur/scale in"; the frames show a typewriter with a hot tail in all 4 videos.
2. **One line, centered, grows then shrinks.** A phrase starts big (cap height about 8-9% of frame), and as words are typed the whole line is scaled down (camera pull-back) so it stays inside about 60% of frame width. Final sentence cap height is about 3.5-4.5%. Ramp's variant keeps the size and scrolls the line left like a teleprompter.
3. **The camera never stops.** Measured drift on "static" shots: scale **0.4-2%/s** and translation **15-60 px/s** (1080p), near-linear. Push-ins of 5-7%/s are used for emphasis. Big 3D trucks go up to about 470 px/s. Holds only happen on the end card.
4. **Entrances are focus pulls, not slides.** New elements arrive defocused (gaussian blur 12-20 px), at 0-40% opacity, scale 1.03-1.08 or 0.92, and resolve over **8-12 frames**, `power3.out` or `expo.out`. Exits are the reverse (blur up to 20 px + fade in about 6 frames). There is almost no directional motion blur; blur is gaussian defocus.
5. **Photos arrive graded, then become real.** Every stock photo enters with a 2-color gradient map in brand colors and cross-grades to natural color over **10-15 frames** (1Deploy blue-violet/hot pink, EyeQ magenta/cyan or green/yellow). EyeQ also shows the flat color block first, then the photo.
6. **Two worlds, alternating.** Each film has a dark mode and a light mode and switches every 5-13 s. Problem, question and "under the hood" views go dark; product and proof go light. The switch itself is the transition (exposure ramp, iris wipe, luminance crossfade, bloom white-out).
7. **Hard cuts are softened by an exposure ramp.** After a cut into a new world, the background starts about 30-40% off its target luminance and settles in **10-12 frames** while elements focus-pull in. The cut is clean but reads as a camera adjusting exposure.
8. **Transitions are motivated by an object.** The orb blooms into the white world, the "?" condenses from the card cloud, a numeral you fly through, a button you click, a line the camera follows, a card that shrinks into a word. Pure crossfades almost never happen.
9. **UI is a stage prop, never a screenshot.** UIs are rebuilt as clean vector cards: white, radius 12-16 px, hairline border `rgba(0,0,0,0.06)`, soft shadow (y 20-30 px, blur 40-60 px, 8-15% black). They float at 2-4 depth layers with parallax; 3D tilts are 20-40 deg on entry and settle flatter (10-25 deg) or flat.
10. **A single hero token anchors the film.** 1Deploy: the glass orb, which becomes the logo puck. Foyr: the round agent avatar. EyeQ: the "2.0" box. Ramp: the lime disc and lime accents. The token appears in the hook, the reveal, the feature diagrams and the end card.
11. **One accent color, used as a highlighter.** Base palette is neutral (off-white/gray or near-black navy/teal). The accent (violet-pink gradient, orange, mint, lime) marks only the newest text, one keyword, one status, one button, one chart line.
12. **Cursor as actor.** Cursors move on eased arcs, pause about 6 frames before clicking, and clicks trigger a state change (tag flip, dropdown, bloom). Ramp and Foyr add colored name tags ("Accountant", "Project Lead") like multiplayer cursors. 1Deploy uses outlined arrow glyphs as ambient decoration.
13. **Numbers always count.** Stats are counters with a sparkline or bar growing beside them: ROI +47% -> +85% over 4 s, 62.6% -> 77.8% over 3 s, bars 63% vs 95%. The counter keeps ticking through the VO line, it does not snap.
14. **Cuts follow the VO, not the beat.** Mean distance from a hard cut to the nearest beat is 0.12 / 0.17 / 0.14 / 0.08 s against a random expectation of about 0.13 s, so cuts are not beat-locked (Ramp slightly). Cuts land on VO phrase boundaries, and each shot holds exactly one VO clause (median 1 clause = 2.5-4 s).
15. **Script shape.** 157 words, 140-155 wpm, 16-38% of runtime before the product name, features 39-57%, one quantified proof beat (5-7%), CTA + logo 10-12%. The last two lines are "tagline sentence" + "brand name / sign up".

---

## 3. Technique catalog (36 moves)

Conventions: 25 fps, 1920x1080, GSAP 3 with a single paused master timeline (HyperFrames seeks it). `f(n)` = n frames in seconds = n/25. For Remotion, the same numbers apply with `interpolate()` + `Easing.out(Easing.exp)`.

**Motion blur policy for this style**: 90% of Burnwe blur is **gaussian defocus tied to animation progress**, not shutter blur. Implement it as `filter: blur()` keyed to the tween (cheap and deterministic). For the few genuinely fast moves (M21 numeral zoom-through, M23 streaks, M13 fast truck) use a **velocity-driven blur**: blur_px = min(max, |dx/dt| * k), with k about 0.02-0.03 px of blur per px/s, directional via an SVG `feGaussianBlur stdDeviation="bx 0"`. Or render with **temporal supersampling**: render 8 subframes per output frame across a 180 deg shutter (0.5 frame) and average them (HyperFrames: render at 200 fps and `ffmpeg -vf tmix=frames=8:weights="1 1 1 1 1 1 1 1",select='not(mod(n\,8))'`; Remotion: `<CameraMotionBlur shutterAngle={180} samples={8}>`).

---

### Typography

**M1. Hot-tail typewriter** (signature)
- What: characters appear one at a time; the last N characters are in a "hot" state and cool to the base color.
- When: every headline and statement in all 4 films.
- Params: rate 1 char per 1.2-1.5 f (sync each word's first char to VO word onset); tail N = 4-6; hot state per brand: 1Deploy `linear-gradient(90deg,#4921cf,#cd4882)` fill, EyeQ `#4ef2d1`, Foyr `#e3671e`, Ramp opacity 0.25 (gray). Cool-down 10 f `power2.out`. Leading char also carries blur 4-6 px and opacity 0 -> 1 over 3 f.
- GSAP:
```js
const chars = split(el);           // one <span> per char, spaces kept
chars.forEach((c, i) => {
  const t = start + i * f(1.3);    // or t = wordOnset[wi] + ci*f(1.1)
  tl.fromTo(c, {opacity:0, filter:'blur(6px)'}, {opacity:1, filter:'blur(0px)', duration:f(3), ease:'none'}, t)
    .fromTo(c, {color:HOT}, {color:BASE, duration:f(10), ease:'power2.out'}, t + f(2));
});
```
For a gradient hot state, render the line twice (base layer and gradient layer with `background-clip:text`) and animate a per-char opacity on the gradient layer.
- Motion blur: not needed; the 6 px blur on the leading char stands in for it.

**M2. Fit-to-width line zoom**
- What: as words are appended, the line scales down so it never exceeds about 60% of frame width; the line stays centered.
- When: 1Deploy "Companies Do...", Foyr "Every Project Has a Chokepoint".
- Params: start scale so cap height is about 8-9% of frame; target scale = min(1, 0.6*1920 / lineWidth). Tween each change over 12-15 f, `power3.inOut`.
- GSAP: after each word is appended, `tl.to(line, {scale: fit(), duration:f(14), ease:'power3.inOut'}, wordTime)`. Measure widths offline (fonts loaded) and bake scales into the timeline for determinism.
- Motion blur: none.

**M3. Ticker scroll line**
- What: fixed size, the line slides left as it types so the newest word stays near center; old words exit on the left edge.
- When: Ramp "What if there's smarter approach?".
- Params: size cap about 7%; x offset = -(typedWidth - 0.5*frameWidth) once typed text passes center; smoothing 8 f `power2.out`.
- Motion blur: none.

**M4. Two-tone stacked lockup**
- What: line 1 in near black, line 2 in the accent, each typed by M1; the lockup later reflows sideways to make room for a logo, split by a 1 px divider.
- When: Foyr "World's First / AI Super-Agent" -> ".foyr manage | World's First".
- Params: line gap 0.15 em; reflow slide 18 f `power3.inOut`, divider height 0 -> 100% over 10 f.

**M5. Inline image word**
- What: a photo card shrinks into an inline slot between two words, sits there as a "word", then collapses horizontally and the words close the gap.
- When: Foyr opening (0.6-2.0 s).
- Params: card 1 -> inline height about 1.1 em over 10 f `power3.inOut`; hold 12 f; collapse width 100% -> 0 over 6 f with blur 0 -> 8 px; neighbors shift via FLIP.
- GSAP: use `Flip.from()` state capture for word positions, or bake x offsets.

**M6. Keyword stays hot**
- What: after the tail cools, 1-2 keywords keep the accent tint.
- When: 1Deploy "Days", "Not Quarters" (`#5638af`), Foyr "Chokepoint" (orange for about 0.5 s then black), EyeQ "enough".
- Params: keyword cools to accent at 70% instead of base.

**M7. Floor-plane text**
- What: a statement lies on a perspective floor; the camera tilts down onto it.
- When: Ramp 58-61 s.
- Params: `rotateX(62deg)` plane, perspective 1400 px, camera tilt = plane translateY -70 px/s; text taupe `#bdb5a6`, typed by M1.

---

### Entrances, exits, color

**M8. Focus-pull entrance**
- What: an element arrives defocused and resolves.
- When: every card, row, icon, panel.
- Params: blur 16 px -> 0, opacity 0 -> 1 (first 60% of the tween), scale 1.06 -> 1 (or 0.92 -> 1 for small icons), y +20 px -> 0 optional; 10 f `power3.out`; stagger 3-4 f for lists.
- GSAP: `tl.from(els, {filter:'blur(16px)', opacity:0, scale:1.06, duration:f(10), ease:'power3.out', stagger:f(3.5)}, t)`
- Motion blur: this IS the blur.

**M9. Blur-out exit**
- What: element blurs heavily and fades while the next shot starts.
- When: Foyr calendar (9.8 s), EyeQ portrait grid (3.4 s), 1Deploy "?" (13.2 s).
- Params: blur 0 -> 20 px, opacity 1 -> 0, scale 1 -> 1.04, 6 f `power2.in`.

**M10. Duotone-to-color grade**
- What: photo starts as a 2-color gradient map, cross-grades to natural color.
- When: all stock photos in 1Deploy and EyeQ, first appearance.
- Params: shadows color A, highlights color B; crossfade 12 f `power2.out` starting 4 f after the card lands.
- CSS: stack two copies; the top one uses an SVG filter
```html
<filter id="duo"><feColorMatrix type="saturate" values="0"/>
  <feComponentTransfer><feFuncR type="table" tableValues="0.29 1"/><feFuncG type="table" tableValues="0.13 0.23"/><feFuncB type="table" tableValues="0.81 0.42"/></feComponentTransfer></filter>
```
(values for `#4921cf` -> `#ff3b6b`), then tween its opacity 1 -> 0.

**M11. Color block then photo**
- What: a flat rectangle in a photo's dominant color pops first; the photo fades in on top of it.
- When: EyeQ collage (3.8-4.2 s).
- Params: block scale 0.9 -> 1 over 6 f; photo opacity 0 -> 1 over 8 f starting 3 f later, starting from duotone (M10).

**M12. Exposure ramp on cut**
- What: after a hard cut, the background luminance settles from about 35% off target.
- When: 1Deploy 8.0 s (dark -> light), Ramp 61.0 s (light -> dark), 45 s.
- Params: overlay a full-frame layer of the previous world's color at opacity 0.4 -> 0 over 11 f `power2.out`, with M8 on all new elements.

---

### Camera

**M13. Perpetual drift**
- What: every shot has a slow linear push/pull plus truck.
- Params (measured): scale 0.4-2%/s, translation 15-60 px/s; direction alternates shot to shot (push, pull, push). Emphasis push 5-7%/s. Use `ease:'none'` across the whole shot, or `sine.inOut` if the move spans a cut.
- GSAP: wrap each scene in a `.cam` div: `tl.fromTo(cam, {scale:1, x:0}, {scale:1.03, x:-60, duration:shotDur, ease:'none'}, shotStart)`.
- Motion blur: none needed at these speeds.

**M14. 3D card-cloud truck**
- What: cards at 3-4 depths; the camera trucks sideways fast while pushing in.
- When: 1Deploy 8.0-11.6 s.
- Params: truck about 470 px/s at the near layer, push +5%/s; layer z at 0, -400, -900, -1500 px, perspective 1600 px; cards rotateY 8-15 deg facing camera.
- Implementation: a CSS 3D scene with `transform-style:preserve-3d`; animate the camera container `translateX` and `translateZ`.
- Motion blur: near-layer speed about 19 px/frame. Use a velocity blur of about 0.5-1 px on the near layer only, or skip.

**M15. Helix reveal pull-back**
- What: cut to a wide where all the previous cards sit on a 3D helix; a symbol (the "?") condenses at the center from a blurred gradient blob.
- When: 1Deploy 11.64-13.44 s.
- Params: helix radius about 700 px, 1.25 turns, 14 cards; camera pull z +300 px over 45 f; "?" blur 30 -> 0 px, scale 1.4 -> 1, pink `#e06fa0`, over 20 f, then for the exit blur 0 -> 24 px and hue to violet.

**M16. Match-scale cut**
- What: hard cut from a wide of the hero object to a 3-4x crop of the same object, same position logic.
- When: 1Deploy 3.04 s (orb wide -> orb top edge crop).
- Params: new shot starts at scale 4 relative to the wide, then drifts M13. No blur.

**M17. Line-follow camera**
- What: a connector line draws and the camera tracks its tip, turning at elbows.
- When: Ramp 50-53 s (card -> "Saving time" -> "Manual effort"), Foyr flowchart 53.6-57.4 s, Ramp 20-24 s (horizontal node line).
- Params: line `stroke-dashoffset` 100% -> 0 at 400-600 px/s; camera translate follows with 6 f lag (`power2.out` quickTo); nodes (icon in 64 px circle + label) focus-pull (M8) as the tip reaches them; elbow radius 16 px.
- Motion blur: none.

**M18. Panel tilt-up**
- What: a UI panel starts lying back and swings up to face camera while scaling up.
- When: EyeQ 21.4 s.
- Params: rotateX 35 deg -> 0, scale 0.55 -> 1, y +80 -> 0, 14 f `power3.out`, perspective 1400 px; background black -> dark teal gradient during the move.

**M19. Crane in to UI**
- What: opening move sinks vertically onto a floating card field and decelerates.
- When: Ramp 0-1 s (228 px/s decaying to about 15 px/s).
- Params: y from -300 px to 0 over 30 f `expo.out`, then M13.

---

### Transitions

**M20. Orb bloom white-out**
- What: the hero orb brightens to white while the dark background flashes magenta/red at the edges; cut to a white frame with a pink-violet vignette; the logo draws in the white.
- When: 1Deploy 25.9-26.2 s.
- Params: 6 f: radial edge glow `#e0245e` opacity 0 -> 0.8, orb core brightness 1 -> 2.5 with `filter: brightness()`; then white bg with vignette (`radial-gradient(closest-side, #fff 55%, #c9a6e8 85%, #e57ab0)`) that shrinks outward over 20 f.

**M21. Numeral zoom-through**
- What: the camera flies into a giant number; the next shot is already visible in the counters and gaps.
- When: EyeQ 11.0-11.5 s ("14").
- Params: scale 1 -> 6 over 12 f `expo.in`, transform-origin at the gap between the digits; next scene placed behind at scale 1.3 -> 1 over the same 12 f. Numeral fill mint -> white vertical gradient.
- Motion blur: yes. Radial zoom blur: render the numeral layer 6 times at scale s * (1 - k*i), k = 0.015, opacity 1/6 each (manual accumulation), or temporal supersampling.

**M22. Iris wipe from edge**
- What: a solid circle in the next world's color grows from an off-frame point and covers the frame.
- When: Ramp 13.8-14.0 s (forest green from the left edge).
- Params: `clip-path: circle(r at -10% 50%)`, r 0 -> 130% over 6 f `power2.in`; text starts typing on the new color 2 f after full cover.

**M23. Luminance crossfade with bokeh**
- What: the dark bg brightens to the light world; text goes low contrast and vanishes; 3-4 large soft white discs drift through.
- When: Ramp 16.0-16.5 s.
- Params: bg color tween forest `#1e3028` -> `#ebebeb` over 8 f `power1.inOut`; text opacity 1 -> 0 over 6 f; discs 300-500 px, blur 60 px, opacity 0 -> 0.5 -> 0.

**M24. Light-leak sweep**
- What: a soft violet/blue glow enters from the right edge before a cut.
- When: 1Deploy 37.5 s, 54.9-55.2 s.
- Params: radial gradient 900 px, `#3a2bd9` at 0.7, x from +40% off-frame to 60% over 8 f `power2.in`, `mix-blend-mode: screen`.

**M25. Click bloom flood**
- What: a cursor click on a pill emits an accent glow ring, and the frame floods with blurred accent shapes that are the defocused next scene.
- When: Foyr 22.5-23.2 s (Ai+ toggle).
- Params: pill fill black -> orange gradient in 4 f; ring: 3 px stroke, blur 18 px, scale 1 -> 3, opacity 1 -> 0 over 12 f; next scene layer starts at blur 40 px + saturate 1.6 + opacity 0.9, resolves over 20 f (M8 at long duration).

**M26. Speed-line streak field**
- What: horizontal mint light streaks move left to right at 3 speeds behind typed text.
- When: EyeQ 15.6-18.2 s.
- Params: 25 streaks, length 150-700 px, height 2-4 px, color `#3af0c2` with glow (`box-shadow 0 0 12px`), speeds 900 / 1800 / 3200 px/s; each streak gets `filter: blur(0 6px)` equivalent via SVG `stdDeviation="8 0"`.
- Motion blur: directional blur is the look; use the SVG horizontal blur.

**M27. Framing line bracket**
- What: a line draws in, turns a corner and brackets a word; the version box fills; later the framing lines extend to the frame edges.
- When: EyeQ 18.2-21.4 s and endcard.
- Params: 2 px line `#3af0c2`, draw 10 f `power2.out`; "1.0" box glitch-swaps to "2.0" over 4 f (hard frame swaps, RGB offset 3 px on 2 frames); box fill mint gradient.

---

### Diagrams, UI and data

**M28. Glass orb hero**
- What: a sphere with a violet-pink gradient, inner glyph, specular highlight, soft outer glow; floats over a starfield.
- When: 1Deploy hook, reframe, and as the logo puck in features.
- CSS: `background: radial-gradient(circle at 35% 30%, #fff 0 8%, #f5d9f0 18%, #b27be8 45%, #6a3ce0 70%, #e0487f 100%)`; `box-shadow: 0 0 80px 10px rgba(160,90,240,.45), inset -20px -30px 60px rgba(40,10,90,.5)`; bob y +-6 px over 3 s `sine.inOut`.

**M29. Orbit constellation**
- What: hero token in the center, faint concentric rings, brand icons pop onto the rings one by one, optional connector lines.
- When: Foyr 16.2-18.4 s, Ramp 24-29 s, 1Deploy 28.5-33.4 s.
- Params: rings at r = 260 / 420 / 600 px, 1 px `rgba(0,0,0,0.06)`; icon chips 72-96 px white circles with shadow; pop scale 0.4 -> 1 + blur 10 -> 0 over 8 f, stagger 4 f (on VO beat or every 0.2 s); slow orbit 4-6 deg/s; push +4 to +5%/s.

**M30. Status tag flip**
- What: a row's gray "In progress" chip flips to an accent "On Hold" chip.
- When: Foyr 4.5-5.5 s; similar for checkbox ticks (48.6-51.6 s).
- Params: chip crossfade + scale 0.9 -> 1 in 5 f; stagger 5-6 f down the column; accent glow row behind (orange at 12% opacity, blur 20 px).

**M31. Highlight sweep**
- What: amber highlighter bars sweep across document fields as if an AI fills them.
- When: Foyr 24-26 s.
- Params: bar height 70% of line, `#f5b748` at 55%, scaleX 0 -> 1 from the left in 8 f, stagger 6 f, then fade to 20% after 12 f.

**M32. Row lift into 3D**
- What: table rows detach from a flat table and float forward as slabs with shadows; or rows blur-in one by one.
- When: Ramp 29-33 s, Foyr 30.5-36 s.
- Params: translateZ 0 -> 60 px, y -8 px, shadow y 12 blur 30 at 12%, stagger 4 f; Foyr variant = M8 with blur 12 px, stagger 8 f.

**M33. Gantt field with agent puck**
- What: a dark board of rounded task pills scrolls slowly; the glowing hero puck travels between pills; touched pills get diagonal stripes and a glow.
- When: 1Deploy 38-43.4 s, 48.8-52.7 s.
- Params: pills 36-44 px high, radius 10, `#5b3fd6` to `#7a5fff`, avatar dot left; field scroll 40-60 px/s upward; puck path via `MotionPathPlugin`, 20 f per hop `power2.inOut`; stripes: `repeating-linear-gradient(135deg, #b44bd0 0 14px, #7a3fe0 14px 28px)` wipes in from the left in 10 f.

**M34. Counter + climbing line**
- What: big percentage counts up while a gradient line climbs and a puck rides its tip.
- When: 1Deploy 55.7-60.3 s (+47% -> +85%), EyeQ 51.4-54.7 s (62.6% -> 77.8%), EyeQ bars.
- Params: duration = the full VO clause (3-4.5 s), `ease:'none'` for the number (it keeps moving), `power1.in` for the line so it steepens; number font tabular figures; line 8-12 px, gradient `#4921cf -> #e0487f`, area fill below at 30% fading to 0.

**M35. Versus split**
- What: vertical split, left = duotone photo labeled "Everyone Else", right = clean light panel labeled "Your Company" with the rising metric.
- When: 1Deploy 55.2-60.3 s.
- Params: divider enters at 50% and slides to about 42% over 8 f `power3.out`; left side stays duotone (never grades to color); right side then expands to full frame over 12 f to end the beat.

**M36. Collaborative cursor**
- What: arrow cursor with a colored name tag; moves on an arc, dwells, clicks, and the click causes a UI state change.
- When: Ramp "Accountant" (6-13 s), Foyr "Project Lead", "Design Manager" (42-45 s), CTA buttons in Ramp and Foyr.
- Params: path = quadratic bezier with the control point offset 15-25% of distance perpendicular to travel; travel 14-20 f `power2.inOut`; dwell 6 f; click = cursor scale 0.85 for 2 f + target scale 0.96 for 3 f + SFX; tag pill 6 px radius, brand color, 12 px text, offset (14, 18) px.

**Extra ambient layers (cheap, always on)**
- Starfield (1Deploy dark): 80 dots 1-3 px, 10% of them tinted orange/pink, drift 5-15 px/s at 3 depths, plus 4-6 short horizontal "dash" particles moving 60-120 px/s.
- Window-light gobo (Foyr light): 3 diagonal shadow bands `rgba(80,95,110,.35)`, 35 deg, blur 60 px, drift 10 px/s.
- Faint grid (Foyr opening, EyeQ): 1 px lines every 96 px at 3-4% opacity.
- Logo stroke-draw end card (1Deploy, Ramp, Foyr): mark strokes via `stroke-dashoffset` 16-20 f, fill fades in 6 f, wordmark typed with M1 (Ramp: gray -> black per char), URL or CTA focus-pulls in 12 f later.

---

## 4. Easing and timing cheat sheet

| move class | duration (25 fps) | ease | notes |
|---|---|---|---|
| char reveal | 3 f per char, new char every 1.2-1.5 f | none | tail cool-down 10 f `power2.out` |
| element entrance | 8-12 f | `power3.out` / `expo.out` | blur 12-20 px -> 0, scale 1.06 -> 1 |
| element exit | 6 f | `power2.in` | blur -> 20 px, fade |
| list stagger | 3-8 f between items | - | rows 4 f, icons 4 f, blur-in rows 8 f |
| layout reflow (line zoom, lockup slide) | 12-18 f | `power3.inOut` | |
| camera drift | whole shot | none | 0.4-2%/s scale, 15-60 px/s |
| emphasis push | whole shot | none or `sine.in` | 5-7%/s |
| iris / flood / bloom | 6-12 f | `power2.in` for covering, `power2.out` for revealing | |
| exposure ramp | 10-12 f | `power2.out` | |
| counters | whole VO clause (3-4.5 s) | none | never snaps |

No visible overshoot (`back.out`) appears in the frame bursts; Gemini claimed `back.out` in several places, but pops resolve monotonically. Keep everything overshoot-free.

---

## 5. Sound design

| video | tempo (librosa) | Gemini estimate | genre | notes |
|---|---|---|---|---|
| 1Deploy | 117.5 BPM (beat 0.51 s) | 125 | corporate tech house: pad intro, 4-on-the-floor kick from about 1 s, arps, claps join at 8 s | riser into reveal at 25.9-26.2 s, deep whoosh on the white-out, pops per icon at 29 s, swell on split-screen at 55 s, final impact on logo at 64 s |
| Foyr | 107.7 BPM (0.56 s) | 120 | light electronic pop, plucks, soft kit | riser into "AI Super-Agent" at about 10 s, music drops out for "The Result?" at 45 s and returns, ambient thin-out during dark flowchart |
| EyeQ | 107.7 BPM (0.56 s) with dense 8th-note onsets (0.28 s grid) | 135 (likely double-counted hats) | trap-tinged electronic, sub bass, fast hats, beat from frame 0 | beat stutters at 3 s and 7 s, riser 15 s into streaks, beat drops out 35-39 s ("18 months of development"), returns on "Smart algorithms" |
| Ramp | 117.5 BPM (0.51 s) | 112 | chill-hop corporate, clean guitar riff, soft kit | melody pauses on "What if" (14 s), beat lifts on logo (17 s), riser 60 s into gauge, soft hit on "8x Faster" |

**SFX grammar (same in all 4)**
- Whoosh: on every scene change and fast camera move (about 1 per 3-4 s). Short airy whooshes, not heavy impacts.
- Click: every cursor click and chip/toggle state change, placed on the exact frame of the cursor scale-down.
- Pop / blip: every icon or card focus-pull in a constellation or list, one per staggered item (quiet, -18 dB under VO).
- Data ticks / glitch: counters and "AI thinking" moments.
- Riser (1.5-3 s) into the product reveal or the proof stat, resolving on an impact or chord at the reveal frame.
- Music dip: the beat thins or drops for the pivot question or "The Result?" beat, then returns on the answer. This is the main dynamic device.

**Sync rule**: cuts sit on VO phrase ends, not on the grid (see DNA rule 14). Hits are placed on visual events (click, pop, reveal) and those events are timed to VO words. So the music is a bed, and SFX carry the sync.

---

## 6. Rebuild notes for HyperFrames / Remotion

- Build every scene inside a `.cam` wrapper so the perpetual drift (M13) is one tween per shot; transitions animate the next scene's `.cam` from where the last one ended.
- Put the typewriter (M1) on a data-driven timing table: `[{word, t_start}]` from VO forced alignment (ElevenLabs Scribe word timestamps). Chars of a word are spread from `t_start` over `min(word_dur, chars*1.3f)`.
- Gaussian blur on dozens of elements is the render cost driver. Cap simultaneous blurred elements at about 12, and prefer blurring a whole group layer over each child.
- Duotone (M10): pre-bake both versions of each photo (duotone + natural) as images instead of live SVG filters; crossfade opacity only.
- Deterministic 3D: use CSS 3D transforms with a fixed perspective, no Three.js needed; every Burnwe "3D" shot is 2.5D cards.
- Temporal supersampling is only worth it for M21, M26 and M14's near layer; render those scenes separately at 8x frame rate and `tmix` them down.

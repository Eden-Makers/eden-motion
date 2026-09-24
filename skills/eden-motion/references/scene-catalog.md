# Scene catalog

Every scene type the engine ships, with props (as given to the storyboard model) and purpose. Source of truth: `src/lib/catalog.mjs` + the header comment in `runtime/scenes/*.js`. Contract for new scenes: `runtime/SCENE_API.md`.

| type | props and use |
|---|---|
| `headline` | { text: "statement typed char by char (3-10 words)", keyword?: "1-2 words kept in accent", sub?: "small line under" } Burnwe signature hot-tail typewriter; use for statements and questions. |
| `kinetic-type` | { mode: "single"\|"rise"\|"stack"\|"mask", text?: "...", words?: ["One","word","each"], lines?: ["line 1","line 2"], keyword?: "...", size?: "xl"\|"lg"\|"md" } single = giant word swaps on each spoken word (Lovable), good for 1-4 word punchy lines. |
| `prompt-box` | { prompt: "what the user types (<= 60 chars)", results?: [{icon, label} \| {image:"gen:<image prompt>"}] (0-4) } AI prompt typed in a glowing pill, cursor clicks send, result cards fan out. |
| `ui-window` | { url?: "app.brand.com", appName: "brand", screenshot?: "assets/ui-1.jpg (real product screenshot if available)", dashboard?: { title, nav:[5 labels], kpis:[{label,value,delta}] x3, rows:[{title,meta,status:"Done"\|"Live"\|"Queued"}] x4, chartTitle }, focus: "kpis"\|"chart"\|"rows"\|"button"\|"top", clickLabel?: "button text", callout?: "chip text" } product UI with 3D arrival, camera push to focus, cursor click. |
| `stat-hit` | { value: number, from?: number, prefix?: "+"\|"$", suffix?: "%"\|"x"\|"h", decimals?: 0, label: "what it measures", line?: true } big counter that keeps ticking through the line + climbing line. |
| `orbit` | { title?: "caption typed at top", keyword?: "...", items: [{icon, label, cue?: "VO word"}] (5-9), centerIcon?: "lucide name if no logo", links?: true } brand logo/orb at centre, integrations or features pop onto orbit rings with connector pulses. |
| `card-cloud` | { items: [{icon, label, meta?, kind?: "note"\|"chip"\|"window"}] (10-16: notifications, tools, tasks, files), word?: "? or ONE word that condenses at ~60%", cueWord?: "VO word that triggers it", sub?: "small line under the word" } 3D chaos field with sideways camera truck; problem / overload shots, best on tone dark. |
| `flow-line` | { title?: "...", keyword?: "...", nodes: [{icon, label, kicker?: "step name", cue?}] (3-5), layout?: "zigzag"\|"line"\|"steps" } a line draws node to node while the camera follows the tip; processes, workflows, "from X to Y". |
| `feature-cards` | { headline?: "typed above the row", keyword?: "...", cards: [{icon, title: "2-3 words", text: "<= 10 words", cue?: "VO word"}] (2-4) } feature cards arrive then highlight one by one on the VO. |
| `tasks` | { title?: "list name", kicker?: "small label", agent?: "AI Agent", rows: [{title, meta?, icon?, from?: "Pending", to?: "Done", cue?}] (4-6) } an agent puck completes a task list: status chips flip, highlight sweeps, progress counts. |
| `chat` | { title?: "assistant name", placeholder?: "...", messages: [{from: "user"\|"ai", text, chip?: {icon, label}}] (2-4, AI replies <= 20 words) } assistant conversation: user types, AI thinks then streams. |
| `versus` | { left: {label: "Everyone else", image?: path, items?: [str] (2-3)}, right: {label: "With Brand", value?: number, prefix?, suffix?: "%", decimals?, from?, caption?: "what the number is", items?: [str] (2-3)} } old way (duotone, dim) vs new way (light, counter + climbing line), right side takes over. |
| `media-frame` | { src: "gen:<detailed image prompt>" \| "assets/...", kind?: "image"\|"video", caption?: "short caption synced to VO", keyword?: "...", captionPos?: "below"\|"side", duotone?: true, expand?: false } image or clip in a liquid-glass frame with Ken Burns and duotone-to-colour grade; human/world/emotional shots the UI cannot show. expand:true ends full bleed. |
| `montage` | { mode: "flash"\|"wall", items: ["gen:<prompt>" \| "assets/..."] (6-10), text?: "one big word at the end", keyword? } flash = 0.12-0.16 s hard-cut cold open; wall = pull back to a masonry wall of results and push into another tile. |
| `orb-hero` | { text: "short line typed under the orb", keyword?: "...", icon?: "lucide name", sub?: "...", bloom?: true } glowing glass orb hero token; AI brands, the turn ("What if..."), reveal; bloom:true flashes the frame to white at the end. |
| `logo-reveal` | { tagline?: "tagline", cta?: "CTA button text", url?: "domain.com", click?: true } end card. Uses brand logo/mark automatically. |
| `grid-stage` | { cells: [{src?: "gen:<prompt>"\|"assets/...", kind?: "image"\|"video", text?, label?: "magenta tag", stat?: "50%", fill?: "halftone"\|"dither"\|"stripes"}] (2-6), layout?: "2x2"\|"hero-left"\|"hero-right"\|"strip", reflow?: "<other layout>", reflowAt?: "VO cue word", title? } Higgsfield hero layout: media and stats in grid cells that reflow mid-shot. |
| `drum-list` | { prefix?: "Make it", items: ["cinematic","viral","on brand","yours"] (4-8, last one lands in accent), label?: "small caps kicker" } slot-roll word drum stepping ~0.18 s. |
| `glitch-lockup` | { badge?: "NEW", pill?: "short pill text", name? } crash-zoom brand lockup with pixel/RGB glitch frames; Higgsfield-style reveal. |
| `pixel-type` | { text: "2-6 words", keyword?, sub?, align?: "left"\|"center" } headline whose words arrive through a bitmap/pixel state then resolve; 1 char per frame energy. |
| `endcard-caps` | { lines: ["SMALL CAPS LINE", "..."] (1-3), url?: "domain.com", flash?: "accent"\|"lime"\|"white"\|false } plain Higgsfield end card. |
| `persp-card` | { src: "gen:<prompt>"\|"assets/...", kind?: "image"\|"video", caption?: "CAPS CAPTION BAR", rotY?: 24 } AI footage or screenshot on a tilted 3D card with a caption bar; "AI output as proof". |

## Transitions

| type | use |
|---|---|
| `cut` | hard cut on the VO phrase end (default, most common). Between different tones it gets an automatic exposure ramp. |
| `zoom-through` | camera flies into the old scene, new one emerges from depth. Use into the brand reveal or into the product. |
| `zoom-out` | pull back, new scene arrives from above. Use after a close detail. |
| `push-left` | whole frame pushes sideways (with real motion blur). Feature to feature. |
| `push-up` | vertical push. Lists, next step. |
| `whip` | very fast lateral whip with heavy motion blur. Max 1-2 per film, energetic moments. |
| `blur-dissolve` | defocus crossfade. Calm, emotional, or time jumps. |
| `iris` | circle wipe from a point (opts x,y px). After a click or from the orb. |
| `wipe` | brand-gradient slat wipe. Section change, max once. |
| `card-drop` | old scene becomes a card that drops away. Playful, max once. |
| `flash-frame` | Higgsfield: hard cut with a 1-2 frame full-frame colour flash (opts color: accent\|lime\|white). Section changes. duration 0.2. |
| `flash-cycle` | Higgsfield: 4-frame colour cycle then the next shot. Big section change, max twice. duration 0.3. |
| `overexpose` | Higgsfield: old shot blows out to white, new one settles from overexposed. duration 0.4. |
| `punch-in` | Higgsfield: 4x crash zoom into a point (opts x,y px, e.g. the clicked button) then hard cut. The drop moment. duration 0.4. |
| `pixel-dissolve` | Higgsfield: next shot revealed through a grid of pixel blocks in accent/lime. duration 0.5. |
| `grid-reflow` | Higgsfield: cells slide along grid lines into the next layout. duration 0.55. |

## Scene-level fields
`tone`: light | dark | cream | black | grid (Higgsfield paper grid). `camera`: omit (auto drift, alternating push/pull), push, pull, static. `transition`: {type, duration, ...opts}. Film-level: `background: "hf-grid"`, `palette: "higgsfield"` forces magenta #df167f + lime #d4ff19.

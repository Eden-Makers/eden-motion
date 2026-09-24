# eden-motion scene API

A scene is a function that builds DOM into `ctx.cam` and adds tweens to ONE shared paused GSAP
timeline `ctx.tl` at ABSOLUTE times (seconds of the film). The engine handles scene visibility,
the camera drift, transitions between scenes and motion blur. Scenes never register timelines.

```js
(function () {
  const { h, fx } = window.EM;
  EM.scene("my-scene", {
    // ownsCamera: true,   // set if the scene drives its own camera (engine drift is skipped)
    build(ctx) {
      const { tl, start, end, dur, props: p, cam, words, rng, brand, index } = ctx;
      const el = h("div", { class: "my-thing" }, "text");
      cam.appendChild(el);                       // cam is a full-frame flex centre box
      fx.focusIn(tl, el, start + 0.2);           // M8 focus-pull arrival
    },
  });
})();
```

## ctx
| field | meaning |
|---|---|
| `tl` | shared GSAP timeline. Add tweens at absolute times (`start + x`). |
| `start`, `end`, `dur` | scene window in seconds. Transitions overlap ~0.3 s on each side. |
| `props` | scene props from storyboard.json (all copy comes from here, never hard-code copy). |
| `cam` | `.em-cam` container, 1920x1080, `display:flex; center`. Position absolute children freely. |
| `el` | the scene `<section>` (tone class lives here). |
| `words` | VO words inside this scene: `[{word, start, end}]` absolute seconds. Sync to them. |
| `rng` | seeded PRNG `() => 0..1`. NEVER use Math.random. |
| `brand` | brand.json: `{name, logo, mark, colors:{accent,accent2,...}, fonts}` |

## Helpers (`EM.fx`)
- `fx.focusIn(tl, els, t, {dur=.42, stagger=.14, blur=16, scale=1.06, y=0})` default arrival.
- `fx.focusOut(tl, els, t)` blur-out exit.
- `fx.pop(tl, els, t, {from=.4, stagger=.16})` icon/chip arrival, also emits a "pop" SFX cue.
- `fx.hotType(tl, el, text, t, {wordTimes, keyword})` Burnwe hot-tail typewriter.
- `fx.typeText(tl, el, text, t, {dur})` plain typewriter with caret (prompt boxes).
- `fx.splitWords(el, text, {keyword})`, `fx.riseIn`, `fx.riseInAt(tl, words, times)`, `fx.maskUp`.
- `fx.countUp(tl, el, to, t, {from, prefix, suffix, decimals, dur})`.
- `fx.cardIn(tl, els, t, {y, rx, z})` 3D card arrival.
- `fx.cursor(parent, {x,y,hand})`, `fx.tagCursor(parent, label, {x,y,color})`, `fx.cursorMove(tl, c, x, y, t, {dur})`, `fx.cursorClick(tl, c, t, {target})` (emits "click" cue).
- `fx.layoutCenter(el, ancestor)` centre of el in ancestor coords, ignoring transforms (use for cursor targets and camera focus).
- `fx.draw(tl, svgPath, t, {dur})` stroke draw-on.
- `fx.wordTimes(ctx, n)` n onset times from VO (falls back to even spacing), `fx.timeOf(ctx, "word", fallback)`.
- `fx.brandImg(ctx, "mark"|"logo", {height})` -> `{wrap, img}` brand asset that auto-flips monochrome logos to white/black per tone. Append `wrap`, animate `img`.
- `fx.alignTimes(ctx, tokens)` onset per on-screen token matched against the VO words.
- `fx.cssVar(el, "--accent")` resolve a colour (GSAP can't tween `var(--x)` strings).
- `EM.icon(name, size)` inline lucide icon (any lucide name, e.g. "zap", "shield-check").
- `EM.rng(seed)`, `EM.h(tag, attrs, ...children)`.

## CSS tokens
`--bg --bg2 --fg --muted --card --card-fg --line --shadow --chip --accent --accent2 --accent3
--glow1 --glow2 --glow3 --radius --font-display --font-body`. Classes: `.em-display (.xl .lg .md .sm)`,
`.em-sub`, `.em-card`, `.em-chip`, `.em-pill-btn`, `.em-icon-badge`, `.em-kw` (gradient keyword).
Tone classes on the scene (`tone-light|dark|cream|black`) re-define the tokens, so always use tokens.

## Style law (from the reference analysis, research/analysis/*.md)
1. No overshoot. Arrivals are focus pulls: blur 12-20 px -> 0, scale 1.06 -> 1, 0.3-0.5 s, `power3.out`/`expo.out`.
2. Exits: blur up to 20 px + fade in ~0.25 s, `power2.in`.
3. Nothing is ever dead still: slow drift, floats, counters that keep ticking through the VO clause.
4. One accent colour used as a highlighter: newest text, one keyword, one button, one chart line.
5. Sync visual events to VO word onsets (`ctx.words`), not to a fixed grid.
6. Lists stagger 0.12-0.32 s. Cursor moves 0.5-0.7 s `power2.inOut`, dwells ~0.2 s before a click.
7. UI is a stage prop: white cards radius 12-26 px, hairline border, soft big shadow, 2-4 depth layers.
8. Deterministic only: no Math.random, no Date, no timers, no `repeat:-1`, no CSS transitions/animations.
9. Never tween `display`/`visibility` on the scene; use opacity/autoAlpha on your own children.
10. Keep simultaneous `filter: blur` elements under ~12 (render cost).

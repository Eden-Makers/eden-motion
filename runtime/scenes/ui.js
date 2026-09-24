/* Product UI scenes. These rebuild a believable product surface in HTML so every label is the
 * client's own words, then direct a camera + cursor over it.
 *
 * ui-window: app/browser window. Content = screenshot OR generated dashboard.
 *   props: {
 *     frame: "browser" | "app", url?, title?,
 *     screenshot?: path,                       // real capture from the website
 *     dashboard?: { nav:[str], kpis:[{label,value,delta}], rows:[{title,meta,status}], chartTitle },
 *     focus?: "kpis" | "chart" | "rows" | "button" | null,   // camera push target
 *     cursor?: true, clickLabel?: "Automate",  callout?: "text"
 *   }
 * prompt-box: glowing input, prompt types on VO, send click, results fan out.
 *   props: { prompt, placeholder?, results?: [ {image?:path, label?:str} ], style?: "pill"|"panel" }
 */
(function () {
  const { h, fx } = window.EM;

  function dashboard(p, rng) {
    const d = p.dashboard || {};
    const nav = d.nav || ["Overview", "Workflows", "Insights", "Team", "Settings"];
    const kpis = d.kpis || [
      { label: "Active users", value: "12,480", delta: "+18%" },
      { label: "Time saved", value: "342h", delta: "+42%" },
      { label: "Accuracy", value: "99.2%", delta: "+3.1%" },
    ];
    const rows = d.rows || [
      { title: "Weekly report generated", meta: "2 min ago", status: "Done" },
      { title: "Invoices reconciled", meta: "8 min ago", status: "Done" },
      { title: "New lead scored", meta: "12 min ago", status: "Live" },
      { title: "Sync with CRM", meta: "20 min ago", status: "Queued" },
    ];
    const side = h(
      "div",
      { class: "ui-side" },
      h("div", { class: "ui-brand" }, p.brandMark ? h("img", { src: p.brandMark }) : h("div", { class: "ui-dot" }), h("span", {}, p.appName || "")),
      ...nav.map((n, i) => h("div", { class: "ui-nav" + (i === 0 ? " on" : "") }, h("span", { class: "ui-nav-ic" }), n))
    );
    const kpiEls = kpis.slice(0, 3).map((k) =>
      h("div", { class: "ui-kpi" }, h("div", { class: "ui-kpi-l" }, k.label), h("div", { class: "ui-kpi-v" }, k.value), h("div", { class: "ui-kpi-d" }, k.delta || ""))
    );
    const bars = Array.from({ length: 14 }, (_, i) => 30 + Math.round(rng() * 60 + i * 2.5));
    const chart = h(
      "div",
      { class: "ui-chart" },
      h("div", { class: "ui-chart-t" }, d.chartTitle || "Performance"),
      h("div", { class: "ui-bars" }, ...bars.map((b) => h("div", { class: "ui-bar", style: { height: b + "%" } })))
    );
    const list = h(
      "div",
      { class: "ui-list" },
      ...rows.slice(0, 4).map((r) =>
        h("div", { class: "ui-row" }, h("div", { class: "ui-row-ic" }), h("div", { class: "ui-row-t" }, h("b", {}, r.title), h("span", {}, r.meta)), h("div", { class: "ui-status " + String(r.status).toLowerCase() }, r.status))
      )
    );
    const btn = h("div", { class: "ui-cta" }, p.clickLabel || "Run");
    const head = h("div", { class: "ui-head" }, h("div", { class: "ui-h1" }, d.title || p.title || "Overview"), btn);
    const main = h("div", { class: "ui-main" }, head, h("div", { class: "ui-kpis" }, ...kpiEls), h("div", { class: "ui-grid" }, chart, list));
    const body = h("div", { class: "ui-body" }, side, main);
    return { body, kpiEls, chart, bars: chart.querySelectorAll(".ui-bar"), list, rows: list.querySelectorAll(".ui-row"), btn };
  }

  EM.scene("ui-window", {
    ownsCamera: true,
    build(ctx) {
      const p = ctx.props;
      const { tl, start, dur } = ctx;
      const stage3d = h("div", { style: { position: "absolute", inset: 0, perspective: "2400px", display: "flex", alignItems: "center", justifyContent: "center" } });
      const rig = h("div", { class: "ui-rig", style: { transformStyle: "preserve-3d" } });
      const win = h("div", { class: "ui-win em-card" });
      const bar = h(
        "div",
        { class: "ui-bar-top" },
        h("div", { class: "ui-lights" }, h("i"), h("i"), h("i")),
        p.frame === "app" ? h("div", { class: "ui-title" }, p.title || "") : h("div", { class: "ui-url" }, p.url || "")
      );
      win.appendChild(bar);
      let parts = {};
      if (p.screenshot) {
        const img = h("img", { src: p.screenshot, class: "ui-shot" });
        win.appendChild(h("div", { class: "ui-shot-wrap" }, img));
        parts.shot = img;
      } else {
        parts = dashboard(p, ctx.rng);
        win.appendChild(parts.body);
      }
      rig.appendChild(win);
      stage3d.appendChild(rig);
      ctx.cam.appendChild(stage3d);

      // Arrival: rises from below, tilted back, settles. Then a slow push toward focus.
      const t0 = start + 0.05;
      // Screenshots carry small real UI text: land bigger and tilted (T26 plane), then push.
      const landScale = parts.shot ? 1.02 : 0.86;
      tl.fromTo(rig, { y: 380, rotationX: 38, rotationZ: -3, scale: landScale * 0.95, opacity: 0 }, { y: 0, rotationX: parts.shot ? 8 : 0, rotationY: parts.shot ? -8 : 0, rotationZ: 0, scale: landScale, opacity: 1, duration: 1.2, ease: "expo.out" }, t0);
      if (parts.kpiEls) {
        fx.cardIn(tl, parts.kpiEls, t0 + 0.45, { y: 40, rx: 0, z: 0, stagger: 0.07, dur: 0.7 });
        tl.fromTo(parts.bars, { scaleY: 0 }, { scaleY: 1, duration: 0.9, stagger: 0.03, ease: "expo.out", transformOrigin: "50% 100%" }, t0 + 0.7);
        tl.fromTo(parts.rows, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: "expo.out" }, t0 + 0.8);
      }
      // Camera push: bring the focus region's centre to frame centre at scale s.
      const focus = p.focus || (parts.shot ? "top" : "kpis");
      const targets = { kpis: parts.kpiEls && parts.kpiEls[1], chart: parts.chart, rows: parts.list, button: parts.btn };
      const scales = { kpis: 1.3, chart: 1.4, rows: 1.45, button: 1.9, top: parts.shot ? 1.5 : 1.2 };
      let fx0 = 0, fy0 = 0, s = scales[focus] || 0.92;
      if (targets[focus]) {
        const c = fx.layoutCenter(targets[focus], win);
        fx0 = -(c.x - win.offsetWidth / 2) * s;
        fy0 = -(c.y - win.offsetHeight / 2) * s;
      } else if (focus === "top") fy0 = 0.22 * win.offsetHeight * s;
      const pushAt = t0 + 1.3;
      tl.to(rig, { x: fx0, y: fy0, scale: s, rotationX: 0, rotationY: -3, duration: Math.max(1.2, dur - 1.3), ease: "power2.inOut" }, pushAt - 0.2);

      if (p.cursor !== false && parts.btn) {
        const c = fx.cursor(win, { x: 1200, y: 780 });
        const ct = pushAt + Math.max(0.6, (dur - 1.5) * 0.35);
        const bc = fx.layoutCenter(parts.btn, win);
        fx.cursorMove(tl, c, bc.x - 6, bc.y - 4, ct, { dur: 0.9 });
        fx.cursorClick(tl, c, ct + 0.95, { target: parts.btn });
        tl.to(parts.btn, { backgroundColor: fx.cssVar(parts.btn, "--accent2") || "#e84dbe", duration: 0.2 }, ct + 1.0);
      }
      if (p.callout) {
        const cal = h("div", { class: "em-chip", style: { position: "absolute", right: "120px", top: "140px", zIndex: 5 } }, EM.icon("sparkles", 28), p.callout);
        ctx.cam.appendChild(cal);
        fx.pop(tl, cal, start + Math.min(dur - 1, 1.8));
      }
    },
  });

  EM.scene("prompt-box", {
    build(ctx) {
      const p = ctx.props;
      const { tl, start, dur } = ctx;
      const wrap = h("div", { style: { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "60px" } });
      const boxWrap = h("div", { style: { position: "relative" } });
      const halo = h("div", { class: "em-halo" });
      const box = h("div", { class: "pb-box" });
      const text = h("div", { class: "pb-text" });
      const send = h("div", { class: "pb-send", html: '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
      box.append(h("div", { class: "pb-plus" }, "+"), text, send);
      boxWrap.append(halo, box);
      wrap.appendChild(boxWrap);
      ctx.cam.appendChild(wrap);

      const t0 = start + 0.1;
      tl.fromTo(boxWrap, { scale: 0.7, y: 40, opacity: 0, filter: "blur(16px)" }, { scale: 1, y: 0, opacity: 1, filter: "blur(0px)", duration: 0.9, ease: "expo.out" }, t0);
      tl.fromTo(halo, { opacity: 0, scale: 0.8 }, { opacity: 0.9, scale: 1, duration: 1.2, ease: "power2.out" }, t0 + 0.2);
      tl.to(halo, { backgroundPosition: "200% 50%", duration: dur, ease: "none" }, t0);
      const typeStart = t0 + 0.6;
      const typeDur = Math.min(Math.max(1.2, p.prompt.length / 30), dur * 0.5);
      fx.typeText(tl, text, p.prompt, typeStart, { dur: typeDur });
      const c = fx.cursor(ctx.cam, { x: 1500, y: 900, hand: true });
      const clickAt = typeStart + typeDur + 0.45;
      const sc = fx.layoutCenter(send, ctx.cam);
      fx.cursorMove(tl, c, sc.x - 6, sc.y - 4, typeStart + typeDur - 0.4, { dur: 0.8 });
      fx.cursorClick(tl, c, clickAt, { target: send });
      tl.to(c, { opacity: 0, duration: 0.25 }, clickAt + 0.5);

      const results = (p.results || []).slice(0, 4);
      if (results.length) {
        const row = h("div", { style: { display: "flex", gap: "28px" } });
        const cards = results.map((r) => {
          const card = h("div", { class: "em-card pb-card" }, r.image ? h("img", { src: r.image }) : h("div", { class: "pb-card-l" }, EM.icon(r.icon || "sparkles", 44), h("span", {}, r.label || "")));
          row.appendChild(card);
          return card;
        });
        wrap.appendChild(row);
        tl.to(boxWrap, { y: -30, scale: 0.86, duration: 0.8, ease: "expo.inOut" }, clickAt + 0.2);
        fx.cardIn(tl, cards, clickAt + 0.45, { y: 140, rx: 30, stagger: 0.09 });
      }
    },
  });
})();

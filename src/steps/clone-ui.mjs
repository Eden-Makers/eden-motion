// clone-ui: capture a live website or local HTML widget, reverse-engineer its timing and easing
// curves, write research/clone-<name>/spec.{json,md}, and scaffold a deterministic HyperFrames
// custom scene at projects/<slug>/custom-scenes/<name>.js.
import fs from "node:fs";
import path from "node:path";
import { log, warn, slugify } from "../lib/util.mjs";
import { capturePage } from "../lib/reanimate/capture.mjs";
import { analyzeTrack } from "../lib/reanimate/easing.mjs";
import { computeActivity } from "../lib/reanimate/compare.mjs";

function deriveName(url) {
  try {
    if (/^[a-z]+:\/\//i.test(url)) {
      const u = new URL(url);
      const tail = u.pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop() || "";
      return slugify([u.hostname.replace(/^www\./, ""), tail].filter(Boolean).join("-")) || "cloned-ui";
    }
  } catch {}
  return slugify(path.basename(String(url), path.extname(String(url)))) || "cloned-ui";
}

function formatRangeEnd(durationMs) {
  const s = durationMs / 1000;
  const mins = Math.floor(s / 60);
  const rem = (s - mins * 60).toFixed(2);
  const remStr = Number(rem) < 10 ? "0" + rem : rem;
  return `${mins}:${remStr}`;
}

function buildStarterScene({ name, url, trigger, fidelity, inspect, curves, activity }) {
  const rect = inspect?.target?.rect || [0, 0, 960, 560];
  const boxW = Math.max(360, Math.min(1440, rect[2] || 960));
  const boxH = Math.max(220, Math.min(820, rect[3] || 560));

  const textNodes = (inspect?.nodes || [])
    .filter((n) => n.text && n.text.length > 1)
    .slice(0, 6)
    .map((n) => ({
      el: n.el,
      text: n.text.replace(/[\u2013\u2014]/g, "-"),
      fontSize: n.style?.["font-size"] || null,
      fontWeight: n.style?.["font-weight"] || null,
      color: n.style?.color || null,
    }));

  const primaryCurve = curves.find((c) => c.bestFit && c.prop !== "opacity") || curves[0] || null;
  const delayS = primaryCurve ? +(primaryCurve.delayMs / 1000).toFixed(3) : 0.12;
  const durS = primaryCurve?.bestFit?.durationMs
    ? +(primaryCurve.bestFit.durationMs / 1000).toFixed(3)
    : primaryCurve?.visibleDurationMs
      ? +(primaryCurve.visibleDurationMs / 1000).toFixed(3)
      : 0.45;
  const ease = primaryCurve?.bestFit?.gsap && primaryCurve.bestFit.gsap !== "none" ? primaryCurve.bestFit.gsap : "land";
  const dy = primaryCurve && (primaryCurve.prop === "y" || primaryCurve.prop === "translateY") ? Math.round(-primaryCurve.change) : 36;
  const dx = primaryCurve && (primaryCurve.prop === "x" || primaryCurve.prop === "translateX") ? Math.round(-primaryCurve.change) : 0;

  const titleDefault = textNodes[0]?.text || name;
  const subDefault = textNodes[1]?.text || "Captured UI twin";
  const itemsDefault = textNodes.slice(2, 5).map((n) => n.text);

  const curveComment = curves.length
    ? curves
        .slice(0, 6)
        .map(
          (c) =>
            `//   ${c.selector} [${c.prop}]: ${c.start} -> ${c.end}, delay ${c.delayMs}ms, dur ~${c.bestFit?.durationMs ?? c.visibleDurationMs}ms, fit ${c.bestFit?.name ?? "n/a"} (rmse ${c.bestFit?.rmse ?? "n/a"})`
        )
        .join("\n")
    : "//   (no DOM track curves measured; refine with --track selectors)";

  const windowComment = activity?.window
    ? `// Motion window: active ${activity.window.startS}s - ${activity.window.endS}s, peak ${activity.window.peakS}s`
    : "// Motion window: not measured";

  return `// Deterministic HyperFrames custom scene scaffolded by eden-motion clone-ui.
// Source: ${url} (trigger: ${trigger}, fidelity: ${fidelity})
${windowComment}
// Measured curves:
${curveComment}
// Rules: pure function of ctx.tl; deterministic only (use ctx.rng, no wall-clock, timers, or CSS animations).
(function () {
  const { h, fx } = window.EM;

  EM.scene(${JSON.stringify(name)}, {
    build(ctx) {
      const { tl, start, dur, props: p, cam } = ctx;
      const title = p.title || ${JSON.stringify(titleDefault)};
      const sub = p.sub || ${JSON.stringify(subDefault)};
      const items = Array.isArray(p.items) ? p.items : ${JSON.stringify(itemsDefault)};

      const root = h(
        "div",
        {
          class: "em-card",
          style: {
            width: "${boxW}px",
            minHeight: "${boxH}px",
            padding: "48px 56px",
            borderRadius: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "20px",
            boxSizing: "border-box",
          },
        },
        h("div", { class: "em-display md", "data-clone-role": "title" }, title),
        h("div", { class: "em-sub", "data-clone-role": "sub" }, sub),
        items.length
          ? h(
              "div",
              { style: { display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "8px" } },
              ...items.map((txt) => h("span", { class: "em-chip", "data-clone-role": "item" }, txt))
            )
          : null
      );

      cam.appendChild(root);

      const titleEl = root.querySelector('[data-clone-role="title"]');
      const subEl = root.querySelector('[data-clone-role="sub"]');
      const itemEls = [...root.querySelectorAll('[data-clone-role="item"]')];

      const enterT = start + ${delayS};
      const enterDur = Math.min(${durS}, Math.max(0.25, dur * 0.45));

      tl.fromTo(
        root,
        { opacity: 0, x: ${dx}, y: ${dy}, scale: 0.98 },
        { opacity: 1, x: 0, y: 0, scale: 1, duration: enterDur, ease: ${JSON.stringify(ease)} },
        enterT
      );

      fx.focusIn(tl, [titleEl, subEl], enterT + 0.06, { dur: Math.min(0.42, enterDur), stagger: 0.1, ease: "land" });
      if (itemEls.length) {
        fx.pop(tl, itemEls, enterT + 0.22, { stagger: 0.08 });
      }
    },
  });
})();
`;
}

export async function cloneUi(
  projectDir,
  url,
  {
    selector = null,
    target = null,
    trigger = "load",
    duration = 3000,
    fps = 25,
    gl = false,
    track = [],
    name = null,
    fidelity = "motion",
    viewport = { width: 1440, height: 900 },
    clock = "virtual",
    pad = 0,
    clip = null,
    scrollTo = null,
    path: movePath = null,
    hoverAt = null,
    preJs = null,
    colorScheme = null,
    overwrite = false,
  } = {}
) {
  if (!url) throw new Error("usage: eden-motion clone-ui <slug> <url|file.html> [options]");
  const sceneName = slugify(name || deriveName(url)) || "cloned-ui";
  const captureDir = path.join(projectDir, "research", `clone-${sceneName}`);
  fs.mkdirSync(captureDir, { recursive: true });

  const trackSelectors = Array.isArray(track)
    ? track.map((s) => String(s).trim()).filter(Boolean)
    : typeof track === "string"
      ? track.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  if (selector && !trackSelectors.includes(selector)) trackSelectors.unshift(selector);

  log(`clone-ui "${sceneName}": capturing ${url} (trigger=${trigger}, ${duration}ms @ ${fps}fps, clock=${clock}${gl ? ", gl=on" : ""})...`);
  const cap = await capturePage(url, captureDir, {
    selector,
    target: target || selector,
    trigger,
    duration,
    fps,
    gl,
    track: trackSelectors,
    viewport,
    clock,
    pad,
    clip,
    scrollTo,
    path: movePath,
    hoverAt,
    preJs,
    colorScheme,
  });

  // Fit easings on tracked DOM elements
  const curves = [];
  if (cap.trackPath && fs.existsSync(cap.trackPath)) {
    const props = ["x", "y", "opacity", "scale", "translateX", "translateY", "rotate"];
    for (const sel of trackSelectors) {
      for (const prop of props) {
        try {
          const fit = analyzeTrack(cap.trackPath, { selector: sel, prop });
          if (fit.samples >= 4 && (Math.abs(fit.change) > 0.005 || fit.visibleDurationMs > 0)) {
            curves.push({ selector: sel, prop, ...fit });
          }
        } catch {}
      }
    }
  }

  // Fit easings on animated non-clock GL channels if --gl was enabled
  const glCurves = [];
  const glTrackPath = path.join(captureDir, "gl-track.json");
  if (gl && fs.existsSync(glTrackPath)) {
    const glTrack = JSON.parse(fs.readFileSync(glTrackPath, "utf8"));
    const keys = Object.keys(glTrack.channels || {}).filter((k) => glTrack.channels[k].kind !== "clock");
    for (const key of keys.slice(0, 20)) {
      try {
        const fit = analyzeTrack(glTrack, { channel: key });
        if (fit.samples >= 4 && Math.abs(fit.change) > 1e-5) {
          glCurves.push({ channel: key, kind: glTrack.channels[key].kind, ...fit });
        }
      } catch {}
    }
  }

  // Compute activity curve on captured frames
  let activity = null;
  if (cap.framesDir && fs.existsSync(cap.framesDir)) {
    try {
      activity = computeActivity(cap.framesDir, { fps });
    } catch (e) {
      warn("clone-ui activity analysis skipped: " + e.message.slice(0, 120));
    }
  }

  const slug = path.basename(path.resolve(projectDir));
  const verifyCmd = `eden-motion compare ${slug} research/clone-${sceneName}/video.mp4 --at 0:00-${formatRangeEnd(duration)} --fidelity ${fidelity}`;

  const spec = {
    name: sceneName,
    url,
    selector,
    trigger,
    duration,
    fps,
    clock,
    fidelity,
    gl,
    captureDir: path.relative(projectDir, captureDir),
    videoPath: cap.videoPath ? path.relative(projectDir, cap.videoPath) : null,
    libs: cap.inspect?.libs || [],
    fonts: cap.inspect?.fonts || [],
    palette: {
      bodyBg: cap.inspect?.bodyBg || null,
      bodyColor: cap.inspect?.bodyColor || null,
    },
    target: cap.inspect?.target || null,
    animations: cap.inspect?.animations || [],
    keyframes: (cap.inspect?.keyframes || []).slice(0, 30),
    nodes: (cap.inspect?.nodes || []).slice(0, 40),
    curves,
    glSummary: cap.glSummary,
    glCurves,
    activity: activity
      ? {
          frames: activity.frames,
          fps: activity.fps,
          window: activity.window,
          windows: activity.windows,
          curve: activity.activity,
        }
      : null,
    verifyCmd,
  };

  const specJson = path.join(captureDir, "spec.json");
  fs.writeFileSync(specJson, JSON.stringify(spec, null, 2) + "\n");

  const mdLines = [
    `# Clone Spec: ${sceneName}`,
    ``,
    `- Source: ${url}`,
    `- Trigger: ${trigger} | Duration: ${duration} ms @ ${fps} fps | Clock: ${clock} | Fidelity: ${fidelity}`,
    `- Selector: ${selector || "(full viewport)"}`,
    `- Detected libs: ${spec.libs.length ? spec.libs.join(", ") : "none"}`,
    `- Loaded fonts: ${spec.fonts.length ? spec.fonts.slice(0, 8).join(", ") : "system"}`,
    `- Surface: bg ${spec.palette.bodyBg || "unknown"}, fg ${spec.palette.bodyColor || "unknown"}`,
    ``,
  ];
  if (activity?.window) {
    mdLines.push(
      `## Motion Activity Window`,
      `- Active span: ${activity.window.startS}s to ${activity.window.endS}s (duration ${activity.window.durationS}s, peak ${activity.window.peakS}s at frame #${activity.window.peak})`,
      `- Bursts: ${activity.windows.map((w) => `${w.startS}-${w.endS}s (peak ${w.peakS}s)`).join(", ") || "none"}`,
      ``
    );
  }
  if (curves.length) {
    mdLines.push(
      `## Tracked Element Easings`,
      `| selector | prop | from -> to | delay | dur | overshoot | best fit (GSAP) | rmse |`,
      `|---|---|---|---|---|---|---|---|`,
      ...curves.map(
        (c) =>
          `| \`${c.selector}\` | ${c.prop} | ${c.start} -> ${c.end} | ${c.delayMs}ms | ${c.bestFit?.durationMs ?? c.visibleDurationMs}ms | ${c.overshootPct}% | ${c.bestFit ? `${c.bestFit.name} (${c.bestFit.gsap})` : c.verdict} | ${c.bestFit?.rmse ?? "-"} |`
      ),
      ``
    );
  }
  if (spec.animations.length) {
    mdLines.push(
      `## Captured CSS / WAAPI Animations (${spec.animations.length})`,
      ...spec.animations.slice(0, 15).map(
        (a) => `- ${a.kind} \`${a.name || "unnamed"}\` on \`${a.target}\`: dur ${a.timing?.duration ?? "?"}ms, delay ${a.timing?.delay ?? 0}ms, easing ${a.timing?.easing ?? "?"}`
      ),
      ``
    );
  }
  if (glCurves.length) {
    mdLines.push(
      `## Animated GPU Channels (${glCurves.length})`,
      ...glCurves.map((c) => `- \`${c.channel}\` (${c.kind}): ${c.start} -> ${c.end}, ${c.verdict}`),
      ``
    );
  }
  mdLines.push(
    `## Verify Command`,
    "```bash",
    verifyCmd,
    "```",
    ``
  );

  const specMd = path.join(captureDir, "spec.md");
  fs.writeFileSync(specMd, mdLines.join("\n"));

  // Generate clean deterministic HyperFrames custom-scene starter
  const customDir = path.join(projectDir, "custom-scenes");
  fs.mkdirSync(customDir, { recursive: true });
  const sceneFile = path.join(customDir, `${sceneName}.js`);
  if (!fs.existsSync(sceneFile) || overwrite) {
    fs.writeFileSync(sceneFile, buildStarterScene({ name: sceneName, url, trigger, fidelity, inspect: cap.inspect, curves, activity }));
  } else {
    warn(`custom-scenes/${sceneName}.js already exists (pass overwrite: true to replace)`);
  }

  log(`clone-ui "${sceneName}": ${curves.length} curve(s) fitted -> ${path.relative(projectDir, specMd)}`);
  log(`starter scene: ${path.relative(projectDir, sceneFile)}`);
  log(`verify: ${verifyCmd}`);

  return {
    name: sceneName,
    captureDir,
    specJson,
    specMd,
    sceneFile,
    verifyCmd,
    curves,
    glCurves,
    activity,
    glSummary: cap.glSummary,
  };
}

#!/usr/bin/env node
// eden-motion CLI. Every step reads and writes plain JSON in the project folder, so any agent
// harness (Claude Code, Codex, Gemini CLI, Cursor, a cron job) can run, inspect and edit it.
import dns from "node:dns";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { log, slugify, writeJSON, readJSON, run } from "../src/lib/util.mjs";
import { loadEnv, REPO } from "../src/lib/env.mjs";

// Node's fetch races IPv6 and IPv4 with a 250 ms budget per address; on a slow or flaky network
// every attempt times out ("fetch failed", ETIMEDOUT after ~2 s) where curl simply waits. Connect
// over IPv4 the plain way: every API here answers on it.
dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);

const HELP = `eden-motion - company name in, finished motion-graphics brand film out

USAGE
  eden-motion new "<Company>" [--url https://...] [--duration 60] [--lang en] [--theme saas-light|saas-dark|glow|cinematic]
                  [--voice brian|george|sarah|alice|matilda|daniel|<id>] [--structure problem-solution|launch|manifesto]
                  [--notes "client notes"] [--video (allow Seedance 2.0 AI clips)] [--style burnwe|launch|higgsfield|relate]
                  [--cut-grid 1.0 (metronome cuts every N s; relate default 1.0)] [--fps 24|30]
                  [--dir <projects root>]
  eden-motion run <project> [--from <step>] [--to <step>] [--draft]   full pipeline (research -> qc)
  eden-motion <step> <project> [options]

STEPS (in order)
  research     find site, capture it, extract brand.json + logo/fonts/screenshots
  script       write script.json (narration lines + shot ideas)
  vo           ElevenLabs voiceover with word timings -> vo.json, audio/vo.mp3
  ref          <slug> <url|file>...  analyse reference film(s) -> research/ref-style.md (storyboard copies its style)
  storyboard   map lines to scenes/props/transitions -> storyboard.json  [--variants 3: product/type/metaphor-led]
  stills       one settled frame per scene + Gemini art-director review, BEFORE rendering motion [--variants]
  pick         <slug> <n>  make storyboard.v<n>.json the storyboard
  note         <slug> "slow every zoom to 0.7x; hard cut into s5; push in on the button"  director notes
  assets       generate images for "gen:" props (Nano Banana Pro 2K)
  blender      render "blender:<template>?k=v" props headless into transparent webm plates [--preview] [--force]
               templates: chrome-object (object=block|screw|screws3|ring|rodblock), card-stack (action=collapse|flyoff|fan),
               layers-3d (images=a.png,b.mp4 layout=stack|row|fan|floor move=dolly|orbit|tilt|float fstop=2.8 focus=i)
  audio        VO + music + ambience + layered SFX -> audio/stems/<layer>.wav + audio/mix.wav
               layers: vo, music, ambience, sfx_transitions, sfx_ui, sfx_foley, sfx_accents
               [--sfx-source local|openverse (fresh CC0/CC-BY palette per film, picked by a code score)]
               [--judge-sfx (optional: Gemini listens to the top 4 candidates per sound; extra API calls)]
               [--ambience "rain on window"] [--no-openverse] [--no-music]
               [--stingers (accent thumps + logo sting composed in code in the music's key; needs uv)]
               no ElevenLabs music? a bed is composed in code as a fallback (audio/music-code.wav)
  new flags    --format 16:9|4:5|1:1|9:16  --no-images (type, UI, diagrams and Blender plates only)
  sync         snap cuts within 120 ms of a music beat onto the beat (frame grid), then re-mix [--tol 0.12]
  remix        <slug> --music -3 --sfx +2 --ambience off --sfx-foley -4   rebalance stems -> mix.wav (no regeneration)
  preview      build comp/ and open HyperFrames Studio preview
  render       --draft (fast, no blur) or final (true shutter motion blur, --slow 4..8) [--shutter-phase center|forward]
  qc           Gemini creative-director review -> renders/qc.json
  critique     watch-your-own-frames loop: contact/phone/strip sheets + measured pops, dead air,
               variety gaps, hook; harsh 1-10 rubric; appends renders/review_log.md [--no-ai] [--file]
               [--against ref.mp4] scores the reference with the same rubric and prints the delta
  measure      frame-accurate checks of the composition, no render needed: reading time per text block,
               text clipped by the frame or outside the safe margin, small text, ease tails that freeze
               (< 0.5 px/frame), glyph judder and letterform drift under scale -> renders/measure.json [--no-ink]
               [--video renders/final.mp4: measure the ink windows on the real render too]
  compare      <slug> <ref.mp4> side by side + frame pairs + SSIM vs a reference film [--file]
  review       HTML review sheet (frames per shot, VO, props, prompts, QC) [--deliver <drive folder>]
  build        only build comp/index.html from storyboard.json
  setup        first-run wizard: installs deps + skill links, asks for missing keys (masked, saved to .env),
               verifies them live, runs a 20 s smoke render [--yes non-interactive]
  doctor       check tools and keys [--json for agents] [--verify pings the APIs]

ENV / KEYS: GEMINI_API_KEY, ELEVENLABS_API_KEY (read from env, repo .env or ~/.zshrc)`;

const STEPS = ["research", "script", "vo", "storyboard", "assets", "blender", "audio", "sync", "render", "qc", "review"];

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      out[k] = v;
    } else out._.push(a);
  }
  return out;
}

function projectsRoot(args) {
  return path.resolve(args.dir || process.env.EDEN_MOTION_PROJECTS || path.join(REPO, "projects"));
}

function resolveProject(p, args) {
  if (!p) throw new Error("project path or slug required");
  if (fs.existsSync(p)) return path.resolve(p);
  const cand = path.join(projectsRoot(args), p);
  if (fs.existsSync(cand)) return cand;
  throw new Error(`project not found: ${p}`);
}

async function step(name, dir, args) {
  const t0 = Date.now();
  log(`== ${name} ==`);
  switch (name) {
    case "research":
      await (await import("../src/steps/research.mjs")).research(dir, { url: args.url });
      break;
    case "script":
      await (await import("../src/steps/script.mjs")).script(dir, { duration: args.duration && +args.duration, structure: args.structure });
      break;
    case "vo":
      await (await import("../src/steps/vo.mjs")).vo(dir, { voice: args.voice });
      break;
    case "storyboard": {
      const m = await import("../src/steps/storyboard.mjs");
      if (args.variants && +args.variants > 1) await m.storyboardVariants(dir, { n: +args.variants });
      else await m.storyboard(dir);
      break;
    }
    case "stills": {
      const m = await import("../src/steps/stills.mjs");
      const files = args.variants ? fs.readdirSync(dir).filter((f) => /^storyboard\.v\d+\.json$/.test(f)).sort() : [args.storyboard || "storyboard.json"];
      for (const f of files) await m.stills(dir, { storyboardFile: f, tag: f === "storyboard.json" ? "" : f.match(/v\d+/)[0], review: !args["no-review"] });
      break;
    }
    case "pick": {
      const n = args._[2];
      const src = path.join(dir, `storyboard.v${n}.json`);
      if (!fs.existsSync(src)) throw new Error(`no ${src}`);
      fs.copyFileSync(src, path.join(dir, "storyboard.json"));
      log(`storyboard.json <- storyboard.v${n}.json. Next: assets -> audio -> render --draft`);
      break;
    }
    case "ref":
      await (await import("../src/steps/ref.mjs")).ref(dir, args._.slice(2));
      break;
    case "note":
      await (await import("../src/steps/note.mjs")).note(dir, args._.slice(2).join(" "));
      break;
    case "assets":
      await (await import("../src/steps/assets.mjs")).assets(dir);
      break;
    case "blender":
      await (await import("../src/steps/blender.mjs")).blender(dir, { preview: !!args.preview, force: !!args.force });
      break;
    case "compare":
      await (await import("../src/steps/compare.mjs")).compare(dir, args._[2], { file: args.file });
      break;
    case "audio":
      await (await import("../src/steps/audio.mjs")).audio(dir, { noMusic: !!args["no-music"], sfxSource: args["sfx-source"], ambience: args.ambience, openverse: !args["no-openverse"], stingers: args.stingers ? true : undefined, judgeSfx: args["judge-sfx"] ? true : undefined });
      break;
    case "sync":
      await (await import("../src/steps/sync.mjs")).sync(dir, { tol: args.tol ? +args.tol : undefined });
      break;
    case "remix": {
      const { remix, LAYERS } = await import("../src/steps/audio.mjs");
      const gains = Object.fromEntries(Object.entries(args).filter(([k]) => k === "sfx" || LAYERS.includes(k.replace(/-/g, "_"))).map(([k, v]) => [k, v === "off" ? "off" : +v]));
      remix(dir, gains);
      log(`remix: audio/mix.wav rebuilt from stems (${JSON.stringify(gains)}). Next: render (audio is muxed at the end, a --draft re-render is enough)`);
      break;
    }
    case "build":
      await (await import("../src/steps/build.mjs")).build(dir, { slow: +args.slow || 1 });
      break;
    case "render":
      await (await import("../src/steps/render.mjs")).render(dir, { quality: args.draft ? "draft" : "final", slow: args.slow && +args.slow, fps: args.fps && +args.fps, workers: args.workers, uniform: !!args.uniform, hi: args.hi && +args.hi, resolution: args.resolution, shutterPhase: args["shutter-phase"] });
      break;
    case "qc":
      await (await import("../src/steps/qc.mjs")).qc(dir, { file: args.file });
      break;
    case "critique":
      if (args.against) await (await import("../src/steps/critique.mjs")).critiqueAgainst(dir, args.against, { file: args.file, noAi: !!args["no-ai"] });
      else await (await import("../src/steps/critique.mjs")).critique(dir, { file: args.file, noAi: !!args["no-ai"] });
      break;
    case "measure":
      await (await import("../src/steps/measure.mjs")).measure(dir, { fps: args.fps ? +args.fps : undefined, ink: !args["no-ink"], video: args.video ? path.resolve(dir, args.video) : null });
      break;
    case "review":
      await (await import("../src/steps/review.mjs")).review(dir, { deliver: args.deliver || process.env.EDEN_MOTION_DELIVER });
      break;
    case "preview": {
      const comp = await (await import("../src/steps/build.mjs")).build(dir, { slow: 1 });
      run("npx", ["-y", "hyperframes@0.8.72", "preview", "--background"], { cwd: comp, stdio: "inherit" });
      break;
    }
    default:
      throw new Error("unknown step " + name);
  }
  log(`${name} done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd, target] = args._;
  if (!cmd || cmd === "help" || args.help) return console.log(HELP);

  if (cmd === "doctor") {
    const { doctor } = await import("../src/steps/setup.mjs");
    const { ready } = await doctor({ json: !!args.json, verify: !!args.verify });
    if (!args.json) console.log(`${"projects root".padEnd(29)} ${projectsRoot(args)}`);
    process.exitCode = ready ? 0 : 1;
    return;
  }

  if (cmd === "setup") {
    const ok = await (await import("../src/steps/setup.mjs")).setup({ yes: !!args.yes });
    process.exitCode = ok ? 0 : 1;
    return;
  }

  if (cmd === "new") {
    const company = target;
    if (!company) throw new Error('usage: eden-motion new "<Company>"');
    const dir = path.join(projectsRoot(args), slugify(company));
    fs.mkdirSync(dir, { recursive: true });
    const brief = {
      company,
      url: args.url || null,
      duration: +(args.duration || 60),
      lang: args.lang || "en",
      theme: args.theme || null,
      voice: args.voice || "brian",
      structure: args.structure || null,
      notes: args.notes || null,
      video: !!args.video,
      style: args.style || null,
      format: args.format || null,
      noImages: !!args["no-images"],
      cutGrid: args["cut-grid"] ? +args["cut-grid"] : null,
      fps: args.fps ? +args.fps : null,
      sfxSource: args["sfx-source"] || null,
      ambience: typeof args.ambience === "string" ? args.ambience : null,
      stingers: !!args.stingers,
      created: new Date().toISOString(),
    };
    writeJSON(path.join(dir, "brief.json"), brief);
    log(`project created: ${dir}`);
    if (!args["no-run"]) {
      for (const s of STEPS) await step(s === "render" && args.draft ? "render" : s, dir, args);
    }
    return;
  }

  if (cmd === "run") {
    const dir = resolveProject(target, args);
    const from = args.from ? STEPS.indexOf(args.from) : 0;
    const to = args.to ? STEPS.indexOf(args.to) : STEPS.length - 1;
    for (const s of STEPS.slice(from, to + 1)) await step(s, dir, args);
    return;
  }

  await step(cmd, resolveProject(target, args), args);
}

main().catch((e) => {
  console.error("\x1b[31m[eden-motion] " + (e.stack || e.message) + "\x1b[0m");
  process.exit(1);
});

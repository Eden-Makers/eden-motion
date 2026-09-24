#!/usr/bin/env node
// eden-motion CLI. Every step reads and writes plain JSON in the project folder, so any agent
// harness (Claude Code, Codex, Gemini CLI, Cursor, a cron job) can run, inspect and edit it.
import fs from "node:fs";
import path from "node:path";
import { log, slugify, writeJSON, readJSON, run } from "../src/lib/util.mjs";
import { loadEnv, REPO } from "../src/lib/env.mjs";

const HELP = `eden-motion - company name in, finished motion-graphics brand film out

USAGE
  eden-motion new "<Company>" [--url https://...] [--duration 60] [--lang en] [--theme saas-light|saas-dark|glow|cinematic]
                  [--voice brian|george|sarah|alice|matilda|daniel|<id>] [--structure problem-solution|launch|manifesto]
                  [--notes "client notes"] [--video (allow Seedance 2.0 AI clips)] [--style burnwe|launch|higgsfield]
                  [--dir <projects root>]
  eden-motion run <project> [--from <step>] [--to <step>] [--draft]   full pipeline (research -> qc)
  eden-motion <step> <project> [options]

STEPS (in order)
  research     find site, capture it, extract brand.json + logo/fonts/screenshots
  script       write script.json (narration lines + shot ideas)
  vo           ElevenLabs voiceover with word timings -> vo.json, audio/vo.mp3
  storyboard   map lines to scenes/props/transitions -> storyboard.json
  assets       generate images for "gen:" props (Nano Banana Pro 2K)
  audio        music + SFX on engine cues + VO mix -> audio/mix.wav
  preview      build comp/ and open HyperFrames Studio preview
  render       --draft (fast, no blur) or final (true shutter motion blur, --slow 4..8)
  qc           Gemini creative-director review -> renders/qc.json
  review       HTML review sheet (frames per shot, VO, props, prompts, QC) [--deliver <drive folder>]
  build        only build comp/index.html from storyboard.json
  doctor       check keys and tools

ENV / KEYS: GEMINI_API_KEY, ELEVENLABS_API_KEY (read from env, repo .env or ~/.zshrc)`;

const STEPS = ["research", "script", "vo", "storyboard", "assets", "audio", "render", "qc", "review"];

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
    case "storyboard":
      await (await import("../src/steps/storyboard.mjs")).storyboard(dir);
      break;
    case "assets":
      await (await import("../src/steps/assets.mjs")).assets(dir);
      break;
    case "audio":
      await (await import("../src/steps/audio.mjs")).audio(dir, { noMusic: !!args["no-music"] });
      break;
    case "build":
      await (await import("../src/steps/build.mjs")).build(dir, { slow: +args.slow || 1 });
      break;
    case "render":
      await (await import("../src/steps/render.mjs")).render(dir, { quality: args.draft ? "draft" : "final", slow: args.slow && +args.slow, fps: args.fps && +args.fps, workers: args.workers, uniform: !!args.uniform, hi: args.hi && +args.hi });
      break;
    case "qc":
      await (await import("../src/steps/qc.mjs")).qc(dir, { file: args.file });
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
    const env = loadEnv();
    for (const k of ["GEMINI_API_KEY", "ELEVENLABS_API_KEY", "FAL_KEY"]) console.log(`${k.padEnd(20)} ${env[k] ? "ok" : "MISSING"}`);
    for (const t of ["ffmpeg", "ffprobe", "npx"]) console.log(`${t.padEnd(20)} ${run("which", [t], { allowFail: true }).status === 0 ? "ok" : "MISSING"}`);
    console.log(`${"projects root".padEnd(20)} ${projectsRoot(args)}`);
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

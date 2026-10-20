// setup + doctor: one list of requirements, read by humans (`doctor`, `setup`) and by agents
// (`doctor --json`). Every check says why it matters and how to fix it, so an agent can walk a new
// teammate through onboarding in plain language without knowing this codebase.
// Keys are typed by the person in their own terminal (`setup`), never pasted into an agent chat:
// the wizard masks input, writes the repo .env (gitignored, chmod 600) and verifies the key live.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { REPO, loadEnv } from "../lib/env.mjs";
import { run, log, warn } from "../lib/util.mjs";

const which = (t) => run("which", [t], { allowFail: true }).status === 0;
const ver = (cmd, args, re) => {
  const r = run(cmd, args, { allowFail: true });
  return r.status === 0 ? ((r.stdout || "") + (r.stderr || "")).match(re)?.[1] || "?" : null;
};

// level: required (nothing works without it), recommended (a main feature is off without it),
// optional (one feature). status: ok | missing.
export async function checks({ verify = false } = {}) {
  const env = loadEnv();
  const out = [];
  const add = (id, level, ok, why, fix, detail) => out.push({ id, level, status: ok ? "ok" : "missing", why, fix, ...(detail ? { detail } : {}) });

  const node = +process.versions.node.split(".")[0];
  add("node", "required", node >= 20, "runs the pipeline", "install Node 20+ (brew install node)", `v${process.versions.node}`);
  add("npm-deps", "required", fs.existsSync(path.join(REPO, "node_modules", "puppeteer-core")), "headless Chrome driver", `cd ${REPO} && npm install`);
  const ff = ver("ffmpeg", ["-version"], /ffmpeg version (\S+)/);
  add("ffmpeg", "required", !!ff && which("ffprobe"), "renders, motion blur, audio mix", "brew install ffmpeg", ff || undefined);
  const enc = ff ? run("ffmpeg", ["-hide_banner", "-encoders"], { allowFail: true }).stdout || "" : "";
  add("ffmpeg-vp9", "optional", /libvpx-vp9/.test(enc), "transparent 3D plates from Blender (VP9 alpha)", "brew reinstall ffmpeg (Homebrew builds include libvpx)");
  add("npx", "required", which("npx"), "runs HyperFrames (HTML to MP4)", "comes with Node");
  let chrome = null;
  try {
    chrome = (await import("../lib/browser.mjs")).findChrome();
  } catch {}
  add("chrome", "required", !!chrome, "captures every frame of the film", "install Google Chrome, or: npx @puppeteer/browsers install chrome-headless-shell@stable", chrome || undefined);

  const keyCheck = async (name, url, headers) => {
    if (!env[name]) return false;
    if (!verify) return true;
    try {
      const r = await fetch(url, { headers: headers(env[name]) });
      return r.ok ? true : `rejected (${r.status})`;
    } catch (e) {
      return `unreachable (${String(e.message).slice(0, 40)})`;
    }
  };
  const g = await keyCheck("GEMINI_API_KEY", "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", (k) => ({ "x-goog-api-key": k }));
  add("GEMINI_API_KEY", "required", g === true, "writes script and storyboard, generates images, reviews the film", "free key at https://aistudio.google.com/apikey, then run: eden-motion setup", typeof g === "string" ? g : undefined);
  const e = await keyCheck("ELEVENLABS_API_KEY", "https://api.elevenlabs.io/v1/user", (k) => ({ "xi-api-key": k }));
  add("ELEVENLABS_API_KEY", "recommended", e === true, "voiceover with word timings and generated music", "key at https://elevenlabs.io/app/settings/api-keys, then run: eden-motion setup", typeof e === "string" ? e : undefined);
  add("FAL_KEY", "optional", !!env.FAL_KEY, "AI video clips inside media frames (--video)", "key at https://fal.ai/dashboard/keys, then run: eden-motion setup");

  let bl = null;
  try {
    bl = (await import("./blender.mjs")).findBlender();
  } catch {}
  const blv = bl ? ver(bl, ["-b", "--factory-startup", "--version"], /Blender (\d+\.\d+(?:\.\d+)?)/) : null;
  add("blender", "optional", !!bl, "3D plates (chrome objects, acrylic card stacks) via blender: props", "install Blender 4.2+ from https://www.blender.org/download/ (or brew install --cask blender); set BLENDER=/path if it lives elsewhere", blv ? `${blv} at ${bl}` : undefined);
  add("uv", "optional", which("uvx") || which("uv"), "cue-locked stingers composed in code (audio --stingers)", "curl -LsSf https://astral.sh/uv/install.sh | sh  (or brew install uv)");
  const links = [".claude", ".codex", ".agents"].map((d) => path.join(os.homedir(), d, "skills", "eden-motion"));
  const linked = links.filter((l) => fs.existsSync(l));
  add("skill-links", "recommended", linked.length === links.length, "lets Claude Code, Codex, Gemini CLI, Cursor and opencode find the skill", `bash ${REPO}/install.sh`, linked.length ? `${linked.length}/${links.length} linked` : undefined);
  if (verify) {
    let ov = false;
    try {
      ov = (await fetch("https://api.openverse.org/v1/audio/?q=whoosh&page_size=1")).ok;
    } catch {}
    add("openverse", "optional", ov, "free sound effects and ambience (no key)", "check the network; the local sfx-library still works offline");
  }
  return out;
}

const ICON = { ok: "ok  ", required: "MISSING", recommended: "missing", optional: "-   " };

export async function doctor({ json = false, verify = false } = {}) {
  const list = await checks({ verify });
  const ready = list.every((c) => c.level !== "required" || c.status === "ok");
  if (json) {
    console.log(JSON.stringify({ ready, repo: REPO, checks: list }, null, 1));
    return { ready, list };
  }
  for (const c of list) {
    const mark = c.status === "ok" ? ICON.ok : ICON[c.level];
    console.log(`${mark.padEnd(8)} ${c.id.padEnd(20)} ${c.status === "ok" ? c.detail || "" : `${c.why}. Fix: ${c.fix}`}${c.status !== "ok" && c.detail ? ` [${c.detail}]` : ""}`);
  }
  console.log(ready ? "\nready. Optional items unlock extra features." : "\nnot ready: fix the MISSING lines (or run: eden-motion setup)");
  return { ready, list };
}

// masked prompt (shows * per char); falls back to a plain line when stdin is not a TTY
function askSecret(q) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin });
      rl.once("line", (l) => (rl.close(), resolve(l.trim())));
      process.stdout.write(q);
      return;
    }
    process.stdout.write(q);
    const buf = [];
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const onData = (d) => {
      for (const ch of d.toString("utf8")) {
        if (ch === "\r" || ch === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(buf.join("").trim());
        }
        if (ch === "\u0003") process.exit(130);
        if (ch === "\u007f") {
          if (buf.pop() !== undefined) process.stdout.write("\b \b");
        } else {
          buf.push(ch);
          process.stdout.write("*");
        }
      }
    };
    process.stdin.on("data", onData);
  });
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((r) => rl.question(q, (a) => (rl.close(), r(a.trim()))));
}

export function writeEnvKey(name, value, file = path.join(REPO, ".env")) {
  const lines = fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n") : [];
  const i = lines.findIndex((l) => new RegExp(`^\\s*(export\\s+)?${name}\\s*=`).test(l));
  if (i >= 0) lines[i] = `${name}=${value}`;
  else lines.splice(lines.length && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length, 0, `${name}=${value}`);
  fs.writeFileSync(file, lines.join("\n").replace(/\n*$/, "\n"), { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

// A 2-scene film built and snapshotted with no keys: proves Node, Chrome and HyperFrames work.
export async function smokeTest() {
  const dir = path.join(REPO, "projects", "_setup_demo");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "storyboard.json"), JSON.stringify({ theme: "saas-light", background: "none", flat: true, fps: 24, duration: 4, brand: {}, vo: { words: [] }, scenes: [
    { id: "s1", type: "editorial-headline", start: 0, duration: 1.5, tone: "paper", props: { lines: ["Your first", "eden-motion frame"], indent: [0, 0.2] } },
    { id: "s2", type: "logo-bars", start: 1.5, duration: 2.5, tone: "black", props: { name: "Edenmakers" } },
  ] }, null, 1));
  fs.writeFileSync(path.join(dir, "brand.json"), JSON.stringify({ name: "Edenmakers", colors: { accent: "#111111" } }));
  const { build } = await import("./build.mjs");
  const comp = await build(dir, { slow: 1, out: "comp" });
  const snap = path.join(comp, "snapshots");
  fs.rmSync(snap, { recursive: true, force: true });
  const r = run("npx", ["-y", "hyperframes@0.8.72", "snapshot", "--at", "1.2,3.6"], { cwd: comp, allowFail: true });
  const pngs = fs.existsSync(snap) ? fs.readdirSync(snap).filter((f) => f.endsWith(".png")) : [];
  if (r.status !== 0 || pngs.length < 2) throw new Error("snapshot failed: " + String(r.stderr || "").slice(-300));
  return path.join(snap, pngs.sort()[pngs.length - 1]);
}

export async function setup({ yes = false } = {}) {
  console.log(`eden-motion setup (${REPO})\nRe-run any time; it only asks for what is missing.\n`);
  if (!fs.existsSync(path.join(REPO, "node_modules", "puppeteer-core"))) {
    log("installing npm dependencies");
    run("npm", ["install", "--silent"], { cwd: REPO });
  }
  let list = await checks();
  if (list.find((c) => c.id === "skill-links").status !== "ok") {
    log("linking the skill for Claude Code, Codex and Agent Skills harnesses");
    run("bash", [path.join(REPO, "install.sh")], { allowFail: true });
  }
  const keys = list.filter((c) => /_KEY$/.test(c.id) && c.status !== "ok");
  if (keys.length && !yes) {
    console.log("API keys go into " + path.join(REPO, ".env") + " (gitignored, readable only by you).");
    for (const k of keys) {
      console.log(`\n${k.id} (${k.level}): ${k.why}.\n  ${k.fix.replace(/, then run: eden-motion setup$/, "")}`);
      const v = await askSecret(`  paste ${k.id} (Enter to skip): `);
      if (!v) continue;
      writeEnvKey(k.id, v);
      process.env[k.id] = v;
    }
  }
  // reload and verify live
  const { loadEnv: reload } = await import("../lib/env.mjs");
  reload(REPO);
  list = await checks({ verify: true });
  console.log("");
  for (const c of list) {
    const mark = c.status === "ok" ? ICON.ok : ICON[c.level];
    console.log(`${mark.padEnd(8)} ${c.id.padEnd(20)} ${c.status === "ok" ? c.detail || "" : `${c.why}. Fix: ${c.fix}`}${c.status !== "ok" && c.detail ? ` [${c.detail}]` : ""}`);
  }
  const blocking = list.filter((c) => c.level === "required" && c.status !== "ok");
  if (blocking.length) {
    warn(`not ready: ${blocking.map((c) => c.id).join(", ")}`);
    return false;
  }
  if (!yes) {
    const go = await ask("\nRun a 20 s smoke test (builds and snapshots a 2-shot film, no API calls)? [Y/n] ");
    if (/^n/i.test(go)) return true;
  }
  log("smoke test: build + snapshot");
  const png = await smokeTest();
  console.log(`\nready. Smoke frame: ${png}\nNext: eden-motion new "<Company>" --url https://site --duration 30   (or ask your agent: "make a motion graphics video for <Company>")`);
  return true;
}

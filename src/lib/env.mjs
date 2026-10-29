// Key resolution: process env -> project .env -> repo .env -> ~/.zshrc exports.
// Harness-agnostic on purpose: Codex, Claude Code and cron shells all see keys differently.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (v) out[m[1]] = v;
  }
  return out;
}

let cache = null;
export function loadEnv(projectDir) {
  if (cache && !projectDir) return cache;
  const merged = {
    ...parseEnvFile(path.join(os.homedir(), ".zshrc")),
    ...parseEnvFile(path.join(os.homedir(), ".zshrc.secrets")),
    ...parseEnvFile(path.join(os.homedir(), ".bashrc")),
    ...parseEnvFile(path.join(REPO, ".env")),
    ...(projectDir ? parseEnvFile(path.join(projectDir, ".env")) : {}),
    ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v)),
  };
  cache = merged;
  return merged;
}

export function key(name, { required = true } = {}) {
  const v = loadEnv()[name];
  if (!v && required) throw new Error(`Missing ${name}. Put it in env, ${REPO}/.env or ~/.zshrc`);
  return v;
}

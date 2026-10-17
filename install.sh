#!/usr/bin/env bash
# Install eden-motion for every agent harness on this machine:
#   Claude Code  -> ~/.claude/skills/eden-motion
#   Codex CLI    -> ~/.codex/skills/eden-motion
#   Agent Skills standard (Gemini CLI, Cursor, opencode, others) -> ~/.agents/skills/eden-motion
# plus a global `eden-motion` command. Skills are symlinks, so `git pull` updates everything.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL="$REPO/skills/eden-motion"

# The skill needs to know where the repo lives when installed elsewhere.
printf '%s\n' "$REPO" > "$SKILL/.repo-path"

for root in "$HOME/.claude/skills" "$HOME/.codex/skills" "$HOME/.agents/skills"; do
  mkdir -p "$root"
  ln -sfn "$SKILL" "$root/eden-motion"
  echo "linked $root/eden-motion"
done

(cd "$REPO" && npm install --silent)
mkdir -p "$HOME/.local/bin"
ln -sfn "$REPO/bin/eden-motion.mjs" "$HOME/.local/bin/eden-motion"
chmod +x "$REPO/bin/eden-motion.mjs"
echo "linked ~/.local/bin/eden-motion (make sure ~/.local/bin is on PATH)"
node "$REPO/bin/eden-motion.mjs" doctor || echo "next: eden-motion setup (asks for the missing keys, masked)"

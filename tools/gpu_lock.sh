#!/bin/bash
# usage: gpu_lock.sh <command...>
# Runs the command while holding one shared GPU lock. Blender (Metal), DepthPro (MPS) and Topaz
# crash or crawl when two of them run at once, so every heavy GPU job goes through here, and
# only one waits at a time. Lock: ${EM_GPU_LOCK:-${TMPDIR:-/tmp}/eden-motion-gpu.lock} (a directory
# holding the owner's pid; a lock whose owner is gone is taken over).
L="${EM_GPU_LOCK:-${TMPDIR:-/tmp}/eden-motion-gpu.lock}"
L="${L%/}"
until mkdir "$L" 2>/dev/null; do
  owner="$(cat "$L/pid" 2>/dev/null)"
  if [ -n "$owner" ] && ! kill -0 "$owner" 2>/dev/null; then rm -rf "${L:?}"; continue; fi
  sleep 5
done
echo $$ > "$L/pid"
trap 'rm -rf "${L:?}"' EXIT INT TERM
"$@"

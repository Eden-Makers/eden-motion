"""Upscale clean plates to 4K with the local Topaz Video app, and check the result for ghosts.

Run out of process, pinned:
  uv run --no-project --with numpy==2.2.6 --with opencv-python-headless==4.11.0.86 \
    python tools/upscale.py PLATES_DIR OUT_DIR [--fps 60] [--model prob-4] [--size 3840:2160] [--check]
  uv run ... python tools/upscale.py SRC.mp4 OUT_DIR ...        (a video works too, it is cut to PNG first)

Model: Proteus (prob-4) is the default. Iris (iris-3) paints ghosts on Seedance footage, double
edges that trail fast moves, so it needs --model iris-3 --allow-iris and then --check runs anyway.
Plates must be CLEAN: no text, no UI overlays, no grain, no lens finish. Upscale the live-action
plates, then render graphics, text and UI natively at 4K on top; upscaled text is always softer.

--check    after the run, every output frame is shrunk back to the source size and compared with the
           source frame. Frames whose error is far above the film's usual (median + 6 MAD, and at
           least 1.5x the median) are listed: look at those at full size, they are the ghosts.
Output is JPEG (quality 1, 4:4:4) frames OUT_DIR/%04d.jpg, ready for HyperFrames or ffmpeg.
Topaz stderr carries auth tokens: it always goes to OUT_DIR/topaz.log, never to the terminal.
Run it through tools/gpu_lock.sh (Blender, DepthPro and Topaz must not run together).
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

import cv2
import numpy as np

ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
ap.add_argument("src", help="folder of %04d.png plates, or a video")
ap.add_argument("out")
ap.add_argument("--fps", type=float, default=60)
ap.add_argument("--model", default="prob-4", help="Topaz model (default prob-4 = Proteus)")
ap.add_argument("--allow-iris", action="store_true", help="required for iris-* models (ghosts on Seedance footage)")
ap.add_argument("--size", default="3840:2160")
ap.add_argument("--scale", type=int, default=2)
ap.add_argument("--check", action="store_true", help="ghost check against the source (always on for iris)")
a = ap.parse_args()

T = os.environ.get("TOPAZ_APP", "/Applications/Topaz Video.app/Contents")
if not os.path.exists(f"{T}/MacOS/ffmpeg"):
    sys.exit(f"Topaz Video not found at {T} (set TOPAZ_APP)")
if a.model.startswith("iris") and not a.allow_iris:
    sys.exit("iris ghosts on Seedance footage: use prob-4 (default), or pass --allow-iris and look at the --check frames")
os.makedirs(a.out, exist_ok=True)

src = a.src
tmp = None
if os.path.isfile(src):
    tmp = tempfile.mkdtemp(prefix="em-up-")
    subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-start_number", "0", os.path.join(tmp, "%04d.png")], check=True)
    src = tmp
frames = sorted(f for f in os.listdir(src) if f.endswith(".png"))
if not frames:
    sys.exit("no %04d.png plates found")

env = dict(os.environ, TVAI_MODEL_DIR=f"{T}/Resources/models",
           TVAI_MODEL_DATA_DIR=os.path.expanduser("~/Library/Application Support/Topaz Labs LLC/Topaz Video/models"))
log = os.path.join(a.out, "topaz.log")
with open(log, "w") as lf:
    r = subprocess.run([f"{T}/MacOS/ffmpeg", "-hide_banner", "-y", "-framerate", str(a.fps), "-start_number", "0", "-i", os.path.join(src, "%04d.png"),
                        "-vf", f"tvai_up=model={a.model}:scale={a.scale}:device=-2:vram=1:instances=1,scale={a.size}:flags=lanczos",
                        "-start_number", "0", "-pix_fmt", "yuvj444p", "-q:v", "1", os.path.join(a.out, "%04d.jpg")], env=env, stdout=lf, stderr=lf)
done = len([f for f in os.listdir(a.out) if f.endswith(".jpg")])
print(f"topaz exit {r.returncode}, {done} of {len(frames)} frames -> {a.out} (log {log})")
if r.returncode != 0 or done != len(frames):
    sys.exit("upscale incomplete: see the log")

if a.check or a.model.startswith("iris"):
    err = []
    for i, f in enumerate(frames):
        s = cv2.imread(os.path.join(src, f))
        u = cv2.imread(os.path.join(a.out, f"{i:04d}.jpg"))
        d = cv2.resize(u, (s.shape[1], s.shape[0]), interpolation=cv2.INTER_AREA)
        err.append(float(np.abs(d.astype(np.float32) - s.astype(np.float32)).mean()))
    e = np.array(err)
    med = float(np.median(e))
    mad = float(np.median(np.abs(e - med))) or 0.05
    bad = [i for i, v in enumerate(e) if v > med + 6 * mad and v > 1.5 * med]
    print(json.dumps(dict(frames=len(e), median_error=round(med, 3), suspicious=bad[:40], note="look at these frames at full size: ghosts trail fast moves")))
    if bad and a.model.startswith("iris"):
        sys.exit(2)
if tmp:
    import shutil
    shutil.rmtree(tmp, ignore_errors=True)

"""Cut plates with speed ramps out of a high frame rate master (a cadence-repaired 240 fps shot).

Run out of process, pinned:
  uv run --no-project --with numpy==2.2.6 --with opencv-python-headless==4.11.0.86 \
    python tools/ramp.py SRC.mov OUT_DIR --start 0.30 --dur 3.30 --keys "0:1.6,0.5:1.6,1.0:0.45,2.1:0.45,2.7:1.6,3.3:1.4" \
      [--fps 60] [--src-fps 240] [--mp4 clip.mp4]
  uv run ... python tools/ramp.py --spec segments.json WORK_DIR [name ...]

Why: a speed ramp made by retiming a 24 fps file stutters and ghosts. Cut from a uniform 240 fps
master the nearest real frame is at most 2 ms off, so a ramp from 0.35x to 3x is smooth at 60 fps
without blending. One plate = (start in shot seconds, output seconds, speed keys [(output s, speed)]),
smoothstep between the keys. 1.0 is real time, 0.45 is slow motion, 2.0 is double speed.

--keys     "out_seconds:speed,..." (the first key must be at 0, the last at --dur)
--spec     JSON list of {"name", "shot", "start", "dur", "keys": [[s, speed], ...]}; each shot is
           WORK_DIR/<shot>_i240.mov, plates go to WORK_DIR/plates/<name>/%04d.png. A shot's
           WORK_DIR/<shot>.json (from cadence.py fix) supplies the frame count.
Writes OUT_DIR/%04d.png and OUT_DIR/retime.json {tau (shot seconds per output frame), idx (source
frame per output frame)}. --mp4 also encodes the plate (CRF 10, bt709, 60 fps, no audio).
Prints repeated frames: any repeat inside a motion is a stutter, raise --src-fps or lower the slow speed.
"""
import argparse
import json
import os
import subprocess
import sys

import cv2
import numpy as np


def speed_at(keys, u):
    for (u0, v0), (u1, v1) in zip(keys, keys[1:]):
        if u <= u1:
            x = (u - u0) / max(1e-9, u1 - u0)
            return v0 + (v1 - v0) * x * x * (3 - 2 * x)
    return keys[-1][1]


def cut(src, out, start, dur, keys, fps, src_fps, name, mp4=None):
    cap = cv2.VideoCapture(src)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    n = int(round(dur * fps))
    fine = 20
    us = np.arange(n * fine + 1) / (fps * fine)
    tau = start + np.concatenate([[0], np.cumsum([speed_at(keys, u) for u in us[:-1]])]) / (fps * fine)
    tau = tau[::fine][:n]
    idx = [int(round(t * src_fps)) for t in tau]
    if idx[-1] > total - 1:
        print(f"!! {name} runs {(idx[-1] - total + 1) / src_fps:.2f} s past the shot, clamped", file=sys.stderr)
        idx = [min(i, total - 1) for i in idx]
    os.makedirs(out, exist_ok=True)
    json.dump({"tau": tau.tolist(), "idx": idx, "fps": fps, "src_fps": src_fps}, open(os.path.join(out, "retime.json"), "w"))
    want = {}
    for o, j in enumerate(idx):
        want.setdefault(j, []).append(o)
    j = min(want)
    cap.set(cv2.CAP_PROP_POS_FRAMES, j)
    while j <= max(want):
        ok, fr = cap.read()
        if not ok:
            sys.exit(f"{name}: ran out of frames at {j}")
        for o in want.get(j, []):
            cv2.imwrite(os.path.join(out, f"{o:04d}.png"), fr, [cv2.IMWRITE_PNG_COMPRESSION, 1])
        j += 1
    rep = sum(1 for a, b in zip(idx, idx[1:]) if a == b)
    print(f"{name}: {n} frames, shot time {tau[0]:.2f} -> {tau[-1]:.2f} s of {total / src_fps:.2f} s, repeated frames {rep}")
    if mp4:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(fps), "-i", os.path.join(out, "%04d.png"), "-c:v", "libx264", "-crf", "10", "-preset", "medium",
                        "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-r", str(fps), "-an", mp4], check=True)


ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
ap.add_argument("src", help="master file, or with --spec the work dir")
ap.add_argument("out", nargs="*", help="output dir, or with --spec the plate names to cut (default all)")
ap.add_argument("--spec")
ap.add_argument("--start", type=float, default=0.0)
ap.add_argument("--dur", type=float)
ap.add_argument("--keys")
ap.add_argument("--fps", type=int, default=60)
ap.add_argument("--src-fps", type=int, default=240)
ap.add_argument("--mp4")
a = ap.parse_args()

if a.spec:
    work = a.src
    for seg in json.load(open(a.spec)):
        if a.out and seg["name"] not in a.out:
            continue
        cut(f"{work}/{seg['shot']}_i{a.src_fps}.mov", f"{work}/plates/{seg['name']}", seg["start"], seg["dur"], [tuple(k) for k in seg["keys"]], a.fps, a.src_fps, seg["name"])
else:
    if not (a.out and a.dur and a.keys):
        sys.exit("usage: ramp.py SRC OUT_DIR --start S --dur D --keys 'u:speed,...'")
    keys = [tuple(float(x) for x in k.split(":")) for k in a.keys.split(",")]
    cut(a.src, a.out[0], a.start, a.dur, keys, a.fps, a.src_fps, os.path.basename(a.out[0]), a.mp4)

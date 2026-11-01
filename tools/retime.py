"""Retime a slowed screen capture to smooth 60 fps and fill capture gaps with optical-flow midframes.

Run out of process, pinned:
  uv run --no-project --with numpy==2.2.6 --with opencv-python-headless==4.11.0.86 \
    python tools/retime.py SRC R OUT.mp4 [--fps 60] [--start S] [--end S] [--crf 12]

Why: recording a device or emulator under load drops frames, and those drops show as hitches in
UI motion. Run the app with its animation clock slowed R times (Android: animator duration scale
R, or your own demo hook; R = 6-10, higher for heavy scenes) and record. This script speeds the
recording up R times onto a fixed fps grid (nearest real frame). When the grid repeats a frame
inside a motion (the recorder skipped a beat), that frame is replaced by the in-between of its
neighbours: both are warped halfway along DIS optical flow, then blended. A plain 50/50 blend
ghosts moving text; the warp lands it where it would be at that instant.
--start/--end trim in output seconds (after the speed-up). Frames stream through pipes, so 4K
works in a single generation from the source.
"""
import argparse
import json
import subprocess

import cv2
import numpy as np

ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
ap.add_argument("src")
ap.add_argument("R", type=float, help="how many times slower the app clock ran during capture")
ap.add_argument("out")
ap.add_argument("--fps", type=int, default=60)
ap.add_argument("--start", type=float, default=0.0)
ap.add_argument("--end", type=float)
ap.add_argument("--crf", type=int, default=12)
a = ap.parse_args()

s = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                        "stream=width,height", "-of", "json", a.src]))["streams"][0]
W, H = int(s["width"]), int(s["height"])
FB = W * H * 3
trim = (f",trim=start={a.start}" + (f":end={a.end}" if a.end else "") + ",setpts=PTS-STARTPTS") if (a.start or a.end) else ""
dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", a.src, "-an", "-vf", f"setpts=(PTS-STARTPTS)/{a.R},fps={a.fps}{trim}",
                        "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE, bufsize=FB * 2)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(a.fps),
                        "-i", "-", "-vf", "format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", str(a.crf),
                        "-profile:v", "high", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
                        "-movflags", "+faststart", a.out], stdin=subprocess.PIPE)

SW = min(960, W)                       # repeat detection on a small grey copy
SH = round(H * SW / W)
FW = min(1920, W)                      # optical flow at most at 1080p, scaled back up
FH = round(H * FW / W)
_dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
_gy, _gx = np.mgrid[0:H, 0:W].astype(np.float32)


def frames():
    while True:
        b = dec.stdout.read(FB)
        if len(b) < FB:
            return
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)


def small(f):
    return cv2.resize(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (SW, SH)).astype(np.int16)


def midframe(p, q):
    gp = cv2.resize(cv2.cvtColor(p, cv2.COLOR_BGR2GRAY), (FW, FH))
    gq = cv2.resize(cv2.cvtColor(q, cv2.COLOR_BGR2GRAY), (FW, FH))
    flow = cv2.resize(_dis.calc(gp, gq, None), (W, H)) * (W / FW)     # p -> q in full-res pixels
    fx, fy = flow[..., 0] * 0.5, flow[..., 1] * 0.5
    wp = cv2.remap(p, _gx - fx, _gy - fy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    wq = cv2.remap(q, _gx + fx, _gy + fy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return cv2.addWeighted(wp, 0.5, wq, 0.5, 0)


win, sm = [], []
fixed = n = 0
prev_d = 1.0
for f in frames():
    win.append(f)
    sm.append(small(f))
    if len(win) == 3:
        d0 = np.abs(sm[1] - sm[0]).mean()
        d1 = np.abs(sm[2] - sm[1]).mean()
        if d0 < 0.01 and d1 > 0.3 and prev_d > 0.3:      # frame 1 repeats frame 0 in the middle of a motion
            win[1] = midframe(win[0], win[2])
            sm[1] = small(win[1])
            d0 = np.abs(sm[1] - sm[0]).mean()
            fixed += 1
        prev_d = d0
        enc.stdin.write(win[0].tobytes())
        n += 1
        win.pop(0)
        sm.pop(0)
for f in win:
    enc.stdin.write(f.tobytes())
    n += 1
enc.stdin.close()
enc.wait()
dec.wait()
print(f"{a.out}: {n} frames, {fixed} gap frames filled")

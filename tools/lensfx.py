"""Lens finish keyed to the fast moves of a film: barrel distortion and chromatic aberration that peak
on whips, speed ramps and zoom-throughs, plus halation, a soft vignette and soft film grain.

Run out of process, pinned:
  uv run --no-project --with numpy==2.2.6 --with opencv-python-headless==4.11.0.86 \
    python tools/lensfx.py IN.mp4 OUT.mp4 --fx fx.json [--audio mix.wav] [--also 1920x1080:OUT_1080.mp4]

fx.json: {"events": [{"t": 5.30, "attack": 0.28, "release": 0.30, "k": 1.0, "what": "zoom-through"}, ...]}
  t        peak time in seconds (the fastest frame of the move)
  attack   seconds from zero to the peak (fast moves 0.1-0.3)
  release  seconds from the peak back to zero (0.2-0.4)
  k        peak strength: 1.0 is about 6% barrel at the frame edge plus visible colour fringing;
           0.25-0.5 for small swaps, 0.7-1.0 for the hero moves. Overlapping events add up (capped).
  "fps" is optional (default: the input's frame rate).

Deterministic: grain is seeded by the frame index, nothing depends on wall-clock time.
Grain is generated at a third of the resolution and upscaled: per-pixel grain made a 4K encode
explode to ~140 Mb/s, the soft grain plus the maxrate caps below stays near 60 (4K) / 16 (1080p).
"""
import argparse
import json
import math
import subprocess
import sys

import cv2
import numpy as np

ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
ap.add_argument("inp")
ap.add_argument("out")
ap.add_argument("--fx", required=True, help="fx.json with the move events")
ap.add_argument("--audio", help="audio file to mux (AAC 320k)")
ap.add_argument("--also", action="append", default=[], help="extra downscaled deliverable WxH:path, repeatable")
ap.add_argument("--frames", help="a:b frame range (tests)")
ap.add_argument("--png", help="write PNG frames to this folder instead of encoding (tests)")
ap.add_argument("--barrel", type=float, default=0.065, help="barrel coefficient at k=1")
ap.add_argument("--ca", type=float, default=0.0035, help="aberration scale at k=1")
ap.add_argument("--ca-base", type=float, default=0.00035, help="always-on aberration")
ap.add_argument("--halation", type=float, default=0.10)
ap.add_argument("--vignette", type=float, default=0.18)
ap.add_argument("--grain", type=float, default=0.016)
ap.add_argument("--crf", type=int, default=16)
a = ap.parse_args()


def probe(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
                                   "stream=width,height,r_frame_rate,nb_read_packets", "-of", "json", path])
    s = json.loads(out)["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return int(s["width"]), int(s["height"]), float(num) / float(den), int(s.get("nb_read_packets") or 0)


fx = json.load(open(a.fx))
W, H, src_fps, N = probe(a.inp)
FPS = float(fx.get("fps") or src_fps)
EV = fx.get("events", [])
f0, f1 = (0, N) if not a.frames else [int(x) for x in a.frames.split(":")]


def strength(t):
    """Sum of raised-cosine bumps: attack into each move's peak, release after it."""
    s = 0.0
    for e in EV:
        dt = t - e["t"]
        x = (-dt / max(1e-3, e.get("attack", 0.15))) if dt < 0 else (dt / max(1e-3, e.get("release", 0.3)))
        if x < 1:
            s += e.get("k", 1.0) * 0.5 * (1 + math.cos(math.pi * x))
    return min(s, 1.5)


yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
cx, cy = (W - 1) / 2, (H - 1) / 2
nx, ny = xx - cx, yy - cy
r2 = (nx * nx + ny * ny) / (cx * cx + cy * cy)          # 1 at the frame corner, aspect-correct
vig = (1.0 - a.vignette * np.clip(r2, 0, 1) ** 1.6).astype(np.float32)[..., None]


def barrel(img, k):
    d = (1 + k * r2) / (1 + k)                          # zoom-compensated: the frame stays filled
    return cv2.remap(img, (cx + nx * d).astype(np.float32), (cy + ny * d).astype(np.float32),
                     interpolation=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)


def aberrate(img, c):
    if c <= 0:
        return img
    out = img.copy()
    for ch, sc in ((2, 1 + c), (0, 1 - c)):             # BGR: red scaled out, blue scaled in
        M = np.array([[sc, 0, cx * (1 - sc)], [0, sc, cy * (1 - sc)]], dtype=np.float32)
        out[..., ch] = cv2.warpAffine(img[..., ch], M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return out


def halation(img):
    small = cv2.resize(img, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    hi = np.clip((small.max(axis=2, keepdims=True) - 0.72) / 0.28, 0, 1) * small
    glow = 0.6 * cv2.GaussianBlur(hi, (0, 0), 6) + 0.4 * cv2.GaussianBlur(hi, (0, 0), 22)
    glow *= np.array([0.75, 0.9, 1.15], dtype=np.float32)   # slightly warm halo (BGR)
    return img + a.halation * cv2.resize(glow, (W, H), interpolation=cv2.INTER_LINEAR)


def grain(i, img):
    g = np.random.default_rng(1000 + i).standard_normal((H // 3, W // 3), dtype=np.float32)
    g = cv2.resize(g, (W, H), interpolation=cv2.INTER_CUBIC)
    lum = img.mean(axis=2, keepdims=True)
    return img + g[..., None] * a.grain * (0.55 + 3.6 * lum * (1 - lum))   # strongest in the mid-tones


def caps(h):
    """maxrate/bufsize by delivered height: keeps soft grain from inflating the bitrate."""
    rate = 60 if h >= 2000 else 30 if h >= 1400 else 16
    return ["-maxrate", f"{rate}M", "-bufsize", f"{rate * 2}M"]


reader = subprocess.Popen(["ffmpeg", "-v", "error", "-i", a.inp, "-vf", f"select='between(n\\,{f0}\\,{f1 - 1})'",
                           "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "bgr48le", "-"], stdout=subprocess.PIPE)
writers = []
if not a.png:
    head = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr48le", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
    aud = (["-i", a.audio], ["-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "320k", "-shortest"]) if a.audio else ([], [])
    enc = ["-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-pix_fmt", "yuv420p", "-color_primaries", "bt709",
           "-color_trc", "bt709", "-colorspace", "bt709", "-movflags", "+faststart"]
    targets = [(None, H, a.out)] + [(s.split(":", 1)[0], int(s.split(":", 1)[0].split("x")[1]), s.split(":", 1)[1]) for s in a.also]
    for size, h, path in targets:
        vf = ["-vf", f"scale={size.replace('x', ':')}:flags=lanczos"] if size else []
        writers.append(subprocess.Popen(head + aud[0] + aud[1] + vf + enc + ["-crf", str(a.crf + (1 if size else 0))] + caps(h) + [path],
                                        stdin=subprocess.PIPE))

fb = W * H * 3 * 2
i = f0
while True:
    buf = reader.stdout.read(fb)
    if len(buf) < fb:
        break
    img = np.frombuffer(buf, dtype=np.uint16).reshape(H, W, 3).astype(np.float32) / 65535.0
    s = strength(i / FPS)
    if s > 0.002:
        img = barrel(img, a.barrel * s)
    img = grain(i, halation(aberrate(img, a.ca_base + a.ca * s)) * vig)
    out = (np.clip(img, 0, 1) * 65535.0 + 0.5).astype(np.uint16)
    if a.png:
        cv2.imwrite(f"{a.png}/f_{i:04d}.png", (out >> 8).astype(np.uint8))
    else:
        for w in writers:
            w.stdin.write(out.tobytes())
    i += 1
    if i % 60 == 0:
        print(f"lensfx: frame {i}/{f1}", file=sys.stderr, flush=True)
for w in writers:
    w.stdin.close()
    w.wait()
reader.wait()
print(f"lensfx: {i - f0} frames -> {a.png or a.out}", file=sys.stderr)

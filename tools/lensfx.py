"""Lens finish for a whole film: a permanent lens character (barrel, edge aberration, swirl, soft edges)
that grows on whips, speed ramps and zoom-throughs, plus halation, a soft vignette and fine film grain.

Run out of process, pinned:
  uv run --no-project --with numpy==2.2.6 --with opencv-python-headless==4.11.0.86 \
    python tools/lensfx.py IN.mp4 OUT.mp4 --fx fx.json [--audio mix.wav] [--codec hevc10] \
      [--also 1920x1080:OUT_1080.mp4]

fx.json: {"events": [{"t": 5.30, "attack": 0.28, "release": 0.30, "k": 1.0, "what": "zoom-through"}, ...]}
  t        peak time in seconds (the fastest frame of the move)
  attack   seconds from zero to the peak (fast moves 0.1-0.3)
  release  seconds from the peak back to zero (0.2-0.4)
  k        peak strength: 1.0 is about 6% barrel at the frame edge plus visible colour fringing;
           0.25-0.5 for small swaps, 0.7-1.0 for the hero moves. Overlapping events add up (capped).
  "fps" is optional (default: the input's frame rate). Without --fx only the permanent look applies.

Looks (--look, every value can still be overridden by its own flag):
  lens     default. The Hlas v7 finish: barrel 0.03, edge CA 0.006, swirl 0.035, soft edges 2.5 px,
           grain 0.008 at 1.95 px (sizes are relative to 1080p, so 4K looks optically the same).
  classic  the earlier finish: no permanent lens character, grain 0.016 at 3 px.
  clean    no lens character and no grain: halation, vignette and the fast-move warp only.
Grain, vignette and lens go on the whole film only, never into single clips.

Codecs (--codec):
  h264     default. CRF 16 (--crf), yuv420p, no bitrate cap on the master.
  hevc10   delivery master: libx265 main10, two passes at --bitrate (default 160 Mbit/s), tag hvc1.
           A ProRes 422 HQ mezzanine is written next to OUT first and removed after (--keep-mezz keeps it).
  prores   ProRes 422 HQ (10 bit) .mov with PCM audio.
The master never gets a maxrate cap (a 16/60 Mbit/s cap showed in the grain and the gradients).
--maxrate N caps an H.264 master only when asked. --also previews are H.264 for phones and stay
capped (16 Mbit/s 1080p, 30 at 1440p, 60 at 4K) unless --also-uncapped.

Deterministic: grain is seeded by the frame index, nothing depends on wall-clock time.
"""
import argparse
import json
import math
import os
import subprocess
import sys

import cv2
import numpy as np

LOOKS = {
    "lens": dict(barrel_base=0.03, edge_ca=0.006, swirl=0.035, edge_soft=2.5, grain=0.008, grain_px=1.95),
    "classic": dict(barrel_base=0.0, edge_ca=0.0, swirl=0.0, edge_soft=0.0, grain=0.016, grain_px=3.0),
    "clean": dict(barrel_base=0.0, edge_ca=0.0, swirl=0.0, edge_soft=0.0, grain=0.0, grain_px=3.0),
}

ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
ap.add_argument("inp")
ap.add_argument("out")
ap.add_argument("--fx", help="fx.json with the move events (optional: without it only the permanent look applies)")
ap.add_argument("--audio", help="audio file to mux (AAC 320k, PCM 24 bit for ProRes)")
ap.add_argument("--also", action="append", default=[], help="extra downscaled H.264 preview WxH:path, repeatable")
ap.add_argument("--also-uncapped", action="store_true", help="no maxrate cap on the --also previews")
ap.add_argument("--frames", help="a:b frame range (tests)")
ap.add_argument("--png", help="write PNG frames to this folder instead of encoding (tests)")
ap.add_argument("--look", choices=sorted(LOOKS), default="lens", help="permanent lens character preset (default lens)")
ap.add_argument("--barrel", type=float, default=0.065, help="barrel coefficient added at k=1 on fast moves")
ap.add_argument("--barrel-base", type=float, help="always-on barrel (lens character)")
ap.add_argument("--ca", type=float, default=0.0035, help="aberration scale at k=1")
ap.add_argument("--ca-base", type=float, default=0.00035, help="always-on uniform aberration")
ap.add_argument("--edge-ca", type=float, help="always-on lateral CA growing with r^2 (fraction of the radius at the corner)")
ap.add_argument("--swirl", type=float, help="rotational edge blur at the corner in radians (swirly, cat-eye feel)")
ap.add_argument("--edge-soft", type=float, help="field curvature: blur sigma at the corner in px (1080p)")
ap.add_argument("--halation", type=float, default=0.10)
ap.add_argument("--vignette", type=float, default=0.18)
ap.add_argument("--grain", type=float, help="grain strength (lens look 0.008)")
ap.add_argument("--grain-px", type=float, help="grain particle size in px at 1080p (lens look 1.95)")
ap.add_argument("--codec", choices=["h264", "hevc10", "prores"], default="h264", help="master codec (default h264)")
ap.add_argument("--crf", type=int, default=16, help="H.264 CRF of the master")
ap.add_argument("--bitrate", type=float, default=160, help="hevc10 target in Mbit/s (default 160)")
ap.add_argument("--maxrate", type=float, help="optional cap in Mbit/s on an H.264 master (default none)")
ap.add_argument("--x265-preset", default="medium", help="hevc10 preset (medium is visually lossless at 160 Mbit/s)")
ap.add_argument("--keep-mezz", action="store_true", help="hevc10: keep the ProRes mezzanine next to OUT")
a = ap.parse_args()
for k, v in LOOKS[a.look].items():
    if getattr(a, k) is None:
        setattr(a, k, v)


def probe(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
                                   "stream=width,height,r_frame_rate,nb_read_packets", "-of", "json", path])
    s = json.loads(out)["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return int(s["width"]), int(s["height"]), float(num) / float(den), int(s.get("nb_read_packets") or 0)


fx = json.load(open(a.fx)) if a.fx else {}
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


def edge_ca(img, c):
    """Lateral CA that is zero in the centre and grows with r^2: red pushed out, blue pulled in."""
    if c <= 0:
        return img
    out = img.copy()
    for ch, sgn in ((2, 1.0), (0, -1.0)):
        d = 1 + sgn * c * r2
        out[..., ch] = cv2.remap(img[..., ch], (cx + nx * d).astype(np.float32), (cy + ny * d).astype(np.float32),
                                 interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return out


SWN = 7
swirl_w = np.clip(r2, 0, 1.2) ** 1.5


def swirl(img, th):
    """Rotational blur weighted by r^2: the swirl, cat-eye smear of fast vintage glass at the edges."""
    if th <= 0:
        return img
    acc = np.zeros_like(img)
    for k in range(SWN):
        ang = th * swirl_w * (k / (SWN - 1) - 0.5)
        ca_, sa_ = np.cos(ang), np.sin(ang)
        acc += cv2.remap(img, (cx + nx * ca_ - ny * sa_).astype(np.float32), (cy + nx * sa_ + ny * ca_).astype(np.float32),
                         interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return acc / SWN


soft_m = (np.clip((r2 - 0.25) / 0.75, 0, 1) ** 1.3).astype(np.float32)[..., None]


def soft_edges(img, sig):
    """Field curvature: sharp centre, edges blurred by sig px (relative to 1080p) at the corner."""
    if sig <= 0:
        return img
    b = cv2.GaussianBlur(img, (0, 0), sig * W / 1920)
    return img * (1 - soft_m) + b * soft_m


def halation(img):
    small = cv2.resize(img, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    hi = np.clip((small.max(axis=2, keepdims=True) - 0.72) / 0.28, 0, 1) * small
    glow = 0.6 * cv2.GaussianBlur(hi, (0, 0), 6) + 0.4 * cv2.GaussianBlur(hi, (0, 0), 22)
    glow *= np.array([0.75, 0.9, 1.15], dtype=np.float32)   # slightly warm halo (BGR)
    return img + a.halation * cv2.resize(glow, (W, H), interpolation=cv2.INTER_LINEAR)


def grain(i, img):
    """Grain particles of grain_px at 1080p (scaled with the width, so 4K reads the same)."""
    if a.grain <= 0:
        return img
    gs = a.grain_px * W / 1920
    g = np.random.default_rng(1000 + i).standard_normal((max(2, int(H / gs)), max(2, int(W / gs))), dtype=np.float32)
    g = cv2.resize(g, (W, H), interpolation=cv2.INTER_CUBIC)
    lum = img.mean(axis=2, keepdims=True)
    return img + g[..., None] * a.grain * (0.55 + 3.6 * lum * (1 - lum))   # strongest in the mid-tones


def preview_caps(h):
    """maxrate/bufsize for phone previews by delivered height."""
    rate = 60 if h >= 2000 else 30 if h >= 1400 else 16
    return ["-maxrate", f"{rate}M", "-bufsize", f"{rate * 2}M"]


TAGS = ["-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709"]
H264 = ["-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-pix_fmt", "yuv420p"] + TAGS + ["-movflags", "+faststart"]
PRORES = ["-c:v", "prores_ks", "-profile:v", "3", "-vendor", "apl0", "-pix_fmt", "yuv422p10le"] + TAGS
AAC = ["-c:a", "aac", "-b:a", "320k"]
PCM = ["-c:a", "pcm_s24le"]


DUR = f"{(f1 - f0) / FPS:.6f}"


def mux(audio_codec):
    """Input args and map args for the optional audio file (input 1), cut to the picture length.
    Never -shortest: it ends the encoder early (a broken pipe, and a second x265 pass that no longer
    matches the first one)."""
    if not a.audio:
        return [], []
    return ["-ss", f"{f0 / FPS:.6f}", "-i", a.audio], ["-map", "0:v", "-map", "1:a"] + audio_codec + ["-t", DUR]


out_dir = os.path.dirname(os.path.abspath(a.out))
mezz = None
reader = subprocess.Popen(["ffmpeg", "-v", "error", "-i", a.inp, "-vf", f"select='between(n\\,{f0}\\,{f1 - 1})'",
                           "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "bgr48le", "-"], stdout=subprocess.PIPE)
writers = []
if not a.png:
    # bt709 tags on both sides: input side sets primaries and transfer, output side the matrix
    head = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr48le", "-s", f"{W}x{H}", "-r", str(FPS)] + TAGS + ["-i", "-"]
    if a.codec == "h264":
        cap = ["-maxrate", f"{a.maxrate:g}M", "-bufsize", f"{a.maxrate * 2:g}M"] if a.maxrate else []
        ai, am = mux(AAC)
        writers.append(subprocess.Popen(head + ai + am + H264 + ["-crf", str(a.crf)] + cap + [a.out], stdin=subprocess.PIPE))
    else:
        # ProRes is the master itself, or the 10 bit mezzanine the two-pass HEVC encode reads twice
        stem = os.path.splitext(os.path.basename(a.out))[0]
        mezz = a.out if a.codec == "prores" else os.path.join(out_dir, stem + ".mezz.mov")
        ai, am = mux(PCM) if a.codec == "prores" else ([], [])
        writers.append(subprocess.Popen(head + ai + am + PRORES + [mezz], stdin=subprocess.PIPE))
    for spec in a.also:
        size, path = spec.split(":", 1)
        h = int(size.split("x")[1])
        ai, am = mux(AAC)
        writers.append(subprocess.Popen(head + ai + am + ["-vf", f"scale={size.replace('x', ':')}:flags=lanczos"] + H264
                                        + ["-crf", str(a.crf + 1)] + ([] if a.also_uncapped else preview_caps(h)) + [path],
                                        stdin=subprocess.PIPE))

fb = W * H * 3 * 2
i = f0
while True:
    buf = reader.stdout.read(fb)
    if len(buf) < fb:
        break
    img = np.frombuffer(buf, dtype=np.uint16).reshape(H, W, 3).astype(np.float32) / 65535.0
    s = strength(i / FPS)
    kb = a.barrel_base + a.barrel * s
    if kb > 0.002:
        img = barrel(img, kb)
    img = soft_edges(swirl(edge_ca(img, a.edge_ca * (1 + 1.5 * s)), a.swirl * (1 + s)), a.edge_soft)
    img = grain(i, halation(aberrate(img, a.ca_base + a.ca * s)) * vig)
    out = (np.clip(img, 0, 1) * 65535.0 + 0.5).astype(np.uint16)
    if a.png:
        cv2.imwrite(f"{a.png}/f_{i:04d}.png", (out >> 8).astype(np.uint8))
    else:
        for w in writers:
            if w.poll() is None:
                try:
                    w.stdin.write(out.tobytes())
                except BrokenPipeError:
                    print(f"lensfx: encoder {w.args[-1]} stopped early", file=sys.stderr)
    i += 1
    if i % 60 == 0:
        print(f"lensfx: frame {i}/{f1}", file=sys.stderr, flush=True)
for w in writers:
    try:
        w.stdin.close()
    except BrokenPipeError:
        pass
    w.wait()
reader.wait()
if any(w.returncode for w in writers):
    sys.exit("lensfx: an encoder failed")

if a.codec == "hevc10" and not a.png:
    rate = f"{a.bitrate:g}M"
    stats = os.path.join(out_dir, os.path.splitext(os.path.basename(a.out))[0] + ".x265.log")
    enc = ["-c:v", "libx265", "-preset", a.x265_preset, "-profile:v", "main10", "-pix_fmt", "yuv420p10le", "-b:v", rate,
           "-tag:v", "hvc1"] + TAGS

    def x265(n):
        return ["-x265-params", f"pass={n}:stats={stats}:log-level=error:colorprim=bt709:transfer=bt709:colormatrix=bt709"]

    print(f"lensfx: hevc10 pass 1/2 at {rate}bit/s", file=sys.stderr, flush=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mezz] + enc + x265(1) + ["-an", "-f", "null", os.devnull], check=True)
    print("lensfx: hevc10 pass 2/2", file=sys.stderr, flush=True)
    ai, am = mux(AAC)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mezz] + ai + (am or ["-map", "0:v"]) + enc + x265(2)
                   + ["-movflags", "+faststart", a.out], check=True)
    for f in (stats, stats + ".cutree"):
        if os.path.exists(f):
            os.remove(f)
    if not a.keep_mezz:
        os.remove(mezz)
print(f"lensfx: {i - f0} frames, look {a.look}, {a.codec} -> {a.png or a.out}", file=sys.stderr)

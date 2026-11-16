"""Measure and repair the frame cadence of an AI clip, then interpolate it to a uniform high frame rate.

Run out of process, pinned:
  uv run --no-project --with numpy==2.2.6 --with opencv-python-headless==4.11.0.86 python tools/cadence.py measure SRC
  uv run --no-project --with numpy==2.2.6 --with opencv-python-headless==4.11.0.86 \
    python tools/cadence.py fix SRC FIRST LAST NAME WORK_DIR [--pattern P:R] [--to 240]

Why: Seedance 1080p is 30 fps content decimated to 24 fps. Every step between two source frames is
one 30 fps step, except after the global frame g with g % 4 == 3, where it is a double step. Slow
motion and speed ramps made from that file stutter once a second-ish, and a 60 fps interpolation
of it keeps the stutter. Another clip (a car film) had a different pattern, a seam once per second,
so the pattern is measured per clip, never assumed.

measure   prints JSON: the period P and phase R of the largest steps ("a double step follows frame
          g when g % P == R"), the step ratio and a confidence. Steps are mean luma differences of
          consecutive frames at 160x90; static footage has no pattern (confidence 0).
fix       FIRST and LAST are global frame numbers, inclusive. 1) cut the shot to ProRes, 2) Topaz 2x
          (apo-8) to get the midpoint of every interval, 3) rebuild the true frame rate (source fps
          x (P+1)/P: double steps get their midpoint, single steps keep the original), 4) Topaz to
          --to fps (default 240). Writes WORK_DIR/NAME_i<to>.mov and NAME.json (the frame map:
          slot30[i] = true-rate index of source frame i). Without Topaz (--no-topaz) only the
          repaired true-rate file NAME_true.mov is written, midpoints by DIS optical flow.
Topaz ffmpeg prints auth tokens on stderr: it always goes to a log file, never to the terminal.
Run it through tools/gpu_lock.sh when Blender, DepthPro or another Topaz job may be running.
"""
import argparse
import json
import os
import subprocess
import sys

import cv2
import numpy as np

TOPAZ = os.environ.get("TOPAZ_APP", "/Applications/Topaz Video.app/Contents")


def probe(path):
    s = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                            "stream=width,height,r_frame_rate,nb_frames", "-of", "json", path]))["streams"][0]
    n, d = s["r_frame_rate"].split("/")
    return int(s["width"]), int(s["height"]), float(n) / float(d), int(s.get("nb_frames") or 0)


def steps(path, max_frames=None):
    """Mean luma difference between consecutive frames (160x90), a measure of how far the picture moved."""
    cap = cv2.VideoCapture(path)
    prev, out = None, []
    while True:
        ok, f = cap.read()
        if not ok or (max_frames and len(out) >= max_frames):
            break
        g = cv2.resize(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (160, 90), interpolation=cv2.INTER_AREA).astype(np.float32)
        if prev is not None:
            out.append(float(np.abs(g - prev).mean()))
        prev = g
    return np.array(out)


def detect(d, first=0):
    """Best (period, phase) where the step after frame g (g % P == R) is larger than the rest.
    d[i] is the step between frame i and i+1, global index first + i."""
    best = dict(period=None, phase=None, ratio=1.0, confidence=0.0)
    moving = d > max(0.4, 0.25 * np.median(d))
    if moving.sum() < 12:
        return best
    for p in range(2, min(31, len(d) // 3)):
        g = (np.arange(len(d)) + first) % p
        for r in range(p):
            sel, rest = (g == r) & moving, (g != r) & moving
            if sel.sum() < 3 or rest.sum() < 3:
                continue
            ratio = float(np.median(d[sel]) / max(1e-6, np.median(d[rest])))
            cycles = len(d) / p
            # luma differences saturate on big moves, so a double step reads as 1.3-2.2x a single one;
            # it has to be larger in nearly every cycle, not just on average. Smallest period wins ties.
            if 1.25 <= ratio <= 2.6 and cycles >= 3:
                consistency = float((d[sel] > np.median(d[rest]) * 1.15).mean())
                conf = consistency * min(1.0, cycles / 8)
                if consistency >= 0.8 and conf > best["confidence"] + 0.02:
                    best = dict(period=p, phase=r, ratio=round(ratio, 2), confidence=round(conf, 2))
    return best


def cmd_measure(a):
    W, H, fps, _ = probe(a.src)
    d = steps(a.src, a.max_frames)
    det = detect(d)
    dup = int((d < 0.05).sum())
    print(json.dumps(dict(src=os.path.basename(a.src), size=[W, H], fps=fps, steps=len(d), median_step=round(float(np.median(d)), 3), repeated_frames=dup, **det,
                          note=("a double step follows frame g when g %% %d == %d; true rate %.3f fps" % (det["period"], det["phase"], fps * (det["period"] + 1) / det["period"])) if det["period"] else "no cadence pattern found (static or already uniform)")))


def topaz_run(inp, outp, fps, log):
    env = dict(os.environ, TVAI_MODEL_DIR=f"{TOPAZ}/Resources/models",
               TVAI_MODEL_DATA_DIR=os.path.expanduser("~/Library/Application Support/Topaz Labs LLC/Topaz Video/models"))
    with open(log, "w") as lf:
        subprocess.run([f"{TOPAZ}/MacOS/ffmpeg", "-hide_banner", "-y", "-i", inp, "-vf",
                        f"tvai_fi=model=apo-8:slowmo=1:rdt=-0.000001:fps={fps}:device=-2:vram=1:instances=1",
                        "-an", "-c:v", "prores_ks", "-profile:v", "1", "-pix_fmt", "yuv422p10le", outp],
                       env=env, stdout=lf, stderr=lf, check=True)


def prores(path, fps, W, H):
    return subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
                             "-c:v", "prores_ks", "-profile:v", "3", "-pix_fmt", "yuv422p10le", path], stdin=subprocess.PIPE)


def flow_mid(a, b):
    """Midpoint of two frames: both warped halfway along DIS flow, then blended (a plain blend ghosts)."""
    ga, gb = cv2.cvtColor(a, cv2.COLOR_BGR2GRAY), cv2.cvtColor(b, cv2.COLOR_BGR2GRAY)
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    fw, bw = dis.calc(ga, gb, None), dis.calc(gb, ga, None)
    h, w = ga.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    wa = cv2.remap(a, xx - 0.5 * fw[..., 0], yy - 0.5 * fw[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    wb = cv2.remap(b, xx - 0.5 * bw[..., 0], yy - 0.5 * bw[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return cv2.addWeighted(wa, 0.5, wb, 0.5, 0)


def cmd_fix(a):
    W, H, fps, _ = probe(a.src)
    if a.pattern == "auto":
        det = detect(steps(a.src), 0)
        if not det["period"]:
            sys.exit("no cadence pattern found; pass --pattern P:R if you know it (Seedance 1080p: 4:3)")
        P, R = det["period"], det["phase"]
        print(f"pattern: double step after g % {P} == {R} (ratio {det['ratio']}, confidence {det['confidence']})", file=sys.stderr)
    else:
        P, R = (int(x) for x in a.pattern.split(":"))
    first, last, name, work = a.first, a.last, a.name, a.work
    os.makedirs(work, exist_ok=True)
    true_fps = fps * (P + 1) / P
    cut, x2, true, out = (f"{work}/{name}_{k}.mov" for k in ("cut", "x2", "true", f"i{a.to}"))
    cap = cv2.VideoCapture(a.src)
    cap.set(cv2.CAP_PROP_POS_FRAMES, first)
    frames = []
    for _ in range(first, last + 1):
        ok, f = cap.read()
        if not ok:
            break
        frames.append(f)
    n = len(frames)
    slot = []
    if a.no_topaz:
        p = prores(true, true_fps, W, H)
        j = 0
        for i, f in enumerate(frames):
            slot.append(j)
            p.stdin.write(f.tobytes())
            j += 1
            if (first + i) % P == R and i < n - 1:
                p.stdin.write(flow_mid(f, frames[i + 1]).tobytes())
                j += 1
        p.stdin.close()
        p.wait()
        json.dump(dict(name=name, first=first, last=first + n - 1, pattern=[P, R], frames_src=n, frames_true=j, true_fps=true_fps, slot=slot), open(f"{work}/{name}.json", "w"))
        print(name, "repaired", n, "->", j, "frames at", round(true_fps, 3), "fps (flow midpoints, no Topaz)")
        return
    p = prores(cut, fps, W, H)
    for f in frames:
        p.stdin.write(f.tobytes())
    p.stdin.close()
    p.wait()
    topaz_run(cut, x2, fps * 2, f"{work}/{name}_topaz1.log")
    cap = cv2.VideoCapture(x2)
    p = prores(true, true_fps, W, H)
    j = k = 0
    while True:
        ok, f = cap.read()
        if not ok:
            break
        i, odd = divmod(j, 2)
        g = first + i
        if not odd:
            if i < n:
                p.stdin.write(f.tobytes())
                slot.append(k)
                k += 1
        elif g % P == R and i < n - 1:
            p.stdin.write(f.tobytes())
            k += 1
        j += 1
    p.stdin.close()
    p.wait()
    topaz_run(true, out, a.to, f"{work}/{name}_topaz2.log")
    n_out = int(cv2.VideoCapture(out).get(cv2.CAP_PROP_FRAME_COUNT))
    json.dump(dict(name=name, first=first, last=first + n - 1, pattern=[P, R], frames_src=n, frames_true=k, true_fps=true_fps, frames_out=n_out, out_fps=a.to, slot=slot), open(f"{work}/{name}.json", "w"))
    for f in (cut, x2, true):
        os.remove(f)
    print(name, "src", n, "true", k, f"i{a.to}", n_out)


ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
sub = ap.add_subparsers(dest="cmd", required=True)
m = sub.add_parser("measure")
m.add_argument("src")
m.add_argument("--max-frames", type=int)
m.set_defaults(fn=cmd_measure)
f = sub.add_parser("fix")
f.add_argument("src")
f.add_argument("first", type=int)
f.add_argument("last", type=int)
f.add_argument("name")
f.add_argument("work")
f.add_argument("--pattern", default="auto", help="P:R, double step after frame g when g %% P == R (default: measured)")
f.add_argument("--to", type=int, default=240, help="output frame rate (Topaz)")
f.add_argument("--no-topaz", action="store_true", help="only repair to the true rate with optical-flow midpoints")
f.set_defaults(fn=cmd_fix)
args = ap.parse_args()
args.fn(args)

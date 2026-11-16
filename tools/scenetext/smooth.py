"""Smooth a track the way the motion is made: local quadratic regression over SHOT time, plus a graph.

Run out of process, pinned:
  uv run --no-project --with numpy==2.2.6 --with opencv-python-headless==4.11.0.86 \
    python tools/scenetext/smooth.py pose PLATE_DIR SIGMA [--retime retime.json] [--file track3d.json]
  uv run ... python tools/scenetext/smooth.py corners TRACK2D.json "x,y;x,y;x,y;x,y" SIGMA OUT.json GRAPH.png [--retime retime.json]

Why: a raw track jitters by a pixel or two and text riding on it shimmers and "wobbles"; a plain
moving average lags and eats the real motion. Each value is fitted around every frame by a
Gaussian-weighted local QUADRATIC, which keeps real accelerations. The fit runs in the shot's own
time (--retime: the `tau` list from ramp.py), not in film time, so a speed ramp does not change how
much real motion is smoothed. Without --retime frames are the time axis. SIGMA is in frames of that axis.

pose     smooths rvec/tvec of track3d.json (kept as track3d_raw.json first).
corners  projects the four corners of a plane given on frame 0 with the 2D track (a text canvas),
         smooths all 8 coordinates, rebuilds a homography per frame, and writes OUT.json {"H": [...]}
         and a graph: x and y of the centre (grey raw, green smoothed) and the acceleration of the
         corners per frame^2. The QC number to read: the maximum corner acceleration (raw vs smoothed),
         here 64 -> 9.5 px per frame^2 turned a swimming text into a locked one.
"""
import argparse
import json
import os

import cv2
import numpy as np

ap = argparse.ArgumentParser()
sub = ap.add_subparsers(dest="mode", required=True)
p = sub.add_parser("pose")
p.add_argument("plates")
p.add_argument("sigma", type=float)
p.add_argument("--retime")
p.add_argument("--file", default="track3d.json")
c = sub.add_parser("corners")
c.add_argument("track2d")
c.add_argument("quad")
c.add_argument("sigma", type=float)
c.add_argument("out")
c.add_argument("graph")
c.add_argument("--retime")
a = ap.parse_args()


def local_quad(axis, V, sig):
    """V: (n, k) values at positions axis (n,). Returns the smoothed values."""
    S = np.empty_like(V)
    for i in range(len(axis)):
        w = np.exp(-0.5 * ((axis - axis[i]) / sig) ** 2)
        m = w > 1e-3
        x = (axis[m] - axis[i]) / sig
        for k in range(V.shape[1]):
            S[i, k] = np.polyval(np.polyfit(x, V[m, k], 2, w=np.sqrt(w[m])), 0) if m.sum() > 3 else V[i, k]
    return S


def time_axis(frames, retime):
    if retime:
        tau = np.array(json.load(open(retime))["tau"], float)
        return tau[np.array(frames)]
    return np.array(frames, float)


if a.mode == "pose":
    raw = os.path.join(a.plates, "track3d_raw.json")
    cur = os.path.join(a.plates, a.file)
    if not os.path.exists(raw):
        os.rename(cur, raw)
    T = json.load(open(raw))
    ks = sorted(int(k) for k in T["frames"])
    V = np.array([T["frames"][str(k)]["rvec"] + T["frames"][str(k)]["tvec"] for k in ks])
    ax = time_axis(ks, a.retime)
    # sigma is given in frames: with a retime the axis is shot seconds, so convert at the median step
    sig = a.sigma * (float(np.median(np.diff(ax))) if a.retime else 1.0)
    S = local_quad(ax, V, sig)
    for i, k in enumerate(ks):
        T["frames"][str(k)]["rvec"], T["frames"][str(k)]["tvec"] = S[i, :3].tolist(), S[i, 3:].tolist()
    json.dump(T, open(cur, "w"))
    d2r = np.abs(np.diff(V, 2, axis=0)).max(0)
    d2s = np.abs(np.diff(S, 2, axis=0)).max(0)
    print(f"smoothed {len(ks)} frames, sigma {a.sigma}; max 2nd difference raw {d2r.round(4).tolist()} -> smoothed {d2s.round(4).tolist()}")
else:
    T = json.load(open(a.track2d))
    fr = sorted(int(k) for k in T)
    quad = np.float32([[float(v) for v in q.split(",")] for q in a.quad.split(";")])
    P = np.array([cv2.transform(quad[None], np.array(T[str(f)], np.float64))[0].ravel() for f in fr])
    ax = time_axis(fr, a.retime)
    sig = a.sigma * (float(np.median(np.diff(ax))) if a.retime else 1.0)
    Ps = local_quad(ax, P, sig)
    Hs = [cv2.getPerspectiveTransform(quad, Ps[i].reshape(4, 2).astype(np.float32)).tolist() for i in range(len(fr))]
    json.dump(dict(frames=fr, H=Hs, quad=quad.tolist()), open(a.out, "w"))
    d2r, d2s = np.abs(np.diff(P, 2, axis=0)).max(1), np.abs(np.diff(Ps, 2, axis=0)).max(1)
    res = np.abs(P - Ps).max(1)
    print("corner acceleration px/frame^2: raw max %.1f mean %.1f | smoothed max %.1f mean %.1f | raw-smooth max %.1f mean %.1f px" % (d2r.max(), d2r.mean(), d2s.max(), d2s.mean(), res.max(), res.mean()))
    W, Hh = 1600, 900
    g = np.full((Hh, W, 3), 18, np.uint8)
    cx, cy = P[:, [0, 2, 4, 6]].mean(1), P[:, [1, 3, 5, 7]].mean(1)
    sx, sy = Ps[:, [0, 2, 4, 6]].mean(1), Ps[:, [1, 3, 5, 7]].mean(1)

    def plot(v, col, y0, h, lo, hi):
        pts = [(int(i / max(1, len(v) - 1) * (W - 40)) + 20, int(y0 + h - (v[i] - lo) / (hi - lo + 1e-9) * h)) for i in range(len(v))]
        cv2.polylines(g, [np.int32(pts)], False, col, 2, cv2.LINE_AA)

    for (u, s, y0, name) in ((cx, sx, 20, "centre x"), (cy, sy, 300, "centre y")):
        lo, hi = min(u.min(), s.min()), max(u.max(), s.max())
        plot(u, (150, 150, 150), y0, 250, lo, hi)
        plot(s, (122, 230, 0), y0, 250, lo, hi)
        cv2.putText(g, f"{name} (grey raw, green smoothed)", (30, y0 + 24), 0, 0.7, (230, 230, 230), 1)
    top = max(20.0, float(d2r.max()))
    plot(np.r_[0, d2r, 0], (120, 120, 255), 580, 280, 0, top)
    plot(np.r_[0, d2s, 0], (122, 230, 0), 580, 280, 0, top)
    cv2.putText(g, f"corner acceleration px/frame^2 (red raw, green smoothed), 0..{top:.0f}", (30, 604), 0, 0.7, (230, 230, 230), 1)
    cv2.imwrite(a.graph, g)

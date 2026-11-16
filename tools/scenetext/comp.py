"""Flat 2D text standing in a live-action scene: a plane in the scene, projected with the solved camera,
hidden behind whatever is in front of it.

Run out of process, pinned:
  uv run --no-project --with numpy==2.2.6 --with opencv-python-headless==4.11.0.86 --with pillow \
    python tools/scenetext/comp.py PLATE_DIR CFG.py OUT_DIR [--first A --last B] [--fps 60] [--track track3d.json]

CFG.py defines BLOCKS = [dict(...)], see cfg_example.py. For each frame, each block's RGBA texture
(`render(t)`, e.g. ktext.Text.frame) is placed on a plane defined in the REFERENCE camera (centre cx, cy in
reference pixels, distance z in metres of the DepthPro scale, width wpx pixels at that distance, yaw and
pitch in degrees), projected with the smoothed pose of that frame (track3d.json after smooth.py; without
one the camera is fixed), and composited over the plate.
Occlusion, per block `occlude`:
  True      the per-frame depth map (PLATE_DIR/depth, scaled by the frame's dscale) against the plane's
            depth: whatever is closer than the plane hides the text (actor, hands, a laptop). `soft`
            (0.03) is the feather as a share of the depth, `dbias` shifts the decision.
  "wall"    text on a bright wall with a telephoto lens (depth too coarse): a luma + chroma key, anything
            darker or coloured than the wall is in front of it (`key` (lo, hi) luma, `chroma` limit).
  False     no occlusion (a title in front of everything).
Look per block: `opacity` (0.94), `defocus` blur px (0.8, matches the lens), `halo` (sigma, strength) a soft
dark pool under the type so white reads on a bright wall, `blend` "add" (+ `gain`) for light.
Three sub-frame samples average the projection (a little motion blur from the real camera move).
Text meant to be READ like a title is not tracked: put it in the Eden Motion composition, centred.
Writes OUT_DIR/%04d.png. Check the first, the last and every frame of a fast move at full size.
"""
import argparse
import importlib.util
import json
import os

import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("plates")
ap.add_argument("cfg")
ap.add_argument("out")
ap.add_argument("--first", type=int)
ap.add_argument("--last", type=int)
ap.add_argument("--fps", type=float, default=60)
ap.add_argument("--track", default="track3d.json")
a = ap.parse_args()
np.seterr(divide="ignore", invalid="ignore")

spec = importlib.util.spec_from_file_location("cfg", os.path.abspath(a.cfg))
cfg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cfg)
plate = a.plates
N = len([f for f in os.listdir(plate) if f.endswith(".png")])
F0, F1 = (a.first if a.first is not None else 0), (a.last if a.last is not None else N - 1)
im0 = cv2.imread(f"{plate}/{F0:04d}.png")
H, W = im0.shape[:2]
tp = os.path.join(plate, a.track)
T = json.load(open(tp)) if os.path.exists(tp) else dict(F=2000.0, frames={"0": dict(rvec=[0, 0, 0], tvec=[0, 0, 0])})
F = T["F"]
fr = {int(k): v for k, v in T["frames"].items()}
ks = sorted(fr)
os.makedirs(a.out, exist_ok=True)


def pose(t):
    """smoothed pose at fractional frame t, linear extrapolation outside the solved range"""
    lo, hi = ks[0], ks[-1]
    at = lambda i: np.array(fr[i]["rvec"] + fr[i]["tvec"])
    if len(ks) == 1:
        v = at(lo)
    elif t <= lo:
        v = at(lo) + (at(lo) - at(min(lo + 4, hi))) / 4 * (lo - t)
    elif t >= hi:
        v = at(hi) + (at(hi) - at(max(hi - 4, lo))) / 4 * (t - hi)
    else:
        i = int(np.floor(t))
        v = at(i) + (at(min(i + 1, hi)) - at(i)) * (t - i)
    return v[:3], v[3:]


def dscale(t):
    c = min(max(int(round(t)), ks[0]), ks[-1])
    for d in range(0, 40):
        for j in (c - d, c + d):
            if j in fr and fr[j].get("dscale"):
                return fr[j]["dscale"]
    return 1.0


def depth(t):
    for d in range(0, 6):
        for j in (t - d, t + d):
            p = f"{plate}/depth/{j:04d}.npy"
            if os.path.exists(p):
                return cv2.resize(np.load(p).astype(np.float32), (W, H), interpolation=cv2.INTER_LINEAR)
    return None


K = np.array([[F, 0, W / 2], [0, F, H / 2], [0, 0, 1]])
planes = []
for B in cfg.BLOCKS:
    cw, ch = B["canvas"]
    z = B["z"]
    wm = B["wpx"] * z / F
    hm = wm * ch / cw
    c = np.array([(B["cx"] - W / 2) / F * z, (B["cy"] - H / 2) / F * z, z])
    Ry, _ = cv2.Rodrigues(np.array([0, np.radians(B.get("yaw", 0)), 0.0]))
    Rx, _ = cv2.Rodrigues(np.array([np.radians(B.get("pitch", 0)), 0, 0.0]))
    R = Ry @ Rx
    ex, ey, n = R @ [1, 0, 0], R @ [0, 1, 0], R @ [0, 0, 1]
    cor = np.array([c - ex * wm / 2 - ey * hm / 2, c + ex * wm / 2 - ey * hm / 2, c + ex * wm / 2 + ey * hm / 2, c - ex * wm / 2 + ey * hm / 2])
    planes.append(dict(B=B, cor=cor, c=c, n=n))
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
rays = np.stack([(xx - W / 2) / F, (yy - H / 2) / F, np.ones_like(xx)], -1)

for f in range(F0, F1 + 1):
    p = cv2.imread(f"{plate}/{f:04d}.png").astype(np.float32) / 255.0
    t = f / a.fps
    D = None
    for P in planes:
        B = P["B"]
        if not (B["span"][0] <= f <= B["span"][1]):
            continue
        tex = B["render"](t)
        if tex[..., 3].max() < 0.004:
            continue
        cw, ch = B["canvas"]
        src = np.float32([[0, 0], [cw, 0], [cw, ch], [0, ch]])
        acc = np.zeros((H, W, 4), np.float32)
        subs = (-0.3, 0.0, 0.3)
        for s in subs:
            rv, tv = pose(f + s)
            pr, _ = cv2.projectPoints(P["cor"], rv, tv, K, None)
            Hm = cv2.getPerspectiveTransform(src, pr.reshape(4, 2).astype(np.float32))
            pm = tex.copy()
            pm[..., :3] *= pm[..., 3:4]
            acc += cv2.warpPerspective(pm, Hm, (W, H), flags=cv2.INTER_AREA if B["wpx"] < cw else cv2.INTER_LINEAR)
        acc /= len(subs)
        al = acc[..., 3]
        if al.max() < 0.004:
            continue
        occ = B.get("occlude", True)
        if D is None and occ is True:
            D = depth(f)
        vis = 1.0
        if occ == "wall":
            ycc = cv2.cvtColor((np.clip(p, 0, 1) * 255).astype(np.uint8), cv2.COLOR_BGR2YCrCb).astype(np.float32)
            lo, hi = B.get("key", (105, 150))
            chroma = np.hypot(ycc[..., 1] - 128, ycc[..., 2] - 128)
            vis = np.clip((ycc[..., 0] - lo) / (hi - lo), 0, 1) * np.clip((B.get("chroma", 16) - chroma) / 6.0, 0, 1)
            vis = cv2.GaussianBlur(cv2.erode(vis, np.ones((3, 3), np.uint8)), (0, 0), 1.4)
        elif D is not None and occ:
            rv, tv = pose(f)
            R, _ = cv2.Rodrigues(rv)
            nc = R @ P["n"]
            pc = R @ P["c"] + tv
            zt = (nc @ pc) / np.maximum(rays @ nc, 1e-6)
            soft = B.get("soft", 0.03) * zt
            vis = np.clip((D * dscale(f) * B.get("dbias", 1.0) - zt) / soft + 0.5, 0, 1)
            vis = cv2.GaussianBlur(vis, (0, 0), 1.6)
        a2 = (al * vis * B.get("opacity", 0.94))[..., None]
        rgb = acc[..., :3] / np.maximum(al[..., None], 1e-4)
        df = B.get("defocus", 0.8)
        if df > 0:
            rgb = cv2.GaussianBlur(rgb, (0, 0), df)
            a2 = cv2.GaussianBlur(a2, (0, 0), df)[..., None]
        rgb = rgb[..., ::-1]                                  # RGB bitmap -> BGR plate
        if B.get("halo"):
            sg, k = B["halo"]
            h = cv2.GaussianBlur(al * vis * B.get("opacity", 0.94), (0, 0), sg)
            p = p * (1 - (np.clip(h / 0.25, 0, 1) * k)[..., None])
        if B.get("blend") == "add":
            p = p + rgb * a2 * B.get("gain", 1.0)
        else:
            p = p * (1 - a2) + rgb * a2
    cv2.imwrite(f"{a.out}/{f:04d}.png", np.clip(p * 255 + 0.5, 0, 255).astype(np.uint8), [cv2.IMWRITE_PNG_COMPRESSION, 1])
print("comp", F0, F1, "->", a.out)

"""Camera solve for a plate from ONE metric depth map and tracked features.

Run out of process, pinned:
  uv run --no-project --with numpy==2.2.6 --with opencv-python-headless==4.11.0.86 \
    python tools/scenetext/track3d.py PLATE_DIR --ref 120 --first 0 --last 287 --rects "x0,y0,x1,y1;x0,y0,x1,y1" [--focal 2000]

Needs PLATE_DIR/depth/%04d.npy and focal.json (depth.py). World = the reference camera. Features are
picked on the reference frame inside --rects (static parts of the scene: a wall, a desk, never a hand
or the actor), kept off depth discontinuities and skin, lifted to 3D with the reference depth, tracked
into every other frame (Lucas-Kanade on a frame pre-warped by the running homography, forward-backward
check), and each frame gets its pose from solvePnPRansac. Two passes run from the reference, forward
and backward. Poses get a light local quadratic smoothing here; smooth.py does the real one.
Writes PLATE_DIR/track3d<TAG>.json: {F, ref, frames: {f: {rvec, tvec, raw, inl, err, dscale}}}.
dscale is this frame's depth scale against the reference solve (comp.py scales the per-frame depth by it).
Watch the printed inlier count and reprojection error: under ~25 inliers or over ~2 px = pick better rects.
Focal comes from DepthPro (median over the plate) unless --focal is given.
"""
import argparse
import json
import os

import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("plates")
ap.add_argument("--ref", type=int, required=True)
ap.add_argument("--first", type=int, required=True)
ap.add_argument("--last", type=int, required=True)
ap.add_argument("--rects", required=True)
ap.add_argument("--focal", type=float)
ap.add_argument("--tag", default=os.environ.get("TAG", ""))
ap.add_argument("--window", type=int, default=7, help="half window of the light pose smoothing (frames)")
a = ap.parse_args()
plate, ref, first, last = a.plates, a.ref, a.first, a.last
rects = [tuple(int(v) for v in r.split(",")) for r in a.rects.split(";")]
foc = json.load(open(plate + "/depth/focal.json"))
F = a.focal or float(np.median(list(foc.values())))
im0 = cv2.imread(f"{plate}/{ref:04d}.png")
H, W = im0.shape[:2]
K = np.array([[F, 0, W / 2], [0, F, H / 2], [0, 0, 1]], np.float64)
gray = lambda i: cv2.cvtColor(cv2.imread(f"{plate}/{i:04d}.png"), cv2.COLOR_BGR2GRAY)


def depth(i):
    for d in range(0, 6):                                # nearest depth map on disk
        for j in (i - d, i + d):
            p = f"{plate}/depth/{j:04d}.npy"
            if os.path.exists(p):
                return cv2.resize(np.load(p).astype(np.float32), (W, H), interpolation=cv2.INTER_LINEAR)
    raise FileNotFoundError(i)


g0, D0 = gray(ref), depth(ref)
mask = np.zeros((H, W), np.uint8)
for x0, y0, x1, y1 in rects:
    mask[y0:y1, x0:x1] = 255
gx, gy = cv2.Sobel(D0, cv2.CV_32F, 1, 0, ksize=5), cv2.Sobel(D0, cv2.CV_32F, 0, 1, ksize=5)
edge = (np.hypot(gx, gy) / np.maximum(D0, 1e-3) > 0.6).astype(np.uint8)       # keep off depth discontinuities
mask[cv2.dilate(edge, np.ones((15, 15), np.uint8)) > 0] = 0
ycc = cv2.cvtColor(im0, cv2.COLOR_BGR2YCrCb)
skin = ((ycc[..., 1] > 138) & (ycc[..., 0] > 60)).astype(np.uint8)
mask[cv2.dilate(skin, np.ones((41, 41), np.uint8)) > 0] = 0
pts = cv2.goodFeaturesToTrack(g0, 1800, 0.004, 9, mask=mask, blockSize=7)
if pts is None or len(pts) < 30:
    raise SystemExit("too few features inside --rects (static, textured, off skin and depth edges)")
pts = pts.reshape(-1, 2).astype(np.float32)
z = D0[pts[:, 1].astype(int), pts[:, 0].astype(int)]
X = np.stack([(pts[:, 0] - W / 2) / F * z, (pts[:, 1] - H / 2) / F * z, z], 1).astype(np.float64)
print("features", len(pts), "focal", round(F), "depth range", round(float(z.min()), 2), round(float(z.max()), 2))
res = {ref: dict(rvec=[0, 0, 0], tvec=[0, 0, 0], inl=len(pts), err=0.0, dscale=1.0)}
lk = dict(winSize=(31, 31), maxLevel=4, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 40, 0.01))
for rng in (range(ref + 1, last + 1), range(ref - 1, first - 1, -1)):
    Hm = np.eye(3)
    rv = np.zeros(3)
    tv = np.zeros(3)
    for t in rng:
        gt = gray(t)
        w = cv2.warpPerspective(gt, Hm, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
        qw, st, _ = cv2.calcOpticalFlowPyrLK(g0, w, pts, None, **lk)
        bk, st2, _ = cv2.calcOpticalFlowPyrLK(w, g0, qw, None, **lk)
        ok = (st.ravel() == 1) & (st2.ravel() == 1) & (np.linalg.norm(bk - pts, axis=1) < 1.5)
        q = cv2.perspectiveTransform(qw.reshape(-1, 1, 2).astype(np.float64), Hm).reshape(-1, 2)
        idx = np.where(ok)[0]
        if len(idx) < 12:
            print("lost at", t, len(idx))
            break
        good, rv2, tv2, inl = cv2.solvePnPRansac(X[idx], q[idx], K, None, rvec=rv.copy().reshape(3, 1), tvec=tv.copy().reshape(3, 1), useExtrinsicGuess=True,
                                                 iterationsCount=400, reprojectionError=3.0, flags=cv2.SOLVEPNP_ITERATIVE)
        if not good or inl is None or len(inl) < 10:
            print("pnp failed at", t)
            break
        inl = idx[inl.ravel()]
        rv, tv = rv2.ravel(), tv2.ravel()
        pr, _ = cv2.projectPoints(X[inl], rv, tv, K, None)
        err = float(np.mean(np.linalg.norm(pr.reshape(-1, 2) - q[inl], axis=1)))
        Hn, _ = cv2.findHomography(pts[inl], q[inl], cv2.RANSAC, 4.0)
        if Hn is not None:
            Hm = Hn
        s = None
        try:
            Dt = depth(t)
            R, _ = cv2.Rodrigues(rv)
            zc = (X[inl] @ R.T + tv)[:, 2]
            qi = np.clip(q[inl].astype(int), 0, [W - 1, H - 1])
            s = float(np.median(zc / np.maximum(Dt[qi[:, 1], qi[:, 0]], 1e-3)))
        except FileNotFoundError:
            pass
        res[t] = dict(rvec=rv.tolist(), tvec=tv.tolist(), inl=int(len(inl)), err=err, dscale=s)
        if t % 20 == 0:
            print(t, "inliers", len(inl), "of", len(idx), "err", round(err, 2), "dscale", s and round(s, 3))
fr = sorted(res)
A = np.array([res[t]["rvec"] + res[t]["tvec"] for t in fr], np.float64)
Sm = A.copy()
for i in range(len(fr)):
    lo, hi = max(0, i - a.window), min(len(fr), i + a.window + 1)
    xs = np.arange(lo, hi) - i
    for c in range(6):
        Sm[i, c] = np.polyval(np.polyfit(xs, A[lo:hi, c], 2 if hi - lo > 4 else 0), 0)
ds = [res[t].get("dscale") for t in fr]
out = plate + f"/track3d{a.tag}.json"
json.dump(dict(F=F, ref=ref, size=[W, H], frames={str(t): dict(rvec=Sm[i, :3].tolist(), tvec=Sm[i, 3:].tolist(), raw=A[i].tolist(), inl=res[t]["inl"], err=res[t]["err"], dscale=ds[i]) for i, t in enumerate(fr)}), open(out, "w"))
print("solved", fr[0], "->", fr[-1], "mean err", round(float(np.mean([res[t]["err"] for t in fr])), 2), "min inliers", min(res[t]["inl"] for t in fr), "->", out)

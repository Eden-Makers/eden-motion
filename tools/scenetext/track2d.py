"""2D similarity track of a patch of a plate: frame-0 coordinates -> frame f.

Run out of process, pinned:
  uv run --no-project --with numpy==2.2.6 --with opencv-python-headless==4.11.0.86 \
    python tools/scenetext/track2d.py PLATE_DIR OUT.json [--poly "x,y;x,y;x,y;x,y"] [--min-y 520] [--keep-skin] [--keep-bright]

Features are good corners on the plate, tracked between consecutive frames with Lucas-Kanade forward
AND backward (a feature that does not come back within 0.5 px is dropped), then a RANSAC similarity
(rotation, uniform scale, translation) per step, chained from frame 0. Output: {"f": [[a,b,tx],[c,d,ty]]}.
  --poly      the patch to track on frame 0 (a laptop base, a table front, a wall): it is carried by the
              running estimate, so features follow it. Without it the whole frame (minus exclusions).
  --min-y     ignore everything above this row (wall, lid)
  skin is excluded by default (hands move on their own), and very bright pixels (blown wall) unless
  --keep-bright. Exclusions are dilated, a hand near the patch must not drag the track.
Prints the minimum and median RANSAC inliers: under ~25 the track will wander, pick another patch.
This is a 2D track: it is right for a flat patch and a camera that mostly translates. For a real
camera move through depth use track3d.py. Always smooth it (smooth.py) before text rides on it.
"""
import argparse
import json
import os

import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("plates")
ap.add_argument("out")
ap.add_argument("--poly")
ap.add_argument("--min-y", type=int, default=0)
ap.add_argument("--keep-skin", action="store_true")
ap.add_argument("--keep-bright", action="store_true")
a = ap.parse_args()

N = len([f for f in os.listdir(a.plates) if f.endswith(".png")])
load = lambda i: cv2.imread(f"{a.plates}/{i:04d}.png")
POLY0 = np.float32([[float(v) for v in p.split(",")] for p in a.poly.split(";")]) if a.poly else None


def mask(im, A):
    h, w = im.shape[:2]
    ycc = cv2.cvtColor(im, cv2.COLOR_BGR2YCrCb)
    if POLY0 is not None:
        m = np.zeros((h, w), np.uint8)
        cv2.fillPoly(m, [np.int32(cv2.transform(POLY0[None], A[:2])[0])], 255)
    else:
        m = np.full((h, w), 255, np.uint8)
    if not a.keep_skin:
        skin = ((ycc[..., 1] > 136) & (ycc[..., 0] > 50)).astype(np.uint8) * 255
        m[cv2.dilate(skin, np.ones((41, 41), np.uint8)) > 0] = 0
    if not a.keep_bright:
        m[ycc[..., 0] > 175] = 0
    m[:a.min_y] = 0
    return m


A = [np.eye(3)]
prev = load(0)
pg = cv2.cvtColor(prev, cv2.COLOR_BGR2GRAY)
stat = []
lk = dict(winSize=(25, 25), maxLevel=4)
for i in range(1, N):
    cur = load(i)
    cg = cv2.cvtColor(cur, cv2.COLOR_BGR2GRAY)
    pts = cv2.goodFeaturesToTrack(pg, 1500, 0.004, 7, mask=mask(prev, A[-1]), blockSize=7)
    if pts is None or len(pts) < 12:
        print("few features at", i)
        A.append(A[-1])
        prev, pg = cur, cg
        continue
    q, st, _ = cv2.calcOpticalFlowPyrLK(pg, cg, pts, None, **lk)
    b, st2, _ = cv2.calcOpticalFlowPyrLK(cg, pg, q, None, **lk)
    ok = (st.ravel() == 1) & (st2.ravel() == 1) & (np.linalg.norm((b - pts).reshape(-1, 2), axis=1) < 0.5)
    M, inl = cv2.estimateAffinePartial2D(pts[ok], q[ok], method=cv2.RANSAC, ransacReprojThreshold=1.0, maxIters=5000, confidence=0.999)
    if M is None:
        A.append(A[-1])
    else:
        A.append(np.vstack([M, [0, 0, 1]]) @ A[-1])
        stat.append((i, int(ok.sum()), int(inl.sum())))
    prev, pg = cur, cg
if stat:
    print("inliers min", min(s[2] for s in stat), "at", min(stat, key=lambda s: s[2])[0], "median", int(np.median([s[2] for s in stat])))
json.dump({str(i): A[i][:2].tolist() for i in range(N)}, open(a.out, "w"))

"""Metric depth per frame with DepthPro (apple/DepthPro-hf, local cache) for a plate folder.

Run out of process (heavy: torch, transformers; the model must be in the local Hugging Face cache):
  uv run --no-project --with torch --with torchvision --with transformers --with pillow --with numpy --with opencv-python-headless \
    python tools/scenetext/depth.py PLATE_DIR [--step 1] [--first A --last B]

PLATE_DIR holds %04d.png plates. Writes PLATE_DIR/depth/%04d.npy (float16 metres, 960 px wide) and
PLATE_DIR/depth/focal.json (focal length in pixels per frame). Run it through tools/gpu_lock.sh.
track3d.py needs the reference frame's depth, comp.py the depth of every frame it occludes on
(every 2nd-4th frame is enough: it takes the nearest one).
"""
import argparse
import glob
import json
import os
import time

import cv2
import numpy as np
import torch
from PIL import Image
from transformers import DepthProForDepthEstimation, DepthProImageProcessorFast

ap = argparse.ArgumentParser()
ap.add_argument("plates")
ap.add_argument("--step", type=int, default=1)
ap.add_argument("--first", type=int)
ap.add_argument("--last", type=int)
a = ap.parse_args()

files = sorted(glob.glob(a.plates + "/[0-9][0-9][0-9][0-9].png"))
if a.first is not None and a.last is not None:
    files = files[a.first:a.last + 1]
files = files[::a.step]
dev = "mps" if torch.backends.mps.is_available() else "cpu"
proc = DepthProImageProcessorFast.from_pretrained("apple/DepthPro-hf", local_files_only=True)
model = DepthProForDepthEstimation.from_pretrained("apple/DepthPro-hf", local_files_only=True, torch_dtype=torch.float16 if dev == "mps" else torch.float32).to(dev).eval()
os.makedirs(a.plates + "/depth", exist_ok=True)
fp = a.plates + "/depth/focal.json"
foc = json.load(open(fp)) if os.path.exists(fp) else {}
t0 = time.time()
for k, f in enumerate(files):
    name = os.path.basename(f)[:4]
    out = f"{a.plates}/depth/{name}.npy"
    if os.path.exists(out):
        continue
    im = Image.open(f).convert("RGB")
    inp = proc(images=im, return_tensors="pt").to(dev)
    inp = {x: (y.half() if dev == "mps" and y.dtype.is_floating_point else y) for x, y in inp.items()}
    with torch.no_grad():
        o = model(**inp)
    post = proc.post_process_depth_estimation(o, target_sizes=[(im.height, im.width)])[0]
    dep = post["predicted_depth"].float().cpu().numpy()
    foc[name] = float(post["focal_length"])
    w = 960
    np.save(out, cv2.resize(dep, (w, int(round(w * im.height / im.width))), interpolation=cv2.INTER_AREA).astype(np.float16))
    if k % 20 == 0:
        json.dump(foc, open(fp, "w"))
        print(name, f"{(time.time() - t0) / (k + 1):.2f} s/frame", "focal", round(foc[name]), "median depth", round(float(np.median(dep)), 2), flush=True)
json.dump(foc, open(fp, "w"))
print("done", len(files))

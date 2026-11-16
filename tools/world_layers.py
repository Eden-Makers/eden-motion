"""Split a brand image into depth layers (far, mid, near) for a parallax background that is never black.

Run out of process (heavy: torch, transformers; DepthPro must be in the local Hugging Face cache):
  uv run --no-project --with torch --with torchvision --with transformers --with pillow --with numpy --with opencv-python-headless \
    python tools/world_layers.py IMAGE [IMAGE ...] --out assets/world [--width 4224] [--blur-mask 6]

For each IMAGE (a hero image from the brand's site, a product still, a landscape) it writes
  OUT/<name>_far.png   the whole image (RGBA, opaque)
  OUT/<name>_mid.png   the middle third by depth, soft mask
  OUT/<name>_near.png  the nearest third by depth, soft mask
  OUT/<name>_depth.jpg a preview of the depth
  OUT/world.json       {"<name>": {"width", "height", "layers": ["<name>_far.png", ...]}}
The layers are worked at --width (default 4224, enough to cover 3840x2160 with margin for the parallax
travel). Masks are soft (gaussian --blur-mask px) so the layers blend. Use it with
`"background": "parallax-world"` and `"world": {...}` in storyboard.json (runtime/SCENE_API.md "Worlds"):
the layers drift at 1x, 1.6x and 2.4x and are blurred 12-40 px, so the frame is a living, lit,
out-of-focus place behind the UI. A flat black or a flat colour plate was rejected: it reads as "nothing".
Run it through tools/gpu_lock.sh.
"""
import argparse
import json
import os

import cv2
import numpy as np
import torch
from PIL import Image
from transformers import DepthProForDepthEstimation, DepthProImageProcessorFast

ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
ap.add_argument("images", nargs="+")
ap.add_argument("--out", required=True)
ap.add_argument("--width", type=int, default=4224)
ap.add_argument("--blur-mask", type=float, default=6.0)
a = ap.parse_args()

dev = "mps" if torch.backends.mps.is_available() else "cpu"
proc = DepthProImageProcessorFast.from_pretrained("apple/DepthPro-hf", local_files_only=True)
model = DepthProForDepthEstimation.from_pretrained("apple/DepthPro-hf", local_files_only=True, torch_dtype=torch.float16 if dev == "mps" else torch.float32).to(dev).eval()
os.makedirs(a.out, exist_ok=True)
meta = json.load(open(f"{a.out}/world.json")) if os.path.exists(f"{a.out}/world.json") else {}
soft = lambda x, lo, w: np.clip((x - lo) / w + 0.5, 0, 1)
for path in a.images:
    name = os.path.splitext(os.path.basename(path))[0]
    im = Image.open(path).convert("RGB")
    inp = proc(images=im, return_tensors="pt").to(dev)
    inp = {k: (v.half() if dev == "mps" and v.dtype.is_floating_point else v) for k, v in inp.items()}
    with torch.no_grad():
        o = model(**inp)
    dep = proc.post_process_depth_estimation(o, target_sizes=[(im.height, im.width)])[0]["predicted_depth"].float().cpu().numpy()
    Wt = a.width
    s = Wt / im.width
    Ht = int(im.height * s)
    if Ht < int(Wt * 9 / 16 * 1.1):                       # cover 16:9 with a 10% margin
        Ht = int(Wt * 9 / 16 * 1.1)
        Wt = int(im.width * Ht / im.height)
    rgb = np.asarray(im.resize((Wt, Ht), Image.LANCZOS)).astype(np.uint8)
    inv = 1 / np.clip(cv2.resize(dep, (Wt, Ht)), 0.1, 1e4)
    q = np.quantile(inv, [0.33, 0.66])
    w = (q[1] - q[0]) * 0.25
    near = soft(inv, q[1], w)
    mid = soft(inv, q[0], w) * (1 - near)
    layers = []
    for lname, m in (("far", np.ones_like(inv)), ("mid", mid), ("near", near)):
        al = (cv2.GaussianBlur(m, (0, 0), a.blur_mask) * 255).astype(np.uint8)
        fn = f"{name}_{lname}.png"
        Image.fromarray(np.dstack([rgb, al])).save(os.path.join(a.out, fn))
        layers.append(fn)
    Image.fromarray((np.clip(inv / inv.max(), 0, 1) * 255).astype(np.uint8)).resize((960, int(960 * Ht / Wt))).save(f"{a.out}/{name}_depth.jpg")
    meta[name] = dict(width=Wt, height=Ht, layers=layers)
    print(name, Wt, Ht, "depth tertiles (1/m)", [round(float(x), 3) for x in q])
json.dump(meta, open(f"{a.out}/world.json", "w"), indent=1)

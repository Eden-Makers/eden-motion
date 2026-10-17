"""card-stack: stack of tinted acrylic cards on a transparent background (Relate Ledger rebuild).
params: action = collapse (stack flattens edge-on) | flyoff (top cards lift off) | fan (cards fan out sideways) ;
colors = ["blue","taupe","yellow","green","red","magenta","purple","orange","blue"] ; frames ; fps
EEVEE, about 2 s per 1080p frame. Card colours from product.CARD_COLORS.
"""
import sys, os, json, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
import bpy
from product import *
from chrome import _fcurves

a = sys.argv[sys.argv.index("--") + 1:]
P = json.loads(a[a.index("--params") + 1]) if "--params" in a else {}
OUT = a[a.index("--out") + 1]
PREVIEW = "--preview" in a
F = int(P.get("frames", 45)); FPS = int(P.get("fps", 30)); action = P.get("action", "flyoff")
cols = P.get("colors") or ["blue", "taupe", "yellow", "green", "red", "magenta", "purple"]
reset()
setup(frames=(1, F), fps=FPS, preview=PREVIEW, mb=True)
white_studio(strength=0.6, key=140)
cards = []
for i, k in enumerate(cols):
    c = card(f"C{i}", k if k in CARD_COLORS else "purple", d=0.06, alpha=1.0, trans=0.08)
    sc = 0.7 + 0.3 * i / max(1, len(cols) - 1) if action != "fan" else 1.0
    c.scale = (sc, sc, 1); c.location = (0, 0, i * 0.2); cards.append(c)
if action == "collapse":
    for i, c in enumerate(cards):
        c.keyframe_insert("location", frame=1)
        c.location = (0, 0, (i - (len(cards) - 1) / 2) * 0.06); c.keyframe_insert("location", frame=F)
    cam = camera((0, -12.8, 0.25), (0, 0, 0.0), lens=70)
elif action == "fan":
    for i, c in enumerate(cards):
        c.rotation_mode = "XYZ"; c.rotation_euler = (math.radians(90), 0, 0); c.location = (0, 0.9, 0)
        c.keyframe_insert("location", frame=1); c.keyframe_insert("rotation_euler", frame=1)
        side = -1 if i % 2 == 0 else 1; k = i // 2
        c.location = (side * (1.9 + 0.3 * k), 0.45 + 0.4 * k, 0); c.rotation_euler = (math.radians(90), 0, math.radians(-side * (52 - 2 * k)))
        c.keyframe_insert("location", frame=int(F * 0.6)); c.keyframe_insert("rotation_euler", frame=int(F * 0.6))
        for fc in _fcurves(c.animation_data.action):
            for kp in fc.keyframe_points: kp.interpolation = "EXPO"; kp.easing = "EASE_OUT"
    cam = camera((0, -14, 0.6), (0, 0, 0.05), lens=70)
else:
    top = len(cards) * 0.2
    for j, c in enumerate(cards[-2:]):
        f0 = 1 + int(F * (0.1 + 0.35 * j)); f1 = f0 + int(F * 0.35)
        c.keyframe_insert("location", frame=f0)
        c.location = (0, 0.1, top + 3.2); c.keyframe_insert("location", frame=f1)
        for fc in _fcurves(c.animation_data.action):
            for kp in fc.keyframe_points: kp.interpolation = "QUAD"; kp.easing = "EASE_IN"
    cam = camera((0, -5.7, 2.75), (0, 0.3, 1.2), lens=30)
render({"out": OUT, "preview": PREVIEW, "frames": None}, "f")

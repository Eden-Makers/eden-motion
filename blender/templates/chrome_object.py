"""chrome-object: polished aluminium hero object tumbling on a transparent background.
params: object = block | screw | ring | rodblock | screws3 ; frames ; fps ; spin (deg over the shot) ; gain (env brightness)
Look: near emissive studio dome with vertical softbox strips (flat chrome faces need parallax gradients),
camera inside the dome, Cycles Metal, film transparent. Proven on the Relate Frontier Traders rebuild.
"""
import sys, os, json, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
import bpy
from chrome import *
from chrome import _fcurves

a = sys.argv[sys.argv.index("--") + 1:]
P = json.loads(a[a.index("--params") + 1]) if "--params" in a else {}
OUT = a[a.index("--out") + 1]
PREVIEW = "--preview" in a
F = int(P.get("frames", 30)); FPS = int(P.get("fps", 24)); obj = P.get("object", "block")
spin = float(P.get("spin", 30)); gain = float(P.get("gain", 1.0))
reset()
setup_render(frames=(1, F), fps=FPS, samples=int(P.get("samples", 64)), transparent=True, preview=PREVIEW)
dark = obj in ("screw", "ring", "screws3", "rodblock")
r04_env(gain=gain * (0.85 if dark else 1.0), dark=dark, radius=4.0 if obj == "block" else 14.0)
alu = metal("Alu", color=(0.82, 0.82, 0.84), rough=0.12 if obj != "block" else 0.07, brushed=obj in ("block", "rodblock"))

def tumble(ob, r0, r1, mode="ZXY"):
    ob.rotation_mode = mode
    ob.rotation_euler = tuple(math.radians(v) for v in r0); ob.keyframe_insert("rotation_euler", frame=1)
    ob.rotation_euler = tuple(math.radians(v) for v in r1); ob.keyframe_insert("rotation_euler", frame=F)
    linear_all(ob)

if obj == "block":
    b = machined_block("Block", 1.0, alu, "cube")
    tumble(b, (22, 12, -52), (26, 8, -52 + spin))
    camera((0.0, -6.0, 1.2), (0, 0, 0.0), lens=74)
elif obj == "screw":
    s = socket_screw("S", length=1.2, r=0.1, mat=alu)
    tumble(s, (20, -30, 10), (26, -30 + spin, 18), "XYZ")
    camera((0, -5.2, 0.0), (0, 0, -0.5), lens=55)
elif obj == "screws3":
    for i, (loc, r0) in enumerate([((-0.7, 0, 0.62), (28, -10, 0)), ((-0.05, 0, 0.28), (10, -36, 8)), ((0.85, 0, -0.45), (6, 145, -8))]):
        s = socket_screw(f"S{i}", length=1.2, r=0.1, mat=alu); s.location = loc
        tumble(s, r0, (r0[0] - 6, r0[1] + spin / 3, r0[2] - 6), "XYZ")
    camera((-0.05, -6.8, 0.0), (-0.05, 0, 0.0), lens=55)
elif obj == "ring":
    proto = socket_screw("S", length=0.95, r=0.075, mat=alu)
    ring = bpy.data.objects.new("Ring", None); link(ring)
    N = 10; screws = []
    for i in range(N):
        piv = bpy.data.objects.new(f"P{i}", None); link(piv); piv.parent = ring; piv.rotation_euler = (0, 0, 2 * math.pi * i / N)
        s = proto if i == 0 else proto.copy()
        if i:
            link(s)
            for c in proto.children:
                cc = c.copy(); link(cc); cc.parent = s
        s.parent = piv; s.rotation_euler = (-math.pi / 2, 0, 0); screws.append(s)
    def ring_key(f, rad, sp, tilt=0):
        for s in screws:
            s.location = (0, rad, 0); s.keyframe_insert("location", frame=f)
            s.rotation_euler = (-math.pi / 2 + tilt, 0, 0); s.keyframe_insert("rotation_euler", frame=f)
        ring.rotation_euler = (math.pi / 2 - 0.35, 0.15, sp); ring.keyframe_insert("rotation_euler", frame=f)
    ring_key(1, 1.25, 0); ring_key(int(F * 0.4), 1.2, -0.35); ring_key(int(F * 0.73), 0.55, -1.2, 0.25); ring_key(F, 0.25, -1.9, 0.5)
    camera((0, -9.5, 0), (0, 0, 0), lens=50)
elif obj == "rodblock":
    piv = bpy.data.objects.new("Piv", None); link(piv)
    sp = bpy.data.objects.new("Spin", None); link(sp); sp.parent = piv
    b = machined_block("B", 1.0, alu, "clamp"); b.parent = sp; b.location = (0, 0, -0.1)
    m = rod("Main", 6.0, 0.2, alu, rounded=False, grooves=(1.0,)); m.parent = sp; m.rotation_euler = (0, math.pi / 2, 0); m.location = (3.0, 0, 0)
    st = rod("Stub", 1.3, 0.17, alu, rounded=True, grooves=(-0.2,)); st.parent = sp; st.rotation_euler = (0, math.pi / 2, 0); st.location = (-0.85, 0.22, 0.32)
    piv.rotation_euler = (0, math.radians(48), math.radians(-14))
    tumble(sp, (28, 0, 0), (28 + spin * 1.6, 0, 0), "XYZ")
    camera((-0.55, -6.5, -0.05), (-0.55, 0, -0.05), lens=74)
render({"out": OUT, "preview": PREVIEW, "frames": None}, "f")

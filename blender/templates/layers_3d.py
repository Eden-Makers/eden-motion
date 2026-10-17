"""layers-3d: put pre-rendered 2D assets into real 3D space and film them with a real camera.

Why: HyperFrames (and Remotion) fake depth with CSS 3D: no true depth of field, no real focus pull,
perspective breaks on large rotations, no parallax between layers. Blender does all of it
physically, so UI screenshots, generated stills, HyperFrames-rendered PNG/MOV layers or any video
can be flown through with true DOF, rack focus, real rotation and parallax, then come back as a
transparent webm plate for clip-3d.

params:
  images  = "assets/ui-1.jpg,assets/ui-2.jpg" (paths relative to the project; png/jpg/webp keep
            alpha; mp4/mov/webm play as moving textures)
  layout  = stack (layers one behind another, offset) | row (side by side, curved toward camera)
            | fan (cards fanned around a pivot) | floor (lying on a table, high camera)
  move    = dolly (push through the stack, focus pulls from first to the focus layer)
            | orbit (camera arcs around, focus held) | tilt (layers swing from flat to 3D)
            | float (slow hero drift)
  focus   = index of the layer in focus (default last for dolly, else 0)
  fstop   = aperture, lower = shallower (default 2.8; 1.4 = only a sliver of the focus layer is sharp)    lens = mm (default 50)
  spin    = degrees of orbit / tilt (default 28)          gap = depth between layers (default 1.6)
  round   = corner radius in % of the short side (default 3, 0 = square)
  engine  = eevee (default, ~1-2 s per 1080p frame) | cycles (cleaner bokeh, slower)
  frames, fps (set by eden-motion from the scene duration)
Assets render unlit (emission), so UI colours stay exactly as captured.
"""
import sys, os, json, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
import bpy
from product import setup, rounded_slab, uv_planar
from chrome import reset, camera, link, look_at, render, _fcurves

a = sys.argv[sys.argv.index("--") + 1:]
P = json.loads(a[a.index("--params") + 1]) if "--params" in a else {}
OUT = a[a.index("--out") + 1]
PREVIEW = "--preview" in a
ROOT = os.environ.get("EM_PROJECT", os.getcwd())
F = int(P.get("frames", 72)); FPS = int(P.get("fps", 24))
imgs = P.get("images") or []
imgs = [imgs] if isinstance(imgs, str) else list(imgs)
imgs = [i if os.path.isabs(i) else os.path.join(ROOT, i) for i in imgs if i]
if not imgs:
    raise SystemExit("layers-3d: give images=path1,path2 (relative to the project)")
layout = P.get("layout", "stack"); move = P.get("move", "dolly")
n = len(imgs)
focus = int(P.get("focus", n - 1 if move == "dolly" else 0)); focus = max(0, min(n - 1, focus))
fstop = float(P.get("fstop", 2.8)); lens = float(P.get("lens", 50))
spin = math.radians(float(P.get("spin", 28))); gap = float(P.get("gap", 1.6))
rnd = float(P.get("round", 3)) / 100.0
VIDEO = (".mp4", ".mov", ".webm", ".m4v")

reset()
sc = setup(engine="CYCLES" if P.get("engine") == "cycles" else "EEVEE", frames=(1, F), fps=FPS, preview=PREVIEW, samples=64, mb=True)
sc.render.resolution_x, sc.render.resolution_y = int(P.get("width", 1920)), int(P.get("height", 1080))
if hasattr(sc.eevee, "use_bokeh_jittered"):
    sc.eevee.use_bokeh_jittered = True  # real bokeh shapes instead of the fast blur
# Built in 4-unit planes, then the whole rig is scaled to tabletop size (a 40 cm screen): depth
# of field depends on real distances, so at building scale even f/1.4 would barely blur.
root = link(bpy.data.objects.new("Root", None)); root.scale = (0.1, 0.1, 0.1)
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0


def asset_mat(name, path):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.extension = "CLIP"
    img = bpy.data.images.load(path)
    tex.image = img
    if path.lower().endswith(VIDEO):
        img.source = "MOVIE"
        tex.image_user.frame_duration = F + 2
        tex.image_user.frame_start = 1
        tex.image_user.use_auto_refresh = True
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = 1.0
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(tex.outputs["Color"], em.inputs["Color"])
    nt.links.new(tex.outputs["Alpha"], mix.inputs["Fac"])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    if hasattr(m, "surface_render_method"):
        m.surface_render_method = "BLENDED"
    elif hasattr(m, "blend_method"):
        m.blend_method = "BLEND"
    sz = img.size if img.size[0] else (1920, 1080)
    return m, sz[1] / max(1, sz[0])


# planes: upright, facing -Y (toward the camera), width 4 units
W = 4.0
planes = []
for i, path in enumerate(imgs):
    m, aspect = asset_mat(f"A{i}", path)
    H = W * aspect
    ob = rounded_slab(f"L{i}", W, H, 0.004, rnd * min(W, H)) if rnd > 0 else None
    if ob is None:
        bpy.ops.mesh.primitive_plane_add(size=1); ob = bpy.context.active_object; ob.name = f"L{i}"
        ob.scale = (W, H, 1); bpy.ops.object.transform_apply(scale=True)
    uv_planar(ob, W, H)
    ob.data.materials.clear(); ob.data.materials.append(m)
    ob.rotation_mode = "XYZ"
    ob.rotation_euler = (math.radians(90), 0, 0)
    ob.parent = root
    planes.append(ob)

mid = (n - 1) / 2
for i, ob in enumerate(planes):
    if layout == "row":
        ang = (i - mid) * 0.32
        ob.location = (math.sin(ang) * 5.2, -math.cos(ang) * 5.2 + 5.2, 0)
        ob.rotation_euler = (math.radians(90), 0, ang)
    elif layout == "fan":
        ang = (i - mid) * 0.22
        ob.location = (math.sin(ang) * 2.2, i * 0.06, -math.cos(ang) * 2.2 + 2.2)
        ob.rotation_euler = (math.radians(90), -ang * 1.4, 0)
    elif layout == "floor":
        ob.rotation_euler = (0, 0, (i - mid) * 0.08)
        ob.location = ((i - mid) * 1.1, (i - mid) * 0.9, i * 0.02)
    else:  # stack: one behind another, stepping right and back
        ob.location = ((i - mid) * 1.15, i * gap, (i - mid) * -0.18)
        ob.rotation_euler = (math.radians(90), 0, math.radians(-6))

# focus target: an empty we can animate (rack focus)
tgt = link(bpy.data.objects.new("Focus", None)); tgt.parent = root
tgt.location = planes[focus].location.copy()
# frame the whole arrangement: horizontal FOV from the lens on a 36 mm sensor
span = W + (n - 1) * (1.15 if layout in ("stack", "floor") else W * 0.9) + 1.6
far = span / (2 * math.tan(math.atan(18 / lens)))
if layout == "floor":
    cam = camera((0, -far * 0.75, far * 0.85), (0, 0, 0), lens=lens, dof_obj=tgt, fstop=fstop)
else:
    cam = camera((0, -far, 0.35), (0, (n - 1) * gap * 0.5 if layout == "stack" else 0, 0), lens=lens, dof_obj=tgt, fstop=fstop)
cam.parent = root
cam.data.clip_start = 0.01
cam.data.sensor_fit = "HORIZONTAL"  # the framing maths assumes a 36 mm horizontal sensor, portrait too
cam.location = cam.location  # local to the scaled root from here on


def ease(ob, easing="EASE_OUT"):
    # no linear moves: pushes and drifts start with energy and settle into the cut (sine.out),
    # swings that read as one gesture use EASE_IN_OUT
    if ob.animation_data and ob.animation_data.action:
        for fc in _fcurves(ob.animation_data.action):
            for kp in fc.keyframe_points:
                kp.interpolation = "SINE"; kp.easing = easing


center = sum((p.location for p in planes), planes[0].location * 0) / n
if move == "orbit":
    piv = link(bpy.data.objects.new("Pivot", None)); piv.parent = root; piv.location = center
    cam.parent = piv; cam.location = cam.location - center
    piv.rotation_euler = (0, 0, -spin / 2); piv.keyframe_insert("rotation_euler", frame=1)
    piv.rotation_euler = (0, 0, spin / 2); piv.keyframe_insert("rotation_euler", frame=F)
    ease(piv, "EASE_IN_OUT")
elif move == "tilt":
    for i, ob in enumerate(planes):
        r1 = ob.rotation_euler.copy()
        ob.rotation_euler = (math.radians(90), 0, 0) if layout != "floor" else (0, 0, 0)
        ob.keyframe_insert("rotation_euler", frame=1)
        ob.rotation_euler = (r1[0], r1[1], r1[2] + (spin if layout != "floor" else 0)) if layout != "floor" else (spin * 0.6, 0, r1[2])
        ob.keyframe_insert("rotation_euler", frame=int(F * 0.8))
        ease(ob, "EASE_IN_OUT")
elif move == "float":
    for i, ob in enumerate(planes):
        ob.keyframe_insert("location", frame=1)
        ob.location = ob.location + type(ob.location)((0.0, 0.0, 0.12 * (1 if i % 2 else -1)))
        ob.keyframe_insert("location", frame=F)
        ease(ob)
    cam.keyframe_insert("location", frame=1)
    cam.location = cam.location + type(cam.location)((0.25, 0.6, 0.0))
    cam.keyframe_insert("location", frame=F)
    ease(cam)
else:  # dolly: push in, focus racks from the first layer to the focus layer
    tgt.location = planes[0].location.copy(); tgt.keyframe_insert("location", frame=1)
    tgt.location = planes[focus].location.copy(); tgt.keyframe_insert("location", frame=int(F * 0.7))
    ease(tgt, "EASE_IN_OUT")  # a rack focus is one deliberate gesture
    cam.keyframe_insert("location", frame=1)
    cam.location = cam.location + type(cam.location)((0.0, far * 0.35, 0.0))
    cam.keyframe_insert("location", frame=F)
    ease(cam)

render({"out": OUT, "preview": PREVIEW, "frames": None}, "f")

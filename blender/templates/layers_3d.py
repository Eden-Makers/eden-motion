"""layers-3d: put pre-rendered 2D assets into real 3D space and film them with a real camera.

Why: HyperFrames (and Remotion) fake depth with CSS 3D: no true depth of field, no real focus pull,
perspective breaks on large rotations, no parallax between layers. Blender does all of it
physically, so UI screenshots, generated stills, HyperFrames-rendered PNG/MOV layers or any video
can be flown through with true DOF, rack focus, real rotation and parallax, then come back as a
transparent webm plate for clip-3d.

params:
  images  = "assets/ui-1.jpg,assets/ui-2.jpg" (paths relative to the project; png/jpg/webp keep
            alpha; mp4/mov/webm play as moving textures)
  layout  = stack (layers one behind another, offset) | tower (vertical stack for portrait)
            | row (side by side, curved toward camera) | fan (cards fanned around a pivot)
            | floor (lying on a table, high camera)
            | carousel (circular 3D ring of screens orbiting smoothly with optical DOF)
            | wall (multi-row masonry/grid wall with Z-depth variation and sweeping dolly)
            | fisheye-wall (curved concave wraparound screen wall with wide 18-24mm lens)
            | exploded (layered UI components separating/assembling along depth axis with DOF)
  move    = dolly (push through the stack, focus pulls from first to the focus layer)
            | orbit (camera arcs around, focus held) | tilt (layers swing from flat to 3D)
            | float (slow hero drift) | assemble (for exploded: start separated, snap together)
            | explode (for exploded: start assembled, separate apart)
  loop    = 0 | 1 (default 0; 1 = mathematically seamless periodic loop from frame 1..F)
  focus   = index of the layer in focus (default last for dolly, else 0)
  fstop   = aperture, lower = shallower (default 2.8; 1.4 = only a sliver of the focus layer is sharp)
  lens    = mm (default 50; defaults to 20 for fisheye-wall)
  spin    = degrees of orbit / tilt (default 28; 75 for non-loop carousel)
  gap     = depth between layers (default 1.6)
  round   = corner radius in % of the short side (default 3, 0 = square)
  cols    = grid columns override for wall / fisheye-wall (auto if omitted)
  engine  = eevee (default, ~1-2 s per 1080p frame) | cycles (cleaner bokeh, slower)
  frames, fps (set by eden-motion from the scene duration)
Assets render unlit (emission), so UI colours stay exactly as captured.
"""
import sys, os, json, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
import bpy
from mathutils import Vector
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

layout = str(P.get("layout", "stack")).lower()
loop_raw = P.get("loop", 0)
LOOP = str(loop_raw).lower() in ("1", "true", "yes", "on") if not isinstance(loop_raw, (int, float, bool)) else bool(loop_raw)
default_move = "orbit" if layout == "carousel" else "explode" if layout == "exploded" else "dolly"
move = str(P.get("move", default_move)).lower()
n_src = len(imgs)
focus = int(P.get("focus", n_src - 1 if move in ("dolly", "explode") else 0))
focus = max(0, min(n_src - 1, focus))
fstop = float(P.get("fstop", 2.2 if layout in ("carousel", "exploded") else 2.8))
default_lens = 20.0 if layout == "fisheye-wall" else 50.0
lens = float(P.get("lens", default_lens))
if layout == "fisheye-wall" and "lens" not in P:
    lens = 20.0
default_spin = 75.0 if layout == "carousel" else 28.0
spin = math.radians(float(P.get("spin", default_spin)))
gap = float(P.get("gap", 1.6))
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

_mat_cache = {}


def asset_mat(name, path):
    if path in _mat_cache:
        return _mat_cache[path]
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
    res = (m, sz[1] / max(1, sz[0]))
    _mat_cache[path] = res
    return res


def make_plane(idx, path, width=4.0, parent_obj=root):
    m, aspect = asset_mat(f"A{idx}", path)
    h = width * aspect
    ob = rounded_slab(f"L{idx}", width, h, 0.004, rnd * min(width, h)) if rnd > 0 else None
    if ob is None:
        bpy.ops.mesh.primitive_plane_add(size=1); ob = bpy.context.active_object; ob.name = f"L{idx}"
        ob.scale = (width, h, 1); bpy.ops.object.transform_apply(scale=True)
    uv_planar(ob, width, h)
    ob.data.materials.clear(); ob.data.materials.append(m)
    ob.rotation_mode = "XYZ"
    ob.rotation_euler = (math.radians(90), 0, 0)
    ob.parent = parent_obj
    return ob, h


# For multi-row wall / fisheye-wall, tile source images so the wall always reads as a dense
# multi-row mosaic with the focused image dead-center.
W = 4.0
if layout in ("wall", "fisheye-wall"):
    if layout == "fisheye-wall":
        cols = int(P.get("cols", 0)) or 5
        rows = max(3, math.ceil(max(n_src, cols * 3) / cols))
    else:
        target_min = 9
        total_tiles = max(n_src, target_min)
        cols = int(P.get("cols", 0)) or (3 if total_tiles <= 9 else 4)
        rows = max(3, math.ceil(total_tiles / cols))
    total_tiles = cols * rows
    center_idx = (rows // 2) * cols + (cols // 2)
    tile_imgs = []
    for k in range(total_tiles):
        if k == center_idx:
            tile_imgs.append(imgs[focus])
        else:
            tile_imgs.append(imgs[(k + (1 if k >= center_idx else 0)) % n_src])
    focus_idx = center_idx
else:
    tile_imgs = list(imgs)
    focus_idx = focus

n = len(tile_imgs)
ring_piv = link(bpy.data.objects.new("RingPivot", None)) if layout == "carousel" else None
if ring_piv is not None:
    ring_piv.parent = root

planes = []
heights = []
for i, path in enumerate(tile_imgs):
    ob, h = make_plane(i, path, W, ring_piv if ring_piv is not None else root)
    planes.append(ob)
    heights.append(h)

avg_h = sum(heights) / max(1, len(heights))
mid = (n - 1) / 2
PORTRAIT = int(P.get("height", 1080)) > int(P.get("width", 1920))
if PORTRAIT and layout == "stack":
    layout = "tower"  # landscape screens side by side waste a vertical frame; stack them upward

# Layout placement
ring_r = 0.0
wall_w = 0.0
wall_h = 0.0
fisheye_r = 0.0
exploded_sep = max(0.65, gap * 0.7)

if layout == "carousel":
    ring_r = max(W * 0.95, n * (W + gap * 0.55) / (2 * math.pi))
    for i, ob in enumerate(planes):
        ang = 2.0 * math.pi * i / n
        ob.location = (ring_r * math.sin(ang), -ring_r * math.cos(ang), 0.0)
        ob.rotation_euler = (math.radians(90), 0.0, ang)
elif layout == "wall":
    cell_w = W + 0.48
    cell_h = avg_h + 0.48
    wall_w = cols * cell_w
    wall_h = rows * cell_h
    for i, ob in enumerate(planes):
        r = i // cols
        c = i % cols
        # Masonry stagger on odd rows (hero center row stays aligned)
        stagger_x = 0.28 * cell_w if (r % 2 == 1 and r != rows // 2) else 0.0
        x = (c - (cols - 1) / 2.0) * cell_w + stagger_x
        z = ((rows - 1) / 2.0 - r) * cell_h
        # Deterministic Z-depth variation (Blender Y axis): hero stays at y=0
        depth_step = 0.0 if i == focus_idx else (((r * 7 + c * 13) % 5) - 2) * (gap * 0.28)
        ob.location = (x, depth_step, z)
        ob.rotation_euler = (math.radians(90), 0.0, 0.0)
elif layout == "fisheye-wall":
    cell_w = W + 0.34
    cell_h = avg_h + 0.34
    arc_span = math.radians(min(126.0, max(84.0, cols * 22.0)))
    fisheye_r = max(W * 2.0, (cols * cell_w) / arc_span)
    wall_w = cols * cell_w
    wall_h = rows * cell_h
    for i, ob in enumerate(planes):
        r = i // cols
        c = i % cols
        theta = ((c - (cols - 1) / 2.0) / max(1.0, (cols - 1) / 2.0)) * (arc_span * 0.5) if cols > 1 else 0.0
        z = ((rows - 1) / 2.0 - r) * cell_h
        # Concave wraparound curving forward around the camera toward -Y
        x = fisheye_r * math.sin(theta)
        y = fisheye_r * math.cos(theta)
        # Subtle spherical pitch toward center horizon
        pitch = math.atan2(z, fisheye_r) * 0.45
        ob.location = (x, y, z)
        ob.rotation_euler = (math.radians(90) + pitch, 0.0, -theta)
elif layout == "exploded":
    # Layered UI components aligned on the normal axis (Blender Y) so they assemble into
    # one cohesive interface at small sep and separate cleanly along depth when exploded.
    for i, ob in enumerate(planes):
        ob.location = (0.0, -(i - mid) * exploded_sep, 0.0)
        ob.rotation_euler = (math.radians(90), 0.0, 0.0)
else:
    for i, ob in enumerate(planes):
        if layout == "tower":
            hh = heights[i]
            ob.location = ((i - mid) * 0.35, i * gap * 0.6, -(i - mid) * hh * 0.82)
            ob.rotation_euler = (math.radians(90), 0, math.radians(-8 + 4 * (i - mid)))
        elif layout == "row":
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

# Focus target empty (supports animated rack focus)
tgt = link(bpy.data.objects.new("Focus", None)); tgt.parent = root
tgt.location = planes[focus_idx].location.copy()

# Camera placement & framing (36 mm sensor)
fov_tan = 18.0 / lens  # tan(atan(18 / lens)) == 18 / lens
if layout == "carousel":
    # Frame the front hero card + flanking ring cards so rear cards melt into optical bokeh
    front_span = W * (1.85 if not PORTRAIT else 1.45)
    cam_dist = front_span / (2.0 * fov_tan)
    tgt.location = Vector((0.0, -ring_r, 0.0))
    cam = camera((0.0, -ring_r - cam_dist, 0.65), (0.0, -ring_r * 0.2, 0.0), lens=lens, dof_obj=tgt, fstop=fstop)
    far = cam_dist
elif layout == "wall":
    span = max(W * 2.4, wall_w * 0.86)
    far = span / (2.0 * fov_tan)
    cam = camera((-wall_w * 0.14, -far, -wall_h * 0.06), (0.0, 0.0, 0.0), lens=lens, dof_obj=tgt, fstop=fstop)
elif layout == "fisheye-wall":
    # Start close to hero center card (macro) and pull back past cylinder center so all curved
    # side columns wrap dramatically into the wide 18-24mm FOV.
    macro_dist = (W * 1.15) / (2.0 * fov_tan)
    half_arc = arc_span * 0.5
    edge_x = fisheye_r * math.sin(half_arc) + W * 0.45 * math.cos(half_arc)
    edge_y = fisheye_r * math.cos(half_arc)
    cam_y_wide = edge_y - edge_x / max(0.35, fov_tan * 0.96)
    cam_y_macro = fisheye_r - macro_dist
    far = fisheye_r - cam_y_wide
    cam = camera((0.0, cam_y_macro, 0.0), (0.0, fisheye_r, 0.0), lens=lens, dof_obj=tgt, fstop=fstop)
elif layout == "exploded":
    # 3/4 architectural angle so separated depth layers read clearly even for opaque UI plates
    stack_depth = max(1.0, (n - 1) * exploded_sep)
    span = W * 1.38 + stack_depth * 0.65
    far = span / (2.0 * fov_tan)
    az = math.radians(30.0)
    el = math.radians(13.0)
    cam_loc = (
        far * math.sin(az) * math.cos(el),
        -far * math.cos(az) * math.cos(el),
        far * math.sin(el),
    )
    cam = camera(cam_loc, (0.0, 0.0, 0.0), lens=lens, dof_obj=tgt, fstop=fstop)
else:
    span = W + (n - 1) * (1.15 if layout in ("stack", "floor") else W * 0.9) + 1.6
    far = span / (2.0 * fov_tan)
    if layout == "tower":
        span_v = sum(heights) * 0.82 + heights[0] * 0.3 + 1.0
        far = max(span_v / (2.0 * fov_tan), (W + 1.4) / (2.0 * (18.0 * 0.5625 / lens)))
    if layout == "floor":
        cam = camera((0, -far * 0.75, far * 0.85), (0, 0, 0), lens=lens, dof_obj=tgt, fstop=fstop)
    else:
        cam = camera((0, -far, 0.35), (0, (n - 1) * gap * (0.5 if layout == "stack" else 0.3 if layout == "tower" else 0), 0), lens=lens, dof_obj=tgt, fstop=fstop)

cam.parent = root
cam.data.clip_start = 0.01
# framing maths assumes a 36 mm sensor on the axis being framed
cam.data.sensor_fit = "VERTICAL" if layout == "tower" else "HORIZONTAL"
cam.data.sensor_height = 36.0; cam.data.sensor_width = 36.0  # VERTICAL fit reads sensor_height (24 mm by default)
cam.location = cam.location  # local to the scaled root from here on


def ease(ob, easing="EASE_OUT", interp="SINE"):
    # no linear moves: pushes and drifts start with energy and settle into the cut (sine.out),
    # swings that read as one gesture use EASE_IN_OUT
    if ob.animation_data and ob.animation_data.action:
        for fc in _fcurves(ob.animation_data.action):
            for kp in fc.keyframe_points:
                kp.interpolation = interp; kp.easing = easing


def sample_periodic(fn):
    """Evaluate fn(u) across frames 0..F+2 where u = (frame - 1) / F so frame 1 and frame F+1
    match identically (including motion-blur derivatives across the loop boundary)."""
    for f in range(0, F + 3):
        u = (f - 1) / float(F)
        fn(f, u)


def make_linear(ob):
    if ob.animation_data and ob.animation_data.action:
        for fc in _fcurves(ob.animation_data.action):
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"


center = sum((p.location for p in planes), Vector((0.0, 0.0, 0.0))) / max(1, n)

# Animation: specialized motion for new layouts + exact seamless periodic loop when LOOP=True
if layout == "carousel":
    cam_base = cam.location.copy()
    if LOOP:
        def _car_loop(f, u):
            ring_piv.rotation_euler = (0.0, 0.0, 2.0 * math.pi * u)
            ring_piv.keyframe_insert("rotation_euler", frame=f)
            cam.location = cam_base + Vector((0.0, 0.0, 0.14 * math.sin(2.0 * math.pi * u)))
            cam.keyframe_insert("location", frame=f)
        sample_periodic(_car_loop)
        make_linear(ring_piv)
        make_linear(cam)
    elif move == "dolly":
        # Push closer into the ring while rotating gently and racking focus from front to next card
        ring_piv.rotation_euler = (0.0, 0.0, -spin * 0.25); ring_piv.keyframe_insert("rotation_euler", frame=1)
        ring_piv.rotation_euler = (0.0, 0.0, spin * 0.75); ring_piv.keyframe_insert("rotation_euler", frame=F)
        ease(ring_piv, "EASE_IN_OUT")
        tgt.location = Vector((0.0, -ring_r * 1.05, 0.0)); tgt.keyframe_insert("location", frame=1)
        tgt.location = Vector((0.0, -ring_r * 0.92, 0.0)); tgt.keyframe_insert("location", frame=int(F * 0.75))
        ease(tgt, "EASE_IN_OUT")
        cam.keyframe_insert("location", frame=1)
        cam.location = cam_base + Vector((0.0, far * 0.22, -0.15))
        cam.keyframe_insert("location", frame=F)
        ease(cam, "EASE_OUT")
    else:
        ring_piv.rotation_euler = (0.0, 0.0, -spin * 0.35); ring_piv.keyframe_insert("rotation_euler", frame=1)
        ring_piv.rotation_euler = (0.0, 0.0, spin * 0.65); ring_piv.keyframe_insert("rotation_euler", frame=F)
        ease(ring_piv, "EASE_IN_OUT")
        cam.keyframe_insert("location", frame=1)
        cam.location = cam_base + Vector((0.0, far * 0.12, -0.12))
        cam.keyframe_insert("location", frame=F)
        ease(cam, "EASE_OUT")

elif layout == "wall":
    cam_base = Vector((0.0, -far, 0.0))
    if LOOP:
        def _wall_loop(f, u):
            ang = 2.0 * math.pi * u
            cam.location = cam_base + Vector((
                wall_w * 0.14 * math.sin(ang),
                far * 0.16 * (0.5 - 0.5 * math.cos(ang)),
                wall_h * 0.08 * math.sin(2.0 * ang) * 0.5,
            ))
            look_at(cam, (0.0, 0.0, 0.0))
            cam.keyframe_insert("location", frame=f)
            cam.keyframe_insert("rotation_euler", frame=f)
        sample_periodic(_wall_loop)
        make_linear(cam)
    else:
        # Smooth sweeping dolly from off-axis wide to centered closer hero framing
        tgt.location = planes[0].location.copy(); tgt.keyframe_insert("location", frame=1)
        tgt.location = planes[focus_idx].location.copy(); tgt.keyframe_insert("location", frame=int(F * 0.72))
        ease(tgt, "EASE_IN_OUT")
        cam.keyframe_insert("location", frame=1)
        cam.keyframe_insert("rotation_euler", frame=1)
        cam.location = Vector((wall_w * 0.08, -far * 0.68, wall_h * 0.04))
        look_at(cam, planes[focus_idx].location)
        cam.keyframe_insert("location", frame=F)
        cam.keyframe_insert("rotation_euler", frame=F)
        ease(cam, "EASE_OUT")

elif layout == "fisheye-wall":
    # Dramatic macro-to-wide reveal on wide lens
    pull = cam_y_macro - cam_y_wide
    if LOOP:
        def _fish_loop(f, u):
            ang = 2.0 * math.pi * u
            t = 0.5 - 0.5 * math.cos(ang)
            cam.location = Vector((
                0.35 * math.sin(ang),
                cam_y_macro - pull * t,
                0.15 * math.sin(ang),
            ))
            look_at(cam, (0.0, fisheye_r, 0.0))
            cam.keyframe_insert("location", frame=f)
            cam.keyframe_insert("rotation_euler", frame=f)
        sample_periodic(_fish_loop)
        make_linear(cam)
    else:
        cam.location = Vector((0.0, cam_y_macro, 0.0))
        look_at(cam, planes[focus_idx].location)
        cam.keyframe_insert("location", frame=1)
        cam.keyframe_insert("rotation_euler", frame=1)
        cam.location = Vector((0.0, cam_y_wide, 0.0))
        look_at(cam, (0.0, fisheye_r, 0.0))
        cam.keyframe_insert("location", frame=F)
        cam.keyframe_insert("rotation_euler", frame=F)
        ease(cam, "EASE_OUT")

elif layout == "exploded":
    piv = link(bpy.data.objects.new("Pivot", None)); piv.parent = root; piv.location = Vector((0.0, 0.0, 0.0))
    cam.parent = piv
    tight_sep = 0.06
    full_sep = exploded_sep
    if LOOP:
        def _exp_loop(f, u):
            ang = 2.0 * math.pi * u
            t = 0.5 - 0.5 * math.cos(ang)
            sep = tight_sep + (full_sep - tight_sep) * t
            for i, ob in enumerate(planes):
                ob.location = (0.0, -(i - mid) * sep, 0.0)
                ob.keyframe_insert("location", frame=f)
            piv.rotation_euler = (0.0, 0.0, math.radians(7.0) * math.sin(ang))
            piv.keyframe_insert("rotation_euler", frame=f)
            tgt.location = Vector((0.0, -(focus_idx - mid) * sep, 0.0))
            tgt.keyframe_insert("location", frame=f)
        sample_periodic(_exp_loop)
        for ob in planes:
            make_linear(ob)
        make_linear(piv)
        make_linear(tgt)
    else:
        s0, s1 = (full_sep, tight_sep) if move == "assemble" else (tight_sep, full_sep)
        f_end = int(F * 0.82)
        for i, ob in enumerate(planes):
            ob.location = (0.0, -(i - mid) * s0, 0.0)
            ob.keyframe_insert("location", frame=1)
            ob.location = (0.0, -(i - mid) * s1, 0.0)
            ob.keyframe_insert("location", frame=f_end)
            ease(ob, "EASE_IN_OUT")
        piv.rotation_euler = (0.0, 0.0, -spin * 0.35); piv.keyframe_insert("rotation_euler", frame=1)
        piv.rotation_euler = (0.0, 0.0, spin * 0.35); piv.keyframe_insert("rotation_euler", frame=F)
        ease(piv, "EASE_OUT")
        tgt.location = Vector((0.0, -(0 - mid) * s0, 0.0)); tgt.keyframe_insert("location", frame=1)
        tgt.location = Vector((0.0, -(focus_idx - mid) * s1, 0.0)); tgt.keyframe_insert("location", frame=f_end)
        ease(tgt, "EASE_IN_OUT")

elif LOOP:
    # Seamless loop support for stack, tower, row, fan, floor
    if move == "orbit":
        piv = link(bpy.data.objects.new("Pivot", None)); piv.parent = root; piv.location = center
        cam.parent = piv; cam.location = cam.location - center
        def _orb_loop(f, u):
            piv.rotation_euler = (0.0, 0.0, (spin * 0.5) * math.sin(2.0 * math.pi * u))
            piv.keyframe_insert("rotation_euler", frame=f)
        sample_periodic(_orb_loop)
        make_linear(piv)
    elif move == "tilt":
        base_rots = [ob.rotation_euler.copy() for ob in planes]
        def _tilt_loop(f, u):
            t = 0.5 - 0.5 * math.cos(2.0 * math.pi * u)
            for ob, r1 in zip(planes, base_rots):
                if layout != "floor":
                    ob.rotation_euler = (r1[0], r1[1], r1[2] + spin * t)
                else:
                    ob.rotation_euler = (spin * 0.6 * t, 0.0, r1[2])
                ob.keyframe_insert("rotation_euler", frame=f)
        sample_periodic(_tilt_loop)
        for ob in planes:
            make_linear(ob)
    elif move == "float":
        base_locs = [ob.location.copy() for ob in planes]
        cam_base = cam.location.copy()
        def _flt_loop(f, u):
            ang = 2.0 * math.pi * u
            for i, (ob, loc) in enumerate(zip(planes, base_locs)):
                ob.location = loc + Vector((0.0, 0.0, 0.14 * math.sin(ang + i * 1.1)))
                ob.keyframe_insert("location", frame=f)
            cam.location = cam_base + Vector((0.25 * math.sin(ang), 0.45 * (0.5 - 0.5 * math.cos(ang)), 0.0))
            cam.keyframe_insert("location", frame=f)
        sample_periodic(_flt_loop)
        for ob in planes:
            make_linear(ob)
        make_linear(cam)
    else:  # dolly periodic
        cam_base = cam.location.copy()
        p0 = planes[0].location.copy()
        pf = planes[focus_idx].location.copy()
        def _dol_loop(f, u):
            t = 0.5 - 0.5 * math.cos(2.0 * math.pi * u)
            tgt.location = p0.lerp(pf, t)
            tgt.keyframe_insert("location", frame=f)
            cam.location = cam_base + Vector((0.0, far * 0.28 * t, 0.0))
            cam.keyframe_insert("location", frame=f)
        sample_periodic(_dol_loop)
        make_linear(tgt)
        make_linear(cam)

else:
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
            ob.location = ob.location + Vector((0.0, 0.0, 0.12 * (1 if i % 2 else -1)))
            ob.keyframe_insert("location", frame=F)
            ease(ob)
        cam.keyframe_insert("location", frame=1)
        cam.location = cam.location + Vector((0.25, 0.6, 0.0))
        cam.keyframe_insert("location", frame=F)
        ease(cam)
    else:  # dolly: push in, focus racks from the first layer to the focus layer
        tgt.location = planes[0].location.copy(); tgt.keyframe_insert("location", frame=1)
        tgt.location = planes[focus_idx].location.copy(); tgt.keyframe_insert("location", frame=int(F * 0.7))
        ease(tgt, "EASE_IN_OUT")  # a rack focus is one deliberate gesture
        cam.keyframe_insert("location", frame=1)
        cam.location = cam.location + Vector((0.0, far * 0.35, 0.0))
        cam.keyframe_insert("location", frame=F)
        ease(cam)

render({"out": OUT, "preview": PREVIEW, "frames": P.get("only")}, "f")

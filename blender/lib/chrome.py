"""eden-motion chrome studio helpers (from the Relate Frontier Traders 1:1 rebuild, 2026-10-17).

Run shot scripts as:  blender -b --factory-startup -P shot_x.py -- --out DIR [--preview]
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector, Euler

STUDIO_HDRI = "/Applications/Blender.app/Contents/Resources/5.2/datafiles/studiolights/world/studio.exr"


def args():
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    o = {"out": "/tmp/r04", "preview": False, "frames": None}
    i = 0
    while i < len(a):
        if a[i] == "--out": o["out"] = a[i + 1]; i += 2
        elif a[i] == "--preview": o["preview"] = True; i += 1
        elif a[i] == "--frames": o["frames"] = [int(x) for x in a[i + 1].split(",")]; i += 2
        else: i += 1
    return o


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def setup_render(engine="CYCLES", w=1920, h=1080, fps=24, frames=(1, 30), samples=64,
                 transparent=True, preview=False, motion_blur=True, shutter=0.5):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 50 if preview else 100
    sc.render.fps = fps
    sc.frame_start, sc.frame_end = frames
    sc.render.film_transparent = transparent
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA" if transparent else "RGB"
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.render.use_motion_blur = motion_blur
    if engine == "CYCLES":
        sc.render.engine = "CYCLES"
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = d.type == "METAL"
        sc.cycles.device = "GPU"
        sc.cycles.samples = max(8, samples // (4 if preview else 1))
        sc.cycles.use_denoising = True
        sc.cycles.denoiser = "OPENIMAGEDENOISE"
        sc.cycles.max_bounces = 8
        sc.cycles.glossy_bounces = 6
        sc.cycles.transparent_max_bounces = 8
        sc.render.motion_blur_shutter = shutter
    else:
        sc.render.engine = "BLENDER_EEVEE"
        sc.eevee.taa_render_samples = max(8, samples // (4 if preview else 1))
    return sc


def world_hdri(strength=1.0, rot_z=0.0, bg_color=None, bg_strength=1.0):
    """HDRI lights + reflects; camera sees bg_color (or transparent film)."""
    w = bpy.data.worlds.new("W")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0, 0, rot_z)
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(STUDIO_HDRI)
    bgh = nt.nodes.new("ShaderNodeBackground")
    bgh.inputs["Strength"].default_value = strength
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], bgh.inputs["Color"])
    if bg_color is None:
        nt.links.new(bgh.outputs[0], out.inputs[0])
    else:
        bgc = nt.nodes.new("ShaderNodeBackground")
        bgc.inputs["Color"].default_value = (*bg_color, 1)
        bgc.inputs["Strength"].default_value = bg_strength
        lp = nt.nodes.new("ShaderNodeLightPath")
        mix = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs[0])
        nt.links.new(bgh.outputs[0], mix.inputs[1])
        nt.links.new(bgc.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], out.inputs[0])
    return w


def area_light(name, loc, rot, size=(4, 1), energy=500, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, "AREA")
    ld.shape = "RECTANGLE"
    ld.size, ld.size_y = size
    ld.energy = energy
    ld.color = color
    ob = bpy.data.objects.new(name, ld)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = rot
    return ob


def look_at(ob, target):
    d = Vector(target) - ob.location
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def softbox_studio(key=900, fill=300, rim=600):
    """Large soft strips that read as long highlights on polished metal."""
    k = area_light("key", (3.5, -3.0, 4.0), (0, 0, 0), (6, 1.2), key)
    look_at(k, (0, 0, 0))
    f = area_light("fill", (-4.5, -2.0, 1.5), (0, 0, 0), (5, 3), fill)
    look_at(f, (0, 0, 0))
    r = area_light("rim", (-1.0, 4.5, 3.0), (0, 0, 0), (6, 0.8), rim)
    look_at(r, (0, 0, 0))
    t = area_light("top", (0, 0, 6), (0, 0, 0), (3, 3), key * 0.5)
    return [k, f, r, t]


def metal(name="Alu", color=(0.78, 0.78, 0.8), rough=0.18, aniso=0.0, brushed=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Metallic"].default_value = 1.0
    p.inputs["Roughness"].default_value = rough
    if "Anisotropic" in p.inputs:
        p.inputs["Anisotropic"].default_value = aniso
    if brushed:
        # fine directional noise in roughness -> brushed aluminium
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (1, 1, 400)
        nz = nt.nodes.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 3.0
        nz.inputs["Detail"].default_value = 8
        mr = nt.nodes.new("ShaderNodeMapRange")
        mr.inputs["To Min"].default_value = rough * 0.6
        mr.inputs["To Max"].default_value = rough * 1.6
        nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
        nt.links.new(nz.outputs["Fac"], mr.inputs["Value"])
        nt.links.new(mr.outputs["Result"], p.inputs["Roughness"])
    return m


def link(ob, coll=None):
    (coll or bpy.context.collection).objects.link(ob)
    return ob


def mesh_from_bm(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return link(bpy.data.objects.new(name, me))


def cylinder(name, r, depth, verts=64, loc=(0, 0, 0), rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r, depth=depth)
    ob = mesh_from_bm(name, bm)
    ob.location = loc
    ob.rotation_euler = rot
    return ob


def box(name, size=(1, 1, 1), loc=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    ob = mesh_from_bm(name, bm)
    ob.location = loc
    return ob


def smooth(ob, angle=35):
    for p in ob.data.polygons:
        p.use_smooth = True
    try:
        bpy.context.view_layer.objects.active = ob
        ob.select_set(True)
        bpy.ops.object.shade_auto_smooth(angle=math.radians(angle))
        ob.select_set(False)
    except Exception:
        pass


def boolean_diff(ob, cutters, apply=True):
    for c in cutters:
        md = ob.modifiers.new("cut", "BOOLEAN")
        md.operation = "DIFFERENCE"
        md.solver = "EXACT"
        md.object = c
        c.hide_render = True
        c.hide_viewport = True
    if apply:
        apply_mods(ob)
        for c in cutters:
            bpy.data.objects.remove(c, do_unlink=True)


def apply_mods(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)


def bevel(ob, width=0.012, segments=4, angle=30):
    md = ob.modifiers.new("bev", "BEVEL")
    md.width = width
    md.segments = segments
    md.limit_method = "ANGLE"
    md.angle_limit = math.radians(angle)
    md.harden_normals = True
    return md


def hole_cutter(name, r, depth, axis, offset, counterbore=None):
    """axis: 'X','Y','Z'; offset: position of hole centre on the face plane (vec)."""
    rot = {"X": (0, math.pi / 2, 0), "Y": (math.pi / 2, 0, 0), "Z": (0, 0, 0)}[axis]
    cs = [cylinder(name, r, depth, 48, offset, rot)]
    if counterbore:
        cr, cd, face_pos = counterbore
        cs.append(cylinder(name + "_cb", cr, cd, 48, face_pos, rot))
    return cs


def machined_block(name="Block", size=1.0, mat=None, layout="cube"):
    """Aluminium block with bored through-holes and small counterbored screw holes."""
    s = size
    ob = box(name, (s, s, s))
    cut = []
    h = s / 2
    if layout == "cube":
        # big bore on +X face (lower right), big bore on -Y face (upper right), smaller bores
        cut += hole_cutter("c1", 0.17 * s, 1.2 * s, "X", (0, 0.18 * s, -0.12 * s))
        cut += hole_cutter("c2", 0.15 * s, 1.2 * s, "Y", (-0.2 * s, 0, -0.22 * s))
        cut += hole_cutter("c3", 0.13 * s, 0.5 * s, "Z", (0.22 * s, 0.2 * s, h))
        for (ax, pos, face) in [
            ("Z", (-0.25 * s, -0.25 * s, h), (-0.25 * s, -0.25 * s, h)),
            ("Z", (-0.05 * s, 0.32 * s, h), (-0.05 * s, 0.32 * s, h)),
            ("Y", (0.28 * s, -h, 0.3 * s), (0.28 * s, -h, 0.3 * s)),
            ("Y", (0.25 * s, -h, -0.3 * s), (0.25 * s, -h, -0.3 * s)),
            ("X", (h, -0.3 * s, 0.3 * s), (h, -0.3 * s, 0.3 * s)),
        ]:
            cut += hole_cutter("s", 0.028 * s, 0.4 * s, ax, pos, (0.05 * s, 0.05 * s, face))
    elif layout == "clamp":
        # rod clamp: one through bore on X, one on Z, screw holes on Y face
        cut += hole_cutter("c1", 0.19 * s, 1.2 * s, "X", (0, 0, 0.1 * s))
        cut += hole_cutter("c2", 0.15 * s, 1.2 * s, "Y", (0.18 * s, 0, -0.2 * s))
        for pos in [(-0.28 * s, -h, -0.28 * s), (-0.28 * s, -h, 0.28 * s)]:
            cut += hole_cutter("s", 0.03 * s, 0.3 * s, "Y", pos, (0.055 * s, 0.04 * s, pos))
    boolean_diff(ob, cut)
    bevel(ob, 0.026 * s, 5, 40)
    smooth(ob, 40)
    if mat:
        set_mat(ob, mat)
    return ob


def set_mat(ob, mat):
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    for p in ob.data.polygons:
        p.material_index = 0


def socket_screw(name="Screw", length=1.0, r=0.06, mat=None, threads=True):
    """M-style socket head cap screw lying along +Z, head at z=0, shaft down to -length."""
    parts = []
    head_r, head_h = r * 1.55, r * 2.0
    head = cylinder(name + "_head", head_r, head_h, 96, (0, 0, head_h / 2))
    # knurl: many shallow grooves via boolean of thin boxes
    kn = []
    n = 36
    for i in range(n):
        a = 2 * math.pi * i / n
        b = box("k", (r * 0.12, r * 0.12, head_h * 0.8),
                (math.cos(a) * head_r, math.sin(a) * head_r, head_h * 0.45))
        b.rotation_euler = (0, 0, a + math.pi / 4)
        kn.append(b)
    # hex socket
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=r * 0.75, radius2=r * 0.75, depth=head_h)
    hexc = mesh_from_bm("hex", bm)
    hexc.location = (0, 0, head_h)
    boolean_diff(head, kn + [hexc])
    bevel(head, r * 0.12, 3, 30)
    smooth(head)
    parts.append(head)
    neck_len = length * 0.3
    neck = cylinder(name + "_neck", r, neck_len, 64, (0, 0, -neck_len / 2))
    smooth(neck)
    parts.append(neck)
    tl = length - neck_len
    if threads:
        # helical thread via screw modifier on a triangle profile
        pitch = r * 0.35
        bm = bmesh.new()
        v1 = bm.verts.new((r * 0.86, 0, 0))
        v2 = bm.verts.new((r * 1.04, 0, pitch * 0.5))
        v3 = bm.verts.new((r * 0.86, 0, pitch))
        bm.edges.new((v1, v2)); bm.edges.new((v2, v3))
        th = mesh_from_bm(name + "_thread", bm)
        md = th.modifiers.new("scr", "SCREW")
        md.screw_offset = pitch
        md.iterations = max(1, int(tl / pitch))
        md.steps = 32
        md.render_steps = 32
        md.angle = 2 * math.pi
        th.location = (0, 0, -length)
        apply_mods(th)
        smooth(th, 60)
        core = cylinder(name + "_core", r * 0.87, tl, 48, (0, 0, -neck_len - tl / 2))
        parts += [th, core]
    else:
        parts.append(cylinder(name + "_shaft", r, tl, 64, (0, 0, -neck_len - tl / 2)))
    root = bpy.data.objects.new(name, None)
    link(root)
    for p in parts:
        p.parent = root
        if mat:
            set_mat(p, mat)
    return root


def rod(name="Rod", length=4.0, r=0.12, mat=None, rounded=True, grooves=()):
    ob = cylinder(name, r, length, 96)
    cut = []
    for z in grooves:
        cut.append(_torus_cutter(r, z))
    if cut:
        boolean_diff(ob, cut)
    if rounded:
        bevel(ob, r * 0.6, 8, 30)
    smooth(ob, 30)
    if mat:
        set_mat(ob, mat)
    return ob


def _torus_cutter(r, z):
    bpy.ops.mesh.primitive_torus_add(major_radius=r * 1.02, minor_radius=r * 0.06, location=(0, 0, z),
                                     major_segments=96, minor_segments=12)
    return bpy.context.active_object


def camera(loc, target=(0, 0, 0), lens=50, dof_obj=None, fstop=4.0):
    cd = bpy.data.cameras.new("Cam")
    cd.lens = lens
    cam = link(bpy.data.objects.new("Cam", cd))
    cam.location = loc
    look_at(cam, target)
    bpy.context.scene.camera = cam
    if dof_obj is not None:
        cd.dof.use_dof = True
        cd.dof.focus_object = dof_obj
        cd.dof.aperture_fstop = fstop
    return cam


def key(ob, path, frame, value, interp="BEZIER", ease="AUTO", index=-1):
    setattr(ob, path, value) if not isinstance(path, tuple) else None
    ob.keyframe_insert(data_path=path, frame=frame, index=index)
    ad = ob.animation_data
    if ad and ad.action:
        for fc in _fcurves(ad.action):
            if fc.data_path == path:
                for kp in fc.keyframe_points:
                    if abs(kp.co.x - frame) < 0.01:
                        kp.interpolation = interp
                        kp.easing = ease


def _fcurves(action):
    # Blender 4.4+ layered actions keep fcurves in channelbags
    if hasattr(action, "fcurves") and len(getattr(action, "fcurves", [])):
        return list(action.fcurves)
    out = []
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            for cb in getattr(strip, "channelbags", []):
                out += list(cb.fcurves)
    return out


def linear_all(ob):
    if ob.animation_data and ob.animation_data.action:
        for fc in _fcurves(ob.animation_data.action):
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"


def render(o, name="shot"):
    sc = bpy.context.scene
    os.makedirs(o["out"], exist_ok=True)
    frames = o["frames"] or range(sc.frame_start, sc.frame_end + 1)
    for f in frames:
        sc.frame_set(f)
        sc.render.filepath = os.path.join(o["out"], f"{name}_{f:04d}.png")
        bpy.ops.render.render(write_still=True)


def world_studio_gradient(top=1.0, horizon=0.55, bottom=0.04, hdri_mix=0.35, rot_z=0.0, strength=1.0):
    """Reflection world for chrome: bright ceiling, mid horizon, dark floor, plus a bit of studio.exr
    detail. Camera rays see transparent film (set film_transparent)."""
    w = bpy.data.worlds.new("WG")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0, 0, rot_z)
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(mp.outputs["Vector"], sep.inputs[0])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = -1
    mr.inputs["From Max"].default_value = 1
    nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp
    cr.elements[0].position = 0.0
    cr.elements[0].color = (bottom, bottom, bottom, 1)
    cr.elements[1].position = 1.0
    cr.elements[1].color = (top, top, top, 1)
    for pos, v in ((0.40, bottom * 2.5), (0.52, horizon * 0.7), (0.62, horizon), (0.85, top * 0.9)):
        e = cr.elements.new(pos)
        e.color = (v, v, v, 1)
    nt.links.new(mr.outputs["Result"], ramp.inputs["Fac"])
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(STUDIO_HDRI)
    nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["Factor"].default_value = hdri_mix
    nt.links.new(ramp.outputs["Color"], mix.inputs[6])
    nt.links.new(env.outputs["Color"], mix.inputs[7])
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = strength
    nt.links.new(mix.outputs[2], bg.inputs["Color"])
    nt.links.new(bg.outputs[0], out.inputs[0])
    return w


def env_dome(radius=6.0, floor=0.02, mid=0.35, ceiling=1.6, strips=((0.3, 0.06, 4.0), (2.4, 0.10, 2.5), (4.2, 0.05, 3.0)),
             strip_z=(0.0, 0.85), rot_z=0.0, stops=None):
    """Near emissive studio dome for product chrome. Invisible to camera, gives parallax gradients
    across flat faces. strips = (angle_rad, width_rad, strength): vertical softbox bands."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=96, ring_count=48)
    d = bpy.context.active_object
    d.name = "Dome"
    d.rotation_euler = (0, 0, rot_z)
    for p in d.data.polygons:
        p.use_smooth = True
    d.visible_camera = False
    d.visible_shadow = False
    m = bpy.data.materials.new("DomeMat")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    # vertical gradient
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = -radius
    mr.inputs["From Max"].default_value = radius
    nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp
    cr.elements[0].position = 0.0; cr.elements[0].color = (floor,) * 3 + (1,)
    cr.elements[1].position = 1.0; cr.elements[1].color = (ceiling,) * 3 + (1,)
    for pos, v in (stops or ((0.42, floor * 2), (0.52, mid * 0.6), (0.6, mid), (0.8, ceiling * 0.7))):
        e = cr.elements.new(pos); e.color = (v,) * 3 + (1,)
    nt.links.new(mr.outputs["Result"], ramp.inputs["Fac"])
    col = ramp.outputs["Color"]
    # strips: angle around Z via atan2(y,x)
    ang = nt.nodes.new("ShaderNodeMath"); ang.operation = "ARCTAN2"
    nt.links.new(sep.outputs["Y"], ang.inputs[0]); nt.links.new(sep.outputs["X"], ang.inputs[1])
    zr = nt.nodes.new("ShaderNodeMapRange")
    zr.inputs["From Min"].default_value = strip_z[0] * radius
    zr.inputs["From Max"].default_value = strip_z[1] * radius
    zr.inputs["To Min"].default_value = 0; zr.inputs["To Max"].default_value = 1
    zr.clamp = True
    nt.links.new(sep.outputs["Z"], zr.inputs["Value"])
    zmask = nt.nodes.new("ShaderNodeMath"); zmask.operation = "PINGPONG"; zmask.inputs[1].default_value = 0.5
    nt.links.new(zr.outputs["Result"], zmask.inputs[0])
    zm2 = nt.nodes.new("ShaderNodeMath"); zm2.operation = "MULTIPLY"; zm2.inputs[1].default_value = 2.0
    nt.links.new(zmask.outputs[0], zm2.inputs[0])
    total = None
    for (a, wdt, s) in strips:
        a = math.atan2(math.sin(a), math.cos(a))
        sub = nt.nodes.new("ShaderNodeMath"); sub.operation = "SUBTRACT"; sub.inputs[1].default_value = a
        nt.links.new(ang.outputs[0], sub.inputs[0])
        ab = nt.nodes.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"
        nt.links.new(sub.outputs[0], ab.inputs[0])
        sm = nt.nodes.new("ShaderNodeMapRange")
        sm.interpolation_type = "SMOOTHSTEP"
        sm.inputs["From Min"].default_value = wdt
        sm.inputs["From Max"].default_value = wdt * 0.55
        sm.inputs["To Min"].default_value = 0; sm.inputs["To Max"].default_value = s
        sm.clamp = True
        nt.links.new(ab.outputs[0], sm.inputs["Value"])
        mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
        nt.links.new(sm.outputs["Result"], mul.inputs[0]); nt.links.new(zm2.outputs[0], mul.inputs[1])
        if total is None:
            total = mul
        else:
            add = nt.nodes.new("ShaderNodeMath"); add.operation = "ADD"
            nt.links.new(total.outputs[0], add.inputs[0]); nt.links.new(mul.outputs[0], add.inputs[1])
            total = add
    addc = nt.nodes.new("ShaderNodeMix"); addc.data_type = "RGBA"; addc.blend_type = "ADD"
    addc.inputs["Factor"].default_value = 1.0
    nt.links.new(col, addc.inputs[6])
    nt.links.new(total.outputs[0], addc.inputs[7])
    nt.links.new(addc.outputs[2], em.inputs["Color"])
    em.inputs["Strength"].default_value = 1.0
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    d.data.materials.append(m)
    return d


def r04_env(gain=1.0, rot_z=0.4, radius=14.0, dark=False):
    """Frontier Traders chrome studio (tuned against ref frame 5.5 s). dark=True for vertical faces/rods."""
    world_studio_gradient(top=0.9, horizon=0.4, bottom=0.03, hdri_mix=0.0)
    base = ((0.2, 0.12), (0.4, 0.3), (0.5, 0.42), (0.62, 0.32), (0.8, 0.2)) if dark else \
           ((0.2, 0.4), (0.38, 1.1), (0.5, 1.3), (0.62, 0.95), (0.75, 0.5))
    st = tuple((p, v * gain) for p, v in base)
    if dark:
        return env_dome(radius=radius, floor=0.04 * gain, ceiling=0.25 * gain, rot_z=rot_z,
                        strips=((0.2, 0.08, 3.0), (1.3, 0.04, 2.2), (2.6, 0.12, 1.6), (3.9, 0.05, 3.2), (5.0, 0.10, 1.4)),
                        strip_z=(-0.35, 0.7), stops=st)
    return env_dome(radius=radius, floor=0.06 * gain, ceiling=0.3 * gain, rot_z=rot_z,
                    strips=((0.2, 0.10, 1.6), (1.6, 0.05, 1.2), (2.6, 0.14, 1.0), (4.1, 0.06, 1.8), (5.2, 0.12, 0.8)),
                    strip_z=(-0.2, 0.6), stops=st)

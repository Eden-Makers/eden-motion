"""Ledger Nano Gen5 promo (Relate 196) recreation helpers. Builds on r04lib basics."""
import bpy, bmesh, math, os, sys
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chrome import (args, reset, area_light, look_at, link, mesh_from_bm, set_mat, apply_mods,
                    camera, render, _fcurves, linear_all)

ROOT = os.environ.get("EM_PROJECT", os.getcwd())
UI = os.environ.get("EM_TEX", os.path.join(ROOT, "assets", "tex"))


def setup(engine="EEVEE", frames=(1, 60), fps=60, preview=False, samples=48, mb=True, transparent=True):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.render.resolution_percentage = 50 if preview else 100
    sc.render.fps = fps
    sc.frame_start, sc.frame_end = frames
    sc.render.film_transparent = transparent
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.render.use_motion_blur = mb
    sc.render.motion_blur_shutter = 0.5
    if engine == "EEVEE":
        sc.render.engine = "BLENDER_EEVEE"
        e = sc.eevee
        e.taa_render_samples = max(8, samples // (3 if preview else 1))
        for k, v in (("use_raytracing", True), ("use_shadows", True), ("use_gtao", True)):
            if hasattr(e, k):
                setattr(e, k, v)
        if hasattr(e, "ray_tracing_options"):
            e.ray_tracing_options.resolution_scale = "1" if not preview else "2"
        if hasattr(e, "fast_gi_method"):
            pass
    else:
        sc.render.engine = "CYCLES"
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"; prefs.get_devices()
        for d in prefs.devices:
            d.use = d.type == "METAL"
        sc.cycles.device = "GPU"
        sc.cycles.samples = max(8, samples // (4 if preview else 1))
        sc.cycles.use_denoising = True
    return sc


def white_studio(strength=1.0, key=600, top=True):
    """High-key white cyc lighting: white world + big soft top/front boxes (visible in reflections)."""
    w = bpy.data.worlds.new("W"); bpy.context.scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (1, 1, 1, 1)
    bg.inputs["Strength"].default_value = strength
    lights = []
    if top:
        t = area_light("top", (0, 0, 6), (0, 0, 0), (6, 6), key); lights.append(t)
    k = area_light("key", (-4, -4, 4), (0, 0, 0), (3, 6), key * 0.7); look_at(k, (0, 0, 0)); lights.append(k)
    r = area_light("rim", (4, 3, 2), (0, 0, 0), (2, 6), key * 0.5); look_at(r, (0, 0, 0)); lights.append(r)
    return lights


def mat_principled(name, color, rough=0.5, metal=0.0, coat=0.0, trans=0.0, alpha=1.0, ior=1.45, emit=None, emit_strength=0.0):
    m = bpy.data.materials.new(name)
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    p.inputs["Coat Weight"].default_value = coat
    p.inputs["Transmission Weight"].default_value = trans
    p.inputs["IOR"].default_value = ior
    p.inputs["Alpha"].default_value = alpha
    if emit is not None:
        p.inputs["Emission Color"].default_value = (*emit, 1)
        p.inputs["Emission Strength"].default_value = emit_strength
    if alpha < 1 or trans > 0:
        if hasattr(m, "surface_render_method"):
            m.surface_render_method = "BLENDED" if alpha < 1 else "DITHERED"
        if hasattr(m, "use_transparency_overlap"):
            m.use_transparency_overlap = True
    return m


def image_mat(name, path, rough=0.6, emit_strength=0.0, base_mult=1.0, alpha_from_image=False):
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = bpy.data.images.load(path)
    tex.extension = "CLIP"
    nt.links.new(tex.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = rough
    if emit_strength:
        nt.links.new(tex.outputs["Color"], p.inputs["Emission Color"])
        p.inputs["Emission Strength"].default_value = emit_strength
    return m


def rounded_slab(name, w, h, d, r, seg=12, bevel_z=None):
    """Rounded-rectangle slab centred at origin, lying in XY (thickness along Z)."""
    bm = bmesh.new()
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    vb = [bm.verts.new((x, y, -d / 2)) for x, y in pts]
    vt = [bm.verts.new((x, y, d / 2)) for x, y in pts]
    bm.faces.new(vt)
    bm.faces.new(list(reversed(vb)))
    n = len(pts)
    for i in range(n):
        bm.faces.new((vb[i], vb[(i + 1) % n], vt[(i + 1) % n], vt[i]))
    bm.normal_update()
    ob = mesh_from_bm(name, bm)
    md = ob.modifiers.new("bev", "BEVEL")
    md.width = bevel_z if bevel_z else d * 0.45
    md.segments = 8
    md.limit_method = "ANGLE"
    md.angle_limit = math.radians(60)
    md.harden_normals = False
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def uv_planar(ob, w, h):
    """Planar UVs on XY so a texture maps 0..1 over w x h centred at origin."""
    me = ob.data
    if not me.uv_layers:
        me.uv_layers.new()
    uv = me.uv_layers.active.data
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            uv[li].uv = ((v.x + w / 2) / w, (v.y + h / 2) / h)


def screen_plane(name, w, h, img, emit=0.9):
    bpy.ops.mesh.primitive_plane_add(size=1)
    s = bpy.context.active_object; s.name = name
    s.scale = (w, h, 1); bpy.ops.object.transform_apply(scale=True)
    m = image_mat(name + "M", img, rough=0.75, emit_strength=emit)
    s.data.materials.append(m)
    return s


def ledger_device(screen_img=None, with_button=True):
    """Ledger Nano Gen5-like device. Local axes: X width, Y height (up), Z thickness (screen faces +Z)."""
    W, H, D = 2.75, 4.15, 0.52
    root = bpy.data.objects.new("Device", None); link(root)
    body = rounded_slab("Body", W, H, D, 0.42, seg=16, bevel_z=0.17)
    blk = mat_principled("SoftTouch", (0.003, 0.003, 0.003), rough=0.24, coat=0.0)
    blk.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.3
    body.data.materials.append(blk); body.parent = root
    # recessed screen bezel area (slightly lighter glossy black glass)
    bez = rounded_slab("Bezel", W - 0.26, H * 0.71, 0.02, 0.16, seg=8, bevel_z=0.008)
    bez.location = (0, H / 2 - 0.13 - H * 0.355, D / 2 + 0.001)
    bez.data.materials.append(mat_principled("Glass", (0.01, 0.01, 0.01), rough=0.08, coat=1.0))
    bez.parent = root
    if screen_img:
        sw, sh = W - 0.52, H * 0.71 - 0.28
        sp = screen_plane("Screen", sw, sh, screen_img)
        sp.location = (0, bez.location.y, D / 2 + 0.013); sp.parent = root
    # embossed bracket logo bottom-left (four corner L shapes, subtle)
    lm = mat_principled("Emboss", (0.03, 0.03, 0.03), rough=0.35)
    bx, by, s = -0.78, -H / 2 + 0.55, 0.26
    for sx, sy in ((-1, 1), (1, 1), (-1, -1), (1, -1)):
        for (lw, lh, ox, oy) in ((0.14, 0.022, -0.06, 0), (0.022, 0.12, 0, -0.05)):
            bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
            bmesh.ops.scale(bm, vec=(lw, lh, 0.012), verts=bm.verts)
            o = mesh_from_bm("L", bm)
            o.location = (bx + sx * (s - 0.06) + sx * -ox * 0, by + sy * (s * 0.62) , D / 2 + 0.002)
            o.location.x = bx + sx * s + (-sx * 0.06 if lw > lh else 0)
            o.location.y = by + sy * s * 0.62 + (-sy * 0.05 if lh > lw else 0)
            o.data.materials.append(lm); o.parent = root
    # side button (right edge, upper)
    sb = rounded_slab("SideBtn", 0.06, 0.55, 0.16, 0.025, seg=4, bevel_z=0.02)
    sb.rotation_euler = (0, math.pi / 2, 0); sb.location = (W / 2 + 0.01, H / 2 - 1.0, 0)
    sb.data.materials.append(blk); sb.parent = root
    # usb-c port on bottom edge
    pc = rounded_slab("Port", 0.42, 0.09, 0.14, 0.04, seg=6, bevel_z=0.01)
    pc.rotation_euler = (math.pi / 2, 0, 0); pc.location = (0.15, -H / 2 + 0.02, 0)
    pc.data.materials.append(mat_principled("Hole", (0.0, 0.0, 0.0), rough=0.9)); pc.parent = root
    btn = None
    if with_button:
        btn = cherry_button()
        btn.parent = root
        btn.location = (W / 2 - 0.55, -H / 2 + 0.55, D / 2 + 0.035)
    return root, btn


def cherry_button():
    b = rounded_slab("CherryBtn", 0.62, 0.62, 0.07, 0.13, seg=8, bevel_z=0.025)
    img = os.path.join(UI, "cherry.png")
    if os.path.exists(img):
        m = bpy.data.materials.new("BtnM"); nt = m.node_tree; p = nt.nodes["Principled BSDF"]
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = bpy.data.images.load(img); tex.extension = "CLIP"
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
        mix.inputs[6].default_value = (0.36, 0.36, 0.36, 1); mix.inputs[7].default_value = (0.17, 0.17, 0.17, 1)
        nt.links.new(tex.outputs["Color"], mix.inputs["Factor"]); nt.links.new(mix.outputs[2], p.inputs["Base Color"])
        p.inputs["Roughness"].default_value = 0.6
        b.data.materials.append(m)
        uv_planar(b, 0.62, 0.62)
    else:
        b.data.materials.append(mat_principled("BtnM", (0.36, 0.36, 0.36), rough=0.6))
    return b


CARD_COLORS = {
    "teal": (0.20, 0.72, 0.58), "orange": (0.86, 0.46, 0.12), "purple": (0.42, 0.06, 0.78),
    "magenta": (0.72, 0.03, 0.42), "red": (0.85, 0.06, 0.12), "green": (0.32, 0.55, 0.06),
    "yellow": (0.88, 0.66, 0.05), "taupe": (0.53, 0.45, 0.40), "blue": (0.10, 0.28, 0.85),
    "pink": (0.80, 0.30, 0.95), "mint": (0.42, 0.86, 0.72), "lblue": (0.35, 0.50, 0.95),
}


def card(name, color_key, logo=None, w=4.15, h=2.75, d=0.07, alpha=0.9, trans=0.2):
    """Glossy tinted acrylic card lying in XY, logo (white-on-black png) as raised bump."""
    c = rounded_slab(name, w, h, d, 0.18, seg=8, bevel_z=0.012)
    col = CARD_COLORS[color_key]
    m = mat_principled(name + "M", tuple(c ** 1.8 for c in col), rough=0.26, coat=0.05, trans=trans, alpha=alpha, ior=1.45)
    m.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.08
    if logo:
        nt = m.node_tree; p = nt.nodes["Principled BSDF"]
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = bpy.data.images.load(os.path.join(UI, logo)); tex.extension = "CLIP"
        tex.image.colorspace_settings.name = "Non-Color"
        bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.6; bump.inputs["Distance"].default_value = 0.02
        nt.links.new(tex.outputs["Color"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
        # logo slightly lighter tint
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
        mix.inputs[6].default_value = (*col, 1); mix.inputs[7].default_value = (*[min(1, x * 1.25 + 0.05) for x in col], 1)
        nt.links.new(tex.outputs["Color"], mix.inputs["Factor"]); nt.links.new(mix.outputs[2], p.inputs["Base Color"])
        uv_planar(c, w, h)
    c.data.materials.append(m)
    return c


def phone(screen_img):
    """iPhone-like white phone lying in XY, screen +Z."""
    W, H, D = 3.0, 6.2, 0.32
    root = bpy.data.objects.new("Phone", None); link(root)
    body = rounded_slab("PBody", W, H, D, 0.55, seg=16, bevel_z=0.09)
    body.data.materials.append(mat_principled("Frame", (0.006, 0.006, 0.006), rough=0.18, metal=0.0)); body.parent = root
    scr = rounded_slab("PScreen", W - 0.36, H - 0.36, 0.01, 0.42, seg=16, bevel_z=0.004)
    scr.location = (0, 0, D / 2 + 0.002)
    m = bpy.data.materials.new("PScreenM"); nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = bpy.data.images.load(screen_img); tex.extension = "CLIP"
    nt.links.new(tex.outputs["Color"], p.inputs["Base Color"]); nt.links.new(tex.outputs["Color"], p.inputs["Emission Color"])
    p.inputs["Emission Strength"].default_value = 0.6; p.inputs["Roughness"].default_value = 0.05; p.inputs["Coat Weight"].default_value = 1.0
    scr.data.materials.append(m); uv_planar(scr, W - 0.36, H - 0.36); scr.parent = root
    return root, scr, m


def scale_vis(ob, f_on, f_off=None, s=1.0):
    """Show/hide by scale (0 <-> s) with CONSTANT keys. Avoids EEVEE motion-blur ghosts from hide_render toggles."""
    ob.scale = (0, 0, 0); ob.keyframe_insert("scale", frame=max(0, f_on - 1))
    ob.scale = (s, s, s); ob.keyframe_insert("scale", frame=f_on)
    if f_off is not None:
        ob.keyframe_insert("scale", frame=f_off - 1)
        ob.scale = (0, 0, 0); ob.keyframe_insert("scale", frame=f_off)
    ad = ob.animation_data
    for fc in _fcurves(ad.action):
        if fc.data_path == "scale":
            for kp in fc.keyframe_points:
                kp.interpolation = "CONSTANT"

"""
mglib - motion graphics helpers for headless Blender 5.2 (bpy).

Usage inside a script run with:
    /opt/homebrew/bin/blender -b --factory-startup -P script.py -- [args]

    import sys; sys.path.insert(0, "/Users/gedeondrapak/Dev/relate-mograph/blender")
    import mglib as mg
    mg.reset_scene()
    mg.setup_render(engine="EEVEE", res=(960, 540), samples=32)
    ...
    mg.render_still("/tmp/out.png", frame=1)

Verified against Blender 5.2.2 LTS (Apple M1 Pro, Metal). Key 5.x API facts encoded here:
- EEVEE engine id is 'BLENDER_EEVEE' (the 4.2-4.4 id 'BLENDER_EEVEE_NEXT' is gone).
- No bloom on scene.eevee. Bloom = compositor Glare node, type set via the *input socket*
  glare.inputs['Type'].default_value = 'Bloom' (not glare.glare_type).
- Compositor: scene.node_tree is gone. Use scene.compositing_node_group = <CompositorNodeTree>,
  output via NodeGroupOutput with an interface socket. There is no CompositorNodeComposite.
- Actions are layered: action.fcurves does not exist. Use
  bpy_extras.anim_utils.action_get_channelbag_for_slot(action, slot).fcurves.
- Principled BSDF has 'Thin Film Thickness', 'Thin Film IOR', and (5.2) 'Thin Wall'.
- EEVEE refraction: scene.eevee.use_raytracing = True + material.use_raytrace_refraction = True
  (+ material.surface_render_method = 'DITHERED', thickness_mode 'SLAB'/'SPHERE').
"""

import math
import os
import subprocess
import time

import bpy
from mathutils import Vector

try:
    from bpy_extras import anim_utils
except Exception:  # pragma: no cover
    anim_utils = None

STUDIO_HDRI_DIR = "/Applications/Blender.app/Contents/Resources/5.2/datafiles/studiolights/world"
# bundled HDRIs: studio, interior, city, courtyard, forest, night, sunrise, sunset (.exr)
STUDIO_HDRI = os.path.join(STUDIO_HDRI_DIR, "studio.exr")

FONT_DIRS = [
    os.path.expanduser("~/Library/Fonts"),
    "/System/Library/Fonts/Supplemental",
    "/System/Library/Fonts",
    "/Library/Fonts",
]


# ----------------------------------------------------------------------------
# color helpers
# ----------------------------------------------------------------------------

def srgb_to_linear(c):
    """c in 0..1 (sRGB display value) -> linear."""
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_to_rgba(hex_str, alpha=1.0):
    """'#26ff8a' -> linear RGBA tuple (what Blender color sockets expect)."""
    h = hex_str.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), alpha)


def rgba(c):
    """Accept '#hex', (r,g,b) or (r,g,b,a) linear and return RGBA."""
    if isinstance(c, str):
        return hex_to_rgba(c)
    if len(c) == 3:
        return (c[0], c[1], c[2], 1.0)
    return tuple(c)


def mix_rgba_sockets(node):
    """ShaderNodeMix has duplicate socket names per data type (inputs['A'] is the FLOAT one!).
    For data_type='RGBA' use these indices: Factor=0, A=6, B=7, Result=outputs[2]."""
    node.data_type = "RGBA"
    return node.inputs[0], node.inputs[6], node.inputs[7], node.outputs[2]


# ----------------------------------------------------------------------------
# scene + render setup
# ----------------------------------------------------------------------------

def reset_scene():
    """Delete every object and orphan data so the script starts clean."""
    scene = bpy.context.scene
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.lights,
                 bpy.data.cameras, bpy.data.images, bpy.data.node_groups):
        for block in list(coll):
            if block.users == 0:
                coll.remove(block)
    scene.frame_set(1)
    return scene


def setup_render(engine="EEVEE", res=(960, 540), samples=32, fps=24, frame_range=(1, 48),
                 transparent=False, view_transform="AgX", look=None, exposure=0.0,
                 raytracing=True, motion_blur=False, shutter=0.5, percent=100,
                 cycles_denoise=True):
    """Configure engine, resolution, color management.

    engine: 'EEVEE' or 'CYCLES'. Cycles uses Metal GPU automatically when present.
    look: e.g. 'AgX - Punchy', 'AgX - High Contrast', 'AgX - Medium High Contrast'.
    """
    scene = bpy.context.scene
    r = scene.render
    r.resolution_x, r.resolution_y = res
    r.resolution_percentage = percent
    r.fps = fps
    scene.frame_start, scene.frame_end = frame_range
    r.film_transparent = transparent
    r.use_motion_blur = motion_blur
    r.motion_blur_shutter = shutter

    if engine.upper().startswith("EEVEE"):
        r.engine = "BLENDER_EEVEE"
        ee = scene.eevee
        ee.taa_render_samples = samples
        ee.taa_samples = min(samples, 16)
        ee.use_raytracing = raytracing
        if raytracing:
            ee.ray_tracing_method = "SCREEN"
            ee.ray_tracing_options.resolution_scale = "1"
            ee.use_fast_gi = True
        ee.use_shadows = True
        ee.motion_blur_steps = 1
        ee.bokeh_max_size = 100.0
    else:
        r.engine = "CYCLES"
        cyc = scene.cycles
        try:
            prefs = bpy.context.preferences.addons["cycles"].preferences
            prefs.compute_device_type = "METAL"
            prefs.get_devices()
            for d in prefs.devices:
                d.use = d.type == "METAL"
            cyc.device = "GPU"
        except Exception as e:  # noqa
            print("[mglib] Metal unavailable, CPU render:", e)
        cyc.samples = samples
        cyc.use_adaptive_sampling = True
        cyc.use_denoising = cycles_denoise
        cyc.max_bounces = 12
        cyc.transmission_bounces = 12
        cyc.glossy_bounces = 6
        cyc.caustics_reflective = False
        cyc.caustics_refractive = False

    vs = scene.view_settings
    vs.view_transform = view_transform
    if look:
        try:
            vs.look = look
        except TypeError:
            print("[mglib] look not found:", look)
    vs.exposure = exposure
    return scene


def set_world(color="#050607", strength=1.0, hdri=None, hdri_strength=1.0,
              hdri_rotation_z=0.0, camera_sees_color=None):
    """Dark solid world, or HDRI for reflections.

    camera_sees_color: keep an HDRI for lighting/reflections but show a flat color to
    the camera (Light Path.Is Camera Ray mix) - the standard product-render trick.
    """
    scene = bpy.context.scene
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Color"].default_value = rgba(color)
    bg.inputs["Strength"].default_value = strength
    if hdri and os.path.exists(hdri):
        env = nt.nodes.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(hdri, check_existing=True)
        mapping = nt.nodes.new("ShaderNodeMapping")
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mapping.inputs["Rotation"].default_value[2] = hdri_rotation_z
        nt.links.new(tc.outputs["Generated"], mapping.inputs["Vector"])
        nt.links.new(mapping.outputs["Vector"], env.inputs["Vector"])
        nt.links.new(env.outputs["Color"], bg.inputs["Color"])
        bg.inputs["Strength"].default_value = hdri_strength
    if camera_sees_color is not None:
        lp = nt.nodes.new("ShaderNodeLightPath")
        flat = nt.nodes.new("ShaderNodeBackground")
        flat.inputs["Color"].default_value = rgba(camera_sees_color)
        mix = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
        nt.links.new(bg.outputs["Background"], mix.inputs[1])
        nt.links.new(flat.outputs["Background"], mix.inputs[2])
        nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    else:
        nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    return world


# ----------------------------------------------------------------------------
# objects
# ----------------------------------------------------------------------------

def link(obj, collection=None):
    (collection or bpy.context.scene.collection).objects.link(obj)
    return obj


def add_mesh_primitive(kind="cube", name=None, location=(0, 0, 0), rotation=(0, 0, 0),
                       scale=(1, 1, 1), **kw):
    """bpy.ops primitive wrapper that returns the object. kind: cube, uv_sphere,
    ico_sphere, cylinder, plane, torus, monkey, circle, cone."""
    op = getattr(bpy.ops.mesh, f"primitive_{kind}_add")
    op(location=location, rotation=rotation, **kw)
    obj = bpy.context.active_object
    obj.scale = scale
    if name:
        obj.name = name
    return obj


def bevel(obj, width=0.02, segments=4, limit="ANGLE", harden=True):
    m = obj.modifiers.new("Bevel", "BEVEL")
    m.width = width
    m.segments = segments
    m.limit_method = limit
    m.harden_normals = harden
    return m


def subsurf(obj, levels=2, render_levels=None):
    m = obj.modifiers.new("Subsurf", "SUBSURF")
    m.levels = levels
    m.render_levels = render_levels if render_levels is not None else levels
    return m


def smooth(obj, angle_deg=None):
    """Shade smooth; with angle_deg uses 'Smooth by Angle' (the 4.1+ replacement of auto smooth)."""
    if obj.type == "MESH":
        for p in obj.data.polygons:
            p.use_smooth = True
        if angle_deg is not None:
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            try:
                bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle_deg))
            except Exception as e:
                print("[mglib] shade_smooth_by_angle failed:", e)


def assign(obj, mat):
    if obj.data is not None and hasattr(obj.data, "materials"):
        obj.data.materials.clear()
        obj.data.materials.append(mat)
    return obj


def empty(name="Empty", location=(0, 0, 0), kind="PLAIN_AXES", size=0.5):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = kind
    e.empty_display_size = size
    e.location = location
    return link(e)


def parent(child, par, keep_transform=True):
    """Parent keeping the child's world placement.
    GOTCHA: freshly created objects have a stale matrix_world (identity) until the
    depsgraph updates, so call view_layer.update() before reading matrix_world."""
    bpy.context.view_layer.update()
    child.parent = par
    if keep_transform:
        child.matrix_parent_inverse = par.matrix_world.inverted()
    return child


# ----------------------------------------------------------------------------
# materials
# ----------------------------------------------------------------------------

def _new_mat(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True  # deprecated-but-working in 5.x (nodes are always on in 6.0)
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    out = nt.nodes.get("Material Output")
    return mat, nt, bsdf, out


def _eevee_refraction(mat, thickness="SLAB", transparent_shadow=True):
    mat.surface_render_method = "DITHERED"
    mat.use_raytrace_refraction = True
    mat.thickness_mode = thickness
    mat.use_transparent_shadow = transparent_shadow


def mat_principled(name, color="#cccccc", metallic=0.0, roughness=0.4, coat=0.0,
                   emission=None, emission_strength=0.0, specular=0.5):
    mat, nt, b, _ = _new_mat(name)
    b.inputs["Base Color"].default_value = rgba(color)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Specular IOR Level"].default_value = specular
    if emission is not None:
        b.inputs["Emission Color"].default_value = rgba(emission)
        b.inputs["Emission Strength"].default_value = emission_strength
    return mat


def mat_emission(name, color="#26ff8a", strength=8.0, facing_falloff=True):
    """Emission that keeps 3D form (Ducky 3D tip): Layer Weight Facing -> ColorRamp ->
    emission color, bright core facing camera, darker toward silhouette."""
    mat, nt, b, out = _new_mat(name)
    nt.nodes.remove(b)
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = strength
    col = rgba(color)
    if facing_falloff:
        lw = nt.nodes.new("ShaderNodeLayerWeight")
        lw.inputs["Blend"].default_value = 0.5
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.interpolation = "B_SPLINE"
        ramp.color_ramp.elements[0].color = (min(1, col[0] * 1.6 + 0.3), min(1, col[1] * 1.6 + 0.3),
                                             min(1, col[2] * 1.6 + 0.3), 1)
        ramp.color_ramp.elements[1].color = (col[0] * 0.25, col[1] * 0.25, col[2] * 0.25, 1)
        nt.links.new(lw.outputs["Facing"], ramp.inputs["Fac"])
        nt.links.new(ramp.outputs["Color"], em.inputs["Color"])
    else:
        em.inputs["Color"].default_value = col
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return mat


def mat_glass(name, color="#ffffff", ior=1.45, roughness=0.02, thin_wall=False,
              thickness="SLAB", absorption=None, absorption_density=2.0):
    """Clear or tinted glass. Works in EEVEE (raytraced refraction) and Cycles.

    absorption: hex color for Volume Absorption (Cycles: real depth tint; EEVEE: light tint).
    """
    mat, nt, b, out = _new_mat(name)
    b.inputs["Base Color"].default_value = rgba(color)
    b.inputs["Roughness"].default_value = roughness
    b.inputs["IOR"].default_value = ior
    b.inputs["Transmission Weight"].default_value = 1.0
    b.inputs["Thin Wall"].default_value = thin_wall
    if absorption:
        va = nt.nodes.new("ShaderNodeVolumeAbsorption")
        va.inputs["Color"].default_value = rgba(absorption)
        va.inputs["Density"].default_value = absorption_density
        nt.links.new(va.outputs["Volume"], out.inputs["Volume"])
    _eevee_refraction(mat, thickness)
    return mat


def mat_glow_glass(name, color="#1bff7a", glass_tint="#7dffb6", core_strength=6.0,
                   edge_strength=14.0, roughness=0.08, ior=1.45, edge_power=0.25):
    """Relate-style green emissive glass: tinted transmissive glass with emission
    that grows toward grazing angles (Fresnel/Layer Weight) so edges and bevels
    glow and bloom, center stays see-through.

    Graph:
      LayerWeight.Facing -> MapRange(0..1 -> core..edge) -> Principled.Emission Strength
      Principled(Transmission 1, Base=glass_tint, Emission Color=color) -> Output
    """
    mat, nt, b, out = _new_mat(name)
    b.inputs["Base Color"].default_value = rgba(glass_tint)
    b.inputs["Roughness"].default_value = roughness
    b.inputs["IOR"].default_value = ior
    b.inputs["Transmission Weight"].default_value = 1.0
    b.inputs["Emission Color"].default_value = rgba(color)
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = edge_power
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 0.0
    mr.inputs["From Max"].default_value = 1.0
    mr.inputs["To Min"].default_value = core_strength
    mr.inputs["To Max"].default_value = edge_strength
    nt.links.new(lw.outputs["Facing"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], b.inputs["Emission Strength"])
    _eevee_refraction(mat, "SLAB")
    return mat


def mat_iridescent(name, base="#d9d4ff", metallic=1.0, roughness=0.12,
                   film_thickness=420.0, film_ior=1.6, hue_ramp=True, ramp_strength=0.65,
                   transmission=0.0):
    """Iridescent / holographic surface.

    Two stacked effects (both work in EEVEE and Cycles in 5.2):
      1. Principled 'Thin Film Thickness' (nm) + 'Thin Film IOR' -> physically based
         interference tint on reflections. Vary thickness with noise for oil-slick bands.
      2. Layer Weight.Facing -> rainbow ColorRamp -> Base Color mix, the classic
         'pearl chameleon' cheat (angle-dependent hue shift).
    """
    mat, nt, b, out = _new_mat(name)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    b.inputs["Transmission Weight"].default_value = transmission
    b.inputs["Thin Film IOR"].default_value = film_ior
    # Noise-modulated film thickness gives moving interference bands
    tc = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 1.6
    noise.inputs["Detail"].default_value = 2.0
    nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = film_thickness * 0.55
    mr.inputs["To Max"].default_value = film_thickness * 1.45
    nt.links.new(noise.outputs["Fac"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], b.inputs["Thin Film Thickness"])
    if hue_ramp:
        lw = nt.nodes.new("ShaderNodeLayerWeight")
        lw.inputs["Blend"].default_value = 0.45
        add = nt.nodes.new("ShaderNodeMath")
        add.operation = "ADD"
        nt.links.new(lw.outputs["Facing"], add.inputs[0])
        nt.links.new(noise.outputs["Fac"], add.inputs[1])
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        cr = ramp.color_ramp
        cr.interpolation = "B_SPLINE"
        stops = ["#ffb3f0", "#a2b8ff", "#8ff5ff", "#c8ffb0", "#ffe39e", "#ffb3f0"]
        while len(cr.elements) < len(stops):
            cr.elements.new(0.5)
        for i, hx in enumerate(stops):
            cr.elements[i].position = i / (len(stops) - 1)
            cr.elements[i].color = rgba(hx)
        wrap = nt.nodes.new("ShaderNodeMath")
        wrap.operation = "FRACT"
        nt.links.new(add.outputs["Value"], wrap.inputs[0])
        nt.links.new(wrap.outputs["Value"], ramp.inputs["Fac"])
        mix = nt.nodes.new("ShaderNodeMix")
        fac, a, bb, res = mix_rgba_sockets(mix)
        fac.default_value = ramp_strength
        a.default_value = rgba(base)
        nt.links.new(ramp.outputs["Color"], bb)
        nt.links.new(res, b.inputs["Base Color"])
    else:
        b.inputs["Base Color"].default_value = rgba(base)
    if transmission > 0:
        _eevee_refraction(mat, "SPHERE")
    return mat


def mat_dispersion_glass(name, ior=1.45, spread=0.05, roughness=0.0, tint="#ffffff"):
    """SouthernShotty 'iridescent glass logo' trick (RGB dispersion): three Principled glass
    BSDFs colored pure R, G, B with IOR ior, ior+spread, ior+2*spread, summed with two
    Add Shaders. Rainbow fringes on edges/bevels. Cycles only for the real effect
    (EEVEE refraction is screen-space, the split is barely visible)."""
    mat, nt, b, out = _new_mat(name)
    nt.nodes.remove(b)
    t = rgba(tint)
    bsdfs = []
    for i, col in enumerate([(1, 0, 0, 1), (0, 1, 0, 1), (0, 0, 1, 1)]):
        p = nt.nodes.new("ShaderNodeBsdfPrincipled")
        p.inputs["Base Color"].default_value = (col[0] * t[0], col[1] * t[1], col[2] * t[2], 1)
        p.inputs["Roughness"].default_value = roughness
        p.inputs["Transmission Weight"].default_value = 1.0
        p.inputs["IOR"].default_value = ior + i * spread
        bsdfs.append(p)
    a1 = nt.nodes.new("ShaderNodeAddShader")
    a2 = nt.nodes.new("ShaderNodeAddShader")
    nt.links.new(bsdfs[0].outputs["BSDF"], a1.inputs[0])
    nt.links.new(bsdfs[1].outputs["BSDF"], a1.inputs[1])
    nt.links.new(a1.outputs["Shader"], a2.inputs[0])
    nt.links.new(bsdfs[2].outputs["BSDF"], a2.inputs[1])
    nt.links.new(a2.outputs["Shader"], out.inputs["Surface"])
    _eevee_refraction(mat, "SLAB")
    return mat


def mat_image_screen(name, image_path, emission_strength=1.6, roughness=0.18):
    """UI screenshot as a glossy self-lit screen (for floating product UI planes)."""
    mat, nt, b, out = _new_mat(name)
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(image_path, check_existing=True)
    tex.interpolation = "Cubic"
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(tex.outputs["Color"], b.inputs["Emission Color"])
    nt.links.new(tex.outputs["Alpha"], b.inputs["Alpha"])
    b.inputs["Emission Strength"].default_value = emission_strength
    b.inputs["Roughness"].default_value = roughness
    b.inputs["Coat Weight"].default_value = 0.15
    return mat, tex.image


def mat_screen_sequence(name, first_frame_path, frames, offset=0, emission_strength=1.6, roughness=0.18):
    """A device screen that plays a PNG sequence (e.g. UI plates rendered from an HTML twin of the app).
    first_frame_path is the first file of a numbered sequence (f_0001.png ...). Blender frame 1 shows
    file 1 + offset, so start the plates where the UI has already settled. Cubic filtering keeps small
    UI text crisp on a moving plane. Returns (material, image)."""
    mat, img = mat_image_screen(name, first_frame_path, emission_strength, roughness)
    img.source = "SEQUENCE"
    tex = next(n for n in mat.node_tree.nodes if n.type == "TEX_IMAGE")
    iu = tex.image_user
    iu.frame_duration = int(frames)
    iu.frame_start = 1
    iu.frame_offset = int(offset)
    iu.use_auto_refresh = True
    iu.use_cyclic = False
    return mat, img


def bias_glow(center=(0, 0, 1), width=1.6, height=0.9, depth=0.06, color="#9fc6ff", power=60.0,
              spread=0.45, name="Bias"):
    """TV bias lighting: four light strips on the back of a screen that faces -Y, aimed backwards and
    outwards, so a soft glow falls off from the device edges onto the wall behind it and the body
    reads as a silhouette in a dark set. Put a wall or backdrop 0.3-0.6 m behind the device to
    catch it. Keep it gentle (the screen stays the key light). Returns the four light objects."""
    cx, cy, cz = center
    by = cy + depth                       # just behind the panel
    edges = [((cx, by, cz + height / 2), (0, 0, 1), width), ((cx, by, cz - height / 2), (0, 0, -1), width),
             ((cx - width / 2, by, cz), (-1, 0, 0), height), ((cx + width / 2, by, cz), (1, 0, 0), height)]
    out = []
    for i, (loc, outward, length) in enumerate(edges):
        horizontal = outward[2] != 0
        lt = area_light(f"{name}{i}", loc, power=power * length, size=length * 0.9 if horizontal else 0.03,
                        size_y=0.03 if horizontal else length * 0.9, color=color)
        look_at(lt, (loc[0] + outward[0] * spread, loc[1] + 1.0, loc[2] + outward[2] * spread))
        out.append(lt)
    return out


# ----------------------------------------------------------------------------
# shapes for crypto / tech promos
# ----------------------------------------------------------------------------

def candlestick(name="Candle", x=0.0, open_=0.0, close=1.0, low=-0.3, high=1.3,
                width=0.32, depth=0.32, wick=0.045, mat=None, bevel_w=0.035, core_mat=None,
                core_ratio=0.62):
    """Trading candle as beveled body box + wick cylinder. Returns (body, wick, core).

    core_mat: optional emissive material for an inner core box (core_ratio of body size).
    Glass body + glowing core reads as 'light trapped in glass' and blooms nicely.
    """
    lo, hi = min(open_, close), max(open_, close)
    h = max(hi - lo, 0.02)
    body = add_mesh_primitive("cube", name=f"{name}_body",
                              location=(x, 0, (lo + hi) / 2), scale=(width / 2, depth / 2, h / 2))
    bpy.ops.object.transform_apply(scale=True)
    bevel(body, width=min(bevel_w, width * 0.3, h * 0.45), segments=5)
    smooth(body)
    w = add_mesh_primitive("cylinder", name=f"{name}_wick", vertices=24, radius=wick / 2,
                           depth=high - low, location=(x, 0, (low + high) / 2))
    bevel(w, width=wick * 0.2, segments=2)
    smooth(w)
    core = None
    if core_mat:
        core = add_mesh_primitive("cube", name=f"{name}_core", location=(x, 0, (lo + hi) / 2),
                                  scale=(width * core_ratio / 2, depth * core_ratio / 2,
                                         max(h - width * (1 - core_ratio), 0.01) / 2))
        bpy.ops.object.transform_apply(scale=True)
        bevel(core, width=min(bevel_w, width * core_ratio * 0.3), segments=3)
        assign(core, core_mat)
    if mat:
        assign(body, mat)
        assign(w, core_mat or mat)
    return body, w, core


def coin(name="Coin", radius=1.0, thickness=0.16, rim=0.06, mat=None, verts=128,
         symbol=None, symbol_font=None, symbol_mat=None):
    """Coin: cylinder with rounded rim (bevel) plus optional embossed text symbol."""
    c = add_mesh_primitive("cylinder", name=name, vertices=verts, radius=radius, depth=thickness)
    bevel(c, width=rim, segments=6, limit="ANGLE")
    smooth(c)
    if mat:
        assign(c, mat)
    sym = None
    if symbol:
        sym = text(symbol, font=symbol_font, size=radius * 1.1, extrude=0.02, bevel=0.008,
                   mat=symbol_mat or mat)
        sym.rotation_euler = (0, 0, 0)
        sym.location = (0, 0, thickness / 2 + 0.005)
        parent(sym, c, keep_transform=False)
    return c, sym


def blob(name="Blob", radius=1.0, subdiv=5, noise_scale=1.4, strength=0.35, mat=None,
         animate_frames=None):
    """Abstract organic blob: icosphere + Displace(noise texture). If animate_frames=(a, b)
    the texture coordinate empty drifts so the shape morphs over time (loopable)."""
    obj = add_mesh_primitive("ico_sphere", name=name, subdivisions=subdiv, radius=radius)
    tex = bpy.data.textures.new(f"{name}_noise", "CLOUDS")
    tex.noise_scale = noise_scale
    tex.noise_depth = 0
    disp = obj.modifiers.new("Displace", "DISPLACE")
    disp.texture = tex
    disp.strength = strength
    disp.mid_level = 0.5
    drv = empty(f"{name}_tex", size=0.3)
    disp.texture_coords = "OBJECT"
    disp.texture_coords_object = drv
    subsurf(obj, 1, 2)
    smooth(obj)
    if mat:
        assign(obj, mat)
    if animate_frames:
        a, b = animate_frames
        key(drv, "location", a, (0, 0, 0), interp="LINEAR")
        key(drv, "location", b, (0.0, 0.0, 1.2), interp="LINEAR")
        key(drv, "rotation_euler", a, (0, 0, 0), interp="LINEAR")
        key(drv, "rotation_euler", b, (0, 0, math.radians(90)), interp="LINEAR")
    return obj, drv


def text(body, font=None, size=1.0, extrude=0.08, bevel=0.012, bevel_res=4, align="CENTER",
         spacing=1.0, mat=None, name=None, location=(0, 0, 0), rotation=(0, 0, 0)):
    """3D text object (stays a live FONT curve; convert later only if deforming)."""
    cu = bpy.data.curves.new(name or f"T_{body[:12]}", "FONT")
    cu.body = body
    if font:
        cu.font = load_font(font)
    cu.size = size
    cu.extrude = extrude
    cu.bevel_depth = bevel
    cu.bevel_resolution = bevel_res
    cu.align_x = align
    cu.align_y = "CENTER"
    cu.space_character = spacing
    cu.resolution_u = 24
    obj = link(bpy.data.objects.new(name or cu.name, cu))
    obj.location = location
    obj.rotation_euler = rotation
    if mat:
        cu.materials.append(mat)
    return obj


def text_letters(body, font=None, size=1.0, extrude=0.08, bevel=0.012, mat=None,
                 location=(0, 0, 0), rotation=(math.radians(90), 0, 0)):
    """Kinetic-type prep: build the text, convert to mesh, split into one object per glyph
    (loose parts; 'i'/'j' dots get joined back to their stem), origin to each glyph's
    bounds center. Returns glyph objects sorted left->right, ready for stagger()."""
    t = text(body, font=font, size=size, extrude=extrude, bevel=bevel, mat=mat,
             location=location, rotation=rotation)
    bpy.ops.object.select_all(action="DESELECT")
    t.select_set(True)
    bpy.context.view_layer.objects.active = t
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    # GOTCHA: a converted extruded+beveled font mesh has caps and bevel walls as separate
    # loose islands (coincident verts). Merge by distance first or each glyph splits in 3.
    bpy.ops.mesh.remove_doubles(threshold=0.0005 * size)
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    parts = [o for o in bpy.context.selected_objects]
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    bpy.context.view_layer.update()
    # local X of the text maps to world X (rotation is about X), sort by world x
    parts.sort(key=lambda o: o.matrix_world.translation.x)
    # merge tiny parts (dots, inner counters are not loose so they stay) into the nearest glyph
    glyphs = []
    for o in parts:
        bpy.context.view_layer.update()
        if glyphs and o.dimensions.x < size * 0.18 and abs(o.matrix_world.translation.x -
                                                            glyphs[-1].matrix_world.translation.x) < size * 0.15:
            bpy.ops.object.select_all(action="DESELECT")
            o.select_set(True)
            glyphs[-1].select_set(True)
            bpy.context.view_layer.objects.active = glyphs[-1]
            bpy.ops.object.join()
            bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
        else:
            glyphs.append(o)
    for o in glyphs:
        smooth(o, angle_deg=35)
    return glyphs


def find_font(name_contains):
    """find_font('CabinetGrotesk-Bold') -> absolute path or None."""
    key_ = name_contains.lower()
    for d in FONT_DIRS:
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if key_ in f.lower() and f.lower().endswith((".ttf", ".otf")):
                return os.path.join(d, f)
    return None


def load_font(font):
    path = font if os.path.isabs(font) else find_font(font)
    if not path:
        raise FileNotFoundError(font)
    return bpy.data.fonts.load(path, check_existing=True)


def import_svg(path, depth=0.05, bevel=0.006, bevel_res=4, target_width=2.0, mat=None,
               name="Logo", join=True):
    """Import an SVG logo as one extruded, beveled, centered curve object.

    Notes: imported SVG is tiny (pixel units -> meters). We normalize width to target_width,
    move origin to the bbox center and lay it in the XZ plane facing -Y (camera friendly).
    """
    before = set(bpy.data.objects)
    bpy.ops.import_curve.svg(filepath=path)
    new = [o for o in bpy.data.objects if o not in before and o.type == "CURVE"]
    if not new:
        raise RuntimeError("SVG import produced no curves: " + path)
    bpy.ops.object.select_all(action="DESELECT")
    for o in new:
        o.select_set(True)
    bpy.context.view_layer.objects.active = new[0]
    if join and len(new) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    # move into scene collection root
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    bpy.context.scene.collection.objects.link(obj)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.location = (0, 0, 0)
    bpy.context.view_layer.update()  # GOTCHA: dimensions are stale until the depsgraph updates
    w = max(obj.dimensions.x, 1e-6)
    s = target_width / w
    # GOTCHA (5.2): transform_apply(scale) on an imported SVG curve leaves a hidden scale
    # factor that later multiplies extrude/bevel (extrude 0.08 rendered 3.3 m deep).
    # Scale the control points directly instead.
    for sp in obj.data.splines:
        for bp in sp.bezier_points:
            bp.co *= s
            bp.handle_left *= s
            bp.handle_right *= s
        for p in sp.points:
            p.co = (p.co[0] * s, p.co[1] * s, p.co[2] * s, p.co[3])
    cu = obj.data
    cu.dimensions = "2D"
    cu.fill_mode = "BOTH"
    cu.extrude = depth
    cu.bevel_depth = bevel
    cu.bevel_resolution = bevel_res
    obj.rotation_euler = (math.radians(90), 0, 0)
    if mat:
        cu.materials.clear()
        cu.materials.append(mat)
    return obj


def ui_plane(image_path, width=3.2, name="UI", location=(0, 0, 0), rotation=(math.radians(90), 0, 0),
             emission_strength=1.6, corner_radius=0.0, thickness=0.0):
    """Floating product screen. Plane sized to image aspect, glossy self-lit material.
    corner_radius > 0 rounds corners with a vertex-group bevel; thickness adds a slab."""
    mat, img = mat_image_screen(f"{name}_mat", image_path, emission_strength)
    aspect = img.size[1] / max(img.size[0], 1)
    obj = add_mesh_primitive("plane", name=name, size=1.0, location=location, rotation=rotation)
    obj.scale = (width, width * aspect, 1)
    bpy.ops.object.transform_apply(scale=True)
    if thickness > 0:
        so = obj.modifiers.new("Solidify", "SOLIDIFY")
        so.thickness = thickness
    if corner_radius > 0:
        bv = obj.modifiers.new("Round", "BEVEL")
        bv.affect = "VERTICES"
        bv.width = corner_radius
        bv.segments = 8
        bv.limit_method = "NONE"
        obj.modifiers.move(len(obj.modifiers) - 1, 0)
    assign(obj, mat)
    return obj


def floor(size=60, color="#040505", roughness=0.15, specular=0.6, z=0.0, fade_start=3.0,
          fade_end=14.0, name="Floor"):
    """Glossy floor that fades to pure black with distance from origin, so there is no
    visible horizon line in dark void scenes (mix to an unlit black by radial distance)."""
    obj = add_mesh_primitive("plane", name=name, size=size, location=(0, 0, z))
    mat, nt, b, out = _new_mat(f"{name}_mat")
    b.inputs["Base Color"].default_value = rgba(color)
    b.inputs["Roughness"].default_value = roughness
    b.inputs["Specular IOR Level"].default_value = specular
    tc = nt.nodes.new("ShaderNodeTexCoord")
    vl = nt.nodes.new("ShaderNodeVectorMath")
    vl.operation = "LENGTH"
    nt.links.new(tc.outputs["Object"], vl.inputs[0])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = fade_start
    mr.inputs["From Max"].default_value = fade_end
    mr.interpolation_type = "SMOOTHSTEP"
    nt.links.new(vl.outputs["Value"], mr.inputs["Value"])
    black = nt.nodes.new("ShaderNodeEmission")
    black.inputs["Strength"].default_value = 0.0
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(mr.outputs["Result"], mix.inputs["Fac"])
    nt.links.new(b.outputs["BSDF"], mix.inputs[1])
    nt.links.new(black.outputs["Emission"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    assign(obj, mat)
    return obj


def backdrop(size=40, color="#0a0b0c", roughness=0.25, curve=True, z=0.0):
    """Infinite cyclorama: plane with back edge extruded up and beveled."""
    import bmesh
    me = bpy.data.meshes.new("Backdrop")
    bm = bmesh.new()
    s = size / 2
    v = [bm.verts.new(p) for p in [(-s, -s, z), (s, -s, z), (s, s, z), (-s, s, z),
                                    (-s, s, z + s), (s, s, z + s)]]
    bm.faces.new((v[0], v[1], v[2], v[3]))
    bm.faces.new((v[3], v[2], v[5], v[4]))
    bm.to_mesh(me)
    bm.free()
    obj = link(bpy.data.objects.new("Backdrop", me))
    if curve:
        bv = obj.modifiers.new("Cove", "BEVEL")
        bv.width = size * 0.18
        bv.segments = 24
        bv.limit_method = "ANGLE"
    smooth(obj)
    assign(obj, mat_principled("BackdropMat", color, roughness=roughness))
    return obj


# ----------------------------------------------------------------------------
# lights
# ----------------------------------------------------------------------------

def area_light(name="Key", location=(3, -3, 4), target=(0, 0, 0), power=400, size=2.0,
               color="#ffffff", shape="RECTANGLE", size_y=None, spread_deg=180):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = power
    ld.shape = shape
    ld.size = size
    if size_y:
        ld.size_y = size_y
    ld.color = rgba(color)[:3]
    ld.spread = math.radians(spread_deg)
    obj = link(bpy.data.objects.new(name, ld))
    obj.location = location
    look_at(obj, target)
    return obj


def point_light(name="Point", location=(0, 0, 2), power=100, color="#ffffff", radius=0.1):
    ld = bpy.data.lights.new(name, "POINT")
    ld.energy = power
    ld.color = rgba(color)[:3]
    ld.shadow_soft_size = radius
    obj = link(bpy.data.objects.new(name, ld))
    obj.location = location
    return obj


def three_point(key=600, rim=900, fill=120, rim_color="#9fffd0", key_color="#ffffff",
                fill_color="#a8c8ff", dist=5.0):
    """Dark-scene product rig: soft key top-left, strong strip rims behind for edge
    highlights on glass/chrome, faint cool fill."""
    k = area_light("Key", (-dist * 0.7, -dist * 0.8, dist * 0.9), power=key, size=3.0, color=key_color)
    r1 = area_light("RimL", (-dist * 0.9, dist * 0.9, dist * 0.4), power=rim, size=4.0, size_y=0.4,
                    shape="RECTANGLE", color=rim_color)
    r2 = area_light("RimR", (dist * 0.9, dist * 0.8, dist * 0.5), power=rim, size=4.0, size_y=0.4,
                    shape="RECTANGLE", color=rim_color)
    f = area_light("Fill", (dist, -dist * 0.6, dist * 0.2), power=fill, size=4.0, color=fill_color)
    return k, r1, r2, f


def light_card(name="Card", location=(0, 4, 2), target=(0, 0, 1), size=(6, 0.4), strength=8.0,
               color="#ffffff", camera_visible=False):
    """Emissive strip plane: the product-photography 'softbox' that draws crisp highlight
    lines on glass/chrome. Hidden from camera rays (visible_camera=False works in EEVEE
    and Cycles) so it only shows up in reflections/refractions."""
    obj = add_mesh_primitive("plane", name=name, size=1.0, location=location)
    obj.scale = (size[0], size[1], 1)
    # plane normal is +Z: aim +Z at the target
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("Z", "Y").to_euler()
    mat, nt, b, out = _new_mat(f"{name}_mat")
    nt.nodes.remove(b)
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = rgba(color)
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    assign(obj, mat)
    obj.visible_camera = camera_visible
    obj.visible_shadow = False
    return obj


def reflection_probe(radius=8.0, location=(0, 0, 0), name="ReflProbe"):
    """EEVEE only: Light Probe Sphere so metal/glass reflect off-screen and camera-hidden
    objects (light cards). Without it EEVEE reflections only see the world + screen space,
    and light cards with visible_camera=False never show up. EEVEE Next updates sphere
    probes automatically at render time (no manual bake)."""
    lp = bpy.data.lightprobes.new(name, "SPHERE")
    lp.influence_distance = radius
    lp.clip_end = radius * 4
    obj = link(bpy.data.objects.new(name, lp))
    obj.location = location
    return obj


def look_at(obj, target):
    t = Vector(target) if not hasattr(target, "location") else target.location
    d = t - obj.location
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


# ----------------------------------------------------------------------------
# camera
# ----------------------------------------------------------------------------

def camera(name="Cam", location=(0, -8, 1.5), target=(0, 0, 0), lens=50, sensor=36,
           dof_target=None, fstop=2.8, track=True, clip_end=500):
    """Camera that tracks an empty (Track To constraint) so you animate camera position
    and aim point independently. DOF focuses on dof_target (object) when given."""
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.sensor_width = sensor
    cd.clip_end = clip_end
    cam = link(bpy.data.objects.new(name, cd))
    cam.location = location
    aim = empty(f"{name}_aim", location=target if not hasattr(target, "location") else target.location)
    if track:
        con = cam.constraints.new("TRACK_TO")
        con.target = aim
        con.track_axis = "TRACK_NEGATIVE_Z"
        con.up_axis = "UP_Y"
    if dof_target is not None or fstop:
        cd.dof.use_dof = dof_target is not None
        cd.dof.focus_object = dof_target if dof_target is not None else None
        cd.dof.aperture_fstop = fstop
        cd.dof.aperture_blades = 7
    bpy.context.scene.camera = cam
    return cam, aim


def set_dof(cam, focus=None, fstop=2.0, distance=None):
    d = cam.data.dof
    d.use_dof = True
    d.aperture_fstop = fstop
    if focus is not None:
        d.focus_object = focus
    elif distance is not None:
        d.focus_object = None
        d.focus_distance = distance


def set_anamorphic(cam, ratio=1.6, blades=0):
    """Anamorphic bokeh: oval highlights in the out-of-focus background (aperture_ratio > 1).
    blades=0 gives smooth discs (here ovals) instead of polygons."""
    d = cam.data.dof
    d.aperture_ratio = ratio
    d.aperture_blades = blades


def vertical_reframe(cam, lens_mult=1.6, shift_x=0.0, shift_y=0.0, res=(1080, 1920)):
    """Turn a 16:9 shot into its 9:16 version without changing the move: same camera path, the lens
    multiplied by lens_mult so the subject keeps a similar scale in the narrow frame, the f-stop
    multiplied by the same factor so the blur keeps its size relative to the subject, and a lens
    shift that places the subject inside the Reels / Shorts safe zone (essential detail outside the
    top 12% and bottom 22%). Measure the subject's projected box per shot instead of guessing."""
    cam.data.lens *= lens_mult
    cam.data.dof.aperture_fstop *= lens_mult
    cam.data.shift_x, cam.data.shift_y = shift_x, shift_y
    cam.data.sensor_fit = "AUTO"
    r = bpy.context.scene.render
    r.resolution_x, r.resolution_y = res


def cut_to(cam, frame, name=None):
    """Hard cut: bind `cam` from `frame` on via a timeline marker (Ctrl+B in the UI).
    Relate grammar: cut on the fastest frame of a move so motion carries across."""
    m = bpy.context.scene.timeline_markers.new(name or f"cut_{frame}", frame=frame)
    m.camera = cam
    return m


# ----------------------------------------------------------------------------
# animation (Blender 5 layered actions)
# ----------------------------------------------------------------------------

def fcurves_of(id_data):
    """Return the F-curves of an ID's assigned action (works with 4.4+ slotted actions)."""
    ad = getattr(id_data, "animation_data", None)
    if not ad or not ad.action:
        return []
    act = ad.action
    if hasattr(act, "fcurves") and not hasattr(act, "layers"):
        return list(act.fcurves)  # legacy (<4.4)
    if anim_utils is not None:
        cb = anim_utils.action_get_channelbag_for_slot(act, ad.action_slot)
        return list(cb.fcurves) if cb else []
    out = []
    for layer in act.layers:
        for strip in layer.strips:
            cb = strip.channelbag(ad.action_slot)
            if cb:
                out.extend(cb.fcurves)
    return out


EASE_PRESETS = {
    # name: (interpolation, easing)
    "linear": ("LINEAR", "AUTO"),
    "smooth": ("BEZIER", "AUTO"),
    "expo_out": ("EXPO", "EASE_OUT"),
    "expo_in": ("EXPO", "EASE_IN"),
    "expo_inout": ("EXPO", "EASE_IN_OUT"),
    "quart_out": ("QUART", "EASE_OUT"),
    "quint_inout": ("QUINT", "EASE_IN_OUT"),
    "cubic_inout": ("CUBIC", "EASE_IN_OUT"),
    "back_out": ("BACK", "EASE_OUT"),
    "elastic_out": ("ELASTIC", "EASE_OUT"),
    "bounce_out": ("BOUNCE", "EASE_OUT"),
    "constant": ("CONSTANT", "AUTO"),
}


def key(target, path, frame, value, interp="expo_inout", index=-1, socket=False):
    """Insert a keyframe and set the interpolation of the segment that STARTS at it.

    target: object / light data / node socket (pass socket=True with path 'default_value').
    interp: a preset name from EASE_PRESETS or a raw Blender interpolation id.
    In Blender, the interpolation on keyframe N governs the curve from N to N+1, so put
    'expo_out' on the first key of a move for a fast-start slow-settle Relate feel.
    """
    if value is not None:
        cur = getattr(target, path)
        if index >= 0:
            cur[index] = value
        elif hasattr(cur, "__len__") and not isinstance(value, (int, float)):
            for i, v in enumerate(value):
                cur[i] = v
        else:
            setattr(target, path, value)
    target.keyframe_insert(data_path=path, frame=frame, index=index)
    ip, ease = EASE_PRESETS.get(interp, (interp, "AUTO"))
    owner = target.id_data
    full = target.path_from_id(path) if target != owner else path
    for fc in fcurves_of(owner):
        if fc.data_path != full or (index >= 0 and fc.array_index != index):
            continue
        for kp in fc.keyframe_points:
            if abs(kp.co.x - frame) < 1e-3:
                kp.interpolation = ip
                kp.easing = ease
    return target


def set_interp_all(id_data, interp="expo_inout"):
    ip, ease = EASE_PRESETS.get(interp, (interp, "AUTO"))
    for fc in fcurves_of(id_data):
        for kp in fc.keyframe_points:
            kp.interpolation = ip
            kp.easing = ease


def cycles_modifier(id_data):
    """Make every F-curve repeat forever (seamless loops: first key == last key)."""
    for fc in fcurves_of(id_data):
        if not any(m.type == "CYCLES" for m in fc.modifiers):
            fc.modifiers.new("CYCLES")


def stagger(objs, path, f0, f1, v0, v1, step=2, interp="expo_out"):
    """Kinetic cascade: same move on many objects, each delayed by `step` frames."""
    for i, o in enumerate(objs):
        key(o, path, f0 + i * step, v0, interp)
        key(o, path, f1 + i * step, v1, interp)


# ----------------------------------------------------------------------------
# geometry nodes helpers
# ----------------------------------------------------------------------------

def gn_modifier(obj, name="GN"):
    """Add an empty Geometry Nodes modifier with Group Input/Output wired; returns (tree, nin, nout)."""
    tree = bpy.data.node_groups.new(name, "GeometryNodeTree")
    tree.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    tree.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    nin = tree.nodes.new("NodeGroupInput")
    nout = tree.nodes.new("NodeGroupOutput")
    nin.location, nout.location = (-600, 0), (600, 0)
    m = obj.modifiers.new(name, "NODES")
    m.node_group = tree
    return tree, nin, nout


def gn_proximity_grid(effector, inst_obj, size=10.0, count=12, lift=0.8, falloff=2.5, mat=None,
                      name="ProxGrid"):
    """Ducky 3D proximity effector, built in code:
    Grid -> Mesh to Points(Faces) -> Instance on Points(inst_obj)
    effector location -> Points -> Geometry Proximity.Distance -> Map Range(0..falloff -> lift..0)
    -> Combine XYZ.Z -> Translate Instances + Scale Instances. Stores 'prox' (instance float)
    for shading via an Attribute node (type INSTANCER, name 'prox')."""
    holder = link(bpy.data.objects.new(name, bpy.data.meshes.new(name)))
    tree, nin, nout = gn_modifier(holder, name)
    N = tree.nodes.new
    L = tree.links.new
    grid = N("GeometryNodeMeshGrid")
    grid.inputs["Size X"].default_value = size
    grid.inputs["Size Y"].default_value = size
    grid.inputs["Vertices X"].default_value = count + 1
    grid.inputs["Vertices Y"].default_value = count + 1
    m2p = N("GeometryNodeMeshToPoints")
    m2p.mode = "FACES"
    oi = N("GeometryNodeObjectInfo")
    oi.inputs["Object"].default_value = inst_obj
    oi.inputs["As Instance"].default_value = True
    iop = N("GeometryNodeInstanceOnPoints")
    eff = N("GeometryNodeObjectInfo")
    eff.inputs["Object"].default_value = effector
    eff.transform_space = "RELATIVE"
    pts = N("GeometryNodePoints")
    pts.inputs["Count"].default_value = 1
    prox = N("GeometryNodeProximity")
    prox.target_element = "POINTS"
    mr = N("ShaderNodeMapRange")
    mr.clamp = True
    mr.inputs["From Min"].default_value = 0.0
    mr.inputs["From Max"].default_value = falloff
    mr.inputs["To Min"].default_value = 1.0
    mr.inputs["To Max"].default_value = 0.0
    fc = N("ShaderNodeFloatCurve")  # smooth falloff
    mul = N("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = lift
    cxyz = N("ShaderNodeCombineXYZ")
    trans = N("GeometryNodeTranslateInstances")
    store = N("GeometryNodeStoreNamedAttribute")
    store.data_type = "FLOAT"
    store.domain = "INSTANCE"
    store.inputs["Name"].default_value = "prox"
    L(grid.outputs["Mesh"], m2p.inputs["Mesh"])
    L(m2p.outputs["Points"], iop.inputs["Points"])
    L(oi.outputs["Geometry"], iop.inputs["Instance"])
    L(eff.outputs["Location"], pts.inputs["Position"])
    L(pts.outputs["Points"], prox.inputs[0])
    L(prox.outputs["Distance"], mr.inputs["Value"])
    L(mr.outputs["Result"], fc.inputs["Value"])
    L(fc.outputs["Value"], mul.inputs[0])
    L(mul.outputs["Value"], cxyz.inputs["Z"])
    L(iop.outputs["Instances"], store.inputs["Geometry"])
    L(fc.outputs["Value"], store.inputs["Value"])
    L(store.outputs["Geometry"], trans.inputs["Instances"])
    L(cxyz.outputs["Vector"], trans.inputs["Translation"])
    last = trans.outputs["Instances"]
    if mat:
        sm = N("GeometryNodeSetMaterial")
        sm.inputs["Material"].default_value = mat
        L(last, sm.inputs["Geometry"])
        last = sm.outputs["Geometry"]
    L(last, nout.inputs["Geometry"])
    return holder, tree


# ----------------------------------------------------------------------------
# compositor (Blender 5 node-group compositor)
# ----------------------------------------------------------------------------

def compositor(bloom=True, bloom_threshold=1.0, bloom_strength=0.6, bloom_size=0.6,
               bloom_type="Bloom", quality="High", fog_glow=False, streaks=False,
               dispersion=0.0, distortion=0.0, vignette=0.35, grain=0.0, exposure=0.0):
    """Post stack: Render Layers -> Glare(Bloom) [-> Glare(Fog Glow)] [-> Glare(Streaks)]
    -> Lens Distortion (chromatic dispersion) -> Vignette (Ellipse Mask, blurred, multiply)
    -> Group Output.

    Glare inputs in 5.x are sockets: Type (menu), Quality (menu), Threshold, Smoothness,
    Strength, Saturation, Tint, Size, Streaks, Fade, ... Valid Type values:
    'Bloom', 'Fog Glow', 'Streaks', 'Ghosts', 'Simple Star', 'Sun Beams', 'Kernel'.
    """
    scene = bpy.context.scene
    tree = bpy.data.node_groups.new("MG_Comp", "CompositorNodeTree")
    tree.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    scene.compositing_node_group = tree
    N = tree.nodes.new
    L = tree.links.new
    rl = N("CompositorNodeRLayers")
    rl.location = (-900, 0)
    out = N("NodeGroupOutput")
    out.location = (900, 0)
    cur = rl.outputs["Image"]
    x = -650

    def glare(kind, thr, strength, size=None, extra=None):
        nonlocal cur, x
        g = N("CompositorNodeGlare")
        g.location = (x, 0)
        x += 220
        g.inputs["Type"].default_value = kind
        g.inputs["Quality"].default_value = quality
        g.inputs["Threshold"].default_value = thr
        g.inputs["Strength"].default_value = strength
        if size is not None:
            g.inputs["Size"].default_value = size
        for k, v in (extra or {}).items():
            g.inputs[k].default_value = v
        L(cur, g.inputs["Image"])
        cur = g.outputs["Image"]
        return g

    if exposure:
        ex = N("CompositorNodeExposure")
        ex.inputs["Exposure"].default_value = exposure
        L(cur, ex.inputs["Image"])
        cur = ex.outputs["Image"]
    if bloom:
        glare(bloom_type, bloom_threshold, bloom_strength, bloom_size)
    if fog_glow:
        glare("Fog Glow", bloom_threshold * 1.5, bloom_strength * 0.5, 0.8)
    if streaks:
        glare("Streaks", bloom_threshold * 3.0, 0.25, None, {"Streaks": 4, "Fade": 0.9})
    if dispersion or distortion:
        ld = N("CompositorNodeLensdist")
        ld.location = (x, 0)
        x += 220
        for nm, val in (("Distortion", distortion), ("Dispersion", dispersion)):
            if nm in ld.inputs:
                ld.inputs[nm].default_value = val
        L(cur, ld.inputs["Image"])
        cur = ld.outputs["Image"]
    if vignette > 0:
        em = N("CompositorNodeEllipseMask")
        em.location = (x, -300)
        sz = em.inputs["Size"]
        sz.default_value = (1.05, 1.05, 0.0)[:len(sz.default_value)]
        bl = N("CompositorNodeBlur")
        bl.location = (x + 200, -300)
        try:
            bl.inputs["Size"].default_value = (300, 300)
        except Exception:
            pass
        L(em.outputs["Mask"], bl.inputs["Image"])
        mix = N("ShaderNodeMix")
        fac, a, b, res = mix_rgba_sockets(mix)
        mix.blend_type = "MULTIPLY"
        mix.location = (x + 420, 0)
        fac.default_value = vignette
        L(cur, a)
        L(bl.outputs["Image"], b)
        cur = res
        x += 640
    L(cur, out.inputs[0])
    return tree


# ----------------------------------------------------------------------------
# rendering
# ----------------------------------------------------------------------------

def render_still(path, frame=1):
    scene = bpy.context.scene
    scene.frame_set(frame)
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = path
    t = time.time()
    bpy.ops.render.render(write_still=True)
    dt = time.time() - t
    print(f"[mglib] rendered {path} frame {frame} in {dt:.1f}s")
    return dt


def render_frames(out_dir, frames=None, prefix="f_"):
    """Render a list/range of frames to PNGs: out_dir/f_0001.png ..."""
    scene = bpy.context.scene
    os.makedirs(out_dir, exist_ok=True)
    frames = frames or range(scene.frame_start, scene.frame_end + 1)
    times = []
    for f in frames:
        times.append(render_still(os.path.join(out_dir, f"{prefix}{f:04d}.png"), f))
    return times


def render_animation(out_dir, prefix="f_"):
    """Native animation render (faster than looping render_still: no re-sync per frame)."""
    scene = bpy.context.scene
    os.makedirs(out_dir, exist_ok=True)
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = os.path.join(out_dir, prefix)
    t = time.time()
    bpy.ops.render.render(animation=True)
    print(f"[mglib] animation {scene.frame_start}-{scene.frame_end} in {time.time() - t:.1f}s")


def encode_mp4(frames_dir, out_mp4, fps=24, prefix="f_", start=1, crf=16):
    """PNG sequence -> H.264 mp4 (yuv420p, web-safe) with Homebrew ffmpeg."""
    cmd = ["/opt/homebrew/bin/ffmpeg", "-y", "-framerate", str(fps), "-start_number", str(start),
           "-i", os.path.join(frames_dir, f"{prefix}%04d.png"), "-c:v", "libx264", "-pix_fmt",
           "yuv420p", "-crf", str(crf), "-preset", "slow", "-movflags", "+faststart", out_mp4]
    subprocess.run(cmd, check=True)
    return out_mp4


def save_blend(path):
    bpy.ops.wm.save_as_mainfile(filepath=path)

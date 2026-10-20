# Blender mograph playbook for coding agents (Blender 5.2.2, headless bpy)

Goal: recreate Relate Studio style crypto/tech promo shots (green emissive glass candlesticks, coins, iridescent abstract shapes, dark void + bloom, kinetic type, logo reveals, floating product UI, camera fly-throughs with DOF and motion blur) from Python, without opening the Blender UI.

Everything in this file was run and looked at on this Mac (M1 Pro 16 GB, Metal) on 2026-10-17. Source notes: `tutorials.md`. Library: `/Users/gedeondrapak/Dev/relate-mograph/blender/mglib.py`. Working examples: `/Users/gedeondrapak/Dev/relate-mograph/blender/tests/t1..t5_*.py` (renders in `tests/out/`).

---

## 0. How to run

```bash
/opt/homebrew/bin/blender -b --factory-startup -P script.py -- arg1 arg2   # headless
/opt/homebrew/bin/blender -b scene.blend -P tweak.py                       # reopen a saved scene
```
- `--factory-startup` ignores user prefs/add-ons, so results are reproducible. Script args come after `--` (`sys.argv[sys.argv.index('--')+1:]`).
- Env vars are the easiest switch: tests use `MG_ENGINE=EEVEE|CYCLES`, `MG_FRAMES=12,30`, `MG_ANIM=1`.
- Grep the output: `2>&1 | grep -E "mglib|Error|Traceback"`. Deprecation warnings for `use_nodes` are harmless in 5.x.
- Always end a scene script with `mg.save_blend(path)` so the next step (or the Blender MCP) can reopen and tweak it.

```python
import sys; sys.path.insert(0, "/Users/gedeondrapak/Dev/relate-mograph/blender")
import mglib as mg
mg.reset_scene()
mg.setup_render(engine="EEVEE", res=(960, 540), samples=64, frame_range=(1, 72),
                look="AgX - Punchy", motion_blur=True)
mg.set_world(hdri=mg.STUDIO_HDRI, hdri_strength=0.4, camera_sees_color="#020303")
...
mg.compositor(bloom=True, bloom_threshold=0.85, bloom_strength=0.6, dispersion=0.015, vignette=0.4)
mg.render_still("/abs/path/f040.png", 40)
```

---

## 1. Version-specific API cheat sheet (5.2.2, verified)

| Thing | Blender 5.2 (works) | Old / broken |
|---|---|---|
| EEVEE engine id | `scene.render.engine = 'BLENDER_EEVEE'` | `'BLENDER_EEVEE_NEXT'` (4.2-4.4 only) |
| Cycles on Metal | `prefs=bpy.context.preferences.addons['cycles'].preferences; prefs.compute_device_type='METAL'; prefs.get_devices(); d.use=True; scene.cycles.device='GPU'` | the device enum is empty until `get_devices()` |
| Bloom | compositor `CompositorNodeGlare`, `g.inputs['Type'].default_value='Bloom'` | `scene.eevee.use_bloom` (gone since 4.2), `glare.glare_type` (now a socket) |
| Glare types (exact strings) | `'Bloom','Fog Glow','Streaks','Ghosts','Simple Star','Sun Beams','Kernel'`; Quality `'Low','Medium','High'` | `'FOG_GLOW'` style enums |
| Glare inputs | Image, Type, Quality, Threshold, Smoothness, Clamp, Maximum, Strength, Saturation, Tint, Size, Streaks, Streaks Angle, Iterations, Fade, Color Modulation, Diagonal, Sun Position, Jitter | `mix` property |
| Compositor tree | `tree=bpy.data.node_groups.new('C','CompositorNodeTree'); tree.interface.new_socket('Image',in_out='OUTPUT',socket_type='NodeSocketColor'); scene.compositing_node_group=tree`; output = `NodeGroupOutput` | `scene.use_nodes=True; scene.node_tree` (gone), `CompositorNodeComposite` (does not exist) |
| Alpha Over | inputs `Background`, `Foreground`, `Factor` | `inputs[1]/[2]` image order |
| Ellipse Mask | inputs Operation, Mask, Value, Position, Size (vector), Rotation | `width/height` props |
| Lens Distortion | `CompositorNodeLensdist` inputs Type, Distortion, Dispersion, Jitter, Fit | `use_projector` prop |
| ShaderNodeMix (color) | `node.data_type='RGBA'`; Factor=`inputs[0]`, A=`inputs[6]`, B=`inputs[7]`, Result=`outputs[2]` | `inputs['A']` silently grabs the FLOAT socket |
| Keyframe F-curves | `from bpy_extras import anim_utils; cb=anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot); cb.fcurves` | `action.fcurves` (does not exist on 5.x layered actions) |
| EEVEE samples | `scene.eevee.taa_render_samples` | |
| EEVEE raytracing | `scene.eevee.use_raytracing=True; ray_tracing_method='SCREEN'; ray_tracing_options.resolution_scale='1'; use_fast_gi=True` | `use_ssr`, `use_gtao` (gone) |
| EEVEE glass | `mat.surface_render_method='DITHERED'; mat.use_raytrace_refraction=True; mat.thickness_mode='SLAB'|'SPHERE'; mat.use_transparent_shadow=True` | `blend_method='BLEND'`, `use_screen_refraction` |
| Principled sockets | 'Base Color','Metallic','Roughness','IOR','Alpha','Thin Wall'(new 5.2),'Normal','Subsurface Weight','Specular IOR Level','Transmission Weight','Coat Weight','Sheen Weight','Emission Color','Emission Strength','Thin Film Thickness','Thin Film IOR' | 'Transmission', 'Emission', 'Specular' |
| Color management | `view_settings.view_transform='AgX'` (also 'Filmic','Standard','Khronos PBR Neutral'), `look='AgX - Punchy'` / `'AgX - High Contrast'` | in `-b` mode the enum lists only 'NONE' when introspected, but assigning the string works |
| Motion blur | `scene.render.use_motion_blur=True; render.motion_blur_shutter=0.5`; EEVEE extra steps `scene.eevee.motion_blur_steps` | `eevee.use_motion_blur` |
| DOF | `cam.data.dof.use_dof=True; focus_object=empty; aperture_fstop=2.0; aperture_blades=7`; EEVEE `scene.eevee.bokeh_max_size` | |
| Hide from camera only | `obj.visible_camera=False; obj.visible_shadow=False` (works in EEVEE and Cycles) | `cycles_visibility.camera` |
| Reflection probe | `bpy.data.lightprobes.new('P','SPHERE')` + object; auto-updates at render | `'CUBEMAP'` type name |
| SVG import | `bpy.ops.import_curve.svg(filepath=...)` (add-on `io_curve_svg` enabled by default) | `bpy.ops.wm.svg_import` (does not exist) |
| Images as planes | `bpy.ops.image.import_as_mesh_planes` exists (core since 4.2); `mglib.ui_plane()` builds it by hand instead | `import_image.to_plane` |
| Smooth by angle | `bpy.ops.object.shade_smooth_by_angle(angle=rad)` | `mesh.use_auto_smooth` (removed 4.1) |
| Camera cut | `m=scene.timeline_markers.new('S2', frame=50); m.camera=cam2` | |
| Bundled HDRIs | `/Applications/Blender.app/Contents/Resources/5.2/datafiles/studiolights/world/{studio,interior,city,courtyard,forest,night,sunrise,sunset}.exr` (`mg.STUDIO_HDRI`) | |

---

## 2. Gotchas that cost real time (all hit during verification)

1. **Stale `matrix_world` / `dimensions`** on freshly created or joined objects until `bpy.context.view_layer.update()`. Parenting with a stale matrix doubled every candle's X position; reading stale `dimensions` mis-scaled the SVG logo. `mglib.parent()` and `import_svg()` now update first.
2. **`transform_apply(scale)` on an imported SVG curve** left a hidden factor that later multiplied extrude/bevel (0.08 extrude rendered 3.3 m deep). Scale the bezier points directly (`import_svg` does).
3. **Converted extruded+beveled text** is not one island per glyph: front cap, back cap and bevel wall are separate loose parts. `remove_doubles` before `separate(type='LOOSE')` (`text_letters` does). Letters that touch in heavy fonts (e.g. "RA") still merge into one glyph.
4. **Hex colors**: Blender sockets want linear RGB. `mg.rgba('#00ff66')` converts. (A bug that treated the int 1 as 1.0 turned `#010202` into a bright red sky; keep conversion explicit.)
5. **`ShaderNodeMix` duplicate socket names**: `inputs['A']` is the float socket. Use `mg.mix_rgba_sockets(node)`.
6. **EEVEE reflections do not see camera-hidden light cards** (or anything off-screen) unless there is a **Light Probe Sphere** (`mg.reflection_probe(radius)`). Without it chrome/iridescent objects reflect only the dim world and look black.
7. **EEVEE screen-space refraction does not show an emissive core inside a glass shell** reliably (core disappears or blotches). For "light trapped in glass" use Cycles, or in EEVEE use self-lit glass (`mat_glow_glass`).
8. **AgX desaturates hot emission toward white** (pastel mint instead of neon green). Keep emission strengths moderate (core 1-3, edges 3-6) with saturated colors and let the Glare node make the glow.
9. A visible **floor horizon** kills the void look: `mg.floor(fade_start, fade_end)` mixes the floor to unlit black by distance.
10. Interpolation set on keyframe N controls the segment N -> N+1. Put `expo_out` on the first key of a move.
11. Loops: first key == last key and either key one frame past the range or `mg.cycles_modifier(obj)`.
12. `world.use_nodes`, `material.use_nodes`, `scene.use_nodes` print DeprecationWarnings in 5.x but still work (needed for world/material trees).

---

## 3. Look recipes (what reads as "premium" on a dark set)

**Scene skeleton:** black void (`camera_sees_color` near black) + HDRI for reflections only + 2-4 **light cards** (emissive strips hidden from camera) that draw crisp highlight lines on glass/chrome + one soft key area light + fading glossy floor for reflections + compositor bloom, light dispersion, vignette. EEVEE also needs `reflection_probe()`.

| Element | mglib call | Notes / values that worked |
|---|---|---|
| Green glass candlestick (hero, Cycles) | `candlestick(mat=mat_glass(color='#9dffc8', roughness=0.12, absorption='#1aff7a', absorption_density=1.5), core_mat=mat_emission('#00ff55', 2.2))` | glass shell + inner emissive core; bloom threshold 0.8 strength 0.7. 7-11 s/frame at 960x540 128 spp |
| Green glass candlestick (fast, EEVEE) | `mat_glow_glass(color='#00ff55', glass_tint='#0a2a18', core_strength=0.25, edge_strength=4, edge_power=0.35)` | reads as neon glass, less depth; 1.4-2.5 s/frame |
| Emission with form | `mat_emission(color, strength, facing_falloff=True)` | Layer Weight Facing -> B-Spline ramp (Ducky 3D) |
| Iridescent blob | `blob(...)` + `mat_iridescent(base='#e8e8ff', metallic=1, roughness=0.14, film_thickness=520, film_ior=1.8, ramp_strength=0.9)` | needs colorful big light cards (pink `#ff9cf0` / cyan `#8cf7ff`, 4x8 m, strength 7) or it reflects black. Cycles best; EEVEE ok with probe |
| Dispersion glass logo | `mat_dispersion_glass(ior=1.45, spread=0.06)` | RGB-split trick (SouthernShotty); Cycles only |
| Coins | `coin(radius, thickness, rim, mat, symbol='$', symbol_font=...)` | gold `#ffcf7a` metallic 1 rough 0.18; glass coins with `mat_glow_glass` |
| Floating UI screen | `ui_plane(png, width, emission_strength=1.2, corner_radius=0.08)` | self-lit, low coat; keep it behind the focus plane so DOF softens it |
| Kinetic 3D type | `text_letters(body, font, size, extrude, bevel, mat)` + per-glyph keys (location/rotation/scale, 2-frame stagger, `expo_out`) | Cabinet Grotesk Extrabold in `~/Library/Fonts`; `find_font('CabinetGrotesk-Bold')` |
| SVG logo | `import_svg(path, depth, bevel, target_width, mat)` | lies in XZ facing -Y; reveal with scale `back_out` + rotation `expo_out` |
| Mograph field | `gn_proximity_grid(effector, inst_obj, size, count, lift, falloff, mat)` | stores instance float `prox`; shade with `ShaderNodeAttribute(attribute_type='INSTANCER', attribute_name='prox')` |

Compositor order: `Render Layers -> [Exposure] -> Glare Bloom -> [Fog Glow] -> [Streaks] -> Lens Distortion (Dispersion 0.01-0.03) -> Vignette (Ellipse Mask -> Blur 300 -> Multiply 0.35-0.45) -> Group Output`.

---

## 4. Reusable snippets (all live in mglib; copy if you need standalone)

**Glass (EEVEE + Cycles)**
```python
mat = bpy.data.materials.new("Glass"); mat.use_nodes = True
b = mat.node_tree.nodes["Principled BSDF"]
b.inputs["Transmission Weight"].default_value = 1.0
b.inputs["Roughness"].default_value = 0.05
b.inputs["IOR"].default_value = 1.45
mat.surface_render_method = "DITHERED"; mat.use_raytrace_refraction = True
mat.thickness_mode = "SLAB"; mat.use_transparent_shadow = True
bpy.context.scene.eevee.use_raytracing = True
```

**Bloom compositor (5.x)**
```python
sc = bpy.context.scene
tree = bpy.data.node_groups.new("Comp", "CompositorNodeTree")
tree.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
sc.compositing_node_group = tree
rl = tree.nodes.new("CompositorNodeRLayers"); out = tree.nodes.new("NodeGroupOutput")
g = tree.nodes.new("CompositorNodeGlare")
g.inputs["Type"].default_value = "Bloom"; g.inputs["Quality"].default_value = "High"
g.inputs["Threshold"].default_value = 0.85; g.inputs["Strength"].default_value = 0.6
g.inputs["Size"].default_value = 0.7
tree.links.new(rl.outputs["Image"], g.inputs["Image"]); tree.links.new(g.outputs["Image"], out.inputs[0])
```

**Keyframes with easing on 5.x layered actions**
```python
obj.location = (0, 0, 0); obj.keyframe_insert("location", frame=1)
obj.location = (0, 0, 2); obj.keyframe_insert("location", frame=24)
from bpy_extras import anim_utils
ad = obj.animation_data
for fc in anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot).fcurves:
    for kp in fc.keyframe_points:
        kp.interpolation = "EXPO"; kp.easing = "EASE_OUT"   # Relate-style snap then settle
```
`mg.key(obj, "location", frame, value, "expo_out")` does this in one call. Presets: linear, smooth, expo_out, expo_in, expo_inout, quart_out, quint_inout, cubic_inout, back_out, elastic_out, bounce_out, constant. Works on node sockets too: `mg.key(node.inputs["Location"], "default_value", 1, (-1.5,0,0))`.

**Camera rig** (`mg.camera`): camera with Track To an aim empty; animate camera location and aim location separately (`quint_inout` for fly-throughs, `expo_out` for punch-ins), DOF focus on the aim empty (`set_dof(cam, focus=aim, fstop=2.0)`). Multi-shot: one camera+aim per shot, `mg.cut_to(cam2, frame)` on the fastest frame of the outgoing move, keep a slow drift during holds (tutorial 12 numbers: 40 deg transition over 20 frames, 40-frame hold, +10 deg drift).

**Render + encode**
```python
mg.render_animation("/abs/out/seq")                  # PNG sequence f_0001.png ...
mg.encode_mp4("/abs/out/seq", "/abs/out/shot.mp4", fps=24)  # libx264 yuv420p crf 16
```

---

## 5. Render benchmarks (M1 Pro 16 GB, Blender 5.2.2)

| Scene | Engine / settings | 960x540 | 1920x1080 |
|---|---|---|---|
| t1 candlesticks (7 glass candles, floor, bloom, MB) | EEVEE 64 spp, raytracing | 1.2-2.8 s/frame (first frame +3-8 s shader compile) | ~4x |
| t1 candlesticks with glass shell + core | Cycles Metal 128 spp, adaptive, denoise | 7-11 s/frame | ~4x |
| t2 iridescent blob + 4 coins + probe | EEVEE 64 spp | 2.4-5 s/frame | 5.9 s/frame |
| t2 same | Cycles 128 spp | 8.8 s/frame | 25.8 s/frame |
| t3 type + logo + UI, motion blur, DOF | EEVEE 32 spp, 60-frame `render_animation` | 63.7 s total = 1.06 s/frame | |
| t4 dispersion glass logo | Cycles 128 spp | 9.2 s/frame | |
| t5 GN proximity grid 256 instances | EEVEE 32 spp | 1.5 s/frame | |

Rule of thumb: EEVEE 1080p 5 s shot (120 f) about 10-12 min; Cycles 1080p 128 spp about 50 min. Draft everything in EEVEE at 960x540, render only hero glass shots in Cycles. For overnight batches run several frame ranges in parallel only with EEVEE on CPU-light scenes; Cycles already saturates the GPU.

---

## 6. Blender MCP vs headless: who does what

Available here: the official Blender MCP tools (`mcp__blender__*`). Two modes:
- **`execute_blender_code_for_cli(blend_file, code)`** runs `blender --background` on a .blend and returns `result` (dict). Verified working on `tests/out/t3_type.blend`. Needs no running Blender. Good for inspection and small edits of saved scenes.
- **Interactive tools** (`execute_blender_code`, `get_screenshot_of_window_as_image`, `render_viewport_to_path`, `get_objects_summary`, `search_api_docs`) need Blender open with the MCP add-on running (Auto Start).

| Task | Use |
|---|---|
| Building whole shots, batch renders, anything that must be reproducible | headless `blender -b -P script.py` + mglib, script committed to repo |
| Inspecting a saved scene, quick property fixes, reading node trees | `execute_blender_code_for_cli` on the .blend |
| API lookups (socket names, enum values) | `search_api_docs` / bundled `data/api` RST, or a 10-line probe script (see `tests/api_probe.py`) |
| Interactive art direction with Gedeon watching, viewport screenshots, tweaking a camera by eye | interactive MCP on an open Blender, then port final values back into the script |
| Previz for AI video (tutorial 3) | headless grey-box + viewport/EEVEE playblast, then Seedance/Kling with the playblast as motion reference |

Agent rules learned from the AI tutorials: drive layout by numbers (positions, bounding boxes, camera math), never by nudging from screenshots; state world scale; render a frame and look at it after every structural change; iterate in short feedback rounds; save the .blend after each step so a crash loses nothing.

---

## 7. Shot recipe template (Relate-style 3-5 s shot)

1. `reset_scene()`, `setup_render(EEVEE draft)`, `set_world(hdri=STUDIO_HDRI, camera_sees_color=near-black)`, `reflection_probe()` if EEVEE.
2. Build hero objects with mglib shapes + materials; group animated parts under empties.
3. Light: 1 soft key (60-250 W area), 2-3 light cards (strength 5-14) placed off-camera to draw edge highlights, optional colored rims matching brand color.
4. Floor: `floor(fade_start=2.5, fade_end=9)` slightly below the objects for reflections.
5. Animate: objects with `expo_out` / `back_out`, staggered 2-4 frames; camera + aim with `quint_inout`; 2 s extra handle at both ends for editing.
6. `set_dof(cam, focus=aim, fstop=1.8-2.8)`, `motion_blur=True, shutter=0.5`.
7. `compositor(bloom, dispersion~0.015, vignette~0.4)`.
8. Render 2-3 key stills, Read them, fix, then `render_animation` + `encode_mp4`. Switch to Cycles only for the final hero pass.

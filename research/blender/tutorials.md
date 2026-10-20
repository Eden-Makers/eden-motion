# Blender mograph research: 12 tutorials (Oct 2026)

Sources: YouTube auto-transcripts in `transcripts/*.txt` (yt-dlp, 10 of 14 fetched before YouTube rate-limited with HTTP 429) plus Gemini video analysis (`gemini-3.5-flash`, reads on-screen node trees) for the visually heavy ones. Two short bonus clips were used only as 5.x API checks.

Machine: Blender 5.2.2 LTS (Homebrew cask), Apple M1 Pro 16 GB, Metal GPU 16 cores.

Every value below was either read from the transcript or from Gemini's on-screen analysis. Gemini notes are marked [G], transcript-only notes [T]. Values flagged "verify" were not cross-checked against a second source.

---

## A. Blender MCP / Claude / AI agents (3)

### 1. Claude + Blender Is Insane Now - Full Free Setup
- URL: https://www.youtube.com/watch?v=wSY1kHXSap0
- Channel: Stefan 3D AI · 14:13 · 297k views · 2026-05-06 [T]
- Key points:
  - There is now an **official Blender MCP** (Blender Lab add-on, Blender 5.1+), separate from the older community `blender-mcp` (ahujasid). Install: drag the add-on zip into Blender, Preferences > Add-ons > MCP, make sure the server is running and **Auto Start** is on.
  - Claude Desktop: + > Connectors > search "Blender" > Install, then fully restart Claude.
  - Extra MCPs (fal.ai for image/3D/PBR generation) go in `claude_desktop_config.json` under `mcpServers` with the API key in env.
  - Use cases that worked in one prompt: scene cleanup, PBR material generation and wiring, normal/AO bake high to low poly, **geometry-nodes scatter with exposed density parameters**, splitting a keyboard into 66 loose keys and animating a wave with bounce, procedural pearl/chameleon car paint (Layer Weight > ColorRamp), toon shader with outline modifier, LOD export with texture downscale.
  - Also useful: asking Claude to explain someone else's geometry node tree.
- Gotchas: results are viewport previews, quality depends on how precisely the prompt specifies parameters; restart the client after adding any MCP or skill.

### 2. Claude Code Took Over Blender and Created This...
- URL: https://www.youtube.com/watch?v=YwIGmEs0NdU
- Channel: Stefan 3D AI · 17:57 · 335k views · 2026-05-27 [T]
- Key points:
  - Claude Code + official Blender MCP + `.env` keys, run with `--dangerously-skip-permissions` for long autonomous loops (presenter says he does not recommend it; approvals give the same result, slower).
  - Restart the Claude Code session once after the MCP is registered (`claude --continue` to resume).
  - Iteration pattern: initial prompt + 3-4 short feedback rounds. Tornado assembly animation needed 5 iterations; procedural bubble water via geometry nodes needed 2 (first version ignored world scale: bubbles 3x too big, too low-res).
  - **Claude's vision is weak for spatial layout** (placing generated objects in a scene from screenshots kept failing, objects rotated 90 deg). Coding and parameter work is strong. Codex did slightly better on the vision-driven layout test.
  - Blender crashed once mid-session; telling Claude "what you do crashes Blender" made it back off and restore a working state.
- Gotchas for us: drive layout with **numbers** (positions, bounding boxes, camera math) and verify with renders, do not rely on vision to nudge objects; always state the world scale.

### 3. How To Save AI Credits With Claude + Blender
- URL: https://www.youtube.com/watch?v=9fC3pnf_Xew
- Channel: TutStick · 8:08 · 101k views · 2026-09-11 [G] (transcript blocked by 429)
- Key points:
  - Uses the **Higgsfield bridge MCP** (`https://bridge.higgsfield.ai/mcp`, custom connector in Claude) plus the Higgsfield for Blender add-on. Exposed tools include Set Active Camera, Set Current Frame, Set Material, Set Transform, Render Frame, Screenshot Viewport, Import Character Motion, Search Python API Docs.
  - Workflow: let Claude build a **grey-box previz** in Blender (proxies, color-coded identities, cameras on spline rails targeting nulls, exact timings, 24 fps 16:9 30 s), export a cheap viewport playblast, then feed the playblast to Seedance 2.5 as a motion-guidance reference (`@video1`) with character/environment image refs. Saves credits because camera, blocking and timing are locked before any paid generation.
  - Prompt pattern quoted: "Previz / Proxy only - grey-box blocking, no modeling, no rigging, no textures."
- Gotchas: video model inherits proxy stiffness unless the prompt asks for secondary motion; proxy dimensions must match the real asset (car roof height etc.).
- Relevance: a Blender camera previz can drive AI video for shots we do not want to fully render.

---

## B. Motion graphics in Blender (4)

### 4. Easy Motion Graphics Setup with Geometry Nodes
- URL: https://www.youtube.com/watch?v=evxRGwtqYrM
- Channel: Bouncing Rays · 18:45 · 116k views · 2023-09-13 [G+T]
- Base instance: cube scaled into a rounded rectangle, vertical edges beveled (Clamp Overlap, 15 segments), merge by distance, top/bottom beveled 10 segments, Shade Auto Smooth.
- Node tree (GN on a plane, Group Input deleted):
  - `Grid` (Size 1 x 1 m, Vertices 10 x 10) -> `Transform Geometry` (Translation 0,0,0.5; Rotation Y 90 deg) -> `Mesh to Points` (Faces)
  - same transformed grid -> `Transform Geometry` (Translation 0.05,0,0) -> `Mesh to Points` (Vertices) -> brick stagger
  - both -> `Join Geometry` -> `Instance on Points.Points`; `Object Info(rectangle_round, Original)` -> `.Instance`; Scale 0.11
  - Animation A (noise): `Noise Texture` 4D, W = `#frame/50`, Scale 2.5, Detail 2, Roughness 0.5 -> `Color Ramp` (stops pushed together for contrast) -> `Map Range` 0..1 -> 0..180 -> `Math To Radians` -> `Combine XYZ.Z` -> `Rotate Instances.Rotation`
  - Animation B (effector): text/mesh `Object Info (Relative)` -> `Geometry Proximity` (Faces) -> inverted `Color Ramp` -> same Map Range chain
  - -> `Set Material` -> Group Output
- Shading: `Object Info.Random` -> `ColorRamp (Constant, 5 palette stops, Distribute Evenly)` -> Base Color, Roughness 0.3. Works only while geometry stays instances (do not Realize).
- Camera: 85 mm front-on for graphic layouts.
- Gotchas: rotation sockets are radians (feeding 180 makes chaos); `#frame` in a field creates a driver automatically; stagger offset must be half the instance width.

### 5. You Should be Using Proximity in Your Animations
- URL: https://www.youtube.com/watch?v=XytiZObyYAA
- Channel: Ducky 3D · 22:38 · 210k views · 2024-08-22 [G]
- Basic: `Grid` 5 x 5 m, 20 x 20 verts -> `Set Position`; Empty -> `Object Info.Location` -> `Mesh Line` (Count 1, Start Location) -> `Geometry Proximity` (Points) -> `Map Range` (From 0..1.7 -> To -0.9..1.0) -> `Combine XYZ.Z` -> `Set Position.Offset`. Parent a small sphere to the empty as the visible effector.
- Full loop scene: `Grid` 10 x 10 m, 10 x 10 verts -> `Mesh to Points (Faces)` -> `Instance on Points` (beveled cube, Bevel 0.02 m, 2-3 segments, instance scale 0.9) -> `Store Named Attribute` (Instance, Float, name "Blue", value = proximity distance) -> `Set Position` (Map Range 0..2 -> -0.1..0.1 on Z) -> two `Transform Geometry` copies at X +/-10 m -> `Join Geometry` -> `Set Material`.
- Loop: Empty X 5 m at frame 0 to -5 m at frame 120, **Linear** interpolation; sphere rotation Y 0 to -720 deg; orthographic camera (scale about 11.58) parented to the empty so the tiled grid scrolls forever.
- Shading: `Attribute (Instance, "Blue")` -> `Map Range` -> `Mix Shader` between white and blue Principled (both Roughness 0.5). Effector sphere: Transmission 1, Roughness 0.04, Subsurface 1, `Solidify` 0.02 m offset -1.
- Light: HDRI strength 1 + Area light 1500 W, Disk, Spread 0.9, parented to the empty. Cycles 200 samples, denoise.
- Gotchas: frame 0 and last frame must match for loops; Target Element must be Points; attribute names must match exactly between GN and shader.
- Verified in code: `mglib.gn_proximity_grid()` (test t5), with the attribute read back via `ShaderNodeAttribute(attribute_type='INSTANCER', name='prox')`.

### 6. Actually animate with geometry nodes in Blender
- URL: https://www.youtube.com/watch?v=rGmMCpmL5vs
- Channel: harry blends · 19:41 · 36k views · 2025-05-30 [G+T]
- Principle: no keyframes, everything from `Scene Time.Frame`. Phase = `(Frame + Index * 0.63) / 30`, wrapped with `Math WRAP(min 0, max = cycle length incl. pause, e.g. 1.5 or 3.0)`.
- Group "bottom align": `Bounding Box.Min` * (0,0,-1) -> `Set Position.Offset` (pivot to ground).
- Group "squishy bounce":
  - position: wrap -> `Float Curve` (0,0) vector, (0.5,1) auto-clamped, (0.72,0) vector, **Extend Horizontal** -> scales the up vector * Height -> `Set Position.Offset`
  - squash: wrap -> `Float Curve` points (0.12,-0.3) (0.29,0.6) (0.54,0) (0.73,0.22) (0.80,-0.3) (0.91,0.05), clip Y -1..1 -> `Map Range` -1..1 -> 0.2..1.8 = Sz; `1/Sz` -> X and Y (volume preserve) -> `Scale Instances`
  - `Align Rotation to Vector (Z, normal)` -> `Rotate Instances`
- Scatter: `Distribute Points on Faces` (Poisson, Distance Min 0.1, Density Max 10) on a 6x scaled Suzanne, instance UV spheres r 0.1.
- Gotchas: Float Curve default extrapolates beyond x=1 (use Extend Horizontal); vector handles at impacts, auto-clamped at apex; Realize Instances only if later modifiers must touch the instances.
- Relevance: the same phase/wrap/float-curve pattern gives deterministic staggered mograph (coins popping, bars growing) that renders identically on any frame, which headless batch rendering likes.

### 7. Create A Modern Kinetic Typography Animation In Blender
- URL: https://www.youtube.com/watch?v=idLU6wnBFmU
- Channel: Ducky 3D · 11:37 · 136k views · 2020-08-21 (old but still the canonical 3D type twist) [G+T]
- Text: align center, Extrude 0.1, Bevel Depth 0.007, Bevel Resolution 4, rotate X 90, **convert to mesh, Remesh (Sharp, Octree 9, Remove Disconnected off, smooth shade)** before deforming.
- Rectangular prism carrying the word on 4 faces (back face text rotated 180 deg so it reads upright after a 360 roll), cube subdivided 35 cuts, Bevel modifier (Angle, 4 segments, 0.02).
- One `Lattice` (U 48, V 12, W 12) with `Simple Deform Twist` (axis X, 180 deg); every mesh gets a Lattice modifier -> whole block twists as one.
- Controller empty rotates X 0 -> 360 deg, keys at frame 1 and **241** with a 240-frame timeline (no duplicate frame), Linear.
- Look: glossy black box (0.005 grey, rough 0.05) + glossy white text, cyclorama, top area light 500 W size 5, rim area light 800 W, world grey 0.3. EEVEE.
- Gotchas: never deform raw converted text (n-gon caps tear); loop end key goes one frame past the range.

---

## C. Glass / emissive / product look (3)

### 8. Realistic Eevee Glass Shader for Blender 4.2
- URL: https://www.youtube.com/watch?v=tHfAxAiT1zs
- Channel: Ryan King Art · 8:50 · 106k views · 2024-07-19 [G]
- Principled: Base white, Roughness 0, Transmission Weight 1, IOR 1.5.
- Render > **Raytracing on**. Material > Settings: Render Method **Dithered -> Raytraced Transmission** (in 5.x API: `use_raytrace_refraction=True`), Thickness **Sphere -> Slab** (per material), **Transparent Shadows** on.
- `Solidify` 0.01 m, Even Thickness, offset -1 so thin shells read as glass.
- Fresnel trick: `Fresnel (IOR 1.12)` -> `ColorRamp` (black stop raised to V 0.8) -> `Mix Shader` (Transparent BSDF top, Principled bottom): clearer center, reflective edges.
- Sun angle 15.1 deg for soft shadows, samples 500 (viewport + render, jittered shadows), HDRI strength 0.3.
- Bonus check, "Realistic EEVEE GLASS Material Blender 5.2" (Faebe Tutorials, https://www.youtube.com/watch?v=08Lln_NKljc) [T]: same recipe in 5.2 with IOR 1.45 and raytracing resolution 1:1, plus the new **Thin Wall** toggle on Principled for zero-thickness planes (windows); keep it off for solid objects. Slab vs Sphere thickness is per object (Sphere looked better on Suzanne).

### 9. Turn ANY 2D Logo into Iridescent Glass in Blender
- URL: https://www.youtube.com/watch?v=f17f298Zf-0
- Channel: SouthernShotty · 10:22 · 64k views · 2025-05-15 [G+T]
- Logo: raster -> Inkscape Trace Bitmap (Brightness cutoff ~0.45) -> Plain SVG. Import SVG, scale 10, apply, join, center. Curve: Extrude 0.02, Bevel Depth 0.0025, Bevel Resolution 4. Dissolve doubled verts at tight corners if artifacts.
- "Iridescent" here is **RGB dispersion**, not thin film: three Principled glass BSDFs with pure R, G, B base colors, Roughness 0, Transmission 1, IOR = base + 0.00 / +0.05 / +0.10, summed with two `Add Shader`s. Optional grunge image -> Bump (Strength 0.015) + roughness on all three. (Confirmed in transcript: "we need to add them back together ... add shader".)
- World: colorful environment, Background strength 2-3, rotate via Mapping Z until highlights land on bevels; Film Transparent on. Cycles. AgX/Filmic High Contrast.
- Compositor: Glare Bloom (High, threshold 0.8) -> Glare Streaks (4 streaks, fade 0.85, threshold 0.5) -> Lens Distortion (**Projector on, Dispersion 0.15**) -> Alpha Over onto black.
- Verified in code: `mglib.mat_dispersion_glass()` (test t4), Cycles only for visible fringes.

### 10. How You Can Improve Emission Materials in Blender
- URL: https://www.youtube.com/watch?v=Z3uCdffFq4E
- Channel: Ducky 3D · 7:04 · 199k views · 2021-11-23 [G] (transcript blocked by 429)
- Core idea: flat emission kills 3D form. Drive emission with a gradient:
  - Neon tube: Principled Roughness 0, Transmission 1; `Layer Weight.Facing` -> `ColorRamp` (B-Spline, pos 0 bright #83D8FF or white, pos 1 black) -> Emission Color, Strength 10-20.
  - Logo/text center glow: `Texture Coordinate.Object` -> `Mapping` (scale 0.4-0.5) -> `Gradient Texture (Spherical)` -> `ColorRamp` (B-Spline, white/cyan to dark blue) -> Emission Strength 5-10.
  - Orb: `Layer Weight.Facing` (Blend 0.5) -> `ColorRamp` (#FFF1A8 to white) -> Emission 3-5.
- Gotchas: always B-Spline ramps on smooth surfaces (banding); invert the ramp so the camera-facing center stays bright.
- Bonus 5.0 check, "How to Enable BLOOM in Blender 5.0" (SuperSimply9, https://www.youtube.com/watch?v=rZGnAoRqxVE) [T]: bloom is no longer a render setting; Compositing > New (creates a node group with Render Layers + Group Output) > add **Glare**, set type Streaks -> **Bloom**; viewport needs Shading > Compositor: Always/Camera. Works in EEVEE and Cycles.
- Verified in code: `mglib.mat_emission(facing_falloff=True)` and `mglib.mat_glow_glass()` (tests t1, t3).

---

## D. Camera, logo reveal, compositing (2)

### 11. Cinematic Logo Reveal Animation Blender Tutorial
- URL: https://www.youtube.com/watch?v=S5fzOc0yBJI
- Channel: Ducky 3D · 18:23 · 93k views · 2022-05-24 [G+T]
- Two copies of the SVG: **outline** curve (Fill None, Bevel Depth 0.0005) for a glowing edge, **body** (Fill Both, Extrude 0.003) converted to mesh + Remesh Sharp octree 8.
- Reveal = procedural wipe in the shader, not geometry: `Texture Coordinate.Object` -> `Noise` -> `Mapping` -> `Gradient (Linear)` -> `ColorRamp` -> Mix Shader (Transparent / metallic Principled, Metallic 1, base 0.2, rough 0.2) and also -> `Displacement` (Midlevel 0, Scale 0.002). Animate **Mapping Location X from -1.5 (frame 0) to 0.8 (frame 120)**, Bezier, hold to 140.
- Edge: `Noise (Scale 20)` -> `ColorRamp` (black at 0, orange (1,0.15,0) at 0.8) -> Emission, Strength 80 on the outline curve.
- Background: plane at Z -2, `Voronoi (Manhattan, scale 10)` -> Bump; dark metallic 0.8 rough 0.4.
- Lights: top disk area 1.5 m 450-800 W, rim disk 0.8 m 1000 W at 45 deg behind, cyan point 500 W between logo and wall.
- Compositor: Glare **Fog Glow**, Medium, threshold 0.8, Mix -0.4 (in 5.x use Strength instead of Mix). Cycles 300 samples, GPU.
- Gotchas: use Object texture coordinates (Generated/UV swim when displacing); Remesh octree above 8 explodes poly count.

### 12. How to Make Smooth Camera Animations in Blender
- URL: https://www.youtube.com/watch?v=dFK3C83k4Wo
- Channel: Blender To Browser · 11:53 · 21k views · 2026-04-06 [T]
- Infinite backdrop (plane, extrude back edge, bevel, oversized). Camera 90 mm in front of the product.
- **Camera parented to an empty**; rotate the empty for orbit moves, never the camera directly. One empty + camera per shot, each in its own collection ("shot one", "shot two").
- Write the numbers down and reuse them for consistency: transition rotation 40 deg, transition duration 20 frames, transition starts after 40 frames of hold, shot length 50 frames.
- Entry: dolly in over ~40-50 frames. Exit: Z rotation +40 deg over 20 frames. Next shot enters with -40 deg so motion continues across the cut. Keep a slow drift (+10 deg) during the hold so nothing stops.
- **Cut on the fastest frame** (middle of the transition) with camera markers (Ctrl+B binds camera to marker).
- Graph editor: lock other axes, Normalize, scale the Bezier handles in X to sharpen the ease; remove the velocity bump after the transition by rotating the middle handles. Copy easing between shots (Relative Ease add-on).
- Lights: two area lights left/right, the fill light-linked to the model only so it does not add shadows.
- Relevance: this is the Relate cut grammar (motion-matched whip cuts between short shots). In code: `scene.timeline_markers.new('S2', frame=50).camera = cam2`.

---

## Cross-tutorial takeaways
1. Bloom lives in the compositor now (Glare node, socket inputs). Put Glare first, Lens Distortion dispersion second, vignette last.
2. Emission must have a gradient (Layer Weight Facing / Fresnel / spherical gradient), never flat.
3. Glass in EEVEE needs scene raytracing + per-material raytraced transmission + Slab/Sphere thickness, plus something to reflect (HDRI, light cards and, for off-screen cards, a Light Probe Sphere). Real thick tinted glass with an inner glowing core needs Cycles.
4. Mograph = instances + fields + Scene Time math; deterministic per frame, ideal for headless rendering.
5. Loops: first key == last key, linear, last key one frame past range or a Cycles F-modifier.
6. Camera: animate an aim empty + camera position separately; cut on the fastest frame; keep drift through holds.
7. AI agents: strong at writing bpy/GN code and parameterized setups, weak at visual spatial judgment; verify with renders and numbers.

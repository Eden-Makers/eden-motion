# Text standing in a live-action scene (2D type in 3D space)

A line of flat type that sits ON a wall, a desk or a keyboard in a live-action plate, moves with the
camera and goes behind the actor's hand. Worked on a launch film for a dictation app (a sentence across
the whole wall behind the actor, "HOLD FN." on a laptop deck). Tools: `tools/scenetext/`.

## When to do it, when not
- Only text that BELONGS to the scene (a label on a surface). Text that has to be READ like a title is
  not tracked: centred, white, flat, in the Eden Motion composition. A tracked title that drifts or
  wobbles was rejected twice.
- Type is flat 2D, no shadow, no extrusion, no glass look. It sits in front of blurred foreground
  objects, never behind them.
- Big type over footage may use a wide face (Eurostile Extended Black on that film, the UI stays in
  the app's face); set `KTEXT_FONT`, and `KTEXT_SCALE` (about 0.66 for a wide cut) so lines fit.

## Pipeline
1. **Clean plates:** the plate has no text and no grain, at the final frame rate and speed ramp
   (`tools/ramp.py`), as `%04d.png`.
2. **Track.** Pick the method by the shot:
   - flat patch, camera mostly translating (a laptop deck, a table front): `track2d.py` (KLT forward and
     backward + RANSAC similarity), then `smooth.py corners`;
   - real camera move through depth (a wall behind an actor): `depth.py` (DepthPro, metric) then
     `track3d.py` (features lifted with ONE depth map, `solvePnPRansac` per frame). Features only on
     static things, off skin and off depth edges; read the printed inliers (over ~25) and error (under ~2 px).
   - telephoto (compressed depth): depth is too flat to occlude, use `occlude: "wall"` (a luma and
     chroma key on a bright wall) in `comp.py`.
   - an automatic track that drifts: key the 2D track by hand on a few frames and let the smoothing
     fill between them. A hand-keyed track beat the automatic one on a swimming "HOLD FN.".
3. **Smooth in shot time** (`smooth.py`): local quadratic regression over the SHOT's own time (the `tau`
   list from `ramp.py retime.json`), not film time, so a speed ramp does not change how much real motion
   is smoothed. On that film the corner acceleration fell from 64 to 9.5 px per frame^2 and the text
   stopped wobbling. The graph is the QC: read raw against smoothed, and look at the first and last
   frame of every move.
4. **Composite** (`comp.py CFG.py`): the plane is defined in the reference camera; occlusion by the
   per-frame depth map, or the wall key. `cfg_example.py` is the template, `ktext.py` renders the type
   per frame (glyph or word units, accent colour on the leading edge settling in 0.25 s, backspace).
5. **Look at it:** frames at full size at the start, the middle, the end, and every frame where a hand
   crosses the text. Hands, hair and sleeves leak first.

## Gotchas
- DepthPro focal jumps frame to frame: the median over the plate is used (or pass `--focal`).
- Depth is metric but per frame: `dscale` (from the PnP solve) rescales each frame's depth to the
  reference before it decides what is in front.
- Plane edges alias when the text is smaller than its canvas: `comp.py` uses area sampling when the
  canvas is bigger than the projected width; render the canvas at about 2x the projected size.
- One GPU job at a time (`tools/gpu_lock.sh`): DepthPro, Blender and Topaz do not share the GPU.

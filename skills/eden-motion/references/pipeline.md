# Pipeline internals

## Project folder
```
projects/<slug>/
  brief.json         company, url, duration, lang, theme, voice, structure, notes
  research/          site.json (search profile), capture/ (HyperFrames website capture), logo-candidates.png
  brand.json         name, tagline, one_liner, features[], proof[], colors{}, fonts{}, logo, mark, screenshots[], fontFiles[], theme
  assets/            logo.svg, mark.svg, ui-*.jpg, fonts/, gen/ (generated images)
  script.json        {title, voice_direction, music, lines:[{beat, text, scene, tone, visual}]}
  audio/             vo.mp3, music.mp3, mix.wav, cues.json, mix.graph.txt
  vo.json            {words:[{word,start,end}], lines:[{i,start,end}], duration}
  storyboard.json    {theme, duration, vo:{words}, scenes:[{id,type,start,duration,tone,transition,camera,props,vo}]}
  custom-scenes/     optional project-only scene modules
  comp/              built HyperFrames project (draft, slow=1)
  comp-final/        built with EM_SLOW for motion blur
  renders/           draft.mp4, final.mp4, qc.json, contact-sheet.jpg
  prompts.log.jsonl  every image prompt + model + file
```

## storyboard.json scene
```json
{ "id": "s4", "type": "ui-window", "start": 10.72, "duration": 3.4, "tone": "light",
  "transition": { "type": "zoom-through", "duration": 0.6 }, "camera": "push",
  "props": { "screenshot": "assets/ui-1.jpg", "focus": "top", "callout": "Auto triage" } }
```
- `start/duration` in seconds; scenes are contiguous. Transitions overlap half their duration on each side.
- `tone`: light | dark | cream | black (scene world) or omit to show the persistent film background.
- `camera`: omit (auto drift), "push", "pull", "static".
- theme (film level): saas-light | saas-dark | glow | cinematic.
- Top-level optional: `fonts: {display, body}` to override brand fonts, `brandBackground: true` to use brand bg/fg.

## Rendering and motion blur
- `render --draft`: HyperFrames capture at 30 fps, no blur (~1.5 min for 60 s).
- `render` (final, default = **adaptive supersampling**): the engine marks fast windows (every non-cut
  transition +-0.1 s, plus anything a scene pushes to `EM.fastWindows`), snaps them to the frame grid and
  builds a piecewise time map: fast windows stretched x16 (32 sub-frames per output frame), calm stretches
  x0.5 (1 sub-frame). The map is exported as `#em-timemap`; render reads it with headless Chrome, sets the
  capture duration, captures at 60 fps, and ffmpeg processes each segment separately (`trim` -> `tmix` of 16
  sub-frames = 180 deg shutter -> `select`) and concatenates. Real, smooth film-camera smear exactly where
  things move fast; ~7 min for a 56 s film on a 10-core Mac.
- `render --uniform --slow 4`: every second stretched x4 (8 sub-frames). Used automatically when the film
  contains video clips (their playback rate must be constant). Steppier on very fast moves.
- `--hi 8` halves the fast-window cost (16 sub-frames) if time is short.
- Audio is never rendered by the browser: `audio/mix.wav` is muxed by ffmpeg.

## Encoding (hardware on a Mac, libx264 elsewhere)
- Every H.264 encode goes through `src/lib/encode.mjs` (Node) or `tools/hwenc.py` (Python tools;
  `blender/lib/mglib.py` and `tools/assemble.sh` carry the same rule inline). On a Mac with
  `h264_videotoolbox` in `ffmpeg -encoders` it encodes on the Apple media engine, with the CRF mapped to
  `-q:v` (`q = 75 - 2.5 * (crf - 18)`, clamped 40..95: crf 16 -> 80, 18 -> 75, 20 -> 70) and `-g 250`
  (ffmpeg's VideoToolbox default is a 12-frame GOP: 40 I-frames on 20 s instead of 2, 13% bigger at the
  same VMAF; a call that needs another GOP adds its own `-g` after the helper args). Same VMAF as
  libx264, 3-9x faster. Linux, Windows or ffmpeg without VideoToolbox: libx264 with the original CRF
  and preset. A failed hardware encode retries once in libx264 (not for encoders fed by a pipe:
  `retime.py`, `lensfx.py`; rerun those with `VIDEO_HW_ENCODE=0`).
- `VIDEO_HW_ENCODE=0` forces libx264 everywhere (debugging, bit-exact comparisons, dither work).
- `render` on a Mac: HyperFrames gets `--gpu` (it probes the encoder and falls back by itself), the
  motion-blurred intermediate is ProRes 422 HQ (`renders/video-mb.mov`, `prores_videotoolbox`) and the
  final MP4 is encoded once. `--workers` stays HyperFrames' `auto` unless you pass it.
- Stays libx264 on purpose: all-intra reference cuts (`ref`, `-g 1`) and the frame-coded clip in
  `tools/synccheck.mjs` (exact seeks, reproducible), capped `lensfx.py` masters and phone previews
  (kept for x264's VBV; `h264_videotoolbox` also honours `-b:v`/`-maxrate` if this is ever moved), `--codec hevc10` (libx265 main10 two-pass), alpha plates (VP9 `yuva420p`
  in `blender`, ProRes 4444).
- Many encodes at once: the media engine runs about 2-4 sessions, so batch 2-3 in parallel, not 12.

## 60 fps and shutter samples for custom clips
- `storyboard.fps: 60` renders as it does at 30: the capture runs at 2x the output rate (120 fps), the
  adaptive supersampling and the 180 degree shutter follow (`render` on a 3 s test at 1080p60: 180 frames,
  11 s). 60 fps is the standard for a launch film; 24 or 30 fps only for a deliberate film look.
- `finish`: the render adds vignette and temporal grain by default (`storyboard.finish`). A film that goes
  through `tools/lensfx.py` gets its grain and vignette there, once, on the whole film: set
  `"finish": false` or you get the grain twice.
- A custom twin scene rendered outside the Eden Motion engine (its own page, screenshots per frame) needs
  its shutter too. What worked on a 60 fps launch film: per output frame `f` at `t = f / fps`, the page
  returns the number of sub-samples `n = window.__mb(t)` from the camera speed (3 on calm stretches, 6-12
  in fast moves and transitions, from a table of windows), the renderer seeks the paused timeline to
  `t + ((k + 0.5) / n - 0.5) * shutter` for k = 0..n-1 with `shutter = 0.5 / fps` (180 degrees), takes a
  screenshot of each and averages them (float, then quantise). n = 1 in a draft. Every frame must be a pure
  function of t, or the samples will not agree. The plate under graphics is NOT blurred this way: live
  action already carries its own blur.
- 4K: lay the page out at 1920x1080 and render with device scale 2 (text stays vector and sharp, a macro
  zoom of 6-10x holds); live-action plates come from `tools/upscale.py`.

## Sound cues
Scenes call `fx.cursorClick` / `fx.pop`, transitions push whooshes; the engine exports them as JSON into
the DOM (`#em-cues`). The audio step loads the composition in headless Chrome, reads the cues and places
SFX from `sfx-library/` (Pixabay licence) at those exact times, adds riser + impact into the logo reveal,
ducks music under VO with a sidechain compressor and normalises to -14 LUFS.

## Troubleshooting
| symptom | fix |
|---|---|
| Scenes blank in render, `Timeline did not advance` | a scene threw during build: open `comp/index.html` in a browser and read the console. |
| Logo black on dark scene | brand.json `logoMono: true` flips it; otherwise pick another logo or use tone light for the end card. |
| Font falls back | brand font not captured and not on Google Fonts: set `brand.fonts.display_google`. |
| VO words not synced | text in headline/kinetic-type must contain the VO words of that line. |
| Render slow | `--slow 4`, fewer blurred elements, or draft only while iterating. |
| Hidden browser pane stalls | engine boot is synchronous on purpose; never await fonts or timers in scenes. |

## Gotchas learned on the Hlas promo (2026-09-26)
| symptom | cause and fix |
|---|---|
| A video keeps showing over the next scene | HyperFrames owns `<video>` visibility for its whole declared window and overrides the scene's `visibility:hidden`. End the video window exactly at the shot end plus half the outgoing transition, never later. Parent `opacity` still hides it (opacity is inherited multiplicatively). |
| A short AI clip turns black at the end of its shot | the source ran out (Veo clips are 4 s). Pad every clip with 1.5 s of frozen last frame: `ffmpeg -vf tpad=stop_mode=clone:stop_duration=1.5`. |
| 4K render aborts "Disk capture may need ~40 GB" | multi-worker screenshot capture writes every frame to disk. The render step sets `HF_CAPTURE_PARALLEL_STREAM=true` to stream frames into the encoder. |
| Music stops after the last speech line | a sidechain key stream that ends early ends the compressor output. `apad=whole_dur=<D>` the key. |
| Envelope arrays full of `null` | fractional hop (8000/60) indexing floats. Use integer sample boundaries per bin. |
| Final render at 60 fps | `render --fps 60 --resolution 4k --uniform --slow 6` = 6 sub-frames per frame, 180 deg shutter (K=3). Films with video clips must use uniform (constant playback rate). |
| A speaker clip freezes for the last second of its shot | the tpad pad is a frozen frame, not footage: when the spoken line sits late in the clip, `mediaStart + shot` runs into the pad. Clamp `mediaStart <= realDuration - shot - 0.05` and let the words start later in the shot. QC: per-frame `tblend=difference` energy, any 0.5 s window near 0.00 inside a video scene is a freeze. |
| The next shot's video flashes 0.3 s before a hard cut, or a clip runs ahead of its audio | a video window that starts before its scene (a lead for transitions) is drawn over the previous shot, because HyperFrames shows video for its whole window. On hard cuts start the window exactly on the cut; with a transition keep lead <= mediaStart, or `data-media-start` clamps to 0 and the clip runs ahead by the difference. QC: frame-difference pops 3x their neighbours must sit only on intended cuts. |
| Speakers drift out of lip sync in the final render only (draft is fine) | HyperFrames clamps `<video>` playbackRate to >= 0.1 and time stretching plays video at 1/slow, so `--slow 12` runs every clip 1.2x fast (+12 frames per second). The render step now caps slow at 10 for films with video. Verify with `node tools/synccheck.mjs` (frame-coded clip, decodes every rendered frame, prints drift). Re-encode clips all-intra (`-g 1`) so seeks are exact. |
| An element with `transform-style: preserve-3d` shows both faces or goes flat when faded | opacity or filter on a preserve-3d element flattens it. Fade or blur a wrapper instead. |
| A fix looks like it did nothing in a preview or sheet | the image was read back from cache. Write each sheet or still to a new filename. |
| Frame 0 is empty because everything pops in | open mid-action: the first frame must already show the hook. `critique` flags a black still opening. |
| Videos look frozen or stutter in the render (fine in the browser) | HyperFrames pre-extracts video frames only for `<video>` present in the STATIC html. Scenes must create videos via `EM.video(attrs, cls)`; the build boots the page once, reads the `#em-media` manifest and writes those elements statically (`#em-static-media`), scenes then reuse them by id. Check the render log: `extraction.videoCount` must be > 0. |

## Gotchas learned on a TV launcher product film (2026-11-01)
| symptom | cause and fix |
|---|---|
| Camera aims above the subject in a UI scene | boxes were measured after a tween with `immediateRender` had already scaled the stage. Measure every element at rest, before building any tween. |
| Tilted UI text jagged even at 3840 px | Chrome rasterizes CSS 3D layers at low resolution. z moves as 2D scale about the vanishing point; real perspective in Blender from flat 8K plates (`references/product-ui-film.md`). |
| First frame of a heavy UI scene renders black | capture worker warm-up race; render that composition with `--workers 1`. |
| A zero renders slashed | `tabular-nums` selects the font's `zero.tf`; use a fixed-width box per digit instead. |
| 4K encode at 140+ Mb/s | per-pixel grain. Fine grain is sized relative to 1080p (`--grain-px`), and the master is delivered as H.265 main10 at 160 Mbit/s (`tools/lensfx.py --codec hevc10`). A `maxrate` cap on the master (16 / 60 Mbit/s) showed in the grain and the gradients: caps only on phone previews. |
| Retimed device capture hitches | the recorder skipped beats; slow the app clock 6-10x while recording and fill repeats with optical-flow midframes (`tools/retime.py`), never a crossfade. |
| A loop over `$NAMES` runs once | zsh does not word-split; run shell loops with `bash -c`. |
| A contact sheet seems to show a clipped element | the sheet's label box covers the frame corner; label in a strip above each tile, check the raw frame. |

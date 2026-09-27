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
| Speakers drift out of lip sync in the final render only (draft is fine) | HyperFrames clamps `<video>` playbackRate to >= 0.1 and time stretching plays video at 1/slow, so `--slow 12` runs every clip 1.2x fast (+12 frames per second). The render step now caps slow at 10 for films with video. Verify with `node tools/synccheck.mjs` (frame-coded clip, decodes every rendered frame, prints drift). Re-encode clips all-intra (`-g 1`) so seeks are exact. |
| Videos look frozen or stutter in the render (fine in the browser) | HyperFrames pre-extracts video frames only for `<video>` present in the STATIC html. Scenes must create videos via `EM.video(attrs, cls)`; the build boots the page once, reads the `#em-media` manifest and writes those elements statically (`#em-static-media`), scenes then reuse them by id. Check the render log: `extraction.videoCount` must be > 0. |

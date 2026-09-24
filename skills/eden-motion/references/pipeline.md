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
- `render --draft`: HyperFrames capture at 30 fps, no blur (~1-2 min for 60 s).
- `render` (final): the composition is built with `window.EM_SLOW = S` (default 8) so a real second spans S
  seconds of timeline; HyperFrames captures that at 60 fps = 2S sub-frames per output frame; ffmpeg `tmix`
  averages S of them (180 deg shutter) centred on each output frame and keeps every 2S-th. Result: true
  film-camera motion blur on every moving pixel. Cost ~S x draft. `--slow 4` halves the time with slightly
  steppier blur on extreme moves.
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

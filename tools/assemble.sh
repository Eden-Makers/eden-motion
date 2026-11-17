#!/bin/bash
# usage: assemble.sh OUT.mp4 name:frames [name:frames ...]      (run inside the folder that holds the clips)
# Joins clips at EXACT frame counts. Each clip is name.mp4 in the current folder (or $CLIPDIR); its
# last frame is held (tpad) when it is short and trimmed when it is long, so every clip is exactly
# the planned number of frames and the cuts land where the storyboard says. Frames are planned as
# ceil(seconds * fps); render every clip 2 s longer than the cut, then trim here.
#   FPS=60 SIZE=1920:1080 CRF=10 PRESET=medium CLIPDIR=clips
# Output: H.264 (VideoToolbox on a Mac), yuv420p, bt709, no audio (lensfx.py and the mix come after). Prints the frame
# count of the result and fails when it differs from the sum of the plan.
set -e
OUT="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; shift
cd "${CLIPDIR:-.}"
FPS="${FPS:-60}"; ARGS=(); FC=""; CAT=""; SUM=0; i=0
for spec in "$@"; do
  name="${spec%%:*}"; want="${spec##*:}"
  [ -f "$name.mp4" ] || { echo "missing $name.mp4" >&2; exit 1; }
  ARGS+=(-i "$name.mp4")
  FC+="[$i:v]fps=$FPS,scale=${SIZE:-1920:1080},format=yuv420p,setsar=1,tpad=stop_mode=clone:stop=$((FPS * 2)),trim=end_frame=$want,setpts=PTS-STARTPTS[v$i];"
  CAT+="[v$i]"; SUM=$((SUM + want)); i=$((i + 1))
done
FC+="${CAT}concat=n=$i:v=1:a=0[o]"
FCF="$(mktemp -t em-assemble).txt"; echo "$FC" > "$FCF"
# Encoder: Apple media engine (h264_videotoolbox) on a Mac, libx264 elsewhere or with VIDEO_HW_ENCODE=0.
# CRF maps to -q:v as in src/lib/encode.mjs (crf 10 -> q 95). A failed hardware encode retries in libx264.
CRF="${CRF:-10}"; PRESET="${PRESET:-medium}"
SW=(-c:v libx264 -crf "$CRF" -preset "$PRESET" -pix_fmt yuv420p)
ENC=("${SW[@]}")
if [ "$(uname)" = Darwin ] && [ "${VIDEO_HW_ENCODE:-1}" != 0 ] && ffmpeg -hide_banner -encoders 2>/dev/null | grep h264_videotoolbox >/dev/null; then
  Q=$(( 75 - (CRF - 18) * 5 / 2 )); [ $Q -gt 95 ] && Q=95; [ $Q -lt 40 ] && Q=40
  ENC=(-c:v h264_videotoolbox -q:v "$Q" -g 250 -pix_fmt yuv420p)  # VT default GOP is 12 frames
fi
TAGS=(-colorspace bt709 -color_primaries bt709 -color_trc bt709 -r "$FPS")
ffmpeg -v error -y "${ARGS[@]}" -/filter_complex "$FCF" -map "[o]" "${ENC[@]}" "${TAGS[@]}" "$OUT" \
  || { [ "${ENC[1]}" = h264_videotoolbox ] && echo "VideoToolbox failed, retrying with libx264" >&2 \
       && ffmpeg -v error -y "${ARGS[@]}" -/filter_complex "$FCF" -map "[o]" "${SW[@]}" "${TAGS[@]}" "$OUT"; }
rm -f "$FCF"
GOT="$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 "$OUT")"
echo "$GOT frames (planned $SUM) -> $OUT"
[ "$GOT" = "$SUM" ] || { echo "frame count differs from the plan" >&2; exit 2; }

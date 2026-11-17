"""Video encoder choice for the Python tools (same rules as src/lib/encode.mjs).

On a Mac, H.264 goes through the Apple media engine (VideoToolbox): several times faster than
libx264 at the same VMAF (crf 18 ~ q 75). Elsewhere (Linux, Windows, ffmpeg without VT) it stays
libx264 with the original CRF and preset. VIDEO_HW_ENCODE=0 forces libx264.
Keep libx264 by hand for bit-exact, all-intra, lossless, 4:4:4 or maxrate-capped output.

    from hwenc import h264_args, run_ffmpeg
    run_ffmpeg(["ffmpeg", "-y", "-i", src] + h264_args(16, "slow") + [out])
"""
import functools
import os
import subprocess
import sys


@functools.lru_cache(maxsize=None)
def has_videotoolbox(ffmpeg: str = "ffmpeg") -> bool:
    if sys.platform != "darwin" or os.environ.get("VIDEO_HW_ENCODE", "1") == "0":
        return False
    try:
        out = subprocess.run([ffmpeg, "-hide_banner", "-encoders"], capture_output=True, text=True, timeout=10).stdout
    except Exception:
        return False
    return "h264_videotoolbox" in out


def crf_to_q(crf: int) -> int:
    """libx264 CRF -> VideoToolbox -q:v (16 -> 80, 18 -> 75, 20 -> 70, 23 -> 62), clamped 40..95."""
    return max(40, min(95, round(75 - 2.5 * (crf - 18))))


def h264_args(crf: int = 18, preset: str = "medium", ffmpeg: str = "ffmpeg") -> list:
    """H.264 encoder args (includes -pix_fmt yuv420p): media engine on a Mac, libx264 elsewhere."""
    if has_videotoolbox(ffmpeg):
        return ["-c:v", "h264_videotoolbox", "-q:v", str(crf_to_q(crf)), "-pix_fmt", "yuv420p"]
    return ["-c:v", "libx264", "-preset", preset, "-crf", str(crf), "-pix_fmt", "yuv420p"]


def software_fallback(cmd: list) -> list:
    """The same command with h264_videotoolbox swapped for libx264 at the matching CRF."""
    if "h264_videotoolbox" not in cmd:
        return list(cmd)
    i = cmd.index("h264_videotoolbox")
    has_q = i + 2 < len(cmd) and cmd[i + 1] == "-q:v"
    crf = round(18 - (int(cmd[i + 2]) - 75) / 2.5) if has_q else 18
    return cmd[:i] + ["libx264", "-preset", "medium", "-crf", str(crf)] + cmd[i + (3 if has_q else 1):]


def run_ffmpeg(cmd: list) -> None:
    """Run ffmpeg; if a VideoToolbox encode fails, retry once with libx264. Raises on failure."""
    r = subprocess.run(cmd)
    if r.returncode != 0 and "h264_videotoolbox" in cmd:
        print("hwenc: VideoToolbox encode failed, retrying with libx264", file=sys.stderr)
        cmd = software_fallback(cmd)
        r = subprocess.run(cmd)
    if r.returncode != 0:
        raise subprocess.CalledProcessError(r.returncode, cmd)

"""Video encoder choice for the Python tools (same rules as src/lib/encode.mjs).

House standard: HEVC 10-bit, bitrate set by where the video goes, never a starved ~5 Mbps file.
  social   HEVC Main10 40 Mbps   previews, drafts, socials, 9:16 versions (default)
  deliver  HEVC Main10 160 Mbps  client delivery masters, and plates/intermediates that get re-encoded
  compat   H.264 High 40 Mbps    only where H.264 is required
On a Mac every profile encodes on the Apple media engine (VideoToolbox). Off a Mac and with
VIDEO_HW_ENCODE=0 it falls back to libx264 8-bit at the same bitrate.

    from hwenc import video_args, run_ffmpeg
    run_ffmpeg(["ffmpeg", "-y", "-i", src] + video_args("deliver") + [out])
"""
import functools
import os
import subprocess
import sys

VIDEO_PROFILES = {"social": ("hevc10", "40M"), "deliver": ("hevc10", "160M"), "compat": ("h264", "40M")}


@functools.lru_cache(maxsize=None)
def has_videotoolbox(ffmpeg: str = "ffmpeg") -> bool:
    if sys.platform != "darwin" or os.environ.get("VIDEO_HW_ENCODE", "1") == "0":
        return False
    try:
        out = subprocess.run([ffmpeg, "-hide_banner", "-encoders"], capture_output=True, text=True, timeout=10).stdout
    except Exception:
        return False
    return "hevc_videotoolbox" in out and "h264_videotoolbox" in out


def _software_args(bitrate: str, gop: int) -> list:
    buf = f"{int(bitrate.rstrip('M')) * 2}M"
    return ["-c:v", "libx264", "-preset", "medium", "-b:v", bitrate, "-maxrate", bitrate, "-bufsize", buf,
            "-g", str(gop), "-pix_fmt", "yuv420p"]


def video_args(profile: str = "social", gop: int = 250, bitrate: str = None, ffmpeg: str = "ffmpeg") -> list:
    """Encoder args for a profile (bitrate overrides the profile's). HEVC gets -tag:v hvc1."""
    codec, br = VIDEO_PROFILES[profile]
    br = bitrate or br
    if not has_videotoolbox(ffmpeg):
        return _software_args(br, gop)
    if codec == "hevc10":
        return ["-c:v", "hevc_videotoolbox", "-b:v", br, "-g", str(gop),
                "-profile:v", "main10", "-pix_fmt", "p010le", "-tag:v", "hvc1"]
    return ["-c:v", "h264_videotoolbox", "-b:v", br, "-g", str(gop), "-profile:v", "high", "-pix_fmt", "yuv420p"]


def to_software(cmd: list):
    """Same command with a VT video block (as built by video_args) swapped for libx264, or None."""
    for enc, n in (("hevc_videotoolbox", 12), ("h264_videotoolbox", 10)):
        if enc in cmd:
            i = cmd.index(enc)
            return cmd[:i - 1] + _software_args(cmd[i + 2], int(cmd[i + 4])) + cmd[i - 1 + n:]
    return None


def run_ffmpeg(cmd: list, **kw) -> subprocess.CompletedProcess:
    """subprocess.run(cmd, check=True); if a VT encode fails, retry once in software."""
    try:
        return subprocess.run(cmd, check=True, **kw)
    except subprocess.CalledProcessError:
        sw = to_software(cmd)
        if sw is None:
            raise
        print("[encode] VideoToolbox failed, retrying with libx264", file=sys.stderr)
        return subprocess.run(sw, check=True, **kw)

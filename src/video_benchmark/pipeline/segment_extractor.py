"""Extract video segments using FFmpeg."""

from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from video_benchmark.acceleration import AccelerationInfo
from video_benchmark.config import SegmentSpec


def extract_segment(
    video_path: str,
    segment: SegmentSpec,
    output_dir: Path,
    accel: AccelerationInfo,
    segment_index: int = 0,
) -> Path:
    """Extract a segment from a video file to a temporary mp4.

    Uses -ss before -i for fast seeking.
    """
    ffmpeg = accel.ffmpeg_path or "ffmpeg"
    duration = segment.end_sec - segment.start_sec
    output_file = output_dir / f"segment_{segment_index}.mp4"

    cmd = [
        ffmpeg,
        "-hide_banner",
        "-loglevel", "error",
        "-ss", str(segment.start_sec),
        *accel.hwaccel_args,
        "-i", video_path,
        "-t", str(duration),
        "-c:v", "copy",
        "-an",
        "-y",
        str(output_file),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(
            f"FFmpeg segment extraction failed for {video_path} "
            f"(segment {segment_index}): {result.stderr}"
        )
    return output_file


def extract_all_segments(
    video_path: str,
    segments: list[SegmentSpec],
    accel: AccelerationInfo,
    work_dir: Path | None = None,
) -> list[Path]:
    """Extract multiple segments from a video. Returns paths to segment files."""
    if work_dir is None:
        work_dir = Path(tempfile.mkdtemp(prefix="vb_segments_"))

    results: list[Path] = []
    for i, seg in enumerate(segments):
        try:
            out = extract_segment(video_path, seg, work_dir, accel, i)
            results.append(out)
        except RuntimeError:
            # Segment might be past end of video — skip it
            continue
    return results

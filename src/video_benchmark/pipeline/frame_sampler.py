"""Extract frames from video segments at a target FPS."""

from __future__ import annotations

import subprocess
from pathlib import Path

import cv2
import numpy as np

from video_benchmark.acceleration import AccelerationInfo


def extract_frames_ffmpeg(
    segment_path: Path,
    output_dir: Path,
    fps: int,
    accel: AccelerationInfo,
) -> list[Path]:
    """Use FFmpeg to extract frames at target FPS as JPEG images."""
    ffmpeg = accel.ffmpeg_path or "ffmpeg"
    pattern = str(output_dir / "frame_%05d.jpg")

    cmd = [
        ffmpeg,
        "-hide_banner",
        "-loglevel", "error",
        *accel.hwaccel_args,
        "-i", str(segment_path),
        "-vf", f"fps={fps}",
        "-q:v", "2",
        "-y",
        pattern,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f"Frame extraction failed: {result.stderr}")

    return sorted(output_dir.glob("frame_*.jpg"))


def extract_frames_cv2(segment_path: Path, fps: int = 1) -> list[np.ndarray]:
    """Extract frames using OpenCV. Returns list of BGR numpy arrays."""
    cap = cv2.VideoCapture(str(segment_path))
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {segment_path}")

    video_fps = cap.get(cv2.CAP_PROP_FPS)
    if video_fps <= 0:
        video_fps = 30.0
    frame_interval = max(1, int(video_fps / fps))

    frames: list[np.ndarray] = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_interval == 0:
            frames.append(frame)
        frame_idx += 1

    cap.release()
    return frames


def load_frame(path: Path) -> np.ndarray:
    """Load a single frame from disk as BGR numpy array."""
    frame = cv2.imread(str(path))
    if frame is None:
        raise RuntimeError(f"Failed to load frame: {path}")
    return frame

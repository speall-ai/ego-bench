"""Local filesystem video source."""

from __future__ import annotations

from pathlib import Path

from video_benchmark.sources.base import VideoFile, VideoSource


class LocalVideoSource(VideoSource):
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        if not self.root.is_dir():
            raise FileNotFoundError(f"Video directory not found: {self.root}")

    def list_videos(self) -> list[VideoFile]:
        videos: list[VideoFile] = []
        for mp4 in sorted(self.root.rglob("*.mp4")):
            operator_id = mp4.parent.name if mp4.parent != self.root else "unknown"
            videos.append(
                VideoFile(
                    operator_id=operator_id,
                    video_path=str(mp4),
                    filename=mp4.name,
                )
            )
        return videos

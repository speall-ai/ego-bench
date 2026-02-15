"""Abstract base class for video sources."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class VideoFile:
    operator_id: str
    video_path: str  # local path or presigned URL
    filename: str


class VideoSource(ABC):
    @abstractmethod
    def list_videos(self) -> list[VideoFile]:
        """Return all videos from this source."""
        ...

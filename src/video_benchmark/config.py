"""Configuration and settings for video-benchmark."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings


DEFAULT_WEIGHTS = {
    "brightness": 0.20,
    "sharpness": 0.20,
    "stability": 0.25,
    "hand_detection_rate": 0.25,
    "hand_landmark_quality": 0.10,
    "tracking_continuity": 0.10,
}

DEFAULT_WEIGHTS_V2 = {
    "image_quality": 0.20,
    "stability": 0.15,
    "hand_detection_rate": 0.20,
    "hand_landmark_quality": 0.05,
    "tracking_continuity": 0.05,
    "scene_validity": 0.10,
    "anomaly_score": 0.10,
    "blur_score": 0.05,
    "temporal_consistency": 0.05,
    "audio_quality": 0.05,
}

DEFAULT_SEGMENTS = [
    (2 * 60, 4 * 60),    # minutes 2-4
    (28 * 60, 30 * 60),   # minutes 28-30
    (30 * 60, 32 * 60),   # minutes 55-57 — fallback for shorter videos
    (55 * 60, 57 * 60),   # minutes 55-57
]

# Use first 3 segments by default; the 4th is a fallback
DEFAULT_SEGMENT_SPECS = [
    (2 * 60, 4 * 60),
    (28 * 60, 30 * 60),
    (55 * 60, 57 * 60),
]


class SegmentSpec(BaseModel):
    start_sec: int
    end_sec: int


class ScoringWeights(BaseModel):
    """V1 scoring weights — classical CV metrics only."""

    brightness: float = 0.20
    sharpness: float = 0.20
    stability: float = 0.25
    hand_detection_rate: float = 0.25
    hand_landmark_quality: float = 0.10
    tracking_continuity: float = 0.10

    @classmethod
    def from_json(cls, path: Path) -> ScoringWeights:
        with open(path) as f:
            data = json.load(f)
        return cls(**data)

    def as_dict(self) -> dict[str, float]:
        return self.model_dump()


class ScoringWeightsV2(BaseModel):
    """V2 scoring weights — includes ML models and new metrics."""

    image_quality: float = 0.20
    stability: float = 0.15
    hand_detection_rate: float = 0.20
    hand_landmark_quality: float = 0.05
    tracking_continuity: float = 0.05
    scene_validity: float = 0.10
    anomaly_score: float = 0.10
    blur_score: float = 0.05
    temporal_consistency: float = 0.05
    audio_quality: float = 0.05

    @classmethod
    def from_json(cls, path: Path) -> ScoringWeightsV2:
        with open(path) as f:
            data = json.load(f)
        return cls(**data)

    def as_dict(self) -> dict[str, float]:
        return self.model_dump()


class BenchmarkSettings(BaseSettings):
    source: Literal["local", "s3"] = "local"
    path: Path | None = None
    bucket: str | None = None
    prefix: str = ""
    manifest: Path | None = None
    output: Path = Path("results")
    workers: int = Field(default_factory=lambda: os.cpu_count() or 4)
    sample_rate: int = 1
    segments: int = 3
    no_gpu: bool = False
    verbose: bool = False
    format: Literal["csv", "json", "both"] = "both"
    weights: ScoringWeights = Field(default_factory=ScoringWeights)
    weights_version: Literal["v1", "v2"] = "v2"
    weights_v2: ScoringWeightsV2 = Field(default_factory=ScoringWeightsV2)
    report: bool = False

    model_config = {"env_prefix": "VB_"}

    def segment_specs(self) -> list[SegmentSpec]:
        specs = DEFAULT_SEGMENT_SPECS[: self.segments]
        return [SegmentSpec(start_sec=s, end_sec=e) for s, e in specs]


def _try_import(module: str) -> bool:
    """Check if a Python module is importable."""
    try:
        __import__(module)
        return True
    except ImportError:
        return False


def detect_available_models() -> dict[str, bool]:
    """Check which optional ML packages are installed."""
    return {
        "pyiqa": _try_import("pyiqa"),
        "ultralytics": _try_import("ultralytics"),
        "open_clip": _try_import("open_clip"),
        "torchvision_raft": _try_import("torchvision.models.optical_flow"),
        "librosa": _try_import("librosa"),
        "torch": _try_import("torch"),
    }

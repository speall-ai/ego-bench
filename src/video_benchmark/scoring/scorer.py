"""Composite scoring engine — combine metric scores into a single video score."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from video_benchmark.config import BenchmarkSettings
from video_benchmark.metrics.brightness import BrightnessMetric
from video_benchmark.scoring.grader import assign_grade
from video_benchmark.sources.base import VideoFile

if TYPE_CHECKING:
    from video_benchmark.pipeline.orchestrator import VideoMetrics


@dataclass
class VideoScore:
    operator_id: str
    filename: str
    video_path: str
    composite_score: float
    grade: str
    metric_scores: dict[str, float]
    raw_metrics: dict[str, float]
    segment_scores: list[dict] = field(default_factory=list)
    worst_issue: str = "none"


def _mean(vals: list) -> float:
    return sum(vals) / len(vals) if vals else 0.0


def _normalize_brightness(values: list[float]) -> float:
    """Normalize brightness values to 0-100 score."""
    if not values:
        return 0.0
    scores = [BrightnessMetric.normalize(v) for v in values]
    return sum(scores) / len(scores)


def _normalize_sharpness(values: list[float]) -> float:
    """Normalize Laplacian variance to 0-100 score."""
    if not values:
        return 0.0
    mean_val = sum(values) / len(values)
    return min(100.0, mean_val / 5.0)


def _normalize_stability(values: list[float]) -> float:
    """Normalize optical flow to 0-100 score. Lower flow = higher score."""
    if not values:
        return 50.0
    mean_flow = sum(values) / len(values)
    return max(0.0, min(100.0, 100.0 - mean_flow * 5.0))


def _normalize_hand_detection_rate(rate: float) -> float:
    return rate * 100.0


def _normalize_hand_landmark_quality(counts: list[int]) -> float:
    if not counts:
        return 0.0
    mean_count = sum(counts) / len(counts)
    return min(100.0, mean_count / 21.0 * 80.0)


ISSUE_NAMES = {
    "brightness": "poor_lighting",
    "sharpness": "blurry_frames",
    "stability": "camera_shake",
    "hand_detection_rate": "hands_not_visible",
    "hand_landmark_quality": "poor_hand_visibility",
    "tracking_continuity": "frequent_dropouts",
    "image_quality": "poor_image_quality",
    "scene_validity": "wrong_camera_angle",
    "anomaly_score": "frame_anomalies",
    "blur_score": "excessive_blur",
    "temporal_consistency": "quality_inconsistent",
    "audio_quality": "poor_audio",
}


def _identify_worst_issue(metric_scores: dict[str, float]) -> str:
    if not metric_scores:
        return "none"
    worst = min(metric_scores, key=lambda k: metric_scores[k])
    if metric_scores[worst] < 40:
        return ISSUE_NAMES.get(worst, worst)
    return "none"


def _score_v1(
    video: VideoFile,
    metrics: VideoMetrics,
    settings: BenchmarkSettings,
) -> VideoScore:
    """V1 scoring: classical CV metrics only."""
    w = settings.weights
    metric_scores = {
        "brightness": _normalize_brightness(metrics.brightness),
        "sharpness": _normalize_sharpness(metrics.sharpness),
        "stability": _normalize_stability(metrics.stability),
        "hand_detection_rate": _normalize_hand_detection_rate(
            metrics.hand_detection_rate
        ),
        "hand_landmark_quality": _normalize_hand_landmark_quality(
            metrics.hand_landmark_counts
        ),
        "tracking_continuity": metrics.tracking_continuity,
    }

    raw_metrics = {
        "brightness_mean": _mean(metrics.brightness),
        "sharpness_mean": _mean(metrics.sharpness),
        "stability_mean": _mean(metrics.stability),
        "hand_detection_rate": metrics.hand_detection_rate,
        "hand_confidence_mean": _mean(metrics.hand_confidence),
        "landmark_count_mean": _mean(metrics.hand_landmark_counts),
        "tracking_continuity": metrics.tracking_continuity,
        "total_frames": len(metrics.brightness),
    }

    wd = w.as_dict()
    composite = sum(metric_scores[k] * wd[k] for k in wd)
    composite = max(0.0, min(100.0, composite))

    return VideoScore(
        operator_id=video.operator_id,
        filename=video.filename,
        video_path=video.video_path,
        composite_score=round(composite, 1),
        grade=assign_grade(composite),
        metric_scores={k: round(v, 1) for k, v in metric_scores.items()},
        raw_metrics={k: round(v, 2) for k, v in raw_metrics.items()},
        segment_scores=metrics.segment_scores,
        worst_issue=_identify_worst_issue(metric_scores),
    )


def _score_v2(
    video: VideoFile,
    metrics: VideoMetrics,
    settings: BenchmarkSettings,
) -> VideoScore:
    """V2 scoring: ML models + new metrics."""
    w = settings.weights_v2

    # Image quality: use IQA if available, fallback to brightness+sharpness avg
    if metrics.iqa_scores:
        image_quality = _mean(metrics.iqa_scores)
    else:
        bri = _normalize_brightness(metrics.brightness)
        shp = _normalize_sharpness(metrics.sharpness)
        image_quality = (bri + shp) / 2.0

    # Scene validity: use CLIP if available, default 75 (neutral)
    scene_validity = (
        _mean(metrics.scene_validity_scores)
        if metrics.scene_validity_scores
        else 75.0
    )

    metric_scores = {
        "image_quality": image_quality,
        "stability": _normalize_stability(metrics.stability),
        "hand_detection_rate": _normalize_hand_detection_rate(
            metrics.hand_detection_rate
        ),
        "hand_landmark_quality": _normalize_hand_landmark_quality(
            metrics.hand_landmark_counts
        ),
        "tracking_continuity": metrics.tracking_continuity,
        "scene_validity": scene_validity,
        "anomaly_score": _mean(metrics.anomaly_scores) if metrics.anomaly_scores else 100.0,
        "blur_score": _mean(metrics.blur_scores) if metrics.blur_scores else 100.0,
        "temporal_consistency": metrics.temporal_consistency,
        "audio_quality": metrics.audio_quality,
    }

    raw_metrics = {
        "brightness_mean": _mean(metrics.brightness),
        "sharpness_mean": _mean(metrics.sharpness),
        "stability_mean": _mean(metrics.stability),
        "hand_detection_rate": metrics.hand_detection_rate,
        "hand_confidence_mean": _mean(metrics.hand_confidence),
        "landmark_count_mean": _mean(metrics.hand_landmark_counts),
        "tracking_continuity": metrics.tracking_continuity,
        "total_frames": len(metrics.brightness),
        "iqa_mean": _mean(metrics.iqa_scores),
        "anomaly_mean": _mean(metrics.anomaly_scores),
        "blur_mean": _mean(metrics.blur_scores),
        "scene_validity_mean": _mean(metrics.scene_validity_scores),
        "temporal_consistency": metrics.temporal_consistency,
        "temporal_flicker": metrics.temporal_flicker,
        "temporal_drops": len(metrics.temporal_quality_drops),
        "temporal_dupes": len(metrics.temporal_duplicates),
        "audio_quality": metrics.audio_quality,
        **{f"audio_{k}": v for k, v in metrics.audio_details.items()},
    }

    wd = w.as_dict()
    composite = sum(metric_scores.get(k, 0.0) * wd[k] for k in wd)
    composite = max(0.0, min(100.0, composite))

    return VideoScore(
        operator_id=video.operator_id,
        filename=video.filename,
        video_path=video.video_path,
        composite_score=round(composite, 1),
        grade=assign_grade(composite),
        metric_scores={k: round(v, 1) for k, v in metric_scores.items()},
        raw_metrics={k: round(v, 2) for k, v in raw_metrics.items()},
        segment_scores=metrics.segment_scores,
        worst_issue=_identify_worst_issue(metric_scores),
    )


def score_video(
    video: VideoFile,
    metrics: VideoMetrics,
    settings: BenchmarkSettings,
) -> VideoScore:
    """Compute composite score for a single video."""
    if settings.weights_version == "v2":
        return _score_v2(video, metrics, settings)
    return _score_v1(video, metrics, settings)

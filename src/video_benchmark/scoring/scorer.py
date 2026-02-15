"""Composite scoring engine — combine metric scores into a single video score."""

from __future__ import annotations

from dataclasses import dataclass, field

# TYPE_CHECKING import to avoid circular
from typing import TYPE_CHECKING

from video_benchmark.config import ScoringWeights
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


def _normalize_brightness(values: list[float]) -> float:
    """Normalize brightness values to 0-100 score."""
    if not values:
        return 0.0
    scores = [BrightnessMetric.normalize(v) for v in values]
    return sum(scores) / len(scores)


def _normalize_sharpness(values: list[float]) -> float:
    """Normalize Laplacian variance to 0-100 score.

    Typical range: 0-2000+. We map 0-500 → 0-100.
    """
    if not values:
        return 0.0
    mean_val = sum(values) / len(values)
    return min(100.0, mean_val / 5.0)


def _normalize_stability(values: list[float]) -> float:
    """Normalize optical flow to 0-100 score.

    Lower flow = more stable = higher score.
    Typical range: 0-50+ pixels.
    """
    if not values:
        return 50.0  # No data, neutral score
    mean_flow = sum(values) / len(values)
    # 0 flow = 100 score, 20+ flow = 0 score
    return max(0.0, min(100.0, 100.0 - mean_flow * 5.0))


def _normalize_hand_detection_rate(rate: float) -> float:
    """Detection rate is already 0-1, scale to 0-100."""
    return rate * 100.0


def _normalize_hand_landmark_quality(counts: list[int]) -> float:
    """Normalize landmark counts to 0-100.

    Max landmarks per hand = 21, detecting 2 hands = 42.
    We score based on average landmarks detected when hands ARE detected.
    """
    if not counts:
        return 0.0
    mean_count = sum(counts) / len(counts)
    # 21 landmarks (1 hand) = good, 42 (2 hands) = excellent
    return min(100.0, mean_count / 21.0 * 80.0)


def _identify_worst_issue(metric_scores: dict[str, float]) -> str:
    """Find the metric with the lowest score."""
    if not metric_scores:
        return "none"
    worst = min(metric_scores, key=lambda k: metric_scores[k])
    if metric_scores[worst] < 40:
        issue_names = {
            "brightness": "poor_lighting",
            "sharpness": "blurry_frames",
            "stability": "camera_shake",
            "hand_detection_rate": "hands_not_visible",
            "hand_landmark_quality": "poor_hand_visibility",
            "tracking_continuity": "frequent_dropouts",
        }
        return issue_names.get(worst, worst)
    return "none"


def score_video(
    video: VideoFile,
    metrics: VideoMetrics,
    weights: ScoringWeights,
) -> VideoScore:
    """Compute composite score for a single video."""
    metric_scores = {
        "brightness": _normalize_brightness(metrics.brightness),
        "sharpness": _normalize_sharpness(metrics.sharpness),
        "stability": _normalize_stability(metrics.stability),
        "hand_detection_rate": _normalize_hand_detection_rate(metrics.hand_detection_rate),
        "hand_landmark_quality": _normalize_hand_landmark_quality(metrics.hand_landmark_counts),
        "tracking_continuity": metrics.tracking_continuity,
    }

    def _mean(vals: list) -> float:
        return sum(vals) / len(vals) if vals else 0.0

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

    w = weights.as_dict()
    composite = sum(metric_scores[k] * w[k] for k in w)
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

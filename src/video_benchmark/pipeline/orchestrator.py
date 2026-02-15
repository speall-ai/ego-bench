"""Main pipeline orchestration — process videos end-to-end."""

from __future__ import annotations

import logging
import tempfile
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path

from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn, TimeElapsedColumn

from video_benchmark.acceleration import AccelerationInfo, detect_acceleration
from video_benchmark.config import BenchmarkSettings
from video_benchmark.metrics.brightness import BrightnessMetric
from video_benchmark.metrics.continuity import ContinuityMetric
from video_benchmark.metrics.hand_detection import HandDetectionMetric
from video_benchmark.metrics.sharpness import SharpnessMetric
from video_benchmark.metrics.stability import StabilityMetric
from video_benchmark.pipeline.frame_sampler import extract_frames_cv2
from video_benchmark.pipeline.segment_extractor import extract_all_segments
from video_benchmark.scoring.aggregator import aggregate_operators
from video_benchmark.scoring.scorer import VideoScore, score_video
from video_benchmark.sources.base import VideoFile

logger = logging.getLogger(__name__)


@dataclass
class VideoMetrics:
    brightness: list[float] = field(default_factory=list)
    sharpness: list[float] = field(default_factory=list)
    stability: list[float] = field(default_factory=list)
    hand_detection_rate: float = 0.0
    hand_confidence: list[float] = field(default_factory=list)
    hand_landmark_counts: list[int] = field(default_factory=list)
    tracking_continuity: float = 0.0
    detection_flags: list[bool] = field(default_factory=list)
    segment_scores: list[dict] = field(default_factory=list)


def process_single_video(
    video: VideoFile,
    settings: BenchmarkSettings,
    accel: AccelerationInfo,
) -> tuple[VideoFile, VideoMetrics | None, str | None]:
    """Process a single video through the full metric pipeline.

    Returns (video, metrics, error_message).
    """
    try:
        segments = settings.segment_specs()

        with tempfile.TemporaryDirectory(prefix="vb_") as tmpdir:
            work_dir = Path(tmpdir)
            segment_paths = extract_all_segments(
                video.video_path, segments, accel, work_dir
            )

            if not segment_paths:
                return video, None, "No segments could be extracted"

            metrics = VideoMetrics()
            all_detection_flags: list[bool] = []

            for seg_idx, seg_path in enumerate(segment_paths):
                frames = extract_frames_cv2(seg_path, settings.sample_rate)
                if not frames:
                    continue

                # Brightness
                bm = BrightnessMetric()
                brightness_scores = [bm.compute(f) for f in frames]
                metrics.brightness.extend(brightness_scores)

                # Sharpness
                sm = SharpnessMetric()
                sharpness_scores = [sm.compute(f) for f in frames]
                metrics.sharpness.extend(sharpness_scores)

                # Stability (needs consecutive frame pairs)
                stab = StabilityMetric()
                for i in range(1, len(frames)):
                    metrics.stability.append(stab.compute_flow(frames[i - 1], frames[i]))

                # Hand detection
                hd = HandDetectionMetric()
                seg_detections: list[bool] = []
                for frame in frames:
                    result = hd.detect(frame)
                    seg_detections.append(result.detected)
                    all_detection_flags.append(result.detected)
                    if result.detected:
                        metrics.hand_confidence.append(result.confidence)
                        metrics.hand_landmark_counts.append(result.landmark_count)
                hd.close()

                seg_score = {
                    "segment": seg_idx,
                    "frames": len(frames),
                    "brightness_mean": float(sum(brightness_scores) / len(brightness_scores)) if brightness_scores else 0,
                    "sharpness_mean": float(sum(sharpness_scores) / len(sharpness_scores)) if sharpness_scores else 0,
                    "hand_rate": sum(seg_detections) / len(seg_detections) if seg_detections else 0,
                }
                metrics.segment_scores.append(seg_score)

            metrics.detection_flags = all_detection_flags
            if all_detection_flags:
                metrics.hand_detection_rate = sum(all_detection_flags) / len(all_detection_flags)

            # Tracking continuity
            cont = ContinuityMetric()
            metrics.tracking_continuity = cont.compute_from_flags(all_detection_flags)

        return video, metrics, None

    except Exception as e:
        logger.exception(f"Error processing {video.filename}")
        return video, None, str(e)


def _process_wrapper(args: tuple) -> tuple[VideoFile, VideoMetrics | None, str | None]:
    """Wrapper for multiprocessing — unpacks args tuple."""
    video, settings, accel = args
    return process_single_video(video, settings, accel)


@dataclass
class PipelineResult:
    scores: list[VideoScore]
    failed: list[tuple[VideoFile, str]]
    operator_rankings: list[dict]


def run_pipeline(
    videos: list[VideoFile],
    settings: BenchmarkSettings,
) -> PipelineResult:
    """Run the full benchmark pipeline on all videos."""
    accel = detect_acceleration(force_no_gpu=settings.no_gpu)
    scores: list[VideoScore] = []
    failed: list[tuple[VideoFile, str]] = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        TimeElapsedColumn(),
    ) as progress:
        task = progress.add_task("Processing videos...", total=len(videos))

        if settings.workers <= 1:
            for video in videos:
                progress.update(task, description=f"Processing {video.filename}")
                v, metrics, error = process_single_video(video, settings, accel)
                if metrics and error is None:
                    vs = score_video(v, metrics, settings.weights)
                    scores.append(vs)
                else:
                    failed.append((v, error or "Unknown error"))
                progress.advance(task)
        else:
            args_list = [(v, settings, accel) for v in videos]
            with ProcessPoolExecutor(max_workers=settings.workers) as executor:
                futures = {
                    executor.submit(_process_wrapper, args): args[0]
                    for args in args_list
                }
                for future in as_completed(futures):
                    v, metrics, error = future.result()
                    if metrics and error is None:
                        vs = score_video(v, metrics, settings.weights)
                        scores.append(vs)
                    else:
                        failed.append((v, error or "Unknown error"))
                    progress.advance(task)

    operator_rankings = aggregate_operators(scores)

    return PipelineResult(
        scores=scores,
        failed=failed,
        operator_rankings=operator_rankings,
    )

"""Tests for individual metric modules."""

from __future__ import annotations

import numpy as np

from video_benchmark.metrics.brightness import BrightnessMetric
from video_benchmark.metrics.continuity import ContinuityMetric
from video_benchmark.metrics.sharpness import SharpnessMetric
from video_benchmark.metrics.stability import StabilityMetric


class TestBrightnessMetric:
    def test_bright_frame(self, bright_frame: np.ndarray) -> None:
        m = BrightnessMetric()
        val = m.compute(bright_frame)
        assert 195 <= val <= 205

    def test_dark_frame(self, dark_frame: np.ndarray) -> None:
        m = BrightnessMetric()
        val = m.compute(dark_frame)
        assert val < 30
        assert BrightnessMetric.is_dark(val)

    def test_normalize_optimal(self) -> None:
        score = BrightnessMetric.normalize(130.0)
        assert score > 70

    def test_normalize_dark(self) -> None:
        score = BrightnessMetric.normalize(10.0)
        assert score < 20

    def test_normalize_overexposed(self) -> None:
        score = BrightnessMetric.normalize(250.0)
        assert score < 50


class TestSharpnessMetric:
    def test_noisy_frame_is_sharp(self, noisy_frame: np.ndarray) -> None:
        m = SharpnessMetric()
        val = m.compute(noisy_frame)
        assert val > 100  # Noisy = high Laplacian variance

    def test_uniform_frame_is_blurry(self, uniform_frame: np.ndarray) -> None:
        m = SharpnessMetric()
        val = m.compute(uniform_frame)
        assert val < 1  # Uniform = zero variance


class TestStabilityMetric:
    def test_identical_frames_stable(self, bright_frame: np.ndarray) -> None:
        m = StabilityMetric()
        flow = m.compute_flow(bright_frame, bright_frame)
        assert flow < 1.0  # Nearly zero motion

    def test_shifted_frame_unstable(
        self, textured_frame: np.ndarray, shifted_textured_frame: np.ndarray
    ) -> None:
        m = StabilityMetric()
        flow = m.compute_flow(textured_frame, shifted_textured_frame)
        assert flow > 0.5  # Detectable motion


class TestContinuityMetric:
    def test_perfect_continuity(self) -> None:
        m = ContinuityMetric()
        score = m.compute_from_flags([True] * 100)
        assert score == 100.0

    def test_no_detections(self) -> None:
        m = ContinuityMetric()
        score = m.compute_from_flags([False] * 100)
        assert score == 0.0

    def test_intermittent_dropouts(self) -> None:
        m = ContinuityMetric()
        flags = [True, True, False, True, True, False, True, True, True, True]
        score = m.compute_from_flags(flags)
        assert 50 < score < 100

    def test_long_streak_penalized(self) -> None:
        m = ContinuityMetric()
        # 10 consecutive dropouts out of 20
        flags = [True] * 10 + [False] * 10
        score = m.compute_from_flags(flags)
        assert score < 30

    def test_empty_flags(self) -> None:
        m = ContinuityMetric()
        assert m.compute_from_flags([]) == 0.0

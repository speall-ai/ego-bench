"""Brightness metric — mean pixel intensity and dark frame detection."""

from __future__ import annotations

import cv2
import numpy as np

from video_benchmark.metrics.base import Metric

# Frames below this mean intensity are considered "dark"
DARK_THRESHOLD = 40.0


class BrightnessMetric(Metric):
    name = "brightness"

    def compute(self, frame: np.ndarray) -> float:
        """Return mean pixel intensity (0-255)."""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        return float(np.mean(gray))

    @staticmethod
    def is_dark(value: float) -> bool:
        return value < DARK_THRESHOLD

    @staticmethod
    def normalize(value: float) -> float:
        """Normalize brightness to 0-100 score.

        Optimal range is ~80-180. Too dark or too bright is bad.
        """
        if value < 30:
            return max(0.0, value / 30 * 30)
        if value < 80:
            return 30 + (value - 30) / 50 * 40
        if value <= 180:
            return 70 + (value - 80) / 100 * 30
        if value <= 220:
            return 100 - (value - 180) / 40 * 20
        return max(0.0, 80 - (value - 220) / 35 * 80)

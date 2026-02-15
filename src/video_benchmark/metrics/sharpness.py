"""Sharpness metric — Laplacian variance."""

from __future__ import annotations

import cv2
import numpy as np

from video_benchmark.metrics.base import Metric


class SharpnessMetric(Metric):
    name = "sharpness"

    def compute(self, frame: np.ndarray) -> float:
        """Return Laplacian variance (higher = sharper)."""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        lap = cv2.Laplacian(gray, cv2.CV_64F)
        return float(lap.var())

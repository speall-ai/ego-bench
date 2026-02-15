"""Tracking continuity metric — detection dropout streak analysis."""

from __future__ import annotations

import numpy as np

from video_benchmark.metrics.base import Metric


class ContinuityMetric(Metric):
    name = "tracking_continuity"

    def compute(self, frame: np.ndarray) -> float:
        raise NotImplementedError("Use compute(detection_flags) with a list[bool] instead.")

    def compute_from_flags(self, detection_flags: list[bool]) -> float:
        """Score tracking continuity based on detection dropout streaks.

        Returns a score from 0-100 where:
        - 100 = no dropouts at all
        - Lower scores = longer/more frequent dropout streaks
        """
        if not detection_flags:
            return 0.0

        n = len(detection_flags)

        # Count dropout streaks and their lengths
        streaks: list[int] = []
        current_streak = 0

        for detected in detection_flags:
            if not detected:
                current_streak += 1
            else:
                if current_streak > 0:
                    streaks.append(current_streak)
                current_streak = 0
        if current_streak > 0:
            streaks.append(current_streak)

        if not streaks:
            return 100.0  # Perfect continuity

        # Penalize based on max streak length and total dropout ratio
        max_streak = max(streaks)
        total_dropouts = sum(streaks)
        dropout_ratio = total_dropouts / n

        # Max streak penalty: longer single streaks are worse
        streak_penalty = min(50.0, max_streak * 5.0)

        # Dropout ratio penalty
        ratio_penalty = dropout_ratio * 50.0

        return max(0.0, 100.0 - streak_penalty - ratio_penalty)

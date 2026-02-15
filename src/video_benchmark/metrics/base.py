"""Abstract base class for frame-level metrics."""

from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np


class Metric(ABC):
    """Base class for all frame-level metrics."""

    name: str = "base"

    @abstractmethod
    def compute(self, frame: np.ndarray) -> float:
        """Compute metric value for a single frame. Returns raw value."""
        ...

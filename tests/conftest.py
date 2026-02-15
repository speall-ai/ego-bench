"""Shared test fixtures for video-benchmark."""

from __future__ import annotations

import cv2
import numpy as np
import pytest


@pytest.fixture
def bright_frame() -> np.ndarray:
    """A 480x640 bright BGR frame (mean intensity ~200)."""
    return np.full((480, 640, 3), 200, dtype=np.uint8)


@pytest.fixture
def dark_frame() -> np.ndarray:
    """A 480x640 dark BGR frame (mean intensity ~20)."""
    return np.full((480, 640, 3), 20, dtype=np.uint8)


@pytest.fixture
def noisy_frame() -> np.ndarray:
    """A 480x640 noisy BGR frame with high Laplacian variance."""
    rng = np.random.default_rng(42)
    return rng.integers(0, 256, (480, 640, 3), dtype=np.uint8)


@pytest.fixture
def uniform_frame() -> np.ndarray:
    """A 480x640 uniform BGR frame (zero Laplacian variance)."""
    return np.full((480, 640, 3), 128, dtype=np.uint8)


@pytest.fixture
def textured_frame() -> np.ndarray:
    """A 480x640 frame with texture (gradient + noise) for optical flow tests."""
    rng = np.random.default_rng(42)
    # Create a gradient base
    base = np.tile(np.arange(640, dtype=np.uint8), (480, 1))
    # Add some noise for texture
    noise = rng.integers(0, 30, (480, 640), dtype=np.uint8)
    gray = np.clip(base.astype(np.int16) + noise.astype(np.int16), 0, 255).astype(np.uint8)
    return cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)


@pytest.fixture
def shifted_textured_frame(textured_frame: np.ndarray) -> np.ndarray:
    """Textured frame shifted 10 pixels right (simulates camera motion)."""
    shifted = np.zeros_like(textured_frame)
    shifted[:, 10:] = textured_frame[:, :-10]
    return shifted

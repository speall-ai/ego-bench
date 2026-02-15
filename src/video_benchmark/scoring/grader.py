"""Letter grade assignment based on composite score."""

from __future__ import annotations

GRADE_THRESHOLDS = [
    (80, "A"),   # 80-100: Excellent
    (60, "B"),   # 60-79: Good
    (40, "C"),   # 40-59: Marginal
    (20, "D"),   # 20-39: Poor
    (0, "F"),    # 0-19: Unusable
]

GRADE_DESCRIPTIONS = {
    "A": "Excellent — use immediately",
    "B": "Good — usable",
    "C": "Marginal — needs review",
    "D": "Poor — likely discard",
    "F": "Unusable — discard",
}


def assign_grade(score: float) -> str:
    """Assign a letter grade based on a 0-100 composite score."""
    for threshold, grade in GRADE_THRESHOLDS:
        if score >= threshold:
            return grade
    return "F"


def grade_description(grade: str) -> str:
    """Get human-readable description for a grade."""
    return GRADE_DESCRIPTIONS.get(grade, "Unknown")

"""Export operator rankings to CSV."""

from __future__ import annotations

from pathlib import Path

import polars as pl


def export_rankings_csv(rankings: list[dict], output_dir: Path) -> Path:
    """Export operator rankings to a CSV file."""
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "rankings.csv"

    columns = [
        "rank", "operator_id", "final_score", "grade",
        "mean_score", "consistency_bonus", "video_count",
        "usable_pct", "worst_issue",
    ]
    rows = [{k: r[k] for k in columns} for r in rankings]

    df = pl.DataFrame(rows)
    df.write_csv(output_path)
    return output_path

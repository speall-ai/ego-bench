"""CSV manifest loader for operator-to-video mapping."""

from __future__ import annotations

from pathlib import Path

import polars as pl

from video_benchmark.sources.base import VideoFile


def load_manifest(manifest_path: Path, base_path: Path | None = None) -> list[VideoFile]:
    df = pl.read_csv(manifest_path)
    required = {"operator_id", "video_path"}
    if not required.issubset(set(df.columns)):
        raise ValueError(f"Manifest must contain columns: {required}. Found: {set(df.columns)}")

    videos: list[VideoFile] = []
    for row in df.iter_rows(named=True):
        video_path = row["video_path"]
        if base_path and not video_path.startswith(("s3://", "http://", "https://")):
            video_path = str(base_path / video_path)
        p = Path(video_path)
        videos.append(
            VideoFile(
                operator_id=row["operator_id"],
                video_path=video_path,
                filename=p.name,
            )
        )
    return videos

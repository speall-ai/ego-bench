"""Tests for video source modules."""

from __future__ import annotations

from pathlib import Path

import pytest

from video_benchmark.sources.local import LocalVideoSource
from video_benchmark.sources.manifest import load_manifest


class TestLocalVideoSource:
    def test_finds_mp4_files(self, tmp_path: Path) -> None:
        op_dir = tmp_path / "operator_001"
        op_dir.mkdir()
        (op_dir / "session.mp4").touch()
        (op_dir / "session2.mp4").touch()

        src = LocalVideoSource(tmp_path)
        videos = src.list_videos()
        assert len(videos) == 2
        assert all(v.operator_id == "operator_001" for v in videos)

    def test_recursive_discovery(self, tmp_path: Path) -> None:
        for op in ["op_01", "op_02"]:
            d = tmp_path / op
            d.mkdir()
            (d / "video.mp4").touch()

        src = LocalVideoSource(tmp_path)
        videos = src.list_videos()
        assert len(videos) == 2
        op_ids = {v.operator_id for v in videos}
        assert op_ids == {"op_01", "op_02"}

    def test_ignores_non_mp4(self, tmp_path: Path) -> None:
        (tmp_path / "readme.txt").touch()
        (tmp_path / "video.avi").touch()
        (tmp_path / "video.mp4").touch()

        src = LocalVideoSource(tmp_path)
        videos = src.list_videos()
        assert len(videos) == 1

    def test_nonexistent_dir_raises(self) -> None:
        with pytest.raises(FileNotFoundError):
            LocalVideoSource(Path("/nonexistent/path"))


class TestManifest:
    def test_load_valid_manifest(self, tmp_path: Path) -> None:
        csv = tmp_path / "manifest.csv"
        csv.write_text("operator_id,video_path\nop_1,videos/op_1/v1.mp4\nop_2,videos/op_2/v2.mp4\n")

        videos = load_manifest(csv)
        assert len(videos) == 2
        assert videos[0].operator_id == "op_1"
        assert videos[1].operator_id == "op_2"

    def test_load_manifest_with_base_path(self, tmp_path: Path) -> None:
        csv = tmp_path / "manifest.csv"
        csv.write_text("operator_id,video_path\nop_1,session.mp4\n")

        videos = load_manifest(csv, base_path=Path("/data"))
        assert videos[0].video_path == "/data/session.mp4"

    def test_invalid_columns_raises(self, tmp_path: Path) -> None:
        csv = tmp_path / "bad.csv"
        csv.write_text("name,file\nop_1,v1.mp4\n")

        with pytest.raises(ValueError, match="operator_id"):
            load_manifest(csv)

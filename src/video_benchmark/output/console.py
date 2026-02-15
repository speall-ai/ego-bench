"""Rich console output — summary tables and grade distribution."""

from __future__ import annotations

from collections import Counter

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from video_benchmark.scoring.grader import grade_description
from video_benchmark.scoring.scorer import VideoScore

console = Console()


def print_summary(
    scores: list[VideoScore],
    rankings: list[dict],
    failed: list[tuple],
    elapsed_seconds: float,
) -> None:
    """Print a rich summary of benchmark results."""
    console.print()
    console.print(Panel.fit("[bold]Video Benchmark Results[/bold]", style="blue"))
    console.print()

    # Stats
    total = len(scores) + len(failed)
    console.print(f"  Videos analyzed: [bold]{len(scores)}[/bold] / {total}")
    if failed:
        console.print(f"  Failed: [red]{len(failed)}[/red]")
    console.print(f"  Operators: [bold]{len(rankings)}[/bold]")
    console.print(f"  Time: [bold]{elapsed_seconds:.1f}s[/bold]")
    console.print()

    # Grade distribution
    _print_grade_distribution(scores)

    # Top 10 / Bottom 10 operators
    if rankings:
        _print_operator_table("Top Operators", rankings[:10])
        if len(rankings) > 10:
            _print_operator_table("Bottom Operators", rankings[-10:])

    # Common issues
    _print_common_issues(scores)

    # Failed videos
    if failed:
        _print_failed(failed)


def _print_grade_distribution(scores: list[VideoScore]) -> None:
    grade_counts = Counter(s.grade for s in scores)
    grade_colors = {"A": "green", "B": "blue", "C": "yellow", "D": "red", "F": "bright_red"}

    console.print("[bold]Grade Distribution[/bold]")
    total = len(scores) or 1
    for grade in ["A", "B", "C", "D", "F"]:
        count = grade_counts.get(grade, 0)
        pct = count / total * 100
        bar_len = int(pct / 2)
        color = grade_colors[grade]
        bar = f"[{color}]{'#' * bar_len}[/{color}]"
        desc = grade_description(grade)
        console.print(f"  {grade} {bar} {count} ({pct:.0f}%) — {desc}")
    console.print()


def _print_operator_table(title: str, rankings: list[dict]) -> None:
    table = Table(title=title, show_lines=False)
    table.add_column("Rank", style="dim", width=5)
    table.add_column("Operator", width=15)
    table.add_column("Score", justify="right", width=7)
    table.add_column("Grade", justify="center", width=6)
    table.add_column("Videos", justify="right", width=7)
    table.add_column("Usable", justify="right", width=7)
    table.add_column("Issue", width=20)

    grade_styles = {"A": "green", "B": "blue", "C": "yellow", "D": "red", "F": "bright_red"}

    for r in rankings:
        style = grade_styles.get(r["grade"], "")
        table.add_row(
            str(r["rank"]),
            r["operator_id"],
            f"{r['final_score']:.1f}",
            f"[{style}]{r['grade']}[/{style}]",
            str(r["video_count"]),
            r["usable_pct"],
            r["worst_issue"],
        )
    console.print(table)
    console.print()


def _print_common_issues(scores: list[VideoScore]) -> None:
    issues = [s.worst_issue for s in scores if s.worst_issue != "none"]
    if not issues:
        return
    counter = Counter(issues)
    console.print("[bold]Most Common Issues[/bold]")
    for issue, count in counter.most_common(5):
        console.print(f"  {issue}: {count} videos")
    console.print()


def _print_failed(failed: list[tuple]) -> None:
    console.print(f"[bold red]Failed Videos ({len(failed)})[/bold red]")
    for video, error in failed[:10]:
        console.print(f"  [red]{video.filename}[/red]: {error}")
    if len(failed) > 10:
        console.print(f"  ... and {len(failed) - 10} more")
    console.print()

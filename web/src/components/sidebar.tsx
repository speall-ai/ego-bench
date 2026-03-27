interface SidebarProps {
  runs: { name: string; score: number; grade: string }[];
  activeIndex: number | null;
  onSelect: (i: number) => void;
  onNew: () => void;
}

function gradeBg(grade: string): string {
  switch (grade) {
    case "A": return "bg-success-muted text-success";
    case "B": return "bg-accent-muted text-accent";
    case "C": return "bg-warning-muted text-warning";
    case "D": return "bg-danger-muted text-danger";
    default: return "bg-danger-muted text-danger";
  }
}

export function Sidebar({
  runs,
  activeIndex,
  onSelect,
  onNew,
}: SidebarProps) {
  return (
    <div className="flex w-64 flex-col bg-surface shadow-[inset_-1px_0_0_0_rgba(17,24,39,0.04)]">
      <div className="flex h-14 items-center justify-between px-5">
        <span className="text-[15px] font-semibold tracking-tight text-text">ego-bench</span>
        <button
          onClick={onNew}
          className="rounded-full bg-surface-alt px-3 py-1 text-[12px] font-medium text-dim transition-colors hover:bg-border/40"
        >
          + New
        </button>
      </div>

      <div className="mx-4 h-px bg-border/70" />

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {runs.length === 0 && (
          <div className="px-3 py-8 text-center">
            <p className="text-[13px] text-muted">No runs yet</p>
            <p className="mt-1 text-[12px] text-muted/70">
              Drop a video to start
            </p>
          </div>
        )}

        {runs.map((r, i) => (
          <button
            key={`run-${i}`}
            onClick={() => onSelect(i)}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all ${
              activeIndex === i
                ? "bg-surface-alt text-text"
                : "text-dim hover:bg-surface-alt/80"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{r.name}</p>
              <p className="mt-0.5 text-[12px] tabular-nums text-muted">
                {r.score.toFixed(1)} pts
              </p>
            </div>
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold ${gradeBg(r.grade)}`}
            >
              {r.grade}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

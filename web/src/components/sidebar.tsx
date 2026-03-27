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
    <div className="flex w-64 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center justify-between px-5">
        <span className="text-[15px] font-semibold tracking-tight text-text">ego-bench</span>
        <button
          onClick={onNew}
          className="rounded-md bg-accent/10 px-2.5 py-1 text-[12px] font-medium text-accent transition-colors hover:bg-accent/20"
        >
          + New
        </button>
      </div>

      <div className="h-px bg-border" />

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
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all ${
              activeIndex === i
                ? "bg-accent/8 text-text shadow-sm ring-1 ring-accent/15"
                : "text-dim hover:bg-surface-alt"
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

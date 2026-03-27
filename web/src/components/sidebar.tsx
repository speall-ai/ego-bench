interface SidebarProps {
  runs: { name: string; score: number; grade: string }[];
  activeIndex: number | null;
  onSelect: (i: number) => void;
  onNew: () => void;
}

export function Sidebar({
  runs,
  activeIndex,
  onSelect,
  onNew,
}: SidebarProps) {
  return (
    <div className="flex w-48 flex-col border-r border-border bg-bg">
      <div className="flex h-11 items-center justify-between px-4">
        <span className="text-[12px] uppercase tracking-[0.1em] text-text">ego</span>
        <button
          onClick={onNew}
          className="text-[14px] text-muted transition-colors hover:text-text"
        >
          +
        </button>
      </div>

      <div className="h-px bg-border" />

      <div className="flex-1 overflow-y-auto py-2">
        {runs.length === 0 && (
          <p className="px-4 py-5 text-[11px] uppercase tracking-[0.08em] text-muted">no runs</p>
        )}

        {runs.map((r, i) => (
          <button
            key={`run-${i}`}
            onClick={() => onSelect(i)}
            className={`flex w-full items-center gap-2 px-4 py-2 text-left transition-colors ${
              activeIndex === i
                ? "text-text"
                : "text-muted hover:text-dim"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                activeIndex === i ? "bg-text" : "bg-border"
              }`}
            />
            <span className="min-w-0 flex-1 truncate text-[12px]">{r.name}</span>
            {activeIndex === i && (
              <span className="text-[11px] tabular-nums text-muted">
                {r.score.toFixed(0)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

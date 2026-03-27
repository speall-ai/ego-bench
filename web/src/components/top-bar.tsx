import { useEffect, useRef, useState } from "react";
import { exportJSON, exportCSV } from "@/ui/export";
import type { VideoScore } from "@/types";

interface TopBarProps {
  name: string | null;
  canRename: boolean;
  onRename: (name: string) => void;
  result: VideoScore | null;
  isBusy: boolean;
}

function gradePillColor(grade: string): string {
  switch (grade) {
    case "A": return "bg-success-muted text-success";
    case "B": return "bg-accent-muted text-accent";
    case "C": return "bg-warning-muted text-warning";
    case "D": return "bg-danger-muted text-danger";
    default: return "bg-danger-muted text-danger";
  }
}

export function TopBar({ name, canRename, onRename, result, isBusy }: TopBarProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEdit() {
    if (!canRename || !name) return;
    setValue(name);
    setEditing(true);
  }

  function commit() {
    if (value.trim()) {
      onRename(value.trim());
    }
    setEditing(false);
  }

  return (
    <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border/60 bg-surface/92 px-6 backdrop-blur-sm">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {editing ? (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full max-w-xs appearance-none bg-transparent p-0 text-[15px] font-medium text-text outline-none focus-visible:outline-none"
          />
        ) : canRename ? (
          <button
            onClick={startEdit}
            className="group flex items-center gap-1.5 truncate text-[15px] font-medium text-dim transition-colors hover:text-text"
          >
            <span className="truncate">{name ?? "ego-bench"}</span>
            <svg className="h-3.5 w-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <span className="truncate text-[15px] text-muted">
            {name ?? "ego-bench"}
          </span>
        )}

        {result && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${gradePillColor(result.grade)}`}>
            {result.grade} · {result.overallScore.toFixed(1)}
          </span>
        )}

        {isBusy && (
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-alt px-2.5 py-0.5 text-[11px] text-muted">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Agent is reviewing
          </span>
        )}
      </div>

      {result && (
        <div className="ml-4 flex items-center gap-2">
          <button
            onClick={() => exportJSON(result)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] text-dim transition-colors hover:border-muted hover:text-text"
          >
            JSON
          </button>
          <button
            onClick={() => exportCSV(result)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] text-dim transition-colors hover:border-muted hover:text-text"
          >
            CSV
          </button>
        </div>
      )}
    </div>
  );
}

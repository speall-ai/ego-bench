import { useEffect, useRef, useState } from "react";
import { exportJSON, exportCSV } from "@/ui/export";
import type { VideoScore } from "@/types";

interface TopBarProps {
  name: string | null;
  canRename: boolean;
  onRename: (name: string) => void;
  result: VideoScore | null;
}

export function TopBar({ name, canRename, onRename, result }: TopBarProps) {
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
    <div className="flex h-10 items-center justify-between border-b border-border px-6">
      <div className="min-w-0 flex flex-1 items-center">
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
            className="w-full max-w-xs appearance-none bg-transparent p-0 text-[15px] text-text outline-none focus-visible:outline-none"
          />
        ) : canRename ? (
          <button
            onClick={startEdit}
            className="truncate text-[15px] text-dim transition-colors hover:text-text"
          >
            {name ?? "ego-bench"}
          </button>
        ) : (
          <span className="truncate text-[15px] text-muted">
            {name ?? "ego-bench"}
          </span>
        )}
      </div>

      {result && (
        <div className="ml-4 flex items-center gap-4">
          <button
            onClick={() => exportJSON(result)}
            className="text-[15px] text-muted transition-colors hover:text-text"
          >
            export json
          </button>
          <button
            onClick={() => exportCSV(result)}
            className="text-[15px] text-muted transition-colors hover:text-text"
          >
            export csv
          </button>
        </div>
      )}
    </div>
  );
}

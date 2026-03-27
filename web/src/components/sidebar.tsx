import { motion, AnimatePresence, useReducedMotion } from "motion/react";

interface SidebarProps {
  runs: { name: string; score: number; grade: string }[];
  activeIndex: number | null;
  onSelect: (i: number) => void;
  onNew: () => void;
}

export function Sidebar({ runs, activeIndex, onSelect, onNew }: SidebarProps) {
  const reduced = useReducedMotion();

  return (
    <div className="flex w-56 flex-col border-r border-border bg-surface">
      <div className="flex h-10 items-center justify-between px-4">
        <span className="text-[11px] font-medium text-text">ego</span>
        <button
          onClick={onNew}
          className="text-[11px] text-muted hover:text-dim transition-colors"
        >
          +
        </button>
      </div>

      <div className="h-px bg-border" />

      <div className="flex-1 overflow-y-auto py-2">
        {runs.length === 0 && (
          <p className="px-4 py-6 text-[10px] text-muted">no runs yet</p>
        )}

        <AnimatePresence initial={false}>
          {runs.map((r, i) => (
            <motion.button
              key={`${r.name}-${i}`}
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: -6 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
              transition={reduced ? { duration: 0 } : { duration: 0.15, delay: i * 0.03 }}
              onClick={() => onSelect(i)}
              className={`flex w-full items-center justify-between px-4 py-1.5 text-left transition-colors ${
                activeIndex === i
                  ? "bg-border text-text"
                  : "text-muted hover:text-dim"
              }`}
            >
              <span className="truncate text-[11px]">{r.name}</span>
              <span className="text-[10px] tabular-nums text-muted">
                {r.score.toFixed(0)}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

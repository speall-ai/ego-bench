import { motion, AnimatePresence, useReducedMotion, LayoutGroup } from "motion/react";

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
  const reduced = useReducedMotion();

  return (
    <div className="flex w-56 flex-col border-r border-border bg-surface">
      <div className="flex h-10 items-center justify-between px-4">
        <span className="text-[13px] font-medium text-text">ego</span>
        <button
          onClick={onNew}
          className="text-[13px] text-muted transition-colors hover:text-dim"
        >
          +
        </button>
      </div>

      <div className="h-px bg-border" />

      <div className="flex-1 overflow-y-auto py-2">
        {runs.length === 0 && (
          <p className="px-4 py-6 text-[12px] text-muted">no runs yet</p>
        )}

        <LayoutGroup>
          <AnimatePresence initial={false}>
            {runs.map((r, i) => (
              <motion.div
                key={`run-${i}`}
                layout={!reduced}
                initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={reduced ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
              >
                <button
                  onClick={() => onSelect(i)}
                  className={`flex w-full items-center justify-between px-4 py-1.5 text-left transition-colors ${
                    activeIndex === i
                      ? "bg-border text-text"
                      : "text-muted hover:text-dim"
                  }`}
                >
                  <span className="truncate text-[13px]">{r.name}</span>
                  <span className="text-[12px] tabular-nums text-muted">
                    {r.score.toFixed(0)}
                  </span>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </LayoutGroup>
      </div>
    </div>
  );
}

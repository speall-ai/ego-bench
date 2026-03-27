import { motion, useReducedMotion } from "motion/react";

export interface Step {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  result?: string;
}

function StatusIcon({ status }: { status: Step["status"] }) {
  if (status === "running") {
    return (
      <span className="relative flex h-4 w-4 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/30" />
        <span className="inline-block h-2 w-2 rounded-full bg-accent" />
      </span>
    );
  }
  if (status === "done") {
    return (
      <svg className="h-4 w-4 text-success" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4 text-danger" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AgentStep({ step, index }: { step: Step; index: number }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.18, delay: index * 0.03 }}
      className="flex items-center gap-3 py-1.5"
    >
      <StatusIcon status={step.status} />
      <span className={`text-[14px] ${step.status === "done" ? "text-muted" : step.status === "running" ? "text-text font-medium" : "text-dim"}`}>
        {step.label}
      </span>
      {step.result && step.status === "done" && (
        <span className="rounded bg-surface-alt px-1.5 py-0.5 text-[12px] text-muted">
          {step.result}
        </span>
      )}
    </motion.div>
  );
}

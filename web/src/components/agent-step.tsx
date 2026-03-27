import { motion, useReducedMotion } from "motion/react";

export interface Step {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  result?: string;
}

export function AgentStep({ step, index }: { step: Step; index: number }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.15, delay: index * 0.02 }}
      className="flex items-baseline gap-2.5 py-[3px]"
    >
      <span className="text-[11px] text-muted">
        {step.status === "running" ? "·" : step.status === "done" ? "·" : "×"}
      </span>
      <span className={`text-[12px] ${step.status === "done" ? "text-muted" : "text-dim"}`}>
        {step.label}
      </span>
      {step.result && step.status === "done" && (
        <span className="text-[11px] text-muted">{step.result}</span>
      )}
    </motion.div>
  );
}

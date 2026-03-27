import { motion, useReducedMotion } from "motion/react";
import type { VideoScore } from "@/types";

export function Verdict({ score }: { score: VideoScore }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.2 }}
      className="space-y-3"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums text-text">
          {score.overallScore.toFixed(1)}
        </span>
        <span className="text-[12px] text-muted">{score.grade}</span>
      </div>
      <p className="text-[12px] text-dim leading-relaxed max-w-sm">
        {verdict(score)}
      </p>
    </motion.div>
  );
}

function verdict(s: VideoScore): string {
  const p: string[] = [];
  if (s.overallScore >= 80) p.push("solid.");
  else if (s.overallScore >= 60) p.push("decent, few things.");
  else p.push("rough.");
  if (s.metrics.stability < 40) p.push("shaky.");
  if (s.metrics.sharpness < 30) p.push("soft.");
  if (s.metrics.brightness < 30) p.push("dark.");
  if (s.metrics.handDetectionRate < 30) p.push("hands missing.");
  if (s.temporal.qualityDrops > 2) p.push(`${s.temporal.qualityDrops} drops.`);
  return p.join(" ");
}

import { motion, useReducedMotion } from "motion/react";
import type { VideoScore } from "@/types";
import { weakestLimb } from "@/metrics/limb-labeling";

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
        <span className="text-[32px] font-semibold tabular-nums text-text">
          {score.overallScore.toFixed(1)}
        </span>
        <span className="text-[14px] text-muted">{score.grade}</span>
      </div>
      <p className="max-w-sm text-[13px] leading-relaxed text-dim">
        {verdict(score)}
      </p>
    </motion.div>
  );
}

function verdict(s: VideoScore): string {
  const notes: string[] = [];
  const weakest = weakestLimb(s.metrics.limbScores);
  const lead =
    s.overallScore >= 80
      ? "Strong overall signal."
      : s.overallScore >= 60
        ? "Usable overall signal."
        : "Mixed overall signal.";

  if (s.metrics.stability < 40 || s.temporal.motionJerkScore < 45) {
    notes.push("Motion still feels a bit abrupt.");
  }
  if (s.metrics.sharpness < 30) {
    notes.push("Focus softens in a few sections.");
  }
  if (s.metrics.brightness < 30 || s.metrics.exposureIntegrity < 55) {
    notes.push("Exposure could be cleaner.");
  }
  if (s.metrics.segmentationAvailable && s.metrics.framingIntegrity < 55) {
    notes.push("Foreground framing could be cleaner.");
  }
  if (s.metrics.handDetectionRate < 30) {
    notes.push("Hands drop out too often.");
  } else if (s.metrics.interactionZoneCoverage < 35) {
    notes.push("Hand activity does not stay in the action zone for long.");
  }
  if (s.metrics.bimanualRate < 20) {
    notes.push("Two-hand coverage is limited.");
  }
  if (s.metrics.bodyDetectionRate < 40 || s.metrics.limbVisibility < 45 || weakest.score < 42) {
    notes.push(`${weakest.label} is the weakest limb track right now.`);
  }
  if (s.temporal.shotChanges > 0 || s.temporal.qualityDrops > 2) {
    notes.push("A few temporal breaks are visible.");
  }

  return [lead, ...notes.slice(0, 2)].join(" ");
}

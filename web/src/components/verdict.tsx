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
        <span className="text-[32px] font-semibold tabular-nums text-text">
          {score.overallScore.toFixed(1)}
        </span>
        <span className="text-[14px] text-muted">{score.grade}</span>
      </div>
      <p className="max-w-sm text-[14px] leading-relaxed text-dim">
        {verdict(score)}
      </p>
    </motion.div>
  );
}

function verdict(s: VideoScore): string {
  const p: string[] = [];
  if (s.overallScore >= 80) p.push("overall, this looks strong.");
  else if (s.overallScore >= 60) p.push("overall, this is in a workable place.");
  else p.push("there is a good base here, with a few areas worth refining.");
  if (s.metrics.stability < 40) p.push("camera motion is a bit noticeable.");
  if (s.temporal.motionJerkScore < 45) p.push("head or scene motion changes abruptly in a few stretches.");
  if (s.metrics.sharpness < 30) p.push("focus softens in places.");
  if (s.metrics.brightness < 30) p.push("some frames are darker than ideal.");
  if (s.metrics.exposureIntegrity < 55) p.push("exposure clipping shows up in brighter or darker regions.");
  if (s.metrics.handDetectionRate < 30) p.push("hands are only visible intermittently.");
  else if (s.metrics.interactionZoneCoverage < 35) p.push("hand activity spends limited time in the lower-center interaction zone.");
  if (s.metrics.bimanualRate < 20) p.push("both hands are not visible together very often.");
  if (s.metrics.bodyDetectionRate < 40) p.push("full limb mapping only holds in parts of the clip.");
  else if (s.metrics.limbVisibility < 45) p.push("some arm or leg landmarks drop out through motion or framing.");
  if (s.temporal.shotChanges > 0) p.push(`${s.temporal.shotChanges} strong scene transitions or cuts show up.`);
  if (s.temporal.qualityDrops > 2) p.push(`${s.temporal.qualityDrops} brief quality dips show up.`);
  return p.join(" ");
}

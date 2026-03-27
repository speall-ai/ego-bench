import type { AudioMetrics, FrameMetrics, TemporalMetrics, VideoScore } from "../types.js";

const WEIGHTS = {
  brightness: 0.1,
  sharpness: 0.11,
  blur: 0.11,
  stability: 0.1,
  handDetectionRate: 0.12,
  handQuality: 0.04,
  bodyDetectionRate: 0.06,
  limbVisibility: 0.07,
  interactionZoneCoverage: 0.09,
  bimanualRate: 0.05,
  exposureIntegrity: 0.07,
  audio: 0.04,
  temporal: 0.04,
} as const;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function assignGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function exposureIntegrityScore(shadowClip: number, highlightClip: number): number {
  const weightedClip = shadowClip * 1.1 + highlightClip * 1.2;
  return Math.max(0, 100 - weightedClip * 2.5);
}

export function scoreVideo(
  filename: string,
  frameMetrics: FrameMetrics[],
  audio: AudioMetrics | null,
  temporal: TemporalMetrics,
): VideoScore {
  const brightness = mean(frameMetrics.map((f) => f.brightness));
  const sharpness = mean(frameMetrics.map((f) => f.sharpness));
  const blur = mean(frameMetrics.map((f) => f.blur));

  const stabilityFrames = frameMetrics.filter((f) => f.stability >= 0);
  const stability = stabilityFrames.length > 0 ? mean(stabilityFrames.map((f) => f.stability)) : 100;
  const actionFrames = frameMetrics.filter((f) => f.actionMotion >= 0);
  const peripheralFrames = frameMetrics.filter((f) => f.peripheralMotion >= 0);
  const actionMotion = actionFrames.length > 0 ? mean(actionFrames.map((f) => f.actionMotion)) : 0;
  const peripheralMotion =
    peripheralFrames.length > 0 ? mean(peripheralFrames.map((f) => f.peripheralMotion)) : 0;

  const handsDetected = frameMetrics.filter((f) => f.handDetected);
  const handDetectionRate = (handsDetected.length / frameMetrics.length) * 100;
  const avgHandConfidence =
    handsDetected.length > 0 ? mean(handsDetected.map((f) => f.handConfidence)) : 0;
  const bimanualRate =
    (frameMetrics.filter((f) => f.bothHandsDetected).length / frameMetrics.length) * 100;
  const interactionZoneCoverage = mean(frameMetrics.map((f) => f.interactionZoneCoverage));
  const bodyFrames = frameMetrics.filter((f) => f.bodyDetected);
  const bodyDetectionRate = (bodyFrames.length / frameMetrics.length) * 100;
  const bodyVisibility = mean(frameMetrics.map((f) => f.bodyVisibility));
  const limbVisibility = mean(frameMetrics.map((f) => f.limbVisibility));
  const shadowClip = mean(frameMetrics.map((f) => f.shadowClip));
  const highlightClip = mean(frameMetrics.map((f) => f.highlightClip));
  const exposureIntegrity = exposureIntegrityScore(shadowClip, highlightClip);

  const audioScore = audio?.overallScore ?? 50;
  const temporalScore =
    (temporal.consistencyScore + temporal.flickerScore + temporal.motionJerkScore) / 3;

  const overallScore =
    brightness * WEIGHTS.brightness +
    sharpness * WEIGHTS.sharpness +
    blur * WEIGHTS.blur +
    stability * WEIGHTS.stability +
    handDetectionRate * WEIGHTS.handDetectionRate +
    avgHandConfidence * 100 * WEIGHTS.handQuality +
    bodyDetectionRate * WEIGHTS.bodyDetectionRate +
    limbVisibility * WEIGHTS.limbVisibility +
    interactionZoneCoverage * WEIGHTS.interactionZoneCoverage +
    bimanualRate * WEIGHTS.bimanualRate +
    exposureIntegrity * WEIGHTS.exposureIntegrity +
    audioScore * WEIGHTS.audio +
    temporalScore * WEIGHTS.temporal;

  return {
    filename,
    frameCount: frameMetrics.length,
    metrics: {
      brightness,
      sharpness,
      blur,
      stability,
      actionMotion,
      peripheralMotion,
      handDetectionRate,
      bimanualRate,
      avgHandConfidence,
      interactionZoneCoverage,
      bodyDetectionRate,
      bodyVisibility,
      limbVisibility,
      shadowClip,
      highlightClip,
      exposureIntegrity,
    },
    audio,
    temporal,
    overallScore: Math.round(overallScore * 100) / 100,
    grade: assignGrade(overallScore),
    perFrame: frameMetrics,
  };
}

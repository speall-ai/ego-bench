import type { AudioMetrics, FrameMetrics, TemporalMetrics, VideoScore } from "../types.js";

const WEIGHTS = {
  brightness: 0.15,
  sharpness: 0.15,
  blur: 0.15,
  stability: 0.15,
  handDetectionRate: 0.20,
  handQuality: 0.05,
  audio: 0.05,
  temporal: 0.10,
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

  const handsDetected = frameMetrics.filter((f) => f.handDetected);
  const handDetectionRate = (handsDetected.length / frameMetrics.length) * 100;
  const avgHandConfidence =
    handsDetected.length > 0 ? mean(handsDetected.map((f) => f.handConfidence)) : 0;

  const audioScore = audio?.overallScore ?? 50;
  const temporalScore = (temporal.consistencyScore + temporal.flickerScore) / 2;

  const overallScore =
    brightness * WEIGHTS.brightness +
    sharpness * WEIGHTS.sharpness +
    blur * WEIGHTS.blur +
    stability * WEIGHTS.stability +
    handDetectionRate * WEIGHTS.handDetectionRate +
    avgHandConfidence * 100 * WEIGHTS.handQuality +
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
      handDetectionRate,
      avgHandConfidence,
    },
    audio,
    temporal,
    overallScore: Math.round(overallScore * 100) / 100,
    grade: assignGrade(overallScore),
    perFrame: frameMetrics,
  };
}

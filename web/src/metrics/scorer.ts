import type { AudioMetrics, FrameMetrics, TemporalMetrics, VideoScore } from "../types.js";
import { emptyLimbScores } from "./limb-labeling.js";

const WEIGHTS = {
  brightness: 0.09,
  sharpness: 0.1,
  blur: 0.1,
  stability: 0.09,
  handDetectionRate: 0.11,
  handQuality: 0.04,
  bodyDetectionRate: 0.05,
  limbVisibility: 0.06,
  interactionZoneCoverage: 0.08,
  bimanualRate: 0.04,
  exposureIntegrity: 0.06,
  segmentationQuality: 0.03,
  framingIntegrity: 0.06,
  workspaceOccupancy: 0.04,
  audio: 0.03,
  temporal: 0.02,
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

function bandScore(
  value: number,
  hardMin: number,
  softMin: number,
  softMax: number,
  hardMax: number,
): number {
  if (value <= hardMin || value >= hardMax) return 0;
  if (value >= softMin && value <= softMax) return 100;
  if (value < softMin) return ((value - hardMin) / (softMin - hardMin)) * 100;
  return ((hardMax - value) / (hardMax - softMax)) * 100;
}

function meanLimbScores(frameMetrics: FrameMetrics[]) {
  if (frameMetrics.length === 0) return emptyLimbScores();
  return {
    torso: mean(frameMetrics.map((f) => f.limbScores.torso)),
    leftArm: mean(frameMetrics.map((f) => f.limbScores.leftArm)),
    rightArm: mean(frameMetrics.map((f) => f.limbScores.rightArm)),
    leftLeg: mean(frameMetrics.map((f) => f.limbScores.leftLeg)),
    rightLeg: mean(frameMetrics.map((f) => f.limbScores.rightLeg)),
  };
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
  const limbScores = meanLimbScores(frameMetrics);
  const shadowClip = mean(frameMetrics.map((f) => f.shadowClip));
  const highlightClip = mean(frameMetrics.map((f) => f.highlightClip));
  const exposureIntegrity = exposureIntegrityScore(shadowClip, highlightClip);
  const segmentationFrames = frameMetrics.filter((f) => f.segmentationAvailable);
  const segmentationAvailable = segmentationFrames.length > 0;
  const foregroundCoverage = segmentationAvailable
    ? mean(segmentationFrames.map((f) => f.foregroundCoverage))
    : 0;
  const actionZoneForeground = segmentationAvailable
    ? mean(segmentationFrames.map((f) => f.actionZoneForeground))
    : 0;
  const edgeCutoff = segmentationAvailable
    ? mean(segmentationFrames.map((f) => f.edgeCutoff))
    : 0;
  const segmentationQuality = segmentationAvailable
    ? mean(segmentationFrames.map((f) => f.segmentationQuality))
    : 0;
  const framingIntegrity = segmentationAvailable
    ? Math.max(
      0,
      bandScore(foregroundCoverage, 0, 6, 38, 62) * 0.55 +
      Math.max(0, 100 - edgeCutoff * 2.2) * 0.45,
    )
    : 0;
  const workspaceOccupancy = segmentationAvailable
    ? bandScore(actionZoneForeground, 0, 3, 24, 42)
    : 0;

  const audioScore = audio?.overallScore ?? 50;
  const temporalScore =
    (temporal.consistencyScore + temporal.flickerScore + temporal.motionJerkScore) / 3;

  const weightedParts = [
    { value: brightness, weight: WEIGHTS.brightness, available: true },
    { value: sharpness, weight: WEIGHTS.sharpness, available: true },
    { value: blur, weight: WEIGHTS.blur, available: true },
    { value: stability, weight: WEIGHTS.stability, available: true },
    { value: handDetectionRate, weight: WEIGHTS.handDetectionRate, available: true },
    { value: avgHandConfidence * 100, weight: WEIGHTS.handQuality, available: true },
    { value: bodyDetectionRate, weight: WEIGHTS.bodyDetectionRate, available: true },
    { value: limbVisibility, weight: WEIGHTS.limbVisibility, available: true },
    { value: interactionZoneCoverage, weight: WEIGHTS.interactionZoneCoverage, available: true },
    { value: bimanualRate, weight: WEIGHTS.bimanualRate, available: true },
    { value: exposureIntegrity, weight: WEIGHTS.exposureIntegrity, available: true },
    { value: segmentationQuality, weight: WEIGHTS.segmentationQuality, available: segmentationAvailable },
    { value: framingIntegrity, weight: WEIGHTS.framingIntegrity, available: segmentationAvailable },
    { value: workspaceOccupancy, weight: WEIGHTS.workspaceOccupancy, available: segmentationAvailable },
    { value: audioScore, weight: WEIGHTS.audio, available: true },
    { value: temporalScore, weight: WEIGHTS.temporal, available: true },
  ];

  let weightedSum = 0;
  let weightTotal = 0;
  for (const part of weightedParts) {
    if (!part.available) continue;
    weightedSum += part.value * part.weight;
    weightTotal += part.weight;
  }
  const overallScore = weightTotal > 0 ? weightedSum / weightTotal : 0;

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
      limbScores,
      shadowClip,
      highlightClip,
      exposureIntegrity,
      segmentationAvailable,
      foregroundCoverage,
      actionZoneForeground,
      edgeCutoff,
      segmentationQuality,
      framingIntegrity,
      workspaceOccupancy,
    },
    audio,
    temporal,
    overallScore: Math.round(overallScore * 100) / 100,
    grade: assignGrade(overallScore),
    perFrame: frameMetrics,
  };
}

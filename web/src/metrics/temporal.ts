import type { FrameMetrics, TemporalMetrics } from "../types.js";

export function analyzeTemporalConsistency(frames: FrameMetrics[]): TemporalMetrics {
  if (frames.length < 2) {
    return {
      consistencyScore: 100,
      flickerScore: 100,
      motionJerkScore: 100,
      qualityDrops: 0,
      duplicateFrames: 0,
      shotChanges: 0,
    };
  }

  // Consistency: average absolute difference in brightness & sharpness between consecutive frames
  let totalDiff = 0;
  for (let i = 1; i < frames.length; i++) {
    const brightDiff = Math.abs(frames[i].brightness - frames[i - 1].brightness);
    const sharpDiff = Math.abs(frames[i].sharpness - frames[i - 1].sharpness);
    totalDiff += (brightDiff + sharpDiff) / 2;
  }
  const meanDiff = totalDiff / (frames.length - 1);
  const consistencyScore = Math.max(0, 100 - meanDiff * 2);

  // Flicker: rapid alternating brightness changes > 5 points
  let flickerCount = 0;
  for (let i = 2; i < frames.length; i++) {
    const d1 = frames[i - 1].brightness - frames[i - 2].brightness;
    const d2 = frames[i].brightness - frames[i - 1].brightness;
    if (
      (d1 > 5 && d2 < -5) ||
      (d1 < -5 && d2 > 5)
    ) {
      flickerCount++;
    }
  }
  const flickerScore = Math.max(0, 100 - (flickerCount / (frames.length - 2)) * 200);

  let jerkTotal = 0;
  let jerkSamples = 0;
  for (let i = 2; i < frames.length; i++) {
    if (frames[i - 1].peripheralMotion < 0 || frames[i].peripheralMotion < 0) continue;
    jerkTotal += Math.abs(frames[i].peripheralMotion - frames[i - 1].peripheralMotion);
    jerkSamples++;
  }
  const motionJerkScore =
    jerkSamples > 0 ? Math.max(0, 100 - (jerkTotal / jerkSamples) * 3) : 100;

  // Quality drops: sharpness drops > 20 from running average of previous 5 frames
  let qualityDrops = 0;
  for (let i = 1; i < frames.length; i++) {
    const windowStart = Math.max(0, i - 5);
    let sum = 0;
    for (let j = windowStart; j < i; j++) {
      sum += frames[j].sharpness;
    }
    const runningAvg = sum / (i - windowStart);
    if (runningAvg - frames[i].sharpness > 20) {
      qualityDrops++;
    }
  }

  // Duplicate frames: brightness, sharpness, and blur all within 0.1
  let duplicateFrames = 0;
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].frameDiff >= 0 && frames[i].frameDiff <= 1.25) {
      duplicateFrames++;
    }
  }

  let shotChanges = 0;
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].frameDiff > 18 && frames[i].peripheralMotion > 16) {
      shotChanges++;
    }
  }

  return {
    consistencyScore: Math.round(consistencyScore * 100) / 100,
    flickerScore: Math.round(flickerScore * 100) / 100,
    motionJerkScore: Math.round(motionJerkScore * 100) / 100,
    qualityDrops,
    duplicateFrames,
    shotChanges,
  };
}

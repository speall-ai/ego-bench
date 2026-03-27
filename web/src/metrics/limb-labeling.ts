import type { FrameBodyMap, LandmarkPoint, LimbScores } from "../types.js";

export type LimbKey = keyof LimbScores;

type LimbDefinition = {
  key: LimbKey;
  label: string;
  indices: number[];
  anchorIndices: number[];
};

export const LIMB_DEFINITIONS: LimbDefinition[] = [
  { key: "torso", label: "torso", indices: [11, 12, 23, 24], anchorIndices: [11, 12, 23, 24] },
  { key: "leftArm", label: "left arm", indices: [11, 13, 15], anchorIndices: [13, 15] },
  { key: "rightArm", label: "right arm", indices: [12, 14, 16], anchorIndices: [14, 16] },
  { key: "leftLeg", label: "left leg", indices: [23, 25, 27], anchorIndices: [25, 27] },
  { key: "rightLeg", label: "right leg", indices: [24, 26, 28], anchorIndices: [26, 28] },
];

export function emptyLimbScores(): LimbScores {
  return {
    torso: 0,
    leftArm: 0,
    rightArm: 0,
    leftLeg: 0,
    rightLeg: 0,
  };
}

function averageVisibility(points: LandmarkPoint[]): number {
  if (points.length === 0) return 0;
  let sum = 0;
  for (const point of points) {
    sum += point.visibility;
  }
  return (sum / points.length) * 100;
}

function weightedAnchor(points: LandmarkPoint[]): { x: number; y: number } | null {
  let totalWeight = 0;
  let x = 0;
  let y = 0;

  for (const point of points) {
    const weight = Math.max(0.05, point.visibility);
    totalWeight += weight;
    x += point.x * weight;
    y += point.y * weight;
  }

  if (totalWeight <= 0) return null;
  return { x: x / totalWeight, y: y / totalWeight };
}

export function computeLimbScores(map: FrameBodyMap): LimbScores {
  const scores = emptyLimbScores();

  for (const definition of LIMB_DEFINITIONS) {
    const points = definition.indices
      .map((index) => map.poseLandmarks[index])
      .filter((point): point is LandmarkPoint => Boolean(point));
    scores[definition.key] = averageVisibility(points);
  }

  return scores;
}

export function weakestLimb(scores: LimbScores): { key: LimbKey; label: string; score: number } {
  let weakest = LIMB_DEFINITIONS[0];
  let weakestScore = scores[weakest.key];

  for (const definition of LIMB_DEFINITIONS.slice(1)) {
    const score = scores[definition.key];
    if (score < weakestScore) {
      weakest = definition;
      weakestScore = score;
    }
  }

  return { key: weakest.key, label: weakest.label, score: weakestScore };
}

export function renderableLimbLabels(
  map: FrameBodyMap,
  scores: LimbScores,
): Array<{ key: LimbKey; label: string; score: number; x: number; y: number }> {
  const labels: Array<{ key: LimbKey; label: string; score: number; x: number; y: number }> = [];

  for (const definition of LIMB_DEFINITIONS) {
    const score = scores[definition.key];
    if (score < 18) continue;

    const anchor = weightedAnchor(
      definition.anchorIndices
        .map((index) => map.poseLandmarks[index])
        .filter((point): point is LandmarkPoint => Boolean(point)),
    );

    if (!anchor) continue;
    labels.push({ key: definition.key, label: definition.label, score, x: anchor.x, y: anchor.y });
  }

  return labels;
}

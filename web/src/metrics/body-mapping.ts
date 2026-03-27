import { FilesetResolver, HolisticLandmarker } from "@mediapipe/tasks-vision";
import type { FrameBodyMap, FrameData, LandmarkPoint, LimbScores } from "../types.js";
import {
  HOLISTIC_LANDMARKER_MODEL_URL,
  MEDIAPIPE_WASM_ROOT,
} from "../runtime-assets.js";
import { createLandmarkPostProcessor } from "../wasm/landmark-postprocess.js";
import { computeLimbScores, emptyLimbScores } from "./limb-labeling.js";

const MODEL_CANDIDATES = [
  { label: "holistic gpu", delegate: "GPU" as const },
  { label: "holistic cpu", delegate: "CPU" as const },
] as const;
const HAND_VISIBILITY_THRESHOLD = 0.08;

function isInActionZone(point: LandmarkPoint): boolean {
  return point.x >= 0.2 && point.x < 0.8 && point.y >= 0.35 && point.y < 1;
}

function clampVisibility(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function toPoints(
  landmarks: Array<{ x: number; y: number; visibility?: number }> | undefined,
): LandmarkPoint[] {
  if (!landmarks || landmarks.length === 0) return [];
  return landmarks.map((landmark) => ({
    x: landmark.x,
    y: landmark.y,
    visibility: clampVisibility(landmark.visibility),
  }));
}

function analyzeHandCoverage(map: FrameBodyMap): {
  bothHandsDetected: boolean;
  interactionZoneCoverage: number;
} {
  const leftHand = map.leftHandLandmarks.filter((point) => point.visibility >= HAND_VISIBILITY_THRESHOLD);
  const rightHand = map.rightHandLandmarks.filter((point) => point.visibility >= HAND_VISIBILITY_THRESHOLD);
  const visiblePoints = [...leftHand, ...rightHand];
  const handsVisible = Number(leftHand.length >= 5) + Number(rightHand.length >= 5);
  const pointsInActionZone = visiblePoints.filter(isInActionZone).length;

  return {
    bothHandsDetected: handsVisible === 2,
    interactionZoneCoverage:
      visiblePoints.length > 0 ? (pointsInActionZone / visiblePoints.length) * 100 : 0,
  };
}

export class BodyMapper {
  readonly modelLabel: string;
  private readonly landmarker: HolisticLandmarker;
  private readonly postProcessor: Awaited<ReturnType<typeof createLandmarkPostProcessor>>;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private constructor(
    landmarker: HolisticLandmarker,
    postProcessor: Awaited<ReturnType<typeof createLandmarkPostProcessor>>,
    modelLabel: string,
  ) {
    this.modelLabel = modelLabel;
    this.landmarker = landmarker;
    this.postProcessor = postProcessor;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;
  }

  static async create(): Promise<BodyMapper> {
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_ROOT);
    let lastError: unknown = null;

    for (const candidate of MODEL_CANDIDATES) {
      try {
        const postProcessor = await createLandmarkPostProcessor();
        const landmarker = await HolisticLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: HOLISTIC_LANDMARKER_MODEL_URL,
            delegate: candidate.delegate,
          },
          runningMode: "IMAGE",
          minFaceDetectionConfidence: 0.4,
          minPoseDetectionConfidence: 0.45,
          minPosePresenceConfidence: 0.45,
          minHandLandmarksConfidence: 0.45,
          outputFaceBlendshapes: false,
          outputPoseSegmentationMasks: false,
        });
        return new BodyMapper(landmarker, postProcessor, `${candidate.label} + wasm`);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Unable to load a supported body mapping model");
  }

  detect(frame: FrameData): {
    handDetected: boolean;
    bothHandsDetected: boolean;
    handConfidence: number;
    handLandmarkCount: number;
    interactionZoneCoverage: number;
    bodyDetected: boolean;
    bodyLandmarkCount: number;
    bodyVisibility: number;
    limbVisibility: number;
    limbScores: LimbScores;
    map: FrameBodyMap | null;
  } {
    this.canvas.width = frame.width;
    this.canvas.height = frame.height;

    const clamped = new Uint8ClampedArray(frame.pixels.length);
    clamped.set(frame.pixels);
    const imageData = new ImageData(clamped, frame.width, frame.height);
    this.ctx.putImageData(imageData, 0, 0);

    const results = this.landmarker.detect(this.canvas);
    const processed = this.postProcessor.process({
      poseLandmarks: toPoints(results.poseLandmarks[0]),
      leftHandLandmarks: toPoints(results.leftHandLandmarks[0]),
      rightHandLandmarks: toPoints(results.rightHandLandmarks[0]),
    });
    const handCoverage = analyzeHandCoverage(processed.map);
    const limbScores = processed.bodyDetected ? computeLimbScores(processed.map) : emptyLimbScores();

    return {
      handDetected: processed.handDetected,
      bothHandsDetected: handCoverage.bothHandsDetected,
      handConfidence: processed.handConfidence,
      handLandmarkCount: processed.handLandmarkCount,
      interactionZoneCoverage: handCoverage.interactionZoneCoverage,
      bodyDetected: processed.bodyDetected,
      bodyLandmarkCount: processed.bodyLandmarkCount,
      bodyVisibility: processed.bodyVisibility,
      limbVisibility: processed.limbVisibility,
      limbScores,
      map: processed.bodyDetected || processed.handDetected ? processed.map : null,
    };
  }

  destroy(): void {
    this.landmarker.close();
  }
}

import { FilesetResolver, HolisticLandmarker } from "@mediapipe/tasks-vision";
import type { FrameBodyMap, FrameData, LandmarkPoint } from "../types.js";

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_ASSET_PATH =
  "https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task";

const MODEL_CANDIDATES = [
  { label: "holistic gpu", delegate: "GPU" as const },
  { label: "holistic cpu", delegate: "CPU" as const },
] as const;

const LIMB_POSE_INDICES = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28] as const;

function clampVisibility(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function averageVisibility(points: LandmarkPoint[]): number {
  if (points.length === 0) return 0;
  let sum = 0;
  for (const point of points) {
    sum += clampVisibility(point.visibility);
  }
  return sum / points.length;
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

export class BodyMapper {
  readonly modelLabel: string;
  private readonly landmarker: HolisticLandmarker;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private constructor(landmarker: HolisticLandmarker, modelLabel: string) {
    this.modelLabel = modelLabel;
    this.landmarker = landmarker;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;
  }

  static async create(): Promise<BodyMapper> {
    const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
    let lastError: unknown = null;

    for (const candidate of MODEL_CANDIDATES) {
      try {
        const landmarker = await HolisticLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_PATH,
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
        return new BodyMapper(landmarker, candidate.label);
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
    handConfidence: number;
    handLandmarkCount: number;
    bodyDetected: boolean;
    bodyLandmarkCount: number;
    bodyVisibility: number;
    limbVisibility: number;
    map: FrameBodyMap | null;
  } {
    this.canvas.width = frame.width;
    this.canvas.height = frame.height;

    const clamped = new Uint8ClampedArray(frame.pixels.length);
    clamped.set(frame.pixels);
    const imageData = new ImageData(clamped, frame.width, frame.height);
    this.ctx.putImageData(imageData, 0, 0);

    const results = this.landmarker.detect(this.canvas);
    const poseLandmarks = toPoints(results.poseLandmarks[0]);
    const leftHandLandmarks = toPoints(results.leftHandLandmarks[0]);
    const rightHandLandmarks = toPoints(results.rightHandLandmarks[0]);

    const bodyDetected = poseLandmarks.length > 0;
    const handDetected = leftHandLandmarks.length > 0 || rightHandLandmarks.length > 0;
    const handLandmarks = [...leftHandLandmarks, ...rightHandLandmarks];
    const bodyVisibility = averageVisibility(poseLandmarks) * 100;
    const limbVisibility = averageVisibility(
      LIMB_POSE_INDICES
        .map((index) => poseLandmarks[index])
        .filter((landmark): landmark is LandmarkPoint => Boolean(landmark)),
    ) * 100;

    const map = bodyDetected || handDetected
      ? {
          poseLandmarks,
          leftHandLandmarks,
          rightHandLandmarks,
        }
      : null;

    return {
      handDetected,
      handConfidence: averageVisibility(handLandmarks),
      handLandmarkCount: handLandmarks.length,
      bodyDetected,
      bodyLandmarkCount: poseLandmarks.length,
      bodyVisibility,
      limbVisibility,
      map,
    };
  }

  destroy(): void {
    this.landmarker.close();
  }
}

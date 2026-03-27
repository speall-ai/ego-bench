import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { FrameData } from "../types.js";
import { HAND_LANDMARKER_MODEL_URL, MEDIAPIPE_WASM_ROOT } from "../runtime-assets.js";

const MODEL_CANDIDATES = [
  {
    label: "balanced gpu",
    modelAssetPath: HAND_LANDMARKER_MODEL_URL,
    delegate: "GPU" as const,
  },
  {
    label: "balanced cpu",
    modelAssetPath: HAND_LANDMARKER_MODEL_URL,
    delegate: "CPU" as const,
  },
] as const;

export class HandDetector {
  readonly modelLabel: string;
  private landmarker: HandLandmarker;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private constructor(landmarker: HandLandmarker, modelLabel: string) {
    this.modelLabel = modelLabel;
    this.landmarker = landmarker;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;
  }

  static async create(): Promise<HandDetector> {
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_ROOT);
    let lastError: unknown = null;

    for (const candidate of MODEL_CANDIDATES) {
      try {
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: candidate.modelAssetPath,
            delegate: candidate.delegate,
          },
          runningMode: "IMAGE",
          numHands: 2,
        });
        return new HandDetector(landmarker, candidate.label);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Unable to load a supported hand model");
  }

  detect(frame: FrameData): {
    detected: boolean;
    confidence: number;
    landmarkCount: number;
  } {
    this.canvas.width = frame.width;
    this.canvas.height = frame.height;

    const clamped = new Uint8ClampedArray(frame.pixels.length);
    clamped.set(frame.pixels);
    const imageData = new ImageData(clamped, frame.width, frame.height);
    this.ctx.putImageData(imageData, 0, 0);

    const results = this.landmarker.detect(this.canvas);

    if (results.landmarks.length > 0) {
      let maxConfidence = 0;
      for (const hand of results.handedness) {
        for (const category of hand) {
          if (category.score > maxConfidence) {
            maxConfidence = category.score;
          }
        }
      }

      const landmarkCount = results.landmarks.length * 21;

      return {
        detected: true,
        confidence: maxConfidence,
        landmarkCount,
      };
    }

    return { detected: false, confidence: 0, landmarkCount: 0 };
  }

  destroy(): void {
    this.landmarker.close();
  }
}

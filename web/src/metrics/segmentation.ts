import type { FrameData, SegmentationMetrics } from "../types.js";

type WorkerReadyMessage = {
  type: "ready";
  modelLabel: string;
  labels: string[];
};

type WorkerResultMessage = {
  type: "result";
  id: number;
  metrics: SegmentationMetrics;
};

type WorkerErrorMessage = {
  type: "error";
  id?: number;
  message: string;
};

type WorkerMessage = WorkerReadyMessage | WorkerResultMessage | WorkerErrorMessage;

function emptyMetrics(): SegmentationMetrics {
  return {
    segmentationAvailable: false,
    foregroundCoverage: 0,
    actionZoneForeground: 0,
    edgeCutoff: 0,
    segmentationQuality: 0,
  };
}

class WorkerSegmentationAnalyzer {
  readonly modelLabel: string;
  readonly labels: string[];

  private constructor(
    private readonly worker: Worker,
    modelLabel: string,
    labels: string[],
  ) {
    this.modelLabel = modelLabel;
    this.labels = labels;
  }

  static async create(): Promise<WorkerSegmentationAnalyzer> {
    const worker = new Worker(new URL("./segmentation-worker.ts", import.meta.url), {
      type: "module",
    });

    const ready = await new Promise<WorkerReadyMessage>((resolve, reject) => {
      const handleMessage = (event: MessageEvent<WorkerMessage>) => {
        const message = event.data;
        if (message.type === "ready") {
          cleanup();
          resolve(message);
        } else if (message.type === "error") {
          cleanup();
          reject(new Error(message.message));
        }
      };

      const handleError = (event: ErrorEvent) => {
        cleanup();
        reject(event.error instanceof Error ? event.error : new Error(event.message));
      };

      const cleanup = () => {
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);
      };

      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", handleError);
      worker.postMessage({ type: "init" });
    });

    return new WorkerSegmentationAnalyzer(worker, ready.modelLabel, ready.labels);
  }

  analyzeFrame(frame: FrameData): Promise<SegmentationMetrics> {
    return new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
      const pixels = new Uint8Array(frame.pixels);

      const handleMessage = (event: MessageEvent<WorkerMessage>) => {
        const message = event.data;
        if (message.type === "result" && message.id === id) {
          cleanup();
          resolve(message.metrics);
        } else if (message.type === "error" && message.id === id) {
          cleanup();
          reject(new Error(message.message));
        }
      };

      const handleError = (event: ErrorEvent) => {
        cleanup();
        reject(event.error instanceof Error ? event.error : new Error(event.message));
      };

      const cleanup = () => {
        this.worker.removeEventListener("message", handleMessage);
        this.worker.removeEventListener("error", handleError);
      };

      this.worker.addEventListener("message", handleMessage);
      this.worker.addEventListener("error", handleError);
      this.worker.postMessage(
        {
          type: "analyze",
          id,
          width: frame.width,
          height: frame.height,
          pixels: pixels.buffer,
        },
        [pixels.buffer],
      );
    });
  }

  destroy(): void {
    this.worker.postMessage({ type: "dispose" });
    this.worker.terminate();
  }
}

export async function createSegmentationAnalyzer(): Promise<{
  modelLabel: string;
  labels: string[];
  analyzeFrame(frame: FrameData): Promise<SegmentationMetrics>;
  destroy(): void;
}> {
  try {
    return await WorkerSegmentationAnalyzer.create();
  } catch (error) {
    console.warn("Segmentation worker failed to load, skipping mask metrics", error);
    return {
      modelLabel: "skipped",
      labels: [],
      analyzeFrame: async () => emptyMetrics(),
      destroy: () => undefined,
    };
  }
}

import type { FrameData, ProcessingProgress } from "../types.js";

const MAX_FRAMES = 120;

export async function extractFrames(
  file: File,
  fps: number,
  onProgress?: (progress: ProcessingProgress) => void,
): Promise<FrameData[]> {
  const url = URL.createObjectURL(file);

  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      video.addEventListener("error", () => reject(new Error("Failed to load video")), {
        once: true,
      });
    });

    const duration = video.duration;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!duration || !width || !height) {
      throw new Error("Invalid video: missing duration or dimensions");
    }

    const rawFrameCount = Math.floor(duration * fps);
    const frameCount = Math.min(rawFrameCount, MAX_FRAMES);

    const timestamps: number[] = [];
    if (frameCount >= rawFrameCount) {
      for (let i = 0; i < frameCount; i++) {
        timestamps.push(i / fps);
      }
    } else {
      for (let i = 0; i < frameCount; i++) {
        timestamps.push((i / (frameCount - 1)) * duration);
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("Failed to get canvas 2D context");
    }

    const frames: FrameData[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const t = timestamps[i];
      video.currentTime = t;

      await new Promise<void>((resolve) => {
        video.addEventListener("seeked", () => resolve(), { once: true });
      });

      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);

      frames.push({
        pixels: new Uint8Array(imageData.data.buffer),
        width,
        height,
        timestamp: t,
      });

      onProgress?.({
        phase: "Extracting frames",
        current: i + 1,
        total: timestamps.length,
      });
    }

    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

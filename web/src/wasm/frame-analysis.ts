import wasmURL from "./frame-analysis.wasm?url";
import type { FrameData } from "@/types";

const HISTOGRAM_BINS = 16;

type FrameAnalysis = {
  histogram: number[];
  shadowClip: number;
  highlightClip: number;
};

type FrameDiffAnalysis = {
  global: number;
  action: number;
  peripheral: number;
};

interface WasmExports {
  memory: WebAssembly.Memory;
  reset: () => void;
  alloc: (size: number) => number;
  histogram16: (rgbaPtr: number, pixelCount: number, outPtr: number) => void;
  clipStats: (rgbaPtr: number, pixelCount: number, outPtr: number) => void;
  frameDiffRegional: (
    rgbaAPtr: number,
    rgbaBPtr: number,
    width: number,
    height: number,
    outPtr: number,
  ) => void;
}

function normalizeHistogram(rawBins: Uint32Array, pixelCount: number): number[] {
  if (pixelCount <= 0) return Array(HISTOGRAM_BINS).fill(0);
  return Array.from(rawBins, (value) => (value / pixelCount) * 100);
}

function lumaAt(pixels: Uint8Array, offset: number): number {
  return (pixels[offset] * 77 + pixels[offset + 1] * 150 + pixels[offset + 2] * 29) >> 8;
}

function isInActionZone(x: number, y: number, width: number, height: number): boolean {
  return (
    x >= width * 0.2 &&
    x < width * 0.8 &&
    y >= height * 0.35 &&
    y < height
  );
}

function analyzeFrameFallback(frame: FrameData): FrameAnalysis {
  const bins = new Array<number>(HISTOGRAM_BINS).fill(0);
  const pixelCount = frame.width * frame.height;
  let shadowClip = 0;
  let highlightClip = 0;
  for (let i = 0; i < pixelCount; i++) {
    const luma = lumaAt(frame.pixels, i * 4);
    const bin = luma >> 4;
    bins[bin] += 1;
    if (luma <= 16) shadowClip += 1;
    if (luma >= 235) highlightClip += 1;
  }
  return {
    histogram: bins.map((value) => (value / pixelCount) * 100),
    shadowClip: (shadowClip / pixelCount) * 100,
    highlightClip: (highlightClip / pixelCount) * 100,
  };
}

function diffFramesFallback(current: FrameData, previous: FrameData): FrameDiffAnalysis {
  const pixelCount = current.width * current.height;
  if (pixelCount === 0) {
    return { global: 0, action: 0, peripheral: 0 };
  }

  let globalSum = 0;
  let actionSum = 0;
  let actionCount = 0;
  let peripheralSum = 0;
  let peripheralCount = 0;

  for (let y = 0; y < current.height; y++) {
    for (let x = 0; x < current.width; x++) {
      const offset = (y * current.width + x) * 4;
      const diff = Math.abs(lumaAt(current.pixels, offset) - lumaAt(previous.pixels, offset));
      globalSum += diff;
      if (isInActionZone(x, y, current.width, current.height)) {
        actionSum += diff;
        actionCount += 1;
      } else {
        peripheralSum += diff;
        peripheralCount += 1;
      }
    }
  }

  return {
    global: (globalSum / pixelCount / 255) * 100,
    action: actionCount > 0 ? (actionSum / actionCount / 255) * 100 : 0,
    peripheral: peripheralCount > 0 ? (peripheralSum / peripheralCount / 255) * 100 : 0,
  };
}

export class WasmFrameAnalyzer {
  private constructor(private readonly exports: WasmExports) {}

  static async create(): Promise<WasmFrameAnalyzer> {
    const response = await fetch(wasmURL);
    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {});
    return new WasmFrameAnalyzer(instance.exports as unknown as WasmExports);
  }

  analyzeFrame(frame: FrameData): FrameAnalysis {
    const pixelCount = frame.width * frame.height;
    if (pixelCount <= 0) {
      return {
        histogram: Array(HISTOGRAM_BINS).fill(0),
        shadowClip: 0,
        highlightClip: 0,
      };
    }

    this.exports.reset();
    const rgbaPtr = this.exports.alloc(frame.pixels.byteLength);
    const histPtr = this.exports.alloc(HISTOGRAM_BINS * Uint32Array.BYTES_PER_ELEMENT);
    const statsPtr = this.exports.alloc(2 * Uint32Array.BYTES_PER_ELEMENT);

    new Uint8Array(this.exports.memory.buffer, rgbaPtr, frame.pixels.byteLength).set(frame.pixels);
    this.exports.histogram16(rgbaPtr, pixelCount, histPtr);
    this.exports.clipStats(rgbaPtr, pixelCount, statsPtr);

    const bins = new Uint32Array(this.exports.memory.buffer, histPtr, HISTOGRAM_BINS);
    const stats = new Uint32Array(this.exports.memory.buffer, statsPtr, 2);
    return {
      histogram: normalizeHistogram(bins, pixelCount),
      shadowClip: (stats[0] / pixelCount) * 100,
      highlightClip: (stats[1] / pixelCount) * 100,
    };
  }

  diffFrames(current: FrameData, previous: FrameData): FrameDiffAnalysis {
    const pixelCount = current.width * current.height;
    if (pixelCount <= 0) {
      return { global: 0, action: 0, peripheral: 0 };
    }

    this.exports.reset();
    const currentPtr = this.exports.alloc(current.pixels.byteLength);
    const previousPtr = this.exports.alloc(previous.pixels.byteLength);
    const diffPtr = this.exports.alloc(3 * Float32Array.BYTES_PER_ELEMENT);

    new Uint8Array(this.exports.memory.buffer, currentPtr, current.pixels.byteLength).set(current.pixels);
    new Uint8Array(this.exports.memory.buffer, previousPtr, previous.pixels.byteLength).set(previous.pixels);

    this.exports.frameDiffRegional(currentPtr, previousPtr, current.width, current.height, diffPtr);
    const diffs = new Float32Array(this.exports.memory.buffer, diffPtr, 3);
    return {
      global: (diffs[0] / 255) * 100,
      action: (diffs[1] / 255) * 100,
      peripheral: (diffs[2] / 255) * 100,
    };
  }
}

export async function createFrameAnalyzer(): Promise<{
  analyzeFrame(frame: FrameData): FrameAnalysis;
  diffFrames(current: FrameData, previous: FrameData): FrameDiffAnalysis;
}> {
  try {
    return await WasmFrameAnalyzer.create();
  } catch (error) {
    console.warn("Custom frame wasm failed to load, using JS fallback", error);
    return {
      analyzeFrame: analyzeFrameFallback,
      diffFrames: diffFramesFallback,
    };
  }
}

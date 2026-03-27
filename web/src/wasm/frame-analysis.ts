import wasmURL from "./frame-analysis.wasm?url";
import type { FrameData } from "@/types";

const HISTOGRAM_BINS = 16;

type FrameAnalysis = {
  histogram: number[];
};

interface WasmExports {
  memory: WebAssembly.Memory;
  reset: () => void;
  alloc: (size: number) => number;
  histogram16: (rgbaPtr: number, pixelCount: number, outPtr: number) => void;
  frameDiff: (rgbaAPtr: number, rgbaBPtr: number, pixelCount: number) => number;
}

function normalizeHistogram(rawBins: Uint32Array, pixelCount: number): number[] {
  if (pixelCount <= 0) return Array(HISTOGRAM_BINS).fill(0);
  return Array.from(rawBins, (value) => (value / pixelCount) * 100);
}

function lumaAt(pixels: Uint8Array, offset: number): number {
  return (pixels[offset] * 77 + pixels[offset + 1] * 150 + pixels[offset + 2] * 29) >> 8;
}

function analyzeFrameFallback(frame: FrameData): FrameAnalysis {
  const bins = new Array<number>(HISTOGRAM_BINS).fill(0);
  const pixelCount = frame.width * frame.height;
  for (let i = 0; i < pixelCount; i++) {
    const bin = lumaAt(frame.pixels, i * 4) >> 4;
    bins[bin] += 1;
  }
  return { histogram: bins.map((value) => (value / pixelCount) * 100) };
}

function diffFramesFallback(current: FrameData, previous: FrameData): number {
  const pixelCount = current.width * current.height;
  if (pixelCount === 0) return 0;

  let sum = 0;
  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    sum += Math.abs(lumaAt(current.pixels, offset) - lumaAt(previous.pixels, offset));
  }
  return (sum / pixelCount / 255) * 100;
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
    if (pixelCount <= 0) return { histogram: Array(HISTOGRAM_BINS).fill(0) };

    this.exports.reset();
    const rgbaPtr = this.exports.alloc(frame.pixels.byteLength);
    const histPtr = this.exports.alloc(HISTOGRAM_BINS * Uint32Array.BYTES_PER_ELEMENT);

    new Uint8Array(this.exports.memory.buffer, rgbaPtr, frame.pixels.byteLength).set(frame.pixels);
    this.exports.histogram16(rgbaPtr, pixelCount, histPtr);

    const bins = new Uint32Array(this.exports.memory.buffer, histPtr, HISTOGRAM_BINS);
    return { histogram: normalizeHistogram(bins, pixelCount) };
  }

  diffFrames(current: FrameData, previous: FrameData): number {
    const pixelCount = current.width * current.height;
    if (pixelCount <= 0) return 0;

    this.exports.reset();
    const currentPtr = this.exports.alloc(current.pixels.byteLength);
    const previousPtr = this.exports.alloc(previous.pixels.byteLength);

    new Uint8Array(this.exports.memory.buffer, currentPtr, current.pixels.byteLength).set(current.pixels);
    new Uint8Array(this.exports.memory.buffer, previousPtr, previous.pixels.byteLength).set(previous.pixels);

    const diff = this.exports.frameDiff(currentPtr, previousPtr, pixelCount);
    return (diff / 255) * 100;
  }
}

export async function createFrameAnalyzer(): Promise<{
  analyzeFrame(frame: FrameData): FrameAnalysis;
  diffFrames(current: FrameData, previous: FrameData): number;
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

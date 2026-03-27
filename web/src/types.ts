export interface FrameData {
  pixels: Uint8Array; // RGBA
  width: number;
  height: number;
  timestamp: number; // seconds into the video
}

export interface FrameMetrics {
  brightness: number; // 0-100
  sharpness: number; // 0-100
  blur: number; // 0-100 (100 = no blur)
  stability: number; // 0-100 (100 = perfectly stable), -1 for first frame
  handDetected: boolean;
  handConfidence: number; // 0-1
  handLandmarkCount: number;
}

export interface AudioMetrics {
  loudnessLUFS: number;
  peakDb: number;
  silencePercent: number;
  clippingPercent: number;
  overallScore: number; // 0-100
}

export interface TemporalMetrics {
  consistencyScore: number; // 0-100
  flickerScore: number; // 0-100 (100 = no flicker)
  qualityDrops: number;
  duplicateFrames: number;
}

export interface VideoScore {
  filename: string;
  frameCount: number;
  metrics: {
    brightness: number;
    sharpness: number;
    blur: number;
    stability: number;
    handDetectionRate: number;
    avgHandConfidence: number;
  };
  audio: AudioMetrics | null;
  temporal: TemporalMetrics;
  overallScore: number;
  grade: string;
  perFrame: FrameMetrics[];
}

export interface ProcessingProgress {
  phase: string;
  current: number;
  total: number;
}

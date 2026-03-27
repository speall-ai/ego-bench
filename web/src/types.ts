export interface FrameData {
  pixels: Uint8Array; // RGBA
  width: number;
  height: number;
  timestamp: number; // seconds into the video
}

export interface LandmarkPoint {
  x: number;
  y: number;
  visibility: number;
}

export interface LimbScores {
  torso: number;
  leftArm: number;
  rightArm: number;
  leftLeg: number;
  rightLeg: number;
}

export interface FrameBodyMap {
  poseLandmarks: LandmarkPoint[];
  leftHandLandmarks: LandmarkPoint[];
  rightHandLandmarks: LandmarkPoint[];
}

export interface FrameMetrics {
  timestamp: number; // seconds into the video
  brightness: number; // 0-100
  sharpness: number; // 0-100
  blur: number; // 0-100 (100 = no blur)
  stability: number; // 0-100 (100 = perfectly stable), -1 for first frame
  frameDiff: number; // 0-100, -1 for first frame
  actionMotion: number; // 0-100, lower-center egocentric action-zone motion
  peripheralMotion: number; // 0-100, motion outside the action zone
  lumaHistogram: number[]; // 16 bins, percentages summing to ~100
  shadowClip: number; // 0-100
  highlightClip: number; // 0-100
  handDetected: boolean;
  bothHandsDetected: boolean;
  handConfidence: number; // 0-1
  handLandmarkCount: number;
  interactionZoneCoverage: number; // 0-100
  bodyDetected: boolean;
  bodyLandmarkCount: number;
  bodyVisibility: number; // 0-100
  limbVisibility: number; // 0-100
  limbScores: LimbScores;
}

export interface FramePreview {
  src: string;
  timestamp: number;
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
  motionJerkScore: number; // 0-100 (100 = smooth motion transitions)
  qualityDrops: number;
  duplicateFrames: number;
  shotChanges: number;
}

export interface VideoScore {
  filename: string;
  frameCount: number;
  metrics: {
    brightness: number;
    sharpness: number;
    blur: number;
    stability: number;
    actionMotion: number;
    peripheralMotion: number;
    handDetectionRate: number;
    bimanualRate: number;
    avgHandConfidence: number;
    interactionZoneCoverage: number;
    bodyDetectionRate: number;
    bodyVisibility: number;
    limbVisibility: number;
    limbScores: LimbScores;
    shadowClip: number;
    highlightClip: number;
    exposureIntegrity: number;
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

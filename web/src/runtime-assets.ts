const BASE_URL = (() => {
  const base = import.meta.env.BASE_URL || "/";
  return base.endsWith("/") ? base : `${base}/`;
})();

function assetPath(path: string): string {
  return `${BASE_URL}${path.replace(/^\/+/, "")}`;
}

function assetDir(path: string): string {
  const resolved = assetPath(path);
  return resolved.endsWith("/") ? resolved : `${resolved}/`;
}

export const MEDIAPIPE_WASM_ROOT = assetDir("vendor/mediapipe/wasm");
export const HOLISTIC_LANDMARKER_MODEL_URL = assetPath(
  "models/mediapipe/holistic_landmarker.task",
);
export const IMAGE_SEGMENTER_MULTICLASS_MODEL_URL = assetPath(
  "models/mediapipe/selfie_multiclass_256x256.tflite",
);
export const IMAGE_SEGMENTER_LANDSCAPE_MODEL_URL = assetPath(
  "models/mediapipe/selfie_segmenter_landscape.tflite",
);
export const HAND_LANDMARKER_MODEL_URL = assetPath(
  "models/mediapipe/hand_landmarker.task",
);

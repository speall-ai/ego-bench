import type { VideoScore } from "../types.js";

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(score: VideoScore): void {
  const json = JSON.stringify(score, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  triggerDownload(blob, `${score.filename}_benchmark.json`);
}

export function exportCSV(score: VideoScore): void {
  const headers = [
    "frame",
    "timestamp",
    "brightness",
    "sharpness",
    "blur",
    "stability",
    "frame_diff",
    "action_motion",
    "peripheral_motion",
    "shadow_clip",
    "highlight_clip",
    "hand_detected",
    "both_hands_detected",
    "hand_confidence",
    "interaction_zone_coverage",
    "body_detected",
    "body_visibility",
    "limb_visibility",
    "body_landmark_count",
  ];

  const rows: string[] = [headers.join(",")];

  for (let i = 0; i < score.perFrame.length; i++) {
    const f = score.perFrame[i];
    rows.push(
      [
        i,
        f.timestamp.toFixed(3),
        f.brightness.toFixed(2),
        f.sharpness.toFixed(2),
        f.blur.toFixed(2),
        f.stability.toFixed(2),
        f.frameDiff.toFixed(2),
        f.actionMotion.toFixed(2),
        f.peripheralMotion.toFixed(2),
        f.shadowClip.toFixed(2),
        f.highlightClip.toFixed(2),
        f.handDetected ? "true" : "false",
        f.bothHandsDetected ? "true" : "false",
        f.handConfidence.toFixed(4),
        f.interactionZoneCoverage.toFixed(2),
        f.bodyDetected ? "true" : "false",
        f.bodyVisibility.toFixed(2),
        f.limbVisibility.toFixed(2),
        String(f.bodyLandmarkCount),
      ].join(","),
    );
  }

  // Summary row
  rows.push(
    [
      "summary",
      "",
      score.metrics.brightness.toFixed(2),
      score.metrics.sharpness.toFixed(2),
      score.metrics.blur.toFixed(2),
      score.metrics.stability.toFixed(2),
      "",
      score.metrics.actionMotion.toFixed(2),
      score.metrics.peripheralMotion.toFixed(2),
      score.metrics.shadowClip.toFixed(2),
      score.metrics.highlightClip.toFixed(2),
      `${score.metrics.handDetectionRate.toFixed(2)}%`,
      `${score.metrics.bimanualRate.toFixed(2)}%`,
      score.metrics.avgHandConfidence.toFixed(4),
      score.metrics.interactionZoneCoverage.toFixed(2),
      `${score.metrics.bodyDetectionRate.toFixed(2)}%`,
      score.metrics.bodyVisibility.toFixed(2),
      score.metrics.limbVisibility.toFixed(2),
      "",
    ].join(","),
  );

  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  triggerDownload(blob, `${score.filename}_benchmark.csv`);
}

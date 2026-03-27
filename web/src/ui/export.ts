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
    "hand_detected",
    "hand_confidence",
  ];

  const rows: string[] = [headers.join(",")];

  for (let i = 0; i < score.perFrame.length; i++) {
    const f = score.perFrame[i];
    rows.push(
      [
        i,
        "",
        f.brightness.toFixed(2),
        f.sharpness.toFixed(2),
        f.blur.toFixed(2),
        f.stability.toFixed(2),
        f.handDetected ? "true" : "false",
        f.handConfidence.toFixed(4),
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
      `${score.metrics.handDetectionRate.toFixed(2)}%`,
      score.metrics.avgHandConfidence.toFixed(4),
    ].join(","),
  );

  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  triggerDownload(blob, `${score.filename}_benchmark.csv`);
}

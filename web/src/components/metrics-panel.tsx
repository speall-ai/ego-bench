import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { VideoScore } from "@/types";

function Row({ label, value, pct }: { label: string; value: string; pct: number }) {
  const reduced = useReducedMotion();
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="w-20 text-[11px] text-muted">{label}</span>
      <div className="h-px flex-1 bg-border overflow-hidden">
        <motion.div
          initial={reduced ? { width: `${Math.max(1, pct)}%` } : { width: "0%" }}
          animate={{ width: `${Math.max(1, Math.min(100, pct))}%` }}
          transition={reduced ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
          className="h-px bg-text"
        />
      </div>
      <span className="w-8 text-right text-[11px] tabular-nums text-muted">{value}</span>
    </div>
  );
}

function Toggle({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 pt-3 border-t border-border">
      <button onClick={() => setOpen(!open)} className="text-[11px] text-muted hover:text-dim transition-colors">
        {open ? "−" : "+"} {label}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function MetricsPanel({ score }: { score: VideoScore }) {
  const { metrics, audio, temporal, perFrame } = score;

  return (
    <div>
      <Row label="bright" value={metrics.brightness.toFixed(0)} pct={metrics.brightness} />
      <Row label="sharp" value={metrics.sharpness.toFixed(0)} pct={metrics.sharpness} />
      <Row label="clarity" value={metrics.blur.toFixed(0)} pct={metrics.blur} />
      <Row label="stable" value={metrics.stability.toFixed(0)} pct={metrics.stability} />
      <Row label="hands" value={`${metrics.handDetectionRate.toFixed(0)}%`} pct={metrics.handDetectionRate} />

      {audio && (
        <Toggle label="audio">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {([
              ["loudness", `${audio.loudnessLUFS.toFixed(1)} lufs`],
              ["peak", `${audio.peakDb.toFixed(1)} db`],
              ["silence", `${audio.silencePercent.toFixed(1)}%`],
              ["clipping", `${audio.clippingPercent.toFixed(2)}%`],
            ] as const).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-[10px] text-muted">{k}</span>
                <span className="text-[10px] text-dim">{v}</span>
              </div>
            ))}
          </div>
        </Toggle>
      )}

      <Toggle label="temporal">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          {([
            ["consistency", temporal.consistencyScore.toFixed(0)],
            ["flicker", temporal.flickerScore.toFixed(0)],
            ["drops", String(temporal.qualityDrops)],
            ["dupes", String(temporal.duplicateFrames)],
          ] as const).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-[10px] text-muted">{k}</span>
              <span className="text-[10px] text-dim">{v}</span>
            </div>
          ))}
        </div>
      </Toggle>

      {perFrame.length > 0 && (
        <Toggle label={`${perFrame.length} frames`}>
          {(["brightness", "sharpness", "blur"] as const).map((key) => (
            <div key={key} className="flex items-center gap-2 mb-1.5">
              <span className="w-12 text-[9px] text-muted text-right">{key.slice(0, 5)}</span>
              <div className="flex gap-0 flex-1">
                {perFrame.map((f, i) => (
                  <div
                    key={i}
                    className="h-2.5 bg-text"
                    style={{
                      width: `${100 / perFrame.length}%`,
                      minWidth: "1px",
                      opacity: 0.05 + (f[key] / 100) * 0.95,
                    }}
                    title={f[key].toFixed(1)}
                  />
                ))}
              </div>
            </div>
          ))}
        </Toggle>
      )}

      <Toggle label="detailed breakdown">
        <DetailedSection score={score} />
      </Toggle>
    </div>
  );
}

function DetailedSection({ score }: { score: VideoScore }) {
  const { metrics, audio, temporal, perFrame } = score;
  const stabFrames = perFrame.filter((f) => f.stability >= 0);
  const handFrames = perFrame.filter((f) => f.handDetected);

  return (
    <div className="space-y-4 text-[11px] leading-[1.7] text-dim">
      <div>
        <p className="text-text font-medium mb-1">brightness</p>
        <p>
          average luminance across all frames is {metrics.brightness.toFixed(1)} out of 100.
          computed on the gpu using bt.709 weighted luminance (0.2126r + 0.7152g + 0.0722b)
          per pixel, then averaged.
          {metrics.brightness < 30
            ? " footage is underexposed — most frames are too dark for reliable analysis."
            : metrics.brightness > 85
              ? " slightly overexposed — highlights may be clipped in some frames."
              : " exposure is within a normal range."}
          {" "}min frame: {Math.min(...perFrame.map((f) => f.brightness)).toFixed(1)},
          max: {Math.max(...perFrame.map((f) => f.brightness)).toFixed(1)}.
        </p>
      </div>

      <div>
        <p className="text-text font-medium mb-1">sharpness</p>
        <p>
          measured via laplacian variance — a 3×3 convolution kernel [0,1,0; 1,−4,1; 0,1,0]
          applied to grayscale luminance on the gpu. the variance of the output indicates edge
          presence. score: {metrics.sharpness.toFixed(1)}.
          {metrics.sharpness < 30
            ? " focus is soft across most of the video. likely motion blur or missed autofocus."
            : metrics.sharpness > 70
              ? " sharp and well-focused throughout."
              : " acceptable focus with some softer sections."}
        </p>
      </div>

      <div>
        <p className="text-text font-medium mb-1">clarity (blur detection)</p>
        <p>
          sobel gradient magnitude computed per pixel on the gpu — horizontal and vertical
          edge kernels (gx, gy), magnitude = √(gx² + gy²). higher gradients mean sharper
          edges and less blur. score: {metrics.blur.toFixed(1)}.
          {metrics.blur < 40
            ? " significant blur detected — could be motion blur, lens blur, or compression artifacts."
            : " edges are well-defined, no major blur issues."}
        </p>
      </div>

      <div>
        <p className="text-text font-medium mb-1">stability</p>
        <p>
          frame-to-frame motion estimated using block matching on the gpu.
          each frame is divided into 16×16 pixel blocks, and each block is searched
          within a ±4 pixel window in the previous frame using sum of absolute differences (sad).
          the mean displacement across all blocks gives the motion magnitude.
          average: {metrics.stability.toFixed(1)}.
          {stabFrames.length > 0 && (
            <>
              {" "}analyzed {stabFrames.length} frame pairs.
              min stability: {Math.min(...stabFrames.map((f) => f.stability)).toFixed(1)},
              max: {Math.max(...stabFrames.map((f) => f.stability)).toFixed(1)}.
            </>
          )}
          {metrics.stability < 40
            ? " this clip has significant camera shake or motion."
            : metrics.stability > 80
              ? " very stable — tripod or gimbal likely."
              : " some movement but within acceptable range."}
        </p>
      </div>

      <div>
        <p className="text-text font-medium mb-1">hand detection</p>
        <p>
          mediapipe hand landmarker running in-browser via wasm+gpu delegate.
          detects up to 2 hands per frame with 21 landmarks each.
          hands detected in {handFrames.length} of {perFrame.length} frames
          ({metrics.handDetectionRate.toFixed(1)}%).
          {handFrames.length > 0 && (
            <>
              {" "}average confidence when detected: {(metrics.avgHandConfidence * 100).toFixed(1)}%.
              total landmarks tracked: {handFrames.reduce((s, f) => s + f.handLandmarkCount, 0)}.
            </>
          )}
          {metrics.handDetectionRate < 30
            ? " hands are rarely in frame — may indicate camera angle or occlusion issues."
            : " good hand visibility throughout."}
        </p>
      </div>

      {audio && (
        <div>
          <p className="text-text font-medium mb-1">audio</p>
          <p>
            decoded via web audio api and analyzed in mono.
            loudness: {audio.loudnessLUFS.toFixed(1)} lufs (pseudo-lufs via rms, not k-weighted).
            peak: {audio.peakDb.toFixed(1)} db.
            silence: {audio.silencePercent.toFixed(1)}% of 50ms chunks below −50db rms threshold.
            clipping: {audio.clippingPercent.toFixed(3)}% of samples exceeding ±0.99 amplitude.
            overall audio score: {audio.overallScore.toFixed(0)}.
            {audio.overallScore < 50
              ? " audio quality is poor — check mic placement and gain levels."
              : " audio is acceptable."}
          </p>
        </div>
      )}

      <div>
        <p className="text-text font-medium mb-1">temporal consistency</p>
        <p>
          measures frame-to-frame stability of brightness and sharpness values.
          consistency: {temporal.consistencyScore.toFixed(1)} (100 = perfectly smooth, penalized by
          mean absolute difference between consecutive frames).
          flicker: {temporal.flickerScore.toFixed(1)} (detects rapid alternating brightness
          changes {'>'} 5 points across 3-frame windows).
          quality drops: {temporal.qualityDrops} (frames where sharpness drops {'>'} 20 points
          below the running 5-frame average).
          duplicate frames: {temporal.duplicateFrames} (consecutive frames with brightness,
          sharpness, and blur all within 0.1 of each other).
        </p>
      </div>

      <div>
        <p className="text-text font-medium mb-1">scoring</p>
        <p>
          final score is a weighted sum: brightness 15%, sharpness 15%, clarity 15%,
          stability 15%, hand detection rate 20%, hand confidence 5%, audio 5%, temporal 10%.
          all metrics are normalized to 0–100. grade thresholds: a ≥ 90, b ≥ 80, c ≥ 70,
          d ≥ 60, f {'<'} 60. all computation runs locally in your browser via webgpu
          compute shaders and mediapipe wasm. nothing is uploaded.
        </p>
      </div>
    </div>
  );
}

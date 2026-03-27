import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { FramePreview, VideoScore } from "@/types";

function Row({ label, value, pct }: { label: string; value: string; pct: number }) {
  const reduced = useReducedMotion();
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="w-20 text-[13px] text-muted">{label}</span>
      <div className="h-px flex-1 overflow-hidden bg-border">
        <motion.div
          initial={reduced ? { width: `${Math.max(1, pct)}%` } : { width: "0%" }}
          animate={{ width: `${Math.max(1, Math.min(100, pct))}%` }}
          transition={reduced ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
          className="h-px bg-text"
        />
      </div>
      <span className="w-10 text-right text-[13px] tabular-nums text-muted">{value}</span>
    </div>
  );
}

function Toggle({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="text-[13px] text-muted transition-colors hover:text-dim"
      >
        {open ? "−" : "+"} {label}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toFixed(1).padStart(4, "0")}`;
  }
  return `${remainingSeconds.toFixed(1)}s`;
}

function Histogram({ bins }: { bins: number[] }) {
  const maxBin = Math.max(1, ...bins);
  return (
    <div className="space-y-1">
      <div className="flex items-end gap-[2px] rounded-[10px] border border-border bg-bg px-2 py-2">
        {bins.map((bin, index) => (
          <div
            key={index}
            className="flex-1 rounded-[2px] bg-text"
            style={{
              minWidth: "2px",
              height: `${Math.max(8, (bin / maxBin) * 34)}px`,
              opacity: 0.14 + (bin / maxBin) * 0.86,
            }}
            title={`${bin.toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted">
        <span>shadows</span>
        <span>highlights</span>
      </div>
    </div>
  );
}

function FramesSection({
  perFrame,
  previews,
}: {
  perFrame: VideoScore["perFrame"];
  previews: FramePreview[];
}) {
  const reduced = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = Math.min(activeIndex, perFrame.length - 1);
  const activeFrame = perFrame[safeIndex];
  const activePreview = previews[safeIndex];

  if (!activeFrame) return null;

  const combinedClip = activeFrame.shadowClip + activeFrame.highlightClip;

  return (
    <div className="space-y-3">
      <div className="rounded-[18px] border border-border bg-surface p-3">
        <div className="relative overflow-hidden rounded-[14px] border border-border bg-bg">
          <div className="aspect-video">
            {activePreview ? (
              <motion.img
                key={activePreview.src}
                src={activePreview.src}
                alt={`frame ${safeIndex + 1} at ${formatTimestamp(activeFrame.timestamp)}`}
                initial={reduced ? false : { opacity: 0.88, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={reduced ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[12px] text-muted">
                preview unavailable
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-bg/92 px-2 py-1 text-[11px] text-dim backdrop-blur-sm">
            frame {safeIndex + 1}/{perFrame.length}
          </div>
          <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-bg/92 px-2 py-1 text-[11px] text-dim backdrop-blur-sm">
            {formatTimestamp(activeFrame.timestamp)}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {([
            ["bright", activeFrame.brightness.toFixed(0)],
            ["sharp", activeFrame.sharpness.toFixed(0)],
            ["clarity", activeFrame.blur.toFixed(0)],
            ["motion", activeFrame.frameDiff >= 0 ? activeFrame.frameDiff.toFixed(1) : "—"],
            ["action", activeFrame.actionMotion >= 0 ? activeFrame.actionMotion.toFixed(1) : "—"],
            ["edge", activeFrame.peripheralMotion >= 0 ? activeFrame.peripheralMotion.toFixed(1) : "—"],
            ["zone", activeFrame.interactionZoneCoverage.toFixed(0)],
            ["clip", combinedClip.toFixed(1)],
            ["limbs", activeFrame.bodyDetected ? activeFrame.limbVisibility.toFixed(0) : "—"],
            ["stable", activeFrame.stability >= 0 ? activeFrame.stability.toFixed(0) : "—"],
          ] as const).map(([label, value]) => (
            <div key={label} className="rounded-[12px] border border-border bg-bg px-2.5 py-2">
              <div className="text-[10px] uppercase tracking-[0.08em] text-muted">{label}</div>
              <div className="mt-1 text-[13px] tabular-nums text-text">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div className="mb-1 text-[10px] uppercase tracking-[0.08em] text-muted">luma spread</div>
          <Histogram bins={activeFrame.lumaHistogram} />
        </div>
      </div>

      <p className="text-[11px] text-muted">hover or focus a frame bar to inspect the shot, mapped limbs, interaction zone, and wasm motion/exposure stats</p>

      {([
        ["brightness", "light"],
        ["sharpness", "focus"],
        ["blur", "clarity"],
        ["frameDiff", "motion"],
        ["actionMotion", "action"],
        ["peripheralMotion", "edge"],
        ["interactionZoneCoverage", "zone"],
      ] as const).map(([key, label]) => (
        <div key={key} className="flex items-center gap-2">
          <span className="w-12 text-right text-[11px] text-muted">{label}</span>

          <div className="flex flex-1 items-end gap-[2px] rounded-[12px] border border-border bg-surface px-2 py-2">
            {perFrame.map((frame, index) => {
              const value = frame[key];
              const active = index === safeIndex;
              const height = 8 + value * 0.24;
              const opacity = active ? 1 : 0.18 + (value / 100) * 0.52;

              return (
                <button
                  key={`${key}-${index}`}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onClick={() => setActiveIndex(index)}
                  className="relative flex-1 min-w-[4px] rounded-[4px] focus-visible:outline-none"
                  aria-label={`Frame ${index + 1}, ${label} ${value.toFixed(1)}`}
                  title={`${formatTimestamp(frame.timestamp)} · ${value.toFixed(1)}`}
                >
                  <motion.span
                    animate={
                      reduced
                        ? undefined
                        : { y: active ? -2 : 0, scaleX: active ? 1.08 : 1, scaleY: active ? 1.06 : 1 }
                    }
                    transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 340, damping: 26 }}
                    className="block w-full origin-bottom rounded-[3px] bg-text"
                    style={{ height, opacity }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MetricsPanel({ score, previews = [] }: { score: VideoScore; previews?: FramePreview[] }) {
  const { metrics, audio, temporal, perFrame } = score;

  return (
    <div>
      <Row label="bright" value={metrics.brightness.toFixed(0)} pct={metrics.brightness} />
      <Row label="sharp" value={metrics.sharpness.toFixed(0)} pct={metrics.sharpness} />
      <Row label="clarity" value={metrics.blur.toFixed(0)} pct={metrics.blur} />
      <Row label="stable" value={metrics.stability.toFixed(0)} pct={metrics.stability} />
      <Row
        label="zone"
        value={metrics.interactionZoneCoverage.toFixed(0)}
        pct={metrics.interactionZoneCoverage}
      />
      <Row
        label="2 hands"
        value={`${metrics.bimanualRate.toFixed(0)}%`}
        pct={metrics.bimanualRate}
      />
      <Row
        label="exposure"
        value={metrics.exposureIntegrity.toFixed(0)}
        pct={metrics.exposureIntegrity}
      />
      <Row
        label="hands"
        value={`${metrics.handDetectionRate.toFixed(0)}%`}
        pct={metrics.handDetectionRate}
      />
      <Row
        label="body"
        value={`${metrics.bodyDetectionRate.toFixed(0)}%`}
        pct={metrics.bodyDetectionRate}
      />
      <Row
        label="limbs"
        value={metrics.limbVisibility.toFixed(0)}
        pct={metrics.limbVisibility}
      />

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
                <span className="text-[12px] text-muted">{k}</span>
                <span className="text-[12px] text-dim">{v}</span>
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
            ["jerk", temporal.motionJerkScore.toFixed(0)],
            ["drops", String(temporal.qualityDrops)],
            ["dupes", String(temporal.duplicateFrames)],
            ["cuts", String(temporal.shotChanges)],
          ] as const).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-[12px] text-muted">{k}</span>
              <span className="text-[12px] text-dim">{v}</span>
            </div>
          ))}
        </div>
      </Toggle>

      {perFrame.length > 0 && (
        <Toggle label={`${perFrame.length} frames`}>
          <FramesSection perFrame={perFrame} previews={previews} />
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
    <div className="space-y-4 text-[13px] leading-[1.7] text-dim">
      <div>
        <p className="mb-1 font-medium text-text">brightness</p>
        <p>
          average luminance across all frames is {metrics.brightness.toFixed(1)} out of 100.
          computed on the gpu using bt.709 weighted luminance (0.2126r + 0.7152g + 0.0722b)
          per pixel, then averaged.
          average shadow clipping: {metrics.shadowClip.toFixed(1)}%.
          average highlight clipping: {metrics.highlightClip.toFixed(1)}%.
          {metrics.brightness < 30
            ? " footage leans a bit underexposed, so darker sections may hide detail."
            : metrics.brightness > 85
              ? " footage runs a little bright, so highlights may feel compressed."
              : " exposure is within a normal range."}
          {" "}min frame: {Math.min(...perFrame.map((f) => f.brightness)).toFixed(1)},
          max: {Math.max(...perFrame.map((f) => f.brightness)).toFixed(1)}.
        </p>
      </div>

      <div>
        <p className="mb-1 font-medium text-text">sharpness</p>
        <p>
          measured via laplacian variance — a 3×3 convolution kernel [0,1,0; 1,−4,1; 0,1,0]
          applied to grayscale luminance on the gpu. the variance of the output indicates edge
          presence. score: {metrics.sharpness.toFixed(1)}.
          {metrics.sharpness < 30
            ? " focus trends soft through much of the clip, which can happen with motion blur or autofocus drift."
            : metrics.sharpness > 70
              ? " sharp and well-focused throughout."
              : " acceptable focus with some softer sections."}
        </p>
      </div>

      <div>
        <p className="mb-1 font-medium text-text">clarity (blur detection)</p>
        <p>
          sobel gradient magnitude computed per pixel on the gpu — horizontal and vertical
          edge kernels (gx, gy), magnitude = √(gx² + gy²). higher gradients mean sharper
          edges and less blur. score: {metrics.blur.toFixed(1)}.
          {metrics.blur < 40
            ? " noticeable blur is present, which may come from motion, focus, or compression."
            : " edges are well-defined, no major blur issues."}
        </p>
      </div>

      <div>
        <p className="mb-1 font-medium text-text">stability</p>
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
            ? " camera movement is fairly noticeable here."
            : metrics.stability > 80
              ? " very stable — tripod or gimbal likely."
              : " some movement but within acceptable range."}
        </p>
      </div>

      <div>
        <p className="mb-1 font-medium text-text">body mapping</p>
        <p>
          mediapipe holistic landmarker runs in-browser via wasm and maps pose plus both hands in one pass.
          full-body landmarks were found in {perFrame.filter((f) => f.bodyDetected).length} of {perFrame.length} frames
          ({metrics.bodyDetectionRate.toFixed(1)}%).
          average body visibility: {metrics.bodyVisibility.toFixed(1)}.
          average limb visibility: {metrics.limbVisibility.toFixed(1)}.
          hands were still visible in {handFrames.length} of {perFrame.length} frames
          ({metrics.handDetectionRate.toFixed(1)}%).
          {handFrames.length > 0 && (
            <>
              {" "}average confidence when detected: {(metrics.avgHandConfidence * 100).toFixed(1)}%.
              total landmarks tracked: {handFrames.reduce((s, f) => s + f.handLandmarkCount, 0)}.
            </>
          )}
          {metrics.bodyDetectionRate < 40
            ? " full limb coverage drops in and out, which usually means framing or occlusion is limiting the map."
            : " pose and limb coverage are staying in a usable range."}
        </p>
      </div>

      <div>
        <p className="mb-1 font-medium text-text">egocentric signals</p>
        <p>
          lower-center hand interaction coverage averages {metrics.interactionZoneCoverage.toFixed(1)}.
          both hands are visible together in {metrics.bimanualRate.toFixed(1)}% of frames.
          action-zone motion averages {metrics.actionMotion.toFixed(1)}, while peripheral motion averages {metrics.peripheralMotion.toFixed(1)}.
          that separation matters more for first-person footage than a single global motion number: it helps distinguish hand activity in the workspace from whole-scene camera swings.
          {metrics.interactionZoneCoverage < 35
            ? " hand activity is not staying in the main workspace for very long."
            : " hand activity is staying in the expected lower-center workspace."}
        </p>
      </div>

      {audio && (
        <div>
          <p className="mb-1 font-medium text-text">audio</p>
          <p>
            decoded via web audio api and analyzed in mono.
            loudness: {audio.loudnessLUFS.toFixed(1)} lufs (pseudo-lufs via rms, not k-weighted).
            peak: {audio.peakDb.toFixed(1)} db.
            silence: {audio.silencePercent.toFixed(1)}% of 50ms chunks below −50db rms threshold.
            clipping: {audio.clippingPercent.toFixed(3)}% of samples exceeding ±0.99 amplitude.
            overall audio score: {audio.overallScore.toFixed(0)}.
            {audio.overallScore < 50
              ? " audio could be cleaner, and mic placement or gain would likely help."
              : " audio is acceptable."}
          </p>
        </div>
      )}

      <div>
        <p className="mb-1 font-medium text-text">temporal consistency</p>
        <p>
          measures frame-to-frame stability of brightness and sharpness values.
          consistency: {temporal.consistencyScore.toFixed(1)} (100 = perfectly smooth, penalized by
          mean absolute difference between consecutive frames).
          flicker: {temporal.flickerScore.toFixed(1)} (detects rapid alternating brightness
          changes {'>'} 5 points across 3-frame windows).
          motion jerk: {temporal.motionJerkScore.toFixed(1)} (penalizes abrupt changes in peripheral motion, which is a good proxy for sharp egocentric head turns).
          quality drops: {temporal.qualityDrops} (frames where sharpness drops {'>'} 20 points
          below the running 5-frame average).
          duplicate frames: {temporal.duplicateFrames} (consecutive frames with wasm-computed
          mean luminance difference near zero).
          cut candidates: {temporal.shotChanges} (frames where both global and peripheral motion spike strongly).
        </p>
      </div>

      <div>
        <p className="mb-1 font-medium text-text">custom wasm frame analysis</p>
        <p>
          a small custom webassembly module computes a 16-bin luminance histogram, shadow/highlight clipping,
          and separate motion signals for the lower-center interaction zone versus the periphery directly from rgba frame buffers.
          that gives the frames view a more useful hover inspector for first-person footage and gives temporal analysis a better signal than one flat frame-diff number.
        </p>
      </div>

      <div>
        <p className="mb-1 font-medium text-text">scoring</p>
        <p>
          final score is a weighted sum: brightness 10%, sharpness 11%, clarity 11%,
          stability 10%, hand detection rate 12%, hand confidence 4%, body mapping rate 6%,
          limb visibility 7%, interaction-zone coverage 9%, two-hand visibility 5%,
          exposure integrity 7%, audio 4%, temporal 4%.
          all metrics are normalized to 0–100. grade thresholds: a ≥ 90, b ≥ 80, c ≥ 70,
          d ≥ 60, f {'<'} 60. all computation runs locally in your browser via webgpu
          compute shaders and mediapipe wasm. nothing is uploaded.
        </p>
      </div>
    </div>
  );
}

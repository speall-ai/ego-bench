import { useState, useRef } from "react";
import { Sidebar } from "@/components/sidebar";
import { FileUpload } from "@/components/file-upload";
import { AgentStep, type Step } from "@/components/agent-step";
import { Verdict } from "@/components/verdict";
import { MetricsPanel } from "@/components/metrics-panel";
import { exportJSON, exportCSV } from "@/ui/export";

import { initGPU } from "@/gpu/context";
import { BrightnessMetric } from "@/gpu/brightness";
import { SharpnessMetric } from "@/gpu/sharpness";
import { BlurMetric } from "@/gpu/blur";
import { OpticalFlowMetric } from "@/gpu/optical-flow";
import { extractFrames } from "@/video/frame-extractor";
import { HandDetector } from "@/metrics/hand-detection";
import { analyzeAudio } from "@/metrics/audio";
import { analyzeTemporalConsistency } from "@/metrics/temporal";
import { scoreVideo } from "@/metrics/scorer";

import type { VideoScore, FrameMetrics, AudioMetrics } from "@/types";

interface Run {
  name: string;
  score: number;
  grade: string;
  result: VideoScore;
  steps: Step[];
}

export default function App() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [result, setResult] = useState<VideoScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const busy = useRef(false);

  const add = (id: string, label: string) =>
    setSteps((s) => [...s, { id, label, status: "running" as const }]);
  const done = (id: string, r?: string) =>
    setSteps((s) => s.map((x) => (x.id === id ? { ...x, status: "done" as const, result: r } : x)));
  const upd = (id: string, label: string) =>
    setSteps((s) => s.map((x) => (x.id === id ? { ...x, label } : x)));

  function newRun() {
    setFile(null);
    setResult(null);
    setError(null);
    setSteps([]);
    setActiveIndex(null);
  }

  function selectRun(i: number) {
    setActiveIndex(i);
    setResult(runs[i].result);
    setSteps(runs[i].steps);
    setFile(null);
    setError(null);
  }

  async function handleFile(f: File) {
    if (busy.current) return;
    busy.current = true;
    setFile(f);
    setResult(null);
    setError(null);
    setSteps([]);
    setActiveIndex(null);

    try {
      add("gpu", "gpu");
      const device = await initGPU();
      done("gpu");

      add("pipe", "pipelines");
      const [bm, sm, blm, ofm] = await Promise.all([
        BrightnessMetric.create(device),
        SharpnessMetric.create(device),
        BlurMetric.create(device),
        OpticalFlowMetric.create(device),
      ]);
      done("pipe");

      add("hands", "hand model");
      let hd: HandDetector | null = null;
      try { hd = await HandDetector.create(); done("hands"); }
      catch { done("hands", "skipped"); }

      add("audio", "audio");
      const audioP: Promise<AudioMetrics | null> = analyzeAudio(f);

      add("frames", "frames");
      const frames = await extractFrames(f, 1, (p) => upd("frames", `frames ${p.current}/${p.total}`));
      if (!frames.length) { setError("no frames"); return; }
      done("frames", `${frames.length}`);

      add("analyze", "analyzing");
      const fm: FrameMetrics[] = [];
      for (let i = 0; i < frames.length; i++) {
        upd("analyze", `analyzing ${i + 1}/${frames.length}`);
        const fr = frames[i];
        const [b, s, bl] = await Promise.all([bm.compute(fr), sm.compute(fr), blm.compute(fr)]);
        const st = i > 0 ? await ofm.compute(fr, frames[i - 1]) : -1;
        let hDet = false, hConf = 0, hLm = 0;
        if (hd) { const r = hd.detect(fr); hDet = r.detected; hConf = r.confidence; hLm = r.landmarkCount; }
        fm.push({ brightness: b, sharpness: s, blur: bl, stability: st, handDetected: hDet, handConfidence: hConf, handLandmarkCount: hLm });
      }
      done("analyze");

      const audio = await audioP;
      done("audio", audio ? `${audio.overallScore.toFixed(0)}` : "none");

      add("temporal", "temporal");
      const temporal = analyzeTemporalConsistency(fm);
      done("temporal");

      const score = scoreVideo(f.name, fm, audio, temporal);
      setResult(score);

      setSteps((prev) => {
        const final = [...prev];
        setRuns((r) => [...r, { name: f.name, score: score.overallScore, grade: score.grade, result: score, steps: final }]);
        return final;
      });
      setActiveIndex(runs.length);

      bm.destroy(); sm.destroy(); blm.destroy(); ofm.destroy(); hd?.destroy(); device.destroy();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      busy.current = false;
    }
  }

  const showUpload = !file && !result;

  return (
    <div className="flex h-screen bg-bg font-sans">
      <Sidebar runs={runs} activeIndex={activeIndex} onSelect={selectRun} onNew={newRun} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-10 items-center justify-between border-b border-border px-6">
          <span className="text-[11px] text-muted">
            {file?.name ?? result?.filename ?? "ego-bench"}
          </span>
          {result && (
            <div className="flex gap-3">
              <button onClick={() => exportJSON(result)} className="text-[13px] text-muted hover:text-text transition-colors">
                export json
              </button>
              <button onClick={() => exportCSV(result)} className="text-[13px] text-muted hover:text-text transition-colors">
                csv
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {showUpload && (
            <div className="flex flex-1 h-full items-center justify-center">
              <FileUpload onFileSelected={handleFile} />
            </div>
          )}

          {(steps.length > 0 || result) && (
            <div className="mx-auto max-w-md px-8 py-10">
              {steps.length > 0 && (
                <div className="mb-8">
                  {steps.map((s, i) => <AgentStep key={s.id} step={s} index={i} />)}
                </div>
              )}

              {error && <p className="text-[12px] text-text mb-6">{error}</p>}

              {result && (
                <>
                  <div className="h-px bg-border mb-8" />
                  <Verdict score={result} />
                  <div className="h-px bg-border my-8" />
                  <MetricsPanel score={result} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

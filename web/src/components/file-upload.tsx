import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useRef, useState } from "react";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
}

const SPRING = { type: "spring" as const, duration: 0.25, bounce: 0.1 };

function formatSize(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} kb`;
  return `${(b / (1024 * 1024)).toFixed(1)} mb`;
}

export function FileUpload({ onFileSelected }: FileUploadProps) {
  const reduced = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const counter = useRef(0);

  const handle = useCallback(
    (f: File) => {
      if (!f.type.startsWith("video/")) return;
      setFile(f);
      onFileSelected(f);
    },
    [onFileSelected],
  );

  return (
    <div className="w-full max-w-sm space-y-2">
      <motion.div
        animate={reduced ? undefined : over ? { scale: 1.01 } : { scale: 1 }}
        transition={reduced ? { duration: 0 } : SPRING}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e: React.DragEvent) => { e.preventDefault(); counter.current++; setOver(true); }}
        onDragLeave={(e: React.DragEvent) => { e.preventDefault(); counter.current--; if (counter.current === 0) setOver(false); }}
        onDragOver={(e: React.DragEvent) => e.preventDefault()}
        onDrop={(e: React.DragEvent) => { e.preventDefault(); counter.current = 0; setOver(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
        className={`flex cursor-pointer flex-col items-center rounded-lg border border-dashed px-8 py-10 transition-colors duration-150 ${
          over ? "border-text bg-surface" : "border-border hover:border-muted"
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
      >
        <input ref={inputRef} type="file" accept="video/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); if (inputRef.current) inputRef.current.value = ""; }} />

        <motion.svg
          animate={reduced ? undefined : over ? { y: -3, scale: 1.1 } : { y: 0, scale: 1 }}
          transition={reduced ? { duration: 0 } : { type: "spring", duration: 0.3, bounce: 0.15 }}
          className={`mb-3 h-8 w-8 transition-colors duration-150 ${over ? "text-text" : "text-muted"}`}
          fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"
        >
          <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>

        <AnimatePresence initial={false} mode="wait">
          <motion.p key={over ? "drop" : "idle"} initial={reduced ? { opacity: 0 } : { opacity: 0, y: 3 }} animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, y: -3 }} transition={reduced ? { duration: 0 } : { duration: 0.12 }} className="text-[15px] text-dim">
            {over ? "drop here" : "drop video or click"}
          </motion.p>
        </AnimatePresence>
        <p className="mt-1 text-[13px] text-muted">mp4, webm, mov · runs locally</p>
      </motion.div>

      <AnimatePresence>
        {file && (
          <motion.div initial={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }} animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, x: 8 }} transition={reduced ? { duration: 0 } : SPRING} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
            <svg className="h-3.5 w-3.5 text-muted" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] text-dim">{file.name}</p>
              <p className="text-[13px] text-muted">{formatSize(file.size)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

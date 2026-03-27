import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useRef, useState } from "react";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
}

const SPRING = { type: "spring" as const, duration: 0.25, bounce: 0.1 };

function formatSize(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({ onFileSelected }: FileUploadProps) {
  const reduced = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rejected, setRejected] = useState(false);
  const counter = useRef(0);

  const handle = useCallback(
    (f: File) => {
      if (!f.type.startsWith("video/")) {
        setRejected(true);
        setTimeout(() => setRejected(false), 2400);
        return;
      }
      setRejected(false);
      setFile(f);
      onFileSelected(f);
    },
    [onFileSelected],
  );

  return (
    <div className="w-full max-w-lg space-y-3">
      <motion.div
        animate={reduced ? undefined : over ? { scale: 1.01 } : { scale: 1 }}
        transition={reduced ? { duration: 0 } : SPRING}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e: React.DragEvent) => { e.preventDefault(); counter.current++; setOver(true); }}
        onDragLeave={(e: React.DragEvent) => { e.preventDefault(); counter.current--; if (counter.current === 0) setOver(false); }}
        onDragOver={(e: React.DragEvent) => e.preventDefault()}
        onDrop={(e: React.DragEvent) => { e.preventDefault(); counter.current = 0; setOver(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
        className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-8 py-14 transition-all duration-150 ${
          over
            ? "border-accent bg-accent-muted/40"
            : rejected
              ? "border-danger/50 bg-danger-muted/30"
              : "border-border bg-surface hover:border-muted hover:bg-surface-alt"
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
      >
        <input ref={inputRef} type="file" accept="video/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); if (inputRef.current) inputRef.current.value = ""; }} />

        <motion.div
          animate={reduced ? undefined : over ? { y: -4, scale: 1.1 } : { y: 0, scale: 1 }}
          transition={reduced ? { duration: 0 } : { type: "spring", duration: 0.3, bounce: 0.15 }}
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-150 ${
            over ? "bg-accent/15 text-accent" : "bg-surface-alt text-muted"
          }`}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>

        <AnimatePresence initial={false} mode="wait">
          <motion.p
            key={over ? "drop" : rejected ? "rejected" : "idle"}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 3 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -3 }}
            transition={reduced ? { duration: 0 } : { duration: 0.12 }}
            className={`text-[16px] font-medium ${over ? "text-accent" : rejected ? "text-danger" : "text-dim"}`}
          >
            {over ? "Drop to analyze" : rejected ? "Not a video file" : "Drop a video or click to browse"}
          </motion.p>
        </AnimatePresence>

        <p className="mt-2 text-[13px] text-muted">
          MP4, WebM, MOV · runs entirely in your browser
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-success">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Nothing is uploaded
        </span>
      </motion.div>

      <AnimatePresence>
        {file && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: -8 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
            transition={reduced ? { duration: 0 } : SPRING}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-sm"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-muted">
              <svg className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-text">{file.name}</p>
              <p className="text-[12px] text-muted">{formatSize(file.size)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

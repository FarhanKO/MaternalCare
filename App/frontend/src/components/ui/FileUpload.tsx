import { AnimatePresence, motion } from 'framer-motion';
import { Camera, UploadCloud } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { cn } from '@/lib/cn';

/**
 * Drag-and-drop / tap-to-capture file input.
 * Adapted from the KokonutUI file-upload pattern, re-skinned onto our tokens
 * and given a camera path — most prescriptions arrive as a phone photo, not a
 * file already sitting on a disk.
 */

type Status = 'idle' | 'dragging' | 'reading' | 'error';

export interface UploadError { message: string; code: string }

interface Props {
  /** Receives the chosen file plus a base64 data URL ready to POST. */
  onFile: (file: File, dataUrl: string) => void | Promise<void>;
  onError?: (error: UploadError) => void;
  accept?: string[];
  maxBytes?: number;
  /** Colour the dropzone to match the surrounding section. */
  accent?: 'brand' | 'peach';
  /** Shown under the heading — say what belongs here. */
  hint?: string;
  label?: string;
  className?: string;
}

const DEFAULT_ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const DEFAULT_MAX = 5 * 1024 * 1024;

const UNITS = ['bytes', 'KB', 'MB', 'GB'] as const;
export function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return '0 bytes';
  const i = Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${Number.parseFloat((bytes / 1024 ** i).toFixed(i === 0 ? 0 : decimals))} ${UNITS[i]}`;
}

const ACCENT = {
  brand: { ring: 'focus-within:border-brand-400', tint: '#3f66f0', btn: 'bg-brand-500 hover:bg-brand-600' },
  peach: { ring: 'focus-within:border-peach-400', tint: '#fb7534', btn: 'bg-peach-500 hover:bg-peach-600' },
};

/** Idle illustration — a document being lifted into a tray. */
function UploadIllustration({ tint }: { tint: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-14 w-14" fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="45" stroke={tint} strokeOpacity="0.25"
        strokeWidth="2" strokeDasharray="4 5">
        <animateTransform attributeName="transform" type="rotate"
          from="0 50 50" to="360 50 50" dur="70s" repeatCount="indefinite" />
      </circle>
      <path d="M30 42H70C74 42 74 46 74 46V66C74 70 70 70 70 70H30C26 70 26 66 26 66V46C26 42 30 42 30 42Z"
        fill={tint} fillOpacity="0.12" stroke={tint} strokeWidth="2" />
      <path d="M30 42C30 42 35 42 40 42C45 42 45 37 50 37C55 37 55 42 60 42C65 42 70 42 70 42"
        stroke={tint} strokeWidth="2" fill="none" />
      <g>
        <line x1="50" y1="47" x2="50" y2="60" stroke={tint} strokeWidth="2.5" strokeLinecap="round">
          <animate attributeName="y2" values="60;54;60" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="y1" values="47;41;47" dur="2.4s" repeatCount="indefinite" />
        </line>
        <polyline points="43,53 50,46 57,53" stroke={tint} strokeWidth="2.5" fill="none"
          strokeLinecap="round" strokeLinejoin="round">
          <animate attributeName="points"
            values="43,53 50,46 57,53;43,47 50,40 57,47;43,53 50,46 57,53"
            dur="2.4s" repeatCount="indefinite" />
        </polyline>
      </g>
    </svg>
  );
}

/** Progress ring shown while the file is being read into memory. */
function ReadingRing({ progress, tint }: { progress: number; tint: string }) {
  const R = 26;
  const circumference = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14" aria-label={`Reading: ${Math.round(progress)}%`}>
      <circle cx="32" cy="32" r={R} fill="none" stroke={tint} strokeOpacity="0.18" strokeWidth="5" />
      <circle
        cx="32" cy="32" r={R} fill="none" stroke={tint} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress / 100)}
        transform="rotate(-90 32 32)"
        style={{ transition: 'stroke-dashoffset 120ms linear' }}
      />
      <text x="32" y="36" textAnchor="middle" className="fill-ink text-[13px] font-bold">
        {Math.round(progress)}
      </text>
    </svg>
  );
}

export function FileUpload({
  onFile, onError, accept = DEFAULT_ACCEPT, maxBytes = DEFAULT_MAX,
  accent = 'brand', hint, label = 'Upload a file', className,
}: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<UploadError | null>(null);
  const [fileName, setFileName] = useState('');
  const pickRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<FileReader | null>(null);
  const A = ACCENT[accent];

  // a reader still running when the card unmounts would set state on a ghost
  useEffect(() => () => readerRef.current?.abort(), []);

  const fail = useCallback((e: UploadError) => {
    setError(e);
    setStatus('error');
    onError?.(e);
    setTimeout(() => { setError(null); setStatus('idle'); }, 4000);
  }, [onError]);

  const handle = useCallback((file: File | null) => {
    if (!file) return;
    setError(null);

    if (file.size > maxBytes) {
      fail({ code: 'TOO_LARGE', message: `That file is ${formatBytes(file.size)} — the limit is ${formatBytes(maxBytes)}` });
      return;
    }
    if (accept.length && !accept.includes(file.type.toLowerCase())) {
      fail({ code: 'BAD_TYPE', message: 'Use a photo (JPG, PNG, WEBP) or a PDF' });
      return;
    }

    setFileName(file.name);
    setStatus('reading');
    setProgress(0);

    const reader = new FileReader();
    readerRef.current = reader;
    reader.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress((ev.loaded / ev.total) * 100);
    };
    reader.onerror = () => fail({ code: 'READ_FAILED', message: 'That file could not be read' });
    reader.onload = async () => {
      setProgress(100);
      try {
        await onFile(file, String(reader.result));
        setStatus('idle');
        setProgress(0);
      } catch (e) {
        fail({ code: 'UPLOAD_FAILED', message: (e as Error).message });
      }
    };
    reader.readAsDataURL(file);
  }, [accept, maxBytes, fail, onFile]);

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setStatus((s) => (s === 'reading' ? s : 'dragging'));
  };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setStatus((s) => (s === 'dragging' ? 'idle' : s));
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (status === 'reading') return;
    setStatus('idle');
    handle(e.dataTransfer.files?.[0] ?? null);
  };

  return (
    <div className={cn('relative w-full', className)}>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'relative overflow-hidden rounded-3xl border border-dashed bg-white/55 transition',
          status === 'dragging' ? 'border-transparent' : 'border-ink/15',
          error && 'border-rose-400/60',
        )}
        style={status === 'dragging' ? { borderColor: A.tint, background: `${A.tint}0f` } : undefined}
      >
        <div className="relative flex min-h-[200px] flex-col items-center justify-center px-5 py-6">
          <AnimatePresence mode="wait">
            {status === 'reading' ? (
              <motion.div key="reading" initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                className="flex flex-col items-center">
                <ReadingRing progress={progress} tint={A.tint} />
                <div className="mt-3 max-w-[220px] truncate text-[12px] font-bold text-ink">{fileName}</div>
                <div className="text-[11px] font-semibold text-ink-muted">Adding to your record…</div>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                className="flex w-full flex-col items-center">
                <UploadIllustration tint={A.tint} />

                <div className="mt-2.5 text-center">
                  <div className="text-[13px] font-extrabold tracking-tight text-ink">{label}</div>
                  <p className="mt-0.5 text-[11px] font-medium text-ink-muted">
                    {hint ?? 'Photo or PDF'} · up to {formatBytes(maxBytes)}
                  </p>
                </div>

                <div className="mt-3.5 flex w-full max-w-[280px] flex-col gap-1.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => camRef.current?.click()}
                    className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-[12px] font-bold text-white transition', A.btn)}
                  >
                    <Camera className="h-4 w-4" /> Take a photo
                  </button>
                  <button
                    type="button"
                    onClick={() => pickRef.current?.click()}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/70 bg-white/80 px-3 py-2.5 text-[12px] font-bold text-ink-soft transition hover:bg-white hover:text-ink"
                  >
                    <UploadCloud className="h-4 w-4" /> Choose file
                  </button>
                </div>

                <p className="mt-2.5 hidden text-[10px] font-semibold text-ink-faint sm:block">
                  or drop it anywhere in this box
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* capture opens the camera on a phone and falls back to a picker elsewhere */}
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="sr-only"
          aria-label="Take a photo"
          onChange={(e) => { handle(e.target.files?.[0] ?? null); e.target.value = ''; }} />
        <input ref={pickRef} type="file" accept={accept.join(',')} className="sr-only"
          aria-label="Choose a file"
          onChange={(e) => { handle(e.target.files?.[0] ?? null); e.target.value = ''; }} />
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-2 rounded-2xl bg-rose-500/12 px-3 py-2 text-[11px] font-bold text-rose-700 ring-1 ring-rose-500/25"
            role="alert"
          >
            {error.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

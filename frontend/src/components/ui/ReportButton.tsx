import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Download, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';

/**
 * Downloads the maternal health report.
 *
 * One component for both sides: the mother pulls her own record, a clinician
 * passes `patientId` and pulls that patient's. The document is identical —
 * only whose record it is changes.
 *
 * It fetches the bytes rather than pointing an anchor at the endpoint, because
 * the server draws every chart and embeds every filed document before the
 * first byte arrives. A plain link would sit there looking broken for those
 * seconds; this shows an overlay saying what is being assembled.
 */

const STAGES = [
  'Reading her record',
  'Drawing the vital charts',
  'Adding prescriptions and reports',
  'Laying out the pages',
];

interface Props {
  /** omit for "my own record" */
  patientId?: string;
  /** whose report this is, for the overlay copy */
  patientName?: string;
  variant?: 'primary' | 'quiet';
  className?: string;
  label?: string;
}

export function ReportButton({
  patientId, patientName, variant = 'primary', className, label,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  // the stages are a truthful description of the order the server works in,
  // paced so the overlay never sits on one line for the whole wait
  useEffect(() => {
    if (!busy) return undefined;
    setStage(0);
    timer.current = window.setInterval(
      () => setStage((s) => Math.min(STAGES.length - 1, s + 1)),
      900,
    );
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [busy]);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const { blob, filename } = await api.getReport(patientId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // revoked on the next tick so the download has taken the reference
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDone(true);
      setTimeout(() => setDone(false), 3200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the report');
      setTimeout(() => setError(null), 6000);
    } finally {
      setBusy(false);
    }
  };

  const who = patientName ? patientName.split(' ')[0] : 'your';

  return (
    <>
      <button
        onClick={run}
        disabled={busy}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-bold transition disabled:opacity-70',
          variant === 'primary'
            ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_10px_30px_-8px_rgba(63,102,240,0.5)] hover:brightness-105'
            : 'border border-white/60 bg-white/60 text-ink-soft shadow-soft backdrop-blur-md hover:bg-white hover:text-ink',
          className,
        )}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" />
          : done ? <Check className="h-4 w-4" strokeWidth={3} />
            : <Download className="h-4 w-4" />}
        {busy ? 'Building…' : done ? 'Downloaded' : (label ?? 'Download health report')}
      </button>

      {error && (
        <span className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-rose-600">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </span>
      )}

      {/* the wait is long enough to need explaining, so it gets the screen */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {busy && (
            <motion.div
              // pointer-events-none is structural, not defensive: nothing here is
              // clickable, and the pulse ring below animates forever, which stops
              // AnimatePresence ever finishing its exit — so the overlay lingers
              // at opacity 0 and, left interactive, would swallow every click on
              // the page after the first download
              className="pointer-events-none fixed inset-0 z-[150] flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            >
              <div className="absolute inset-0 bg-ink/35 backdrop-blur-md" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                role="status"
                aria-live="polite"
                className="relative w-full max-w-sm rounded-4xl border border-white/70 bg-surface-raised p-7 text-center shadow-float"
              >
                <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-brand-500/12 text-brand-600">
                  <FileText className="h-6 w-6" />
                  <motion.span
                    className="absolute inset-0 rounded-3xl ring-2 ring-brand-500/30"
                    animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </span>

                <div className="mt-4 text-base font-extrabold tracking-tight text-ink">
                  Building {patientName ? `${who}’s` : 'your'} health report
                </div>

                <div className="mt-1 h-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={stage}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.22 }}
                      className="text-[12.5px] font-semibold text-ink-muted"
                    >
                      {STAGES[stage]}…
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-aqua-400"
                    animate={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 160, damping: 26 }}
                  />
                </div>

                <p className="mt-3 text-[11px] font-medium leading-relaxed text-ink-faint">
                  It will save to your downloads when it is ready.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

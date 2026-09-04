import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Pick a reason, optionally write one, confirm.
 *
 * Three places in this app now ask the same question — cancelling a visit,
 * ending a care relationship, and (in its own component, because it also has
 * to show the reported content) reporting a post. The shape is always the
 * same: a fixed list so the service can count causes, and a free box because
 * no list ever covers it.
 *
 * The categories always come from the server. A dropdown that has drifted
 * from the values the model accepts fails at the last click, after somebody
 * has already written their explanation out.
 */

export interface ReasonOption {
  key: string;
  label: string;
  hint?: string;
}

interface Props {
  open: boolean;
  title: string;
  /** one line under the title — what is about to happen */
  intro: ReactNode;
  options: ReasonOption[];
  /** true where the free-text box must be filled before confirming */
  noteRequired?: boolean;
  notePrompt?: string;
  confirmLabel: string;
  /** red for the destructive ones, brand for the rest */
  tone?: 'danger' | 'brand';
  /** anything to show above the buttons — consequences, warnings */
  footnote?: ReactNode;
  onClose: () => void;
  onConfirm: (reason: string, note: string) => Promise<void>;
}

export function ReasonDialog({
  open, title, intro, options, noteRequired = false, notePrompt,
  confirmLabel, tone = 'danger', footnote, onClose, onConfirm,
}: Props) {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // a fresh dialog each time, not the last decision still selected
  useEffect(() => {
    if (open) {
      setReason(null);
      setNote('');
      setBusy(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  const ready = Boolean(reason) && (!noteRequired || note.trim().length >= 10);

  const confirm = async () => {
    if (!reason || !ready) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason, note.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That could not be saved');
      setBusy(false);
    }
  };

  if (typeof document === 'undefined') return null;

  const accent = tone === 'danger'
    ? { ring: 'border-rose-300 bg-rose-500/[0.07]', dot: 'border-rose-500 bg-rose-500', button: 'bg-rose-600 hover:bg-rose-700', focus: 'focus:border-rose-300' }
    : { ring: 'border-brand-300 bg-brand-500/[0.07]', dot: 'border-brand-500 bg-brand-500', button: 'bg-brand-600 hover:bg-brand-700', focus: 'focus:border-brand-300' };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[170] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
        >
          <button aria-label="Close" onClick={() => !busy && onClose()}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-4xl border border-white/70 bg-surface-raised p-6 shadow-float sm:rounded-4xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-extrabold tracking-tight text-ink">{title}</div>
                <div className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{intro}</div>
              </div>
              <button
                onClick={() => !busy && onClose()}
                aria-label="Close"
                className="rounded-xl p-1.5 text-ink-faint transition hover:bg-white/70 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-1.5">
              {options.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setReason(o.key)}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-2xl border p-3 text-left transition',
                    reason === o.key ? accent.ring : 'border-white/60 bg-white/60 hover:bg-white',
                  )}
                >
                  <span className={cn(
                    'mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full border-2',
                    reason === o.key ? accent.dot : 'border-ink/20',
                  )}
                  >
                    {reason === o.key && <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-bold text-ink">{o.label}</span>
                    {o.hint && (
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-muted">
                        {o.hint}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>

            <label className="mt-3 block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                {notePrompt ?? 'In your own words'}
                {noteRequired
                  ? <span className="ml-1 text-rose-600">required</span>
                  : <span className="ml-1 font-semibold normal-case tracking-normal text-ink-faint">(optional)</span>}
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                rows={3}
                placeholder={noteRequired
                  ? 'A line or two — this is shown to them.'
                  : 'Anything you would like them to know.'}
                className={cn(
                  'mt-1.5 w-full resize-none rounded-2xl border border-white/60 bg-white/70 px-3.5 py-2.5 text-[12.5px] text-ink outline-none transition focus:bg-white',
                  accent.focus,
                )}
              />
              {noteRequired && note.trim().length > 0 && note.trim().length < 10 && (
                <span className="mt-1 block text-[11px] font-semibold text-rose-600">
                  A little more than that, please.
                </span>
              )}
            </label>

            {footnote && (
              <div className="mt-3 rounded-2xl bg-ink/[0.04] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-ink-muted">
                {footnote}
              </div>
            )}

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-rose-500/10 px-3.5 py-2.5 ring-1 ring-rose-500/25">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-rose-600" />
                <span className="text-[12px] font-semibold text-ink-soft">{error}</span>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => !busy && onClose()}
                className="flex-1 rounded-2xl border border-white/60 bg-white/60 py-2.5 text-[13px] font-bold text-ink-soft transition hover:bg-white hover:text-ink"
              >
                Never mind
              </button>
              <button
                onClick={confirm}
                disabled={!ready || busy}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-[13px] font-bold text-white transition disabled:opacity-50',
                  accent.button,
                )}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Flag, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import type { ReportReason } from '@/data/records';

/**
 * Reporting a post or a comment.
 *
 * The board has promised "Posts are moderated · clinician-reviewed" since it
 * was written, with nothing behind it — no way to report anything, no queue,
 * no removal. This is the half of that promise a member can see.
 *
 * The reason list comes from the server rather than being restated here, so
 * the categories the moderation queue weighs and the categories she is offered
 * cannot drift apart.
 *
 * It asks for a reason before it will send. A one-tap report gives a moderator
 * a pile of items and no idea what is wrong with any of them, and on this
 * board the difference between "rude" and "telling someone to stop their
 * medication" is the difference between reading it today and reading it next
 * week.
 */

export interface ReportTarget {
  kind: 'posts' | 'comments';
  id: string;
  /** what is being reported, shown back so she can see she has the right one */
  preview: string;
  author: string;
}

interface Props {
  target: ReportTarget | null;
  reasons: ReportReason[];
  onClose: () => void;
  /** called once the report is filed, so the board can mark it reported */
  onFiled: (target: ReportTarget) => void;
}

export function ReportDialog({
  target, reasons, onClose, onFiled,
}: Props) {
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  // a fresh dialog every time, rather than last report's reason pre-selected
  useEffect(() => {
    if (target) {
      setReason(null);
      setDetail('');
      setState('idle');
      setError(null);
    }
  }, [target]);

  useEffect(() => {
    if (!target) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  const send = async () => {
    if (!target || !reason) return;
    setState('sending');
    setError(null);
    try {
      await api.reportContent(target.kind, target.id, {
        reason,
        detail: detail.trim() || undefined,
      });
      setState('done');
      onFiled(target);
      setTimeout(onClose, 1600);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'That report could not be sent';
      // already reported is a state, not a failure — say so and close
      if (/already reported/i.test(message)) {
        setState('done');
        onFiled(target);
        setTimeout(onClose, 1600);
        return;
      }
      setError(message);
      setState('idle');
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {target && (
        <motion.div
          className="fixed inset-0 z-[160] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
        >
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Report this content"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-4xl border border-white/70 bg-surface-raised p-6 shadow-float sm:rounded-4xl"
          >
            {state === 'done' ? (
              <div className="py-6 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-emerald-500/12 text-emerald-600">
                  <Check className="h-6 w-6" strokeWidth={3} />
                </span>
                <div className="mt-4 text-base font-extrabold tracking-tight text-ink">
                  Thank you — a clinician will read this
                </div>
                <p className="mx-auto mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-ink-muted">
                  It stays visible until someone has looked at it. You will not be shown
                  as the person who reported it.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/12 text-rose-600">
                      <Flag className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <div className="text-sm font-extrabold text-ink">Report this</div>
                      <div className="text-[11.5px] font-semibold text-ink-muted">
                        {target.kind === 'posts' ? 'Post' : 'Reply'} by {target.author}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="rounded-xl p-1.5 text-ink-faint transition hover:bg-white/70 hover:text-ink"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* shown back, so she can see she has the right item */}
                <p className="mt-3 line-clamp-3 rounded-2xl bg-ink/[0.04] px-3.5 py-2.5 text-[12px] italic leading-relaxed text-ink-soft">
                  “{target.preview}”
                </p>

                <div className="mt-4 space-y-1.5">
                  {reasons.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setReason(r.key)}
                      className={cn(
                        'flex w-full items-start gap-2.5 rounded-2xl border p-3 text-left transition',
                        reason === r.key
                          ? 'border-rose-300 bg-rose-500/[0.07]'
                          : 'border-white/60 bg-white/60 hover:bg-white',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full border-2',
                          reason === r.key ? 'border-rose-500 bg-rose-500' : 'border-ink/20',
                        )}
                      >
                        {reason === r.key && <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12.5px] font-bold text-ink">{r.label}</span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-muted">
                          {r.hint}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>

                <label className="mt-3 block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                    Anything else? (optional)
                  </span>
                  <textarea
                    value={detail}
                    onChange={(e) => setDetail(e.target.value.slice(0, 500))}
                    rows={2}
                    placeholder="What should the reviewer know?"
                    className="mt-1.5 w-full resize-none rounded-2xl border border-white/60 bg-white/70 px-3.5 py-2.5 text-[12.5px] text-ink outline-none transition focus:border-rose-300 focus:bg-white"
                  />
                </label>

                {error && (
                  <div className="mt-2 flex items-start gap-2 rounded-2xl bg-rose-500/10 px-3.5 py-2.5 ring-1 ring-rose-500/25">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-rose-600" />
                    <span className="text-[12px] font-semibold text-ink-soft">{error}</span>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 rounded-2xl border border-white/60 bg-white/60 py-2.5 text-[13px] font-bold text-ink-soft transition hover:bg-white hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={send}
                    disabled={!reason || state === 'sending'}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 py-2.5 text-[13px] font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                  >
                    {state === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send report
                  </button>
                </div>

                <p className="mt-3 text-[10.5px] font-medium leading-relaxed text-ink-faint">
                  Reports go to a registered clinician. If something is an emergency for you
                  right now, use the SOS button instead — this queue is not watched minute
                  by minute.
                </p>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

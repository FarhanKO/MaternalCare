import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, CalendarDays, Check, Clock, Loader2, X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { prettyDate, prettyTime, type Appointment } from '@/data/care';

/**
 * Moving an appointment to a different slot.
 *
 * The missing third of F11. Reserving and cancelling both existed; a mother
 * whose Tuesday stopped working had exactly one move available to her, which
 * was to cancel and rejoin the queue at the back — behind everyone who had not
 * had to change anything.
 *
 * It offers the clinician's real free times, read from the same endpoint the
 * booking flow uses, so the day she picks is a day she can actually have.
 */

/** Local calendar date, n days from today. toISOString() would shift the day. */
function isoIn(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const DAYS = Array.from({ length: 14 }, (_, i) => isoIn(i + 1));

interface Props {
  appointment: Appointment | null;
  /** 'mother' from her own list, 'doctor' from the clinician's inbox */
  side?: 'mother' | 'doctor';
  /** required when the clinician is the one moving it */
  doctorId?: string;
  onClose: () => void;
  onMoved: (updated: Appointment) => void;
}

export function RescheduleDialog({
  appointment, side = 'mother', doctorId, onClose, onMoved,
}: Props) {
  const [date, setDate] = useState<string>(DAYS[0]);
  const [times, setTimes] = useState<string[]>([]);
  const [time, setTime] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appointment) {
      setDate(DAYS[0]);
      setTime(null);
      setReason('');
      setError(null);
      setBusy(false);
    }
  }, [appointment]);

  const loadSlots = useCallback(async (d: string) => {
    if (!appointment) return;
    setLoadingSlots(true);
    setTime(null);
    try {
      const s = await api.getSlots(appointment.doctorId, d);
      setTimes(s.times);
    } catch {
      setTimes([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [appointment]);

  useEffect(() => { if (appointment) loadSlots(date); }, [appointment, date, loadSlots]);

  const move = async () => {
    if (!appointment || !time) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.rescheduleAppointment(appointment.id, {
        date, time, reason: reason.trim() || undefined, side, doctorId,
      });
      onMoved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That appointment could not be moved');
      // whoever took the slot did so while she was choosing — show the truth
      loadSlots(date);
      setBusy(false);
    }
  };

  if (typeof document === 'undefined') return null;

  const movesLeft = appointment ? Math.max(0, 3 - appointment.moves) : 0;

  return createPortal(
    <AnimatePresence>
      {appointment && (
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
            aria-label="Move this appointment"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-4xl border border-white/70 bg-surface-raised p-6 shadow-float sm:rounded-4xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-extrabold tracking-tight text-ink">
                  Move this appointment
                </div>
                <div className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
                  {appointment.doctorName} · currently {prettyDate(appointment.date)}
                  {appointment.time ? ` at ${prettyTime(appointment.time)}` : ''}
                </div>
              </div>
              <button onClick={() => !busy && onClose()} aria-label="Close"
                className="rounded-xl p-1.5 text-ink-faint transition hover:bg-white/70 hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* which day */}
            <div className="mt-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                <CalendarDays className="h-3.5 w-3.5" /> Pick a day
              </span>
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                {DAYS.map((d) => {
                  const day = new Date(`${d}T00:00:00`);
                  return (
                    <button
                      key={d}
                      onClick={() => setDate(d)}
                      className={cn(
                        'flex-none rounded-2xl border px-3 py-2 text-center transition',
                        date === d
                          ? 'border-brand-300 bg-brand-500/10'
                          : 'border-white/60 bg-white/60 hover:bg-white',
                      )}
                    >
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                        {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                      </span>
                      <span className={cn('block text-[13px] font-extrabold',
                        date === d ? 'text-brand-700' : 'text-ink')}
                      >
                        {day.getDate()}
                      </span>
                      <span className="block text-[9.5px] font-semibold text-ink-faint">
                        {day.toLocaleDateString('en-GB', { month: 'short' })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* which time */}
            <div className="mt-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                <Clock className="h-3.5 w-3.5" /> Free times
              </span>
              {loadingSlots ? (
                <p className="py-5 text-center text-[12px] font-semibold text-ink-faint">
                  Checking their diary…
                </p>
              ) : times.length === 0 ? (
                <p className="py-5 text-center text-[12px] font-semibold text-ink-muted">
                  Nothing free that day — try another.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {times.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTime(t)}
                      className={cn(
                        'rounded-xl border py-2 text-[12px] font-bold transition',
                        time === t
                          ? 'border-brand-300 bg-brand-500/10 text-brand-700'
                          : 'border-white/60 bg-white/60 text-ink-soft hover:bg-white hover:text-ink',
                      )}
                    >
                      {prettyTime(t)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="mt-4 block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                Why the change?
                <span className="ml-1 font-semibold normal-case tracking-normal">(optional)</span>
              </span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 500))}
                placeholder={side === 'doctor' ? 'The patient will see this' : 'The clinic will see this'}
                className="mt-1.5 w-full rounded-2xl border border-white/60 bg-white/70 px-3.5 py-2.5 text-[12.5px] text-ink outline-none transition focus:border-brand-300 focus:bg-white"
              />
            </label>

            {side === 'mother' && (
              <p className="mt-3 rounded-2xl bg-ink/[0.04] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-ink-muted">
                {movesLeft > 0
                  ? `You can move this ${movesLeft} more time${movesLeft === 1 ? '' : 's'} before you need to talk to the clinic. Your place in the queue is kept.`
                  : 'You have moved this as many times as the clinic allows — message them instead.'}
              </p>
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
                Keep it as it is
              </button>
              <button
                onClick={move}
                disabled={!time || busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-600 py-2.5 text-[13px] font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Move it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Loader2, Minus, Plus, X } from 'lucide-react';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import type { DailyLogEntry, VitalReading } from '@/data/records';
import {
  METRICS, MOOD_CHOICES, checkInStatus, lastKnown, todaysValues,
  type CheckInDraft, type Metric, type MetricKey,
} from '@/lib/checkin';

/**
 * The daily check-in sheet.
 *
 * Everything the dashboard charts is entered here. Kicks, mood and water were
 * already reachable from the overview cards; weight, blood pressure, the
 * baby's heartbeat and sleep had nowhere to be entered at all, which is why
 * three of the trend charts were drawing sample arrays.
 *
 * A row is only sent if it was actually touched or already had a value —
 * pressing Save must never invent a blood pressure she did not measure.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  today: DailyLogEntry | undefined;
  /** the recent daily logs, so the header can say how long the gap has been */
  logHistory: DailyLogEntry[];
  readings: VitalReading[];
  /** re-fetch the series so the charts pick the new numbers up */
  onSaved: () => void;
}

/** Rounds away the float noise 0.1 + 0.2 leaves behind. */
const round = (v: number, dp: number) => Number(v.toFixed(dp));
const show = (v: number, dp: number) =>
  (dp === 0 ? String(Math.round(v)) : String(round(v, dp)).replace(/\.?0+$/, '') || '0');

function Stepper({
  metric, value, seeded, onNudge, onClear,
}: {
  metric: Metric;
  value: number | undefined;
  /** what the − / + buttons start from when nothing is entered yet */
  seeded: number;
  /**
   * Steps the value in the parent's state. It takes a direction rather than a
   * number because two taps in the same frame would otherwise both read the
   * same stale value and the second increment would be lost.
   */
  onNudge: (dir: 1 | -1) => void;
  /**
   * Undo an entry made in this sitting. Absent once a value is on the record,
   * because this sheet writes readings and cannot retract one — offering an X
   * that silently does nothing would be worse than not offering it.
   */
  onClear: (() => void) | null;
}) {
  const filled = value !== undefined;
  const current = filled ? value : seeded;

  const nudge = (dir: 1 | -1) => onNudge(dir);

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-2xl border p-3 transition',
      filled ? 'border-brand-200/70 bg-brand-50/60' : 'border-white/60 bg-white/55',
    )}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13.5px] font-bold text-ink">{metric.label}</span>
          {filled
            ? <Check className="h-3.5 w-3.5 flex-none text-brand-600" strokeWidth={3} />
            : <span className="flex-none rounded-full bg-ink/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-faint">
              not logged
            </span>}
        </div>
        <div className="mt-0.5 truncate text-[11px] font-medium text-ink-muted">{metric.hint}</div>
      </div>

      <div className="flex flex-none items-center gap-1.5">
        <button
          type="button"
          aria-label={`Decrease ${metric.label}`}
          onClick={() => nudge(-1)}
          className="grid h-8 w-8 place-items-center rounded-xl bg-white/80 text-ink-soft shadow-soft transition hover:text-ink active:scale-95"
        >
          <Minus className="h-4 w-4" />
        </button>

        <div className="w-[4.5rem] text-center">
          <div className={cn('text-[15px] font-extrabold tabular-nums',
            filled ? 'text-ink' : 'text-ink-faint')}>
            {show(current, metric.dp)}
          </div>
          <div className="text-[9px] font-bold uppercase tracking-wide text-ink-faint">{metric.unit}</div>
        </div>

        <button
          type="button"
          aria-label={`Increase ${metric.label}`}
          onClick={() => nudge(1)}
          className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500 text-white shadow-soft transition hover:bg-brand-600 active:scale-95"
        >
          <Plus className="h-4 w-4" />
        </button>

        <button
          type="button"
          aria-label={`Clear ${metric.label}`}
          disabled={!onClear}
          onClick={() => onClear?.()}
          className={cn('grid h-8 w-8 place-items-center rounded-xl transition',
            onClear ? 'text-ink-faint hover:bg-white/70 hover:text-ink' : 'opacity-0')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function DailyCheckIn({
  open, onClose, today, logHistory, readings, onSaved,
}: Props) {
  const saved = useMemo(() => todaysValues(today, readings), [today, readings]);
  const [draft, setDraft] = useState<CheckInDraft>(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // reopening should show what is on the record, not last time's half-edit
  useEffect(() => {
    if (open) { setDraft(saved); setError(null); }
  }, [open, saved]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  const status = checkInStatus(today, logHistory, readings);
  const filledCount = METRICS.filter((m) => draft[m.key] !== undefined).length
    + (draft.mood ? 1 : 0);

  const clear = (key: MetricKey) =>
    setDraft((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });

  /** Steps one metric, reading the value from the draft React is holding. */
  const nudge = (m: Metric, dir: 1 | -1, seeded: number) =>
    setDraft((d) => {
      const from = d[m.key] ?? seeded;
      const next = Math.min(m.max, Math.max(m.min, from + dir * m.step));
      return { ...d, [m.key]: round(next, m.dp) };
    });

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      // only what changed goes over the wire. Re-sending a blood pressure that
      // is already on today's record would file a second, identical reading.
      const vitals: Record<string, number> = {};
      const log: Record<string, number | string> = {};
      for (const m of METRICS) {
        const v = draft[m.key];
        if (v === undefined || v === saved[m.key]) continue;
        if (m.store === 'vitals') vitals[m.key] = v;
        else log[m.key] = v;
      }
      if (draft.mood && draft.mood !== saved.mood) log.mood = draft.mood;

      // two stores, two writes — vitals is a reading, the log is a day
      if (Object.keys(vitals).length) await api.addVital(vitals);
      if (Object.keys(log).length) await api.saveDailyLog(log);

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your check-in');
    } finally {
      setBusy(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[125] flex items-center justify-center p-4"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.22 } }}
        >
          <motion.div
            className="absolute inset-0 bg-ink/35"
            onClick={() => !busy && onClose()}
            initial={{ opacity: 0, backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />

          <motion.div
            role="dialog" aria-modal="true" aria-label="Daily check-in"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass-strong ring-gradient relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-4xl"
          >
            <div className="flex items-start justify-between gap-3 px-6 pt-6">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-ink">Daily check-in</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {filledCount} of {status.total} recorded for today.
                  {status.daysSinceLog >= 2 && ` Nothing logged for ${status.daysSinceLog} days.`}
                </p>
              </div>
              <button onClick={() => !busy && onClose()} aria-label="Close"
                className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white/70 text-ink-soft transition-colors hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* progress */}
            <div className="mt-4 px-6">
              <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-aqua-400"
                  animate={{ width: `${(filledCount / status.total) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                />
              </div>
            </div>

            <div className="mt-4 flex-1 space-y-2 overflow-y-auto px-6 pb-2">
              {METRICS.map((m) => {
                const seeded = lastKnown(readings, m.key) ?? m.fallback;
                return (
                  <Stepper
                    key={m.key}
                    metric={m}
                    value={draft[m.key]}
                    seeded={seeded}
                    onNudge={(dir) => nudge(m, dir, seeded)}
                    onClear={saved[m.key] === undefined && draft[m.key] !== undefined
                      ? () => clear(m.key)
                      : null}
                  />
                );
              })}

              {/* mood is a choice, not a number */}
              <div className={cn('rounded-2xl border p-3 transition',
                draft.mood ? 'border-brand-200/70 bg-brand-50/60' : 'border-white/60 bg-white/55')}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13.5px] font-bold text-ink">How you feel</span>
                  {draft.mood
                    ? <Check className="h-3.5 w-3.5 text-brand-600" strokeWidth={3} />
                    : <span className="rounded-full bg-ink/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-faint">
                      not logged
                    </span>}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {MOOD_CHOICES.map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setDraft((d) => ({
                        ...d,
                        mood: d.mood === mood && !saved.mood ? undefined : mood,
                      }))}
                      className={cn(
                        'rounded-xl px-2.5 py-1.5 text-[12px] font-bold ring-1 transition',
                        draft.mood === mood
                          ? 'bg-brand-500 text-white ring-brand-500'
                          : 'bg-white/70 text-ink-soft ring-transparent hover:text-ink',
                      )}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="mx-6 mt-2 flex items-start gap-2 rounded-2xl bg-rose-500/10 px-3.5 py-2.5 ring-1 ring-rose-500/25">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-rose-600" />
                <span className="text-[12.5px] font-semibold leading-relaxed text-ink-soft">{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-white/50 px-6 py-4">
              <span className="text-[11.5px] font-semibold text-ink-muted">
                Only what you fill in gets saved.
              </span>
              <LiquidButton
                size="md"
                onClick={save}
                icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              >
                {busy ? 'Saving…' : dirty ? 'Save check-in' : 'Done'}
              </LiquidButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

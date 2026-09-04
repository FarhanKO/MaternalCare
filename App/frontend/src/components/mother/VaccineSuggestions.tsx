import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Baby, Check, ChevronRight, Info, Plus, ShieldCheck, Syringe, X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { AXIS, STAGE_LABEL, vaccinesFor, type Vaccine } from '@/data/vaccines';
import { KIND_COLOR, type Reminder } from '@/data/reminders';

/**
 * The suggested-vaccine catalogue.
 *
 * Marking a dose done was already possible; deciding *which* dose she needed
 * was not — she had to know the schedule before the app could help her keep
 * it. This lists what is commonly recommended for her stage, explains each one
 * and shows its window on a scale, then writes the chosen one into her own
 * schedule as a reminder she can move or delete like any other.
 *
 * Every screen here says a clinician confirms the timing. The catalogue is a
 * reference, and presenting it as instruction would be overstepping.
 */

const VAX = KIND_COLOR.vaccination;

/**
 * The timing diagram: the whole stage as a rail, each dose window as a band.
 *
 * A date would be a guess — the recommendation is a window, so the window is
 * what is drawn.
 */
function WindowDiagram({ vaccine }: { vaccine: Vaccine }) {
  const axis = AXIS[vaccine.axis];
  const span = axis.max - axis.min;
  const pct = (v: number) => ((v - axis.min) / span) * 100;

  // "months before conception" counts down, so the rail reads right to left
  const reversed = vaccine.axis === 'before-conception-months';
  const left = (from: number, to: number) => (reversed ? pct(axis.max - to) : pct(from));
  const width = (from: number, to: number) => Math.max(2.5, pct(to) - pct(from));

  return (
    <div className="rounded-3xl border border-white/60 bg-white/60 p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
        {axis.label}
      </div>

      <div className="relative mt-6 h-2 rounded-full bg-ink/[0.07]">
        {vaccine.doses.map((d, i) => (
          <motion.div
            key={d.label}
            className="absolute top-0 h-2 rounded-full"
            style={{ left: `${left(d.from, d.to)}%`, background: VAX }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: `${width(d.from, d.to)}%`, opacity: 1 }}
            transition={{ delay: 0.12 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}

        {/* dose labels, alternating above and below so they never collide */}
        {vaccine.doses.map((d, i) => (
          <motion.div
            key={`${d.label}-tag`}
            className="absolute whitespace-nowrap text-[10px] font-extrabold"
            style={{
              left: `${left(d.from, d.to) + width(d.from, d.to) / 2}%`,
              transform: 'translateX(-50%)',
              top: i % 2 === 0 ? -18 : 14,
              color: VAX,
            }}
            initial={{ opacity: 0, y: i % 2 === 0 ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.12 }}
          >
            {d.label}
          </motion.div>
        ))}
      </div>

      {/* the scale itself */}
      <div className="relative mt-9 h-4">
        {axis.ticks.map((t) => (
          <span
            key={t}
            className="absolute -translate-x-1/2 text-[9.5px] font-bold text-ink-faint"
            style={{ left: `${reversed ? 100 - pct(t) : pct(t)}%` }}
          >
            {t}{axis.unit}
          </span>
        ))}
      </div>

      <p className="mt-1 text-[12px] font-semibold leading-relaxed text-ink-soft">{vaccine.timing}</p>
    </div>
  );
}

/* ------------------------------------------------------------- the sheet */

interface Props {
  open: boolean;
  onClose: () => void;
  /** her life stage, which decides the list */
  stage: string;
  /** already on her schedule, so nothing is offered twice */
  reminders: Reminder[];
  /** adds one to her schedule */
  onAdd: (reminder: Omit<Reminder, 'id'>) => void;
}

/** A reminder a fortnight out, at 10am — a time a clinic is actually open. */
function defaultWhen() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

export function VaccineSuggestions({ open, onClose, stage, reminders, onAdd }: Props) {
  const [picked, setPicked] = useState<Vaccine | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => { if (!open) { setPicked(null); setAdded(null); } }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (picked) setPicked(null); else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, picked, onClose]);

  const list = vaccinesFor(stage);
  const already = (v: Vaccine) =>
    reminders.some((r) => r.kind === 'vaccination'
      && r.title.toLowerCase().includes(v.short.toLowerCase()));

  const add = (v: Vaccine) => {
    onAdd({
      kind: 'vaccination',
      title: v.name,
      note: `${v.protects}. ${v.timing}`,
      at: defaultWhen(),
      repeat: 'once',
    });
    setAdded(v.id);
    setTimeout(() => { setPicked(null); setAdded(null); }, 1100);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[125] flex items-center justify-center p-4"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.2 } }}
        >
          <motion.div
            className="absolute inset-0 bg-ink/35"
            onClick={onClose}
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(18px)' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Suggested vaccines"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass-strong ring-gradient relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-4xl"
          >
            {/* header */}
            <div className="flex items-start justify-between gap-3 px-6 pt-6">
              <div className="flex min-w-0 items-start gap-3">
                {picked && (
                  <button
                    onClick={() => setPicked(null)}
                    aria-label="Back to the list"
                    className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-xl bg-white/70 text-ink-soft transition hover:text-ink"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="min-w-0">
                  <h2 className="text-xl font-extrabold tracking-tight text-ink">
                    {picked ? picked.name : 'Suggested vaccines'}
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    {picked
                      ? picked.protects
                      : `Commonly recommended while you are ${STAGE_LABEL[stage] ?? 'pregnant'}.`}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white/70 text-ink-soft transition hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto px-6 pb-2">
              {/*
                No AnimatePresence around this swap. Nested inside the modal's
                own presence tree, a `mode="wait"` exit never completed — the
                header and footer switched to the chosen vaccine while the body
                still showed the list. Keying the panel swaps it immediately and
                still animates in.
              */}
              {!picked ? (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-2"
                  >
                    {list.map((v) => {
                      const on = already(v);
                      return (
                        <button
                          key={v.id}
                          onClick={() => setPicked(v)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-white/60 bg-white/60 p-3 text-left transition hover:bg-white"
                        >
                          <span
                            className="grid h-10 w-10 flex-none place-items-center rounded-2xl"
                            style={{ background: `${VAX}1f`, color: VAX }}
                          >
                            {v.forBaby ? <Baby className="h-5 w-5" /> : <Syringe className="h-5 w-5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[13.5px] font-extrabold text-ink">{v.name}</span>
                              {on && (
                                <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                                  On your schedule
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block text-[11.5px] font-medium leading-relaxed text-ink-muted">
                              {v.protects}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 flex-none text-ink-faint" />
                        </button>
                      );
                    })}

                    {list.length === 0 && (
                      <p className="rounded-2xl border border-dashed border-ink/15 px-4 py-8 text-center text-[12px] font-semibold text-ink-muted">
                        No suggestions for this stage yet.
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key={picked.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-3"
                  >
                    <p className="text-[13.5px] leading-relaxed text-ink-soft">{picked.detail}</p>

                    <WindowDiagram vaccine={picked} />

                    {picked.caution && (
                      <div className="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 px-3.5 py-3 ring-1 ring-amber-500/25">
                        <Info className="mt-0.5 h-4 w-4 flex-none text-amber-600" />
                        <p className="text-[12px] font-semibold leading-relaxed text-ink-soft">
                          {picked.caution}
                        </p>
                      </div>
                    )}

                    {picked.forBaby && (
                      <div className="flex items-start gap-2.5 rounded-2xl bg-brand-500/[0.07] px-3.5 py-3 ring-1 ring-brand-500/20">
                        <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-brand-600" />
                        <p className="text-[12px] font-semibold leading-relaxed text-ink-soft">
                          This one is mostly about the baby rather than you.
                        </p>
                      </div>
                    )}
                  </motion.div>
              )}
            </div>

            {/* footer */}
            <div className="border-t border-white/50 px-6 py-4">
              {picked ? (
                <>
                  <button
                    onClick={() => add(picked)}
                    disabled={added === picked.id}
                    className={cn(
                      'inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white transition',
                      added === picked.id
                        ? 'bg-emerald-600'
                        : 'bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-105',
                    )}
                  >
                    {added === picked.id
                      ? <><Check className="h-[18px] w-[18px]" strokeWidth={3} /> Added to your schedule</>
                      : <><Plus className="h-[18px] w-[18px]" /> Add in vaccine schedule</>}
                  </button>
                  <p className="mt-2 text-center text-[10.5px] font-medium leading-relaxed text-ink-faint">
                    Added two weeks out so it is on your list — move it to the date your clinic gives you.
                  </p>
                </>
              ) : (
                <p className="text-center text-[11px] font-medium leading-relaxed text-ink-faint">
                  A reference list, not a prescription. Your clinician confirms what you need and when.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

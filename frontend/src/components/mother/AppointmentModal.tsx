import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity, Bell, Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, Clock, Dumbbell,
  Pill, Plus, Repeat, Stethoscope, TestTube, Trash2, X,
} from 'lucide-react';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { cn } from '@/lib/cn';
import {
  countdown, formatDay, formatTime, KIND_COLOR, KIND_LABEL, KIND_ORDER, KIND_SHORT,
  KIND_SUGGESTIONS, sameDay, startOfDay, upcoming, type Reminder, type ReminderKind,
} from '@/data/reminders';

const KIND_ICON: Record<ReminderKind, any> = {
  medicine: Pill, doctor: Stethoscope, test: TestTube, exercise: Dumbbell,
};

const uid = () => `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Phase = 'list' | 'calendar' | 'clock';

interface Props {
  open: boolean;
  onClose: () => void;
  reminders: Reminder[];
  onChange: (list: Reminder[]) => void;
}

/* ---------------- month grid ---------------- */
function MonthGrid({
  month, onMonthChange, selected, onPick, reminders,
}: {
  month: Date; onMonthChange: (d: Date) => void; selected: Date | null;
  onPick: (d: Date) => void; reminders: Reminder[];
}) {
  const today = startOfDay(new Date());
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  // Monday-first offset
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (n: number) => onMonthChange(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-extrabold tracking-tight text-ink">
            {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </div>
          <div className="text-[11px] font-semibold text-ink-muted">Pick a day for your reminder</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => shift(-1)} aria-label="Previous month"
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/70 bg-white/70 text-ink-soft transition hover:text-ink">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => { onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1)); onPick(today); }}
            className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-xs font-bold text-ink-soft transition hover:text-ink">
            Today
          </button>
          <button onClick={() => shift(1)} aria-label="Next month"
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/70 bg-white/70 text-ink-soft transition hover:text-ink">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-center text-[10px] font-bold uppercase tracking-wider text-ink-faint">{d}</div>
        ))}

        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const isPast = d < today;
          const isToday = sameDay(d, today);
          const isSel = selected && sameDay(d, selected);
          const dayEvents = reminders.filter((r) => sameDay(new Date(r.at), d));
          return (
            <button
              key={d.toISOString()}
              disabled={isPast}
              onClick={() => onPick(d)}
              className={cn(
                'relative flex h-[52px] flex-col items-center justify-start rounded-xl border px-1 pt-1.5 text-xs font-bold transition',
                isSel ? 'border-brand-500 bg-brand-500 text-white shadow-glow'
                  : isToday ? 'border-brand-400/60 bg-brand-500/10 text-brand-700'
                  : 'border-white/60 bg-white/55 text-ink-soft hover:bg-white',
                isPast && 'cursor-not-allowed opacity-35 hover:bg-white/55',
              )}
            >
              {d.getDate()}
              <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                {dayEvents.slice(0, 3).map((r) => (
                  <span key={r.id} className="h-1.5 w-1.5 rounded-full"
                    style={{ background: isSel ? 'rgba(255,255,255,0.9)' : KIND_COLOR[r.kind] }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- floating analog clock ---------------- */
function ClockPicker({ hour, minute, setHour, setMinute }: {
  hour: number; minute: number; setHour: (h: number) => void; setMinute: (m: number) => void;
}) {
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const R = 84, C = 108;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const isPM = hour >= 12;

  const pos = (i: number, total: number) => {
    const a = (i / total) * Math.PI * 2 - Math.PI / 2;
    return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
  };
  const handAngle = mode === 'hour' ? ((h12 % 12) / 12) * 360 : (minute / 60) * 360;

  return (
    <div className="flex flex-col items-center">
      {/* digital readout */}
      <div className="flex items-center gap-1.5">
        <button onClick={() => setMode('hour')}
          className={cn('rounded-xl px-2.5 py-1 text-3xl font-extrabold tabular-nums transition',
            mode === 'hour' ? 'bg-brand-500/15 text-brand-700' : 'text-ink')}>
          {String(h12).padStart(2, '0')}
        </button>
        <span className="text-3xl font-extrabold text-ink-faint">:</span>
        <button onClick={() => setMode('minute')}
          className={cn('rounded-xl px-2.5 py-1 text-3xl font-extrabold tabular-nums transition',
            mode === 'minute' ? 'bg-brand-500/15 text-brand-700' : 'text-ink')}>
          {String(minute).padStart(2, '0')}
        </button>
        <div className="ml-2 flex flex-col gap-1">
          {(['AM', 'PM'] as const).map((p) => (
            <button key={p}
              onClick={() => setHour(p === 'AM' ? h12 % 12 : (h12 % 12) + 12)}
              className={cn('rounded-lg px-2 py-0.5 text-[11px] font-bold transition',
                (p === 'PM') === isPM ? 'bg-brand-500 text-white' : 'bg-white/70 text-ink-muted hover:text-ink')}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* face */}
      <div className="relative mt-3">
        <svg width={216} height={216} className="touch-none">
          <circle cx={C} cy={C} r={100} fill="rgba(255,255,255,0.6)" stroke="rgba(63,102,240,0.14)" />
          <line x1={C} y1={C}
            x2={C + (R - 16) * Math.cos((handAngle - 90) * Math.PI / 180)}
            y2={C + (R - 16) * Math.sin((handAngle - 90) * Math.PI / 180)}
            stroke="#3f66f0" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={C} cy={C} r={4} fill="#3f66f0" />
        </svg>

        {(mode === 'hour'
          ? Array.from({ length: 12 }, (_, i) => ({ v: i === 0 ? 12 : i, i }))
          : Array.from({ length: 12 }, (_, i) => ({ v: i * 5, i }))
        ).map(({ v, i }) => {
          const p = pos(i, 12);
          const active = mode === 'hour' ? h12 === v : minute === v;
          return (
            <button
              key={v}
              onClick={() => {
                if (mode === 'hour') { setHour(isPM ? (v % 12) + 12 : v % 12); setMode('minute'); }
                else setMinute(v);
              }}
              className={cn(
                'absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[13px] font-bold transition',
                active ? 'bg-brand-600 text-white shadow-glow' : 'text-ink-soft hover:bg-brand-500/10',
              )}
              style={{ left: p.x, top: p.y }}
            >
              {String(v).padStart(mode === 'minute' ? 2 : 1, '0')}
            </button>
          );
        })}
      </div>

      <div className="mt-1 text-[11px] font-semibold text-ink-muted">
        {mode === 'hour' ? 'Choose the hour' : 'Choose the minutes'}
      </div>
    </div>
  );
}

/* ---------------- the modal ---------------- */
export function AppointmentModal({ open, onClose, reminders, onChange }: Props) {
  const [phase, setPhase] = useState<Phase>('list');
  const [kind, setKind] = useState<ReminderKind>('doctor');
  const [month, setMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [date, setDate] = useState<Date | null>(null);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [repeat, setRepeat] = useState<'once' | 'daily' | 'weekly'>('once');

  useEffect(() => {
    if (!open) return;
    setPhase('list'); setDate(null); setTitle(''); setNote(''); setRepeat('once');
    setHour(9); setMinute(0);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && open && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const list = useMemo(() => upcoming(reminders), [reminders]);

  const startAdd = (k: ReminderKind) => {
    setKind(k); setTitle(''); setNote(''); setDate(null); setRepeat('once');
    setPhase('calendar');
  };

  const save = () => {
    if (!date) return;
    const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
    onChange([...reminders, {
      id: uid(), kind, title: title.trim() || KIND_LABEL[kind], note: note.trim() || undefined,
      at: at.toISOString(), repeat,
    }]);
    setPhase('list');
  };

  const remove = (id: string) => onChange(reminders.filter((r) => r.id !== id));

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.2 } }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-ink/35"
            onClick={onClose}
            initial={{ backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
            animate={{ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />

          <motion.div
            layout
            role="dialog" aria-modal="true" aria-label="Appointments and reminders"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass-strong ring-gradient relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-4xl"
          >
            {/* header */}
            <div className="flex items-start justify-between gap-3 px-6 pt-6">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-ink">
                  {phase === 'list' ? 'Upcoming appointments'
                    : phase === 'calendar' ? `New ${KIND_SHORT[kind].toLowerCase()} reminder`
                    : 'Set the time'}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {phase === 'list' ? 'Everything you’ve saved, soonest first.'
                    : phase === 'calendar' ? 'Choose a day from the calendar.'
                    : date ? formatDay(date) : ''}
                </p>
              </div>
              <button onClick={onClose} aria-label="Close"
                className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white/70 text-ink-soft transition-colors hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex-1 overflow-y-auto px-6 pb-2">
              {/* ---------- LIST ---------- */}
              {phase === 'list' && (
                <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
                  {/* add options on top */}
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Add a reminder</div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {KIND_ORDER.map((k) => {
                      const Icon = KIND_ICON[k];
                      return (
                        <button key={k} onClick={() => startAdd(k)}
                          className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/60 bg-white/60 px-2 py-3 transition hover:bg-white">
                          <span className="grid h-9 w-9 place-items-center rounded-xl"
                            style={{ background: `${KIND_COLOR[k]}1f`, color: KIND_COLOR[k] }}>
                            <Icon className="h-[18px] w-[18px]" />
                          </span>
                          <span className="text-[11px] font-bold text-ink">{KIND_SHORT[k]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* saved list */}
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Saved</div>
                    <span className="text-[11px] font-semibold text-ink-muted">{list.length} upcoming</span>
                  </div>

                  <div className="mt-2.5 space-y-2">
                    <AnimatePresence initial={false} mode="popLayout">
                      {list.map((r) => {
                        const Icon = KIND_ICON[r.kind];
                        const d = new Date(r.at);
                        const c = countdown(r.at);
                        return (
                          <motion.div key={r.id} layout
                            initial={{ opacity: 0, y: 8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -24, scale: 0.95, transition: { duration: 0.2 } }}
                            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                            className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/60 px-3 py-2.5">
                            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl"
                              style={{ background: `${KIND_COLOR[r.kind]}1f`, color: KIND_COLOR[r.kind] }}>
                              <Icon className="h-[18px] w-[18px]" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-bold text-ink">{r.title}</div>
                              <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] font-semibold text-ink-muted">
                                {formatDay(d)} · {formatTime(d)}
                                {r.repeat && r.repeat !== 'once' && (
                                  <span className="inline-flex items-center gap-0.5 text-brand-600">
                                    <Repeat className="h-3 w-3" />{r.repeat}
                                  </span>
                                )}
                              </div>
                              {r.note && <div className="truncate text-[11px] text-ink-faint">{r.note}</div>}
                            </div>
                            <span className={cn('flex-none rounded-full px-2 py-1 text-[10px] font-bold',
                              c.overdue ? 'bg-rose-500/12 text-rose-700' : 'bg-brand-500/10 text-brand-700')}>
                              {c.text}
                            </span>
                            <button onClick={() => remove(r.id)} aria-label={`Delete ${r.title}`}
                              className="grid h-7 w-7 flex-none place-items-center rounded-lg text-ink-faint transition hover:bg-rose-500/10 hover:text-rose-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {list.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-ink/15 px-3 py-8 text-center text-xs font-medium text-ink-faint">
                        Nothing saved yet — pick a type above to add your first reminder.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ---------- CALENDAR ---------- */}
              {phase === 'calendar' && (
                <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
                  <MonthGrid month={month} onMonthChange={setMonth} selected={date}
                    onPick={(d) => { setDate(d); setPhase('clock'); }} reminders={reminders} />
                  <div className="mt-4 flex flex-wrap gap-3">
                    {KIND_ORDER.map((k) => (
                      <span key={k} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-ink-muted">
                        <span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR[k] }} />{KIND_SHORT[k]}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ---------- CLOCK + DETAILS ---------- */}
              {phase === 'clock' && (
                <motion.div key="clock" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 26 }}>
                  <div className="rounded-3xl border border-white/60 bg-white/50 p-4">
                    <ClockPicker hour={hour} minute={minute} setHour={setHour} setMinute={setMinute} />
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">What is it?</label>
                      <input value={title} onChange={(e) => setTitle(e.target.value)}
                        placeholder={KIND_LABEL[kind]}
                        className="mt-1.5 h-11 w-full rounded-2xl border border-white/60 bg-white/70 px-4 text-sm font-medium text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {KIND_SUGGESTIONS[kind].map((s) => (
                          <button key={s} onClick={() => setTitle(s)}
                            className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold transition',
                              title === s ? 'border-brand-500/40 bg-brand-500/15 text-brand-700' : 'border-white/60 bg-white/60 text-ink-soft hover:bg-white')}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Note (optional)</label>
                      <input value={note} onChange={(e) => setNote(e.target.value)}
                        placeholder="Doctor, room, instructions…"
                        className="mt-1.5 h-11 w-full rounded-2xl border border-white/60 bg-white/70 px-4 text-sm font-medium text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Repeat</label>
                      <div className="mt-1.5 flex gap-1.5">
                        {(['once', 'daily', 'weekly'] as const).map((rp) => (
                          <button key={rp} onClick={() => setRepeat(rp)}
                            className={cn('flex-1 rounded-xl px-3 py-2 text-[11px] font-bold capitalize ring-1 transition',
                              repeat === rp ? 'bg-brand-500/15 text-brand-700 ring-brand-500/25' : 'bg-white/60 text-ink-muted ring-transparent hover:text-ink')}>
                            {rp}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* footer */}
            <div className="flex items-center justify-between gap-2 border-t border-white/50 px-6 py-4">
              {phase === 'list' && (
                <>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-faint">
                    <Bell className="h-3.5 w-3.5" /> Sorted by what’s next
                  </span>
                  <LiquidButton onClick={onClose}>Done</LiquidButton>
                </>
              )}
              {phase === 'calendar' && (
                <>
                  <LiquidButton variant="ghost" onClick={() => setPhase('list')} icon={<ChevronLeft className="h-4 w-4" />}>Back</LiquidButton>
                  <span className="text-[11px] font-semibold text-ink-faint">Pick a day to continue</span>
                </>
              )}
              {phase === 'clock' && (
                <>
                  <LiquidButton variant="ghost" onClick={() => setPhase('calendar')} icon={<ChevronLeft className="h-4 w-4" />}>Back</LiquidButton>
                  <LiquidButton onClick={save} icon={<Check className="h-[18px] w-[18px]" />}>
                    Save reminder
                  </LiquidButton>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

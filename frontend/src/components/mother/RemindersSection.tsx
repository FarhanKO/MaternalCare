import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import {
  CalendarDays, CheckCircle2, ChevronRight, Clock, Dumbbell, Pill, Plus, Repeat, Stethoscope,
  Syringe, TestTube, Trash2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { cn } from '@/lib/cn';
import {
  countdown, formatDay, formatTime, KIND_COLOR, sameDay, upcoming,
  type Reminder, type ReminderKind,
} from '@/data/reminders';

const KIND_ICON: Record<ReminderKind, any> = {
  medicine: Pill, doctor: Stethoscope, test: TestTube, exercise: Dumbbell, vaccination: Syringe,
};

/** The four groups shown on this page. */
const GROUPS: { id: string; title: string; sub: string; kinds: ReminderKind[]; icon: any; tint: string }[] = [
  { id: 'doctor', title: 'Doctor appointments', sub: 'Check-ups, scans and reviews', kinds: ['doctor'], icon: Stethoscope, tint: KIND_COLOR.doctor },
  { id: 'test', title: 'Tests', sub: 'Screenings and lab work', kinds: ['test'], icon: TestTube, tint: KIND_COLOR.test },
  { id: 'daily', title: 'Medicines & exercises', sub: 'Your daily routine', kinds: ['medicine', 'exercise'], icon: Pill, tint: KIND_COLOR.medicine },
  { id: 'vaccination', title: 'Vaccinations', sub: 'Protecting you and baby', kinds: ['vaccination'], icon: Syringe, tint: KIND_COLOR.vaccination },
];

const minutesOfDay = (iso: string) => { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes(); };

function Row({ r, onDelete }: { r: Reminder; onDelete?: (id: string) => void }) {
  const Icon = KIND_ICON[r.kind];
  const d = new Date(r.at);
  const c = countdown(r.at);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/60 px-3 py-2.5"
    >
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
        {r.assignedBy && (
          <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-peach-500/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-peach-700">
            <Stethoscope className="h-2.5 w-2.5" /> from {r.assignedBy}
          </div>
        )}
      </div>
      <span className={cn('flex-none rounded-full px-2 py-1 text-[10px] font-bold',
        c.overdue ? 'bg-rose-500/12 text-rose-700' : 'bg-brand-500/10 text-brand-700')}>
        {c.text}
      </span>
      {onDelete && !r.assignedBy && (
        <button onClick={() => onDelete(r.id)} aria-label={`Delete ${r.title}`}
          className="grid h-7 w-7 flex-none place-items-center rounded-lg text-ink-faint transition hover:bg-rose-500/10 hover:text-rose-600">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </motion.div>
  );
}

/** Hour-by-hour view of today's medicines and exercises. */
function DailyTimeline({ items, now }: { items: Reminder[]; now: Date }) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const done = items.filter((r) => minutesOfDay(r.at) <= nowMin).length;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/15 px-3 py-6 text-center text-xs font-medium text-ink-faint">
        Nothing scheduled for today.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Today’s routine</span>
        <span className="text-[11px] font-semibold text-ink-muted">{done} of {items.length} done</span>
      </div>

      {/* progress */}
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-emerald-400"
          initial={{ width: 0 }} animate={{ width: `${(done / items.length) * 100}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
      </div>

      <div className="relative">
        {/* rail */}
        <div className="absolute bottom-3 left-[52px] top-3 w-px bg-ink/10" />
        <div className="space-y-2.5">
          {items.map((r, i) => {
            const past = minutesOfDay(r.at) <= nowMin;
            const Icon = KIND_ICON[r.kind];
            const isNext = !past && items.slice(0, i).every((x) => minutesOfDay(x.at) <= nowMin);
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="relative flex items-center gap-3"
              >
                <div className="w-10 flex-none text-right text-[12px] font-extrabold tabular-nums text-ink-soft">
                  {formatTime(new Date(r.at)).replace(/\s?[AP]M/, '')}
                </div>
                <span className={cn('relative z-10 h-3 w-3 flex-none rounded-full ring-4 ring-surface-base',
                  past ? 'bg-emerald-500' : '')}
                  style={!past ? { background: KIND_COLOR[r.kind] } : undefined} />
                <div className={cn(
                  'flex flex-1 items-center gap-2.5 rounded-2xl border px-3 py-2 transition',
                  isNext ? 'border-brand-300 bg-white/85 shadow-soft' : 'border-white/60 bg-white/55',
                  past && 'opacity-55',
                )}>
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-lg"
                    style={{ background: `${KIND_COLOR[r.kind]}1f`, color: KIND_COLOR[r.kind] }}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-bold text-ink">{r.title}</div>
                    {r.note && <div className="truncate text-[10px] font-medium text-ink-faint">{r.note}</div>}
                  </div>
                  {isNext && (
                    <span className="flex-none rounded-full bg-brand-500/12 px-2 py-0.5 text-[9px] font-bold uppercase text-brand-700">
                      Next
                    </span>
                  )}
                  {past
                    ? <CheckCircle2 className="h-4 w-4 flex-none text-emerald-500" />
                    : <Clock className="h-4 w-4 flex-none text-ink-faint" />}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface Props {
  reminders: Reminder[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export function RemindersSection({ reminders, onAdd, onDelete }: Props) {
  const now = new Date();
  const list = useMemo(() => upcoming(reminders), [reminders]);

  /** today's medicine + exercise items, ordered through the day */
  const todayRoutine = useMemo(() => reminders
    .filter((r) => (r.kind === 'medicine' || r.kind === 'exercise') && sameDay(new Date(r.at), now))
    .sort((a, b) => minutesOfDay(a.at) - minutesOfDay(b.at)),
  [reminders]);

  return (
    <div className="mt-9">
      <Reveal className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-ink">Reminders</h2>
          <p className="text-sm text-ink-muted">
            {list.length} upcoming across your appointments, tests, routine and vaccinations.
          </p>
        </div>
        <LiquidButton onClick={onAdd} icon={<Plus className="h-[18px] w-[18px]" />}>Add reminder</LiquidButton>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-2">
        {GROUPS.map((g, gi) => {
          const items = list.filter((r) => g.kinds.includes(r.kind));
          const isDaily = g.id === 'daily';
          return (
            <Reveal key={g.id} delay={gi * 0.05} className={cn(isDaily && 'lg:row-span-2')}>
              <GlassCard float className="flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-xl"
                      style={{ background: `${g.tint}1f`, color: g.tint }}>
                      <g.icon className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <div className="text-sm font-bold leading-tight text-ink">{g.title}</div>
                      <div className="text-xs text-ink-muted">{g.sub}</div>
                    </div>
                  </div>
                  <span className="flex-none rounded-full bg-ink/[0.05] px-2 py-1 text-[10px] font-bold text-ink-soft">
                    {items.length}
                  </span>
                </div>

                {/* daily group leads with the timeline */}
                {isDaily && (
                  <div className="mt-5 border-b border-white/60 pb-5">
                    <DailyTimeline items={todayRoutine} now={now} />
                  </div>
                )}

                <div className="mt-4 flex-1 space-y-2">
                  <AnimatePresence initial={false} mode="popLayout">
                    {items.map((r) => <Row key={r.id} r={r} onDelete={onDelete} />)}
                  </AnimatePresence>

                  {items.length === 0 && (
                    <button onClick={onAdd}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-ink/15 px-3 py-6 text-xs font-semibold text-ink-faint transition hover:border-brand-300 hover:text-ink-muted">
                      <Plus className="h-4 w-4" /> Add {g.title.toLowerCase()}
                    </button>
                  )}
                </div>

                <button onClick={onAdd}
                  className="mt-4 inline-flex items-center gap-1.5 self-start text-[12px] font-bold text-brand-600 transition hover:text-brand-700">
                  <CalendarDays className="h-3.5 w-3.5" /> Schedule new
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </GlassCard>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

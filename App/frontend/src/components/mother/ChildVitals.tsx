import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, Baby, Check, Droplets, Info, Loader2, Milk, Moon, Thermometer,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import type { ChildLogState } from '@/data/records';

/**
 * The child's half of the vitals screen.
 *
 * Shown only to a new mother or the parent of a young child, because those are
 * the two stages where half of what needs watching is not happening in her own
 * body. The mother's own readings stay exactly where they were above this —
 * the point is that both are asked, not that one replaces the other.
 *
 * The questions are the ones a paediatrician asks first: how many feeds, how
 * many wet nappies, roughly how long they slept, and a temperature if anything
 * seemed off. Nappies are the one people underestimate — it is how a parent
 * and a midwife tell whether a baby is getting enough milk, days before any
 * weight is lost.
 *
 * Every figure here is a row in `child_logs`. Nothing on this screen is a
 * fixture, and where nothing has been logged it says so rather than drawing a
 * line through invented points.
 */

const C = { mint: '#2fbf9b', aqua: '#22b8c4', brand: '#3f66f0', peach: '#fb7534' };

const MOOD_FACE: Record<string, string> = {
  Content: '🙂', Playful: '😄', Sleepy: '😴', Fussy: '😣', Unsettled: '😖',
};

const axisTick = { fontSize: 11, fill: '#9aa3ba', fontWeight: 600 };

function Stepper({
  label, icon: Icon, value, unit, step = 1, max, onChange, tint,
}: {
  label: string;
  icon: typeof Milk;
  value: number | undefined;
  unit?: string;
  step?: number;
  max: number;
  onChange: (next: number) => void;
  tint: string;
}) {
  const current = value ?? 0;
  return (
    <div className="rounded-2xl border border-white/60 bg-white/60 p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
        <Icon className="h-3.5 w-3.5" style={{ color: tint }} /> {label}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          onClick={() => onChange(Math.max(0, Math.round((current - step) * 10) / 10))}
          aria-label={`Less ${label.toLowerCase()}`}
          className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-ink/[0.05] text-lg font-bold text-ink-soft transition hover:bg-ink/10"
        >
          −
        </button>
        <div className="text-center">
          <span className="text-2xl font-extrabold tracking-tight text-ink">
            {value === undefined ? '—' : value}
          </span>
          {unit && <span className="ml-0.5 text-[11px] font-bold text-ink-faint">{unit}</span>}
        </div>
        <button
          onClick={() => onChange(Math.min(max, Math.round((current + step) * 10) / 10))}
          aria-label={`More ${label.toLowerCase()}`}
          className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-ink/[0.05] text-lg font-bold text-ink-soft transition hover:bg-ink/10"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function ChildVitals() {
  const [state, setState] = useState<ChildLogState | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'none' | 'offline'>('loading');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await api.getChildLog());
      setStatus('ready');
    } catch (err) {
      setStatus(err instanceof Error && /no child/i.test(err.message) ? 'none' : 'offline');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /**
   * Writes through on every change, sending only the field that moved.
   * The model COALESCEs, so answering the nappies question in the morning and
   * the sleep question at night does not blank the first answer.
   */
  const put = async (patch: Record<string, number | string>) => {
    setSaving(true);
    // optimistic, so holding "+" feels like a counter and not a form
    setState((s) => (s ? { ...s, today: { ...s.today, ...patch } } : s));
    try {
      const r = await api.saveChildLog(patch);
      setState((s) => (s ? { ...s, today: r.today, flags: r.flags } : s));
    } catch {
      load();
    } finally {
      setSaving(false);
    }
  };

  if (status === 'none') return null;

  if (status === 'loading' || status === 'offline' || !state) {
    return (
      <div className="mt-9">
        <GlassCard className="p-6">
          <p className="py-6 text-center text-[12px] font-semibold text-ink-faint">
            {status === 'loading' ? 'Loading…' : 'Cannot reach the clinic right now.'}
          </p>
        </GlassCard>
      </div>
    );
  }

  const { child, today, history, summary, flags, moods } = state;
  const logged = history.filter((h) => h.feeds != null || h.wetNappies != null);

  return (
    <div className="mt-9">
      <Reveal className="mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-extrabold tracking-tight text-ink">
            {child.name}’s day
          </h2>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-faint" />}
        </div>
        <p className="text-sm text-ink-muted">
          The four things a paediatrician asks about first. Answer them as the day goes —
          each one saves on its own.
        </p>
      </Reveal>

      {/* anything the entry itself raises */}
      {flags.length > 0 && (
        <Reveal className="mb-4">
          <div className="space-y-2">
            {flags.map((f) => (
              <div
                key={f.text}
                className={cn(
                  'flex items-start gap-2.5 rounded-2xl px-4 py-3 ring-1',
                  f.level === 'urgent' ? 'bg-rose-500/10 ring-rose-500/25'
                    : f.level === 'warn' ? 'bg-amber-500/10 ring-amber-500/25'
                      : 'bg-ink/[0.04] ring-transparent',
                )}
              >
                <AlertTriangle className={cn('mt-0.5 h-4 w-4 flex-none',
                  f.level === 'urgent' ? 'text-rose-600' : 'text-amber-600')}
                />
                <span className="text-[12.5px] font-semibold leading-relaxed text-ink-soft">
                  {f.text}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        {/* today's answers */}
        <Reveal>
          <GlassCard className="h-full p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/12 text-emerald-600">
                <Baby className="h-[18px] w-[18px]" />
              </span>
              <div>
                <div className="text-sm font-bold text-ink">Today</div>
                <div className="text-xs text-ink-muted">Tap to count — it saves as you go</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Stepper
                label="Feeds" icon={Milk} tint={C.mint} max={30}
                value={today.feeds}
                onChange={(n) => put({ feeds: n })}
              />
              <Stepper
                label="Wet nappies" icon={Droplets} tint={C.aqua} max={30}
                value={today.wetNappies}
                onChange={(n) => put({ wetNappies: n })}
              />
              <Stepper
                label="Sleep" icon={Moon} tint={C.brand} unit="h" step={0.5} max={24}
                value={today.sleepHours}
                onChange={(n) => put({ sleepHours: n })}
              />
              <Stepper
                label="Temperature" icon={Thermometer} tint={C.peach} unit="°C" step={0.1} max={45}
                value={today.tempC}
                onChange={(n) => put({ tempC: Math.max(30, n) })}
              />
            </div>

            <div className="mt-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                How did they seem?
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {moods.map((m) => (
                  <button
                    key={m}
                    onClick={() => put({ mood: m })}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold ring-1 transition',
                      today.mood === m
                        ? 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/25'
                        : 'bg-white/60 text-ink-muted ring-transparent hover:text-ink',
                    )}
                  >
                    <span aria-hidden>{MOOD_FACE[m] ?? '🙂'}</span> {m}
                  </button>
                ))}
              </div>
            </div>

            {/* the reassurance that belongs next to a nappy count */}
            <p className="mt-4 flex items-start gap-1.5 rounded-xl bg-ink/[0.04] px-3 py-2 text-[11px] leading-relaxed text-ink-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-none" />
              Wet nappies are the earliest sign of whether a baby is getting enough milk —
              earlier than weight, which is why they are asked for first.
            </p>
          </GlassCard>
        </Reveal>

        {/* the last fortnight */}
        <Reveal>
          <GlassCard className="h-full p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-ink">The last fortnight</div>
                <div className="text-xs text-ink-muted">
                  {summary.days > 0
                    ? `${summary.days} days logged`
                    : 'Nothing logged yet'}
                </div>
              </div>
              {summary.commonMood && (
                <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-ink-soft">
                  mostly {summary.commonMood.toLowerCase()}
                </span>
              )}
            </div>

            {logged.length === 0 ? (
              <div className="mt-4 grid h-[260px] place-items-center rounded-2xl border border-dashed border-ink/12 px-4 text-center">
                <div>
                  <div className="text-[13px] font-bold text-ink-soft">No days logged yet</div>
                  <div className="mt-0.5 text-[11px] text-ink-faint">
                    This fills in as you answer the questions beside it.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4 flex gap-4">
                  {[
                    { n: summary.avgFeeds, l: 'feeds a day' },
                    { n: summary.avgNappies, l: 'wet nappies' },
                    { n: summary.avgSleepHours, l: 'hours asleep' },
                  ].map((s) => (
                    <div key={s.l}>
                      <div className="text-xl font-extrabold text-ink">{s.n ?? '—'}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                        {s.l}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                    Feeds &amp; wet nappies
                  </div>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={logged} margin={{ top: 8, right: 6, left: -4, bottom: 0 }}>
                      <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8)}
                        tickLine={false} axisLine={false} tick={axisTick} dy={6} />
                      <YAxis tickLine={false} axisLine={false} tick={axisTick} width={26} />
                      <Tooltip />
                      <Bar dataKey="feeds" name="Feeds" fill={C.mint} radius={[5, 5, 0, 0]} barSize={9} />
                      <Bar dataKey="wetNappies" name="Wet nappies" fill={C.aqua} radius={[5, 5, 0, 0]} barSize={9} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-2">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                    Sleep
                  </div>
                  <ResponsiveContainer width="100%" height={110}>
                    <AreaChart data={logged} margin={{ top: 8, right: 6, left: -4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="childSleep" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.brand} stopOpacity={0.28} />
                          <stop offset="100%" stopColor={C.brand} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8)}
                        tickLine={false} axisLine={false} tick={axisTick} dy={6} />
                      <YAxis tickLine={false} axisLine={false} tick={axisTick} width={26} />
                      <Tooltip />
                      <motion.g>
                        <Area type="monotone" dataKey="sleepHours" name="Hours"
                          stroke={C.brand} strokeWidth={2.4} fill="url(#childSleep)"
                          dot={{ r: 2.5, fill: C.brand }} />
                      </motion.g>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </GlassCard>
        </Reveal>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[10.5px] font-medium leading-relaxed text-ink-faint">
        <Check className="mt-0.5 h-3 w-3 flex-none" />
        Everything here is stored against {child.name} and appears in the health report you
        can hand to their doctor.
      </p>
    </div>
  );
}

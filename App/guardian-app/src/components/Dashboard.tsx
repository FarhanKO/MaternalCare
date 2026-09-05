import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  Activity, BellRing, CalendarDays, CheckCircle2, ChevronRight, Droplet, HeartPulse,
  Info, Phone, Share, Smartphone, TriangleAlert, Weight,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { cn } from '@/lib/cn';
import { api, type Dashboard as Data, type VitalPoint } from '@/lib/api';
import {
  capabilities, isIOS, isStandalone, requestNotifications, type Capability,
} from '@/lib/alert';

const STATUS = {
  settled: { label: 'Settled', tint: '#2fbf9b', ring: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/25' },
  watch: { label: 'Worth watching', tint: '#f6b93b', ring: 'bg-amber-500/12 text-amber-700 ring-amber-500/25' },
  high: { label: 'Needs attention', tint: '#e5484d', ring: 'bg-rose-500/12 text-rose-700 ring-rose-500/25' },
};

const LEVEL = {
  urgent: { icon: TriangleAlert, ring: 'bg-rose-500/10 ring-rose-500/25', tint: '#e5484d' },
  watch: { icon: Info, ring: 'bg-amber-500/10 ring-amber-500/25', tint: '#f6b93b' },
  info: { icon: CheckCircle2, ring: 'bg-brand-500/10 ring-brand-500/20', tint: '#3f66f0' },
};

/** One rounded metric tile with its own sparkline. */
function VitalTile({
  label, value, unit, icon: Icon, tint, series,
}: {
  label: string; value: number | null; unit: string; icon: any; tint: string; series: number[];
}) {
  const data = series.filter((n) => n != null).map((v, i) => ({ i, v }));
  return (
    <div className="rounded-3xl border border-white/60 bg-white/60 p-3.5">
      <div className="flex items-center gap-1.5">
        <span className="grid h-7 w-7 place-items-center rounded-xl"
          style={{ background: `${tint}1f`, color: tint }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-xl font-extrabold leading-none text-ink">{value ?? '—'}</span>
        <span className="text-[10px] font-bold text-ink-faint">{unit}</span>
      </div>
      {data.length > 1 && (
        <div className="mt-1.5 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tint} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={tint} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={['dataMin - 4', 'dataMax + 4']} />
              <Area type="monotone" dataKey="v" stroke={tint} strokeWidth={2}
                fill={`url(#g-${label})`} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Honest, live per-device capability list. */
function Capabilities({ items }: { items: Capability[] }) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/55 p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
        What this phone will do
      </div>
      <div className="mt-2 space-y-1.5">
        {items.map((c) => (
          <div key={c.label} className="flex items-start gap-2">
            <span className={cn('mt-[3px] h-2 w-2 flex-none rounded-full',
              c.state === 'yes' ? 'bg-emerald-500' : c.state === 'partial' ? 'bg-amber-500' : 'bg-ink/20')} />
            <div className="min-w-0">
              <div className="text-[12px] font-bold text-ink">{c.label}</div>
              <div className="text-[10.5px] font-medium leading-relaxed text-ink-muted">{c.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Dashboard({ data, token }: { data: Data; token: string }) {
  const [vitals, setVitals] = useState<VitalPoint[]>([]);
  const [caps, setCaps] = useState<Capability[]>(capabilities());
  const [notifyState, setNotifyState] = useState(
    'Notification' in window ? Notification.permission : 'denied',
  );

  useEffect(() => { api.vitals(token).then(setVitals).catch(() => {}); }, [token]);

  const askNotifications = async () => {
    setNotifyState(await requestNotifications());
    setCaps(capabilities());
  };

  const { overview: o, insight, guardian } = data;
  const status = STATUS[o.status];
  const iosNotInstalled = isIOS() && !isStandalone();

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-6">
      {/* who you are, and who you are watching over */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">
            Guardian
          </div>
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-ink">
            {o.motherName}
          </h1>
          <p className="text-[12px] font-semibold text-ink-muted">
            {guardian.relation ? `You are her ${guardian.relation.toLowerCase()}` : guardian.name}
          </p>
        </div>
        <span className={cn('flex-none rounded-full px-2.5 py-1 text-[10px] font-bold ring-1', status.ring)}>
          {status.label}
        </span>
      </div>

      {/* the arc — where she is in the pregnancy */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="glass mt-4 overflow-hidden rounded-4xl p-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              Pregnancy
            </div>
            <div className="mt-0.5 text-3xl font-extrabold leading-none text-ink">
              Week {o.week ?? '—'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              {o.daysToGo != null && o.daysToGo >= 0 ? 'Days to go' : 'Due'}
            </div>
            <div className="mt-0.5 text-3xl font-extrabold leading-none text-brand-600">
              {o.daysToGo != null && o.daysToGo >= 0 ? o.daysToGo : '—'}
            </div>
          </div>
        </div>

        {o.week != null && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-ink/8">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (o.week / 40) * 100)}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-bold text-ink-faint">
              <span>Week 1</span><span>Week 40</span>
            </div>
          </div>
        )}

        {o.dueDate && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-ink-soft">
            <CalendarDays className="h-3 w-3" />
            Due {new Date(`${o.dueDate}T00:00:00`).toLocaleDateString(undefined,
              { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}
      </motion.div>

      {/* her latest readings */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold tracking-tight text-ink">Her latest readings</h2>
          {o.lastReadingOn && (
            <span className="text-[10px] font-semibold text-ink-faint">
              {new Date(`${o.lastReadingOn}T00:00:00`).toLocaleDateString(undefined,
                { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <VitalTile label="Blood pressure" icon={HeartPulse} tint="#e5484d" unit="mmHg"
            value={o.vitals.systolic} series={vitals.map((v) => v.systolic as number)} />
          <VitalTile label="Glucose" icon={Droplet} tint="#8b7bf3" unit="mg/dL"
            value={o.vitals.sugar} series={vitals.map((v) => v.sugar as number)} />
          <VitalTile label="Weight" icon={Weight} tint="#22b8c4" unit="kg"
            value={o.vitals.weightKg} series={vitals.map((v) => v.weightKg as number)} />
          <VitalTile label="Temperature" icon={Activity} tint="#fb7534" unit="°C"
            value={o.vitals.tempC} series={vitals.map((v) => v.tempC as number)} />
        </div>
      </div>

      {/* what she may be facing, and what you can do */}
      <div className="mt-5">
        <h2 className="text-sm font-extrabold tracking-tight text-ink">How you can help</h2>
        <p className="text-[11px] font-medium text-ink-muted">
          Based on her own readings and what she has logged.
        </p>
        <div className="mt-2 space-y-2">
          {insight.map((i, idx) => {
            const meta = LEVEL[i.level];
            const Icon = meta.icon;
            return (
              <motion.div
                key={i.facing}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                className={cn('rounded-3xl p-4 ring-1', meta.ring)}
              >
                <div className="flex items-start gap-2.5">
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-xl"
                    style={{ background: `${meta.tint}1f`, color: meta.tint }}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold leading-snug text-ink">{i.facing}</p>
                    <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink-soft">
                      {i.help}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* getting reached when the app is shut */}
      {notifyState !== 'granted' && (
        <button
          onClick={askNotifications}
          disabled={iosNotInstalled}
          className={cn('mt-5 flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-left ring-1 transition',
            iosNotInstalled
              ? 'bg-white/50 text-ink-muted ring-ink/10'
              : 'bg-brand-500/10 text-ink ring-brand-500/25 hover:bg-brand-500/15')}
        >
          <span className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-brand-500/15 text-brand-600">
            {iosNotInstalled ? <Share className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-extrabold">
              {iosNotInstalled ? 'Add to your Home Screen first' : 'Turn on alerts'}
            </span>
            <span className="block text-[11px] font-medium text-ink-muted">
              {iosNotInstalled
                ? 'Tap Share, then “Add to Home Screen”. iPhone only allows alerts once installed.'
                : 'So you are reached even when this app is closed'}
            </span>
          </span>
          {!iosNotInstalled && <ChevronRight className="h-4 w-4 flex-none text-ink-faint" />}
        </button>
      )}

      <div className="mt-3">
        <Capabilities items={caps} />
      </div>

      <a
        href={`tel:${data.emergencyNumber}`}
        className="mt-3 flex items-center justify-center gap-2 rounded-3xl border border-rose-300/70 bg-rose-500/10 py-3.5 text-[13px] font-extrabold text-rose-700"
      >
        <Phone className="h-4 w-4" /> Call {data.emergencyNumber}
      </a>

      <p className="mt-4 flex items-start gap-1.5 text-[10.5px] font-medium leading-relaxed text-ink-faint">
        <Smartphone className="mt-[1px] h-3 w-3 flex-none" />
        Keep this app installed and open when you can. Her SOS reaches you fastest that way.
      </p>
    </div>
  );
}

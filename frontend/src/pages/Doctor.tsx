import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowRight, BellRing, CalendarDays, CheckCircle2, ChevronRight,
  ClipboardList, ClipboardPlus, Clock, Droplet, HeartPulse, LayoutDashboard, Search, ShieldAlert, Stethoscope,
  TrendingUp, Users, X,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { SectionDock, type DockItem } from '@/components/ui/SectionDock';
import { DoctorProfile } from '@/components/doctor/DoctorProfile';
import { AssignModal } from '@/components/doctor/AssignModal';
import { cn } from '@/lib/cn';
import {
  ALERTS, CLINIC_WEEK, KIND_META, OUTCOMES, PATIENTS as FALLBACK_PATIENTS, RISK_META, SCREENING,
  TODAY_SLOTS, TRIMESTER_SPLIT, type Patient, type RiskLevel,
} from '@/data/doctor';
import { api } from '@/lib/api';

const P = { peach: '#fb7534', peachLight: '#ff9159', aqua: '#22b8c4', brand: '#3f66f0', mint: '#2fbf9b', rose: '#e5484d', violet: '#8b7bf3' };

type DocTab = 'overview' | 'patients' | 'schedule' | 'reports';

const TABS: DockItem<DocTab>[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, hint: 'Clinic at a glance' },
  { key: 'patients', label: 'Patients', icon: Users, hint: 'Your caseload' },
  { key: 'schedule', label: 'Schedule', icon: CalendarDays, hint: 'Today’s clinic' },
  { key: 'reports', label: 'Reports', icon: ClipboardList, hint: 'Practice analytics' },
];

const axisTick = { fontSize: 11, fill: '#9aa3ba', fontWeight: 600 };

function greetingFor(d: Date) {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h === 12) return 'Good noon';
  if (h >= 13 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

function Tip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 px-3.5 py-2.5 text-xs shadow-glass backdrop-blur-xl">
      {label != null && <div className="mb-1 font-semibold text-ink-muted">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 font-semibold text-ink">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          {p.name}: {p.value}{unit ? ` ${unit}` : ''}
        </div>
      ))}
    </div>
  );
}

function Card({ title, sub, icon: Icon, tint = P.peach, right, children, className }: any) {
  return (
    <GlassCard className={cn('flex h-full flex-col p-5 sm:p-6', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-xl" style={{ background: `${tint}1f`, color: tint }}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div>
            <div className="text-sm font-bold leading-tight text-ink">{title}</div>
            {sub && <div className="text-xs text-ink-muted">{sub}</div>}
          </div>
        </div>
        {right}
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </GlassCard>
  );
}

/** Tiny inline sparkline for a patient's systolic trend. */
function Spark({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 56},${18 - ((v - min) / span) * 14}`).join(' ');
  return (
    <svg viewBox="0 0 56 20" className="h-5 w-14 flex-none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RiskPill({ level }: { level: RiskLevel }) {
  const m = RISK_META[level];
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold ring-1', m.ring)}>{m.label}</span>
  );
}

/* ---------------- patient detail drawer ---------------- */
function PatientDrawer({ patient, onClose, onAssign }: { patient: Patient | null; onClose: () => void; onAssign: (p: Patient) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && patient && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [patient, onClose]);

  return (
    <AnimatePresence>
      {patient && (
        <motion.div
          className="fixed inset-0 z-[100] flex justify-end"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.2 } }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-ink/35"
            onClick={onClose}
            initial={{ opacity: 0, backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.aside
            role="dialog" aria-modal="true" aria-label={`${patient.name} record`}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%', transition: { duration: 0.22 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="glass-strong relative m-3 flex w-full max-w-md flex-col overflow-hidden rounded-4xl shadow-float"
          >
            <div className="relative h-24 flex-none overflow-hidden"
              style={{ background: 'linear-gradient(140deg, #ff9159 0%, #fb7534 55%, #ea5c1d 100%)' }}>
              <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-white/25 blur-2xl" />
              <button onClick={onClose} aria-label="Close record"
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-white/30 bg-white/20 text-white backdrop-blur-md transition hover:bg-white/30">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* relative + z-10 so the avatar sits above the positioned cover */}
            <div className="relative z-10 flex-none px-6">
              <div className="-mt-10">
                <span className="grid h-[68px] w-[68px] place-items-center rounded-3xl border-[3px] border-white text-lg font-extrabold text-white shadow-glow"
                  style={{ background: RISK_META[patient.risk].color }}>
                  {patient.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </span>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xl font-extrabold tracking-tight text-ink">{patient.name}</span>
                  <RiskPill level={patient.risk} />
                </div>
                <div className="text-[11px] font-semibold text-ink-muted">
                  {patient.age} yrs · week {patient.week} · {patient.bloodGroup}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { l: 'BP', v: `${patient.bp.sys}/${patient.bp.dia}`, i: HeartPulse },
                  { l: 'Score', v: `${patient.score}`, i: Activity },
                  { l: 'Week', v: `${patient.week}`, i: CalendarDays },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl border border-white/60 bg-white/55 py-3 text-center">
                    <s.i className="mx-auto h-3.5 w-3.5 text-ink-faint" />
                    <div className="mt-1 text-sm font-extrabold leading-none text-ink">{s.v}</div>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink-faint">{s.l}</div>
                  </div>
                ))}
              </div>

              {patient.flags.length > 0 && (
                <div className="mt-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Active flags</div>
                  <div className="mt-2 space-y-1.5">
                    {patient.flags.map((f) => (
                      <div key={f} className="flex items-center gap-2 rounded-xl bg-amber-500/12 px-3 py-2 text-[12px] font-semibold text-amber-700 ring-1 ring-amber-500/25">
                        <AlertTriangle className="h-3.5 w-3.5 flex-none" />{f}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Systolic trend</div>
                <div className="mt-2 rounded-2xl border border-white/60 bg-white/55 p-3">
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={patient.trend.map((v, i) => ({ v, i: `V${i + 1}` }))} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ptTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={RISK_META[patient.risk].color} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={RISK_META[patient.risk].color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="i" tickLine={false} axisLine={false} tick={axisTick} />
                      <YAxis tickLine={false} axisLine={false} tick={axisTick} width={30} domain={['dataMin - 6', 'dataMax + 6']} />
                      <Tooltip content={<Tip unit="mmHg" />} />
                      <Area type="monotone" dataKey="v" name="Systolic" stroke={RISK_META[patient.risk].color} strokeWidth={2.4} fill="url(#ptTrend)" dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">History</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {patient.conditions.map((c) => (
                    <span key={c} className="rounded-full border border-white/60 bg-white/60 px-3 py-1 text-[11px] font-semibold text-ink-soft">{c}</span>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-2xl border border-white/60 bg-white/55 px-3 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Last seen</div>
                  <div className="text-[13px] font-bold text-ink">{patient.lastVisit}</div>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/55 px-3 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Next</div>
                  <div className="text-[13px] font-bold text-ink">{patient.nextVisit}</div>
                </div>
              </div>

              <button
                onClick={() => onAssign(patient)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-peach-400 to-peach-600 px-5 py-3 text-sm font-bold text-white shadow-[0_10px_30px_-8px_rgba(234,92,29,0.5)] transition hover:brightness-105"
              >
                <ClipboardPlus className="h-[18px] w-[18px]" /> Assign test, medicine or appointment
              </button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================================ page ================================ */
export function Doctor() {
  const [params, setParams] = useSearchParams();
  const urlTab = params.get('tab') as DocTab | null;
  const valid = (t: string | null): t is DocTab =>
    !!t && ['overview', 'patients', 'schedule', 'reports'].includes(t);
  const [tab, setTabState] = useState<DocTab>(valid(urlTab) ? urlTab : 'overview');
  const setTab = (t: DocTab) => {
    setTabState(t);
    setParams(t === 'overview' ? {} : { tab: t }, { replace: true });
  };
  useEffect(() => { if (valid(urlTab) && urlTab !== tab) setTabState(urlTab); }, [urlTab]);
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all');
  const [selected, setSelected] = useState<Patient | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [assigning, setAssigning] = useState<Patient | null>(null);

  // the caseload comes from the database — each patient is a real account
  const [roster, setRoster] = useState<Patient[]>(FALLBACK_PATIENTS);
  const [live, setLive] = useState(false);
  const loadRoster = () => api.getPatients()
    .then((p) => { if (p.length) { setRoster(p); setLive(true); } })
    .catch(() => setLive(false));
  useEffect(() => { loadRoster(); }, []);

  const riskCount = (level: RiskLevel) => roster.filter((p) => p.risk === level).length;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const critical = ALERTS.filter((a) => a.severity === 'critical').length;
  const pending = TODAY_SLOTS.filter((s) => !s.done).length;

  const patients = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roster.filter((p) =>
      (riskFilter === 'all' || p.risk === riskFilter) &&
      (!q || p.name.toLowerCase().includes(q) || p.conditions.join(' ').toLowerCase().includes(q)),
    );
  }, [query, riskFilter, roster]);

  const KPIS = [
    { label: 'Under your care', value: roster.length, icon: Users, tint: P.peach, note: 'active pregnancies' },
    { label: 'High risk', value: riskCount('high'), icon: ShieldAlert, tint: P.rose, note: 'need close follow-up' },
    { label: 'Clinic today', value: TODAY_SLOTS.length, icon: CalendarDays, tint: P.aqua, note: `${pending} still to see` },
    { label: 'Open alerts', value: ALERTS.length, icon: BellRing, tint: P.violet, note: `${critical} critical` },
  ];

  return (
    <>
      <Navbar />
      <SectionDock items={TABS} active={tab} onChange={setTab} accent="peach"
        layoutId="doctorTabPill" badges={{ patients: roster.length, schedule: pending }} />

      <main className="mx-auto max-w-6xl px-4 pb-36 pt-28 sm:pt-32">
        {/* greeting */}
        <Reveal className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-peach-600">Clinician portal</span>
            <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              {greetingFor(now)}, <span className="font-serif italic text-peach-600">Dr. Ortiz</span>
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} ·{' '}
              {pending} patients still to see · {critical} urgent alerts
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="relative grid h-11 w-11 place-items-center rounded-2xl glass-strong text-ink-soft transition-colors hover:text-ink">
              <BellRing className="h-5 w-5" />
              {critical > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                  {critical}
                </span>
              )}
            </button>
            <motion.button
              onClick={() => setProfileOpen(true)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              aria-label="Open your profile"
              className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-peach-400 to-peach-600 text-sm font-bold text-white shadow-[0_10px_30px_-8px_rgba(234,92,29,0.5)]"
            >
              LO
            </motion.button>
          </div>
        </Reveal>

        {/* ============================== OVERVIEW ============================== */}
        {tab === 'overview' && (
          <motion.div key="ov" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {KPIS.map((k, i) => (
                <Reveal key={k.label} delay={i * 0.05}>
                  <GlassCard interactive className="h-full p-5">
                    <div className="flex items-center justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: `${k.tint}1f`, color: k.tint }}>
                        <k.icon className="h-5 w-5" />
                      </span>
                      <motion.span
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.05 }}
                        className="text-3xl font-extrabold tabular-nums text-ink"
                      >
                        {k.value}
                      </motion.span>
                    </div>
                    <div className="mt-4 text-sm font-bold text-ink">{k.label}</div>
                    <div className="text-xs text-ink-muted">{k.note}</div>
                  </GlassCard>
                </Reveal>
              ))}
            </div>

            {/* urgent alerts */}
            <div className="mt-8">
              <Reveal className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-ink">Needs your attention</h2>
                  <p className="text-sm text-ink-muted">Raised automatically from what patients logged.</p>
                </div>
              </Reveal>
              <div className="space-y-3">
                {ALERTS.map((a, i) => (
                  <Reveal key={a.id} delay={i * 0.04}>
                    <GlassCard interactive
                      onClick={() => setSelected(roster.find((p) => p.name === a.patient) ?? null)}
                      className="flex items-start gap-3.5 p-4">
                      <span className={cn('grid h-10 w-10 flex-none place-items-center rounded-xl',
                        a.severity === 'critical' ? 'bg-rose-500/12 text-rose-600' : 'bg-amber-500/12 text-amber-600')}>
                        {a.severity === 'critical' ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2">
                          <span className="text-sm font-bold text-ink">{a.title}</span>
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold',
                            a.severity === 'critical' ? 'bg-rose-500/12 text-rose-700' : 'bg-amber-500/12 text-amber-700')}>
                            {a.severity}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-peach-600">{a.patient} · {a.ago} ago</div>
                        <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{a.detail}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 flex-none text-ink-faint" />
                    </GlassCard>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* clinic activity + caseload mix */}
            <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <Reveal>
                <Card title="Clinic activity" sub="Patients seen vs booked this week" icon={TrendingUp} tint={P.peach}>
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={CLINIC_WEEK} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                      <XAxis dataKey="d" tickLine={false} axisLine={false} tick={axisTick} dy={6} />
                      <YAxis tickLine={false} axisLine={false} tick={axisTick} width={30} />
                      <Tooltip content={<Tip />} cursor={{ fill: 'rgba(251,117,52,0.06)' }} />
                      <Bar dataKey="booked" name="Booked" radius={[6, 6, 0, 0]} fill="#ffd2b8" barSize={18} />
                      <Bar dataKey="seen" name="Seen" radius={[6, 6, 0, 0]} fill={P.peach} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Reveal>

              <Reveal delay={0.05}>
                <Card title="Caseload by trimester" sub="38 active pregnancies" icon={Users} tint={P.aqua}>
                  <div className="flex items-center gap-4">
                    <div className="relative h-[150px] w-[150px] flex-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={TRIMESTER_SPLIT} dataKey="value" nameKey="name" innerRadius={46} outerRadius={68} paddingAngle={3} stroke="none">
                            {TRIMESTER_SPLIT.map((t) => <Cell key={t.name} fill={t.color} />)}
                          </Pie>
                          <Tooltip content={<Tip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                        <div>
                          <div className="text-2xl font-extrabold text-ink">38</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Total</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {TRIMESTER_SPLIT.map((t) => (
                        <div key={t.name} className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />{t.name}
                          <span className="ml-auto text-ink">{t.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </Reveal>
            </div>
          </motion.div>
        )}

        {/* ============================== PATIENTS ============================== */}
        {tab === 'patients' && (
          <motion.div key="pt" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            <Reveal className="mb-4">
              <h2 className="text-lg font-extrabold tracking-tight text-ink">Your patients</h2>
              <p className="text-sm text-ink-muted">Select anyone to open their record.</p>
            </Reveal>

            <Reveal>
              <GlassCard className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                    <input
                      value={query} onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by name or condition…"
                      className="h-11 w-full rounded-2xl border border-white/60 bg-white/70 pl-10 pr-4 text-sm font-medium text-ink outline-none transition placeholder:text-ink-faint focus:border-peach-400 focus:ring-2 focus:ring-peach-500/20"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    {(['all', 'high', 'moderate', 'low'] as const).map((r) => (
                      <button key={r} onClick={() => setRiskFilter(r)}
                        className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition',
                          riskFilter === r ? 'border-peach-500/40 bg-peach-500/15 text-peach-700'
                            : 'border-white/60 bg-white/60 text-ink-soft hover:bg-white')}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </Reveal>

            <div className="mt-4 space-y-3">
              {patients.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.03}>
                  <GlassCard interactive onClick={() => setSelected(p)} className="flex items-center gap-3.5 p-4">
                    <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl text-[13px] font-bold text-white"
                      style={{ background: RISK_META[p.risk].color }}>
                      {p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="text-sm font-bold text-ink">{p.name}</span>
                        <RiskPill level={p.risk} />
                        {p.flags.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600">
                            <AlertTriangle className="h-3 w-3" />{p.flags.length}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-medium text-ink-muted">
                        {p.age} yrs · week {p.week} · next {p.nextVisit}
                      </div>
                    </div>
                    <div className="hidden flex-none items-center gap-3 sm:flex">
                      <div className="text-right">
                        <div className="text-[13px] font-extrabold tabular-nums text-ink">{p.bp.sys}/{p.bp.dia}</div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-ink-faint">mmHg</div>
                      </div>
                      <Spark values={p.trend} color={RISK_META[p.risk].color} />
                    </div>
                    <ChevronRight className="h-5 w-5 flex-none text-ink-faint" />
                  </GlassCard>
                </Reveal>
              ))}

              {patients.length === 0 && (
                <div className="rounded-3xl border border-dashed border-ink/15 px-4 py-12 text-center text-sm font-medium text-ink-faint">
                  No patients match that search.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ============================== SCHEDULE ============================== */}
        {tab === 'schedule' && (
          <motion.div key="sc" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            <Reveal className="mb-4">
              <h2 className="text-lg font-extrabold tracking-tight text-ink">Today’s clinic</h2>
              <p className="text-sm text-ink-muted">
                {TODAY_SLOTS.length} appointments · {TODAY_SLOTS.length - pending} completed
              </p>
            </Reveal>

            <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
              <div className="relative">
                {/* timeline rail */}
                <div className="absolute bottom-4 left-[70px] top-4 w-px bg-ink/10" />
                <div className="space-y-3">
                  {TODAY_SLOTS.map((s, i) => {
                    const meta = KIND_META[s.kind];
                    return (
                      <Reveal key={s.id} delay={i * 0.04}>
                        <div className="relative flex items-center gap-4">
                          <div className="w-12 flex-none text-right text-[13px] font-extrabold tabular-nums text-ink-soft">{s.time}</div>
                          <span className={cn('relative z-10 grid h-4 w-4 flex-none place-items-center rounded-full ring-4 ring-surface-base',
                            s.done ? 'bg-emerald-500' : '')} style={!s.done ? { background: meta.color } : undefined} />
                          <GlassCard className={cn('flex flex-1 items-center gap-3 p-3.5', s.done && 'opacity-60')}>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2">
                                <span className="text-sm font-bold text-ink">{s.patient}</span>
                                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                                  style={{ background: `${meta.color}1f`, color: meta.color }}>{meta.label}</span>
                              </div>
                              <div className="text-[11px] font-medium text-ink-muted">{s.reason}</div>
                            </div>
                            {s.done
                              ? <CheckCircle2 className="h-5 w-5 flex-none text-emerald-500" />
                              : <Clock className="h-5 w-5 flex-none text-ink-faint" />}
                          </GlassCard>
                        </div>
                      </Reveal>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-5">
                <Reveal>
                  <Card title="Session summary" sub="How today is tracking" icon={Activity} tint={P.mint}>
                    <div className="space-y-3">
                      {[
                        { l: 'Seen', v: TODAY_SLOTS.length - pending, c: P.mint },
                        { l: 'Remaining', v: pending, c: P.peach },
                        { l: 'Urgent', v: TODAY_SLOTS.filter((s) => s.kind === 'urgent').length, c: P.rose },
                      ].map((r) => (
                        <div key={r.l}>
                          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                            <span className="text-ink-soft">{r.l}</span>
                            <span className="text-ink">{r.v}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                            <motion.div className="h-full rounded-full" style={{ background: r.c }}
                              initial={{ width: 0 }} animate={{ width: `${(r.v / TODAY_SLOTS.length) * 100}%` }}
                              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Reveal>

                <Reveal delay={0.05}>
                  <Card title="Next up" sub="Your following patient" icon={ArrowRight} tint={P.brand}>
                    {(() => {
                      const next = TODAY_SLOTS.find((s) => !s.done);
                      if (!next) return <p className="text-sm text-ink-muted">Clinic complete for today.</p>;
                      const pt = roster.find((p) => p.name === next.patient);
                      return (
                        <button onClick={() => pt && setSelected(pt)} className="w-full text-left">
                          <div className="text-2xl font-extrabold text-ink">{next.time}</div>
                          <div className="mt-1 text-sm font-bold text-ink">{next.patient}</div>
                          <div className="text-xs text-ink-muted">{next.reason}</div>
                          {pt && (
                            <div className="mt-3 flex items-center gap-2">
                              <RiskPill level={pt.risk} />
                              <span className="text-[11px] font-semibold text-ink-muted">BP {pt.bp.sys}/{pt.bp.dia}</span>
                            </div>
                          )}
                        </button>
                      );
                    })()}
                  </Card>
                </Reveal>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================== REPORTS ============================== */}
        {tab === 'reports' && (
          <motion.div key="rp" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            <Reveal className="mb-4">
              <h2 className="text-lg font-extrabold tracking-tight text-ink">Practice reports</h2>
              <p className="text-sm text-ink-muted">Screening compliance and delivery outcomes across your caseload.</p>
            </Reveal>

            <div className="grid gap-5 lg:grid-cols-2">
              <Reveal>
                <Card title="Screening compliance" sub="% of eligible patients completed" icon={ClipboardList} tint={P.peach}>
                  <div className="space-y-3.5">
                    {SCREENING.map((s) => (
                      <div key={s.name}>
                        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                          <span className="text-ink-soft">{s.name}</span>
                          <span className={cn(s.done >= 90 ? 'text-emerald-600' : s.done >= 75 ? 'text-ink' : 'text-amber-600')}>
                            {s.done}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                          <motion.div className="h-full rounded-full"
                            style={{ background: s.done >= 90 ? P.mint : s.done >= 75 ? P.peach : '#f6b93b' }}
                            initial={{ width: 0 }} whileInView={{ width: `${s.done}%` }} viewport={{ once: true }}
                            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={0.05}>
                <Card title="Delivery outcomes" sub="Term vs preterm, last 6 months" icon={HeartPulse} tint={P.rose}>
                  <ResponsiveContainer width="100%" height={225}>
                    <LineChart data={OUTCOMES} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                      <XAxis dataKey="m" tickLine={false} axisLine={false} tick={axisTick} dy={6} />
                      <YAxis tickLine={false} axisLine={false} tick={axisTick} width={30} />
                      <Tooltip content={<Tip />} />
                      <Line type="monotone" dataKey="term" name="Term" stroke={P.mint} strokeWidth={2.6} dot={{ r: 3, fill: P.mint }} />
                      <Line type="monotone" dataKey="preterm" name="Preterm" stroke={P.rose} strokeWidth={2.6} dot={{ r: 3, fill: P.rose }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-3 flex gap-4">
                    {[{ l: 'Term', c: P.mint }, { l: 'Preterm', c: P.rose }].map((x) => (
                      <span key={x.l} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: x.c }} />{x.l}
                      </span>
                    ))}
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={0.1} className="lg:col-span-2">
                <Card title="Risk distribution" sub="Where your caseload sits today" icon={ShieldAlert} tint={P.violet}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(['high', 'moderate', 'low'] as RiskLevel[]).map((r) => {
                      const n = riskCount(r);
                      const pct = Math.round((n / roster.length) * 100);
                      return (
                        <div key={r} className="rounded-2xl border border-white/60 bg-white/55 p-4">
                          <div className="flex items-center justify-between">
                            <RiskPill level={r} />
                            <span className="text-2xl font-extrabold tabular-nums text-ink">{n}</span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                            <motion.div className="h-full rounded-full" style={{ background: RISK_META[r].color }}
                              initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }}
                              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
                          </div>
                          <div className="mt-2 text-[11px] font-semibold text-ink-muted">{pct}% of caseload</div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
                    Risk levels are derived from logged vitals, reported symptoms and history — they support triage,
                    they do not replace clinical judgement.
                  </p>
                </Card>
              </Reveal>
            </div>
          </motion.div>
        )}
      </main>

      <Footer />
      <PatientDrawer patient={selected} onClose={() => setSelected(null)}
        onAssign={(p) => { setSelected(null); setAssigning(p); }} />
      <DoctorProfile open={profileOpen} onClose={() => setProfileOpen(false)} />
      <AssignModal patient={assigning} clinician="Dr. Lena Ortiz" onClose={() => setAssigning(null)} />
    </>
  );
}

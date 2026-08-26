import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity, Apple, ArrowRight, Baby, CalendarDays, Check, ChevronLeft, ChevronRight, FileText,
  CalendarClock, Clock, Droplet, GlassWater, HeartPulse, Lightbulb, Minus, Moon, Plus, RefreshCw,
  Ruler, Scale, ShieldAlert, Smile, Sparkles, Stethoscope, TrendingUp, Utensils,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart,
  Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from 'recharts';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { SymptomModal } from '@/components/mother/SymptomModal';
import { AppointmentModal } from '@/components/mother/AppointmentModal';
import { MotherTabs, type MotherTab } from '@/components/mother/MotherTabs';
import { CommunitySection } from '@/components/mother/CommunitySection';
import { FindDoctorSection } from '@/components/mother/FindDoctorSection';
import { RemindersSection } from '@/components/mother/RemindersSection';
import { VaccinationRecord } from '@/components/mother/VaccinationRecord';
import { CarePlan } from '@/components/mother/CarePlan';
import { RiskPanel } from '@/components/mother/RiskPanel';
import { StageHero } from '@/components/mother/StageHero';
import { ProfileModal } from '@/components/mother/ProfileModal';
import { SosModal } from '@/components/mother/SosModal';
import { WeightGainCard } from '@/components/mother/WeightGainCard';
import { BeamsBackground } from '@/components/ui/BeamsBackground';
import { DailyCheckIn } from '@/components/mother/DailyCheckIn';
import { OutOfRange, RangeChip } from '@/components/mother/OutOfRange';
import { ReportButton } from '@/components/ui/ReportButton';
import { NotificationBell } from '@/components/mother/NotificationBell';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { checkInStatus } from '@/lib/checkin';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useVitalSeries } from '@/hooks/useVitalSeries';
import { usePregnancy } from '@/hooks/usePregnancy';
import { useProfile } from '@/context/ProfileContext';
import { INTENSITY_LABEL, URGENT_LABELS, type Symptom } from '@/data/symptoms';
import { countdown, formatTime, KIND_COLOR, upcoming } from '@/data/reminders';
import {
  buildAdvice, buildForecast, buildReport, glassesFor, kickStatus, moodTone, TONE_CLASS, TONE_DOT,
  waterStatus, WATER_GOAL, type Tone,
} from '@/lib/health';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Reveal } from '@/components/ui/Reveal';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import type { SosAlert } from '@/data/sos';
import type { ChildState, Vaccination } from '@/data/records';
import { useT } from '@/i18n';

/* ---------------- palette for charts ---------------- */
const C = {
  brand: '#3f66f0',
  brand2: '#5b83fb',
  aqua: '#22b8c4',
  peach: '#fb7534',
  rose: '#f2789f',
  mint: '#2fbf9b',
  gold: '#f6b93b',
  violet: '#8b7bf3',
  ink: '#9aa3ba',
};

/* ---------------- mock data ---------------- */
/*
 * WEEK_DAYS and FACTS lived here: a calendar strip fixed at the 15th to the
 * 21st, and five tiles reading "Due date Apr 2 · Days to go 98 · Length
 * 35.6 cm · Weight 760 g · Heartbeat 148 bpm". None of it came from her
 * record, and all of it contradicted the record — which had her due in
 * November, 73 days out, carrying something the size of an eggplant. The
 * heartbeat had never been measured at all. They are gone; StageHero builds
 * the same tiles from `pregnancy`, `child` and her logged weight.
 */

const MOODS = [
  { name: 'Happy', face: '😊', note: 'Lovely — happiness is good for baby too.', tint: '#f6b93b' },
  { name: 'Calm', face: '😌', note: 'Calm and rested. Keep that gentle rhythm.', tint: '#3f66f0' },
  { name: 'Loved', face: '🥰', note: 'Feeling supported makes a real difference.', tint: '#f2789f' },
  { name: 'Neutral', face: '🙂', note: 'A steady, ordinary day — that’s perfectly fine.', tint: '#8b7bf3' },
  { name: 'Tired', face: '😴', note: 'Rest when you can — fatigue is normal at every stage.', tint: '#22b8c4' },
  { name: 'Anxiety', face: '😰', note: 'Try slow breathing. Your care team is one tap away.', tint: '#fb7534' },
  { name: 'Sad', face: '😢', note: 'Be gentle with yourself. Talk to someone you trust.', tint: '#5b83fb' },
  { name: 'Stress', face: '😣', note: 'Pause and stretch. Tell your doctor if it persists.', tint: '#e5484d' },
];

/** Greeting for the viewer's own local time. */
function greetingFor(d: Date) {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h === 12) return 'Good noon';
  if (h >= 13 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

/** A closing line that suits the time of day. */
function dayNoteFor(d: Date) {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'Everything looks calm today.';
  if (h >= 12 && h < 17) return 'A good moment to drink some water.';
  if (h >= 17 && h < 21) return 'Winding down — how has today felt?';
  return 'Rest well — sleep on your side tonight.';
}

const WEIGHT = [
  { w: 'W12', kg: 1.2, lo: 0.5, hi: 2.0 },
  { w: 'W16', kg: 3.1, lo: 1.6, hi: 3.6 },
  { w: 'W20', kg: 5.4, lo: 3.5, hi: 6.4 },
  { w: 'W24', kg: 7.2, lo: 5.5, hi: 9.0 },
  { w: 'W26', kg: 8.3, lo: 6.8, hi: 10.6 },
];

const GROWTH = [
  { w: 'W12', len: 5.4, wt: 14 },
  { w: 'W16', len: 11.6, wt: 100 },
  { w: 'W20', len: 16.4, wt: 300 },
  { w: 'W24', len: 30, wt: 600 },
  { w: 'W26', len: 35.6, wt: 760 },
];

const BP = [
  { d: 'Sep', sys: 116, dia: 74 },
  { d: 'Oct', sys: 118, dia: 76 },
  { d: 'Nov', sys: 121, dia: 78 },
  { d: 'Dec', sys: 119, dia: 75 },
];

const HR = [
  { d: 'W22', bpm: 152 }, { d: 'W23', bpm: 150 }, { d: 'W24', bpm: 149 },
  { d: 'W25', bpm: 151 }, { d: 'W26', bpm: 148 },
];

const SLEEP = [
  { d: 'Mon', h: 7.2 }, { d: 'Tue', h: 6.4 }, { d: 'Wed', h: 8.1 }, { d: 'Thu', h: 7.6 },
  { d: 'Fri', h: 6.9 }, { d: 'Sat', h: 8.4 }, { d: 'Sun', h: 7.8 },
];

const FUNDAL = [
  { w: 'W20', cm: 20 }, { w: 'W22', cm: 22 }, { w: 'W24', cm: 24.5 }, { w: 'W26', cm: 26 },
];

const MOOD = [
  { name: 'Calm', value: 42, color: C.brand },
  { name: 'Happy', value: 28, color: C.mint },
  { name: 'Tired', value: 18, color: C.gold },
  { name: 'Anxious', value: 12, color: C.rose },
];

/*
 * A NUTRIENTS constant lived here — Folate 92%, Iron 78%, Calcium 85% — drawn
 * as progress bars under the heading "Nutrition today · % of daily goal".
 * There is no food logging anywhere in this app, so not one of those numbers
 * could have been measured. A bar is a claim of measurement. It is now the
 * CarePlan section, which separates what to aim for from what she has
 * actually logged.
 */

const APPTS = [
  { date: 'Dec 20', title: 'Growth ultrasound', who: 'Dr. Lena Ortiz', type: 'Scan', tint: C.brand },
  { date: 'Jan 03', title: 'Glucose screening', who: 'MaternalCare Lab', type: 'Test', tint: C.aqua },
  { date: 'Jan 17', title: 'Week 30 check-up', who: 'Dr. Lena Ortiz', type: 'Visit', tint: C.rose },
];


/* ---------------- shared bits ---------------- */
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

const axisTick = { fontSize: 11, fill: C.ink, fontWeight: 600 };

function ChartCard({
  title, sub, icon: Icon, tint = C.brand, right, span, children,
}: {
  title: string; sub?: string; icon: any; tint?: string; right?: React.ReactNode;
  span?: '2' | '3'; children: React.ReactNode;
}) {
  return (
    <Reveal className={cn(span === '2' && 'md:col-span-2', span === '3' && 'md:col-span-2 xl:col-span-3')}>
      <GlassCard float className="flex h-full flex-col p-5 sm:p-6">
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
    </Reveal>
  );
}

/**
 * Stands in for a chart that has nothing to draw yet. A chart axis with no
 * series on it reads as a bug; saying there is nothing logged does not.
 */
function NoReadings({ what, height = 190 }: { what: string; height?: number }) {
  return (
    <div
      style={{ height }}
      className="grid place-items-center rounded-2xl border border-dashed border-ink/12 px-4 text-center"
    >
      <div>
        <div className="text-[13px] font-bold text-ink-soft">No {what} logged yet</div>
        <div className="mt-0.5 text-[11px] text-ink-faint">This fills in as you record readings.</div>
      </div>
    </div>
  );
}

/**
 * Marks a chart the database cannot yet back. These are real antenatal
 * measurements with no column behind them — better to say so on the card than
 * to let a demo series pass for her own readings.
 */
function SampleTag() {
  return (
    <span className="rounded-full bg-ink/6 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-faint">
      Sample
    </span>
  );
}

function Legend({ items }: { items: { label: string; color: string; dash?: boolean }[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.dash ? 'transparent' : it.color, border: it.dash ? `2px dashed ${it.color}` : undefined }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ---------------- interactive insight cards ---------------- */
function StepButton({ onClick, label, children, disabled }: {
  onClick: () => void; label: string; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className="grid h-8 w-8 flex-none place-items-center rounded-xl border border-white/70 bg-white/80 text-ink-soft shadow-soft transition-colors hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </motion.button>
  );
}

/** Today's mood — ‹ › cycles through the mood list with a spring swap. */
function MoodCard({ i, setI }: { i: number; setI: (v: number) => void }) {
  const dir = useRef<1 | -1>(1);
  const mood = MOODS[i];
  const go = (d: 1 | -1) => { dir.current = d; setI((i + d + MOODS.length) % MOODS.length); };

  return (
    <GlassCard float className="flex h-full flex-col p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-2xl" style={{ background: `${mood.tint}1f`, color: mood.tint }}>
          <Smile className="h-5 w-5" />
        </span>
        <div className="text-sm font-bold text-ink">Today’s mood</div>
      </div>

      {/* ‹ face + name › */}
      <div className="mt-3 flex items-center gap-2">
        <StepButton onClick={() => go(-1)} label="Previous mood"><ChevronLeft className="h-4 w-4" /></StepButton>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5">
          <div className="relative h-11 w-11 flex-none overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={mood.name}
                initial={{ opacity: 0, y: dir.current * 22, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: dir.current * -22, scale: 0.7 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22, mass: 0.6 }}
                className="absolute inset-0 grid place-items-center text-[38px] leading-none"
              >
                {mood.face}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="relative h-7 min-w-0 flex-1 overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={mood.name}
                initial={{ opacity: 0, x: dir.current * 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir.current * -14 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center text-lg font-extrabold leading-tight"
                style={{ color: mood.tint }}
              >
                {mood.name}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <StepButton onClick={() => go(1)} label="Next mood"><ChevronRight className="h-4 w-4" /></StepButton>
      </div>

      {/* dots */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {MOODS.map((m, idx) => (
          <button
            key={m.name}
            aria-label={m.name}
            onClick={() => { dir.current = idx > i ? 1 : -1; setI(idx); }}
            className={cn('h-1.5 rounded-full transition-all', idx === i ? 'w-5' : 'w-1.5 bg-ink/15 hover:bg-ink/30')}
            style={idx === i ? { background: mood.tint } : undefined}
          />
        ))}
      </div>

      <div className={cn('mt-3 rounded-xl px-3 py-2 text-[11px] font-semibold leading-relaxed ring-1', TONE_CLASS[moodTone(mood.name)])}>
        {mood.note}
      </div>
    </GlassCard>
  );
}

/** Counter card with − / + controls and a value-driven message box. */
function CounterCard({
  icon: Icon, title, sub, tint, value, setValue, step, min, max, format, message, extra,
}: {
  icon: any; title: string; sub: string; tint: string; value: number;
  setValue: (v: number) => void; step: number; min: number; max: number;
  format: (v: number) => string; message: (v: number) => { text: string; tone: Tone };
  extra?: React.ReactNode;
}) {
  const dir = useRef<1 | -1>(1);
  const bump = (d: 1 | -1) => {
    dir.current = d;
    setValue(Math.min(max, Math.max(min, +(value + d * step).toFixed(1))));
  };
  const msg = message(value);

  return (
    <GlassCard float className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-2xl" style={{ background: `${tint}1f`, color: tint }}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex items-center gap-1.5">
          {extra}
          <StepButton onClick={() => bump(-1)} label={`Decrease ${title}`} disabled={value <= min}>
            <Minus className="h-4 w-4" />
          </StepButton>
          <div className="relative h-8 w-14 overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={value}
                initial={{ opacity: 0, y: dir.current * 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: dir.current * -14 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute inset-0 grid place-items-center text-xl font-extrabold tabular-nums text-ink"
              >
                {format(value)}
              </motion.div>
            </AnimatePresence>
          </div>
          <StepButton onClick={() => bump(1)} label={`Increase ${title}`} disabled={value >= max}>
            <Plus className="h-4 w-4" />
          </StepButton>
        </div>
      </div>

      <div className="mt-4 text-sm font-bold text-ink">{title}</div>
      <div className="text-xs text-ink-muted">{sub}</div>

      <motion.div
        key={msg.tone}
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={cn('mt-3 rounded-xl px-3 py-2 text-[11px] font-semibold leading-relaxed ring-1', TONE_CLASS[msg.tone])}
      >
        {msg.text}
      </motion.div>
    </GlassCard>
  );
}

/** "an avocado", "a banana" — the size comparison reads as a phrase, not a label. */
const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

/* ---------------- the wide pregnancy arc (spans the full card) ---------------- */
/*
 * PregnancyArc moved into StageHero, where it takes the whole `pregnancy`
 * object instead of a bare week number. It had "Second trimester", "Due ·
 * Apr 2" and "Butternut squash · 35.6 cm · 760 g" written into its markup,
 * so it announced the second trimester to a mother the model had placed in
 * the third.
 */

/* ---------------- page ---------------- */
export function Mother() {
  const navigate = useNavigate();
  /*
   * Mood, kicks and hydration are hers to report and are stored per day.
   * They were useState, so every figure reset on refresh and nothing could
   * be charted. Local state still drives the UI for instant feedback; each
   * change is written through, debounced so holding "+" is one request.
   */
  const [kicks, setKicksLocal] = useState(12);
  const [water, setWaterLocal] = useState(1.4);
  const [moodIdx, setMoodIdxLocal] = useState(1); // Calm
  const [logLoaded, setLogLoaded] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getDailyLog()
      .then(({ today }) => {
        if (cancelled) return;
        if (today.kicks != null) setKicksLocal(today.kicks);
        if (today.waterLitres != null) setWaterLocal(today.waterLitres);
        if (today.mood) {
          const i = MOODS.findIndex((m) => m.name === today.mood);
          if (i >= 0) setMoodIdxLocal(i);
        }
        setLogLoaded(true);
      })
      .catch(() => setLogLoaded(true));   // offline — the defaults stand
    return () => { cancelled = true; };
  }, []);

  const queueSave = (patch: { mood?: string; kicks?: number; waterLitres?: number }) => {
    if (!logLoaded) return;               // never write before the first read
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      api.saveDailyLog(patch).catch(() => { /* offline — applies this session */ });
    }, 600);
  };

  const setKicks = (v: number) => { setKicksLocal(v); queueSave({ kicks: v }); };
  const setWater = (v: number) => { setWaterLocal(v); queueSave({ waterLitres: v }); };
  const setMoodIdx = (i: number) => {
    setMoodIdxLocal(i);
    queueSave({ mood: MOODS[i]?.name });
  };
  const [logOpen, setLogOpen] = useState(false);
  const [apptOpen, setApptOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const urlTab = params.get('tab') as MotherTab | null;
  const TABS: MotherTab[] = ['dashboard', 'vitals', 'reminders', 'care', 'community'];
  const [tab, setTabState] = useState<MotherTab>(
    urlTab && TABS.includes(urlTab) ? urlTab : 'dashboard',
  );
  // keep the URL in step so sections are linkable and survive a refresh
  const setTab = (t: MotherTab) => {
    setTabState(t);
    setParams(t === 'dashboard' ? {} : { tab: t }, { replace: true });
  };
  useEffect(() => {
    if (urlTab && urlTab !== tab && TABS.includes(urlTab)) setTabState(urlTab);
  }, [urlTab]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [liveAlert, setLiveAlert] = useState<SosAlert | null>(null);
  const profile = useProfile();

  // an alert raised in a previous visit should still show as live on return
  useEffect(() => {
    api.getSosState().then((s) => setLiveAlert(s.active)).catch(() => setLiveAlert(null));
  }, []);
  // 'general' has no reading set of its own — fall back to the pregnancy one
  const communityStage = profile.stage === 'general' ? 'pregnant' : profile.stage;

  // persisted state lives in the Express/Postgres Model layer
  const { status, symptoms, reminders, saveSymptoms, endSymptomEntry, changeReminders } = useDashboardData();
  // the trend charts, built from her stored readings rather than fixtures
  const vitals = useVitalSeries();
  // dates and month names follow her chosen language
  const { locale } = useT();
  /** the daily check-in sheet — opened from the bell or from "View all" */
  const [checkInOpen, setCheckInOpen] = useState(false);
  // one source for "what week is she in" — every mention below reads this
  const { pregnancy } = usePregnancy();

  /*
   * The dashboard hero depends on her life stage, and three of the four
   * stages are about a child rather than a pregnancy — so the child record
   * and the vaccination schedule are loaded here rather than only on the
   * tabs that used to need them.
   */
  const [childState, setChildState] = useState<ChildState | null>(null);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  useEffect(() => {
    let cancelled = false;
    api.getChild()
      .then((c) => { if (!cancelled) setChildState(c); })
      .catch(() => { /* she may not have a child on the account */ });
    api.getVaccinations()
      .then((v) => { if (!cancelled) setVaccinations(v.rows); })
      .catch(() => { /* the hero degrades to "—" */ });
    return () => { cancelled = true; };
  }, []);
  const week = pregnancy?.week ?? 0;
  const weeksToGo = pregnancy ? Math.max(0, Math.round(pregnancy.daysLeft / 7)) : 0;

  /** Her logged moods as a share of the days she logged one, biggest first. */
  const moodSlices = useMemo(() => {
    const logged = vitals.moods.filter((m) => m.mood);
    const counts = new Map<string, number>();
    for (const { mood } of logged) counts.set(mood!, (counts.get(mood!) ?? 0) + 1);
    const slices: { name: string; value: number; color: string }[] = [...counts.entries()]
      .map(([name, n]) => ({
        name,
        value: Math.round((n / logged.length) * 100),
        color: MOODS.find((m) => m.name === name)?.tint ?? C.brand,
      }))
      .sort((a, b) => b.value - a.value);
    return { slices, days: logged.length };
  }, [vitals.moods]);
  const nextUp = upcoming(reminders);

  const moodName = MOODS[moodIdx].name;
  const report = buildReport({ water, kicks, moodName, symptoms, sleepAvg: 7.5 });
  const advice = buildAdvice(symptoms);
  const forecast = buildForecast(week, pregnancy?.eddPretty ?? 'your due date');

  // greeting follows the viewer's own local clock, refreshed each minute
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const greeting = greetingFor(now);
  const localDate = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  /** symptoms carried over from a previous entry that haven't been checked in yet */
  const pendingReview = symptoms.filter((s) => !s.confirmedToday);
  // closing the logger ends this entry — the next one asks whether each symptom is still present
  const closeLogger = () => {
    setLogOpen(false);
    endSymptomEntry();
  };
  const glasses = glassesFor(water);
  const goalGlasses = glassesFor(WATER_GOAL);

  return (
    <>
      <Navbar />
      {/* floating section dock — sits above everything, bottom-centred */}
      <MotherTabs active={tab} onChange={setTab} badges={{ reminders: nextUp.length }} />

      <main className="mx-auto max-w-6xl px-4 pb-36 pt-28 sm:pt-32">
        {/* greeting */}
        <Reveal className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Your pregnancy</span>
            <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              {greeting}, <span className="font-serif italic text-brand-600">{profile.name.split(' ')[0]}</span>
            </h1>
            <p className="mt-1 text-sm text-ink-muted">{localDate} · {dayNoteFor(now)}</p>
          </div>
          <div className="flex items-center gap-2.5">
            <LanguageToggle />
            <NotificationBell
              sosActive={!!liveAlert}
              vitalAlerts={vitals.alerts}
              pendingSymptoms={pendingReview}
              reminders={nextUp}
              checkIn={checkInStatus(vitals.today, vitals.logHistory, vitals.readings)}
              onAction={(a) => {
                if (a === 'sos') setSosOpen(true);
                else if (a === 'checkin') setCheckInOpen(true);
                else if (a === 'symptoms') setLogOpen(true);
                else if (a === 'reminders') setApptOpen(true);
              }}
            />

            {/* emergency SOS — always one tap away */}
            <motion.button
              onClick={() => setSosOpen(true)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              aria-label={liveAlert ? 'Emergency alert is active' : 'Emergency SOS'}
              title={liveAlert ? 'An alert is active — tap to stand down' : 'Emergency SOS'}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-2xl px-3.5 text-sm font-bold text-white',
                liveAlert
                  ? 'bg-gradient-to-br from-rose-600 to-rose-700 shadow-[0_10px_30px_-6px_rgba(190,18,60,0.75)] ring-2 ring-rose-300'
                  : 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-[0_10px_30px_-8px_rgba(225,29,72,0.55)]',
              )}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              <span className="hidden sm:inline">{liveAlert ? 'Alert active' : 'SOS'}</span>
            </motion.button>

            <motion.button
              onClick={() => setProfileOpen(true)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              aria-label="Open your profile"
              className="h-11 w-11 flex-none overflow-hidden rounded-2xl shadow-glow"
            >
              {profile.avatar
                ? <img src={profile.avatar} alt={profile.name} className="h-full w-full object-cover" />
                : <span className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">{profile.initials}</span>}
            </motion.button>
          </div>
        </Reveal>

        {/* ============================== DASHBOARD ============================== */}
        {tab === 'dashboard' && (
        <motion.div key="tab-dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>

        {/*
          HERO — one card per life stage.

          This was a single pregnancy hero shown to all four kinds of user, so
          somebody planning a pregnancy was told she was 29 weeks into one. Most
          of its figures were also hardcoded and contradicted the app's own
          record — see StageHero for the list.
        */}
        <Reveal>
          <StageHero
            stage={profile.stage}
            pregnancy={pregnancy}
            child={childState}
            weightGain={vitals.weightGain}
            vaccinations={vaccinations}
            locale={locale}
            onEditDates={() => navigate('/onboarding')}
          />
        </Reveal>

        {/* DAILY INSIGHTS */}
        <div className="mt-8">
          <Reveal className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold tracking-tight text-ink">My daily insights · Today</h2>
            <button
              onClick={() => setCheckInOpen(true)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Update all <ChevronRight className="h-4 w-4" />
            </button>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Reveal>
              <GlassCard
                interactive
                onClick={() => setLogOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e: any) => (e.key === 'Enter' || e.key === ' ') && setLogOpen(true)}
                className="relative flex h-full flex-col overflow-hidden p-5"
              >
                {/* the card's own weather — always drifting, brighter when something waits */}
                <BeamsBackground
                  intensity={pendingReview.length > 0 ? 'strong' : 'medium'}
                  count={12}
                />

                <div className="relative flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: `${C.rose}1f`, color: C.rose }}>
                    <Plus className="h-5 w-5" />
                  </span>
                  <ArrowRight className="h-5 w-5 text-ink-faint" />
                </div>
                <div className="relative mt-4 text-sm font-bold text-ink">Log symptoms</div>
                <div className="relative text-xs text-ink-muted">Speak or type how you feel</div>

                {pendingReview.length > 0 ? (
                  <div className="relative mt-3 rounded-xl border border-white/70 bg-white/70 px-3 py-2.5 shadow-soft backdrop-blur-md">
                    <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-ink">
                      <RefreshCw className="h-3.5 w-3.5 text-brand-600" />
                      Earlier symptoms still there?
                    </div>
                    <div className="mt-1 text-[11px] font-semibold leading-relaxed text-ink-muted">
                      {pendingReview.map((s) => s.name).slice(0, 2).join(', ')}
                      {pendingReview.length > 2 ? ` +${pendingReview.length - 2} more` : ''} — tap to check in.
                    </div>
                  </div>
                ) : (
                  <div className={cn(
                    'relative mt-3 rounded-xl px-3 py-2 text-[11px] font-semibold leading-relaxed ring-1',
                    TONE_CLASS[symptoms.some((s) => URGENT_LABELS.has(s.name)) ? 'danger'
                      : symptoms.some((s) => s.intensity === 'severe') ? 'warn'
                      : symptoms.length ? 'info' : 'good'],
                  )}>
                    {symptoms.length
                      ? `${symptoms.length} logged today · ${symptoms.map((s) => s.name).slice(0, 2).join(', ')}${symptoms.length > 2 ? '…' : ''}`
                      : 'Nothing logged today. Tap to add how you feel.'}
                  </div>
                )}
              </GlassCard>
            </Reveal>

            <Reveal delay={0.05}><MoodCard i={moodIdx} setI={setMoodIdx} /></Reveal>

            <Reveal delay={0.1}>
              <CounterCard
                icon={Activity} title="Kicks today" sub="movements counted" tint={C.violet}
                value={kicks} setValue={setKicks} step={1} min={0} max={60}
                format={(v) => String(v)} message={kickStatus}
              />
            </Reveal>

            {/* appointments & reminders — soonest first */}
            <Reveal delay={0.15}>
              <GlassCard
                interactive
                onClick={() => setApptOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e: any) => (e.key === 'Enter' || e.key === ' ') && setApptOpen(true)}
                className="flex h-full flex-col p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: `${C.brand}1f`, color: C.brand }}>
                    <CalendarClock className="h-5 w-5" />
                  </span>
                  {nextUp.length > 0 && (
                    <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] font-bold text-brand-700">
                      {nextUp.length} upcoming
                    </span>
                  )}
                </div>

                <div className="mt-4 text-sm font-bold text-ink">Appointments &amp; reminders</div>
                <div className="text-xs text-ink-muted">Medicine · Doctor · Test · Exercise</div>

                <div className="mt-3 space-y-1.5">
                  {nextUp.slice(0, 2).map((r) => {
                    const d = new Date(r.at);
                    const c = countdown(r.at);
                    return (
                      <div key={r.id} className="flex items-center gap-2 rounded-xl border border-white/60 bg-white/60 px-2.5 py-1.5">
                        <span className="h-2 w-2 flex-none rounded-full" style={{ background: KIND_COLOR[r.kind] }} />
                        <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-ink">{r.title}</span>
                        <span className="flex-none text-[10px] font-semibold text-ink-muted">{formatTime(d)}</span>
                        <span className={cn('flex-none rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                          c.overdue ? 'bg-rose-500/12 text-rose-700' : 'bg-brand-500/10 text-brand-700')}>
                          {c.text}
                        </span>
                      </div>
                    );
                  })}
                  {nextUp.length === 0 && (
                    <div className="rounded-xl border border-dashed border-ink/15 px-2.5 py-3 text-center text-[11px] font-medium text-ink-faint">
                      Nothing scheduled — tap to add a reminder.
                    </div>
                  )}
                </div>
              </GlassCard>
            </Reveal>
          </div>
        </div>

        {/* HEALTH MONITOR — built from everything logged above */}
        <div className="mt-9">
          <Reveal className="mb-4">
            <h2 className="text-lg font-extrabold tracking-tight text-ink">Health monitor &amp; predictions</h2>
            <p className="text-sm text-ink-muted">
              What’s ahead, what to expect, and what it means for you and baby.
            </p>
          </Reveal>

          {/* alerts */}
          {report.alerts.length > 0 && (
            <Reveal className="mb-4">
              <div className="space-y-2.5">
                {report.alerts.map((a, i) => (
                  <div key={i} className={cn('flex items-start gap-3 rounded-2xl px-4 py-3 ring-1', TONE_CLASS[a.tone])}>
                    <ShieldAlert className="mt-0.5 h-4.5 w-4.5 flex-none" />
                    <div>
                      <div className="text-sm font-bold">{a.title}</div>
                      <div className="mt-0.5 text-xs font-medium leading-relaxed opacity-90">{a.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            {/* score + factors */}
            <Reveal>
              <GlassCard float className="h-full p-6">
                <div className="flex items-center gap-5">
                  <div className="relative grid h-[112px] w-[112px] flex-none place-items-center">
                    <svg width="112" height="112" className="-rotate-90">
                      <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(63,102,240,0.10)" strokeWidth="10" />
                      <motion.circle
                        cx="56" cy="56" r="48" fill="none"
                        stroke={TONE_DOT[report.band.tone]} strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 48}
                        animate={{ strokeDashoffset: 2 * Math.PI * 48 * (1 - report.score / 100) }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </svg>
                    <div className="absolute text-center">
                      <div className="text-2xl font-extrabold text-ink">{report.score}</div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-ink-faint">score</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Today’s wellbeing</div>
                    <div className="mt-1 text-2xl font-extrabold tracking-tight" style={{ color: TONE_DOT[report.band.tone] }}>
                      {report.band.label}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                      A combined view of you and baby — updates instantly as you log.
                    </p>
                  </div>
                </div>

                {/* projections — things she hasn't entered herself */}
                <div className="mt-6 grid grid-cols-3 gap-2.5">
                  {forecast.predictions.map((p) => (
                    <div key={p.label} className="rounded-2xl border border-white/60 bg-white/55 p-3">
                      <div className="text-[10px] font-bold uppercase leading-tight tracking-wider text-ink-faint">{p.label}</div>
                      <div className="mt-1 text-[15px] font-extrabold leading-tight text-ink">{p.value}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-ink-muted">{forecast.predictions[0].note}</p>

                {/* upcoming care */}
                <div className="mt-5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Coming up in your care</div>
                  <div className="mt-2.5 space-y-2">
                    {forecast.milestones.map((m) => (
                      <div key={m.title} className="flex items-start gap-2.5 rounded-2xl border border-white/60 bg-white/55 px-3 py-2.5">
                        <span className={cn('mt-1.5 h-2 w-2 flex-none rounded-full',
                          m.status === 'due' ? 'bg-rose-500' : m.status === 'soon' ? 'bg-amber-500' : 'bg-brand-400')} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-[12px] font-bold text-ink">{m.title}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{m.window}</span>
                            {m.status === 'due' && <span className="rounded-full bg-rose-500/12 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-700">due now</span>}
                          </div>
                          <div className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{m.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </Reveal>

            {/* mother + baby effects */}
            <div className="grid gap-5 sm:grid-cols-2">
              <Reveal delay={0.05}>
                <GlassCard float className="h-full p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${C.rose}1f`, color: C.rose }}>
                      <HeartPulse className="h-[18px] w-[18px]" />
                    </span>
                    <div className="text-sm font-bold text-ink">Effect on you</div>
                  </div>
                  <div className="mt-4 space-y-2.5">
                    {report.mother.map((m, i) => (
                      <div key={i} className={cn('rounded-xl px-3 py-2.5 ring-1', TONE_CLASS[m.tone])}>
                        <div className="text-[12px] font-bold">{m.title}</div>
                        <div className="mt-0.5 text-[11px] font-medium leading-relaxed opacity-90">{m.detail}</div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </Reveal>

              <Reveal delay={0.1}>
                <GlassCard float className="h-full p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${C.mint}1f`, color: C.mint }}>
                      <Baby className="h-[18px] w-[18px]" />
                    </span>
                    <div className="text-sm font-bold text-ink">Effect on baby</div>
                  </div>
                  <div className="mt-4 space-y-2.5">
                    {report.baby.map((b, i) => (
                      <div key={i} className={cn('rounded-xl px-3 py-2.5 ring-1', TONE_CLASS[b.tone])}>
                        <div className="text-[12px] font-bold">{b.title}</div>
                        <div className="mt-0.5 text-[11px] font-medium leading-relaxed opacity-90">{b.detail}</div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </Reveal>
            </div>
          </div>

          {/* good to know — new guidance for this stage */}
          <Reveal className="mt-5">
            <GlassCard float className="p-6">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${C.violet}1f`, color: C.violet }}>
                  <Lightbulb className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <div className="text-sm font-bold text-ink">Good to know at week {week}</div>
                  <div className="text-xs text-ink-muted">Guidance for the stage you’re entering — not from what you logged.</div>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {forecast.advice.map((a) => (
                  <div key={a.title} className={cn('rounded-2xl px-4 py-3 ring-1', TONE_CLASS[a.tone])}>
                    <div className="text-[12px] font-bold">{a.title}</div>
                    <div className="mt-1 text-[11px] font-medium leading-relaxed opacity-90">{a.detail}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </Reveal>

          <Reveal>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
              Projections are population estimates for week {week}, not predictions about your individual pregnancy.
              These insights support conversations with your care team — they are not a medical diagnosis.
            </p>
          </Reveal>
        </div>

        </motion.div>
        )}

        {/* ================================ VITALS ================================ */}
        {tab === 'vitals' && (
        <motion.div key="tab-vitals" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>

        {/* anything currently outside its band, whichever metric it is */}
        <Reveal className="mt-9">
          <OutOfRange
            alerts={vitals.alerts}
            weightGain={vitals.weightGain}
            loaded={vitals.loaded}
          />
        </Reveal>

        {/* how her gain compares with the range for her starting BMI */}
        <Reveal className="mt-5">
          <WeightGainCard />
        </Reveal>

        {/* CHARTS GRID */}
        <div className="mt-5">
          <Reveal className="mb-4">
            <h2 className="text-lg font-extrabold tracking-tight text-ink">Health &amp; growth trends</h2>
            <p className="text-sm text-ink-muted">A closer look at you and your baby, week by week.</p>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {/* weight gain */}
            <ChartCard title="Weight gain" sub="You vs recommended range" icon={Scale} tint={C.brand}
              right={vitals.weightGain && (
                <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] font-bold text-brand-600">
                  {vitals.weightGain.gainedKg >= 0 ? '+' : ''}{vitals.weightGain.gainedKg} kg
                </span>
              )}>
              {vitals.loaded && vitals.weight.length === 0 ? <NoReadings what="weights" /> : (
              <ResponsiveContainer width="100%" height={190}>
                <ComposedChart data={vitals.weight} margin={{ top: 6, right: 6, left: -2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.brand} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={C.brand} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="w" tickLine={false} axisLine={false} tick={axisTick} dy={6} />
                  <YAxis tickLine={false} axisLine={false} tick={axisTick} width={30} />
                  <Tooltip content={<Tip unit="kg" />} cursor={{ stroke: 'rgba(63,102,240,0.3)', strokeDasharray: '4 4' }} />
                  <Line type="monotone" dataKey="hi" name="Max" stroke={C.aqua} strokeWidth={1.6} strokeDasharray="5 4" dot={false} />
                  <Line type="monotone" dataKey="lo" name="Min" stroke={C.peach} strokeWidth={1.6} strokeDasharray="5 4" dot={false} />
                  <Area type="monotone" dataKey="kg" name="You" stroke={C.brand} strokeWidth={2.6} fill="url(#wg)" dot={false} activeDot={{ r: 4.5, strokeWidth: 2, stroke: '#fff' }} animationDuration={1400} />
                </ComposedChart>
              </ResponsiveContainer>
              )}
              <Legend items={[{ label: 'You', color: C.brand }, { label: 'Max', color: C.aqua, dash: true }, { label: 'Min', color: C.peach, dash: true }]} />
            </ChartCard>

            {/* baby growth dual axis */}
            <ChartCard title="Baby's growth" sub="Length &amp; weight over time" icon={TrendingUp} tint={C.rose}>
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={GROWTH} margin={{ top: 6, right: 4, left: -2, bottom: 0 }}>
                  <XAxis dataKey="w" tickLine={false} axisLine={false} tick={axisTick} dy={6} />
                  <YAxis yAxisId="l" tickLine={false} axisLine={false} tick={axisTick} width={30} />
                  <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} tick={axisTick} width={34} />
                  <Tooltip content={<Tip />} cursor={{ stroke: 'rgba(242,120,159,0.35)', strokeDasharray: '4 4' }} />
                  <Line yAxisId="l" type="monotone" dataKey="len" name="Length (cm)" stroke={C.brand} strokeWidth={2.6} dot={{ r: 3, fill: C.brand }} activeDot={{ r: 5 }} animationDuration={1400} />
                  <Line yAxisId="r" type="monotone" dataKey="wt" name="Weight (g)" stroke={C.rose} strokeWidth={2.6} dot={{ r: 3, fill: C.rose }} activeDot={{ r: 5 }} animationDuration={1400} />
                </LineChart>
              </ResponsiveContainer>
              <Legend items={[{ label: 'Length (cm)', color: C.brand }, { label: 'Weight (g)', color: C.rose }]} />
            </ChartCard>

            {/* blood pressure */}
            <ChartCard title="Blood pressure" sub="Systolic / diastolic" icon={Stethoscope} tint={C.aqua}
              right={vitals.loaded && vitals.latest
                ? <RangeChip alerts={vitals.alerts} match={/pressure/i} />
                : null}>
              {vitals.loaded && vitals.bp.length === 0 ? <NoReadings what="blood pressure" /> : (
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={vitals.bp} margin={{ top: 6, right: 6, left: -2, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(63,102,240,0.07)" />
                  <XAxis dataKey="d" tickLine={false} axisLine={false} tick={axisTick} dy={6} />
                  <YAxis tickLine={false} axisLine={false} tick={axisTick} width={30} domain={[60, 130]} />
                  <Tooltip content={<Tip unit="mmHg" />} />
                  <Line type="monotone" dataKey="sys" name="Systolic" stroke={C.brand} strokeWidth={2.6} dot={{ r: 3, fill: C.brand }} animationDuration={1400} />
                  <Line type="monotone" dataKey="dia" name="Diastolic" stroke={C.aqua} strokeWidth={2.6} dot={{ r: 3, fill: C.aqua }} animationDuration={1400} />
                </LineChart>
              </ResponsiveContainer>
              )}
              <Legend items={[{ label: 'Systolic', color: C.brand }, { label: 'Diastolic', color: C.aqua }]} />
            </ChartCard>

            {/* fetal heart rate — hers once she has logged one, otherwise a sample */}
            <ChartCard title="Fetal heart rate" sub="Beats per minute" icon={HeartPulse} tint={C.rose}
              right={vitals.fetalHr.length
                ? <RangeChip alerts={vitals.alerts} match={/fetal heart/i} />
                : <SampleTag />}>
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={vitals.fetalHr.length ? vitals.fetalHr : HR} margin={{ top: 6, right: 6, left: -2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.rose} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={C.rose} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="d" tickLine={false} axisLine={false} tick={axisTick} dy={6} />
                  <YAxis tickLine={false} axisLine={false} tick={axisTick} width={30}
                    domain={vitals.fetalHr.length ? ['dataMin - 10', 'dataMax + 10'] : [140, 160]} />
                  <Tooltip content={<Tip unit="bpm" />} />
                  <Area type="monotone" dataKey="bpm" name="Heart rate" stroke={C.rose} strokeWidth={2.6} fill="url(#hr)" dot={{ r: 3, fill: C.rose }} animationDuration={1400} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* baby kicks — straight from her daily log */}
            <ChartCard title="Baby kicks" sub="Movements this week" icon={Activity} tint={C.violet}>
              {vitals.loaded && vitals.kicks.length === 0 ? <NoReadings what="kicks" /> : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={vitals.kicks} margin={{ top: 6, right: 6, left: -2, bottom: 0 }}>
                  <XAxis dataKey="d" tickLine={false} axisLine={false} tick={axisTick} dy={6} />
                  <YAxis tickLine={false} axisLine={false} tick={axisTick} width={26} />
                  <Tooltip content={<Tip />} cursor={{ fill: 'rgba(139,123,243,0.08)' }} />
                  <Bar dataKey="n" name="Kicks" radius={[6, 6, 0, 0]} fill={C.violet} animationDuration={1200} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
              )}
            </ChartCard>

            {/* sleep — from her own daily log once she has recorded a night */}
            <ChartCard title="Sleep quality" sub="Hours per night" icon={Moon} tint={C.brand2}
              right={vitals.sleep.length ? undefined : <SampleTag />}>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={vitals.sleep.length ? vitals.sleep : SLEEP} margin={{ top: 6, right: 6, left: -2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.brand2} />
                      <stop offset="100%" stopColor={C.aqua} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="d" tickLine={false} axisLine={false} tick={axisTick} dy={6} />
                  <YAxis tickLine={false} axisLine={false} tick={axisTick} width={26} />
                  <Tooltip content={<Tip unit="h" />} cursor={{ fill: 'rgba(63,102,240,0.06)' }} />
                  <Bar dataKey="h" name="Sleep" radius={[6, 6, 0, 0]} fill="url(#sl)" animationDuration={1200} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* THIS WEEK — baby development */}
        <div className="mt-9">
          <Reveal>
            <GlassCard className="flex h-full flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
              <div className="flex flex-none flex-col items-center">
                <ProgressRing
                  value={pregnancy?.progress ?? 0}
                  size={148}
                  label={`${pregnancy?.progress ?? 0}%`}
                  sublabel={`Week ${week} / 40`}
                />
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-1 text-[11px] font-bold text-brand-600">
                  <Baby className="h-3.5 w-3.5" /> {weeksToGo} weeks to go
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Baby development · this week</span>
                <h3 className="mt-2 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
                  About the size of{' '}
                  <span className="font-serif italic text-brand-600">
                    {pregnancy ? `${article(pregnancy.babySize.fruit)} ${pregnancy.babySize.fruit.toLowerCase()}` : 'a growing baby'}
                  </span>
                </h3>
                {/*
                  Measurements and the note both come from her record. The three
                  chips that used to sit here asserted week-26 milestones
                  ("Eyes opening") on every week of the pregnancy, so they are
                  gone until there is per-week data behind them.
                */}
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  At {week} weeks your baby is about <b>{pregnancy?.babySize.length}</b> and{' '}
                  <b>{pregnancy?.babySize.weight}</b>. {pregnancy?.weekNote}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/60 px-3 py-1 text-xs font-semibold text-ink-soft">
                    <Check className="h-3.5 w-3.5 text-brand-500" /> Trimester {pregnancy?.trimester}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/60 px-3 py-1 text-xs font-semibold text-ink-soft">
                    <Check className="h-3.5 w-3.5 text-brand-500" /> Due {pregnancy?.eddPretty}
                  </span>
                </div>
              </div>
            </GlassCard>
          </Reveal>

        </div>

        {/* fundal height + mood + hydration */}
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {/* fundal height — no column behind this one yet */}
          <ChartCard title="Fundal height" sub="Belly measurement (cm)" icon={Ruler} tint={C.aqua}
            right={<SampleTag />}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={FUNDAL} margin={{ top: 6, right: 6, left: -2, bottom: 0 }}>
                <defs>
                  <linearGradient id="fh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.aqua} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={C.aqua} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="w" tickLine={false} axisLine={false} tick={axisTick} dy={6} />
                <YAxis tickLine={false} axisLine={false} tick={axisTick} width={30} />
                <Tooltip content={<Tip unit="cm" />} />
                <Area type="monotone" dataKey="cm" name="Height" stroke={C.aqua} strokeWidth={2.6} fill="url(#fh)" dot={{ r: 3, fill: C.aqua }} animationDuration={1400} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* mood donut — counted from the moods she actually logged */}
          <ChartCard title="Mood recently" sub={`Last ${moodSlices.days} logged days`} icon={Smile} tint={C.gold}>
            {vitals.loaded && moodSlices.slices.length === 0 ? <NoReadings what="moods" height={170} /> : (
            <div className="flex items-center gap-4">
              <div className="relative h-[150px] w-[150px] flex-none">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={moodSlices.slices} dataKey="value" nameKey="name" innerRadius={46} outerRadius={68} paddingAngle={3} stroke="none" animationDuration={1200}>
                      {moodSlices.slices.map((m) => <Cell key={m.name} fill={m.color} />)}
                    </Pie>
                    <Tooltip content={<Tip unit="%" />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <div className="text-2xl font-extrabold text-ink">{moodSlices.slices[0]?.value ?? 0}%</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                      {moodSlices.slices[0]?.name ?? '—'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {moodSlices.slices.map((m) => (
                  <div key={m.name} className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} /> {m.name}
                    <span className="ml-auto text-ink">{m.value}%</span>
                  </div>
                ))}
              </div>
            </div>
            )}
          </ChartCard>

          {/* hydration radial */}
          <ChartCard title="Hydration" sub="Water intake today" icon={Droplet} tint={C.aqua}>
            <div className="relative mx-auto h-[170px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="66%" outerRadius="100%" data={[{ name: 'Water', value: Math.min(100, (water / 2) * 100), fill: C.aqua }]} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background={{ fill: 'rgba(34,184,196,0.10)' }} dataKey="value" cornerRadius={20} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="text-3xl font-extrabold text-ink">{water.toFixed(1)}<span className="text-base font-semibold text-ink-muted">L</span></div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">of 2.0 L goal</div>
                </div>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* everything above, as a document to hand a doctor */}
        <Reveal className="mt-8">
          <GlassCard className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-brand-500/12 text-brand-600">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-extrabold text-ink">Health report</div>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
                Everything on record as one PDF — your details, the charts above, what you log each
                day, your consultations, and every prescription and result you have filed, each on
                its own page with the date it was added.
              </p>
            </div>
            <ReportButton className="flex-none" />
          </GlassCard>
        </Reveal>

        {/* the assessment, then the plan that is built out of it */}
        <RiskPanel />

        {/* the personalised plan, where the fabricated nutrient bars used to be */}
        <CarePlan />

        </motion.div>
        )}

        {/* ============================== REMINDERS ============================== */}
        {tab === 'reminders' && (
        <motion.div key="tab-reminders" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>

        {/* the vaccination record: mark a dose done, and file the card for it */}
        <VaccinationRecord />

        {/* four reminder groups + today's routine timeline */}
        <RemindersSection
          reminders={reminders}
          stage={profile.stage}
          onAdd={() => setApptOpen(true)}
          onDelete={(id) => changeReminders(reminders.filter((r) => r.id !== id), reminders)}
          onAddReminder={(r) => changeReminders(
            [...reminders, { ...r, id: `v-${Date.now()}` }],
            reminders,
          )}
        />

        {/* symptom history */}
        <div className="mt-5">
          <Reveal>
            <GlassCard float className="h-full p-6">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${C.rose}1f`, color: C.rose }}>
                  <Activity className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <div className="text-sm font-bold text-ink">Recent symptoms</div>
                  <div className="text-xs text-ink-muted">Logged this week</div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {symptoms.length === 0 && (
                  <span className="text-xs font-medium text-ink-faint">Nothing logged yet today.</span>
                )}
                {symptoms.map((s) => (
                  <span
                    key={s.id}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1',
                      URGENT_LABELS.has(s.name) ? 'bg-rose-500/12 text-rose-700 ring-rose-500/25'
                        : s.intensity === 'severe' ? 'bg-amber-500/12 text-amber-700 ring-amber-500/25'
                        : 'border border-white/60 bg-white/60 text-ink-soft ring-transparent',
                    )}
                  >
                    {URGENT_LABELS.has(s.name) && <ShieldAlert className="h-3.5 w-3.5" />}
                    {s.name}
                    <span className="text-[10px] uppercase opacity-60">{INTENSITY_LABEL[s.intensity]}</span>
                    {s.daysPresent > 1 && <span className="text-[10px] font-bold opacity-70">· {s.daysPresent}d</span>}
                  </span>
                ))}
              </div>

              {/* suggestions carried out of the logger */}
              <div className="mt-5 space-y-2.5">
                {advice.length === 0 && (
                  <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-white p-4 ring-1 ring-brand-100">
                    <div className="flex items-center gap-2 text-sm font-bold text-ink">
                      <Sparkles className="h-4 w-4 text-brand-500" /> Gentle tip
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                      Nothing logged today. Logging even small things helps your care team spot patterns early.
                    </p>
                  </div>
                )}

                {advice.map((a) => (
                  <div key={a.name} className={cn('rounded-2xl px-3.5 py-3 ring-1', TONE_CLASS[a.tone])}>
                    <div className="flex items-center gap-1.5 text-[12px] font-bold">
                      <Lightbulb className="h-3.5 w-3.5 flex-none" />
                      {a.name}
                      <span className="ml-auto text-[10px] font-bold uppercase tracking-wide opacity-75">
                        day {a.daysPresent} · {a.stage}
                      </span>
                    </div>
                    <div className="mt-1.5 text-[11px] font-medium leading-relaxed opacity-90">{a.relief[0]}</div>
                    <div className="mt-1 text-[11px] font-semibold leading-relaxed opacity-95">{a.stageNote}</div>
                  </div>
                ))}
              </div>

              {/* doctor report — escalates as symptoms persist */}
              {symptoms.length > 0 && (
                <div className={cn('mt-4 rounded-2xl px-3.5 py-3 ring-1', TONE_CLASS[report.report.tone])}>
                  <div className="flex items-center gap-2 text-[12px] font-bold">
                    <Stethoscope className="h-3.5 w-3.5" /> For your care team — {report.report.headline}
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {report.report.lines.map((l) => (
                      <li key={l} className="flex gap-2 text-[11px] font-medium leading-relaxed opacity-90">
                        <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-current" />{l}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => setLogOpen(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-5 py-3 text-sm font-bold text-white shadow-glow transition hover:brightness-105"
              >
                <Plus className="h-[18px] w-[18px]" /> Log a symptom
              </button>
            </GlassCard>
          </Reveal>
        </div>

        </motion.div>
        )}

        {/* ============================== FIND CARE ============================== */}
        {tab === 'care' && (
        <motion.div key="tab-care" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
          <FindDoctorSection stage={communityStage} />
        </motion.div>
        )}

        {/* ============================== COMMUNITY ============================== */}
        {tab === 'community' && (
        <motion.div key="tab-community" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
          <CommunitySection
            week={week}
            stage={communityStage}
            symptoms={symptoms.map((s) => s.name)}
            lowHydration={water < WATER_GOAL}
          />
        </motion.div>
        )}
      </main>
      <Footer />

      <SymptomModal
        open={logOpen}
        onClose={closeLogger}
        initial={symptoms}
        onSave={saveSymptoms}
      />

      <AppointmentModal
        open={apptOpen}
        onClose={() => setApptOpen(false)}
        reminders={reminders}
        onChange={(next) => changeReminders(next, reminders)}
      />

      <SosModal open={sosOpen} onClose={() => setSosOpen(false)} onAlertChange={setLiveAlert} />

      <DailyCheckIn
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        today={vitals.today}
        logHistory={vitals.logHistory}
        readings={vitals.readings}
        onSaved={vitals.reload}
      />

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        score={report.score}
        band={{ label: report.band.label, tone: TONE_DOT[report.band.tone] }}
      />
    </>
  );
}

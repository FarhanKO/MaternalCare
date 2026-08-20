import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Award, BadgeCheck, CalendarDays, CheckCircle2, Clock,
  Info, Lock, MapPin, MessageCircle, ReceiptText, SearchX, ShieldQuestion, Star,
  Stethoscope, Users,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { Reveal } from '@/components/ui/Reveal';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  PAY_METHODS, prettyDate, prettyTime, RequestRefused, taka,
  type Appointment, type PayMethod, type Plan, type RankedDoctor, type SlotOffer,
} from '@/data/care';
import { shortName } from '@/components/mother/DoctorChat';

/** Auto Assign's accent — the same mint the green button on her Doctor tab uses. */
const C = { mint: '#2fbf9b' };

const pad = (n: number) => String(n).padStart(2, '0');
const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The next fortnight of clinic days, Sundays excluded. */
function clinicDays(count = 12) {
  const out: Date[] = [];
  for (let i = 0; out.length < count; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (d.getDay() !== 0) out.push(d);
  }
  return out;
}

const REASONS = [
  'Routine antenatal check',
  'Blood pressure review',
  'Discuss my symptoms',
  'Scan or test results',
  'Something is worrying me',
];

type Step = 'finding' | 'clinician' | 'slot' | 'pay' | 'done';

const STEPS: { key: Step; label: string }[] = [
  { key: 'clinician', label: 'Clinician' },
  { key: 'slot', label: 'Time' },
  { key: 'pay', label: 'Payment' },
];

/** How many suggestions Auto Assign narrows to. */
const SUGGEST = 3;

/**
 * Long enough that the ranking reads as work rather than a flicker, short
 * enough that it never feels like a stall. The list is usually already here.
 */
const FINDING_MS = 1600;

/** What the ranking weighs, in the order the model applies it. */
const CRITERIA = [
  'Matching your stage and specialty',
  'Weighing their qualifications',
  'Checking how full each list is',
  'Rating and distance from you',
];

/** Best first. Says the order out loud without printing "worst" on anyone. */
const LEVEL = ['Best match', 'Close second', 'Third choice'];

/* ------------------------------------------------------------------ hero */

function Hero({ from, onBook, loading, auto }: {
  from: number | null; onBook: () => void; loading: boolean; auto: boolean;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-[1380px] items-stretch gap-0 lg:grid-cols-[1fr_0.95fr]">
        {/* ------------------------------------------------------- copy */}
        <div className="flex flex-col justify-center px-6 py-16 sm:px-12 lg:py-28">
          <Reveal>
            <Link
              to="/mother?tab=care"
              className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink-muted transition hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" /> Back to your doctor
            </Link>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="mt-8 text-balance text-[2.4rem] font-bold leading-[1.05] tracking-tight text-ink sm:text-[3.4rem]">
              {auto ? (
                <>
                  Let us find the{' '}
                  <span className="font-serif text-[1.08em] font-medium italic text-gradient">
                    right one
                  </span>
                </>
              ) : (
                <>
                  A doctor for you,{' '}
                  <span className="font-serif text-[1.08em] font-medium italic text-gradient">
                    without the wait
                  </span>
                </>
              )}
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-soft">
              {auto ? (
                <>
                  We rank every clinician who can take you — on what they are qualified in and how
                  much room is left on their list —{' '}
                  <span className="font-semibold text-ink">then suggest the best three</span>. You
                  choose one, pick a time, and the slot is confirmed on the spot.
                </>
              ) : (
                <>
                  Direct access to obstetricians, paediatricians and nutritionists who are ranked by
                  what they are qualified in and how much room is left on their list.{' '}
                  <span className="font-semibold text-ink">
                    Pay the consultation fee and the slot is confirmed on the spot
                  </span>{' '}
                  — no queue, and nobody has to accept it first.
                </>
              )}
            </p>
          </Reveal>

          {/* the boxed price, the way a clinic quotes one */}
          <Reveal delay={0.15}>
            <div className="mt-8 inline-flex items-center gap-4 rounded-2xl border border-ink/12 bg-white/60 px-5 py-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">
                  As low as
                </div>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight text-ink">
                    {from === null ? '—' : taka(from)}
                  </span>
                  <span className="font-serif text-lg italic text-ink-soft">per visit</span>
                </div>
              </div>
              <span className="h-10 w-px bg-ink/12" />
              <span className="max-w-[9rem] text-[12px] font-semibold leading-tight text-ink-muted">
                Varies by clinician
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-8">
              <LiquidButton
                size="lg"
                onClick={onBook}
                iconRight={<ArrowRight className="h-[18px] w-[18px]" />}
              >
                {loading ? 'Checking who is free…'
                  : auto ? 'Find my doctor'
                  : 'Book an appointment'}
              </LiquidButton>
            </div>
          </Reveal>
        </div>

        {/* ------------------------------------------------------ photo */}
        <div className="relative min-h-[22rem] lg:min-h-[42rem]">
          <img
            src="/hero/slide2.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface-base via-transparent to-transparent lg:from-surface-base/80" />

          {/* the clinician, framed like a photograph pinned over the scene */}
          <motion.figure
            initial={{ opacity: 0, y: 24, rotate: -8 }}
            animate={{ opacity: 1, y: 0, rotate: -4 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-8 left-4 w-44 rounded-[6px] bg-[#f7f5f0] p-2.5 pb-8 shadow-glass-lg sm:bottom-16 sm:left-[-3rem] sm:w-64 sm:p-3.5 sm:pb-12"
          >
            <img src="/hero/doctor3.jpg" alt="" className="aspect-[4/3] w-full object-cover" />
            <figcaption className="absolute inset-x-3 bottom-2 font-serif text-[11px] italic text-ink-muted sm:bottom-4 sm:text-[13px]">
              Seen the same week, not the same month
            </figcaption>
          </motion.figure>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- stepper */

function Stepper({ step }: { step: Step }) {
  const at = STEPS.findIndex((s) => s.key === step);
  const index = step === 'done' ? STEPS.length : at;

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {STEPS.map((s, i) => {
        const state = i < index ? 'done' : i === index ? 'now' : 'todo';
        return (
          <div key={s.key} className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'grid h-7 w-7 place-items-center rounded-full text-[11px] font-extrabold transition',
                  state === 'done' && 'bg-emerald-500 text-white',
                  state === 'now' && 'bg-brand-500 text-white shadow-glow',
                  state === 'todo' && 'bg-ink/8 text-ink-faint',
                )}
              >
                {state === 'done' ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-[12px] font-bold',
                  state === 'todo' ? 'text-ink-faint' : 'text-ink',
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={cn('h-px w-6 sm:w-10', i < index ? 'bg-emerald-500' : 'bg-ink/12')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------- clinician cards */

function ClinicianCard({ doctor, picked, level, onPick }: {
  doctor: RankedDoctor; picked: boolean; onPick: () => void;
  /** "Best match" and friends — set only when Auto Assign is ranking them */
  level?: string;
}) {
  const initials = doctor.name.replace(/^Dr\.?\s*/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('');

  return (
    <button
      onClick={onPick}
      className={cn(
        'rounded-3xl border p-4 text-left transition',
        picked
          ? 'border-brand-500/45 bg-brand-500/[0.07] shadow-glow'
          : 'border-white/60 bg-white/60 hover:bg-white',
      )}
    >
      {level && (
        <div className="mb-3 flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ background: C.mint }}
          >
            {level}
          </span>
          <span className="text-[11px] font-bold text-ink-faint">match {doctor.score}</span>
        </div>
      )}
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-extrabold text-white">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold text-ink">{doctor.name}</div>
          <div className="text-[12px] font-semibold text-ink-muted">{doctor.specialty}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-ink-faint">
            <span className="inline-flex items-center gap-1"><Award className="h-3 w-3" />{doctor.qualification}</span>
            <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" />{doctor.rating}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{doctor.distanceKm} km</span>
          </div>
        </div>
        <div className="flex-none text-right">
          <div className="text-lg font-bold tracking-tight text-ink">{taka(doctor.feeBdt)}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">per visit</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-ink-muted">
        <span>{doctor.hospital}</span>
        <span>{doctor.openings} slot{doctor.openings === 1 ? '' : 's'} left this cycle</span>
      </div>
    </button>
  );
}

/* ================================== page ================================= */

export function Appoint() {
  const navigate = useNavigate();
  const flowRef = useRef<HTMLDivElement>(null);

  const [doctors, setDoctors] = useState<RankedDoctor[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading');

  // ?mode=auto is the green button on her Doctor tab: same flow, but the
  // ranking narrows to three instead of handing her the whole list
  const [params] = useSearchParams();
  const auto = params.get('mode') === 'auto';

  /**
   * The page opens on its own hero. Nothing below it exists until she asks
   * for it — landing straight on a list of clinicians made the two buttons on
   * her Doctor tab look like the same screen, because below the fold they
   * were.
   */
  const [started, setStarted] = useState(false);

  const [step, setStep] = useState<Step>(auto ? 'finding' : 'clinician');
  const [doctor, setDoctor] = useState<RankedDoctor | null>(null);

  const days = useMemo(() => clinicDays(), []);
  const [date, setDate] = useState(() => isoLocal(days[0]));
  const [times, setTimes] = useState<string[] | null>(null);
  const [time, setTime] = useState('');
  const [reason, setReason] = useState(REASONS[0]);

  const [method, setMethod] = useState<PayMethod>('bkash');
  const [plan, setPlan] = useState<Plan>('visit');
  const [paying, setPaying] = useState(false);
  const [booked, setBooked] = useState<Appointment | null>(null);
  const [refusal, setRefusal] = useState<{ message: string; alternatives: SlotOffer[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getRecommendedDoctors()
      .then((r) => {
        if (cancelled) return;
        setDoctors(r.doctors.filter((d) => d.bookable));
        setState('ready');
      })
      .catch(() => { if (!cancelled) setState('offline'); });
    return () => { cancelled = true; };
  }, []);

  /**
   * Hold the "finding" screen for its own beat, then move on. It waits for
   * the list AND the timer, so a slow network extends it rather than showing
   * an empty result, and a warm cache does not flash it for 40ms.
   */
  useEffect(() => {
    // it only counts once she has actually asked — the page opens on the hero
    if (!started || step !== 'finding' || state === 'loading') return undefined;
    const id = window.setTimeout(() => setStep('clinician'), FINDING_MS);
    return () => window.clearTimeout(id);
  }, [started, step, state]);

  // free times for whichever clinician and day are currently chosen
  useEffect(() => {
    if (!doctor) return undefined;
    let cancelled = false;
    setTimes(null);
    setTime('');
    api.getSlots(doctor.id, date)
      .then((s) => { if (!cancelled) setTimes(s.times); })
      .catch(() => { if (!cancelled) setTimes([]); });
    return () => { cancelled = true; };
  }, [doctor, date]);

  const cheapest = doctors.length ? Math.min(...doctors.map((d) => d.feeBdt)) : null;

  /**
   * Auto Assign narrows to the top three. The server already ordered them —
   * tier before score, so a paediatrician never outranks an obstetrician for
   * an antenatal visit however well they score — so this only slices.
   */
  const shortlist = auto ? doctors.slice(0, SUGGEST) : doctors;

  /** What she is actually paying, for the summary row and the pay button. */
  const total = doctor
    ? doctor.feeBdt + (plan === 'visit-plus-chat' ? doctor.chatFeeBdt : 0)
    : 0;

  /** Reveal the flow, then bring it into view once it has actually rendered. */
  const toFlow = useCallback(() => {
    setStarted(true);
    requestAnimationFrame(() =>
      flowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, []);

  const pay = async () => {
    if (!doctor || !time) return;
    setPaying(true);
    setRefusal(null);
    try {
      const appt = await api.payAndBook({ doctorId: doctor.id, date, time, reason, method, plan });
      setBooked(appt);
      setStep('done');
    } catch (err) {
      if (err instanceof RequestRefused) {
        setRefusal({ message: err.message, alternatives: err.alternatives });
        setStep('slot');
        api.getSlots(doctor.id, date).then((s) => setTimes(s.times)).catch(() => {});
      } else {
        setRefusal({ message: (err as Error).message, alternatives: [] });
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Hero from={cheapest} onBook={toFlow} loading={state === 'loading'} auto={auto} />

      <section ref={flowRef} className="scroll-mt-8 px-4 pb-16 sm:pb-20">
        <div className={cn('mx-auto max-w-3xl', started ? 'pt-16 sm:pt-20' : 'pt-0')}>
          {!started ? null : (
          <>
          {step !== 'done' && (
            <div className="mb-8">
              <Stepper step={step} />
            </div>
          )}

          {/* Auto Assign's own waiting screen — it says what it is weighing */}
          {step === 'finding' && (
            <motion.div
              key="finding"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-6 text-center"
            >
              <div className="relative mx-auto grid h-32 w-32 place-items-center">
                <span
                  className="absolute inset-0 animate-ping rounded-full opacity-30 motion-reduce:animate-none"
                  style={{ background: C.mint }}
                />
                <span className="absolute inset-4 rounded-full" style={{ background: `${C.mint}29` }} />
                <Stethoscope className="relative h-9 w-9" style={{ color: '#1fa383' }} />
              </div>

              <h2 className="mt-6 text-balance text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
                Finding the most suitable doctor for you…
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-muted">
                Ranking every clinician who can take you against your record.
              </p>

              <div className="mx-auto mt-7 max-w-sm space-y-2 text-left">
                {CRITERIA.map((c, i) => (
                  <motion.div
                    key={c}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.28, duration: 0.3 }}
                    className="flex items-center gap-2.5 rounded-2xl bg-white/60 px-3.5 py-2.5"
                  >
                    <CheckCircle2 className="h-4 w-4 flex-none" style={{ color: C.mint }} />
                    <span className="text-[12px] font-semibold text-ink-soft">{c}</span>
                  </motion.div>
                ))}
              </div>

              <p className="mt-5 text-[11px] font-semibold text-ink-faint">
                Nothing is booked or charged until you choose.
              </p>
            </motion.div>
          )}

          {step !== 'finding' && state === 'loading' && (
            <div className="rounded-3xl border border-dashed border-ink/15 px-4 py-14 text-center text-sm font-semibold text-ink-faint">
              Checking which clinicians can take you…
            </div>
          )}

          {state === 'offline' && (
            <GlassCard className="p-8 text-center">
              <ShieldQuestion className="mx-auto h-8 w-8 text-ink-faint" />
              <div className="mt-2 text-sm font-bold text-ink">Cannot reach the clinic right now</div>
              <p className="mx-auto mt-1 max-w-md text-[12px] text-ink-muted">
                Nothing has been charged and nothing has been booked. Try again in a moment, or use
                the request flow on your dashboard.
              </p>
            </GlassCard>
          )}

          {state === 'ready' && doctors.length === 0 && (
            <GlassCard className="p-8 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink/6 text-ink-faint">
                <SearchX className="h-7 w-7" />
              </span>
              <div className="mt-3 text-base font-extrabold text-ink">No doctor available right now</div>
              <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-ink-muted">
                Every clinician is on leave or has a full list today, so there is nothing to pay
                for. This changes daily — it is worth checking back tomorrow.
              </p>
            </GlassCard>
          )}

          {/*
            No AnimatePresence: each step animates in on its own key. An exit
            animation here would mean two steps of a form on screen at once,
            and a stuck exit would leave the flow with nothing on screen at all.
          */}
          {state === 'ready' && doctors.length > 0 && (
            <>
              {/* ------------------------------------------- 1. clinician */}
              {step === 'clinician' && (
                <motion.div
                  key="clinician"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/12 text-brand-600">
                      <Stethoscope className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <div className="text-sm font-bold text-ink">
                        {auto ? 'Three we would suggest' : 'Who would you like to see?'}
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        {auto
                          ? `In order, best first — out of ${doctors.length} who can take you`
                          : `${doctors.length} clinician${doctors.length === 1 ? '' : 's'} can take you, best match first`}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {shortlist.map((d, i) => (
                      <ClinicianCard
                        key={d.id}
                        doctor={d}
                        picked={doctor?.id === d.id}
                        level={auto ? LEVEL[i] : undefined}
                        onPick={() => { setDoctor(d); setStep('slot'); }}
                      />
                    ))}
                  </div>

                  {/* the shortlist is a suggestion, never a cage */}
                  {auto && doctors.length > shortlist.length && (
                    <button
                      onClick={() => navigate('/appoint')}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-white/70 bg-white/60 py-2.5 text-[12px] font-bold text-ink-soft transition hover:bg-white hover:text-ink"
                    >
                      <Users className="h-3.5 w-3.5" />
                      See all {doctors.length} instead
                    </button>
                  )}
                </motion.div>
              )}

              {/* ------------------------------------------------ 2. slot */}
              {step === 'slot' && doctor && (
                <motion.div
                  key="slot"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <GlassCard className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-extrabold text-ink">{doctor.name}</div>
                        <div className="text-[11px] font-semibold text-ink-muted">
                          {doctor.specialty} · {doctor.hospital}
                        </div>
                      </div>
                      <button
                        onClick={() => setStep('clinician')}
                        className="rounded-xl px-2.5 py-1 text-[11px] font-bold text-ink-muted transition hover:bg-white/70 hover:text-ink"
                      >
                        Change
                      </button>
                    </div>

                    {refusal && (
                      <div className="mt-4 rounded-2xl bg-amber-500/12 px-3 py-2.5 ring-1 ring-amber-500/25">
                        <div className="text-[12px] font-bold text-amber-800">{refusal.message}</div>
                        <div className="mt-0.5 text-[11px] font-semibold text-amber-800/80">
                          Nothing was charged.
                        </div>
                        {refusal.alternatives.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {refusal.alternatives.slice(0, 6).map((a) => (
                              <button
                                key={`${a.date}-${a.time}`}
                                onClick={() => { setDate(a.date); setTime(a.time); setRefusal(null); }}
                                className="rounded-xl bg-white/80 px-2.5 py-1 text-[11px] font-bold text-ink-soft transition hover:bg-white"
                              >
                                {prettyDate(a.date)} · {prettyTime(a.time)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-4 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                      Pick a day
                    </div>
                    <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
                      {days.map((d) => {
                        const key = isoLocal(d);
                        const on = key === date;
                        return (
                          <button
                            key={key}
                            onClick={() => setDate(key)}
                            className={cn(
                              'flex-none rounded-2xl px-3 py-2 text-center transition',
                              on ? 'bg-brand-500 text-white shadow-glow' : 'bg-white/70 text-ink-soft hover:bg-white',
                            )}
                          >
                            <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                              {d.toLocaleDateString(undefined, { weekday: 'short' })}
                            </div>
                            <div className="text-sm font-extrabold leading-tight">{d.getDate()}</div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                      Pick a time
                    </div>
                    {times === null ? (
                      <div className="mt-1.5 text-[11px] font-semibold text-ink-faint">Checking what is free…</div>
                    ) : times.length === 0 ? (
                      <div className="mt-1.5 rounded-2xl border border-dashed border-ink/15 px-3 py-3 text-[11px] font-semibold text-ink-muted">
                        Nothing free on this day. Try another day above.
                      </div>
                    ) : (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {times.map((t) => (
                          <button
                            key={t}
                            onClick={() => setTime(t)}
                            className={cn(
                              'rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition',
                              time === t ? 'bg-brand-500 text-white' : 'bg-white/70 text-ink-soft hover:bg-white',
                            )}
                          >
                            {prettyTime(t)}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                      What is it about?
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {REASONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => setReason(r)}
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition',
                            reason === r
                              ? 'border-brand-500/40 bg-brand-500/15 text-brand-700'
                              : 'border-white/60 bg-white/60 text-ink-soft hover:bg-white',
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold text-ink-muted">
                        {taka(doctor.feeBdt)} · payable now
                      </span>
                      {/* a button that looks live but does nothing is worse
                          than one that says why it cannot be pressed */}
                      {time ? (
                        <LiquidButton
                          onClick={() => setStep('pay')}
                          iconRight={<ArrowRight className="h-4 w-4" />}
                        >
                          Continue
                        </LiquidButton>
                      ) : (
                        <span className="cursor-not-allowed rounded-2xl bg-ink/8 px-5 py-3 text-sm font-bold text-ink-faint">
                          Choose a time to continue
                        </span>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* ------------------------------------------------- 3. pay */}
              {step === 'pay' && doctor && (
                <motion.div
                  key="pay"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <GlassCard className="p-5 sm:p-6">
                    <div className="text-sm font-extrabold text-ink">Confirm and pay</div>

                    <dl className="mt-4 space-y-2 rounded-2xl bg-white/60 px-4 py-3.5">
                      {[
                        ['Clinician', doctor.name],
                        ['Specialty', doctor.specialty],
                        ['When', `${prettyDate(date)} · ${prettyTime(time)}`],
                        ['Reason', reason],
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-baseline justify-between gap-4">
                          <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{k}</dt>
                          <dd className="text-right text-[13px] font-semibold text-ink">{v}</dd>
                        </div>
                      ))}
                      <div className="flex items-baseline justify-between gap-4 border-t border-ink/10 pt-2.5">
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                          {plan === 'visit-plus-chat' ? 'Visit + a month of chat' : 'Consultation fee'}
                        </dt>
                        <dd className="text-lg font-bold tracking-tight text-ink">{taka(total)}</dd>
                      </div>
                    </dl>

                    {/* what she is buying, before how she pays for it */}
                    <div className="mt-4 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                      What you are booking
                    </div>
                    <div className="mt-1.5 grid gap-2">
                      <button
                        onClick={() => setPlan('visit')}
                        className={cn(
                          'rounded-2xl border p-3.5 text-left transition',
                          plan === 'visit'
                            ? 'border-brand-500/45 bg-brand-500/[0.07]'
                            : 'border-white/70 bg-white/60 hover:bg-white',
                        )}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[13px] font-extrabold text-ink">The visit</span>
                          <span className="text-[14px] font-bold text-ink">{taka(doctor.feeBdt)}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
                          One consultation, on call, at the time you picked.
                        </p>
                      </button>

                      <button
                        onClick={() => setPlan('visit-plus-chat')}
                        className={cn(
                          'rounded-2xl border p-3.5 text-left transition',
                          plan === 'visit-plus-chat'
                            ? 'border-brand-500/45 bg-brand-500/[0.07]'
                            : 'border-white/70 bg-white/60 hover:bg-white',
                        )}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[13px] font-extrabold text-ink">
                            Visit + a month of chat
                          </span>
                          <span className="text-[14px] font-bold text-ink">
                            {taka(doctor.feeBdt + doctor.chatFeeBdt)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
                          The visit, plus 30 days of messaging — {shortName(doctor.name)} answers
                          between appointments and can read the reports you upload in that time.
                        </p>
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                          <MessageCircle className="h-3 w-3" /> {taka(doctor.chatFeeBdt)} more
                        </span>
                      </button>
                    </div>

                    <div className="mt-4 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                      Pay with
                    </div>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {PAY_METHODS.map((m) => (
                        <button
                          key={m.key}
                          onClick={() => setMethod(m.key)}
                          className={cn(
                            'rounded-2xl border py-3 text-[13px] font-extrabold transition',
                            method === m.key
                              ? 'border-transparent text-white shadow-glow'
                              : 'border-white/70 bg-white/60 text-ink-soft hover:bg-white',
                          )}
                          style={method === m.key ? { background: m.tint } : undefined}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {/*
                      Said plainly rather than buried: this project has no
                      gateway behind it. A checkout that looked real and did
                      nothing would be the dishonest version of this screen.
                    */}
                    <div className="mt-4 flex items-start gap-2 rounded-2xl bg-brand-500/8 px-3.5 py-3 ring-1 ring-brand-500/20">
                      <Info className="mt-[1px] h-4 w-4 flex-none text-brand-600" />
                      <p className="text-[11px] font-semibold leading-relaxed text-ink-soft">
                        Demonstration checkout — no payment gateway is connected. No money moves and
                        you are never asked for card or wallet details. The appointment itself is
                        real and will appear in your clinician&rsquo;s diary.
                      </p>
                    </div>

                    {refusal && (
                      <div className="mt-3 rounded-2xl bg-rose-500/12 px-3 py-2.5 text-[12px] font-bold text-rose-800 ring-1 ring-rose-500/25">
                        {refusal.message}
                      </div>
                    )}

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <button
                        onClick={() => setStep('slot')}
                        className="rounded-xl px-2.5 py-1.5 text-[12px] font-bold text-ink-muted transition hover:bg-white/70 hover:text-ink"
                      >
                        Back
                      </button>
                      <LiquidButton onClick={pay} icon={<Lock className="h-4 w-4" />}>
                        {paying ? 'Confirming…' : `Pay ${taka(total)} & confirm`}
                      </LiquidButton>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* ---------------------------------------------- 4. booked */}
              {step === 'done' && booked && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <GlassCard className="p-6 text-center sm:p-8">
                    <motion.span
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 18 }}
                      className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-500/15 text-emerald-600"
                    >
                      <BadgeCheck className="h-8 w-8" />
                    </motion.span>

                    <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
                      You have a doctor
                    </h2>
                    <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-muted">
                      {booked.doctorName} is expecting you. This is confirmed — there is no request
                      waiting for anyone to accept.
                    </p>

                    <div className="mx-auto mt-5 max-w-sm space-y-2 text-left">
                      {[
                        { icon: Stethoscope, label: booked.doctorName, sub: `${booked.specialty} · ${booked.hospital}` },
                        { icon: CalendarDays, label: prettyDate(booked.date), sub: booked.reason },
                        { icon: Clock, label: prettyTime(booked.time), sub: 'Please arrive ten minutes early' },
                      ].map((r) => (
                        <div key={r.label} className="flex items-start gap-2.5 rounded-2xl bg-white/60 px-3.5 py-2.5">
                          <r.icon className="mt-0.5 h-4 w-4 flex-none text-brand-500" />
                          <div>
                            <div className="text-[13px] font-bold text-ink">{r.label}</div>
                            <div className="text-[11px] font-semibold text-ink-muted">{r.sub}</div>
                          </div>
                        </div>
                      ))}

                      {booked.payment && (
                        <div className="flex items-start gap-2.5 rounded-2xl bg-emerald-500/10 px-3.5 py-2.5 ring-1 ring-emerald-500/20">
                          <ReceiptText className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                          <div>
                            <div className="text-[13px] font-bold text-ink">
                              {taka(booked.payment.feeBdt)} ·{' '}
                              {PAY_METHODS.find((m) => m.key === booked.payment!.method)?.label
                                ?? booked.payment.method}
                            </div>
                            <div className="text-[11px] font-semibold text-ink-muted">
                              Reference {booked.payment.reference}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                      <LiquidButton onClick={() => navigate('/mother?tab=care')}>
                        Back to your doctor
                      </LiquidButton>
                      <LiquidButton
                        variant="glass"
                        onClick={() => {
                          setBooked(null);
                          setDoctor(null);
                          setTime('');
                          setStep('clinician');
                          toFlow();
                        }}
                      >
                        Book another
                      </LiquidButton>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </>
          )}
          </>
          )}
        </div>
      </section>
    </div>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award, CalendarDays, CheckCircle2, ChevronRight, Clock, Hourglass, Info, MapPin,
  SearchX, Send, ShieldQuestion, Star, Stethoscope, Users, X, XCircle,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { DoctorChat, shortName } from '@/components/mother/DoctorChat';
import {
  APPT_META, prettyDate, prettyTime, RequestRefused, STATUS_META,
  type Appointment, type RankedDoctor, type SlotOffer,
} from '@/data/care';

const C = { brand: '#3f66f0', mint: '#2fbf9b', peach: '#fb7534', violet: '#8b7bf3' };

const pad = (n: number) => String(n).padStart(2, '0');
const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The next fortnight of clinic days, Sundays excluded. */
function bookableDays(count = 12) {
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
  'Scan results',
  'Something is worrying me',
];

/* ------------------------------------------------------------ doctor card */

function DoctorCard({ doctor, onPick }: { doctor: RankedDoctor; onPick: (d: RankedDoctor) => void }) {
  const meta = STATUS_META[doctor.status];
  const initials = doctor.name.replace(/^Dr\.?\s*/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'rounded-3xl border border-white/60 bg-white/60 p-4 transition',
        doctor.bookable ? 'hover:bg-white' : 'opacity-70',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-12 w-12 flex-none place-items-center rounded-2xl text-sm font-extrabold text-white"
          style={{ background: `linear-gradient(140deg, ${C.brand}, ${C.violet})` }}
        >
          {initials}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-extrabold text-ink">{doctor.name}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold ring-1', meta.ring)}>
              {meta.label}
            </span>
          </div>
          <div className="text-[12px] font-semibold text-ink-muted">{doctor.specialty}</div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-ink-faint">
            <span className="inline-flex items-center gap-1"><Award className="h-3 w-3" />{doctor.qualification}</span>
            <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" />{doctor.rating}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{doctor.distanceKm} km</span>
          </div>
        </div>
      </div>

      {/* how full their list is — the other half of the recommendation */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-ink-faint">
          <span>List capacity</span>
          <span>{doctor.panel} of {doctor.capacity}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/8">
          <motion.div
            className="h-full rounded-full"
            style={{ background: meta.tint }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(doctor.load * 100)}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <ul className="mt-3 space-y-1">
        {doctor.reasons.slice(0, 3).map((r) => (
          <li key={r} className="flex items-start gap-1.5 text-[11px] font-medium text-ink-soft">
            <CheckCircle2 className="mt-[1px] h-3 w-3 flex-none text-brand-500" />
            {r}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onPick(doctor)}
        disabled={!doctor.bookable}
        className={cn(
          'mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[12px] font-bold transition',
          doctor.bookable
            ? 'bg-brand-500 text-white hover:bg-brand-600'
            : 'cursor-not-allowed bg-ink/8 text-ink-faint',
        )}
      >
        {doctor.bookable ? <>Request an appointment <ChevronRight className="h-3.5 w-3.5" /></>
          : doctor.status === 'away' ? 'On leave — cannot request' : 'List full — cannot request'}
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------- request composer */

function RequestPanel({
  doctor, onClose, onSent,
}: { doctor: RankedDoctor; onClose: () => void; onSent: (a: Appointment) => void }) {
  const days = useMemo(() => bookableDays(), []);
  const [date, setDate] = useState(() => isoLocal(days[0]));
  const [times, setTimes] = useState<string[] | null>(null);
  const [time, setTime] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [sending, setSending] = useState(false);
  const [refusal, setRefusal] = useState<{ message: string; alternatives: SlotOffer[] } | null>(null);

  // reload the day's free slots whenever the chosen day changes
  useEffect(() => {
    let cancelled = false;
    setTimes(null);
    setTime('');
    api.getSlots(doctor.id, date)
      .then((s) => { if (!cancelled) setTimes(s.times); })
      .catch(() => { if (!cancelled) setTimes([]); });
    return () => { cancelled = true; };
  }, [doctor.id, date]);

  const send = async () => {
    if (!time) return;
    setSending(true);
    setRefusal(null);
    try {
      onSent(await api.requestAppointment({ doctorId: doctor.id, date, time, reason }));
    } catch (err) {
      if (err instanceof RequestRefused) {
        setRefusal({ message: err.message, alternatives: err.alternatives });
        // the slot went while she was choosing — refresh what is actually left
        api.getSlots(doctor.id, date).then((s) => setTimes(s.times)).catch(() => {});
      } else {
        setRefusal({ message: (err as Error).message, alternatives: [] });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.18 } }}
      className="rounded-3xl border border-brand-500/25 bg-brand-500/[0.06] p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-ink">Request with {doctor.name}</div>
          <div className="text-[11px] font-semibold text-ink-muted">
            {doctor.hospital} · {doctor.queue === 0 ? 'no one waiting' : `${doctor.queue} ahead of you`}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close request"
          className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-white/70 text-ink-soft transition hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* day */}
      <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-ink-faint">Pick a day</div>
      <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d) => {
          const key = isoLocal(d);
          const on = key === date;
          return (
            <button key={key} onClick={() => setDate(key)}
              className={cn('flex-none rounded-2xl px-3 py-2 text-center transition',
                on ? 'bg-brand-500 text-white shadow-glow' : 'bg-white/70 text-ink-soft hover:bg-white')}>
              <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                {d.toLocaleDateString(undefined, { weekday: 'short' })}
              </div>
              <div className="text-sm font-extrabold leading-tight">{d.getDate()}</div>
            </button>
          );
        })}
      </div>

      {/* time */}
      <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-ink-faint">Pick a time</div>
      {times === null ? (
        <div className="mt-1.5 text-[11px] font-semibold text-ink-faint">Checking what is free…</div>
      ) : times.length === 0 ? (
        <div className="mt-1.5 rounded-2xl border border-dashed border-ink/15 px-3 py-3 text-[11px] font-semibold text-ink-muted">
          Nothing free on this day. Try another day above.
        </div>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {times.map((t) => (
            <button key={t} onClick={() => setTime(t)}
              className={cn('rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition',
                time === t ? 'bg-brand-500 text-white' : 'bg-white/70 text-ink-soft hover:bg-white')}>
              {prettyTime(t)}
            </button>
          ))}
        </div>
      )}

      {/* reason */}
      <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-ink-faint">What is it about?</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {REASONS.map((r) => (
          <button key={r} onClick={() => setReason(r)}
            className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold transition',
              reason === r ? 'border-brand-500/40 bg-brand-500/15 text-brand-700'
                : 'border-white/60 bg-white/60 text-ink-soft hover:bg-white')}>
            {r}
          </button>
        ))}
      </div>

      {refusal && (
        <div className="mt-3 rounded-2xl bg-amber-500/12 px-3 py-2.5 ring-1 ring-amber-500/25">
          <div className="text-[12px] font-bold text-amber-800">{refusal.message}</div>
          {refusal.alternatives.length > 0 && (
            <>
              <div className="mt-1 text-[11px] font-semibold text-amber-800/80">Still free with them:</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {refusal.alternatives.slice(0, 6).map((a) => (
                  <button key={`${a.date}-${a.time}`}
                    onClick={() => { setDate(a.date); setTime(a.time); setRefusal(null); }}
                    className="rounded-xl bg-white/80 px-2.5 py-1 text-[11px] font-bold text-ink-soft transition hover:bg-white">
                    {prettyDate(a.date)} · {prettyTime(a.time)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-ink-faint">
          {shortName(doctor.name)} still has to accept this.
        </span>
        <LiquidButton onClick={send} icon={<Send className="h-4 w-4" />}>
          {sending ? 'Sending…' : 'Send request'}
        </LiquidButton>
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------- her requests */

function AppointmentRow({ appt, onCancel, anyBookable }: {
  appt: Appointment; onCancel: (id: string) => void; anyBookable: boolean;
}) {
  const meta = APPT_META[appt.status];
  const Icon = appt.status === 'requested' ? Hourglass
    : appt.status === 'accepted' ? CheckCircle2
    : appt.status === 'declined' ? XCircle
    : Clock;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.18 } }}
      className="rounded-2xl border border-white/60 bg-white/60 px-3.5 py-3"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-xl bg-brand-500/10 text-brand-600">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[13px] font-bold text-ink">{appt.doctorName}</span>
            <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1', meta.ring)}>
              {meta.label}
            </span>
          </div>
          <div className="text-[11px] font-semibold text-ink-muted">
            {prettyDate(appt.date)} · {prettyTime(appt.time)} — {appt.reason}
          </div>

          {appt.status === 'requested' && (
            <div className="mt-1 text-[11px] font-semibold text-amber-700">
              {appt.queuePosition <= 1 ? 'You are next in their queue'
                : `Number ${appt.queuePosition} in their queue`}
              {appt.waitingDays >= 2 && ` · waiting ${appt.waitingDays} days`}
            </div>
          )}
          {appt.note && (
            <div className="mt-1 rounded-xl bg-white/70 px-2 py-1.5 text-[11px] font-medium italic text-ink-soft">
              “{appt.note}”
            </div>
          )}
          {appt.status === 'declined' && (
            <div className="mt-1 text-[11px] font-semibold text-ink-muted">
              {anyBookable
                ? 'Pick another clinician from the list below — your place is not lost.'
                : 'No one else is free today. Your other appointments are unaffected.'}
            </div>
          )}
        </div>

        {appt.status === 'requested' && (
          <button onClick={() => onCancel(appt.id)}
            className="flex-none rounded-lg px-2 py-1 text-[10px] font-bold text-ink-faint transition hover:bg-rose-500/10 hover:text-rose-600">
            Withdraw
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ================================ section ================================ */

interface Props {
  /** life stage, so the ranking matches what she needs now */
  stage?: string;
}

export function FindDoctorSection({ stage }: Props) {
  const [doctors, setDoctors] = useState<RankedDoctor[]>([]);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [bookable, setBookable] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading');
  const [picked, setPicked] = useState<RankedDoctor | null>(null);
  const [showOthers, setShowOthers] = useState(false);
  const [justSent, setJustSent] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [rec, list] = await Promise.all([api.getRecommendedDoctors(stage), api.getAppointments()]);
      setDoctors(rec.doctors);
      setBookable(rec.bookable);
      setAppts(list);
      setState('ready');
    } catch {
      setState('offline');
    }
  }, [stage]);

  useEffect(() => { load(); }, [load]);

  const onSent = (a: Appointment) => {
    setPicked(null);
    setJustSent(a.doctorName);
    load();
    setTimeout(() => setJustSent(null), 4000);
  };

  const cancel = async (id: string) => {
    setAppts((prev) => prev.filter((a) => a.id !== id)); // optimistic
    try { await api.cancelAppointment(id); } finally { load(); }
  };

  const open = doctors.filter((d) => d.tier === 0);
  const otherSpecialty = doctors.filter((d) => d.tier === 1);
  const unavailable = doctors.filter((d) => d.tier === 2);

  // only what she is still waiting on or has coming up
  const live = appts.filter((a) => ['requested', 'accepted', 'declined'].includes(a.status)
    && a.date >= isoLocal(new Date()));

  return (
    <div className="space-y-6">
      <Reveal>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Your doctor</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Message the doctors looking after you, and request an appointment yourself. Clinicians
            are ordered by what they are qualified in and how much room is left on their list — the
            ones who can see you soonest come first.
          </p>
        </div>
      </Reveal>

      <DoctorChat />

      {/* what she has already asked for */}
      {live.length > 0 && (
        <Reveal>
          <GlassCard float className="p-5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ background: `${C.mint}1f`, color: C.mint }}>
                <CalendarDays className="h-[18px] w-[18px]" />
              </span>
              <div>
                <div className="text-sm font-bold text-ink">Your requests</div>
                <div className="text-[11px] text-ink-muted">Nothing is booked until a doctor accepts</div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {/* no popLayout: it measures children through a ref, which a
                  plain function component cannot receive */}
              <AnimatePresence initial={false}>
                {live.map((a) => (
                  <AppointmentRow key={a.id} appt={a} onCancel={cancel} anyBookable={bookable > 0} />
                ))}
              </AnimatePresence>
            </div>
          </GlassCard>
        </Reveal>
      )}

      <AnimatePresence>
        {justSent && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-2xl bg-emerald-500/12 px-4 py-3 text-[12px] font-bold text-emerald-800 ring-1 ring-emerald-500/25"
          >
            <CheckCircle2 className="h-4 w-4" /> Sent to {justSent}. You will see their answer here.
          </motion.div>
        )}
      </AnimatePresence>

      {/* the composer opens in place under the header */}
      <AnimatePresence>
        {picked && (
          <RequestPanel key={picked.id} doctor={picked} onClose={() => setPicked(null)} onSent={onSent} />
        )}
      </AnimatePresence>

      {/* ------------------------------------------------- recommendations */}
      {state === 'loading' && (
        <div className="rounded-3xl border border-dashed border-ink/15 px-4 py-10 text-center text-sm font-semibold text-ink-faint">
          Looking for clinicians who can see you…
        </div>
      )}

      {state === 'offline' && (
        <GlassCard className="p-6 text-center">
          <ShieldQuestion className="mx-auto h-8 w-8 text-ink-faint" />
          <div className="mt-2 text-sm font-bold text-ink">Cannot reach the clinic right now</div>
          <p className="mx-auto mt-1 max-w-md text-[12px] text-ink-muted">
            Your existing appointments are unaffected. Try again in a moment, or call the clinic
            directly if this is urgent.
          </p>
        </GlassCard>
      )}

      {state === 'ready' && bookable === 0 && (
        <GlassCard className="p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink/6 text-ink-faint">
            <SearchX className="h-7 w-7" />
          </span>
          <div className="mt-3 text-base font-extrabold text-ink">No doctor available right now</div>
          <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-ink-muted">
            Every clinician is either on leave or has a full list today. Nothing is wrong with your
            account — this changes daily, so it is worth checking back tomorrow.
          </p>
          <div className="mx-auto mt-4 max-w-md space-y-1.5 text-left">
            {[
              'Check your Reminders tab — you may already have a visit booked.',
              'Log any symptoms so your care team sees them before your next visit.',
              'For anything urgent, use the SOS button rather than waiting here.',
            ].map((t) => (
              <div key={t} className="flex items-start gap-2 rounded-2xl bg-white/60 px-3 py-2 text-[11px] font-semibold text-ink-soft">
                <Info className="mt-[1px] h-3.5 w-3.5 flex-none text-brand-500" />{t}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {state === 'ready' && bookable > 0 && (
        <>
          <Reveal>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ background: `${C.brand}1f`, color: C.brand }}>
                <Stethoscope className="h-[18px] w-[18px]" />
              </span>
              <div>
                <div className="text-sm font-bold text-ink">Recommended for you</div>
                <div className="text-[11px] text-ink-muted">
                  {open.length} clinician{open.length === 1 ? '' : 's'} in the right specialty who can take you
                </div>
              </div>
            </div>
          </Reveal>

          <motion.div layout className="grid gap-3 sm:grid-cols-2">
            {open.map((d) => <DoctorCard key={d.id} doctor={d} onPick={setPicked} />)}
          </motion.div>

          {/* everyone else, behind a disclosure so the main list stays honest */}
          {(otherSpecialty.length > 0 || unavailable.length > 0) && (
            <div>
              <button
                onClick={() => setShowOthers((v) => !v)}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-white/70 bg-white/60 py-2.5 text-[12px] font-bold text-ink-soft transition hover:bg-white hover:text-ink"
              >
                <Users className="h-3.5 w-3.5" />
                {showOthers ? 'Hide' : 'Show'} other clinicians
                <span className="font-semibold text-ink-faint">
                  ({otherSpecialty.length + unavailable.length})
                </span>
              </button>

              <AnimatePresence>
                {showOthers && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-3 pt-3 sm:grid-cols-2">
                      {[...otherSpecialty, ...unavailable].map((d) => (
                        <DoctorCard key={d.id} doctor={d} onPick={setPicked} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  );
}

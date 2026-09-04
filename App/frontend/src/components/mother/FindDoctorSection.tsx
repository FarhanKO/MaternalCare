import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CalendarDays, CalendarPlus, CheckCircle2, Clock, Hourglass,
  ShieldQuestion, Sparkles, XCircle,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { DoctorChat, shortName } from '@/components/mother/DoctorChat';
import { DocumentsSection } from '@/components/mother/DocumentsSection';
import {
  APPT_META, prettyDate, prettyTime, type Appointment, type CareReason,
} from '@/data/care';
import { ReasonDialog } from '@/components/ui/ReasonDialog';
import { RescheduleDialog } from '@/components/mother/RescheduleDialog';

const C = { brand: '#3f66f0', mint: '#2fbf9b', peach: '#fb7534', violet: '#8b7bf3' };

const pad = (n: number) => String(n).padStart(2, '0');
const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/*
 * DoctorCard and RequestPanel lived here: the ranked clinician card and the
 * free 'request an appointment' composer it opened. Both went with the list
 * when it moved to the Consultants page — git history has them if the free
 * request route is wanted back somewhere else.
 */


/* ---------------------------------------------------------- her requests */

function AppointmentRow({
  appt, onCancel, onMove, anyBookable,
}: {
  appt: Appointment;
  onCancel: (a: Appointment) => void;
  onMove: (a: Appointment) => void;
  anyBookable: boolean;
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
          {/* a moved appointment says so, so the new day is not a surprise */}
          {appt.moves > 0 && (
            <div className="mt-1 text-[11px] font-semibold text-ink-faint">
              Moved {appt.moves === 1 ? 'once' : `${appt.moves} times`}
              {appt.movedFrom ? ` · was ${prettyDate(appt.movedFrom.split(' ')[0])}` : ''}
            </div>
          )}
          {appt.cancellation && (
            <div className="mt-1 text-[11px] font-semibold text-ink-muted">
              Cancelled by {appt.cancellation.by === 'mother' ? 'you' : 'the clinic'} ·{' '}
              {appt.cancellation.reasonLabel}
            </div>
          )}
        </div>

        {/*
          Both actions, not just the destructive one. Withdraw used to be the
          only thing offered, so a clash on the day meant losing the slot and
          the queue position with it.
        */}
        {['requested', 'accepted'].includes(appt.status) && (
          <div className="flex flex-none flex-col gap-1">
            <button
              onClick={() => onMove(appt)}
              className="rounded-lg px-2 py-1 text-[10px] font-bold text-ink-faint transition hover:bg-brand-500/10 hover:text-brand-600"
            >
              Move
            </button>
            <button
              onClick={() => onCancel(appt)}
              className="rounded-lg px-2 py-1 text-[10px] font-bold text-ink-faint transition hover:bg-rose-500/10 hover:text-rose-600"
            >
              {appt.status === 'requested' ? 'Withdraw' : 'Cancel'}
            </button>
          </div>
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
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [bookable, setBookable] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading');
  const [justSent, setJustSent] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [rec, list] = await Promise.all([api.getRecommendedDoctors(stage), api.getAppointments()]);
      setBookable(rec.bookable);
      setAppts(list);
      setState('ready');
    } catch {
      setState('offline');
    }
  }, [stage]);

  useEffect(() => { load(); }, [load]);

  /*
   * Cancelling now asks why. It used to fire straight from the button with
   * nothing recorded, so a clinic saw slots go empty and never learned
   * whether the reason was cost, transport, or that she had gone into labour.
   */
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const [moving, setMoving] = useState<Appointment | null>(null);
  const [cancelReasons, setCancelReasons] = useState<CareReason[]>([]);

  useEffect(() => {
    api.getCancelReasons('mother').then(setCancelReasons).catch(() => setCancelReasons([]));
  }, []);

  // only what she is still waiting on or has coming up
  const live = appts.filter((a) => ['requested', 'accepted', 'declined'].includes(a.status)
    && a.date >= isoLocal(new Date()));

  return (
    <div className="space-y-6">
      <Reveal>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Your doctor</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Message the doctors looking after you, keep your prescriptions and results together, and
            book a consultation when you need one. The full list of clinicians lives on the
            Consultants page.
          </p>
        </div>
      </Reveal>

      {/*
        The paid route out of the queue — the request flow below stays free.

        Two doors, not two products: Book now picks the clinician herself,
        Auto Assign has the ranking pick three for her. Both land in the same
        slot-and-payment flow, so the card is no longer one big link.
      */}
      <Reveal>
        <GlassCard className="overflow-hidden p-0">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
              <CalendarPlus className="h-[22px] w-[22px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-extrabold text-ink">Appoint a doctor</div>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">
                Skip the queue — pay the consultation fee and your slot is confirmed straight
                away, with no one to wait on.
              </p>
            </div>
            <div className="flex flex-none gap-2">
              <Link
                to="/appoint"
                className="group/book flex items-center gap-1.5 rounded-2xl bg-brand-500 px-4 py-2.5 text-[12px] font-bold text-white transition hover:bg-brand-600"
              >
                Book now
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/book:translate-x-0.5" />
              </Link>
              <Link
                to="/appoint?mode=auto"
                className="group/auto flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-[12px] font-bold text-white transition"
                style={{ background: C.mint }}
              >
                <Sparkles className="h-3.5 w-3.5 transition-transform group-hover/auto:rotate-12" />
                Auto Assign
              </Link>
            </div>
          </div>
        </GlassCard>
      </Reveal>

      <DoctorChat />

      <DocumentsSection />

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
                  <AppointmentRow
                    key={a.id}
                    appt={a}
                    onCancel={setCancelling}
                    onMove={setMoving}
                    anyBookable={bookable > 0}
                  />
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

      {/*
        The ranked clinician list used to sit here. It now lives on the
        Consultants page, reached from the footer, so the mother's own screen
        stays about her care rather than about choosing a provider. Booking
        still starts from the card above.
      */}
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

      <RescheduleDialog
        appointment={moving}
        onClose={() => setMoving(null)}
        onMoved={() => load()}
      />

      <ReasonDialog
        open={Boolean(cancelling)}
        title={cancelling?.status === 'requested' ? 'Withdraw this request?' : 'Cancel this appointment?'}
        intro={cancelling
          ? `${cancelling.doctorName} · ${prettyDate(cancelling.date)}`
          : ''}
        options={cancelReasons}
        confirmLabel={cancelling?.status === 'requested' ? 'Withdraw it' : 'Cancel it'}
        notePrompt="Anything to add"
        footnote="Telling the clinic why helps them keep slots for the people who need them. If your plans change, you can book again any time."
        onClose={() => setCancelling(null)}
        onConfirm={async (reason, note) => {
          if (!cancelling) return;
          await api.cancelAppointment(cancelling.id, { reason, note: note || undefined });
          await load();
        }}
      />
    </div>
  );
}

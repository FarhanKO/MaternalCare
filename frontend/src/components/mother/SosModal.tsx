import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BellRing, Check, Clock, Crosshair, Download, Hospital, MapPin, Phone, Plus,
  ShieldCheck, Smartphone, Trash2, TriangleAlert, UserPlus, X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { audioSupported, confirmTone, startAlarm, stopAlarm } from '@/lib/alarm';
import {
  CHANNEL_META, COUNTDOWN_SECONDS, formatCoords, mapLink, RELATIONS, sinceLabel,
  type Guardian, type SosAlert,
} from '@/data/sos';

type Phase = 'ready' | 'counting' | 'sending' | 'sent' | 'guardians';

interface Props {
  open: boolean;
  onClose: () => void;
  /** so the header badge can follow the live alert */
  onAlertChange?: (alert: SosAlert | null) => void;
}

/** Best-effort fix. Never rejects — an alert without a location still goes. */
function locate(): Promise<{ lat?: number; lng?: number; accuracy?: number; locationNote?: string }> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ locationNote: 'unavailable' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy,
      }),
      (err) => resolve({
        locationNote: err.code === err.PERMISSION_DENIED ? 'denied'
          : err.code === err.TIMEOUT ? 'timeout' : 'unavailable',
      }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 },
    );
  });
}

/** Set expectations before she presses it, not during. */
const STEPS = [
  { icon: Clock, text: `${COUNTDOWN_SECONDS} seconds pass, with an alarm — cancel any time` },
  { icon: Crosshair, text: 'Your location is found and attached' },
  { icon: BellRing, text: 'Your guardians and your doctor are alerted at once' },
  { icon: ShieldCheck, text: 'You can mark yourself safe afterwards' },
];

const LOCATION_COPY: Record<string, string> = {
  denied: 'Location is switched off, so responders will not see where you are.',
  timeout: 'Could not get a fix in time — the alert went without a location.',
  unavailable: 'This device cannot share a location.',
};

/* ------------------------------------------------------------- countdown */

function CountdownRing({ left, total }: { left: number; total: number }) {
  const R = 78;
  const circumference = 2 * Math.PI * R;
  const progress = left / total;

  return (
    <div className="relative grid place-items-center">
      <svg viewBox="0 0 180 180" className="h-44 w-44 -rotate-90">
        <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="9" />
        <circle
          cx="90" cy="90" r={R} fill="none" stroke="white" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute text-center">
        <motion.div
          key={left}
          initial={{ scale: 1.35, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="text-6xl font-extrabold leading-none text-white tabular-nums"
        >
          {left}
        </motion.div>
        <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
          sending in
        </div>
      </div>
    </div>
  );
}

/* ================================= modal ================================= */

export function SosModal({ open, onClose, onAlertChange }: Props) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [left, setLeft] = useState(COUNTDOWN_SECONDS);
  const [alert, setAlert] = useState<SosAlert | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [error, setError] = useState('');
  const [fix, setFix] = useState<Awaited<ReturnType<typeof locate>> | null>(null);

  const [name, setName] = useState('');
  const [relation, setRelation] = useState(RELATIONS[0]);
  const [phone, setPhone] = useState('');

  const tick = useRef<number | null>(null);
  const locating = useRef<Promise<Awaited<ReturnType<typeof locate>>> | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await api.getSosState();
      setGuardians(s.contacts);
      if (s.active) {
        setAlert(s.active);
        setPhase('sent');
        onAlertChange?.(s.active);
      }
    } catch {
      setError('Cannot reach the server — an alert may not get through.');
    }
    // onAlertChange is a fresh closure each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const clearTick = () => {
    if (tick.current !== null) { window.clearInterval(tick.current); tick.current = null; }
  };

  // never leave the alarm running when the modal goes away
  useEffect(() => () => { clearTick(); stopAlarm(); }, []);
  useEffect(() => { if (!open) { clearTick(); stopAlarm(); } }, [open]);

  const send = useCallback(async () => {
    clearTick();
    setPhase('sending');
    try {
      // the fix was requested when the countdown started, so it is usually ready
      const where = await (locating.current ?? locate());
      setFix(where);
      const raised = await api.raiseSos(where);
      setAlert(raised);
      onAlertChange?.(raised);
      setPhase('sent');
      stopAlarm();
      confirmTone();
    } catch (e) {
      stopAlarm();
      setPhase('ready');
      setError((e as Error).message || 'The alert could not be sent');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const arm = () => {
    setError('');
    setLeft(COUNTDOWN_SECONDS);
    setPhase('counting');
    startAlarm(0);
    locating.current = locate();       // fetch the fix while she can still cancel

    clearTick();
    tick.current = window.setInterval(() => {
      setLeft((n) => {
        const next = n - 1;
        if (next <= 0) { void send(); return 0; }
        startAlarm(1 - next / COUNTDOWN_SECONDS);   // tighten as it runs out
        return next;
      });
    }, 1000);
  };

  const abort = () => {
    clearTick();
    stopAlarm();
    setPhase('ready');
    setLeft(COUNTDOWN_SECONDS);
  };

  const standDown = async () => {
    if (!alert) return;
    try {
      const closed = await api.closeSos(alert.id, 'safe');
      setAlert(closed);
      onAlertChange?.(null);
      setPhase('ready');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const addGuardian = async () => {
    if (!name.trim()) return;
    try {
      // await outside the updater — the callback itself is not async
      const saved = await api.addGuardian({ name, relation, phone });
      setGuardians((g) => [...g, saved]);
      setName(''); setPhone('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const removeGuardian = async (id: string) => {
    setGuardians((g) => g.filter((x) => x.id !== id));
    try { await api.removeGuardian(id); } catch { load(); }
  };

  const danger = phase === 'counting' || phase === 'sending';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[140] flex items-center justify-center p-4"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.22 } }}
        >
          <motion.div
            className={cn('absolute inset-0', danger ? 'bg-rose-950/55' : 'bg-ink/45')}
            onClick={danger ? undefined : onClose}
            initial={{ opacity: 0, backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />

          <motion.div
            role="dialog" aria-modal="true" aria-label="Emergency SOS"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className={cn(
              'relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-4xl shadow-float',
              danger ? 'ring-1 ring-white/20' : 'glass-strong ring-gradient',
            )}
            style={danger
              ? { background: 'linear-gradient(150deg, #e11d48 0%, #be123c 55%, #9f1239 100%)' }
              : undefined}
          >
            {/* ------------------------------------------------ COUNTDOWN */}
            {danger ? (
              <div className="flex flex-col items-center px-6 py-8 text-center">
                <motion.div
                  animate={{ opacity: [1, 0.55, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white"
                >
                  <TriangleAlert className="h-3.5 w-3.5" /> Emergency
                </motion.div>

                <div className="mt-6">
                  {phase === 'counting'
                    ? <CountdownRing left={left} total={COUNTDOWN_SECONDS} />
                    : (
                      <div className="grid h-44 w-44 place-items-center">
                        <div className="text-center text-white">
                          <BellRing className="mx-auto h-12 w-12 animate-pulse" />
                          <div className="mt-3 text-sm font-bold">Alerting everyone…</div>
                        </div>
                      </div>
                    )}
                </div>

                <p className="mt-5 max-w-xs text-[13px] font-semibold leading-relaxed text-white/90">
                  Your guardians and your doctor will be alerted with your location.
                </p>

                {phase === 'counting' && (
                  <button
                    onClick={abort}
                    className="mt-6 w-full max-w-xs rounded-3xl bg-white py-4 text-base font-extrabold text-rose-700 shadow-lg transition hover:bg-white/90"
                  >
                    Cancel — I’m fine
                  </button>
                )}

                <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-white/70">
                  <Crosshair className="h-3.5 w-3.5" /> Finding your location…
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 px-6 pt-6">
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight text-ink">
                      {phase === 'sent' ? 'Help is on the way'
                        : phase === 'guardians' ? 'Your guardians'
                        : 'Emergency SOS'}
                    </h2>
                    <p className="mt-1 text-sm text-ink-muted">
                      {phase === 'sent' ? 'Everyone below has your location.'
                        : phase === 'guardians' ? 'They are alerted the moment you press SOS.'
                        : `Hold nothing — one press starts a ${COUNTDOWN_SECONDS}-second countdown.`}
                    </p>
                  </div>
                  <button onClick={onClose} aria-label="Close"
                    className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white/70 text-ink-soft transition hover:text-ink">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex-1 overflow-y-auto px-6 pb-2">
                  {error && (
                    <div className="mb-3 rounded-2xl bg-rose-500/12 px-3 py-2.5 text-[12px] font-bold text-rose-700 ring-1 ring-rose-500/25">
                      {error}
                    </div>
                  )}

                  {/* ------------------------------------------- SENT */}
                  {phase === 'sent' && alert && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 rounded-3xl bg-emerald-500/12 px-4 py-3 ring-1 ring-emerald-500/25">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-emerald-600 text-white">
                          <Check className="h-5 w-5" strokeWidth={3} />
                        </span>
                        <div>
                          <div className="text-[13px] font-extrabold text-emerald-900">
                            Alert raised {sinceLabel(alert.triggeredAt)}
                          </div>
                          <div className="text-[11px] font-semibold text-emerald-800/80">
                            {alert.reached} of {alert.notifications.length} reached right now
                          </div>
                        </div>
                      </div>

                      {/* where she is */}
                      <div className="rounded-3xl border border-white/60 bg-white/60 p-3.5">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                          <MapPin className="h-3.5 w-3.5" /> Your location
                        </div>
                        {alert.location ? (
                          <>
                            <div className="mt-1 font-mono text-[13px] font-bold text-ink">
                              {formatCoords(alert.location)}
                            </div>
                            {alert.location.accuracy && (
                              <div className="text-[11px] font-semibold text-ink-muted">
                                accurate to about {Math.round(alert.location.accuracy)} m
                              </div>
                            )}
                            <a
                              href={mapLink(alert.location)}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 text-[12px] font-bold text-white transition hover:bg-brand-600"
                            >
                              <MapPin className="h-3.5 w-3.5" /> Open in maps
                            </a>
                          </>
                        ) : (
                          <p className="mt-1 text-[12px] font-semibold text-amber-700">
                            {LOCATION_COPY[alert.locationNote ?? 'unavailable']}
                          </p>
                        )}
                      </div>

                      {/* who was told, and honestly whether it landed */}
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                          Who was alerted
                        </div>
                        <div className="mt-2 space-y-1.5">
                          {alert.notifications.map((n) => (
                            <div key={n.id}
                              className="flex items-center gap-2.5 rounded-2xl border border-white/60 bg-white/60 px-3 py-2">
                              <span className={cn('grid h-8 w-8 flex-none place-items-center rounded-xl',
                                n.state === 'alerted'
                                  ? 'bg-emerald-500/15 text-emerald-700'
                                  : 'bg-amber-500/15 text-amber-700')}>
                                {n.state === 'alerted'
                                  ? <BellRing className="h-4 w-4" />
                                  : <Clock className="h-4 w-4" />}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[12.5px] font-bold text-ink">
                                  {n.recipient}
                                  {n.relation && (
                                    <span className="ml-1 font-semibold text-ink-faint">· {n.relation}</span>
                                  )}
                                </div>
                                <div className="text-[10px] font-semibold text-ink-muted">
                                  {CHANNEL_META[n.channel].label} — {n.detail ?? CHANNEL_META[n.channel].note}
                                </div>
                              </div>
                              <span className={cn('flex-none rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                                n.state === 'alerted'
                                  ? 'bg-emerald-500/15 text-emerald-700'
                                  : 'bg-amber-500/15 text-amber-700')}>
                                {n.state === 'alerted' ? 'Alerted' : 'Queued'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <a
                        href="tel:999"
                        className="flex items-center justify-center gap-2 rounded-3xl bg-gradient-to-br from-rose-500 to-rose-600 py-3.5 text-sm font-extrabold text-white shadow-[0_10px_30px_-8px_rgba(225,29,72,0.5)]"
                      >
                        <Phone className="h-[18px] w-[18px]" /> Call emergency services
                      </a>
                    </div>
                  )}

                  {/* -------------------------------------- GUARDIANS */}
                  {phase === 'guardians' && (
                    <div className="space-y-2">
                      {guardians.map((g) => (
                        <div key={g.id}
                          className="flex items-center gap-2.5 rounded-2xl border border-white/60 bg-white/60 px-3 py-2.5">
                          <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-rose-500/12 text-rose-600 text-[11px] font-extrabold">
                            {g.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-bold text-ink">{g.name}</div>
                            <div className="text-[11px] font-semibold text-ink-muted">
                              {[g.relation, g.phone].filter(Boolean).join(' · ') || 'No number saved'}
                            </div>
                          </div>
                          <span className={cn('flex-none rounded-full px-2 py-0.5 text-[9px] font-bold uppercase',
                            g.appLinked ? 'bg-emerald-500/15 text-emerald-700' : 'bg-ink/8 text-ink-muted')}>
                            {g.appLinked ? 'App linked' : 'No app'}
                          </span>
                          <button onClick={() => removeGuardian(g.id)} aria-label={`Remove ${g.name}`}
                            className="grid h-7 w-7 flex-none place-items-center rounded-lg text-ink-faint transition hover:bg-rose-500/10 hover:text-rose-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}

                      {guardians.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-ink/15 px-3 py-5 text-center text-[11px] font-semibold text-ink-muted">
                          No guardians yet. Add the people who should come for you.
                        </div>
                      )}

                      <div className="rounded-3xl border border-white/60 bg-white/50 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                          Add a guardian
                        </div>
                        <input
                          value={name} onChange={(e) => setName(e.target.value)}
                          placeholder="Their name" aria-label="Guardian name"
                          className="mt-1.5 h-10 w-full rounded-2xl border border-white/60 bg-white/80 px-3.5 text-[12px] font-medium text-ink outline-none focus:border-rose-400"
                        />
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {RELATIONS.map((r) => (
                            <button key={r} onClick={() => setRelation(r)}
                              className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold transition',
                                relation === r ? 'border-rose-500/40 bg-rose-500/15 text-rose-700'
                                  : 'border-white/60 bg-white/70 text-ink-soft hover:bg-white')}>
                              {r}
                            </button>
                          ))}
                        </div>
                        <input
                          value={phone} onChange={(e) => setPhone(e.target.value)}
                          placeholder="Phone number" aria-label="Guardian phone" inputMode="tel"
                          className="mt-1.5 h-10 w-full rounded-2xl border border-white/60 bg-white/80 px-3.5 text-[12px] font-medium text-ink outline-none focus:border-rose-400"
                        />
                        <button
                          onClick={addGuardian}
                          disabled={!name.trim()}
                          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-rose-600 py-2.5 text-[12px] font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add guardian
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ------------------------------------------ READY */}
                  {phase === 'ready' && (
                    <div className="space-y-3">
                      <button
                        onClick={arm}
                        className="group relative flex w-full flex-col items-center gap-2 overflow-hidden rounded-4xl bg-gradient-to-br from-rose-500 to-rose-700 px-6 py-7 text-white shadow-[0_18px_40px_-12px_rgba(225,29,72,0.6)] transition hover:brightness-105"
                      >
                        <span className="relative grid h-16 w-16 place-items-center rounded-full bg-white/20">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/30" />
                          <TriangleAlert className="relative h-8 w-8" />
                        </span>
                        <span className="text-xl font-extrabold tracking-tight">Press for help</span>
                        <span className="text-[11px] font-semibold text-white/85">
                          {COUNTDOWN_SECONDS} seconds to cancel before it sends
                        </span>
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setPhase('guardians')}
                          className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/60 px-3 py-2.5 text-left transition hover:bg-white"
                        >
                          <UserPlus className="h-4 w-4 flex-none text-rose-600" />
                          <span className="min-w-0">
                            <span className="block text-[12px] font-bold text-ink">Guardians</span>
                            <span className="block text-[10px] font-semibold text-ink-faint">
                              {guardians.length} saved
                            </span>
                          </span>
                        </button>
                        <a
                          href="tel:999"
                          className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/60 px-3 py-2.5 transition hover:bg-white"
                        >
                          <Hospital className="h-4 w-4 flex-none text-rose-600" />
                          <span className="min-w-0">
                            <span className="block text-[12px] font-bold text-ink">Call 999</span>
                            <span className="block text-[10px] font-semibold text-ink-faint">
                              Ambulance
                            </span>
                          </span>
                        </a>
                      </div>

                      {/* what actually happens — no surprises mid-emergency */}
                      <div className="rounded-3xl border border-white/60 bg-white/50 p-3.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                          What happens when you press it
                        </div>
                        <ol className="mt-2 space-y-1.5">
                          {STEPS.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-start gap-2 text-[11px] font-semibold text-ink-soft">
                              <Icon className="mt-[1px] h-3.5 w-3.5 flex-none text-rose-500" />
                              {text}
                            </li>
                          ))}
                        </ol>
                        {!audioSupported() && (
                          <p className="mt-2 text-[10px] font-semibold text-amber-700">
                            This browser cannot play the alarm sound.
                          </p>
                        )}
                      </div>

                      {/* the companion app — designed, not yet shipped */}
                      <div className="rounded-3xl border border-dashed border-rose-300/70 bg-rose-500/[0.06] p-3.5">
                        <div className="flex items-start gap-2.5">
                          <span className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-rose-500/15 text-rose-600">
                            <Smartphone className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[13px] font-extrabold text-ink">Guardian app</span>
                              <span className="rounded-full bg-ink/8 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-muted">
                                Not released yet
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] font-medium leading-relaxed text-ink-soft">
                              A small app for the people you trust. When you raise an SOS it takes
                              over their screen and sounds a full-volume alarm, even on silent, with
                              your location and a route to you.
                            </p>
                          </div>
                        </div>

                        <button
                          disabled
                          title="The guardian app has not been released yet"
                          className="mt-2.5 inline-flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-2xl bg-ink/8 py-2.5 text-[12px] font-bold text-ink-faint"
                        >
                          <Download className="h-3.5 w-3.5" /> Send guardians the app
                        </button>
                        <p className="mt-1.5 text-center text-[10px] font-semibold text-ink-faint">
                          Until it ships, guardians are recorded but not automatically alarmed.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-white/50 px-6 py-4">
                  {phase === 'sent' ? (
                    <>
                      <span className="text-[11px] font-semibold text-ink-faint">
                        Stay where you are if you can.
                      </span>
                      <button
                        onClick={standDown}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-emerald-700"
                      >
                        <ShieldCheck className="h-4 w-4" /> I’m safe now
                      </button>
                    </>
                  ) : phase === 'guardians' ? (
                    <>
                      <button onClick={() => setPhase('ready')}
                        className="rounded-xl px-3 py-2 text-[12px] font-bold text-ink-muted transition hover:text-ink">
                        Back
                      </button>
                      <span className="text-[11px] font-semibold text-ink-faint">
                        {guardians.length} will be alerted
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px] font-semibold text-ink-faint">
                      For immediate danger, call emergency services directly.
                    </span>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

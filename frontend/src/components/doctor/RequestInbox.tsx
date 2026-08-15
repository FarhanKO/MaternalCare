import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays, Check, Clock, Hourglass, Inbox, MessageSquare, X,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { APPT_META, prettyDate, prettyTime, type Appointment } from '@/data/care';

const DECLINE_REASONS = [
  'Fully booked that day — please pick another',
  'This needs a maternal-fetal specialist',
  'Come to the walk-in clinic instead',
];

/**
 * The clinician's side of an appointment request. Accepting confirms the slot
 * on the mother's account; declining sends her back a reason, because a bare
 * refusal leaves her with nowhere to go.
 */
export function RequestInbox({ doctorId, onChange }: { doctorId: string; onChange?: (pending: number) => void }) {
  const [items, setItems] = useState<Appointment[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading');
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await api.getDoctorRequests(doctorId);
      setItems(list);
      setState('ready');
      onChange?.(list.filter((a) => a.status === 'requested').length);
    } catch {
      setState('offline');
    }
    // onChange is a fresh closure each render; depending on it would loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  useEffect(() => { load(); }, [load]);

  const answer = async (id: string, status: 'accepted' | 'declined', message?: string) => {
    setBusy(id);
    try {
      await api.respondToRequest(id, status, message);
      await load();
    } finally {
      setBusy(null);
      setDecliningId(null);
      setNote('');
    }
  };

  const waiting = items.filter((a) => a.status === 'requested');
  const answered = items.filter((a) => a.status !== 'requested').slice(0, 6);

  return (
    <div className="space-y-5">
      <Reveal>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Appointment requests</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Mothers who have asked to see you. Nothing is in your diary until you accept it.
          </p>
        </div>
      </Reveal>

      {state === 'offline' && (
        <GlassCard className="p-6 text-center text-sm font-semibold text-ink-muted">
          Cannot reach the server — requests will appear when it is back.
        </GlassCard>
      )}

      {state === 'ready' && waiting.length === 0 && (
        <GlassCard className="p-10 text-center">
          <Inbox className="mx-auto h-8 w-8 text-ink-faint" />
          <div className="mt-2 text-sm font-bold text-ink">Nothing waiting</div>
          <p className="mt-1 text-[12px] text-ink-muted">New requests land here as soon as a mother sends one.</p>
        </GlassCard>
      )}

      <div className="space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {waiting.map((a) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
            >
              <GlassCard float className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-amber-500/15 text-amber-700">
                      <Hourglass className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <div className="text-sm font-extrabold text-ink">{a.reason}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-ink-muted">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />{prettyDate(a.date)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />{prettyTime(a.time)}
                        </span>
                        {a.waitingDays > 0 && (
                          <span className="text-amber-700">waiting {a.waitingDays} day{a.waitingDays > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDecliningId(decliningId === a.id ? null : a.id)}
                      disabled={busy === a.id}
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-300/70 bg-rose-500/10 px-3 py-2 text-[12px] font-bold text-rose-600 transition hover:bg-rose-500/15"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                    <button
                      onClick={() => answer(a.id, 'accepted')}
                      disabled={busy === a.id}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-[12px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" /> {busy === a.id ? 'Saving…' : 'Accept'}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {decliningId === a.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 rounded-2xl border border-white/60 bg-white/60 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                          Tell her why — she will see this
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {DECLINE_REASONS.map((r) => (
                            <button key={r} onClick={() => setNote(r)}
                              className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold transition',
                                note === r ? 'border-peach-500/40 bg-peach-500/15 text-peach-700'
                                  : 'border-white/60 bg-white/70 text-ink-soft hover:bg-white')}>
                              {r}
                            </button>
                          ))}
                        </div>
                        <input
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Or write your own…"
                          className="mt-2 h-10 w-full rounded-xl border border-white/60 bg-white/80 px-3 text-[12px] font-medium text-ink outline-none focus:border-peach-400"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <button onClick={() => { setDecliningId(null); setNote(''); }}
                            className="rounded-xl px-3 py-1.5 text-[12px] font-bold text-ink-muted hover:text-ink">
                            Cancel
                          </button>
                          <button
                            onClick={() => answer(a.id, 'declined', note.trim() || DECLINE_REASONS[0])}
                            className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-rose-700"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Send decline
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {answered.length > 0 && (
        <Reveal>
          <GlassCard className="p-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Recently answered</div>
            <div className="mt-2.5 space-y-1.5">
              {answered.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/55 px-3 py-2">
                  <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1',
                    APPT_META[a.status].ring)}>
                    {APPT_META[a.status].label}
                  </span>
                  <span className="text-[12px] font-bold text-ink">{a.reason}</span>
                  <span className="text-[11px] font-semibold text-ink-faint">
                    {prettyDate(a.date)} · {prettyTime(a.time)}
                  </span>
                  {a.note && <span className="text-[11px] italic text-ink-muted">“{a.note}”</span>}
                </div>
              ))}
            </div>
          </GlassCard>
        </Reveal>
      )}
    </div>
  );
}

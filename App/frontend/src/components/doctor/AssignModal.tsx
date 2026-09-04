import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check, Dumbbell, Pill, Send, Stethoscope, Syringe, TestTube, X,
} from 'lucide-react';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { KIND_SUGGESTIONS, type ReminderKind } from '@/data/reminders';
import type { Patient } from '@/data/doctor';

const KINDS: { key: ReminderKind; label: string; icon: any; tint: string }[] = [
  { key: 'test', label: 'Test', icon: TestTube, tint: '#22b8c4' },
  { key: 'medicine', label: 'Medicine', icon: Pill, tint: '#8b7bf3' },
  { key: 'doctor', label: 'Appointment', icon: Stethoscope, tint: '#3f66f0' },
  { key: 'vaccination', label: 'Vaccine', icon: Syringe, tint: '#f6b93b' },
  { key: 'exercise', label: 'Exercise', icon: Dumbbell, tint: '#2fbf9b' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

interface Props {
  patient: Patient | null;
  clinician: string;
  onClose: () => void;
}

/**
 * Lets a clinician schedule a test, medicine, appointment, vaccine or exercise
 * straight onto the mother's account. Writes through the same reminders API the
 * mother's own dashboard reads, tagged with who assigned it.
 */
export function AssignModal({ patient, clinician, onClose }: Props) {
  const [kind, setKind] = useState<ReminderKind>('test');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('09:00');
  const [repeat, setRepeat] = useState<'once' | 'daily' | 'weekly'>('once');
  const [state, setState] = useState<'idle' | 'saving' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!patient) return;
    setKind('test'); setTitle(''); setNote(''); setDate(todayISO());
    setTime('09:00'); setRepeat('once'); setState('idle'); setError('');
  }, [patient]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && patient && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [patient, onClose]);

  const send = async () => {
    if (!patient) return;
    const finalTitle = title.trim() || KINDS.find((k) => k.key === kind)!.label;
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    const at = new Date(y, m - 1, d, hh, mm).toISOString();
    setState('saving'); setError('');
    try {
      // writes to this patient's own account, not the current session user
      await api.assignToPatient(patient.id, {
        kind, title: finalTitle, note: note.trim() || undefined, at, repeat, assignedBy: clinician,
      });
      setState('sent');
      setTimeout(onClose, 1400);
    } catch (e: any) {
      setState('error');
      setError(e?.message ?? 'Could not reach the server');
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {patient && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.22 } }}
        >
          <motion.div
            className="absolute inset-0 bg-ink/35"
            onClick={onClose}
            initial={{ opacity: 0, backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />

          <motion.div
            role="dialog" aria-modal="true" aria-label={`Assign care to ${patient.name}`}
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass-strong ring-gradient relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-4xl shadow-float"
          >
            <div className="flex items-start justify-between gap-3 px-6 pt-6">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-ink">Assign to {patient.name}</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  This appears on her Reminders page straight away.
                </p>
              </div>
              <button onClick={onClose} aria-label="Close"
                className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white/70 text-ink-soft transition hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex-1 overflow-y-auto px-6 pb-2">
              {state === 'sent' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="py-10 text-center"
                >
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-glow">
                    <Check className="h-8 w-8 text-white" strokeWidth={3} />
                  </span>
                  <h3 className="mt-4 text-lg font-extrabold text-ink">Sent to {patient.name.split(' ')[0]}</h3>
                  <p className="mt-1 text-sm text-ink-muted">It is now on her Reminders page.</p>
                </motion.div>
              ) : (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">What are you assigning?</div>
                  <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {KINDS.map((k) => (
                      <button key={k.key} onClick={() => setKind(k.key)}
                        className={cn('flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition',
                          kind === k.key ? 'border-peach-500/40 bg-peach-500/10' : 'border-white/60 bg-white/60 hover:bg-white')}>
                        <span className="grid h-9 w-9 place-items-center rounded-xl"
                          style={{ background: `${k.tint}1f`, color: k.tint }}>
                          <k.icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="text-[11px] font-bold text-ink">{k.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Details</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)}
                      placeholder={KINDS.find((k) => k.key === kind)!.label}
                      className="mt-1.5 h-11 w-full rounded-2xl border border-white/60 bg-white/70 px-4 text-sm font-medium text-ink outline-none transition placeholder:text-ink-faint focus:border-peach-400 focus:ring-2 focus:ring-peach-500/20" />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {KIND_SUGGESTIONS[kind].map((sug) => (
                        <button key={sug} onClick={() => setTitle(sug)}
                          className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold transition',
                            title === sug ? 'border-peach-500/40 bg-peach-500/15 text-peach-700'
                              : 'border-white/60 bg-white/60 text-ink-soft hover:bg-white')}>
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Instructions for her</label>
                    <input value={note} onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. fast for 8 hours beforehand"
                      className="mt-1.5 h-11 w-full rounded-2xl border border-white/60 bg-white/70 px-4 text-sm font-medium text-ink outline-none transition placeholder:text-ink-faint focus:border-peach-400 focus:ring-2 focus:ring-peach-500/20" />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Date</label>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                        className="mt-1.5 h-11 w-full rounded-2xl border border-white/60 bg-white/70 px-3 text-sm font-semibold text-ink outline-none focus:border-peach-400" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Time</label>
                      <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                        className="mt-1.5 h-11 w-full rounded-2xl border border-white/60 bg-white/70 px-3 text-sm font-semibold text-ink outline-none focus:border-peach-400" />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Repeat</label>
                    <div className="mt-1.5 flex gap-1.5">
                      {(['once', 'daily', 'weekly'] as const).map((rp) => (
                        <button key={rp} onClick={() => setRepeat(rp)}
                          className={cn('flex-1 rounded-xl px-3 py-2 text-[11px] font-bold capitalize ring-1 transition',
                            repeat === rp ? 'bg-peach-500/15 text-peach-700 ring-peach-500/25'
                              : 'bg-white/60 text-ink-muted ring-transparent hover:text-ink')}>
                          {rp}
                        </button>
                      ))}
                    </div>
                  </div>

                  {state === 'error' && (
                    <div className="mt-4 rounded-2xl bg-rose-500/12 px-3.5 py-2.5 text-[12px] font-semibold text-rose-700 ring-1 ring-rose-500/25">
                      Could not send — {error}. Is the backend running on port 3000?
                    </div>
                  )}

                  <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
                    She will see this tagged as assigned by you, and cannot delete it herself.
                  </p>
                </>
              )}
            </div>

            {state !== 'sent' && (
              <div className="flex items-center justify-between gap-2 border-t border-white/50 px-6 py-4">
                <LiquidButton variant="ghost" onClick={onClose}>Cancel</LiquidButton>
                <LiquidButton variant="peach" onClick={send} icon={<Send className="h-4 w-4" />}>
                  {state === 'saving' ? 'Sending…' : 'Send to patient'}
                </LiquidButton>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

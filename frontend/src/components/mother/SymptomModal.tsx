import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, ArrowRight, Check, ChevronLeft, Lightbulb, Mic, Plus, Stethoscope, Trash2, X,
} from 'lucide-react';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { AITextLoading } from '@/components/ui/AITextLoading';
import { BeamsBackground } from '@/components/ui/BeamsBackground';
import { cn } from '@/lib/cn';
import {
  COMMON_SYMPTOMS, INTENSITIES, INTENSITY_LABEL, parseTranscript, URGENT_LABELS,
  type Intensity, type Symptom,
} from '@/data/symptoms';
import { buildAdvice, doctorReport, TONE_CLASS } from '@/lib/health';

const INTENSITY_CLASS: Record<Intensity, string> = {
  mild: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/25',
  mid: 'bg-brand-500/15 text-brand-700 ring-brand-500/25',
  high: 'bg-amber-500/15 text-amber-700 ring-amber-500/25',
  severe: 'bg-rose-500/15 text-rose-700 ring-rose-500/25',
};

const uid = () => `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

type Phase = 'review' | 'log' | 'thinking' | 'analysis';

interface Props {
  open: boolean;
  onClose: () => void;
  initial: Symptom[];
  onSave: (list: Symptom[]) => void;
}

export function SymptomModal({ open, onClose, initial, onSave }: Props) {
  const [phase, setPhase] = useState<Phase>('log');
  const [list, setList] = useState<Symptom[]>(initial);
  const [review, setReview] = useState<Symptom[]>([]);
  const [draft, setDraft] = useState('');

  // voice
  const [listening, setListening] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const recRef = useRef<any>(null);

  const SR = typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;
  const voiceSupported = Boolean(SR);

  /* open: carried-over symptoms get a "still there?" pass first */
  useEffect(() => {
    if (!open) return;
    const carried = initial.filter((s) => !s.confirmedToday);
    setReview(carried);
    setList(initial.filter((s) => s.confirmedToday));
    setPhase(carried.length ? 'review' : 'log');
    setDraft(''); setTranscript(''); setVoiceNote(null); setSeconds(0);
  }, [open]);

  useEffect(() => {
    if (!listening) { setSeconds(0); return; }
    const id = setInterval(() => setSeconds((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [listening]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && open && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* noop */ } }, []);

  const addSymptoms = (incoming: Symptom[]) =>
    setList((prev) => {
      const have = new Set(prev.map((p) => p.name.toLowerCase()));
      return [...prev, ...incoming.filter((s) => !have.has(s.name.toLowerCase()))];
    });

  const startVoice = () => {
    if (!voiceSupported) return;
    const rec = new SR();
    rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = true;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      setTranscript(text);
      if (e.results[e.results.length - 1].isFinal) {
        const { matches, unmatched } = parseTranscript(text);
        if (matches.length) {
          addSymptoms(matches);
          setVoiceNote(`Found ${matches.length} symptom${matches.length > 1 ? 's' : ''}: ${matches.map((m) => m.name).join(', ')}.`);
        } else if (unmatched) {
          setDraft(text.trim());
          setVoiceNote('No known symptom matched — your words are in the box below, edit and add them.');
        }
      }
    };
    rec.onerror = (e: any) => {
      setListening(false);
      setVoiceNote(e?.error === 'not-allowed'
        ? 'Microphone permission was blocked. Allow it in your browser to use voice.'
        : `Voice input stopped (${e?.error ?? 'unknown error'}). You can type instead.`);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setTranscript(''); setVoiceNote(null); setListening(true);
    rec.start();
  };

  const stopVoice = () => { try { recRef.current?.stop(); } catch { /* noop */ } setListening(false); };

  const addDraft = () => {
    const name = draft.trim();
    if (!name) return;
    addSymptoms([{ id: uid(), name: name.charAt(0).toUpperCase() + name.slice(1), intensity: 'mid', daysPresent: 1, confirmedToday: true }]);
    setDraft('');
  };

  /* review answers */
  const stillThere = (s: Symptom) => {
    setList((p) => [...p, { ...s, daysPresent: s.daysPresent + 1, confirmedToday: true }]);
    setReview((p) => p.filter((r) => r.id !== s.id));
  };
  const resolved = (s: Symptom) => setReview((p) => p.filter((r) => r.id !== s.id));

  useEffect(() => {
    if (phase === 'review' && review.length === 0) setPhase('log');
  }, [review, phase]);

  const save = () => {
    onSave(list);
    setPhase('thinking');
    setTimeout(() => setPhase('analysis'), 2600);
  };

  const advice = useMemo(() => buildAdvice(list), [list]);
  const report = useMemo(() => doctorReport(list), [list]);

  const setIntensity = (id: string, intensity: Intensity) =>
    setList((prev) => prev.map((s) => (s.id === id ? { ...s, intensity } : s)));
  const remove = (id: string) => setList((prev) => prev.filter((s) => s.id !== id));

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          /* the wrapper owns the exit so the overlay always unmounts and never
             blocks clicks on the page behind it */
          exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.2 } }}
          transition={{ duration: 0.2 }}
        >
          {/* backdrop — blur ramps up with the fade so it never pops in */}
          <motion.div
            className="absolute inset-0 bg-ink/35"
            onClick={onClose}
            initial={{ opacity: 0, backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />

          <motion.div
            layout
            role="dialog" aria-modal="true" aria-label="Log symptoms"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass-strong ring-gradient relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-4xl"
          >
            {/* header */}
            <div className="flex items-start justify-between gap-3 px-6 pt-6">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-ink">
                  {phase === 'review' ? 'Still with you?' : phase === 'analysis' ? 'What this could be' : 'How are you feeling?'}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {phase === 'review' ? 'Confirm what you logged before, so we can track how long it lasts.'
                    : phase === 'analysis' ? 'Possible causes and what helps right now.'
                    : 'Speak or type — we’ll turn it into a symptom list.'}
                </p>
              </div>
              <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white/70 text-ink-soft transition-colors hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex-1 overflow-y-auto px-6 pb-2">
              {/* ---------- REVIEW ---------- */}
              {phase === 'review' && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-2.5"
                >
                  <AnimatePresence initial={false} mode="popLayout">
                  {review.map((s) => (
                    <motion.div key={s.id} layout
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -28, scale: 0.94, transition: { duration: 0.22 } }}
                      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                      className="rounded-2xl border border-white/60 bg-white/60 p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
                            {URGENT_LABELS.has(s.name) && <AlertTriangle className="h-3.5 w-3.5 flex-none text-rose-500" />}
                            {s.name}
                          </div>
                          <div className="text-[11px] font-semibold text-ink-muted">
                            Logged {s.daysPresent} day{s.daysPresent > 1 ? 's' : ''} · {INTENSITY_LABEL[s.intensity]}
                          </div>
                        </div>
                        <button onClick={() => resolved(s)} className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-xs font-bold text-ink-soft transition hover:text-ink">
                          It’s gone
                        </button>
                        <button onClick={() => stillThere(s)} className="rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 px-3 py-2 text-xs font-bold text-white shadow-glow">
                          Still there
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* ---------- LOG ---------- */}
              {phase === 'log' && (
                <motion.div
                  key="log"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* AI voice */}
                  <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/50 py-5">
                    <BeamsBackground intensity="medium" count={12} />
                    <div className="relative mx-auto flex w-full flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={listening ? stopVoice : startVoice}
                        disabled={!voiceSupported}
                        className={cn(
                          'group flex h-16 w-16 items-center justify-center rounded-2xl transition-colors',
                          listening ? 'bg-none' : 'hover:bg-brand-500/10',
                          !voiceSupported && 'cursor-not-allowed opacity-40',
                        )}
                      >
                        {listening ? (
                          <div className="h-6 w-6 animate-spin cursor-pointer rounded-sm bg-gradient-to-br from-brand-500 to-brand-700" style={{ animationDuration: '3s' }} />
                        ) : (
                          <Mic className="h-6 w-6 text-ink/80" />
                        )}
                      </button>

                      <span className={cn('font-mono text-sm transition-opacity duration-300', listening ? 'text-ink/70' : 'text-ink/30')}>
                        {fmtTime(seconds)}
                      </span>

                      <div className="flex h-4 w-64 items-center justify-center gap-0.5">
                        {[...Array(48)].map((_, i) => (
                          <div
                            key={i}
                            className={cn('w-0.5 rounded-full transition-all duration-300',
                              listening ? 'animate-pulse bg-brand-600/60' : 'h-1 bg-ink/10')}
                            style={listening ? { height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.05}s` } : undefined}
                          />
                        ))}
                      </div>

                      <p className="h-4 text-xs font-semibold text-ink/70">
                        {listening ? 'Listening…' : voiceSupported ? 'Click to speak' : 'Voice not supported here'}
                      </p>
                    </div>

                    {(transcript || voiceNote) && (
                      <div className="relative mt-3 space-y-2 px-5">
                        {transcript && <div className="rounded-2xl bg-white/70 px-3.5 py-2.5 text-sm italic text-ink-soft">“{transcript}”</div>}
                        {voiceNote && <div className="rounded-2xl bg-brand-500/10 px-3.5 py-2 text-xs font-semibold text-brand-700 ring-1 ring-brand-500/20">{voiceNote}</div>}
                      </div>
                    )}
                    {!transcript && !voiceNote && voiceSupported && (
                      <p className="relative mt-2 px-5 text-center text-[11px] text-ink-faint">Try: “I have a bad headache and mild swelling in my ankles.”</p>
                    )}
                  </div>

                  {/* quick add */}
                  <div className="mt-5">
                    <div className="text-xs font-bold uppercase tracking-wider text-ink-faint">Quick add</div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {COMMON_SYMPTOMS.map((s) => {
                        const active = list.some((l) => l.name === s);
                        return (
                          <button key={s}
                            onClick={() => (active ? setList((p) => p.filter((l) => l.name !== s)) : addSymptoms([{ id: uid(), name: s, intensity: 'mid', daysPresent: 1, confirmedToday: true }]))}
                            className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                              active ? 'border-brand-500/40 bg-brand-500/15 text-brand-700' : 'border-white/60 bg-white/60 text-ink-soft hover:bg-white')}>
                            {active && <Check className="mr-1 inline h-3 w-3" />}{s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* list */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-ink-faint">Your list</div>
                      <span className="text-xs font-semibold text-ink-muted">{list.length} logged</span>
                    </div>

                    <div className="mt-2.5 space-y-2">
                      <AnimatePresence initial={false}>
                        {list.map((s) => (
                          <motion.div key={s.id} layout
                            initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -20, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                            className="rounded-2xl border border-white/60 bg-white/60 px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
                                  {URGENT_LABELS.has(s.name) && <AlertTriangle className="h-3.5 w-3.5 flex-none text-rose-500" />}
                                  <span className="truncate">{s.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
                                  {s.daysPresent > 1 && <span className="text-amber-600">day {s.daysPresent}</span>}
                                  {s.fromVoice && <span className="text-brand-600">from voice</span>}
                                </div>
                              </div>
                              <button onClick={() => remove(s.id)} aria-label={`Remove ${s.name}`}
                                className="grid h-7 w-7 flex-none place-items-center rounded-lg text-ink-faint transition-colors hover:bg-rose-500/10 hover:text-rose-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="mt-2 flex gap-1">
                              {INTENSITIES.map((iv) => (
                                <button key={iv} onClick={() => setIntensity(s.id, iv)}
                                  className={cn('flex-1 rounded-lg px-2 py-1 text-[10px] font-bold ring-1 transition',
                                    s.intensity === iv ? INTENSITY_CLASS[iv] : 'bg-white/50 text-ink-faint ring-transparent hover:text-ink-soft')}>
                                  {INTENSITY_LABEL[iv]}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {list.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-ink/15 px-3 py-6 text-center text-xs font-medium text-ink-faint">
                          Nothing logged yet — speak, quick-add, or write one below.
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <input value={draft} onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addDraft()}
                        placeholder="Write a symptom…"
                        className="h-11 flex-1 rounded-2xl border border-white/60 bg-white/70 px-4 text-sm font-medium text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" />
                      <button onClick={addDraft} disabled={!draft.trim()} aria-label="Add symptom to list"
                        className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow transition disabled:opacity-40">
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
                    This log helps you and your care team spot patterns — it is not a diagnosis.
                  </p>
                </motion.div>
              )}

              {/* ---------- THINKING ---------- */}
              {phase === 'thinking' && (
                <motion.div
                  key="thinking"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="py-10"
                >
                  <AITextLoading texts={['Reading your symptoms…', 'Checking how long they’ve lasted…', 'Matching likely causes…', 'Preparing relief steps…']} />
                  <div className="mx-auto mt-2 flex max-w-xs flex-col gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} className="h-2.5 rounded-full bg-ink/[0.06]"
                        initial={{ opacity: 0.3 }} animate={{ opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ---------- ANALYSIS ---------- */}
              {phase === 'analysis' && (
                <motion.div
                  key="analysis"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-3"
                >
                  {advice.length === 0 && (
                    <div className={cn('rounded-2xl px-4 py-3 text-sm font-semibold ring-1', TONE_CLASS.good)}>
                      Nothing logged — nothing to analyse. That’s good news.
                    </div>
                  )}

                  {advice.map((a) => (
                    <motion.div key={a.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                      className="overflow-hidden rounded-2xl border border-white/60 bg-white/60">
                      <div className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-bold ring-1', TONE_CLASS[a.tone])}>
                        {a.urgent && <AlertTriangle className="h-4 w-4 flex-none" />}
                        {a.name}
                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wide opacity-80">
                          day {a.daysPresent} · {a.stage}
                        </span>
                      </div>

                      <div className="px-4 py-3">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Possible causes</div>
                        <ul className="mt-1.5 space-y-1">
                          {a.causes.map((c) => (
                            <li key={c} className="flex gap-2 text-[12px] leading-relaxed text-ink-soft">
                              <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-ink-faint" />{c}
                            </li>
                          ))}
                        </ul>

                        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-600">
                          <Lightbulb className="h-3.5 w-3.5" /> What helps right now
                        </div>
                        <ul className="mt-1.5 space-y-1">
                          {a.relief.map((r) => (
                            <li key={r} className="flex gap-2 text-[12px] leading-relaxed text-ink-soft">
                              <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-brand-500" />{r}
                            </li>
                          ))}
                        </ul>

                        <div className={cn('mt-3 rounded-xl px-3 py-2 text-[11px] font-semibold leading-relaxed ring-1', TONE_CLASS[a.tone])}>
                          {a.stageNote}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* doctor report */}
                  {advice.length > 0 && (
                    <div className={cn('rounded-2xl px-4 py-3 ring-1', TONE_CLASS[report.tone])}>
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <Stethoscope className="h-4 w-4" /> For your care team — {report.headline}
                      </div>
                      <ul className="mt-2 space-y-1">
                        {report.lines.map((l) => (
                          <li key={l} className="flex gap-2 text-[11px] font-medium leading-relaxed opacity-90">
                            <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-current" />{l}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="pt-1 text-[11px] leading-relaxed text-ink-faint">
                    General pregnancy guidance based on what you logged — not a diagnosis. If something feels wrong,
                    contact your doctor.
                  </p>
                </motion.div>
              )}
            </div>

            {/* footer */}
            <div className="flex items-center justify-between gap-2 border-t border-white/50 px-6 py-4">
              {phase === 'analysis' ? (
                <>
                  <LiquidButton variant="ghost" onClick={() => setPhase('log')} icon={<ChevronLeft className="h-4 w-4" />}>Edit list</LiquidButton>
                  <LiquidButton onClick={onClose} iconRight={<ArrowRight className="h-[18px] w-[18px]" />}>Done</LiquidButton>
                </>
              ) : phase === 'thinking' ? (
                <span className="w-full text-center text-xs font-semibold text-ink-faint">Analysing your entry…</span>
              ) : phase === 'review' ? (
                <>
                  <LiquidButton variant="ghost" onClick={onClose}>Cancel</LiquidButton>
                  <LiquidButton variant="glass" onClick={() => { setReview([]); setPhase('log'); }}>Skip review</LiquidButton>
                </>
              ) : (
                <>
                  <LiquidButton variant="ghost" onClick={onClose}>Cancel</LiquidButton>
                  <LiquidButton onClick={save} icon={<Check className="h-[18px] w-[18px]" />}>
                    Save {list.length ? `(${list.length})` : ''}
                  </LiquidButton>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

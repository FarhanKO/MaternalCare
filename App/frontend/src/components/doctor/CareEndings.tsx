import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, LogOut, MessageSquareQuote, UserMinus } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Reveal } from '@/components/ui/Reveal';
import { ReasonDialog } from '@/components/ui/ReasonDialog';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { prettyDate, type CareEndingSummary, type CareReason } from '@/data/care';
import type { Patient } from '@/data/doctor';

/**
 * Who has left this clinician, why, and the control to end it from their side.
 *
 * The counts are the reason this screen exists. One patient leaving tells a
 * doctor nothing — people move house. Four in a month all saying the replies
 * took too long is a fact about their practice, and it is the only feedback of
 * that kind anyone in this app will ever give them, because nobody says it to
 * a doctor's face.
 *
 * The written notes are shown in full rather than summarised. A count tells
 * them what is happening; the sentence somebody typed tells them why.
 */
export function CareEndings({
  doctorId, patients, onChanged,
}: {
  doctorId: string | null;
  patients: Patient[];
  onChanged?: () => void;
}) {
  const [summary, setSummary] = useState<CareEndingSummary | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>('loading');
  const [reasons, setReasons] = useState<CareReason[]>([]);
  const [discharging, setDischarging] = useState<Patient | null>(null);

  const load = useCallback(async () => {
    if (!doctorId) return;
    try {
      const s = await api.getDoctorCareEndings(doctorId);
      setSummary(s);
      setState('ready');
    } catch {
      setState('offline');
    }
  }, [doctorId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.getEndingReasons('doctor')
      .then((r) => setReasons(r.options))
      .catch(() => setReasons([]));
  }, []);

  const ended = new Set(
    (summary?.endings ?? []).filter((e) => e.active).map((e) => e.userId),
  );
  const onList = patients.filter((p) => !ended.has(p.id));

  return (
    <div className="mt-9">
      <Reveal className="mb-4">
        <h2 className="text-lg font-extrabold tracking-tight text-ink">Ending care</h2>
        <p className="text-sm text-ink-muted">
          Why patients have left, and how to discharge someone from your list. Both sides can
          end an arrangement; both have to say why.
        </p>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        {/* what it costs you, and what they said */}
        <Reveal>
          <GlassCard className="h-full p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/12 text-rose-600">
                <MessageSquareQuote className="h-[18px] w-[18px]" />
              </span>
              <div>
                <div className="text-sm font-bold text-ink">What patients said</div>
                <div className="text-xs text-ink-muted">In their own words</div>
              </div>
            </div>

            {state === 'loading' && (
              <p className="py-8 text-center text-[12px] font-semibold text-ink-faint">Loading…</p>
            )}
            {state === 'offline' && (
              <p className="py-8 text-center text-[12px] font-semibold text-ink-muted">
                Not reachable right now.
              </p>
            )}

            {summary && (
              <>
                <div className="mt-4 flex gap-4">
                  <div>
                    <div className="text-2xl font-extrabold text-ink">{summary.leftByPatients}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                      left you
                    </div>
                  </div>
                  <span className="w-px self-stretch bg-ink/10" />
                  <div>
                    <div className="text-2xl font-extrabold text-ink">{summary.endedByYou}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                      you discharged
                    </div>
                  </div>
                </div>

                {/* counted, because a list of twelve is not a signal */}
                {summary.topReasons.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {summary.topReasons.map((r) => (
                      <div key={r.label}>
                        <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
                          <span className="font-bold text-ink-soft">{r.label}</span>
                          <span className="font-bold text-ink">{r.count}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                          <motion.div
                            className="h-full rounded-full bg-rose-500/70"
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(r.count / Math.max(1, summary.leftByPatients)) * 100}%`,
                            }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {summary.endings.length === 0 && (
                    <p className="py-6 text-center text-[12px] font-semibold text-ink-muted">
                      Nobody has ended their care with you.
                    </p>
                  )}
                  {summary.endings.map((e) => (
                    <div key={e.id} className="rounded-2xl border border-white/60 bg-white/60 p-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[12px] font-extrabold text-ink">
                          {e.patientName ?? 'A patient'}
                        </span>
                        <span className={cn(
                          'rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                          e.endedBy === 'mother'
                            ? 'bg-rose-500/12 text-rose-700'
                            : 'bg-ink/[0.06] text-ink-muted',
                        )}
                        >
                          {e.endedBy === 'mother' ? 'they left' : 'you discharged'}
                        </span>
                        {!e.active && (
                          <span className="rounded-full bg-emerald-500/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                            back since
                          </span>
                        )}
                        <span className="ml-auto text-[10px] font-semibold text-ink-faint">
                          {prettyDate(String(e.at).slice(0, 10))}
                        </span>
                      </div>
                      <div className="mt-1 text-[11.5px] font-bold text-ink-soft">
                        {e.reasonLabel}
                      </div>
                      {e.note && (
                        <p className="mt-1 text-[11.5px] italic leading-relaxed text-ink-muted">
                          “{e.note}”
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </GlassCard>
        </Reveal>

        {/* discharging from this side */}
        <Reveal>
          <GlassCard className="h-full p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink/[0.06] text-ink-soft">
                <UserMinus className="h-[18px] w-[18px]" />
              </span>
              <div>
                <div className="text-sm font-bold text-ink">Discharge a patient</div>
                <div className="text-xs text-ink-muted">
                  {onList.length} on your list
                </div>
              </div>
            </div>

            <p className="mt-3 rounded-2xl bg-amber-500/10 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-ink-soft ring-1 ring-amber-500/20">
              This cancels every appointment they still have with you and closes any messaging
              they have paid for. They are told your reason in your own words, so write it as
              though they are reading it — because they are.
            </p>

            <div className="mt-4 space-y-1.5">
              {onList.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 rounded-2xl border border-white/60 bg-white/60 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-bold text-ink">{p.name}</div>
                    <div className="truncate text-[11px] font-semibold text-ink-muted">
                      Week {p.week} · {p.risk}
                    </div>
                  </div>
                  <button
                    onClick={() => setDischarging(p)}
                    className="inline-flex flex-none items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-ink-faint transition hover:bg-rose-500/10 hover:text-rose-600"
                  >
                    <LogOut className="h-3.5 w-3.5" /> End care
                  </button>
                </div>
              ))}

              {ended.size > 0 && (
                <p className="pt-2 text-[11px] font-semibold text-ink-faint">
                  {ended.size} more {ended.size === 1 ? 'is' : 'are'} already discharged and
                  no longer on your list.
                </p>
              )}
            </div>
          </GlassCard>
        </Reveal>
      </div>

      <ReasonDialog
        open={Boolean(discharging)}
        title={`End care with ${discharging?.name ?? 'this patient'}?`}
        intro="They come off your list, their remaining appointments with you are cancelled, and any messaging they paid for is closed."
        options={reasons}
        noteRequired
        notePrompt="Your reason, in your words"
        confirmLabel="End care"
        footnote={(
          <span className="inline-flex items-start gap-1.5">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-none" />
            If their care is going to somebody else, say who — it is the difference between
            being handed on and being dropped.
          </span>
        )}
        onClose={() => setDischarging(null)}
        onConfirm={async (reason, note) => {
          if (!discharging || !doctorId) return;
          await api.endCareWithPatient(doctorId, discharging.id, { reason, note });
          await load();
          onChanged?.();
        }}
      />
    </div>
  );
}

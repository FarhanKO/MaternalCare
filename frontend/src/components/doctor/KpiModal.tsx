import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Clock, ShieldAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ALERTS, RISK_META, TODAY_SLOTS, type Patient } from '@/data/doctor';

export type KpiKey = 'caseload' | 'high-risk' | 'today' | 'alerts';

const initialsOf = (name: string) =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('');

/**
 * The detail behind one of the four numbers on the clinician's overview.
 *
 * Every count on that row was previously a dead end — you could see that four
 * mothers were high risk without being able to ask which four. Each card now
 * opens the list it is counting.
 */
export function KpiModal({
  which, roster, onClose, onOpenPatient,
}: {
  which: KpiKey | null;
  roster: Patient[];
  onClose: () => void;
  /** jump straight into a patient's record from the list */
  onOpenPatient?: (patient: Patient) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && which && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [which, onClose]);

  if (typeof document === 'undefined') return null;

  const highRisk = roster.filter((p) => p.risk === 'high');

  const TITLES: Record<KpiKey, { title: string; sub: string }> = {
    caseload: { title: 'Under your care', sub: `${roster.length} active pregnancies` },
    'high-risk': { title: 'High risk', sub: `${highRisk.length} needing close follow-up` },
    today: {
      title: 'Today’s appointments',
      sub: `${TODAY_SLOTS.length} booked · ${TODAY_SLOTS.filter((s) => !s.done).length} still to see`,
    },
    alerts: {
      title: 'Open alerts',
      sub: `${ALERTS.length} open · ${ALERTS.filter((a) => a.severity === 'critical').length} critical`,
    },
  };

  const meta = which ? TITLES[which] : null;

  /** One row per patient, shared by the caseload and high-risk lists. */
  const patientRow = (p: Patient) => (
    <button
      key={p.id}
      onClick={() => { onOpenPatient?.(p); onClose(); }}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/60 bg-white/60 px-3.5 py-3 text-left transition hover:bg-white"
    >
      <span className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-gradient-to-br from-peach-400 to-peach-600 text-[11px] font-extrabold text-white">
        {initialsOf(p.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-ink">{p.name}</span>
        <span className="block truncate text-[11px] font-semibold text-ink-muted">
          Week {p.week} · {p.conditions.join(', ') || 'No flags recorded'}
        </span>
      </span>
      <span className={cn(
        'flex-none rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1',
        RISK_META[p.risk].ring,
      )}>
        {RISK_META[p.risk].label}
      </span>
    </button>
  );

  return createPortal(
    <AnimatePresence>
      {which && meta && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.2 } }}
        >
          <motion.div
            className="absolute inset-0 bg-ink/35 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={meta.title}
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass-strong ring-gradient relative flex max-h-[82vh] w-full max-w-md flex-col overflow-hidden rounded-4xl shadow-float"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/60 px-5 py-4">
              <div>
                <div className="text-base font-extrabold tracking-tight text-ink">{meta.title}</div>
                <div className="text-[11.5px] font-semibold text-ink-muted">{meta.sub}</div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white/70 text-ink-soft transition hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
              {which === 'caseload' && (
                roster.length
                  ? roster.map(patientRow)
                  : <Empty>No mothers on your list yet.</Empty>
              )}

              {which === 'high-risk' && (
                highRisk.length
                  ? highRisk.map(patientRow)
                  : <Empty>Nobody is flagged high risk today.</Empty>
              )}

              {which === 'today' && (
                TODAY_SLOTS.length
                  ? TODAY_SLOTS.map((s) => (
                    <div
                      key={`${s.time}-${s.patient}`}
                      className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/60 px-3.5 py-3"
                    >
                      <span className={cn(
                        'grid h-10 w-10 flex-none place-items-center rounded-2xl text-[11px] font-extrabold',
                        s.done ? 'bg-emerald-500/12 text-emerald-700' : 'bg-aqua-400/15 text-aqua-600',
                      )}>
                        {s.done ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold text-ink">{s.patient}</div>
                        <div className="truncate text-[11px] font-semibold text-ink-muted">{s.reason}</div>
                      </div>
                      <div className="flex-none text-right">
                        <div className="text-[13px] font-extrabold tabular-nums text-ink">{s.time}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                          {s.done ? 'seen' : 'waiting'}
                        </div>
                      </div>
                    </div>
                  ))
                  : <Empty>No appointments booked for today.</Empty>
              )}

              {which === 'alerts' && (
                ALERTS.length
                  ? ALERTS.map((a) => (
                    <div
                      key={a.id}
                      className={cn(
                        'rounded-2xl px-3.5 py-3 ring-1',
                        a.severity === 'critical'
                          ? 'bg-rose-500/10 ring-rose-500/25'
                          : 'bg-amber-500/10 ring-amber-500/25',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldAlert className={cn('h-4 w-4 flex-none',
                          a.severity === 'critical' ? 'text-rose-600' : 'text-amber-600')} />
                        <span className="text-[13px] font-extrabold text-ink">{a.patient}</span>
                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                          {a.ago} ago
                        </span>
                      </div>
                      <div className="mt-1 text-[12px] font-bold text-ink-soft">{a.title}</div>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-muted">{a.detail}</p>
                    </div>
                  ))
                  : <Empty>Nothing open right now.</Empty>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/12 px-4 py-8 text-center text-[12px] font-semibold text-ink-muted">
      {children}
    </div>
  );
}

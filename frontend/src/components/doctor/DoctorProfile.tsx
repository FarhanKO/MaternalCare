import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BellRing, CalendarDays, ChevronRight, ClipboardList, LogOut, ShieldAlert, Users, X,
} from 'lucide-react';
import { TODAY_SLOTS } from '@/data/doctor';
import { api } from '@/lib/api';

const MENU = [
  { icon: ClipboardList, label: 'Caseload settings', hint: 'Capacity and referral rules' },
  { icon: BellRing, label: 'Alert thresholds', hint: 'When you are notified' },
  { icon: ShieldAlert, label: 'Privacy & audit log', hint: 'Who accessed which record' },
];

/** Clinician counterpart to the mother's profile panel — peach themed. */
export function DoctorProfile({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [counts, setCounts] = useState({ total: 0, high: 0 });

  useEffect(() => {
    if (!open) return;
    api.getPatients()
      .then((p) => setCounts({ total: p.length, high: p.filter((x) => x.risk === 'high').length }))
      .catch(() => { /* offline — leave the counts at zero */ });
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && open && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const stats = [
    { l: 'Patients', v: `${counts.total}`, i: Users },
    { l: 'High risk', v: `${counts.high}`, i: ShieldAlert },
    { l: 'Today', v: `${TODAY_SLOTS.length}`, i: CalendarDays },
  ];

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
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
            role="dialog"
            aria-modal="true"
            aria-label="Your clinician profile"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass-strong ring-gradient relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-4xl shadow-float"
          >
            <div
              className="relative h-28 flex-none overflow-hidden"
              style={{ background: 'linear-gradient(140deg, #ff9159 0%, #fb7534 52%, #ea5c1d 100%)' }}
            >
              <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/25 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 left-6 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
              <button
                onClick={onClose}
                aria-label="Close profile"
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-white/30 bg-white/20 text-white backdrop-blur-md transition hover:bg-white/30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* relative + z-10 so the avatar sits above the positioned cover */}
            <div className="relative z-10 flex-none px-6">
              <div className="-mt-12 flex flex-col items-center text-center">
                <motion.span
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.1 }}
                  className="grid h-24 w-24 place-items-center rounded-3xl border-[3px] border-white bg-gradient-to-br from-peach-400 to-peach-600 text-2xl font-extrabold text-white shadow-[0_10px_30px_-8px_rgba(234,92,29,0.55)]"
                >
                  LO
                </motion.span>
                <div className="mt-3 text-xl font-extrabold leading-tight tracking-tight text-ink">Dr. Lena Ortiz</div>
                <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
                  <span className="rounded-full bg-peach-500/15 px-2 py-0.5 text-[10px] font-bold text-peach-700">Obstetrician</span>
                  <span className="text-[11px] font-semibold text-ink-muted">MaternalCare+ Clinic · Room 204</span>
                </div>
                <p className="mt-3 w-full rounded-2xl bg-white/50 px-3.5 py-2.5 text-[12px] font-medium italic leading-relaxed text-ink-soft">
                  Fifteen years in maternal medicine. Special interest in hypertensive disorders of pregnancy.
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="mt-5 grid grid-cols-3 gap-2">
                {stats.map((s, i) => (
                  <motion.div
                    key={s.l}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + i * 0.05, duration: 0.35 }}
                    className="rounded-2xl border border-white/60 bg-white/55 py-3 text-center"
                  >
                    <s.i className="mx-auto h-3.5 w-3.5 text-ink-faint" />
                    <div className="mt-1 text-sm font-extrabold leading-none text-ink">{s.v}</div>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink-faint">{s.l}</div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-5 space-y-1.5">
                {MENU.map((m) => (
                  <button
                    key={m.label}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/60 bg-white/55 px-3 py-2.5 text-left transition hover:bg-white"
                  >
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-peach-500/12 text-peach-600">
                      <m.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-ink">{m.label}</div>
                      <div className="text-[11px] font-medium text-ink-muted">{m.hint}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-none text-ink-faint" />
                  </button>
                ))}
              </div>

              <button
                onClick={onClose}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-300/70 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-500/15 hover:text-rose-700"
              >
                <LogOut className="h-[18px] w-[18px]" /> Sign out
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

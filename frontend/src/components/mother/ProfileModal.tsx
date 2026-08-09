import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Baby, Bell, CalendarDays, ChevronRight, Droplet, HeartPulse, LogOut, Pencil, Ruler,
  ShieldCheck, Sparkles, Stethoscope, X,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface CareMember { name: string; role: string; initials: string; tint: string }

interface Props {
  open: boolean;
  onClose: () => void;
  name: string;
  week: number;
  dueDate: string;
  bloodGroup: string;
  age: number;
  score: number;
  band: { label: string; tone: string };
}

const CARE_TEAM: CareMember[] = [
  { name: 'Dr. Lena Ortiz', role: 'Obstetrician', initials: 'LO', tint: '#3f66f0' },
  { name: 'Sister Amina', role: 'Midwife', initials: 'SA', tint: '#2fbf9b' },
];

const MENU = [
  { icon: Pencil, label: 'Edit profile', hint: 'Name, photo, due date' },
  { icon: Bell, label: 'Notifications', hint: 'Reminders and alerts' },
  { icon: ShieldCheck, label: 'Privacy & data', hint: 'Who can see your records' },
];

export function ProfileModal({
  open, onClose, name, week, dueDate, bloodGroup, age, score, band,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && open && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  const facts = [
    { icon: Baby, label: 'Week', value: `${week}` },
    { icon: CalendarDays, label: 'Due', value: dueDate },
    { icon: Droplet, label: 'Blood', value: bloodGroup },
    { icon: Ruler, label: 'Age', value: `${age}` },
  ];

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.2 } }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-ink/35"
            onClick={onClose}
            initial={{ backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)' }}
            animate={{ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Your profile"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="glass-strong ring-gradient relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-4xl shadow-float"
          >
            {/* cover */}
            <div
              className="relative h-28 flex-none overflow-hidden"
              style={{ background: 'linear-gradient(140deg, #ff9db9 0%, #f76592 48%, #7a9dff 100%)' }}
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

            {/* avatar + identity — outside the scroll area so the overlap isn't clipped */}
            <div className="flex-none px-6">
              <div className="-mt-11">
                <motion.span
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.1 }}
                  className="grid h-[76px] w-[76px] flex-none place-items-center rounded-3xl border-[3px] border-white bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-extrabold text-white shadow-glow"
                >
                  {initials}
                </motion.span>
                <div className="mt-3">
                  <div className="text-xl font-extrabold leading-tight tracking-tight text-ink">{name}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-rose-500/12 px-2 py-0.5 text-[10px] font-bold text-rose-600">Mother</span>
                    <span className="text-[11px] font-semibold text-ink-muted">Week {week} · second trimester</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {/* wellbeing */}
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/60 bg-white/55 p-3.5">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-xl" style={{ background: `${band.tone}1f`, color: band.tone }}>
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Today’s wellbeing</span>
                    <span className="text-sm font-extrabold" style={{ color: band.tone }}>{band.label}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: band.tone }}
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                    />
                  </div>
                </div>
                <span className="text-xl font-extrabold tabular-nums text-ink">{score}</span>
              </div>

              {/* facts */}
              <div className="mt-3 grid grid-cols-4 gap-2">
                {facts.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + i * 0.05, duration: 0.35 }}
                    className="rounded-2xl border border-white/60 bg-white/55 py-3 text-center"
                  >
                    <f.icon className="mx-auto h-3.5 w-3.5 text-ink-faint" />
                    <div className="mt-1 text-sm font-extrabold leading-none text-ink">{f.value}</div>
                    <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink-faint">{f.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* care team */}
              <div className="mt-5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Your care team</div>
                <div className="mt-2.5 space-y-2">
                  {CARE_TEAM.map((m) => (
                    <div key={m.name} className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/55 px-3 py-2.5">
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: m.tint }}>
                        {m.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold text-ink">{m.name}</div>
                        <div className="text-[11px] font-medium text-ink-muted">{m.role}</div>
                      </div>
                      <button
                        aria-label={`Message ${m.name}`}
                        className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-white/70 text-ink-soft transition hover:text-ink"
                      >
                        <Stethoscope className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* menu */}
              <div className="mt-5 space-y-1.5">
                {MENU.map((m) => (
                  <button
                    key={m.label}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/60 bg-white/55 px-3 py-2.5 text-left transition hover:bg-white"
                  >
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-brand-500/10 text-brand-600">
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

              {/* emergency + sign out */}
              <div className="mt-5 flex items-center gap-2">
                <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_30px_-8px_rgba(225,29,72,0.5)] transition hover:brightness-105">
                  <HeartPulse className="h-[18px] w-[18px]" /> Emergency SOS
                </button>
                <button
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/60 bg-white/60 px-4 py-3 text-sm font-bold text-ink-soft transition hover:bg-white hover:text-ink"
                >
                  <LogOut className="h-[18px] w-[18px]" /> Sign out
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

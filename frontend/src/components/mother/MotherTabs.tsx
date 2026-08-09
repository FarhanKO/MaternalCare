import { motion } from 'framer-motion';
import { Activity, CalendarClock, LayoutDashboard, Users } from 'lucide-react';
import { cn } from '@/lib/cn';

export type MotherTab = 'dashboard' | 'vitals' | 'reminders' | 'community';

export const MOTHER_TABS: { key: MotherTab; label: string; icon: any; hint: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Today at a glance' },
  { key: 'vitals', label: 'Vitals', icon: Activity, hint: 'Trends & measurements' },
  { key: 'reminders', label: 'Reminders', icon: CalendarClock, hint: 'Appointments & symptoms' },
  { key: 'community', label: 'Community', icon: Users, hint: 'Mothers & midwives' },
];

interface Props {
  active: MotherTab;
  onChange: (tab: MotherTab) => void;
  /** small count badges, e.g. { reminders: 5 } */
  badges?: Partial<Record<MotherTab, number>>;
}

/**
 * Segmented navigation for the mother dashboard — mirrors the top navbar's
 * glass pill styling, with a sliding indicator that follows the active tab.
 */
export function MotherTabs({ active, onChange, badges }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 sm:bottom-7">
      <motion.div
        initial={{ y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.15 }}
        className="pointer-events-auto flex w-full max-w-xl items-center gap-1 rounded-2xl glass-strong p-1.5 shadow-float"
      >
        {MOTHER_TABS.map((t) => {
          const isActive = active === t.key;
          const count = badges?.[t.key];
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              aria-current={isActive ? 'page' : undefined}
              title={t.hint}
              className={cn(
                'relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200',
                isActive ? 'text-white' : 'text-ink-soft hover:text-ink',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="motherTabPill"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow"
                />
              )}
              <t.icon className="h-4 w-4 flex-none" />
              <span className="hidden sm:inline">{t.label}</span>
              {count != null && count > 0 && (
                <span className={cn(
                  'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                  isActive ? 'bg-white/25 text-white' : 'bg-brand-500/12 text-brand-700',
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}

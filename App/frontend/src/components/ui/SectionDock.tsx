import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export interface DockItem<T extends string> {
  key: T;
  label: string;
  icon: any;
  hint: string;
}

interface Props<T extends string> {
  items: DockItem<T>[];
  active: T;
  onChange: (key: T) => void;
  badges?: Partial<Record<T, number>>;
  /** gradient used for the active pill */
  accent?: 'brand' | 'peach';
  /** unique per dock instance so two docks never share a layout animation */
  layoutId?: string;
}

const ACCENT = {
  brand: 'from-brand-500 to-brand-700',
  peach: 'from-peach-400 to-peach-600',
};

const BADGE = {
  brand: 'bg-brand-500/12 text-brand-700',
  peach: 'bg-peach-500/15 text-peach-700',
};

/**
 * Floating, bottom-centred section switcher shared by the mother and
 * clinician portals. Mirrors the navbar's glass pill styling with a
 * sliding indicator that follows the active section.
 */
export function SectionDock<T extends string>({
  items, active, onChange, badges, accent = 'brand', layoutId = 'sectionDockPill',
}: Props<T>) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 sm:bottom-7">
      <motion.div
        initial={{ y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.15 }}
        // wide enough for five tabs; the buttons below shrink rather than
        // spill out of the pill if a dock ever grows past that
        className="pointer-events-auto flex w-full max-w-2xl items-center gap-1 rounded-2xl glass-strong p-1.5 shadow-float"
      >
        {items.map((t) => {
          const isActive = active === t.key;
          const count = badges?.[t.key];
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              aria-current={isActive ? 'page' : undefined}
              title={t.hint}
              className={cn(
                // min-w-0 lets flex-1 actually shrink — without it the buttons
                // keep their content width and overflow the rounded container
                'relative flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-2.5 py-2.5 text-sm font-semibold transition-colors duration-200',
                isActive ? 'text-white' : 'text-ink-soft hover:text-ink',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId={layoutId}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className={cn('absolute inset-0 -z-10 rounded-xl bg-gradient-to-br shadow-glow', ACCENT[accent])}
                />
              )}
              <t.icon className="h-4 w-4 flex-none" />
              <span className="hidden truncate sm:inline">{t.label}</span>
              {count != null && count > 0 && (
                <span className={cn(
                  'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                  isActive ? 'bg-white/25 text-white' : BADGE[accent],
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

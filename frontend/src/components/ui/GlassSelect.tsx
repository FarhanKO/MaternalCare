import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACCENT, type Accent } from './FloatingInput';

interface GlassSelectProps {
  label: string;
  options: string[];
  value?: string;
  onChange: (v: string) => void;
  icon?: ReactNode;
  accent?: Accent;
}

/**
 * Custom select with a frosted "glass plate" options panel that pops/slides
 * down on open and up on close. Rendered in a portal so it is never clipped by
 * an ancestor's overflow. Replaces the un-animatable native <select>.
 */
export function GlassSelect({ label, options, value, onChange, icon, accent = 'brand' }: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const a = ACCENT[accent];
  const openRing = accent === 'peach' ? 'border-peach-500 ring-4 ring-peach-500/15' : 'border-brand-500 ring-4 ring-brand-500/15';
  const selBg = accent === 'peach' ? 'bg-peach-500' : 'bg-brand-500';

  useEffect(() => {
    if (!open) return;
    const update = () => triggerRef.current && setRect(triggerRef.current.getBoundingClientRect());
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  return (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-ink-faint">{icon}</span>}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-14 w-full items-center rounded-2xl border bg-white/70 pt-4 text-left text-[15px] font-medium text-ink outline-none transition-all',
          open ? cn('bg-white', openRing) : 'border-ink/10 hover:border-ink/20',
          icon ? 'pl-11 pr-10' : 'px-4 pr-10',
        )}
      >
        <span className="truncate">{value || ''}</span>
      </button>
      <label className={cn('pointer-events-none absolute top-2 text-xs font-semibold', a.label, icon ? 'left-11' : 'left-4')}>
        {label}
      </label>
      <ChevronDown
        className={cn('pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint transition-transform duration-200', open && 'rotate-180')}
      />

      {createPortal(
        <AnimatePresence>
          {open && rect && (
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'fixed', left: rect.left, top: rect.bottom + 8, width: rect.width, transformOrigin: 'top' }}
                className="z-[100] max-h-60 overflow-auto rounded-2xl border border-white/60 bg-white/70 p-1.5 shadow-glass backdrop-blur-2xl"
              >
                {options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => {
                      onChange(o);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors',
                      value === o ? cn('text-white', selBg) : 'text-ink-soft hover:bg-white/80',
                    )}
                  >
                    {o}
                    {value === o && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

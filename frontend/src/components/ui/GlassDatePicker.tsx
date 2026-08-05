import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACCENT, type Accent } from './FloatingInput';

const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const fmt = (v?: string) =>
  v ? new Date(v + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const PANEL_W = 300;

interface Props {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  icon?: ReactNode;
  accent?: Accent;
}

/**
 * Custom date picker with a frosted "glass plate" calendar that pops/slides
 * down on open and up on close. Portalled so it is never clipped by an
 * ancestor's overflow. Replaces the un-styleable native date input.
 */
export function GlassDatePicker({ label, value, onChange, icon, accent = 'brand' }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => (value ? new Date(value + 'T00:00:00') : new Date()));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const a = ACCENT[accent];
  const openRing = accent === 'peach' ? 'border-peach-500 ring-4 ring-peach-500/15' : 'border-brand-500 ring-4 ring-brand-500/15';
  const selBg = accent === 'peach' ? 'bg-peach-500 text-white' : 'bg-brand-500 text-white';
  const ring = accent === 'peach' ? 'ring-peach-300' : 'ring-brand-300';

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

  const y = view.getFullYear();
  const m = view.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const shift = (dm: number, dy: number) => setView(new Date(y + dy, m + dm, 1));
  const today = new Date();

  const left = rect ? Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_W - 8)) : 0;

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
          icon ? 'pl-11 pr-4' : 'px-4',
        )}
      >
        <span className="truncate">{fmt(value)}</span>
      </button>
      <label className={cn('pointer-events-none absolute top-2 text-xs font-semibold', a.label, icon ? 'left-11' : 'left-4')}>
        {label}
      </label>

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
                style={{ position: 'fixed', left, top: rect.bottom + 8, width: PANEL_W, transformOrigin: 'top' }}
                className="z-[100] rounded-2xl border border-white/60 bg-white/70 p-3 shadow-glass backdrop-blur-2xl"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex gap-0.5">
                    <button type="button" onClick={() => shift(0, -1)} aria-label="Previous year" className="grid h-7 w-7 place-items-center rounded-lg text-ink-muted hover:bg-white/80">
                      <ChevronsLeft className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => shift(-1, 0)} aria-label="Previous month" className="grid h-7 w-7 place-items-center rounded-lg text-ink-muted hover:bg-white/80">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-ink">{view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  <div className="flex gap-0.5">
                    <button type="button" onClick={() => shift(1, 0)} aria-label="Next month" className="grid h-7 w-7 place-items-center rounded-lg text-ink-muted hover:bg-white/80">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => shift(0, 1)} aria-label="Next year" className="grid h-7 w-7 place-items-center rounded-lg text-ink-muted hover:bg-white/80">
                      <ChevronsRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink-faint">
                  {WD.map((w) => (
                    <div key={w} className="py-1">
                      {w}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((d, i) => {
                    if (d === null) return <div key={i} />;
                    const dISO = iso(y, m, d);
                    const isSel = value === dISO;
                    const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          onChange(dISO);
                          setOpen(false);
                        }}
                        className={cn(
                          'grid h-9 w-full place-items-center rounded-lg text-[13px] font-semibold transition-colors',
                          isSel ? selBg : cn('text-ink-soft hover:bg-white/80', isToday && `ring-1 ring-inset ${ring}`),
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buildNotes, TONE_STYLE, type NoteAction, type NoteSources } from '@/lib/notifications';

/**
 * The bell, and everything it has to say.
 *
 * Two things had to be got right. The panel is rendered into a portal rather
 * than beside the button, because the greeting it sits in keeps a
 * `filter: blur(0px)` from its reveal animation — that is a stacking context,
 * so a z-index set inside it could never rise above the cards further down
 * the page, and the panel was being painted under the charts.
 *
 * And it is opaque. Frosted glass is right for a card resting on the page; it
 * is wrong for a panel you have to read a blood pressure warning off.
 */

interface Props extends NoteSources {
  /** open whatever a notification points at */
  onAction: (action: NoteAction) => void;
}

const GAP = 10;
const WIDTH = 340;
/** smallest gap we will leave between the panel and the screen edge */
const EDGE = 12;

export function NotificationBell({ onAction, ...sources }: Props) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<{ top: number; left: number; width: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);

  const notes = buildNotes(sources);
  const worst = notes[0]?.tone;

  /**
    * Anchor the panel under the bell, in viewport coordinates, then clamp it
    * inside the screen — on a narrow viewport the header wraps and the bell
    * can end up near the left edge, which right-aligning alone pushes the
    * panel off-screen.
    */
  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(WIDTH, window.innerWidth - 2 * EDGE);
    const wanted = r.right - width;                       // right edges aligned
    const left = Math.min(Math.max(EDGE, wanted), window.innerWidth - width - EDGE);
    setAt({ top: r.bottom + GAP, left, width });
  }, []);

  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btn.current?.contains(t)) return;
      if ((t as HTMLElement).closest?.('[data-notif-panel]')) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  const dotColour = worst === 'critical' ? 'bg-rose-500'
    : worst === 'warn' ? 'bg-amber-500' : 'bg-brand-500';

  return (
    <>
      <button
        ref={btn}
        onClick={() => setOpen((o) => !o)}
        aria-label={notes.length ? `Notifications — ${notes.length} waiting` : 'Notifications'}
        aria-expanded={open}
        className="relative grid h-11 w-11 place-items-center rounded-2xl glass-strong text-ink-soft transition-colors hover:text-ink"
      >
        <Bell className="h-5 w-5" />
        {notes.length > 0 && (
          <>
            <span className={cn(
              'absolute right-1.5 top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-extrabold leading-none text-white shadow-soft',
              dotColour,
            )}>
              {notes.length}
            </span>
            {worst === 'critical' && (
              <span className="absolute right-1.5 top-1.5 h-[18px] w-[18px] animate-ping rounded-full bg-rose-500/40" />
            )}
          </>
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && at && (
            <motion.div
              data-notif-panel
              role="dialog"
              aria-label="Notifications"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.14 } }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              style={{
                position: 'fixed',
                top: at.top,
                left: at.left,
                width: at.width,
                transformOrigin: 'top right',
              }}
              className="z-[140] overflow-hidden rounded-3xl border border-white/70 bg-surface-raised shadow-float"
            >
              <div className="flex items-center justify-between border-b border-ink/[0.07] px-4 py-3">
                <span className="text-[13px] font-extrabold tracking-tight text-ink">Notifications</span>
                {notes.length > 0 && (
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                    TONE_STYLE[worst ?? 'info'].chip)}>
                    {notes.length} waiting
                  </span>
                )}
              </div>

              <div className="max-h-[min(26rem,60vh)] divide-y divide-ink/[0.06] overflow-y-auto">
                {notes.length === 0 ? (
                  <div className="flex items-center gap-3 px-4 py-6">
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-emerald-500/12 text-emerald-600">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                    <div>
                      <div className="text-[13px] font-extrabold text-ink">You’re all caught up</div>
                      <div className="mt-0.5 text-[11.5px] font-medium text-ink-muted">
                        Nothing needs you right now.
                      </div>
                    </div>
                  </div>
                ) : notes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { setOpen(false); if (n.action) onAction(n.action); }}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-brand-50/70"
                  >
                    <span className={cn('grid h-9 w-9 flex-none place-items-center rounded-xl',
                      TONE_STYLE[n.tone].icon)}>
                      <n.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 text-[13px] font-extrabold leading-snug text-ink">
                          {n.title}
                        </span>
                        {n.meta && (
                          <span className="flex-none text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                            {n.meta}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-[11.5px] font-medium leading-relaxed text-ink-muted">
                        {n.body}
                      </span>
                    </span>
                    {n.action && <ChevronRight className="mt-1 h-4 w-4 flex-none text-ink-faint" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Baby, Check, ChevronDown, HeartPulse, Loader2, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import type { DemoAccount } from '@/data/records';

/**
 * Switching which mother the app is signed in as.
 *
 * This exists because there is no authentication yet, and it is labelled as a
 * demo control everywhere it appears so it cannot be mistaken for one. When
 * real sessions land, this component is deleted rather than adapted.
 *
 * It is here at all because four of this app's screens — the dashboard hero,
 * the care plan, the vitals guidance and the daily check-in — branch on a
 * woman's life stage, and until now the only way to see three of those four
 * was to edit the database by hand or POST to an endpoint with curl. A
 * feature nobody can reach is indistinguishable from one that does not work.
 */

const STAGE = {
  pregnant: { label: 'Pregnant', icon: HeartPulse, tint: '#f76592' },
  planning: { label: 'Planning', icon: Sparkles, tint: '#7c5cf0' },
  'new-mother': { label: 'New mother', icon: Baby, tint: '#2fbf9b' },
  parent: { label: 'Parent', icon: Users, tint: '#fb7534' },
  general: { label: 'General', icon: HeartPulse, tint: '#3f66f0' },
} as const;

export function AccountSwitcher() {
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api.getAccounts().then(setAccounts).catch(() => setAccounts([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const active = accounts.find((a) => a.active);

  const choose = async (id: string) => {
    setBusy(id);
    try {
      await api.useAccount(id);
      /*
       * A full reload rather than refetching in place. Switching account
       * changes her stage, her pregnancy, her child and every panel built on
       * them; reloading is both simpler and more honest about the fact that
       * this is standing in for signing in as somebody else.
       */
      window.location.reload();
    } catch {
      setBusy(null);
      load();
    }
  };

  if (accounts.length === 0) return null;

  /* the seeded stage accounts first — they are what this control is for */
  const ordered = [...accounts].sort((a, b) => {
    const rank = (s: string) => (s === 'pregnant' ? 1 : 0);
    return rank(a.stage) - rank(b.stage);
  });

  const meta = STAGE[(active?.stage ?? 'pregnant') as keyof typeof STAGE] ?? STAGE.pregnant;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Switch demo account"
        className="inline-flex items-center gap-1.5 rounded-xl border border-white/60 bg-white/60 px-2.5 py-1.5 text-[11px] font-bold text-ink-soft transition hover:bg-white hover:text-ink"
      >
        <span
          className="grid h-4 w-4 flex-none place-items-center rounded-full text-[8px] font-extrabold text-white"
          style={{ background: meta.tint }}
        >
          {active?.name?.[0] ?? '?'}
        </span>
        <span className="hidden sm:inline">{active?.name?.split(' ')[0] ?? 'Account'}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            role="listbox"
            className="absolute right-0 z-50 mt-1.5 max-h-[70vh] w-72 overflow-y-auto rounded-2xl border border-white/70 bg-surface-raised p-1.5 shadow-float"
          >
            <div className="px-2.5 py-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                View as
              </div>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-muted">
                A demo control. It stands in for signing in, and goes away when
                authentication arrives.
              </p>
            </div>

            {ordered.map((a) => {
              const s = STAGE[a.stage as keyof typeof STAGE] ?? STAGE.general;
              return (
                <button
                  key={a.id}
                  role="option"
                  aria-selected={a.active}
                  onClick={() => !a.active && choose(a.id)}
                  disabled={busy !== null}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition disabled:opacity-60',
                    a.active ? 'bg-brand-500/10' : 'hover:bg-white/70',
                  )}
                >
                  <span
                    className="grid h-8 w-8 flex-none place-items-center rounded-xl text-[11px] font-extrabold text-white"
                    style={{ background: s.tint }}
                  >
                    {a.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold text-ink">{a.name}</span>
                    <span className="flex items-center gap-1 text-[10.5px] font-semibold text-ink-faint">
                      <s.icon className="h-3 w-3" style={{ color: s.tint }} />
                      {s.label}
                      {a.conditions && <span className="truncate">· {a.conditions}</span>}
                    </span>
                  </span>
                  {busy === a.id
                    ? <Loader2 className="h-4 w-4 flex-none animate-spin text-ink-faint" />
                    : a.active && <Check className="h-4 w-4 flex-none text-brand-600" strokeWidth={3} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

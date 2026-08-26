import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Mail, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import type { AuthUser } from '@/data/records';

/**
 * Who is signed in, and the way out.
 *
 * Replaces a demo account switcher that let anyone become anyone with a
 * click — which was honest about being a stand-in for authentication, and is
 * now simply wrong, because there is authentication. Changing account means
 * signing out and signing in as somebody else, the way it will in production.
 */
export function AccountMenu({ user }: { user: AuthUser }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  const signOut = async () => {
    setBusy(true);
    try {
      await api.logout();
    } finally {
      // a hard navigation, so nothing of hers is left in memory afterwards
      window.location.assign('/signin');
    }
  };

  const initials = user.name.split(' ').map((w) => w[0]).join('').slice(0, 2);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Your account"
        className="inline-flex items-center gap-1.5 rounded-xl border border-white/60 bg-white/60 px-2 py-1.5 text-[11px] font-bold text-ink-soft transition hover:bg-white hover:text-ink"
      >
        <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[9px] font-extrabold text-white">
          {initials}
        </span>
        <span className="hidden sm:inline">{user.name.split(' ')[0]}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="absolute right-0 z-50 mt-1.5 w-60 overflow-hidden rounded-2xl border border-white/70 bg-surface-raised p-1.5 shadow-float"
          >
            <div className="flex items-center gap-2.5 px-2.5 py-2">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-[12px] font-extrabold text-white">
                {initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold text-ink">{user.name}</span>
                <span className="flex items-center gap-1 truncate text-[10.5px] font-semibold text-ink-faint">
                  <Mail className="h-3 w-3 flex-none" /> {user.email}
                </span>
              </span>
            </div>

            <button
              onClick={() => { setOpen(false); navigate('/mother?tab=dashboard'); }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-bold text-ink-soft transition hover:bg-white/70 hover:text-ink"
            >
              <User className="h-4 w-4" /> Your profile
            </button>

            <button
              onClick={signOut}
              disabled={busy}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-bold text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" /> {busy ? 'Signing out…' : 'Sign out'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

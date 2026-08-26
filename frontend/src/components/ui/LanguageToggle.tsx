import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Check, Globe, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { coverage, LANGUAGES, useT, type Lang } from '@/i18n';

/**
 * Switching between English and Bangla.
 *
 * Each language is named in itself — বাংলা, not "Bangla" — because somebody
 * looking for their own language is scanning for the shape of their own
 * script, and asking them to read the name of their language in a language
 * they may not read is the exact problem this feature exists to remove.
 *
 * It also states how complete the translation is. Bangla does not cover every
 * screen yet, and a mother who switches and then hits an English page should
 * have been told that would happen rather than concluding the app is broken.
 */
export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t, saving } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const current = LANGUAGES.find((l) => l.code === lang)!;

  const choose = (code: Lang) => {
    setLang(code);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('lang.choose')}
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-xl border border-white/60 bg-white/60 font-bold text-ink-soft transition hover:bg-white hover:text-ink',
          compact ? 'px-2 py-1.5 text-[11px]' : 'px-3 py-2 text-[12px]',
        )}
      >
        {saving
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Globe className="h-3.5 w-3.5" />}
        {current.label}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            role="listbox"
            className="absolute right-0 z-50 mt-1.5 w-60 overflow-hidden rounded-2xl border border-white/70 bg-surface-raised p-1.5 shadow-float"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-faint">
              {t('lang.choose')}
            </div>

            {LANGUAGES.map((l) => {
              const done = coverage(l.code);
              return (
                <button
                  key={l.code}
                  role="option"
                  aria-selected={lang === l.code}
                  onClick={() => choose(l.code)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition',
                    lang === l.code ? 'bg-brand-500/10' : 'hover:bg-white/70',
                  )}
                >
                  <span className={cn('grid h-4 w-4 flex-none place-items-center rounded-full border-2',
                    lang === l.code ? 'border-brand-500 bg-brand-500' : 'border-ink/20')}
                  >
                    {lang === l.code && <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-ink">{l.label}</span>
                    <span className="block text-[10.5px] font-semibold text-ink-faint">
                      {l.english}
                      {done < 100 && ` · ${done}%`}
                    </span>
                  </span>
                </button>
              );
            })}

            {/* said before she switches, not after she falls out of it */}
            {coverage('bn') < 100 && (
              <p className="mt-1 border-t border-white/60 px-2.5 pb-1 pt-2 text-[10.5px] leading-relaxed text-ink-muted">
                {t('lang.partial')}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

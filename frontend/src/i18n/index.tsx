import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';
import { en } from '@/i18n/en';
import { bn } from '@/i18n/bn';

/**
 * Translation.
 *
 * Hand-rolled rather than react-i18next, and the reason is the shape of this
 * app's problem rather than a dislike of the library. Almost none of what a
 * mother reads here is a static UI string: her care plan, her risk assessment
 * and her reminders are sentences composed on the server out of her own
 * readings. A client-side translation library would only ever reach the chrome
 * around them, so the interesting half of the work — the Bangla string tables
 * in guidanceModel and riskModel — sits on the server either way. What is left
 * on this side is small enough that a dictionary, a hook and an interpolator
 * do the job without a dependency.
 *
 * Two rules the implementation is built around:
 *
 *   A missing key renders the English, not the key. A screen that says
 *   `careplan.targets.title` to a mother is worse than one that says
 *   "Daily targets" in the wrong language, and in development it warns so the
 *   gap gets found before she does.
 *
 *   The language lives on her account, not only in this browser. She may open
 *   this on a borrowed phone; the app should not greet her in English because
 *   of it.
 */

export type Lang = 'en' | 'bn';

export const LANGUAGES: { code: Lang; label: string; english: string }[] = [
  { code: 'en', label: 'English', english: 'English' },
  { code: 'bn', label: 'বাংলা', english: 'Bangla' },
];

const DICT = { en, bn } as const;

/** Keys are whatever English defines; every other language is a partial of it. */
export type TKey = keyof typeof en;

/** `{name}` and `{count}` style holes, filled from a plain object. */
type Vars = Record<string, string | number>;

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key) => (
    key in vars ? String(vars[key]) : whole
  ));
}

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Vars) => string;
  /** Intl locale, for dates and numbers */
  locale: string;
  /** true while the change is being saved to her account */
  saving: boolean;
}

const LanguageContext = createContext<Ctx | null>(null);

const STORAGE_KEY = 'maternalcare.lang';

/** What to show before her account has answered — her browser's guess. */
function initialLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'bn') return stored;
  return navigator.language?.toLowerCase().startsWith('bn') ? 'bn' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [saving, setSaving] = useState(false);

  /*
   * Her stored preference wins over the browser's guess, once it arrives.
   * Deliberately not blocking: the app renders immediately in the local guess
   * and corrects itself, rather than holding a white screen on a round trip.
   */
  useEffect(() => {
    let cancelled = false;
    api.getLanguage()
      .then((l) => {
        if (cancelled || (l !== 'en' && l !== 'bn')) return;
        setLangState(l);
        window.localStorage.setItem(STORAGE_KEY, l);
      })
      .catch(() => { /* offline — the local choice stands */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    // switch first, persist after: the interface should not wait on a server
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    setSaving(true);
    api.setLanguage(next)
      .catch(() => { /* it is still right in this browser */ })
      .finally(() => setSaving(false));
  }, []);

  const t = useCallback((key: TKey, vars?: Vars) => {
    const table = DICT[lang] as Partial<Record<TKey, string>>;
    const value = table[key];

    if (value === undefined) {
      if (import.meta.env.DEV && lang !== 'en') {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] no ${lang} for "${key}" — showing English`);
      }
      return interpolate(en[key], vars);
    }
    return interpolate(value, vars);
  }, [lang]);

  const value = useMemo<Ctx>(() => ({
    lang,
    setLang,
    t,
    locale: lang === 'bn' ? 'bn-BD' : 'en-GB',
    saving,
  }), [lang, setLang, t, saving]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useT must be used inside <LanguageProvider>');
  return ctx;
}

/**
 * How complete each language is.
 *
 * Exported so the language picker can say so rather than implying every screen
 * is translated. Claiming completeness a mother then falls out of is worse
 * than telling her where the edge is.
 */
export function coverage(lang: Lang): number {
  const total = Object.keys(en).length;
  if (lang === 'en') return 100;
  const done = Object.keys(DICT[lang]).filter((k) => (DICT[lang] as Record<string, string>)[k]).length;
  return Math.round((done / total) * 100);
}

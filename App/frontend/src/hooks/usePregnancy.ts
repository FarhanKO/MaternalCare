import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Pregnancy } from '@/data/records';

/**
 * Where she is in the pregnancy, from her record.
 *
 * The dashboard used to hardcode `week={26}` in five places while the model
 * was deriving 29 from her LMP, so the whole "this week" story — the arc, the
 * progress ring, the baby's size, the reading list — was frozen on a week she
 * had already passed. Everything that mentions a week now reads this.
 *
 * `null` means either no pregnancy on the account or an unreachable API; the
 * caller shows nothing week-specific rather than inventing a number.
 */
export function usePregnancy(): { pregnancy: Pregnancy | null; loaded: boolean } {
  const [pregnancy, setPregnancy] = useState<Pregnancy | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getPregnancy()
      .then((p) => { if (!cancelled) { setPregnancy(p); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  return { pregnancy, loaded };
}

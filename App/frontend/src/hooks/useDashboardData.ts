import { useCallback, useEffect, useState } from 'react';
import { api, type ApiStatus } from '@/lib/api';
import type { Symptom } from '@/data/symptoms';
import { seedReminders, type Reminder } from '@/data/reminders';

const SYMPTOM_FALLBACK: Symptom[] = [
  { id: 'seed-1', name: 'Back ache', intensity: 'mid', daysPresent: 5 },
  { id: 'seed-2', name: 'Heartburn', intensity: 'mild', daysPresent: 1 },
];

/**
 * Loads the dashboard's persisted state from the Express API and keeps it in
 * sync. If the API is unreachable the UI still works from local seed data, so
 * the front end can be demonstrated on its own.
 */
export function useDashboardData() {
  const [status, setStatus] = useState<ApiStatus>('loading');
  const [symptoms, setSymptoms] = useState<Symptom[]>(SYMPTOM_FALLBACK);
  const [reminders, setReminders] = useState<Reminder[]>(() => seedReminders());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [s, r] = await Promise.all([api.getSymptoms(), api.getReminders()]);
        if (cancelled) return;
        // First run: push the seed data up so the DB is never empty on a demo.
        if (s.length === 0) await api.saveSymptoms(SYMPTOM_FALLBACK);
        else setSymptoms(s);
        if (r.length === 0) {
          const seeded = seedReminders();
          for (const rem of seeded) {
            const { id, ...body } = rem;
            await api.createReminder(body);
          }
          const fresh = await api.getReminders();
          if (!cancelled) setReminders(fresh);
        } else {
          setReminders(r);
        }
        if (!cancelled) setStatus('online');
      } catch {
        // Backend not running — keep local seed data.
        if (!cancelled) setStatus('offline');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  /** Persist the symptom journal (called when the logger saves). */
  const saveSymptoms = useCallback(async (list: Symptom[]) => {
    setSymptoms(list); // optimistic
    try {
      const saved = await api.saveSymptoms(list);
      setSymptoms(saved);
    } catch {
      setStatus('offline');
    }
  }, []);

  /** Ends the entry so the next visit asks whether each symptom is still there. */
  const endSymptomEntry = useCallback(async () => {
    setSymptoms((prev) => prev.map((s) => ({ ...s, confirmedToday: false })));
    try {
      await api.endSymptomEntry();
    } catch {
      setStatus('offline');
    }
  }, []);

  /** Add or remove reminders, mirroring the change to the server. */
  const changeReminders = useCallback(async (next: Reminder[], previous: Reminder[]) => {
    setReminders(next); // optimistic
    try {
      const added = next.filter((n) => !previous.some((p) => p.id === n.id));
      const removed = previous.filter((p) => !next.some((n) => n.id === p.id));
      for (const rem of removed) await api.deleteReminder(rem.id);
      for (const add of added) {
        const { id, ...body } = add;
        await api.createReminder(body);
      }
      setReminders(await api.getReminders());
    } catch {
      setStatus('offline');
    }
  }, []);

  return { status, symptoms, reminders, saveSymptoms, endSymptomEntry, changeReminders };
}

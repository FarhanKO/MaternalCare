/**
 * API client — talks to the Express MVC backend (routes/api.js).
 * The React app is a View layer; all persistence and domain rules live in
 * the server's Model layer.
 */
import type { Symptom } from '@/data/symptoms';
import type { Reminder } from '@/data/reminders';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} failed (${res.status})`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

interface Envelope<T> { data: T }

export type LifeStage = 'pregnant' | 'new-mother' | 'parent' | 'planning' | 'general';

export const api = {
  /* the signed-in user */
  getMe: () => request<Envelope<{ user: { name: string; stage: LifeStage } }>>('/me').then((r) => r.data.user),

  setStage: (stage: LifeStage) =>
    request<Envelope<{ stage: LifeStage }>>('/me', {
      method: 'PATCH',
      body: JSON.stringify({ stage }),
    }).then((r) => r.data),

  /* symptoms */
  getSymptoms: () => request<Envelope<Symptom[]>>('/symptoms').then((r) => r.data),

  saveSymptoms: (symptoms: Symptom[]) =>
    request<Envelope<Symptom[]>>('/symptoms', {
      method: 'PUT',
      body: JSON.stringify({ symptoms }),
    }).then((r) => r.data),

  /** Ends the entry so the next visit asks "still there?" for each symptom. */
  endSymptomEntry: () =>
    request<Envelope<Symptom[]>>('/symptoms/end-entry', { method: 'POST' }).then((r) => r.data),

  /* reminders */
  getReminders: () => request<Envelope<Reminder[]>>('/reminders').then((r) => r.data),

  createReminder: (reminder: Omit<Reminder, 'id'> & { assignedBy?: string }) =>
    request<Envelope<Reminder>>('/reminders', {
      method: 'POST',
      body: JSON.stringify(reminder),
    }).then((r) => r.data),

  deleteReminder: (id: string) =>
    request<void>(`/reminders/${id}`, { method: 'DELETE' }),
};

export type ApiStatus = 'loading' | 'online' | 'offline';

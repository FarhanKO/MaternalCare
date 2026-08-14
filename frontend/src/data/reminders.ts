export type ReminderKind = 'medicine' | 'doctor' | 'test' | 'exercise' | 'vaccination';

export interface Reminder {
  id: string;
  kind: ReminderKind;
  title: string;
  note?: string;
  /** ISO timestamp of when it is due */
  at: string;
  repeat?: 'once' | 'daily' | 'weekly';
  /** set when a clinician scheduled this for her */
  assignedBy?: string;
}

export const KIND_LABEL: Record<ReminderKind, string> = {
  medicine: 'Medicine',
  doctor: 'Doctor appointment',
  test: 'Test',
  exercise: 'Exercise',
  vaccination: 'Vaccination',
};

export const KIND_SHORT: Record<ReminderKind, string> = {
  medicine: 'Medicine', doctor: 'Doctor', test: 'Test', exercise: 'Exercise', vaccination: 'Vaccine',
};

export const KIND_COLOR: Record<ReminderKind, string> = {
  medicine: '#8b7bf3',
  doctor: '#3f66f0',
  test: '#22b8c4',
  exercise: '#2fbf9b',
  vaccination: '#f6b93b',
};

export const KIND_ORDER: ReminderKind[] = ['doctor', 'test', 'medicine', 'exercise', 'vaccination'];

/** Suggested titles offered when a kind is chosen. */
export const KIND_SUGGESTIONS: Record<ReminderKind, string[]> = {
  medicine: ['Prenatal vitamin', 'Iron tablet', 'Folic acid', 'Calcium'],
  doctor: ['Midwife check-up', 'Growth scan', 'Consultant review', 'Anti-D injection'],
  test: ['Glucose screening', 'Blood test', 'Urine sample', 'Ultrasound'],
  exercise: ['Prenatal yoga', 'Walk 20 minutes', 'Pelvic floor exercises', 'Swimming'],
  vaccination: ['Whooping cough (Tdap)', 'Flu vaccine', 'Anti-D injection', 'COVID booster'],
};

const pad = (n: number) => String(n).padStart(2, '0');

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function formatTime(d: Date) {
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatDay(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "in 3 days", "in 2 hours", "now", "overdue" */
export function countdown(at: string, from = new Date()) {
  const t = new Date(at).getTime() - from.getTime();
  if (t < -60_000) return { text: 'overdue', overdue: true, ms: t };
  if (t < 60_000) return { text: 'now', overdue: false, ms: t };
  const mins = Math.round(t / 60_000);
  if (mins < 60) return { text: `in ${mins} min`, overdue: false, ms: t };
  const hours = Math.round(mins / 60);
  if (hours < 24) return { text: `in ${hours} hour${hours > 1 ? 's' : ''}`, overdue: false, ms: t };
  const days = Math.round(hours / 24);
  if (days < 7) return { text: `in ${days} day${days > 1 ? 's' : ''}`, overdue: false, ms: t };
  const weeks = Math.round(days / 7);
  return { text: `in ${weeks} week${weeks > 1 ? 's' : ''}`, overdue: false, ms: t };
}

/** Soonest first — what the dashboard card surfaces. */
export const bySoonest = (a: Reminder, b: Reminder) =>
  new Date(a.at).getTime() - new Date(b.at).getTime();

export function upcoming(list: Reminder[], from = new Date()) {
  const cutoff = from.getTime() - 60 * 60 * 1000; // keep the last hour visible
  return list.filter((r) => new Date(r.at).getTime() >= cutoff).sort(bySoonest);
}

/** Seed a few realistic entries relative to today so the card is never empty. */
export function seedReminders(now = new Date()): Reminder[] {
  const at = (dayOffset: number, h: number, m = 0) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, h, m);
    return d.toISOString();
  };
  return [
    { id: 'r1', kind: 'medicine', title: 'Prenatal vitamin', note: 'With breakfast', at: at(0, 21, 0), repeat: 'daily' },
    { id: 'r2', kind: 'medicine', title: 'Iron tablet', note: 'Take with orange juice', at: at(1, 8, 30), repeat: 'daily' },
    { id: 'r3', kind: 'doctor', title: 'Growth ultrasound', note: 'Dr. Lena Ortiz · Room 204', at: at(3, 10, 15) },
    { id: 'r4', kind: 'test', title: 'Glucose screening', note: 'Fast for 8 hours before', at: at(9, 9, 0) },
    { id: 'r5', kind: 'exercise', title: 'Prenatal yoga', note: 'Community centre', at: at(2, 18, 0), repeat: 'weekly' },
    { id: 'r6', kind: 'exercise', title: 'Walk 20 minutes', note: 'After dinner', at: at(0, 19, 30), repeat: 'daily' },
    { id: 'r7', kind: 'vaccination', title: 'Whooping cough (Tdap)', note: 'Protects baby in their first weeks', at: at(12, 11, 0) },
    { id: 'r8', kind: 'medicine', title: 'Calcium', note: 'With lunch', at: at(0, 13, 0), repeat: 'daily' },
  ];
}

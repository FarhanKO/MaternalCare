import {
  Activity, BellRing, CalendarClock, ClipboardList, RefreshCw, Siren,
  type LucideIcon,
} from 'lucide-react';
import type { Reminder } from '@/data/reminders';
import type { Symptom } from '@/data/symptoms';
import type { VitalAlert } from '@/data/records';
import { countdown } from '@/data/reminders';
import type { CheckInStatus } from '@/lib/checkin';
import { nudgeText } from '@/lib/checkin';

/**
 * Everything the bell has to say, in one ranked list.
 *
 * Built from what the dashboard has already loaded — no extra requests. The
 * ordering is the point: a blood pressure over the safe limit must not sit
 * below a reminder to drink water, so each source declares a tone and the
 * list sorts on it.
 */

export type Tone = 'critical' | 'warn' | 'info';

/** What pressing a notification should open. The page owns the handlers. */
export type NoteAction = 'sos' | 'checkin' | 'symptoms' | 'reminders';

export interface Note {
  id: string;
  tone: Tone;
  icon: LucideIcon;
  title: string;
  body: string;
  action?: NoteAction;
  /** short right-aligned label — a time, a count */
  meta?: string;
}

const RANK: Record<Tone, number> = { critical: 0, warn: 1, info: 2 };

/** vitalModel emits emergency / critical / warning. */
const toneForVital = (level: string): Tone =>
  (level === 'emergency' || level === 'critical' ? 'critical' : 'warn');

export interface NoteSources {
  /** an SOS alert is currently open */
  sosActive: boolean;
  /** threshold breaches on her latest reading */
  vitalAlerts: VitalAlert[];
  /** symptoms carried over from a previous day, not yet confirmed today */
  pendingSymptoms: Symptom[];
  /** upcoming reminders, soonest first */
  reminders: Reminder[];
  checkIn: CheckInStatus;
}

export function buildNotes(sources: NoteSources): Note[] {
  // the bell renders on first paint, before any of these have loaded — a
  // missing source must degrade to "nothing to say", never to a crash that
  // takes the whole dashboard down with it
  const sosActive = sources.sosActive ?? false;
  const vitalAlerts = sources.vitalAlerts ?? [];
  const pendingSymptoms = sources.pendingSymptoms ?? [];
  const reminders = sources.reminders ?? [];
  const checkIn = sources.checkIn;

  const notes: Note[] = [];

  if (sosActive) {
    notes.push({
      id: 'sos',
      tone: 'critical',
      icon: Siren,
      title: 'Your emergency alert is still open',
      body: 'Your guardians and your care team have been told. Stand it down here once you are safe.',
      action: 'sos',
    });
  }

  for (const [i, a] of vitalAlerts.entries()) {
    notes.push({
      id: `vital-${i}`,
      tone: toneForVital(a.level),
      icon: Activity,
      title: `${a.metric} — ${a.value}`,
      body: a.message ?? 'This reading is outside the usual range.',
      action: 'checkin',
    });
  }

  // overdue first, then the next two coming up
  const overdue = reminders.filter((r) => countdown(r.at).overdue);
  const soon = reminders.filter((r) => !countdown(r.at).overdue).slice(0, 2);

  for (const r of overdue) {
    notes.push({
      id: `late-${r.id}`,
      tone: 'warn',
      icon: CalendarClock,
      title: r.title,
      body: 'This was due and has not been marked done.',
      action: 'reminders',
      meta: countdown(r.at).text,
    });
  }

  if (pendingSymptoms.length) {
    const names = pendingSymptoms.map((s) => s.name);
    notes.push({
      id: 'symptoms',
      tone: 'info',
      icon: RefreshCw,
      title: 'Are these still with you?',
      body: `${names.slice(0, 3).join(', ')}${names.length > 3 ? ` and ${names.length - 3} more` : ''} — carried over from yesterday.`,
      action: 'symptoms',
      meta: `${names.length}`,
    });
  }

  const nudge = checkIn ? nudgeText(checkIn) : null;
  if (nudge) {
    notes.push({
      id: 'checkin',
      tone: checkIn.daysSinceLog >= 2 ? 'warn' : 'info',
      icon: ClipboardList,
      title: nudge.title,
      body: nudge.body,
      action: 'checkin',
      meta: `${checkIn.total - checkIn.done}`,
    });
  }

  for (const r of soon) {
    notes.push({
      id: `soon-${r.id}`,
      tone: 'info',
      icon: BellRing,
      title: r.title,
      body: 'Coming up — tap to see the rest of your reminders.',
      action: 'reminders',
      meta: countdown(r.at).text,
    });
  }

  return notes.sort((a, b) => RANK[a.tone] - RANK[b.tone]);
}

export const TONE_STYLE: Record<Tone, { chip: string; icon: string }> = {
  critical: { chip: 'bg-rose-500/12 text-rose-700', icon: 'bg-rose-500/12 text-rose-600' },
  warn: { chip: 'bg-amber-500/15 text-amber-700', icon: 'bg-amber-500/15 text-amber-600' },
  info: { chip: 'bg-brand-500/10 text-brand-700', icon: 'bg-brand-500/12 text-brand-600' },
};

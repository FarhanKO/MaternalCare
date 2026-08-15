/** Shapes returned by the care endpoints (doctors + appointment requests). */

export type DoctorStatus = 'open' | 'busy' | 'full' | 'away';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  qualification: string;
  years: number;
  rating: number;
  distanceKm: number;
  /** patients currently on their list */
  panel: number;
  capacity: number;
  openings: number;
  /** unanswered requests already sitting with them */
  queue: number;
  /** 0–1 */
  load: number;
  status: DoctorStatus;
  /** false when on leave or the list is full */
  bookable: boolean;
}

export interface RankedDoctor extends Doctor {
  /** 0 = right specialty and free, 1 = free but different specialty, 2 = cannot take her */
  tier: 0 | 1 | 2;
  relevant: boolean;
  score: number;
  breakdown: { qualification: number; availability: number; rating: number; distance: number };
  /** plain-language why, shown on the card */
  reasons: string[];
}

export type AppointmentStatus =
  | 'requested' | 'accepted' | 'declined' | 'cancelled' | 'completed';

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  hospital: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
  /** the doctor's message when they answered */
  note?: string;
  requestedAt?: string;
  respondedAt?: string;
  /** how many unanswered requests sit ahead of hers */
  queuePosition: number;
  waitingDays: number;
}

export interface SlotOffer { date: string; time: string }

/* ------------------------------------------------------------- messaging */

export interface Message {
  id: string;
  doctorId: string;
  patientId: string;
  sender: 'mother' | 'doctor';
  body: string;
  sentAt: string;
  /** true once the other side has opened the thread */
  read: boolean;
}

/** A doctor the mother is entitled to write to. */
export interface CareTeamMember {
  doctorId: string;
  doctorName: string;
  specialty: string;
  hospital: string;
  qualification: string;
  unread: number;
}

export interface MotherThread {
  doctorId: string;
  doctorName: string;
  specialty: string;
  hospital: string;
  lastMessage: Message | null;
  total: number;
  unread: number;
}

export interface DoctorThread {
  patientId: string;
  patientName: string;
  lastMessage: Message | null;
  total: number;
  unread: number;
}

/* --------------------------------------------- prescriptions & reports */

export type DocumentKind = 'prescription' | 'report';

export interface CareDocument {
  id: string;
  patientId: string;
  kind: DocumentKind;
  title: string;
  note?: string;
  originalName?: string;
  mime: string;
  size: number;
  /** the date the document is about, not when it was uploaded */
  takenOn: string;
  uploadedAt: string;
  uploadedBy: string;
  /** path on the API host where the bytes live */
  url: string;
}

export const DOC_META: Record<DocumentKind, { label: string; plural: string; hint: string }> = {
  prescription: {
    label: 'Prescription', plural: 'Prescriptions',
    hint: 'What you were prescribed and when',
  },
  report: {
    label: 'Report', plural: 'Reports',
    hint: 'Blood work, scans and test results',
  },
};

export interface DayGroup { day: string; label: string; items: CareDocument[] }
export interface MonthGroup { key: string; label: string; days: DayGroup[]; count: number }
export interface YearGroup { year: string; months: MonthGroup[]; count: number }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Group documents into year → month → day, newest first at every level.
 * This is how a paper file reads, and it is the only way a long history
 * stays navigable.
 */
export function groupByDate(docs: CareDocument[]): YearGroup[] {
  const years = new Map<string, Map<string, Map<string, CareDocument[]>>>();

  for (const d of [...docs].sort((a, b) => b.takenOn.localeCompare(a.takenOn))) {
    const [y, m] = d.takenOn.split('-');
    if (!years.has(y)) years.set(y, new Map());
    const months = years.get(y)!;
    if (!months.has(m)) months.set(m, new Map());
    const days = months.get(m)!;
    if (!days.has(d.takenOn)) days.set(d.takenOn, []);
    days.get(d.takenOn)!.push(d);
  }

  return [...years.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, months]) => {
      const monthGroups: MonthGroup[] = [...months.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([m, days]) => {
          const dayGroups: DayGroup[] = [...days.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([day, items]) => ({ day, label: prettyDate(day), items }));
          return {
            key: `${year}-${m}`,
            label: `${MONTHS[Number(m) - 1]} ${year}`,
            days: dayGroups,
            count: dayGroups.reduce((n, g) => n + g.items.length, 0),
          };
        });
      return {
        year,
        months: monthGroups,
        count: monthGroups.reduce((n, g) => n + g.count, 0),
      };
    });
}

const SIZE_UNITS = ['bytes', 'KB', 'MB'] as const;
export function prettySize(bytes: number) {
  if (!bytes) return '0 bytes';
  const i = Math.min(SIZE_UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${Number.parseFloat((bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1))} ${SIZE_UNITS[i]}`;
}

/** "09:14" today, "Tue 09:14" this week, "12 Aug" beyond that. */
export function messageStamp(isoTs: string) {
  const d = new Date(isoTs);
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const ageDays = (Date.now() - d.getTime()) / 86400000;
  if (d.toDateString() === new Date().toDateString()) return time;
  if (ageDays < 7) return `${d.toLocaleDateString(undefined, { weekday: 'short' })} ${time}`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Thrown by the client when the server refuses a request it can explain. */
export class RequestRefused extends Error {
  code: 'SLOT_TAKEN' | 'NOT_BOOKABLE';
  alternatives: SlotOffer[];
  constructor(message: string, code: RequestRefused['code'], alternatives: SlotOffer[] = []) {
    super(message);
    this.code = code;
    this.alternatives = alternatives;
  }
}

export const STATUS_META: Record<DoctorStatus, { label: string; tint: string; ring: string }> = {
  open: { label: 'Taking patients', tint: '#2fbf9b', ring: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/25' },
  busy: { label: 'Nearly full', tint: '#f6b93b', ring: 'bg-amber-500/12 text-amber-700 ring-amber-500/25' },
  full: { label: 'List full', tint: '#e5484d', ring: 'bg-rose-500/12 text-rose-700 ring-rose-500/25' },
  away: { label: 'On leave', tint: '#9aa3ba', ring: 'bg-ink/8 text-ink-muted ring-ink/15' },
};

export const APPT_META: Record<AppointmentStatus, { label: string; ring: string }> = {
  requested: { label: 'Waiting for an answer', ring: 'bg-amber-500/12 text-amber-700 ring-amber-500/25' },
  accepted: { label: 'Confirmed', ring: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/25' },
  declined: { label: 'Declined', ring: 'bg-rose-500/12 text-rose-700 ring-rose-500/25' },
  cancelled: { label: 'Cancelled', ring: 'bg-ink/8 text-ink-muted ring-ink/15' },
  completed: { label: 'Seen', ring: 'bg-brand-500/10 text-brand-700 ring-brand-500/20' },
};

/** "Tue 18 Aug" from an ISO date, without pulling in a date library. */
export function prettyDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

/** Server slots are 24h ("14:40"); legacy seed rows are already "02:40 PM". */
export function prettyTime(t: string) {
  if (!/^\d{2}:\d{2}$/.test(t)) return t;
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

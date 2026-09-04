/** Shapes returned by the care endpoints (doctors + appointment requests). */

export type DoctorStatus = 'open' | 'busy' | 'full' | 'away';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  qualification: string;
  years: number;
  /** null until they have been rated — new is not the same as bad */
  rating: number | null;
  /** requests they have already answered, and how long they took on average */
  answered: number;
  replyHours: number | null;
  /** patients currently on their list */
  panel: number;
  capacity: number;
  openings: number;
  /** unanswered requests already sitting with them */
  queue: number;
  /** what one paid visit with them costs, in taka */
  feeBdt: number;
  /** what a month of messaging with them adds on top */
  chatFeeBdt: number;
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
  breakdown: { qualification: number; availability: number; rating: number; response: number };
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
  qualification: string;
  date: string;
  time: string;
  reason: string;
  status: AppointmentStatus;
  /** the doctor's message when they answered */
  note?: string;
  requestedAt?: string;
  respondedAt?: string;
  /** why it was cancelled, and by whom — absent unless it was */
  cancellation?: {
    by: 'mother' | 'doctor';
    reason: string;
    reasonLabel: string;
    note?: string;
    at: string;
  };
  /** how many times it has been moved, and the slot it last came from */
  moves: number;
  movedFrom?: string;
  /** how many unanswered requests sit ahead of hers */
  queuePosition: number;
  waitingDays: number;
  /** present only on appointments bought outright from the booking page */
  payment?: Payment;
  plan?: Plan;
  /** the day her month of messaging runs out, on a chat plan */
  chatUntil?: string;
}

export type PayMethod = 'bkash' | 'nagad' | 'card';

/** The consultation alone, or the consultation plus a month of messaging. */
export type Plan = 'visit' | 'visit-plus-chat';

/** What a message carries. Only a clinician may send 'call-link'. */
export type MessageKind = 'text' | 'image' | 'call-request' | 'call-link';

export interface Payment {
  feeBdt: number;
  method: PayMethod;
  /** the reference the clinic can be asked about */
  reference: string;
  paidAt: string;
}

export const PAY_METHODS: { key: PayMethod; label: string; tint: string }[] = [
  { key: 'bkash', label: 'bKash', tint: '#e2136e' },
  { key: 'nagad', label: 'Nagad', tint: '#ec1c24' },
  { key: 'card', label: 'Card', tint: '#3f66f0' },
];

/** Taka, grouped the way a Bangladeshi clinic writes a fee. */
export const taka = (n: number) => `৳${n.toLocaleString('en-BD')}`;

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
  kind: MessageKind;
  /** path on the API host where a sent photograph lives */
  imageUrl?: string;
}

/** A doctor the mother is entitled to write to. */
export interface CareTeamMember {
  doctorId: string;
  doctorName: string;
  specialty: string;
  qualification: string;
  unread: number;
  /** true while a paid month of messaging with them is still running */
  chatOpen?: boolean;
  chatUntil?: string;
}

export interface MotherThread {
  doctorId: string;
  doctorName: string;
  specialty: string;
  qualification: string;
  lastMessage: Message | null;
  total: number;
  unread: number;
}

/** A confirmed visit about to start, for the clinician's meeting-link nudge. */
export interface UpcomingVisit {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  reason: string;
  /** 'YYYY-MM-DDTHH:mm' in clinic-local time */
  startsAt: string;
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
  /** set when this document is the card evidencing a vaccination dose */
  vaccinationId?: string;
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


/* ------------------------------------------- rescheduling & endings */

/** One move an appointment has been through. */
export interface AppointmentChange {
  id: string;
  movedBy: 'mother' | 'doctor';
  from: { date: string; time: string | null };
  to: { date: string; time: string | null };
  reason?: string;
  at: string;
}

/** A reason offered for cancelling or for ending the arrangement. */
export interface CareReason {
  key: string;
  label: string;
  hint?: string;
}

/** Ending the arrangement between a mother and a clinician. */
export interface CareEnding {
  id: string;
  userId: string;
  doctorId: string;
  patientName?: string;
  doctorName?: string;
  endedBy: 'mother' | 'doctor';
  reason: string;
  reasonLabel: string;
  note?: string;
  at: string;
  resumedAt: string | null;
  /** false once the pair have started again */
  active: boolean;
  /** returned on the ending itself: what it took down with it */
  cancelledAppointments?: number;
  chatClosed?: number;
}

/** What a clinician sees about why patients have left them. */
export interface CareEndingSummary {
  endings: CareEnding[];
  leftByPatients: number;
  endedByYou: number;
  topReasons: { label: string; count: number }[];
}

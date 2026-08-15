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

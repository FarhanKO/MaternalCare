/**
 * API client — talks to the Express MVC backend (routes/api.js).
 * The React app is a View layer; all persistence and domain rules live in
 * the server's Model layer.
 */
import type { Symptom } from '@/data/symptoms';
import type { Reminder } from '@/data/reminders';
import type { Patient } from '@/data/doctor';
import {
  RequestRefused, type Appointment, type CareDocument, type CareTeamMember,
  type DocumentKind, type DoctorThread, type Message, type MotherThread,
  type PayMethod, type RankedDoctor, type SlotOffer,
} from '@/data/care';
import type { Guardian, SosAlert } from '@/data/sos';
import type {
  ChildState, DailyLogState, Milestone, Pregnancy, ServerPost, ServerProfile,
  Vaccination, VaccinationStats, VitalAlert, VitalReading, WeightGain,
} from '@/data/records';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

/** Absolute URL for a document's bytes — the API host is a different origin in dev. */
export const fileUrl = (path: string) => `${BASE.replace(/\/api$/, '')}${path}`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    // the server explains itself ("That is not a dialable number"); showing
    // "PATCH /sos/emergency-number failed (400)" instead helps nobody
    let message = `${init?.method ?? 'GET'} ${path} failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* not JSON — keep the generic message */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

interface Envelope<T> { data: T }

export type LifeStage = 'pregnant' | 'new-mother' | 'parent' | 'planning' | 'general';

export const api = {
  /* the signed-in user */
  getMe: () => request<Envelope<{ user: { name: string; stage: LifeStage } }>>('/me').then((r) => r.data.user),

  /**
   * Her pregnancy, derived server-side from her LMP. The same endpoint has
   * always carried this; the client used to throw it away, which is why the
   * dashboard was quoting a week number written into the markup by hand.
   */
  getPregnancy: () =>
    request<Envelope<{ pregnancy: Pregnancy | null }>>('/me').then((r) => r.data.pregnancy),

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

  /* clinician: the caseload, each patient a real account */
  getPatients: () => request<Envelope<Patient[]>>('/patients').then((r) => r.data),

  /** Schedule care onto a specific patient's account. */
  assignToPatient: (patientId: string, item: Omit<Reminder, 'id'> & { assignedBy: string }) =>
    request<Envelope<Reminder>>(`/patients/${patientId}/reminders`, {
      method: 'POST',
      body: JSON.stringify(item),
    }).then((r) => r.data),

  /* reminders */
  getReminders: () => request<Envelope<Reminder[]>>('/reminders').then((r) => r.data),

  createReminder: (reminder: Omit<Reminder, 'id'> & { assignedBy?: string }) =>
    request<Envelope<Reminder>>('/reminders', {
      method: 'POST',
      body: JSON.stringify(reminder),
    }).then((r) => r.data),

  deleteReminder: (id: string) =>
    request<void>(`/reminders/${id}`, { method: 'DELETE' }),

  /* ------------------------------------------------ finding a doctor */

  getDoctors: () => request<Envelope<RankedDoctor[]>>('/doctors').then((r) => r.data),

  /** Clinicians ranked for this mother's stage; `bookable` counts who can take her. */
  getRecommendedDoctors: (stage?: string) =>
    request<Envelope<RankedDoctor[]> & { meta: { stage: string; bookable: number } }>(
      `/doctors/recommended${stage ? `?stage=${stage}` : ''}`,
    ).then((r) => ({ doctors: r.data, bookable: r.meta.bookable })),

  getSlots: (doctorId: string, date: string) =>
    request<Envelope<{ date: string; times: string[] }>>(`/doctors/${doctorId}/slots?date=${date}`)
      .then((r) => r.data),

  getAppointments: () =>
    request<Envelope<Appointment[]>>('/appointments').then((r) => r.data),

  /**
   * Ask a doctor for a slot. Throws {@link RequestRefused} when the server can
   * explain the refusal, so the UI can offer the alternatives it sent back
   * instead of showing a dead end.
   */
  async requestAppointment(body: { doctorId: string; date: string; time: string; reason?: string }) {
    const res = await fetch(`${BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 409) {
      throw new RequestRefused(json.error ?? 'That request could not be sent', json.code ?? 'NOT_BOOKABLE',
        (json.alternatives ?? []) as SlotOffer[]);
    }
    if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
    return json.data as Appointment;
  },

  /**
   * Buy a slot outright. Refuses the same way {@link requestAppointment} does,
   * so the booking page can offer the alternatives rather than a dead end.
   *
   * No card details are sent — `method` is the rail the mother chose, and the
   * fee is decided by the server from the clinician.
   */
  async payAndBook(body: {
    doctorId: string; date: string; time: string; reason?: string; method: PayMethod;
  }) {
    const res = await fetch(`${BASE}/appointments/paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 409) {
      throw new RequestRefused(json.error ?? 'That slot could not be booked', json.code ?? 'NOT_BOOKABLE',
        (json.alternatives ?? []) as SlotOffer[]);
    }
    if (!res.ok) throw new Error(json.error ?? `Booking failed (${res.status})`);
    return json.data as Appointment;
  },

  cancelAppointment: (id: string) =>
    request<Envelope<Appointment>>(`/appointments/${id}`, { method: 'DELETE' }).then((r) => r.data),

  /* clinician side of the same conversation */
  getDoctorRequests: (doctorId: string) =>
    request<Envelope<Appointment[]>>(`/doctors/${doctorId}/appointments`).then((r) => r.data),

  respondToRequest: (id: string, status: 'accepted' | 'declined', note?: string) =>
    request<Envelope<Appointment>>(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    }).then((r) => r.data),

  /* ------------------------------------------------------- profile */

  getProfile: () => request<Envelope<ServerProfile>>('/profile').then((r) => r.data),

  /** Send only what changed; the server leaves the rest alone. */
  updateProfile: (patch: Partial<{
    name: string; bio: string; avatar: string | null;
    bloodGroup: string; age: number; stage: string;
  }>) => request<Envelope<ServerProfile>>('/profile', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }).then((r) => r.data),

  /** Weight gain against the range recommended for her starting BMI. */
  getWeightGain: () => request<Envelope<WeightGain | null>>('/weight-gain').then((r) => r.data),

  /* --------------------------------------------------- vitals */

  /** Every stored reading, oldest first, plus the latest and any alerts. */
  getVitals: () =>
    request<Envelope<VitalReading[]> & { meta: { latest: VitalReading | null; alerts: VitalAlert[] } }>(
      '/vitals',
    ).then((r) => ({ readings: r.data, latest: r.meta.latest, alerts: r.meta.alerts })),

  /** Log a reading. Send only the measurements actually taken. */
  addVital: (reading: {
    date?: string; systolic?: number; diastolic?: number;
    sugar?: number; weightKg?: number; tempC?: number;
  }) =>
    request<Envelope<VitalReading>>('/vitals', {
      method: 'POST',
      body: JSON.stringify(reading),
    }).then((r) => r.data),

  /* ------------------------------ mood, kicks, hydration by day */

  getDailyLog: () => request<Envelope<DailyLogState>>('/daily-log').then((r) => r.data),

  saveDailyLog: (patch: { mood?: string; kicks?: number; waterLitres?: number }) =>
    request<Envelope<DailyLogState>>('/daily-log', {
      method: 'PUT',
      body: JSON.stringify(patch),
    }).then((r) => r.data),

  /* ----------------------------------------------------- community */

  getPosts: (opts: { limit?: number; offset?: number; topic?: string } = {}) => {
    const q = new URLSearchParams();
    if (opts.limit) q.set('limit', String(opts.limit));
    if (opts.offset) q.set('offset', String(opts.offset));
    if (opts.topic && opts.topic !== 'All') q.set('topic', opts.topic);
    return request<Envelope<ServerPost[]> & { meta: { total: number } }>(
      `/community/posts?${q}`,
    ).then((r) => ({ posts: r.data, total: r.meta.total }));
  },

  createPost: (body: { title: string; body?: string; topic?: string; image?: string }) =>
    request<Envelope<ServerPost>>('/community/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((r) => r.data),

  commentOnPost: (postId: string, body: string) =>
    request<Envelope<ServerPost>>(`/community/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }).then((r) => r.data),

  heartPost: (postId: string, delta: 1 | -1) =>
    request<Envelope<ServerPost>>(`/community/posts/${postId}/heart`, {
      method: 'POST',
      body: JSON.stringify({ delta }),
    }).then((r) => r.data),

  /* --------------------------------------------------------- child */

  getChild: () => request<Envelope<ChildState | null>>('/child').then((r) => r.data),

  toggleMilestone: (id: string) =>
    request<Envelope<Milestone[]>>(`/child/milestones/${id}`, { method: 'PATCH' })
      .then((r) => r.data),

  getVaccinations: () =>
    request<Envelope<Vaccination[]> & { meta: VaccinationStats }>('/vaccinations')
      .then((r) => ({ rows: r.data, stats: r.meta })),

  markVaccinationDone: (id: string) =>
    request<Envelope<Vaccination[]> & { meta: VaccinationStats }>(`/vaccinations/${id}/done`, {
      method: 'PATCH',
    }).then((r) => ({ rows: r.data, stats: r.meta })),

  /* --------------------------------------------------- emergency SOS */

  getSosState: () =>
    request<Envelope<{
      active: SosAlert | null; contacts: Guardian[]; history: SosAlert[]; emergencyNumber: string;
    }>>('/sos').then((r) => r.data),

  setEmergencyNumber: (number: string) =>
    request<Envelope<{ emergencyNumber: string }>>('/sos/emergency-number', {
      method: 'PATCH',
      body: JSON.stringify({ number }),
    }).then((r) => r.data.emergencyNumber),

  raiseSos: (body: { lat?: number; lng?: number; accuracy?: number; locationNote?: string }) =>
    request<Envelope<SosAlert>>('/sos', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((r) => r.data),

  closeSos: (id: string, status: 'safe' | 'cancelled') =>
    request<Envelope<SosAlert>>(`/sos/${id}/close`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }).then((r) => r.data),

  getGuardians: () => request<Envelope<Guardian[]>>('/guardians').then((r) => r.data),

  addGuardian: (body: { name: string; relation?: string; phone?: string }) =>
    request<Envelope<Guardian>>('/guardians', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((r) => r.data),

  removeGuardian: (id: string) => request<void>(`/guardians/${id}`, { method: 'DELETE' }),

  /** Open alerts across the clinician's caseload. */
  getDoctorSos: (doctorId: string) =>
    request<Envelope<SosAlert[]>>(`/doctors/${doctorId}/sos`).then((r) => r.data),

  /* --------------------------------------- prescriptions & reports */

  getDocuments: (kind?: DocumentKind) =>
    request<Envelope<CareDocument[]> & { meta: Record<DocumentKind, number> }>(
      `/documents${kind ? `?kind=${kind}` : ''}`,
    ).then((r) => ({ documents: r.data, counts: r.meta })),

  /** `dataUrl` is the base64 payload produced by FileUpload. */
  uploadDocument: (body: {
    kind: DocumentKind; title: string; note?: string;
    dataUrl: string; originalName?: string; takenOn?: string;
  }) => request<Envelope<CareDocument>>('/documents', {
    method: 'POST',
    body: JSON.stringify(body),
  }).then((r) => r.data),

  deleteDocument: (id: string) => request<void>(`/documents/${id}`, { method: 'DELETE' }),

  /** A clinician reading a patient's filed prescriptions and reports. */
  getPatientDocuments: (patientId: string) =>
    request<Envelope<CareDocument[]> & { meta: Record<DocumentKind, number> }>(
      `/patients/${patientId}/documents`,
    ).then((r) => ({ documents: r.data, counts: r.meta })),

  /* ------------------------------------------------------- messaging */

  /** Doctors this mother is entitled to write to. */
  getCareTeam: () => request<Envelope<CareTeamMember[]>>('/care-team').then((r) => r.data),

  getThreads: () =>
    request<Envelope<MotherThread[]> & { meta: { unread: number } }>('/messages')
      .then((r) => ({ threads: r.data, unread: r.meta.unread })),

  /** Fetching a thread also marks the other side's lines as read. */
  getThread: (doctorId: string) =>
    request<Envelope<Message[]>>(`/messages/${doctorId}`).then((r) => r.data),

  sendMessage: (doctorId: string, body: string) =>
    request<Envelope<Message>>('/messages', {
      method: 'POST',
      body: JSON.stringify({ doctorId, body }),
    }).then((r) => r.data),

  /* clinician side of the same conversation */
  getDoctorThreads: (doctorId: string) =>
    request<Envelope<DoctorThread[]> & { meta: { unread: number } }>(`/doctors/${doctorId}/threads`)
      .then((r) => ({ threads: r.data, unread: r.meta.unread })),

  getDoctorThread: (doctorId: string, patientId: string) =>
    request<Envelope<Message[]>>(`/doctors/${doctorId}/threads/${patientId}`).then((r) => r.data),

  sendAsDoctor: (doctorId: string, patientId: string, body: string) =>
    request<Envelope<Message>>(`/doctors/${doctorId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ patientId, body }),
    }).then((r) => r.data),
};

export type ApiStatus = 'loading' | 'online' | 'offline';

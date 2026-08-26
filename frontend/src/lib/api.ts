/**
 * API client — talks to the Express MVC backend (routes/api.js).
 * The React app is a View layer; all persistence and domain rules live in
 * the server's Model layer.
 */
import type { Symptom } from '@/data/symptoms';
import type { Reminder } from '@/data/reminders';
import type { Patient } from '@/data/doctor';
import {
  RequestRefused, type Appointment, type AppointmentChange, type CareDocument,
  type CareEnding, type CareEndingSummary, type CareReason, type CareTeamMember,
  type DocumentKind, type DoctorThread, type Message, type MotherThread,
  type MessageKind, type PayMethod, type Plan, type RankedDoctor, type SlotOffer,
  type UpcomingVisit,
} from '@/data/care';
import type { Guardian, SosAlert } from '@/data/sos';
import type {
  CarePlan, ChildState, DailyLogState, Milestone, Pregnancy, ReportGroup, ReportReason,
  RiskView, ServerPost, ServerProfile, Vaccination, VaccinationStats, VitalAlert,
  VitalReading, WeightGain,
} from '@/data/records';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

/** Absolute URL for a document's bytes — the API host is a different origin in dev. */
export const fileUrl = (path: string) => `${BASE.replace(/\/api$/, '')}${path}`;

/** An error the server blamed on one named answer. */
export class FieldError extends Error {
  field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'FieldError';
    this.field = field;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    // the server explains itself ("That is not a dialable number"); showing
    // "PATCH /sos/emergency-number failed (400)" instead helps nobody
    let message = `${init?.method ?? 'GET'} ${path} failed (${res.status})`;
    let field: string | undefined;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
      // a validation failure names the answer that was wrong, so a form can
      // point at that input rather than blaming the whole page
      if (typeof body?.field === 'string') field = body.field;
    } catch {
      /* not JSON — keep the generic message */
    }
    throw new FieldError(message, field);
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

  /**
   * Her reading language, stored on the account so it follows her to another
   * device — and so the server knows which language to compose her care plan
   * and risk assessment in.
   */
  getLanguage: () =>
    request<Envelope<{ language: 'en' | 'bn' }>>('/me/language').then((r) => r.data.language),

  setLanguage: (language: 'en' | 'bn') =>
    request<Envelope<{ language: 'en' | 'bn' }>>('/me/language', {
      method: 'PATCH',
      body: JSON.stringify({ language }),
    }).then((r) => r.data.language),

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

  /**
   * Her personalised nutrition, movement and lifestyle plan.
   *
   * Built server-side from her stage, her risk assessment, her conditions and
   * her own log, so the client renders it rather than deciding any of it.
   */
  getGuidance: () => request<Envelope<CarePlan>>('/guidance').then((r) => r.data),

  /** The same plan, for a clinician reading a patient's record. */
  getPatientGuidance: (patientId: string) =>
    request<Envelope<CarePlan>>(`/patients/${patientId}/guidance`).then((r) => r.data),

  /* -------------------------------------------- risk assessment (F13) */

  /**
   * Both readings of her risk: the transparent rule engine, and the
   * scikit-learn classifier behind the FastAPI service. `model` is null when
   * that service is not running — the rules always answer.
   */
  getRisk: () =>
    request<Envelope<RiskView> & { meta: { service: { up: boolean; trainedOnRows: number | null } } }>(
      '/risk',
    ).then((r) => ({ ...r.data, service: r.meta.service })),

  getPatientRisk: (patientId: string) =>
    request<Envelope<RiskView>>(`/patients/${patientId}/risk`).then((r) => r.data),

  /** How the model was trained and how well it scores. */
  getRiskModelCard: () =>
    request<Envelope<Record<string, unknown>>>('/risk/model').then((r) => r.data),

  /** "What if my numbers were these" — both engines, on hypothetical readings. */
  simulateRisk: (body: {
    age?: number; systolic: number; diastolic: number;
    sugar: number; tempC: number; heartBpm?: number;
  }) =>
    request<Envelope<RiskView>>('/risk/simulate', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((r) => r.data),

  /* ------------------------------------------------ finding a doctor */

  getDoctors: () => request<Envelope<RankedDoctor[]>>('/doctors').then((r) => r.data),

  /** Clinicians ranked for this mother's stage; `bookable` counts who can take her. */
  getRecommendedDoctors: (stage?: string) =>
    request<Envelope<RankedDoctor[]> & { meta: { stage: string; bookable: number } }>(
      `/doctors/recommended${stage ? `?stage=${stage}` : ''}`,
    ).then((r) => ({ doctors: r.data, bookable: r.meta.bookable })),

  /**
   * A clinician signing themselves up. Resolves to the row a mother will see
   * them as; rejects with a `field` naming whichever answer came back wrong,
   * so the form can point at it instead of saying "check your details".
   */
  registerDoctor: (body: {
    name: string; specialty: string; qualification: string; years: number;
    email: string; phone: string; licenseNo: string;
  }) =>
    request<Envelope<RankedDoctor>>('/doctors/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((r) => r.data),

  getSlots: (doctorId: string, date: string) =>
    request<Envelope<{ date: string; times: string[] }>>(`/doctors/${doctorId}/slots?date=${date}`)
      .then((r) => r.data),

  /* --------------------------- rescheduling, cancelling, ending (F11) */

  /**
   * Move an appointment. Rejects with SLOT_TAKEN when somebody else took the
   * time while she was choosing, which the dialog treats as "pick again"
   * rather than as a failure.
   */
  rescheduleAppointment: (
    id: string,
    body: {
      date: string; time: string; reason?: string;
      side?: 'mother' | 'doctor'; doctorId?: string;
    },
  ) =>
    request<Envelope<Appointment>>(`/appointments/${id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }).then((r) => r.data),

  /** Everywhere an appointment has been moved from. */
  getAppointmentChanges: (id: string) =>
    request<Envelope<AppointmentChange[]>>(`/appointments/${id}/changes`).then((r) => r.data),

  /** Why one side may cancel — the same list the model validates against. */
  getCancelReasons: (side: 'mother' | 'doctor' = 'mother') =>
    request<Envelope<CareReason[]>>(`/cancel-reasons?side=${side}`).then((r) => r.data),

  /** Cancel a visit, with a reason. */
  cancelAppointment: (
    id: string,
    body: { reason: string; note?: string; side?: 'mother' | 'doctor'; doctorId?: string },
  ) =>
    request<Envelope<Appointment>>(`/appointments/${id}`, {
      method: 'DELETE',
      body: JSON.stringify(body),
    }).then((r) => r.data),

  /* ------------------------------ ending the care relationship */

  /** The reasons one side may give, and whether a written note is required. */
  getEndingReasons: (side: 'mother' | 'doctor' = 'mother') =>
    request<Envelope<{ side: string; noteRequired: boolean; options: CareReason[] }>>(
      `/care-endings/reasons?side=${side}`,
    ).then((r) => r.data),

  /** She ends it with one of her clinicians. */
  endCare: (doctorId: string, body: { reason: string; note?: string }) =>
    request<Envelope<CareEnding>>(`/care-endings/${doctorId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((r) => r.data),

  /** Her own record of endings, both directions. */
  getMyCareEndings: () =>
    request<Envelope<CareEnding[]>>('/care-endings').then((r) => r.data),

  /** A clinician ends it with a patient. A written note is required here. */
  endCareWithPatient: (
    doctorId: string,
    patientId: string,
    body: { reason: string; note: string },
  ) =>
    request<Envelope<CareEnding>>(`/doctors/${doctorId}/care-endings/${patientId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((r) => r.data),

  /** Why patients have left this clinician, with the reasons counted. */
  getDoctorCareEndings: (doctorId: string) =>
    request<Envelope<CareEndingSummary>>(`/doctors/${doctorId}/care-endings`).then((r) => r.data),

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
    doctorId: string; date: string; time: string; reason?: string;
    method: PayMethod; plan?: Plan;
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

  /** Visits starting within the hour — drives the "ready your link" nudge. */
  getDoctorUpcoming: (doctorId: string, within = 60) =>
    request<Envelope<UpcomingVisit[]>>(`/doctors/${doctorId}/upcoming?within=${within}`)
      .then((r) => r.data),

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

  /**
   * Addresses another device on this network can reach the API on. Only the
   * server knows these — the browser sees whichever origin it happened to use.
   */
  getNetwork: () =>
    request<Envelope<{ port: number; origins: string[]; interfaces: { name: string; address: string }[] }>>(
      '/network',
    ).then((r) => r.data),

  /* --------------------------------------------------- vitals */

  /** Every stored reading, oldest first, plus the latest and any alerts. */
  getVitals: () =>
    request<Envelope<VitalReading[]> & { meta: { latest: VitalReading | null; alerts: VitalAlert[] } }>(
      '/vitals',
    ).then((r) => ({ readings: r.data, latest: r.meta.latest, alerts: r.meta.alerts })),

  /** Log a reading. Send only the measurements actually taken. */
  addVital: (reading: {
    date?: string; systolic?: number; diastolic?: number;
    sugar?: number; weightKg?: number; tempC?: number; fetalBpm?: number;
  }) =>
    request<Envelope<VitalReading>>('/vitals', {
      method: 'POST',
      body: JSON.stringify(reading),
    }).then((r) => r.data),

  /* ------------------------------ mood, kicks, hydration by day */

  getDailyLog: () => request<Envelope<DailyLogState>>('/daily-log').then((r) => r.data),

  saveDailyLog: (patch: {
    mood?: string; kicks?: number; waterLitres?: number; sleepHours?: number;
  }) =>
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
    return request<Envelope<ServerPost[]> & {
      meta: { total: number; reasons: ReportReason[] }
    }>(
      `/community/posts?${q}`,
    ).then((r) => ({ posts: r.data, total: r.meta.total, reasons: r.meta.reasons }));
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

  /**
   * Report a post or a comment. Rejects with a 409-backed FieldError when this
   * member has already reported the same thing, which the board treats as a
   * state rather than a failure.
   */
  reportContent: (
    target: 'posts' | 'comments',
    id: string,
    body: { reason: string; detail?: string },
  ) =>
    request<Envelope<{ id: string; state: string; reason: string }>>(
      `/community/${target}/${id}/report`,
      { method: 'POST', body: JSON.stringify(body) },
    ).then((r) => r.data),

  /* ------------------------------------------------------ moderation */

  /** The clinician's queue, grouped by the item reported. */
  getReports: (state: 'open' | 'upheld' | 'dismissed' | 'all' = 'open') =>
    request<Envelope<ReportGroup[]> & { meta: { open: number; urgent: number } }>(
      `/moderation/reports?state=${state}`,
    ).then((r) => ({ groups: r.data, open: r.meta.open, urgent: r.meta.urgent })),

  getReportCount: () =>
    request<Envelope<{ open: number }>>('/moderation/count').then((r) => r.data.open),

  /** Uphold or dismiss every open report against one item. */
  resolveReport: (
    target: 'post' | 'comment',
    id: string,
    body: { action: 'uphold' | 'dismiss'; note?: string; doctorId?: string },
  ) =>
    request<Envelope<{ target: string; id: string; action: string; reportsClosed: number }>>(
      `/moderation/${target}s/${id}/resolve`,
      { method: 'POST', body: JSON.stringify(body) },
    ).then((r) => r.data),

  /* --------------------------------------------------------- child */

  getChild: () => request<Envelope<ChildState | null>>('/child').then((r) => r.data),

  toggleMilestone: (id: string) =>
    request<Envelope<Milestone[]>>(`/child/milestones/${id}`, { method: 'PATCH' })
      .then((r) => r.data),

  getVaccinations: () =>
    request<Envelope<Vaccination[]> & { meta: VaccinationStats }>('/vaccinations')
      .then((r) => ({ rows: r.data, stats: r.meta })),

  /** File a card as evidence for one dose. Returns the refreshed list. */
  uploadVaccinationCard: (id: string, body: {
    dataUrl: string; originalName?: string; title?: string; takenOn?: string;
  }) =>
    request<Envelope<Vaccination[]> & { meta: VaccinationStats }>(`/vaccinations/${id}/card`, {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((r) => ({ rows: r.data, stats: r.meta })),

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

  /**
   * The health report, as PDF bytes.
   *
   * Fetched rather than linked so the button can show that something is
   * happening — the server draws charts and embeds every filed document, which
   * takes long enough that a silent link feels broken.
   *
   * `patientId` switches it from "my record" to "this patient's", which is the
   * only difference between the mother's copy and the clinician's.
   */
  async getReport(patientId?: string): Promise<{ blob: Blob; filename: string }> {
    const path = patientId ? `/patients/${patientId}/report.pdf` : '/report.pdf';
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) {
      let message = 'Could not build the report';
      try { message = (await res.json())?.error ?? message; } catch { /* not JSON */ }
      throw new Error(message);
    }
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = /filename="([^"]+)"/.exec(disposition);
    return { blob: await res.blob(), filename: match?.[1] ?? 'maternalcare-report.pdf' };
  },

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

  /**
   * A clinician filing a scan or result onto a patient's record. `uploadedBy`
   * is what tells the two of them apart on the timeline.
   */
  uploadPatientDocument: (patientId: string, body: {
    kind: DocumentKind; title: string; note?: string;
    dataUrl: string; originalName?: string; takenOn?: string; uploadedBy: string;
  }) => request<Envelope<CareDocument>>(`/patients/${patientId}/documents`, {
    method: 'POST',
    body: JSON.stringify(body),
  }).then((r) => r.data),

  /* ------------------------------------------------------- messaging */

  /** Doctors this mother is entitled to write to. */
  getCareTeam: () => request<Envelope<CareTeamMember[]>>('/care-team').then((r) => r.data),

  getThreads: () =>
    request<Envelope<MotherThread[]> & { meta: { unread: number } }>('/messages')
      .then((r) => ({ threads: r.data, unread: r.meta.unread })),

  /** Fetching a thread also marks the other side's lines as read. */
  getThread: (doctorId: string) =>
    request<Envelope<Message[]>>(`/messages/${doctorId}`).then((r) => r.data),

  /**
   * Send a line. `kind` decides what it is; an image rides as a data URL.
   *
   * The link rule is refused server-side with 422 and its own code, so the
   * chat can show a dialog explaining who arranges calls rather than a bare
   * error string.
   */
  async sendMessage(
    doctorId: string,
    body: string,
    opts: { kind?: MessageKind; image?: string } = {},
  ) {
    const res = await fetch(`${BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId, body, ...opts }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json.error ?? `Send failed (${res.status})`) as Error & {
        code?: string; hint?: string;
      };
      err.code = json.code;
      err.hint = json.hint;
      throw err;
    }
    return json.data as Message;
  },

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

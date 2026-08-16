/**
 * Transport only. Every rule about what a guardian may see, and every piece
 * of interpretation ("her BP is climbing, here is what to do"), lives in the
 * server's Model layer (models/guardianModel.js). This file just carries it.
 */

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export interface Overview {
  motherName: string;
  week: number | null;
  dueDate: string | null;
  daysToGo: number | null;
  status: 'settled' | 'watch' | 'high';
  lastReadingOn: string | null;
  vitals: {
    systolic: number | null;
    diastolic: number | null;
    sugar: number | null;
    weightKg: number | null;
    tempC: number | null;
  };
}

export interface Insight {
  level: 'urgent' | 'watch' | 'info';
  /** what she may be going through */
  facing: string;
  /** what this guardian can actually do */
  help: string;
}

export interface SosNotification {
  id: string;
  recipient: string;
  relation?: string;
  channel: string;
  state: string;
  detail?: string;
}

export interface SosAlert {
  id: string;
  triggeredAt: string;
  location: { lat: number; lng: number; accuracy?: number } | null;
  locationNote?: string;
  status: string;
  notifications: SosNotification[];
}

export interface Dashboard {
  guardian: { name: string; relation?: string };
  overview: Overview;
  insight: Insight[];
  alert: SosAlert | null;
  emergencyNumber: string;
}

export interface VitalPoint {
  date: string;
  systolic: number | null;
  diastolic: number | null;
  sugar: number | null;
  weightKg: number | null;
  tempC: number | null;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch { /* not JSON */ }
    throw new Error(message);
  }
  return (await res.json()).data as T;
}

export const api = {
  dashboard: (token: string) => get<Dashboard>(`/guardian/${token}`),
  vitals: (token: string) => get<VitalPoint[]>(`/guardian/${token}/vitals`),
  alert: (token: string) =>
    get<{ alert: SosAlert | null; emergencyNumber: string }>(`/guardian/${token}/alert`),

  /** "I'm on my way" — shows on her screen as who is actually coming. */
  acknowledge: async (token: string) => {
    const res = await fetch(`${BASE}/guardian/${token}/ack`, { method: 'POST' });
    if (!res.ok) throw new Error('Could not send that');
    return (await res.json()).data as SosAlert;
  },
};

/** The link token is this app's only credential, so it persists locally. */
const KEY = 'guardian.token';

export const savedToken = () => {
  const fromUrl = new URLSearchParams(window.location.search).get('t');
  if (fromUrl) {
    localStorage.setItem(KEY, fromUrl);
    // keep it out of the address bar and out of any screenshot she shares
    window.history.replaceState({}, '', window.location.pathname);
    return fromUrl;
  }
  return localStorage.getItem(KEY);
};

export const forgetToken = () => localStorage.removeItem(KEY);

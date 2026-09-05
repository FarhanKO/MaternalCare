/**
 * Transport only. Every rule about what a guardian may see, and every piece
 * of interpretation ("her BP is climbing, here is what to do"), lives in the
 * server's Model layer (models/guardianModel.js). This file just carries it.
 */

/**
 * Where the server is.
 *
 * This cannot be compiled in. Inside the APK "localhost" is the phone
 * itself, so a baked-in address means the app can never reach the server.
 * The pairing link carries it instead, and it is stored alongside the token
 * — so the same APK works against a laptop on the wifi, a college server or
 * a real deployment with no rebuild.
 */
const API_KEY = 'guardian.api';

const readApiBase = () => {
  const fromUrl = new URLSearchParams(window.location.search).get('api');
  if (fromUrl) {
    localStorage.setItem(API_KEY, fromUrl);
    return fromUrl;
  }
  return localStorage.getItem(API_KEY)
    ?? import.meta.env.VITE_API_URL
    ?? `${window.location.protocol}//${window.location.hostname}:3000/api`;
};

let BASE = readApiBase();

export const apiBase = () => BASE;

/** Lets a guardian point the app at the right server if the link was stale. */
export const setApiBase = (url: string) => {
  BASE = url.replace(/\/+$/, '');
  localStorage.setItem(API_KEY, BASE);
};

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
  const res = await fetch(`${apiBase()}${path}`);
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
    const res = await fetch(`${apiBase()}/guardian/${token}/ack`, { method: 'POST' });
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
    // readApiBase() has already taken the api param by this point
    // keep both out of the address bar and out of any screenshot they share
    window.history.replaceState({}, '', window.location.pathname);
    return fromUrl;
  }
  return localStorage.getItem(KEY);
};

export const forgetToken = () => localStorage.removeItem(KEY);

/**
 * Pair from a link the guardian pasted in.
 *
 * Inside the APK the page is served from the bundle, so there is never a
 * query string to read — without this there is no way in at all. Accepts a
 * whole link or a bare token, since people paste whatever they were sent.
 */
export function pairFromLink(input: string): { ok: boolean; error?: string } {
  const text = input.trim();
  if (!text) return { ok: false, error: 'Paste the link you were sent' };

  let token: string | null = null;
  let api: string | null = null;

  try {
    const url = new URL(text);
    token = url.searchParams.get('t');
    api = url.searchParams.get('api');
  } catch {
    // not a URL — treat it as a bare token
    if (/^[A-Za-z0-9_-]{16,}$/.test(text)) token = text;
  }

  if (!token) return { ok: false, error: 'That link has no invitation code in it' };

  localStorage.setItem(KEY, token);
  if (api) setApiBase(api);
  return { ok: true };
}

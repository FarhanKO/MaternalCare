/** Emergency alerts, the guardians they reach, and where she was. */

export type AlertStatus = 'active' | 'safe' | 'cancelled';
export type Channel = 'in-app' | 'guardian-app' | 'sms';
/** `alerted` actually landed; `pending` is recorded but not yet deliverable. */
export type DeliveryState = 'alerted' | 'pending';

export interface SosNotification {
  id: string;
  recipient: string;
  relation?: string;
  channel: Channel;
  state: DeliveryState;
  detail?: string;
}

export interface SosLocation { lat: number; lng: number; accuracy?: number }

export interface SosAlert {
  id: string;
  patientId: string;
  patientName?: string;
  triggeredAt: string;
  location: SosLocation | null;
  locationNote?: string;
  status: AlertStatus;
  closedAt?: string;
  closedBy?: string;
  notifications: SosNotification[];
  /** how many were genuinely reached */
  reached: number;
  /** her configured emergency line, so responders dial the right one */
  emergencyNumber?: string;
}

export interface Guardian {
  id: string;
  name: string;
  relation?: string;
  phone?: string;
  appLinked: boolean;
}

export const CHANNEL_META: Record<Channel, { label: string; note: string }> = {
  'in-app': { label: 'MaternalCare+', note: 'Seen on their portal now' },
  'guardian-app': { label: 'Guardian app', note: 'Full-screen alarm on their phone' },
  sms: { label: 'Text message', note: 'Needs the guardian app to alarm them' },
};

export const RELATIONS = [
  'Husband', 'Mother', 'Father', 'Sister', 'Brother',
  'Mother-in-law', 'Friend', 'Neighbour',
];

/** How long the mother has to change her mind before the alert goes out. */
export const COUNTDOWN_SECONDS = 5;

/** Shown until her own number loads; the emergency line differs by country. */
export const DEFAULT_EMERGENCY = '999';

/** A map link that needs no API key and opens anywhere. */
export const mapLink = (l: SosLocation) =>
  `https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=17/${l.lat}/${l.lng}`;

export const formatCoords = (l: SosLocation) =>
  `${l.lat.toFixed(5)}, ${l.lng.toFixed(5)}`;

/** "just now" / "4 min ago" — an alert is always recent enough for this. */
export function sinceLabel(iso: string) {
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 45) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs} h ago` : new Date(iso).toLocaleDateString();
}

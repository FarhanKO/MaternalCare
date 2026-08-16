import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Check, MapPin, Phone, Siren, Vibrate, VolumeX } from 'lucide-react';
import { canVibrate, isIOS, stopEmergency } from '@/lib/alert';
import type { SosAlert } from '@/lib/api';

interface Props {
  alert: SosAlert;
  motherName: string;
  emergencyNumber: string;
  acknowledged: boolean;
  onAcknowledge: () => void;
}

const mapLink = (l: { lat: number; lng: number }) =>
  `https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=17/${l.lat}/${l.lng}`;

/** Directions link that opens the right app on each platform. */
const routeLink = (l: { lat: number; lng: number }) =>
  isIOS()
    ? `https://maps.apple.com/?daddr=${l.lat},${l.lng}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`;

function elapsed(from: string) {
  const secs = Math.max(0, Math.round((Date.now() - new Date(from).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  return m < 1 ? `${secs}s ago` : `${m} min ago`;
}

/**
 * Takes over the whole screen. On iPhone there is no vibration to lean on,
 * so the visual has to carry the urgency: a pulsing full-bleed red that is
 * impossible to mistake for an ordinary notification.
 */
export function SosScreen({ alert, motherName, emergencyNumber, acknowledged, onAcknowledge }: Props) {
  const [, force] = useState(0);
  const [silenced, setSilenced] = useState(false);

  // keep the "x min ago" honest without re-fetching
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 10000);
    return () => window.clearInterval(id);
  }, []);

  const silence = () => {
    stopEmergency();
    setSilenced(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* the pulse itself is the alarm on iPhone */}
      <motion.div
        className="absolute inset-0 -z-10"
        animate={{
          background: [
            'linear-gradient(150deg,#e11d48 0%,#9f1239 100%)',
            'linear-gradient(150deg,#f43f5e 0%,#be123c 100%)',
            'linear-gradient(150deg,#e11d48 0%,#9f1239 100%)',
          ],
        }}
        transition={{ duration: 1.1, repeat: Infinity }}
      />

      <div className="flex flex-1 flex-col items-center px-5 py-8 text-center text-white">
        <motion.span
          animate={{ scale: [1, 1.14, 1] }}
          transition={{ duration: 1.1, repeat: Infinity }}
          className="grid h-20 w-20 place-items-center rounded-3xl bg-white/20"
        >
          <Siren className="h-10 w-10" />
        </motion.span>

        <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.28em] text-white/85">
          Emergency
        </div>
        <h1 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight">
          {motherName} needs help
        </h1>
        <p className="mt-1 text-[13px] font-semibold text-white/80">
          Raised {elapsed(alert.triggeredAt)}
        </p>

        <div className="mt-6 w-full max-w-sm rounded-3xl bg-white/15 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/80">
            <MapPin className="h-3.5 w-3.5" /> Where she is
          </div>
          {alert.location ? (
            <>
              <div className="mt-1 font-mono text-lg font-bold">
                {alert.location.lat.toFixed(5)}, {alert.location.lng.toFixed(5)}
              </div>
              {alert.location.accuracy && (
                <div className="text-[11px] font-semibold text-white/70">
                  accurate to about {Math.round(alert.location.accuracy)} m
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a href={routeLink(alert.location)} target="_blank" rel="noreferrer"
                  className="rounded-2xl bg-white py-3 text-[13px] font-extrabold text-rose-700">
                  Directions
                </a>
                <a href={mapLink(alert.location)} target="_blank" rel="noreferrer"
                  className="rounded-2xl border border-white/40 bg-white/10 py-3 text-[13px] font-extrabold text-white">
                  See on map
                </a>
              </div>
            </>
          ) : (
            <p className="mt-1 text-[13px] font-semibold text-white/85">
              She could not share a location. Call her now.
            </p>
          )}
        </div>

        <div className="mt-3 grid w-full max-w-sm gap-2">
          <a
            href={`tel:${emergencyNumber}`}
            className="flex items-center justify-center gap-2 rounded-3xl bg-white py-4 text-base font-extrabold text-rose-700"
          >
            <Phone className="h-5 w-5" /> Call {emergencyNumber}
          </a>

          <button
            onClick={onAcknowledge}
            disabled={acknowledged}
            className={`flex items-center justify-center gap-2 rounded-3xl py-4 text-base font-extrabold transition ${
              acknowledged
                ? 'bg-white/20 text-white/80'
                : 'border border-white/40 bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <Check className="h-5 w-5" />
            {acknowledged ? 'She knows you are coming' : 'I’m on my way'}
          </button>

          {!silenced && (
            <button
              onClick={silence}
              className="flex items-center justify-center gap-2 rounded-3xl border border-white/25 py-3 text-[13px] font-bold text-white/80"
            >
              <VolumeX className="h-4 w-4" /> Silence the alarm
            </button>
          )}
        </div>

        {/* say which alerts this phone actually gave, so nothing is assumed */}
        <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-white/65">
          {canVibrate()
            ? <><Vibrate className="h-3.5 w-3.5" /> Alarm and vibration</>
            : <><Siren className="h-3.5 w-3.5" /> Alarm and flashing screen — iPhone cannot vibrate from a web app</>}
        </div>

        {alert.notifications.some((n) => n.state === 'acknowledged') && (
          <div className="mt-4 w-full max-w-sm rounded-2xl bg-white/12 px-3 py-2 text-[11px] font-semibold text-white/85">
            Also on the way:{' '}
            {alert.notifications.filter((n) => n.state === 'acknowledged').map((n) => n.recipient).join(', ')}
          </div>
        )}
      </div>
    </motion.div>
  );
}

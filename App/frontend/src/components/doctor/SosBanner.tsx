import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Crosshair, MapPin, Phone, Siren } from 'lucide-react';
import { api } from '@/lib/api';
import { startAlarm, stopAlarm } from '@/lib/alarm';
import { DEFAULT_EMERGENCY, formatCoords, mapLink, sinceLabel, type SosAlert } from '@/data/sos';

const POLL_MS = 15000;

/**
 * Live SOS alerts across the caseload, pinned above everything else.
 *
 * Polling is crude next to a websocket, but it is honest about what it can
 * do: an alert shows within fifteen seconds rather than instantly, and the
 * clinician is told the screen is watching.
 */
export function SosBanner({ doctorId }: { doctorId: string }) {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const seen = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const open = await api.getDoctorSos(doctorId);
      setAlerts(open);

      // sound only for an alert this session has not shown before
      const fresh = open.filter((a) => !seen.current.has(a.id));
      if (fresh.length) {
        fresh.forEach((a) => seen.current.add(a.id));
        startAlarm(0.8);
        window.setTimeout(stopAlarm, 3500);
      }
    } catch {
      /* leave whatever is on screen — a stale alert beats a vanished one */
    }
  }, [doctorId]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => { window.clearInterval(id); stopAlarm(); };
  }, [load]);

  return (
    <AnimatePresence>
      {alerts.map((a) => (
        <motion.div
          key={a.id}
          layout
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="mb-4 overflow-hidden rounded-4xl shadow-[0_18px_40px_-14px_rgba(190,18,60,0.6)]"
          style={{ background: 'linear-gradient(140deg, #e11d48 0%, #be123c 60%, #9f1239 100%)' }}
          role="alert"
        >
          <div className="flex flex-wrap items-center gap-4 px-5 py-4">
            <motion.span
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 1.1, repeat: Infinity }}
              className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-white/20 text-white"
            >
              <Siren className="h-6 w-6" />
            </motion.span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                  Emergency
                </span>
                <span className="text-base font-extrabold tracking-tight text-white">
                  {a.patientName ?? 'A patient'} needs help
                </span>
                <span className="text-[11px] font-semibold text-white/75">
                  raised {sinceLabel(a.triggeredAt)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold text-white/90">
                {a.location ? (
                  <><Crosshair className="h-3.5 w-3.5" />{formatCoords(a.location)}
                    {a.location.accuracy && ` · ±${Math.round(a.location.accuracy)} m`}</>
                ) : (
                  <>No location — she may have it switched off</>
                )}
              </div>
            </div>

            <div className="flex flex-none items-center gap-2">
              {a.location && (
                <a
                  href={mapLink(a.location)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-3.5 py-2.5 text-[12px] font-extrabold text-rose-700 transition hover:bg-white/90"
                >
                  <MapPin className="h-3.5 w-3.5" /> Locate
                </a>
              )}
              <a
                href={`tel:${a.emergencyNumber ?? DEFAULT_EMERGENCY}`}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-white/40 bg-white/15 px-3.5 py-2.5 text-[12px] font-extrabold text-white transition hover:bg-white/25"
              >
                <Phone className="h-3.5 w-3.5" /> Call {a.emergencyNumber ?? DEFAULT_EMERGENCY}
              </a>
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

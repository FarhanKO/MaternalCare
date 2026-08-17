import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HeartHandshake, Link2, RefreshCw } from 'lucide-react';
import { Dashboard } from '@/components/Dashboard';
import { SosScreen } from '@/components/SosScreen';
import {
  api, apiBase, pairFromLink, savedToken, setApiBase,
  type Dashboard as Data, type SosAlert,
} from '@/lib/api';
import { notify, startEmergency, stopEmergency, releaseScreen, unlockAudio } from '@/lib/alert';
import { isNative, nativeAlarmOff, nativeAlarmOn, startNativeWatch } from '@/lib/native';

/** How often the app asks whether she has raised an alert. */
const POLL_IDLE = 12000;
const POLL_ALERT = 5000;

export function App() {
  const [token, setToken] = useState(savedToken);
  const [pairText, setPairText] = useState('');
  const [pairError, setPairError] = useState('');
  const [data, setData] = useState<Data | null>(null);
  const [alert, setAlert] = useState<SosAlert | null>(null);
  const [error, setError] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const ringing = useRef(false);
  const known = useRef<string | null>(null);

  /* iOS will not play a sound that no gesture started, and an SOS arrives
     from a poll. The first touch anywhere opens the audio context so the
     alarm is not silent when it matters. */
  useEffect(() => {
    const open = () => unlockAudio();
    window.addEventListener('pointerdown', open, { once: true });
    window.addEventListener('touchstart', open, { once: true });
    return () => {
      window.removeEventListener('pointerdown', open);
      window.removeEventListener('touchstart', open);
    };
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await api.dashboard(token);
      setData(d);
      setAlert(d.alert);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // hand the pairing to the native watcher so it survives the app being closed
  useEffect(() => {
    if (!token || !data || !isNative()) return;
    // the native watcher must poll the same server the web layer paired with
    void startNativeWatch(token, apiBase(), data.overview.motherName);
  }, [token, data]);

  // the alert is polled on its own, faster and far smaller than the dashboard
  useEffect(() => {
    if (!token) return undefined;
    let stop = false;

    const check = async () => {
      try {
        const { alert: live } = await api.alert(token);
        if (stop) return;
        setAlert(live);

        if (live && live.id !== known.current) {
          known.current = live.id;
          setAcknowledged(false);
          if (!ringing.current) {
            ringing.current = true;
            // the APK alarms on the alarm stream, which silent mode cannot mute
            const nativeRang = await nativeAlarmOn();
            if (!nativeRang) {
              startEmergency();
              if (document.visibilityState !== 'visible') {
                notify('Emergency', `${data?.overview.motherName ?? 'She'} needs help now.`);
              }
            }
          }
        }
        if (!live && ringing.current) {
          ringing.current = false;
          stopEmergency();
          void nativeAlarmOff();
          releaseScreen();
        }
      } catch {
        /* keep whatever is on screen rather than blanking it */
      }
    };

    check();
    const id = window.setInterval(check, alert ? POLL_ALERT : POLL_IDLE);
    return () => { stop = true; window.clearInterval(id); };
  }, [token, alert, data?.overview.motherName]);

  useEffect(() => () => { stopEmergency(); releaseScreen(); }, []);

  const acknowledge = async () => {
    if (!token) return;
    try {
      await api.acknowledge(token);
      setAcknowledged(true);
      stopEmergency();
    } catch { /* she still sees the alert either way */ }
  };

  const pair = () => {
    const r = pairFromLink(pairText);
    if (!r.ok) { setPairError(r.error ?? 'That did not work'); return; }
    setToken(savedToken());
  };

  /* ---------------------------------------------------------- no link */
  if (!token) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="glass w-full max-w-sm rounded-4xl p-7">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-brand-500/12 text-brand-600">
            <Link2 className="h-7 w-7" />
          </span>
          <h1 className="mt-3 text-center text-xl font-extrabold tracking-tight text-ink">
            Pair this app
          </h1>
          <p className="mt-1.5 text-center text-[12.5px] font-medium leading-relaxed text-ink-muted">
            Paste the personal link she sent you. It only has to be done once.
          </p>

          <textarea
            value={pairText}
            onChange={(e) => { setPairText(e.target.value); setPairError(''); }}
            rows={3}
            placeholder="https://…/?t=…"
            aria-label="Your invitation link"
            className="mt-4 w-full resize-none rounded-2xl border border-white/60 bg-white/80 px-3.5 py-2.5 text-[12px] font-medium text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
          />

          {pairError && (
            <p className="mt-1.5 text-[11px] font-bold text-rose-600">{pairError}</p>
          )}

          <button
            onClick={pair}
            className="mt-2 w-full rounded-2xl bg-brand-500 py-3 text-[13px] font-extrabold text-white transition hover:bg-brand-600"
          >
            Pair
          </button>

          <p className="mt-3 text-center text-[10.5px] font-medium leading-relaxed text-ink-faint">
            Opening the link in a browser pairs it automatically. In the installed app
            there is no address bar, so it has to be pasted here.
          </p>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------- error */
  if (error && !data) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="glass w-full max-w-sm rounded-4xl p-7 text-center">
          <h1 className="text-lg font-extrabold text-ink">Cannot reach her account</h1>
          <p className="mt-1.5 text-[12.5px] font-medium text-ink-muted">{error}</p>

          {/* the link may carry an address this phone cannot see — say so
              and let it be corrected here rather than needing a new build */}
          <div className="mt-4 rounded-2xl border border-white/60 bg-white/60 p-3 text-left">
            <label className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              Server address
            </label>
            <input
              defaultValue={apiBase()}
              onBlur={(e) => setApiBase(e.target.value)}
              aria-label="Server address"
              className="mt-1 h-9 w-full rounded-xl border border-white/60 bg-white/80 px-2.5 text-[11px] font-semibold text-ink outline-none focus:border-brand-400"
            />
            <p className="mt-1 text-[10px] font-medium leading-relaxed text-ink-faint">
              On a phone this cannot be “localhost” — use the computer’s address
              on your wifi, like http://192.168.0.12:3000/api
            </p>
          </div>

          <button onClick={load}
            className="mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-brand-500 px-4 py-2.5 text-[12px] font-bold text-white">
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------- loading */
  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <HeartHandshake className="mx-auto h-8 w-8 animate-pulse text-brand-500" />
          <p className="mt-2 text-[12px] font-semibold text-ink-muted">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Dashboard data={data} token={token} />
      <AnimatePresence>
        {alert && (
          <SosScreen
            alert={alert}
            motherName={data.overview.motherName}
            emergencyNumber={data.emergencyNumber}
            acknowledged={acknowledged}
            onAcknowledge={acknowledge}
          />
        )}
      </AnimatePresence>
    </>
  );
}

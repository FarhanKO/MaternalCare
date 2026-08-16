/**
 * Alarm and vibration for an incoming SOS.
 *
 * Platform reality, which the UI states plainly rather than hiding:
 *
 *   Android, app open      full alarm + vibration
 *   Android, app closed    a notification only; the OS picks the sound and a
 *                          silenced phone stays silent
 *   iOS, app open          full alarm; no vibration — Safari has never
 *                          implemented the Vibration API
 *   iOS, app closed        nothing until the app is opened
 *
 * Overriding the ringer switch or Do Not Disturb is not possible from the
 * web on either platform. It needs a native build: on Android a
 * full-screen-intent notification on an alarm channel, on iOS a critical
 * alert entitlement, which Apple grants only on request.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let loop: number | null = null;
let buzz: number | null = null;

export const isIOS = () =>
  /iP(hone|ad|od)/.test(navigator.userAgent)
  // iPadOS 13+ reports as a Mac, but is the only Mac with a touchscreen
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches
  || (navigator as unknown as { standalone?: boolean }).standalone === true;

export const canVibrate = () => typeof navigator.vibrate === 'function';

function build(): AudioContext | null {
  const Ctor = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  }
  return ctx;
}

/**
 * iOS refuses to start audio unless a user gesture began it, and an SOS
 * arrives from a poll, not a tap. So the first touch anywhere in the app
 * opens the context and plays a silent buffer to keep it alive — without
 * this the alarm is simply mute on iPhone.
 */
export function unlockAudio() {
  const audio = build();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();
  const buffer = audio.createBuffer(1, 1, 22050);
  const src = audio.createBufferSource();
  src.buffer = buffer;
  src.connect(audio.destination);
  src.start(0);
}

export const audioReady = () => Boolean(ctx && ctx.state === 'running');

/** One rising two-tone siren cycle. */
function siren(at: number) {
  if (!ctx || !master) return;
  for (const [offset, from, to] of [[0, 740, 1180], [0.28, 1180, 740]] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(from, at + offset);
    osc.frequency.linearRampToValueAtTime(to, at + offset + 0.26);

    gain.gain.setValueAtTime(0.0001, at + offset);
    gain.gain.exponentialRampToValueAtTime(0.85, at + offset + 0.02);
    gain.gain.setValueAtTime(0.85, at + offset + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + offset + 0.27);

    osc.connect(gain);
    gain.connect(master);
    osc.start(at + offset);
    osc.stop(at + offset + 0.3);
  }
}

/* ------------------------------------------------------------ wake lock */

let wakeLock: WakeLockSentinel | null = null;

/**
 * Hold the screen on for the duration of an alert. This matters most on
 * iPhone, where it is the strongest substitute available for the vibration
 * Safari does not provide.
 */
export async function holdScreenAwake() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      // the lock is dropped whenever the app is backgrounded; take it again
      document.addEventListener('visibilitychange', reacquire);
    }
  } catch {
    /* denied or unsupported — the alert still works, the screen may dim */
  }
}

async function reacquire() {
  if (document.visibilityState === 'visible' && wakeLock === null) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch { /* ignore */ }
  }
}

export function releaseScreen() {
  document.removeEventListener('visibilitychange', reacquire);
  void wakeLock?.release().catch(() => {});
  wakeLock = null;
}

/**
 * Start everything this device allows. Each capability is attempted
 * independently, so a phone missing one still gets the rest.
 */
export function startEmergency() {
  const audio = build();
  if (audio) {
    if (audio.state === 'suspended') void audio.resume();
    if (master) master.gain.setValueAtTime(1, audio.currentTime);
    stopLoop();
    siren(audio.currentTime);
    loop = window.setInterval(() => {
      if (ctx) siren(ctx.currentTime);
    }, 600);
  }

  if (canVibrate()) {
    // a long, irregular pattern reads as an emergency rather than a message
    const pattern = [400, 120, 400, 120, 700, 200];
    navigator.vibrate(pattern);
    buzz = window.setInterval(() => navigator.vibrate(pattern), 2000);
  }

  void holdScreenAwake();
}

/* --------------------------------------------------------- capabilities */

export interface Capability {
  label: string;
  /** what this device will actually do */
  state: 'yes' | 'no' | 'partial';
  detail: string;
}

/**
 * Probed live rather than assumed, so the panel describes the phone in the
 * guardian's hand — not the platform we hoped they were using.
 */
export function capabilities(): Capability[] {
  const ios = isIOS();
  const installed = isStandalone();
  const notify = 'Notification' in window ? Notification.permission : 'unsupported';

  return [
    {
      label: 'Alarm sound',
      state: build() ? 'yes' : 'no',
      detail: build()
        ? 'Full-volume siren while the app is open'
        : 'This browser cannot play audio',
    },
    {
      label: 'Vibration',
      state: canVibrate() ? 'yes' : 'no',
      detail: canVibrate()
        ? 'Long emergency pattern, repeating'
        : 'iPhone does not allow web apps to vibrate — the alarm and a full-screen alert are used instead',
    },
    {
      label: 'Screen stays on',
      state: 'wakeLock' in navigator ? 'yes' : 'no',
      detail: 'wakeLock' in navigator
        ? 'The alert holds your screen awake'
        : 'Your screen may dim during an alert',
    },
    {
      label: 'Alerts when app is closed',
      state: notify === 'granted' ? 'partial' : 'no',
      detail: notify === 'granted'
        ? 'A notification arrives, but your phone decides the sound — silent mode stays silent'
        : ios && !installed
          ? 'Add this app to your Home Screen first, then allow notifications'
          : 'Turn on notifications to be reached when the app is closed',
    },
    {
      label: 'Rings through silent mode',
      state: 'no',
      detail: 'No web app can override the ringer switch or Do Not Disturb. This needs the native build.',
    },
  ];
}

function stopLoop() {
  if (loop !== null) { window.clearInterval(loop); loop = null; }
}

export function stopEmergency() {
  stopLoop();
  if (buzz !== null) { window.clearInterval(buzz); buzz = null; }
  if (canVibrate()) navigator.vibrate(0);
  if (master && ctx) master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
}

/** Ask for notification permission — the only background reach the web has. */
export async function requestNotifications(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/** Fired when an alert arrives while the tab is in the background. */
export function notify(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      tag: 'sos',
      requireInteraction: true,
      icon: '/guardian-icon.svg',
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch {
    /* some browsers only allow this from a service worker */
  }
}

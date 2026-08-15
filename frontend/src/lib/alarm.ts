/**
 * The SOS alarm tone, synthesised rather than shipped as an audio file.
 *
 * A two-tone siren built from oscillators costs nothing to download and
 * cannot fail to load at the one moment it matters. Browsers only allow
 * audio to start from a user gesture, which the SOS press provides.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: number | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
  }
  return ctx;
}

/** One rising two-tone chirp. */
function chirp(at: number, from: number, to: number, length: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.linearRampToValueAtTime(to, at + length);

  // a short attack and release stops the click you get from a hard gate
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.6, at + 0.02);
  gain.gain.setValueAtTime(0.6, at + length - 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);

  osc.connect(gain);
  gain.connect(master);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

/**
 * Start the alarm. `urgency` 0→1 drives tempo and pitch, so the countdown can
 * tighten as it runs out; call again with a higher value to escalate.
 */
export function startAlarm(urgency = 0) {
  const audio = context();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();
  if (master) master.gain.value = 1;

  stopLoop();
  const period = 900 - urgency * 500;          // 900ms → 400ms between chirps
  const base = 660 + urgency * 220;

  const fire = () => {
    if (!ctx) return;
    const now = ctx.currentTime;
    chirp(now, base, base * 1.5, 0.12);
    chirp(now + 0.16, base * 1.5, base, 0.12);
  };

  fire();
  timer = window.setInterval(fire, period);
}

function stopLoop() {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
}

export function stopAlarm() {
  stopLoop();
  if (master && ctx) {
    // ramp rather than cut, so stopping does not itself click
    master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02);
  }
}

/** A single confirmation tone — used when the alert has gone out. */
export function confirmTone() {
  const audio = context();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();
  if (master) master.gain.value = 1;
  const now = audio.currentTime;
  chirp(now, 520, 780, 0.14);
  chirp(now + 0.18, 780, 1040, 0.22);
  window.setTimeout(stopAlarm, 600);
}

/** True when this browser can make any sound at all. */
export const audioSupported = () =>
  typeof window !== 'undefined'
  && Boolean(window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);

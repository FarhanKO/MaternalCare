/**
 * SOS sounds, synthesised rather than shipped as audio files. Nothing to
 * download, and nothing that can fail to load at the one moment it matters.
 * Browsers only allow audio to start from a user gesture, which the SOS
 * press provides.
 *
 * Two different jobs, deliberately different in character:
 *   tick()       the countdown on the mother's own screen — a soft clock,
 *                because she is already frightened and a siren aimed at her
 *                adds panic without adding information
 *   startAlarm() an incoming emergency on a clinician's screen, which does
 *                need to cut through whatever else they are doing
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: number | null = null;

/** Creates the graph on first use and makes sure it is audible and running. */
function ensure(): AudioContext | null {
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
  if (ctx.state === 'suspended') void ctx.resume();
  // stopAlarm ramps this down, so anything new has to bring it back up
  if (master) master.gain.setValueAtTime(1, ctx.currentTime);
  return ctx;
}

/**
 * One soft clock tick. Alternating pitch reads as tick–tock rather than a
 * repeated beep; the quick drop in pitch and fast decay give it a wooden
 * knock instead of an electronic edge.
 */
export function tick(step = 0) {
  const audio = ensure();
  if (!audio || !master) return;

  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = 'sine';                       // no harmonics, so it cannot sound shrill
  const freq = step % 2 === 0 ? 1040 : 760;
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.05);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.006);   // a third of the alarm
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.15);
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
  const audio = ensure();
  if (!audio) return;

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
  const audio = ensure();
  if (!audio) return;
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

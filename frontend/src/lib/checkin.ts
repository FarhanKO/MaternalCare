import type { DailyLogEntry, VitalReading } from '@/data/records';

/**
 * What the mother is asked to record each day, and how far behind she is.
 *
 * Until now only kicks, mood and water could be entered from the dashboard —
 * the other three charts drew hardcoded arrays because nothing collected them.
 * This is the single list both the check-in sheet and the notification bell
 * read from, so the two can never disagree about what is outstanding.
 */

/** Where a field is stored — the two writes go to different endpoints. */
export type Store = 'vitals' | 'log';

export interface Metric {
  key: MetricKey;
  label: string;
  /** what a single number means, shown next to the value */
  unit: string;
  hint: string;
  store: Store;
  step: number;
  min: number;
  max: number;
  /** decimals to render */
  dp: number;
  /** a sensible starting point when she has never logged this */
  fallback: number;
}

export type MetricKey =
  | 'weightKg' | 'systolic' | 'diastolic' | 'sugar' | 'tempC' | 'fetalBpm'
  | 'sleepHours' | 'kicks' | 'waterLitres';

export const METRICS: Metric[] = [
  {
    key: 'weightKg',
    label: 'Weight',
    unit: 'kg',
    hint: 'Weigh yourself at the same time each day',
    store: 'vitals',
    step: 0.5,
    min: 35,
    max: 200,
    dp: 1,
    fallback: 60,
  },
  {
    key: 'systolic',
    label: 'Blood pressure — upper',
    unit: 'mmHg',
    hint: 'The first, larger number on the cuff',
    store: 'vitals',
    step: 1,
    min: 50,
    max: 250,
    dp: 0,
    fallback: 120,
  },
  {
    key: 'diastolic',
    label: 'Blood pressure — lower',
    unit: 'mmHg',
    hint: 'The second, smaller number on the cuff',
    store: 'vitals',
    step: 1,
    min: 30,
    max: 150,
    dp: 0,
    fallback: 80,
  },
  {
    key: 'sugar',
    label: 'Blood sugar',
    unit: 'mg/dL',
    hint: 'Fasting, before you have eaten',
    store: 'vitals',
    step: 1,
    min: 40,
    max: 400,
    dp: 0,
    fallback: 90,
  },
  {
    key: 'tempC',
    label: 'Temperature',
    unit: '°C',
    hint: 'Take it if you feel warm or unwell',
    store: 'vitals',
    step: 0.1,
    min: 30,
    max: 45,
    dp: 1,
    fallback: 36.8,
  },
  {
    key: 'fetalBpm',
    label: 'Baby’s heartbeat',
    unit: 'bpm',
    hint: 'From a doppler or your last scan',
    store: 'vitals',
    step: 1,
    min: 60,
    max: 240,
    dp: 0,
    fallback: 140,
  },
  {
    key: 'sleepHours',
    label: 'Sleep last night',
    unit: 'hours',
    hint: 'Roughly, including naps you remember',
    store: 'log',
    step: 0.5,
    min: 0,
    max: 24,
    dp: 1,
    fallback: 7,
  },
  {
    key: 'kicks',
    label: 'Baby kicks',
    unit: 'movements',
    hint: 'Counted so far today',
    store: 'log',
    step: 1,
    min: 0,
    max: 60,
    dp: 0,
    fallback: 0,
  },
  {
    key: 'waterLitres',
    label: 'Water',
    unit: 'litres',
    hint: 'How much you have drunk today',
    store: 'log',
    step: 0.25,
    min: 0,
    max: 6,
    dp: 2,
    fallback: 0,
  },
];

/** Mood is a choice rather than a number, so it sits outside METRICS. */
export const MOOD_CHOICES = [
  'Happy', 'Calm', 'Loved', 'Neutral', 'Tired', 'Anxiety', 'Sad', 'Stress',
] as const;

/** Everything the sheet can send, all optional. */
export type CheckInDraft = Partial<Record<MetricKey, number>> & { mood?: string };

const pad = (n: number) => String(n).padStart(2, '0');
/** Her local calendar day, matching how the server decides "today". */
export const todayISO = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** True when a daily-log row actually carries something. */
export const logHasAnything = (e: DailyLogEntry | undefined) =>
  !!e && (isNum(e.kicks) || isNum(e.waterLitres) || isNum(e.sleepHours) || !!e.mood);

/**
 * What is already recorded for today, across both stores.
 *
 * A vitals reading counts only if it was taken today — yesterday's blood
 * pressure does not answer today's question.
 */
export function todaysValues(
  today: DailyLogEntry | undefined,
  readings: VitalReading[],
): CheckInDraft {
  const iso = todayISO();
  const out: CheckInDraft = {};

  if (today && today.date === iso) {
    if (isNum(today.kicks)) out.kicks = today.kicks;
    if (isNum(today.waterLitres)) out.waterLitres = today.waterLitres;
    if (isNum(today.sleepHours)) out.sleepHours = today.sleepHours;
    if (today.mood) out.mood = today.mood;
  }

  // later rows win, so the most recent reading of the day is the one shown
  for (const r of readings) {
    if (r.date !== iso) continue;
    if (isNum(r.weightKg)) out.weightKg = r.weightKg;
    if (isNum(r.systolic)) out.systolic = r.systolic;
    if (isNum(r.diastolic)) out.diastolic = r.diastolic;
    if (isNum(r.sugar)) out.sugar = r.sugar;
    if (isNum(r.tempC)) out.tempC = r.tempC;
    if (isNum(r.fetalBpm)) out.fetalBpm = r.fetalBpm;
  }

  return out;
}

/** The most recent value ever recorded, used to seed a stepper. */
export function lastKnown(readings: VitalReading[], key: MetricKey): number | undefined {
  for (let i = readings.length - 1; i >= 0; i -= 1) {
    const r = readings[i];
    const v = key === 'weightKg' ? r.weightKg
      : key === 'systolic' ? r.systolic
        : key === 'diastolic' ? r.diastolic
          : key === 'sugar' ? r.sugar
            : key === 'tempC' ? r.tempC
              : key === 'fetalBpm' ? r.fetalBpm
                : null;
    if (isNum(v)) return v;
  }
  return undefined;
}

export interface CheckInStatus {
  /** metrics with no value for today */
  missing: Metric[];
  /** true when mood has not been picked today */
  moodMissing: boolean;
  /** how many of the asked-for items are done */
  done: number;
  total: number;
  /** whole days since the last day with anything logged; 0 if today has something */
  daysSinceLog: number;
  /** nothing at all recorded today */
  nothingToday: boolean;
}

/**
 * How far behind she is.
 *
 * `daysSinceLog` walks back through the daily-log history rather than
 * subtracting two dates, so a gap of one logged day inside a quiet week does
 * not read as a clean streak.
 */
export function checkInStatus(
  today: DailyLogEntry | undefined,
  logHistory: DailyLogEntry[],
  readings: VitalReading[],
): CheckInStatus {
  const values = todaysValues(today, readings);
  const missing = METRICS.filter((m) => values[m.key] === undefined);
  const moodMissing = !values.mood;

  const total = METRICS.length + 1; // + mood
  const done = total - missing.length - (moodMissing ? 1 : 0);

  const iso = todayISO();
  const logged = new Set(
    logHistory.filter(logHasAnything).map((e) => e.date),
  );
  for (const r of readings) {
    if (r.systolic ?? r.diastolic ?? r.weightKg ?? r.fetalBpm ?? r.sugar ?? r.tempC) {
      logged.add(r.date);
    }
  }
  if (logHasAnything(today)) logged.add(iso);

  let daysSinceLog = 0;
  const cursor = new Date(`${iso}T12:00:00`);
  // cap the walk — past a fortnight the exact number stops being useful
  while (daysSinceLog < 14 && !logged.has(todayISO(cursor))) {
    daysSinceLog += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    missing,
    moodMissing,
    done,
    total,
    daysSinceLog,
    nothingToday: done === 0,
  };
}

/** The sentence the bell shows. */
export function nudgeText(s: CheckInStatus): { title: string; body: string } | null {
  if (s.done === s.total) return null;

  if (s.daysSinceLog >= 2) {
    return {
      // the walk stops at a fortnight, so past that report the cap, not a count
      title: s.daysSinceLog >= 14
        ? 'Nothing logged in over a fortnight'
        : `Nothing logged for ${s.daysSinceLog} days`,
      body: 'Your trend charts have a gap in them. A minute now fills it in.',
    };
  }
  if (s.nothingToday) {
    return {
      title: 'You haven’t completed your daily check-in yet',
      body: 'Weight, blood pressure, blood sugar, temperature, baby’s heartbeat, sleep, kicks, water and how you feel.',
    };
  }
  return {
    title: 'Your daily check-in is half done',
    body: `${s.total - s.done} left: ${[
      ...s.missing.map((m) => m.label.toLowerCase()),
      ...(s.moodMissing ? ['mood'] : []),
    ].slice(0, 3).join(', ')}${s.total - s.done > 3 ? '…' : ''}`,
  };
}

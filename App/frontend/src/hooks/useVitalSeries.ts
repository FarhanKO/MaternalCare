import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type {
  DailyLogEntry, VitalAlert, VitalReading, WeightGain,
} from '@/data/records';

/**
 * The trend charts, built from what is actually stored.
 *
 * The vitals table and its model have existed since the first migration, but
 * nothing exposed them, so the charts were drawn from hardcoded arrays while
 * real readings sat in Postgres. This joins the three sources the charts can
 * legitimately be built from — vitals, the daily log, and the weight-gain
 * calculation — and leaves the rest alone rather than inventing numbers.
 */

export interface Point { d: string; [k: string]: string | number | null }

const SHORT_DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

/** 'YYYY-MM-DD' → a label, without letting a timezone shift the day. */
const label = (iso: string, fmt: Intl.DateTimeFormat) =>
  fmt.format(new Date(`${iso}T12:00:00`));

const EMPTY_TODAY: DailyLogEntry = { date: '' };

export interface VitalSeries {
  loading: boolean;
  /** true once a request has come back, whether or not it had rows */
  loaded: boolean;
  offline: boolean;
  latest: VitalReading | null;
  /** every stored reading, oldest first — what the check-in seeds itself from */
  readings: VitalReading[];
  alerts: VitalAlert[];
  weightGain: WeightGain | null;
  /** systolic / diastolic over time */
  bp: Point[];
  /** her weight against the range recommended for her BMI at this week */
  weight: Point[];
  sugar: Point[];
  kicks: Point[];
  water: Point[];
  /** hours slept per night, as she reported them */
  sleep: Point[];
  /** fetal heart rate, from the readings that carried one */
  fetalHr: Point[];
  moods: { date: string; mood: string | null }[];
  /** today's daily-log row, so a form can show what is already filled in */
  today: DailyLogEntry;
  /** the last fortnight of daily logs, oldest first */
  logHistory: DailyLogEntry[];
  /** re-fetch everything — call after saving a check-in */
  reload: () => void;
}

type Loaded = Omit<VitalSeries, 'loading' | 'loaded' | 'offline' | 'reload'>;

const EMPTY: Loaded = {
  latest: null,
  readings: [],
  alerts: [],
  weightGain: null,
  bp: [],
  weight: [],
  sugar: [],
  kicks: [],
  water: [],
  sleep: [],
  fetalHr: [],
  moods: [],
  today: EMPTY_TODAY,
  logHistory: [],
};

export function useVitalSeries(): VitalSeries {
  const [state, setState] = useState<Omit<VitalSeries, 'reload'>>({
    loading: true, loaded: false, offline: false, ...EMPTY,
  });
  /** bumped by reload() to re-run the effect */
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.getVitals(),
      api.getDailyLog(),
      api.getWeightGain().catch(() => null),
    ])
      .then(([vitals, log, gain]) => {
        if (cancelled) return;
        const has = (v: number | null | undefined): v is number => typeof v === 'number';

        setState({
          loading: false,
          loaded: true,
          offline: false,
          latest: vitals.latest,
          readings: vitals.readings,
          alerts: vitals.alerts,
          weightGain: gain,

          bp: vitals.readings
            .filter((r) => has(r.systolic) && has(r.diastolic))
            .map((r) => ({ d: label(r.date, SHORT_DATE), sys: r.systolic, dia: r.diastolic })),

          // the recommended band is a whole-pregnancy range, so it is drawn flat
          // across the readings rather than pretended to be per-week data
          weight: vitals.readings
            .filter((r) => has(r.weightKg))
            .map((r) => ({
              d: label(r.date, SHORT_DATE),
              kg: r.weightKg,
              lo: gain?.totalRange.low ?? null,
              hi: gain?.totalRange.high ?? null,
            })),

          sugar: vitals.readings
            .filter((r) => has(r.sugar))
            .map((r) => ({ d: label(r.date, SHORT_DATE), mg: r.sugar })),

          fetalHr: vitals.readings
            .filter((r) => has(r.fetalBpm))
            .map((r) => ({ d: label(r.date, SHORT_DATE), bpm: r.fetalBpm })),

          kicks: log.history
            .filter((e) => has(e.kicks))
            .map((e) => ({ d: label(e.date, WEEKDAY), n: e.kicks ?? null })),

          water: log.history
            .filter((e) => has(e.waterLitres))
            .map((e) => ({ d: label(e.date, WEEKDAY), l: e.waterLitres ?? null })),

          sleep: log.history
            .filter((e) => has(e.sleepHours))
            .map((e) => ({ d: label(e.date, WEEKDAY), h: e.sleepHours ?? null })),

          moods: log.history.map((e) => ({ date: e.date, mood: e.mood ?? null })),

          today: log.today,
          logHistory: log.history,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, loaded: true, offline: true, ...EMPTY });
      });

    return () => { cancelled = true; };
  }, [nonce]);

  return { ...state, reload };
}

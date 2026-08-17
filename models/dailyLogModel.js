/**
 * Daily Log Model — mood, kicks and hydration, as reported by the mother.
 *
 * One row per day per mother, upserted, because a day is the natural grain:
 * she adjusts the same day's figures repeatedly and should end up with one
 * record, not twenty.
 */
const db = require('../config/db');

const MOODS = ['Happy', 'Calm', 'Loved', 'Neutral', 'Tired', 'Anxiety', 'Sad', 'Stress'];

const pad = (n) => String(n).padStart(2, '0');
/** Local calendar date — her "today", not UTC's. */
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toDTO = (r) => ({
  date: r.date,
  mood: r.mood || undefined,
  kicks: r.kicks ?? undefined,
  waterLitres: r.water_litres ?? undefined,
});

module.exports = {
  MOODS,
  todayISO,

  /** Her figures for one day, or an empty shape so the UI has something. */
  async forDate(userId, date = todayISO()) {
    const row = await db.one(
      'SELECT * FROM daily_logs WHERE user_id = $1 AND date = $2', [userId, date],
    );
    return row ? toDTO(row) : { date, mood: undefined, kicks: undefined, waterLitres: undefined };
  },

  /** Oldest first, which is the order a chart wants to plot. */
  async history(userId, days = 14) {
    const rows = await db.sql(
      'SELECT * FROM daily_logs WHERE user_id = $1 ORDER BY date DESC LIMIT $2',
      [userId, days],
    );
    return rows.reverse().map(toDTO);
  },

  /**
   * Save today's figures.
   *
   * ON CONFLICT does insert-or-update in one round trip, and COALESCE keeps
   * whatever the caller left out — so nudging the water count never wipes
   * the mood she set an hour ago.
   */
  async save(userId, { date = todayISO(), mood, kicks, waterLitres } = {}) {
    if (mood !== undefined && mood !== null && !MOODS.includes(mood)) {
      throw new Error(`Unknown mood: ${mood}`);
    }
    if (kicks !== undefined && kicks !== null && (!Number.isFinite(kicks) || kicks < 0)) {
      throw new Error('Kicks must be a positive number');
    }
    if (waterLitres !== undefined && waterLitres !== null
        && (!Number.isFinite(waterLitres) || waterLitres < 0)) {
      throw new Error('Water must be a positive number');
    }

    const row = await db.insert(
      `INSERT INTO daily_logs (user_id, date, mood, kicks, water_litres)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, date) DO UPDATE SET
         mood         = COALESCE(EXCLUDED.mood, daily_logs.mood),
         kicks        = COALESCE(EXCLUDED.kicks, daily_logs.kicks),
         water_litres = COALESCE(EXCLUDED.water_litres, daily_logs.water_litres)
       RETURNING *`,
      [userId, date, mood ?? null, kicks ?? null, waterLitres ?? null],
    );
    return toDTO(row);
  },

  /**
   * Averages over the recent window, for the wellbeing summary. Returns null
   * rather than zero when there is nothing logged — "no data" and "drank
   * nothing" are different claims.
   */
  async summary(userId, days = 7) {
    const row = await db.one(
      `SELECT count(*)                        AS days,
              round(avg(water_litres)::numeric, 1) AS avg_water,
              round(avg(kicks)::numeric, 1)        AS avg_kicks,
              mode() WITHIN GROUP (ORDER BY mood)  AS common_mood
       FROM (
         SELECT * FROM daily_logs WHERE user_id = $1 ORDER BY date DESC LIMIT $2
       ) recent`,
      [userId, days],
    );

    return {
      days: row?.days ?? 0,
      avgWaterLitres: row?.avg_water ?? null,
      avgKicks: row?.avg_kicks ?? null,
      commonMood: row?.common_mood ?? null,
    };
  },
};

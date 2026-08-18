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

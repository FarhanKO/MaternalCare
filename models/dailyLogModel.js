/**
 * Daily Log Model — mood, kicks and hydration, as reported by the mother.
 *
 * These were `useState` on the dashboard, so every value reset on refresh and
 * nothing could be charted. One row per day per mother, upserted, because a
 * day is the natural grain: she adjusts the same day's figures repeatedly and
 * should end up with one record, not twenty.
 */
const db = require('../config/database');

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
  forDate(userId, date = todayISO()) {
    const row = db
      .prepare('SELECT * FROM daily_logs WHERE user_id = ? AND date = ?')
      .get(userId, date);
    return row ? toDTO(row) : { date, mood: undefined, kicks: undefined, waterLitres: undefined };
  },

  /** Oldest first, which is the order a chart wants to plot. */
  history(userId, days = 14) {
    return db.prepare(
      'SELECT * FROM daily_logs WHERE user_id = ? ORDER BY date DESC LIMIT ?',
    ).all(userId, days).reverse().map(toDTO);
  },

  /**
   * Save today's figures. Only the fields supplied are touched, so nudging
   * the water count never wipes the mood she set an hour ago.
   */
  save(userId, { date = todayISO(), mood, kicks, waterLitres } = {}) {
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

    const existing = db
      .prepare('SELECT * FROM daily_logs WHERE user_id = ? AND date = ?')
      .get(userId, date);

    if (existing) {
      db.prepare(`
        UPDATE daily_logs SET
          mood         = COALESCE(?, mood),
          kicks        = COALESCE(?, kicks),
          water_litres = COALESCE(?, water_litres)
        WHERE user_id = ? AND date = ?
      `).run(mood ?? null, kicks ?? null, waterLitres ?? null, userId, date);
    } else {
      db.prepare(`
        INSERT INTO daily_logs (user_id, date, mood, kicks, water_litres)
        VALUES (?,?,?,?,?)
      `).run(userId, date, mood ?? null, kicks ?? null, waterLitres ?? null);
    }

    return this.forDate(userId, date);
  },

  /**
   * Averages over the recent window, for the wellbeing summary. Returns null
   * fields rather than zeros when there is nothing logged — "no data" and
   * "drank nothing" are different claims.
   */
  summary(userId, days = 7) {
    const rows = this.history(userId, days);
    const water = rows.map((r) => r.waterLitres).filter((v) => v != null);
    const kicks = rows.map((r) => r.kicks).filter((v) => v != null);
    const avg = (list) => (list.length
      ? Math.round((list.reduce((s, n) => s + n, 0) / list.length) * 10) / 10
      : null);

    return {
      days: rows.length,
      avgWaterLitres: avg(water),
      avgKicks: avg(kicks),
      // the mood she recorded most often in the window
      commonMood: rows.reduce((best, r) => {
        if (!r.mood) return best;
        const counts = best.counts ?? {};
        counts[r.mood] = (counts[r.mood] ?? 0) + 1;
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        return { counts, mood: top[0] };
      }, {}).mood ?? null,
    };
  },
};

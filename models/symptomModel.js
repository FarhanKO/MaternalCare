/**
 * Symptom Model — data access + domain logic for the symptom journal.
 * Consumed by both the EJS views and the JSON API behind the React
 * dashboard.
 */
const db = require('../config/db');

/** Symptoms that always warrant same-day clinical review. */
const URGENT = new Set([
  'Shortness of breath', 'Blurred vision', 'Severe headache', 'Bleeding',
  'Reduced movement', 'Fever', 'Abdominal pain', 'Contractions',
]);

const INTENSITY_WEIGHT = { mild: 5, mid: 10, high: 17, severe: 25 };

const toDTO = (r) => ({
  id: String(r.id),
  name: r.name,
  intensity: r.intensity,
  daysPresent: r.days_present,
  confirmedToday: r.confirmed_today,
  fromVoice: r.from_voice,
  loggedAt: r.logged_at,
});

module.exports = {
  URGENT,

  async all(userId) {
    const rows = await db.sql(
      'SELECT * FROM symptoms WHERE user_id = $1 ORDER BY days_present DESC, id ASC',
      [userId],
    );
    return rows.map(toDTO);
  },

  async create(userId, {
    name, intensity = 'mid', daysPresent = 1, confirmedToday = true, fromVoice = false,
  }) {
    const row = await db.insert(
      `INSERT INTO symptoms
         (user_id, name, intensity, days_present, confirmed_today, from_voice, logged_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [userId, name, intensity, daysPresent, confirmedToday, fromVoice, new Date().toISOString()],
    );
    return toDTO(row);
  },

  async find(id) {
    const row = await db.one('SELECT * FROM symptoms WHERE id = $1', [id]);
    return row ? toDTO(row) : null;
  },

  /** COALESCE keeps the fields the caller did not send. */
  async update(id, { intensity, daysPresent, confirmedToday }) {
    const row = await db.one(
      `UPDATE symptoms SET
         intensity       = COALESCE($2, intensity),
         days_present    = COALESCE($3, days_present),
         confirmed_today = COALESCE($4, confirmed_today)
       WHERE id = $1 RETURNING *`,
      [id, intensity ?? null, daysPresent ?? null, confirmedToday ?? null],
    );
    return row ? toDTO(row) : null;
  },

  async remove(id) {
    await db.run('DELETE FROM symptoms WHERE id = $1', [id]);
  },

  /**
   * Replace the whole journal for a user — how the React logger saves.
   * One transaction, so a failure part-way cannot leave her with half a
   * journal and the other half deleted.
   */
  async replaceAll(userId, list) {
    await db.tx(async (t) => {
      await t.run('DELETE FROM symptoms WHERE user_id = $1', [userId]);
      for (const s of list) {
        await t.run(
          `INSERT INTO symptoms
             (user_id, name, intensity, days_present, confirmed_today, from_voice, logged_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [userId, s.name, s.intensity || 'mid', s.daysPresent || 1,
            Boolean(s.confirmedToday), Boolean(s.fromVoice),
            s.loggedAt || new Date().toISOString()],
        );
      }
    });
    return this.all(userId);
  },

  /** Mark every symptom as needing a "still there?" check on the next entry. */
  async clearConfirmations(userId) {
    await db.run('UPDATE symptoms SET confirmed_today = FALSE WHERE user_id = $1', [userId]);
    return this.all(userId);
  },

  /** Domain logic: how heavily the journal weighs on the wellbeing score. */
  async burden(userId) {
    const list = await this.all(userId);
    return list.reduce((total, s) => {
      const persistence = Math.min(2, 1 + (s.daysPresent - 1) * 0.12);
      return total + (INTENSITY_WEIGHT[s.intensity] || 10) * persistence
        + (URGENT.has(s.name) ? 14 : 0);
    }, 0);
  },
};

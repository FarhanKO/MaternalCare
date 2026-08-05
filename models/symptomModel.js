/**
 * Symptom Model — data access + domain logic for the symptom journal.
 * Consumed by both the EJS views (server-rendered) and the JSON API that
 * backs the React dashboard.
 */
const db = require('../config/database');

/** Symptoms that always warrant same-day clinical review. */
const URGENT = new Set([
  'Shortness of breath', 'Blurred vision', 'Severe headache', 'Bleeding',
  'Reduced movement', 'Fever', 'Abdominal pain', 'Contractions',
]);

const INTENSITY_WEIGHT = { mild: 5, mid: 10, high: 17, severe: 25 };

/** Map a DB row to the shape the API/React client expects. */
const toDTO = (r) => ({
  id: String(r.id),
  name: r.name,
  intensity: r.intensity,
  daysPresent: r.days_present,
  confirmedToday: Boolean(r.confirmed_today),
  fromVoice: Boolean(r.from_voice),
  loggedAt: r.logged_at,
});

module.exports = {
  URGENT,

  all(userId) {
    return db
      .prepare('SELECT * FROM symptoms WHERE user_id = ? ORDER BY days_present DESC, id ASC')
      .all(userId)
      .map(toDTO);
  },

  create(userId, { name, intensity = 'mid', daysPresent = 1, confirmedToday = true, fromVoice = false }) {
    const info = db
      .prepare(`INSERT INTO symptoms (user_id, name, intensity, days_present, confirmed_today, from_voice, logged_at)
                VALUES (?,?,?,?,?,?,?)`)
      .run(userId, name, intensity, daysPresent, confirmedToday ? 1 : 0, fromVoice ? 1 : 0, new Date().toISOString());
    return this.find(Number(info.lastInsertRowid));
  },

  find(id) {
    const row = db.prepare('SELECT * FROM symptoms WHERE id = ?').get(id);
    return row ? toDTO(row) : null;
  },

  update(id, { intensity, daysPresent, confirmedToday }) {
    const cur = db.prepare('SELECT * FROM symptoms WHERE id = ?').get(id);
    if (!cur) return null;
    db.prepare('UPDATE symptoms SET intensity = ?, days_present = ?, confirmed_today = ? WHERE id = ?')
      .run(
        intensity ?? cur.intensity,
        daysPresent ?? cur.days_present,
        (confirmedToday ?? Boolean(cur.confirmed_today)) ? 1 : 0,
        id,
      );
    return this.find(id);
  },

  remove(id) {
    db.prepare('DELETE FROM symptoms WHERE id = ?').run(id);
  },

  /** Replace the whole journal for a user (how the React logger saves). */
  replaceAll(userId, list) {
    db.prepare('DELETE FROM symptoms WHERE user_id = ?').run(userId);
    const stmt = db.prepare(`INSERT INTO symptoms
      (user_id, name, intensity, days_present, confirmed_today, from_voice, logged_at)
      VALUES (?,?,?,?,?,?,?)`);
    for (const s of list) {
      stmt.run(
        userId, s.name, s.intensity || 'mid', s.daysPresent || 1,
        s.confirmedToday ? 1 : 0, s.fromVoice ? 1 : 0, s.loggedAt || new Date().toISOString(),
      );
    }
    return this.all(userId);
  },

  /** Mark every symptom as needing a "still there?" check on the next entry. */
  clearConfirmations(userId) {
    db.prepare('UPDATE symptoms SET confirmed_today = 0 WHERE user_id = ?').run(userId);
    return this.all(userId);
  },

  /** Domain logic: how heavily the journal weighs on the wellbeing score. */
  burden(userId) {
    return this.all(userId).reduce((total, s) => {
      const persistence = Math.min(2, 1 + (s.daysPresent - 1) * 0.12);
      return total + (INTENSITY_WEIGHT[s.intensity] || 10) * persistence + (URGENT.has(s.name) ? 14 : 0);
    }, 0);
  },
};

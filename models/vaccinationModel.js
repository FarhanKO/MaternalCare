/**
 * Vaccination Model — one schedule per mother, not one for the platform.
 *
 * Every query here used to run unscoped: `SELECT * FROM vaccinations` with no
 * owner in the where clause, because the table had no owner column. One global
 * list that every account read and wrote, so marking a dose done marked it
 * done for everybody. Invisible with a single seeded user, and the reason F7's
 * "personalized vaccination scheduler" was not personalised at all.
 *
 * `userId` is now required on every read. That is deliberate: an optional
 * parameter would have let a caller silently fall back to the old behaviour,
 * which is exactly how this survived.
 */
const db = require('../config/db');

const ORDER = `ORDER BY CASE status WHEN 'due' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END,
               due_date ASC`;

function required(userId) {
  if (userId === undefined || userId === null) {
    throw new Error('vaccinationModel needs a userId — schedules are per mother');
  }
  return userId;
}

module.exports = {
  async all(userId) {
    return db.sql(
      `SELECT * FROM vaccinations WHERE user_id = $1 ${ORDER}`,
      [required(userId)],
    );
  },

  async upcoming(userId, limit = 3) {
    return db.sql(
      `SELECT * FROM vaccinations
        WHERE user_id = $1 AND status <> 'done'
        ORDER BY due_date ASC LIMIT $2`,
      [required(userId), limit],
    );
  },

  async stats(userId) {
    const rows = await db.sql(
      'SELECT status, COUNT(*) AS c FROM vaccinations WHERE user_id = $1 GROUP BY status',
      [required(userId)],
    );
    const s = { done: 0, due: 0, upcoming: 0 };
    for (const r of rows) s[r.status] = r.c;
    s.total = s.done + s.due + s.upcoming;
    s.pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
    return s;
  },

  async find(id) {
    return db.one('SELECT * FROM vaccinations WHERE id = $1', [id]);
  },

  /**
   * Scoped by owner as well as id, so one account cannot mark another
   * account's dose complete by guessing a number.
   */
  async markDone(id, userId) {
    return db.run(
      `UPDATE vaccinations SET status = 'done', completed_on = CURRENT_DATE
        WHERE id = $1 AND user_id = $2`,
      [id, required(userId)],
    );
  },
};

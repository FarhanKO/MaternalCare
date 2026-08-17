const db = require('../config/db');

module.exports = {
  async all() {
    return db.sql(`
      SELECT * FROM vaccinations
      ORDER BY CASE status WHEN 'due' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END,
               due_date ASC
    `);
  },

  async upcoming(limit = 3) {
    return db.sql(
      `SELECT * FROM vaccinations WHERE status <> 'done'
       ORDER BY due_date ASC LIMIT $1`,
      [limit],
    );
  },

  async stats() {
    const rows = await db.sql('SELECT status, COUNT(*) AS c FROM vaccinations GROUP BY status');
    const s = { done: 0, due: 0, upcoming: 0 };
    for (const r of rows) s[r.status] = r.c;
    s.total = s.done + s.due + s.upcoming;
    s.pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
    return s;
  },

  async markDone(id) {
    await db.run(
      "UPDATE vaccinations SET status = 'done', completed_on = CURRENT_DATE WHERE id = $1",
      [id],
    );
  },
};

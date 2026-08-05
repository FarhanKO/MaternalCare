const db = require('../config/database');

module.exports = {
  all() {
    return db.prepare(`SELECT * FROM vaccinations
                       ORDER BY CASE status WHEN 'due' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END,
                                due_date ASC`).all();
  },

  upcoming(limit = 3) {
    return db.prepare(`SELECT * FROM vaccinations WHERE status != 'done'
                       ORDER BY due_date ASC LIMIT ?`).all(limit);
  },

  stats() {
    const rows = db.prepare(`SELECT status, COUNT(*) AS c FROM vaccinations GROUP BY status`).all();
    const s = { done: 0, due: 0, upcoming: 0 };
    for (const r of rows) s[r.status] = r.c;
    s.total = s.done + s.due + s.upcoming;
    s.pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
    return s;
  },

  markDone(id) {
    db.prepare(`UPDATE vaccinations SET status = 'done', completed_on = ? WHERE id = ?`)
      .run(new Date().toISOString().slice(0, 10), id);
  },
};

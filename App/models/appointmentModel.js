const db = require('../config/database');

module.exports = {
  doctors({ specialty, availableOnly } = {}) {
    let sql = 'SELECT * FROM doctors';
    const where = [], args = [];
    if (specialty && specialty !== 'All') { where.push('specialty LIKE ?'); args.push(`%${specialty}%`); }
    if (availableOnly) where.push('available = 1');
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY rating DESC';
    return db.prepare(sql).all(...args);
  },

  specialties() {
    return db.prepare('SELECT DISTINCT specialty FROM doctors ORDER BY specialty').all()
             .map(r => r.specialty);
  },

  forUser(userId) {
    return db.prepare(`
      SELECT a.*, d.name AS doctor_name, d.specialty, d.hospital
      FROM appointments a JOIN doctors d ON d.id = a.doctor_id
      WHERE a.user_id = ?
      ORDER BY CASE a.status WHEN 'upcoming' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END, a.date ASC
    `).all(userId);
  },

  upcoming(userId, limit = 3) {
    return db.prepare(`
      SELECT a.*, d.name AS doctor_name, d.specialty, d.hospital
      FROM appointments a JOIN doctors d ON d.id = a.doctor_id
      WHERE a.user_id = ? AND a.status = 'upcoming'
      ORDER BY a.date ASC LIMIT ?`).all(userId, limit);
  },

  book(userId, { doctor_id, date, time, reason }) {
    db.prepare(`INSERT INTO appointments (user_id, doctor_id, date, time, reason, status)
                VALUES (?,?,?,?,?, 'upcoming')`).run(userId, doctor_id, date, time, reason);
  },

  cancel(id) {
    db.prepare(`UPDATE appointments SET status = 'cancelled' WHERE id = ?`).run(id);
  },
};

const db = require('../config/database');

module.exports = {
  find(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },
  current() {
    // Demo session: the seeded mother account
    return db.prepare("SELECT * FROM users WHERE role = 'mother' LIMIT 1").get();
  },
  /** Life stage drives which reading and news the client shows. */
  STAGES: ['pregnant', 'new-mother', 'parent', 'planning', 'general'],

  setStage(id, stage) {
    if (!this.STAGES.includes(stage)) throw new Error(`Unknown stage: ${stage}`);
    db.prepare('UPDATE users SET stage = ? WHERE id = ?').run(stage, id);
    return this.find(id);
  },

  emergencyContacts(userId) {
    return db.prepare('SELECT * FROM emergency_contacts WHERE user_id = ?').all(userId);
  },
};

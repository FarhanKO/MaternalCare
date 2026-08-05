const db = require('../config/database');

module.exports = {
  find(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },
  current() {
    // Demo session: the seeded mother account
    return db.prepare("SELECT * FROM users WHERE role = 'mother' LIMIT 1").get();
  },
  emergencyContacts(userId) {
    return db.prepare('SELECT * FROM emergency_contacts WHERE user_id = ?').all(userId);
  },
};

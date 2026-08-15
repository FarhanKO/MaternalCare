/**
 * SOS Model — raising, fanning out and standing down an emergency alert.
 *
 * Honesty about delivery matters more here than anywhere else in the app, so
 * each recipient records the channel it went out on and whether it actually
 * landed:
 *
 *   in-app        the clinician sees it in their portal now      → alerted
 *   guardian-app  needs the companion app, which is not built    → pending
 *   sms           needs a gateway we do not have                 → pending
 *
 * A screen that claimed every guardian had been reached would be a dangerous
 * lie in exactly the situation where the mother is relying on it.
 */
const db = require('../config/database');
const messageModel = require('./messageModel');

const OPEN = 'active';

const toContact = (c) => ({
  id: String(c.id),
  name: c.name,
  relation: c.relation,
  phone: c.phone,
  /** true once the guardian has the companion app paired */
  appLinked: Boolean(c.app_linked),
});

const toNotification = (n) => ({
  id: String(n.id),
  recipient: n.recipient,
  relation: n.relation || undefined,
  channel: n.channel,
  state: n.state,
  detail: n.detail || undefined,
});

function toAlert(row) {
  const notifications = db
    .prepare('SELECT * FROM sos_notifications WHERE alert_id = ? ORDER BY id')
    .all(row.id)
    .map(toNotification);

  return {
    id: String(row.id),
    patientId: String(row.user_id),
    triggeredAt: row.triggered_at,
    location: row.lat != null && row.lng != null
      ? { lat: row.lat, lng: row.lng, accuracy: row.accuracy ?? undefined }
      : null,
    locationNote: row.location_note || undefined,
    status: row.status,
    closedAt: row.closed_at || undefined,
    closedBy: row.closed_by || undefined,
    notifications,
    reached: notifications.filter((n) => n.state === 'alerted').length,
  };
}

/**
 * Clinicians currently looking after this mother.
 *
 * Deliberately excludes 'completed' — a nutritionist she saw once last year
 * being alarmed for an obstetric emergency is noise, and an alert everybody
 * learns to ignore is worse than no alert.
 */
function cliniciansFor(userId) {
  return db.prepare(`
    SELECT DISTINCT d.id, d.name, d.specialty
    FROM appointments a JOIN doctors d ON d.id = a.doctor_id
    WHERE a.user_id = ? AND a.status IN ('accepted','requested')
  `).all(userId);
}

module.exports = {
  /* --------------------------------------------------------- guardians */

  contacts(userId) {
    return db
      .prepare('SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY id')
      .all(userId)
      .map(toContact);
  },

  addContact(userId, { name, relation, phone }) {
    const label = String(name || '').trim();
    if (!label) throw new Error('A guardian needs a name');
    const info = db
      .prepare('INSERT INTO emergency_contacts (user_id, name, relation, phone) VALUES (?,?,?,?)')
      .run(userId, label, (relation || '').trim() || null, (phone || '').trim() || null);
    return toContact(db.prepare('SELECT * FROM emergency_contacts WHERE id = ?')
      .get(Number(info.lastInsertRowid)));
  },

  removeContact(id, userId) {
    const info = db
      .prepare('DELETE FROM emergency_contacts WHERE id = ? AND user_id = ?')
      .run(id, userId);
    return info.changes > 0;
  },

  /* ------------------------------------------------------------ alerts */

  active(userId) {
    const row = db
      .prepare('SELECT * FROM sos_alerts WHERE user_id = ? AND status = ? ORDER BY id DESC LIMIT 1')
      .get(userId, OPEN);
    return row ? toAlert(row) : null;
  },

  find(id) {
    const row = db.prepare('SELECT * FROM sos_alerts WHERE id = ?').get(id);
    return row ? toAlert(row) : null;
  },

  history(userId, limit = 10) {
    return db
      .prepare('SELECT * FROM sos_alerts WHERE user_id = ? ORDER BY id DESC LIMIT ?')
      .all(userId, limit)
      .map(toAlert);
  },

  /** Every open alert across the caseload — the clinician's red banner. */
  openForDoctor(doctorId) {
    return db.prepare(`
      SELECT s.* FROM sos_alerts s
      WHERE s.status = 'active' AND s.user_id IN (
        SELECT DISTINCT a.user_id FROM appointments a WHERE a.doctor_id = ?
      )
      ORDER BY s.id DESC
    `).all(doctorId).map((row) => {
      const patient = db.prepare('SELECT name FROM users WHERE id = ?').get(row.user_id);
      return { ...toAlert(row), patientName: patient ? patient.name : 'Unknown patient' };
    });
  },

  /**
   * Raise the alert and fan it out. Re-raising while one is already open
   * returns the open one rather than stacking duplicates — a panicking user
   * pressing twice should not create two incidents.
   */
  trigger(userId, { lat, lng, accuracy, locationNote } = {}) {
    const existing = this.active(userId);
    if (existing) return existing;

    const info = db.prepare(`
      INSERT INTO sos_alerts (user_id, triggered_at, lat, lng, accuracy, location_note, status)
      VALUES (?,?,?,?,?,?, 'active')
    `).run(userId, new Date().toISOString(),
      Number.isFinite(lat) ? lat : null,
      Number.isFinite(lng) ? lng : null,
      Number.isFinite(accuracy) ? accuracy : null,
      locationNote || null);

    const alertId = Number(info.lastInsertRowid);
    const addNote = db.prepare(`
      INSERT INTO sos_notifications (alert_id, recipient, relation, channel, state, detail)
      VALUES (?,?,?,?,?,?)
    `);

    const mother = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
    const where = Number.isFinite(lat) && Number.isFinite(lng)
      ? `Location: https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
      : 'Location unavailable.';

    // clinicians: a real in-app alert, and a message in the thread they already read
    for (const doc of cliniciansFor(userId)) {
      addNote.run(alertId, doc.name, doc.specialty, 'in-app', 'alerted',
        'Showing on their clinician portal');
      try {
        messageModel.send(userId, doc.id, 'mother',
          `🚨 EMERGENCY — ${mother ? mother.name : 'Your patient'} raised an SOS. ${where}`);
      } catch {
        // the alert itself must survive a failed message
      }
    }

    // guardians: recorded, but nothing can reach their phone until the
    // companion app exists, so they are queued rather than claimed as sent
    for (const c of this.contacts(userId)) {
      const linked = Boolean(c.app_linked);
      addNote.run(alertId, c.name, c.relation,
        linked ? 'guardian-app' : 'sms',
        'pending',
        linked
          ? 'Will force-alarm once the guardian app ships'
          : 'Needs the guardian app or an SMS gateway');
    }

    return this.find(alertId);
  },

  /** Stand down. `by` is who closed it, so the record says what happened. */
  close(id, userId, status, by) {
    if (!['safe', 'cancelled'].includes(status)) throw new Error(`Cannot close as ${status}`);
    const row = db.prepare('SELECT * FROM sos_alerts WHERE id = ? AND user_id = ?').get(id, userId);
    if (!row) return null;
    if (row.status !== OPEN) return toAlert(row);

    db.prepare('UPDATE sos_alerts SET status = ?, closed_at = ?, closed_by = ? WHERE id = ?')
      .run(status, new Date().toISOString(), by || 'mother', id);

    if (status === 'safe') {
      const mother = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
      for (const doc of cliniciansFor(userId)) {
        try {
          messageModel.send(userId, doc.id, 'mother',
            `✅ Stood down — ${mother ? mother.name : 'your patient'} has marked herself safe.`);
        } catch { /* non-critical */ }
      }
    }
    return this.find(id);
  },
};

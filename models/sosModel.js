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
const crypto = require('crypto');
const db = require('../config/db');
const messageModel = require('./messageModel');

const OPEN = 'active';
const MAX_LOCATION_NOTE = 500;
/** Bangladesh's national emergency line; overridable per account. */
const DEFAULT_EMERGENCY = '999';

const toContact = (c) => ({
  id: String(c.id),
  name: c.name,
  relation: c.relation,
  phone: c.phone,
  /** true once the guardian has the companion app paired */
  appLinked: Boolean(c.app_linked),
  /** their personal link into the guardian app — treat as a credential */
  token: c.access_token,
});

const toNotification = (n) => ({
  id: String(n.id),
  recipient: n.recipient,
  relation: n.relation || undefined,
  channel: n.channel,
  state: n.state,
  detail: n.detail || undefined,
});

/** An alert plus its fan-out, in one query rather than one per alert. */
async function hydrate(rows) {
  if (!rows.length) return [];
  const notes = await db.sql(
    'SELECT * FROM sos_notifications WHERE alert_id = ANY($1::int[]) ORDER BY id',
    [rows.map((r) => Number(r.id))],
  );

  const byAlert = new Map(rows.map((r) => [Number(r.id), []]));
  for (const n of notes) byAlert.get(n.alert_id)?.push(toNotification(n));

  return rows.map((row) => {
    const notifications = byAlert.get(Number(row.id)) ?? [];
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
  });
}

/**
 * Clinicians currently looking after this mother.
 *
 * Deliberately excludes 'completed' — a nutritionist she saw once last year
 * being alarmed for an obstetric emergency is noise, and an alert everybody
 * learns to ignore is worse than no alert.
 */
async function cliniciansFor(userId) {
  return db.sql(`
    SELECT DISTINCT d.id, d.name, d.specialty
    FROM appointments a JOIN doctors d ON d.id = a.doctor_id
    WHERE a.user_id = $1 AND a.status IN ('accepted','requested')
  `, [userId]);
}

module.exports = {
  /* -------------------------------------------------- emergency line */

  async emergencyNumber(userId) {
    const row = await db.one('SELECT emergency_number FROM users WHERE id = $1', [userId]);
    return (row && row.emergency_number) || DEFAULT_EMERGENCY;
  },

  /**
   * Digits and the usual dialling punctuation only — this ends up in a tel:
   * link, so anything else could smuggle in a different scheme. Brackets are
   * allowed because "(02) 5566 7788" is how people write an area code.
   */
  async setEmergencyNumber(userId, value) {
    const cleaned = String(value ?? '').trim();
    if (!cleaned) throw new Error('An emergency number is required');

    const digits = (cleaned.match(/\d/g) || []).length;
    const shaped = /^[+(]?[0-9\s\-()]*$/.test(cleaned);
    // short lines like 999 and 112 are valid; 2 digits is the realistic floor
    if (!shaped || digits < 2 || cleaned.length > 20) {
      throw new Error('That is not a dialable number');
    }

    await db.run('UPDATE users SET emergency_number = $2 WHERE id = $1', [userId, cleaned]);
    return cleaned;
  },

  /* --------------------------------------------------------- guardians */

  async contacts(userId) {
    const rows = await db.sql(
      'SELECT * FROM emergency_contacts WHERE user_id = $1 ORDER BY id', [userId],
    );
    return rows.map(toContact);
  },

  async addContact(userId, { name, relation, phone }) {
    const label = String(name || '').trim();
    if (!label) throw new Error('A guardian needs a name');
    if (label.length > 80) throw new Error('Guardian names must be 80 characters or fewer');
    const relationText = String(relation || '').trim();
    if (relationText.length > 40) throw new Error('Guardian relationships must be 40 characters or fewer');
    const phoneText = String(phone || '').trim();
    if (phoneText.length > 40) throw new Error('Guardian phone numbers must be 40 characters or fewer');

    const row = await db.insert(
      `INSERT INTO emergency_contacts (user_id, name, relation, phone, access_token)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [userId, label, relationText || null, phoneText || null,
        crypto.randomBytes(18).toString('base64url')],
    );
    return toContact(row);
  },

  async removeContact(id, userId) {
    const changed = await db.run(
      'DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2', [id, userId],
    );
    return changed > 0;
  },

  /* ------------------------------------------------------------ alerts */

  async active(userId) {
    const row = await db.one(
      'SELECT * FROM sos_alerts WHERE user_id = $1 AND status = $2 ORDER BY id DESC LIMIT 1',
      [userId, OPEN],
    );
    if (!row) return null;
    const [alert] = await hydrate([row]);
    return alert;
  },

  async find(id) {
    const row = await db.one('SELECT * FROM sos_alerts WHERE id = $1', [id]);
    if (!row) return null;
    const [alert] = await hydrate([row]);
    return alert;
  },

  async history(userId, limit = 10) {
    const rows = await db.sql(
      'SELECT * FROM sos_alerts WHERE user_id = $1 ORDER BY id DESC LIMIT $2',
      [userId, limit],
    );
    return hydrate(rows);
  },

  /** Every open alert across the caseload — the clinician's red banner. */
  async openForDoctor(doctorId) {
    const rows = await db.sql(`
      SELECT s.*, u.name AS patient_name, u.emergency_number
      FROM sos_alerts s
      JOIN users u ON u.id = s.user_id
      WHERE s.status = 'active' AND s.user_id IN (
        SELECT DISTINCT a.user_id FROM appointments a WHERE a.doctor_id = $1
      )
      ORDER BY s.id DESC
    `, [doctorId]);

    const alerts = await hydrate(rows);
    return alerts.map((a, i) => ({
      ...a,
      patientName: rows[i].patient_name ?? 'Unknown patient',
      // her line, not a hardcoded one — the clinic may be in another country
      emergencyNumber: rows[i].emergency_number || DEFAULT_EMERGENCY,
    }));
  },

  /**
   * Raise the alert and fan it out. Re-raising while one is already open
   * returns the open one rather than stacking duplicates — a panicking user
   * pressing twice should not create two incidents.
   */
  async trigger(userId, { lat, lng, accuracy, locationNote } = {}) {
    const note = String(locationNote || '').trim();
    if (note.length > MAX_LOCATION_NOTE) throw new Error('SOS location notes must be 500 characters or fewer');
    const existing = await this.active(userId);
    if (existing) return existing;

    const mother = await db.one('SELECT name FROM users WHERE id = $1', [userId]);
    const clinicians = await cliniciansFor(userId);
    const contacts = await this.contacts(userId);

    const alertId = await db.tx(async (t) => {
      const created = await t.one(
        `INSERT INTO sos_alerts (user_id, triggered_at, lat, lng, accuracy, location_note, status)
         VALUES ($1,$2,$3,$4,$5,$6,'active') RETURNING id`,
        [userId, new Date().toISOString(),
          Number.isFinite(lat) ? lat : null,
          Number.isFinite(lng) ? lng : null,
          Number.isFinite(accuracy) ? accuracy : null,
          note || null],
      );

      for (const doc of clinicians) {
        await t.run(
          `INSERT INTO sos_notifications (alert_id, recipient, relation, channel, state, detail)
           VALUES ($1,$2,$3,'in-app','alerted','Showing on their clinician portal')`,
          [created.id, doc.name, doc.specialty],
        );
      }

      // guardians: recorded, but nothing can reach their phone until the
      // companion app exists, so they are queued rather than claimed as sent
      for (const c of contacts) {
        await t.run(
          `INSERT INTO sos_notifications (alert_id, recipient, relation, channel, state, detail)
           VALUES ($1,$2,$3,$4,'pending',$5)`,
          [created.id, c.name, c.relation,
            c.appLinked ? 'guardian-app' : 'sms',
            c.appLinked
              ? 'Will force-alarm once the guardian app ships'
              : 'Needs the guardian app or an SMS gateway'],
        );
      }
      return created.id;
    });

    // messaging sits outside the transaction: a failed send must not undo
    // the alert itself
    const where = Number.isFinite(lat) && Number.isFinite(lng)
      ? `Location: https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
      : 'Location unavailable.';
    for (const doc of clinicians) {
      try {
        await messageModel.send(userId, doc.id, 'mother',
          `🚨 EMERGENCY — ${mother ? mother.name : 'Your patient'} raised an SOS. ${where}`);
      } catch { /* the alert itself must survive a failed message */ }
    }

    return this.find(alertId);
  },

  /** Stand down. `by` is who closed it, so the record says what happened. */
  async close(id, userId, status, by) {
    if (!['safe', 'cancelled'].includes(status)) throw new Error(`Cannot close as ${status}`);
    const row = await db.one(
      'SELECT * FROM sos_alerts WHERE id = $1 AND user_id = $2', [id, userId],
    );
    if (!row) return null;
    if (row.status !== OPEN) return this.find(id);

    await db.run(
      'UPDATE sos_alerts SET status = $2, closed_at = now(), closed_by = $3 WHERE id = $1',
      [id, status, by || 'mother'],
    );

    if (status === 'safe') {
      const mother = await db.one('SELECT name FROM users WHERE id = $1', [userId]);
      for (const doc of await cliniciansFor(userId)) {
        try {
          await messageModel.send(userId, doc.id, 'mother',
            `✅ Stood down — ${mother ? mother.name : 'your patient'} has marked herself safe.`);
        } catch { /* non-critical */ }
      }
    }
    return this.find(id);
  },
};

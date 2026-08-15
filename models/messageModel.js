/**
 * Message Model — the conversation between one mother and one doctor.
 *
 * A thread is identified by the pair (mother, doctor); there is no separate
 * conversation table because a mother only ever has one running conversation
 * with a given clinician. `sender` says which end wrote each line, and
 * `read_at` is set when the *other* end opens the thread.
 */
const db = require('../config/database');

const SENDERS = ['mother', 'doctor'];
/** Long enough for real clinical advice, short enough to stay a message. */
const MAX_BODY = 2000;

const toDTO = (m) => ({
  id: String(m.id),
  doctorId: String(m.doctor_id),
  patientId: String(m.user_id),
  sender: m.sender,
  body: m.body,
  sentAt: m.sent_at,
  read: Boolean(m.read_at),
});

module.exports = {
  SENDERS,

  /** Every line in one conversation, oldest first. */
  thread(userId, doctorId) {
    return db.prepare(
      'SELECT * FROM messages WHERE user_id = ? AND doctor_id = ? ORDER BY sent_at ASC, id ASC',
    ).all(userId, doctorId).map(toDTO);
  },

  send(userId, doctorId, sender, body) {
    if (!SENDERS.includes(sender)) throw new Error(`Unknown sender: ${sender}`);
    const text = String(body ?? '').trim();
    if (!text) throw new Error('A message cannot be empty');
    if (text.length > MAX_BODY) throw new Error('That message is too long');

    const info = db.prepare(
      'INSERT INTO messages (user_id, doctor_id, sender, body, sent_at) VALUES (?,?,?,?,?)',
    ).run(userId, doctorId, sender, text, new Date().toISOString());

    return toDTO(db.prepare('SELECT * FROM messages WHERE id = ?').get(Number(info.lastInsertRowid)));
  },

  /**
   * Mark what the *other* side wrote as read. Opening your own thread should
   * never clear the badge on lines you sent yourself.
   */
  markRead(userId, doctorId, reader) {
    const from = reader === 'mother' ? 'doctor' : 'mother';
    db.prepare(
      'UPDATE messages SET read_at = ? WHERE user_id = ? AND doctor_id = ? AND sender = ? AND read_at IS NULL',
    ).run(new Date().toISOString(), userId, doctorId, from);
  },

  /** Unread lines waiting for one side of one thread. */
  unread(userId, doctorId, reader) {
    const from = reader === 'mother' ? 'doctor' : 'mother';
    return db.prepare(
      'SELECT COUNT(*) AS c FROM messages WHERE user_id = ? AND doctor_id = ? AND sender = ? AND read_at IS NULL',
    ).get(userId, doctorId, from).c;
  },

  /** Every doctor this mother has a conversation with, most recent first. */
  threadsForUser(userId) {
    const rows = db.prepare(`
      SELECT m.doctor_id, d.name, d.specialty, d.hospital,
             MAX(m.sent_at) AS last_at,
             COUNT(*) AS total
      FROM messages m JOIN doctors d ON d.id = m.doctor_id
      WHERE m.user_id = ?
      GROUP BY m.doctor_id
      ORDER BY last_at DESC
    `).all(userId);

    return rows.map((r) => {
      const last = db.prepare(
        'SELECT * FROM messages WHERE user_id = ? AND doctor_id = ? ORDER BY sent_at DESC, id DESC LIMIT 1',
      ).get(userId, r.doctor_id);
      return {
        doctorId: String(r.doctor_id),
        doctorName: r.name,
        specialty: r.specialty,
        hospital: r.hospital,
        lastMessage: last ? toDTO(last) : null,
        total: r.total,
        unread: this.unread(userId, r.doctor_id, 'mother'),
      };
    });
  },

  /** Every mother this doctor is talking to, most recent first. */
  threadsForDoctor(doctorId) {
    const rows = db.prepare(`
      SELECT m.user_id, u.name,
             MAX(m.sent_at) AS last_at,
             COUNT(*) AS total
      FROM messages m JOIN users u ON u.id = m.user_id
      WHERE m.doctor_id = ?
      GROUP BY m.user_id
      ORDER BY last_at DESC
    `).all(doctorId);

    return rows.map((r) => {
      const last = db.prepare(
        'SELECT * FROM messages WHERE user_id = ? AND doctor_id = ? ORDER BY sent_at DESC, id DESC LIMIT 1',
      ).get(r.user_id, doctorId);
      return {
        patientId: String(r.user_id),
        patientName: r.name,
        lastMessage: last ? toDTO(last) : null,
        total: r.total,
        unread: this.unread(r.user_id, doctorId, 'doctor'),
      };
    });
  },

  /** Total unread across every thread — drives the dock badge. */
  unreadForDoctor(doctorId) {
    return db.prepare(
      "SELECT COUNT(*) AS c FROM messages WHERE doctor_id = ? AND sender = 'mother' AND read_at IS NULL",
    ).get(doctorId).c;
  },

  unreadForUser(userId) {
    return db.prepare(
      "SELECT COUNT(*) AS c FROM messages WHERE user_id = ? AND sender = 'doctor' AND read_at IS NULL",
    ).get(userId).c;
  },
};

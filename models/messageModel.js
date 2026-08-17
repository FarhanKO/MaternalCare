/**
 * Message Model — the conversation between one mother and one doctor.
 *
 * A thread is identified by the pair (mother, doctor); there is no separate
 * conversation table because a mother only ever has one running conversation
 * with a given clinician. `sender` says which end wrote each line, and
 * `read_at` is set when the *other* end opens the thread.
 */
const db = require('../config/db');

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

/**
 * One thread summary per counterpart, with the last message and unread count
 * resolved in the same statement.
 *
 * The previous version ran the list query, then two more per thread. DISTINCT
 * ON gives the newest row per group in one pass, which is a Postgres feature
 * with no SQLite equivalent — it is why this could not be done before.
 */
const THREADS = `
  SELECT DISTINCT ON (m.%GROUP%)
         m.%GROUP% AS counterpart_id,
         m.id, m.sender, m.body, m.sent_at, m.read_at,
         (SELECT count(*) FROM messages c
           WHERE c.user_id = m.user_id AND c.doctor_id = m.doctor_id
             AND c.sender = $2 AND c.read_at IS NULL)      AS unread,
         (SELECT count(*) FROM messages c
           WHERE c.user_id = m.user_id AND c.doctor_id = m.doctor_id) AS total
  FROM messages m
  WHERE m.%OWNER% = $1
  ORDER BY m.%GROUP%, m.sent_at DESC, m.id DESC
`;

module.exports = {
  SENDERS,

  /** Every line in one conversation, oldest first. */
  async thread(userId, doctorId) {
    const rows = await db.sql(
      `SELECT * FROM messages WHERE user_id = $1 AND doctor_id = $2
       ORDER BY sent_at ASC, id ASC`,
      [userId, doctorId],
    );
    return rows.map(toDTO);
  },

  async send(userId, doctorId, sender, body) {
    if (!SENDERS.includes(sender)) throw new Error(`Unknown sender: ${sender}`);
    const text = String(body ?? '').trim();
    if (!text) throw new Error('A message cannot be empty');
    if (text.length > MAX_BODY) throw new Error('That message is too long');

    const row = await db.insert(
      `INSERT INTO messages (user_id, doctor_id, sender, body, sent_at)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [userId, doctorId, sender, text, new Date().toISOString()],
    );
    return toDTO(row);
  },

  /**
   * Mark what the *other* side wrote as read. Opening your own thread should
   * never clear the badge on lines you sent yourself.
   */
  async markRead(userId, doctorId, reader) {
    const from = reader === 'mother' ? 'doctor' : 'mother';
    await db.run(
      `UPDATE messages SET read_at = now()
       WHERE user_id = $1 AND doctor_id = $2 AND sender = $3 AND read_at IS NULL`,
      [userId, doctorId, from],
    );
  },

  /** Unread lines waiting for one side of one thread. */
  async unread(userId, doctorId, reader) {
    const from = reader === 'mother' ? 'doctor' : 'mother';
    const row = await db.one(
      `SELECT count(*) AS c FROM messages
       WHERE user_id = $1 AND doctor_id = $2 AND sender = $3 AND read_at IS NULL`,
      [userId, doctorId, from],
    );
    return row.c;
  },

  /** Every doctor this mother has a conversation with, most recent first. */
  async threadsForUser(userId) {
    const sql = THREADS.replaceAll('%GROUP%', 'doctor_id').replaceAll('%OWNER%', 'user_id');
    const rows = await db.sql(
      `SELECT t.*, d.name, d.specialty, d.hospital
       FROM (${sql}) t
       JOIN doctors d ON d.id = t.counterpart_id
       ORDER BY t.sent_at DESC`,
      [userId, 'doctor'],
    );

    return rows.map((r) => ({
      doctorId: String(r.counterpart_id),
      doctorName: r.name,
      specialty: r.specialty,
      hospital: r.hospital,
      lastMessage: {
        id: String(r.id),
        doctorId: String(r.counterpart_id),
        patientId: String(userId),
        sender: r.sender,
        body: r.body,
        sentAt: r.sent_at,
        read: Boolean(r.read_at),
      },
      total: r.total,
      unread: r.unread,
    }));
  },

  /** Every mother this doctor is talking to, most recent first. */
  async threadsForDoctor(doctorId) {
    const sql = THREADS.replaceAll('%GROUP%', 'user_id').replaceAll('%OWNER%', 'doctor_id');
    const rows = await db.sql(
      `SELECT t.*, u.name
       FROM (${sql}) t
       JOIN users u ON u.id = t.counterpart_id
       ORDER BY t.sent_at DESC`,
      [doctorId, 'mother'],
    );

    return rows.map((r) => ({
      patientId: String(r.counterpart_id),
      patientName: r.name,
      lastMessage: {
        id: String(r.id),
        doctorId: String(doctorId),
        patientId: String(r.counterpart_id),
        sender: r.sender,
        body: r.body,
        sentAt: r.sent_at,
        read: Boolean(r.read_at),
      },
      total: r.total,
      unread: r.unread,
    }));
  },

  /** Total unread across every thread — drives the dock badge. */
  async unreadForDoctor(doctorId) {
    const row = await db.one(
      "SELECT count(*) AS c FROM messages WHERE doctor_id = $1 AND sender = 'mother' AND read_at IS NULL",
      [doctorId],
    );
    return row.c;
  },

  async unreadForUser(userId) {
    const row = await db.one(
      "SELECT count(*) AS c FROM messages WHERE user_id = $1 AND sender = 'doctor' AND read_at IS NULL",
      [userId],
    );
    return row.c;
  },
};

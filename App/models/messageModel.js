/**
 * Message Model — the conversation between one mother and one doctor.
 *
 * A thread is identified by the pair (mother, doctor); there is no separate
 * conversation table because a mother only ever has one running conversation
 * with a given clinician. `sender` says which end wrote each line, and
 * `read_at` is set when the *other* end opens the thread.
 */
const db = require('../config/db');

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SENDERS = ['mother', 'doctor'];
/** Long enough for real clinical advice, short enough to stay a message. */
const MAX_BODY = 2000;

const KINDS = ['text', 'image', 'call-request', 'call-link'];

/** Photographs sent in a thread live beside the uploaded documents. */
const UPLOAD_DIR = path.join(__dirname, '..', 'data', 'uploads', 'messages');
const MIME_EXT = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/heic': 'heic',
};
/** A phone photo, not a scan — anything larger is a mistake worth refusing. */
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/**
 * Anything that could be a joining link.
 *
 * Deliberately broad. The rule it enforces is that the *clinician* schedules
 * the call, so a false positive costs a mother one rephrased sentence, while
 * a false negative sends her to a meeting nobody is hosting. Bare domains and
 * the obvious apps are caught alongside real URLs.
 */
const LINK_RE = new RegExp(
  [
    'https?://',
    'www\\.',
    '\\b[a-z0-9-]+\\.(?:com|net|org|io|me|app|link|zoom|us|co)\\b',
    '\\b(?:zoom|meet\\.google|teams\\.microsoft|wa\\.me|whatsapp|messenger|m\\.me|skype|discord)\\b',
  ].join('|'),
  'i',
);

/** Thrown when a mother tries to send a joining link herself. */
class LinkNotAllowedError extends Error {
  constructor() {
    super('Links cannot be sent from here');
    this.code = 'LINK_NOT_ALLOWED';
  }
}

class ChatClosedError extends Error {
  constructor(message) {
    super(message);
    this.code = 'CHAT_CLOSED';
  }
}

const toDTO = (m) => ({
  id: String(m.id),
  doctorId: String(m.doctor_id),
  patientId: String(m.user_id),
  sender: m.sender,
  body: m.body,
  sentAt: m.sent_at,
  read: Boolean(m.read_at),
  kind: m.kind || 'text',
  /** served from /api/messages/attachments/:file, never inlined into the list */
  imageUrl: m.file_name ? `/messages/attachments/${m.file_name}` : undefined,
});

/** data: URL → bytes, refusing anything that is not an image we can store. */
function decodeImage(dataUrl) {
  const match = /^data:([\w./+-]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!match) throw new Error('That does not look like an image');
  const [, mime, b64] = match;
  if (!MIME_EXT[mime]) throw new Error(`${mime} images are not supported`);

  const buffer = Buffer.from(b64, 'base64');
  if (!buffer.length) throw new Error('That image is empty');
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error('That image is too large — under 6 MB please');
  return { mime, buffer };
}

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
  KINDS,
  LinkNotAllowedError,
  ChatClosedError,
  LINK_RE,

  /** Every line in one conversation, oldest first. */
  async thread(userId, doctorId) {
    const rows = await db.sql(
      `SELECT * FROM messages WHERE user_id = $1 AND doctor_id = $2
       ORDER BY sent_at ASC, id ASC`,
      [userId, doctorId],
    );
    return rows.map(toDTO);
  },

  /**
   * Write one line into a thread.
   *
   * `kind` decides what it is. The one rule enforced here rather than in the
   * UI: a mother may not send a joining link. Calls are arranged by the
   * clinician, so a link from her end is either a mistake or someone else
   * steering her somewhere — and a check that only lives in the browser is
   * not a rule, it is a suggestion.
   */
  async send(userId, doctorId, sender, body, { kind = 'text', image } = {}) {
    if (!SENDERS.includes(sender)) throw new Error(`Unknown sender: ${sender}`);
    if (!KINDS.includes(kind)) throw new Error(`Unknown message kind: ${kind}`);

    const text = String(body ?? '').trim();
    if (kind !== 'image' && !text) throw new Error('A message cannot be empty');
    if (text.length > MAX_BODY) throw new Error('That message is too long');

    if (sender === 'mother' && kind !== 'image' && LINK_RE.test(text)) {
      throw new LinkNotAllowedError();
    }

    let fileName = null;
    let mime = null;
    if (kind === 'image') {
      const decoded = decodeImage(image);
      mime = decoded.mime;
      fileName = `${crypto.randomUUID()}.${MIME_EXT[mime]}`;
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      fs.writeFileSync(path.join(UPLOAD_DIR, fileName), decoded.buffer);
    }

    const row = await db.insert(
      `INSERT INTO messages (user_id, doctor_id, sender, body, sent_at, kind, file_name, mime)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [userId, doctorId, sender, text, new Date().toISOString(), kind, fileName, mime],
    );
    return toDTO(row);
  },

  /** Absolute path of a stored attachment, or null. No traversal. */
  attachmentPath(fileName) {
    if (!/^[\w.-]+$/.test(String(fileName || ''))) return null;
    const full = path.join(UPLOAD_DIR, fileName);
    return fs.existsSync(full) ? full : null;
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
      `SELECT t.*, d.name, d.specialty, d.qualification
       FROM (${sql}) t
       JOIN doctors d ON d.id = t.counterpart_id
       ORDER BY t.sent_at DESC`,
      [userId, 'doctor'],
    );

    return rows.map((r) => ({
      doctorId: String(r.counterpart_id),
      doctorName: r.name,
      specialty: r.specialty,
      qualification: r.qualification || '',
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

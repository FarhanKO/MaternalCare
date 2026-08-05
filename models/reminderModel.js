/**
 * Reminder Model — appointments & reminders created by the mother.
 * Kinds: medicine | doctor | test | exercise
 */
const db = require('../config/database');

const KINDS = ['medicine', 'doctor', 'test', 'exercise'];
const REPEATS = ['once', 'daily', 'weekly'];

const toDTO = (r) => ({
  id: String(r.id),
  kind: r.kind,
  title: r.title,
  note: r.note || undefined,
  at: r.due_at,
  repeat: r.repeat,
});

module.exports = {
  KINDS,

  /** Soonest first — the ordering the dashboard card relies on. */
  all(userId) {
    return db
      .prepare('SELECT * FROM reminders WHERE user_id = ? ORDER BY due_at ASC')
      .all(userId)
      .map(toDTO);
  },

  /** Only what is still ahead (keeps the last hour visible). */
  upcoming(userId) {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    return db
      .prepare('SELECT * FROM reminders WHERE user_id = ? AND due_at >= ? ORDER BY due_at ASC')
      .all(userId, cutoff)
      .map(toDTO);
  },

  find(id) {
    const row = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
    return row ? toDTO(row) : null;
  },

  create(userId, { kind, title, note, at, repeat = 'once' }) {
    if (!KINDS.includes(kind)) throw new Error(`Unknown reminder kind: ${kind}`);
    if (!REPEATS.includes(repeat)) throw new Error(`Unknown repeat: ${repeat}`);
    if (!title || !at) throw new Error('Reminder needs a title and a due time');
    const info = db
      .prepare('INSERT INTO reminders (user_id, kind, title, note, due_at, repeat) VALUES (?,?,?,?,?,?)')
      .run(userId, kind, title, note || null, at, repeat);
    return this.find(Number(info.lastInsertRowid));
  },

  remove(id) {
    db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
  },

  /** The single next thing due — surfaced on the dashboard card. */
  next(userId) {
    return this.upcoming(userId)[0] || null;
  },
};

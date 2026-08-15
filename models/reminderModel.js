/**
 * Reminder Model — appointments & reminders created by the mother.
 * Kinds: medicine | doctor | test | exercise
 */
const db = require('../config/database');

const KINDS = ['medicine', 'doctor', 'test', 'exercise', 'vaccination'];
const REPEATS = ['once', 'daily', 'weekly'];

const toDTO = (r) => ({
  id: String(r.id),
  kind: r.kind,
  title: r.title,
  note: r.note || undefined,
  at: r.due_at,
  repeat: r.repeat,
  // set when a clinician scheduled this for the mother
  assignedBy: r.assigned_by || undefined,
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

  create(userId, { kind, title, note, at, repeat = 'once', assignedBy = null }) {
    if (!KINDS.includes(kind)) throw new Error(`Unknown reminder kind: ${kind}`);
    if (!REPEATS.includes(repeat)) throw new Error(`Unknown repeat: ${repeat}`);
    if (!title || !at) throw new Error('Reminder needs a title and a due time');
    const info = db
      .prepare('INSERT INTO reminders (user_id, kind, title, note, due_at, repeat, assigned_by) VALUES (?,?,?,?,?,?,?)')
      .run(userId, kind, title, note || null, at, repeat, assignedBy);
    return this.find(Number(info.lastInsertRowid));
  },

  /** Scoped to the owner so one account cannot delete another's reminders. */
  remove(id, userId) {
    if (userId === undefined) {
      db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
      return;
    }
    db.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ?').run(id, userId);
  },

  /** The single next thing due — surfaced on the dashboard card. */
  next(userId) {
    return this.upcoming(userId)[0] || null;
  },
};

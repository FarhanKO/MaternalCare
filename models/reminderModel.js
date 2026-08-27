/**
 * Reminder Model — appointments & reminders created by the mother, or
 * scheduled for her by a clinician.
 */
const db = require('../config/db');

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
  async all(userId) {
    const rows = await db.sql(
      'SELECT * FROM reminders WHERE user_id = $1 ORDER BY due_at ASC', [userId],
    );
    return rows.map(toDTO);
  },

  /** Only what is still ahead, keeping the last hour visible. */
  async upcoming(userId) {
    const rows = await db.sql(
      `SELECT * FROM reminders
       WHERE user_id = $1 AND due_at >= now() - interval '1 hour'
       ORDER BY due_at ASC`,
      [userId],
    );
    return rows.map(toDTO);
  },

  async find(id) {
    const row = await db.one('SELECT * FROM reminders WHERE id = $1', [id]);
    return row ? toDTO(row) : null;
  },

  async create(userId, { kind, title, note, at, repeat = 'once', assignedBy = null }) {
    if (!KINDS.includes(kind)) throw new Error(`Unknown reminder kind: ${kind}`);
    if (!REPEATS.includes(repeat)) throw new Error(`Unknown repeat: ${repeat}`);
    if (!title || !at) throw new Error('Reminder needs a title and a due time');
    const titleText = String(title).trim();
    const noteText = String(note || '').trim();
    if (titleText.length > 160) throw new Error('Reminder titles must be 160 characters or fewer');
    if (noteText.length > 1000) throw new Error('Reminder notes must be 1,000 characters or fewer');
    const assignedText = String(assignedBy || '').trim();
    if (assignedText.length > 80) throw new Error('The assigning clinician name is too long');

    const row = await db.insert(
      `INSERT INTO reminders (user_id, kind, title, note, due_at, repeat, assigned_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [userId, kind, titleText, noteText || null, at, repeat, assignedText || null],
    );
    return toDTO(row);
  },

  /** Scoped to the owner so one account cannot delete another's reminders. */
  async remove(id, userId) {
    if (userId === undefined) {
      await db.run('DELETE FROM reminders WHERE id = $1', [id]);
      return;
    }
    await db.run('DELETE FROM reminders WHERE id = $1 AND user_id = $2', [id, userId]);
  },

  /** The single next thing due — surfaced on the dashboard card. */
  async next(userId) {
    const [first] = await this.upcoming(userId);
    return first || null;
  },
};

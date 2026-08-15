/**
 * Appointment Model — a mother asks, a doctor answers.
 *
 * An appointment is never created as a settled fact. It starts as a request
 * the doctor can accept or decline, so the mother's screen can honestly show
 * "waiting for Dr. X" rather than implying a booking that nobody agreed to.
 *
 * Lifecycle: requested → accepted | declined
 *                     → cancelled (by the mother, before an answer)
 *            accepted → completed
 */
const db = require('../config/database');
const doctorModel = require('./doctorModel');

const OPEN = ['requested', 'accepted'];
const DAY = 86400000;

// Calendar dates are local to the clinic. toISOString() would shift the day in
// any timezone ahead of UTC, which silently offered slots in the past.
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayISO = () => iso(new Date());

/** Thrown when the chosen time has gone; carries what is still free. */
class SlotTakenError extends Error {
  constructor(alternatives) {
    super('That time has just been taken');
    this.code = 'SLOT_TAKEN';
    this.alternatives = alternatives;
  }
}

class NotBookableError extends Error {
  constructor(reason) {
    super(reason);
    this.code = 'NOT_BOOKABLE';
  }
}

function takenTimes(doctorId, date) {
  const rows = db.prepare(
    `SELECT time FROM appointments
     WHERE doctor_id = ? AND date = ? AND status IN ('requested','accepted')`,
  ).all(doctorId, date);
  return new Set(rows.map((r) => r.time));
}

/** Slots still free on a day, with today's already-passed times removed. */
function freeSlots(doctorId, date) {
  const taken = takenTimes(doctorId, date);
  const isToday = date === todayISO();
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();

  return doctorModel.SLOT_TIMES.filter((t) => {
    if (taken.has(t)) return false;
    if (!isToday) return true;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m > nowMins + 30; // half an hour's notice
  });
}

/** The next few working days that still have room — used to offer a way out. */
function nextOpenings(doctorId, fromDate, days = 14, limit = 6) {
  const start = new Date(`${fromDate}T00:00:00`);
  const out = [];
  for (let i = 0; i < days && out.length < limit; i += 1) {
    const d = new Date(start.getTime() + i * DAY);
    if (d.getDay() === 0) continue; // clinic closed Sunday
    for (const time of freeSlots(doctorId, iso(d))) {
      out.push({ date: iso(d), time });
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** How many unanswered requests this doctor received before this one. */
function queuePosition(row) {
  if (row.status !== 'requested') return 0;
  return db.prepare(
    `SELECT COUNT(*) AS c FROM appointments
     WHERE doctor_id = ? AND status = 'requested' AND requested_at < ?`,
  ).get(row.doctor_id, row.requested_at).c + 1;
}

/** Days a request has gone unanswered — drives the "still waiting" nudge. */
function waitingDays(row) {
  if (row.status !== 'requested' || !row.requested_at) return 0;
  return Math.floor((Date.now() - new Date(row.requested_at).getTime()) / DAY);
}

function toDTO(row) {
  const doctor = db.prepare('SELECT name, specialty, hospital FROM doctors WHERE id = ?').get(row.doctor_id);
  return {
    id: String(row.id),
    doctorId: String(row.doctor_id),
    doctorName: doctor ? doctor.name : 'Unknown clinician',
    specialty: doctor ? doctor.specialty : '',
    hospital: doctor ? doctor.hospital : '',
    patientId: String(row.user_id),
    date: row.date,
    time: row.time,
    reason: row.reason,
    status: row.status,
    note: row.note || undefined,
    requestedAt: row.requested_at || undefined,
    respondedAt: row.responded_at || undefined,
    queuePosition: queuePosition(row),
    waitingDays: waitingDays(row),
  };
}

module.exports = {
  SlotTakenError,
  NotBookableError,
  freeSlots,
  nextOpenings,

  /** Free times for a doctor on a given day. */
  slots(doctorId, date) {
    return { date, times: freeSlots(doctorId, date) };
  },

  /* ------------------------------------------------ server-rendered views
   * The EJS pages (routes/web.js) render raw joined rows. They predate the
   * request flow and are kept working alongside it.
   */

  doctors({ specialty, availableOnly } = {}) {
    let sql = 'SELECT * FROM doctors';
    const where = [];
    const args = [];
    if (specialty && specialty !== 'All') { where.push('specialty LIKE ?'); args.push(`%${specialty}%`); }
    if (availableOnly) where.push('available = 1');
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY rating DESC';
    return db.prepare(sql).all(...args);
  },

  specialties() {
    return db.prepare('SELECT DISTINCT specialty FROM doctors ORDER BY specialty').all()
      .map((r) => r.specialty);
  },

  forUser(userId) {
    return db.prepare(`
      SELECT a.*, d.name AS doctor_name, d.specialty, d.hospital
      FROM appointments a JOIN doctors d ON d.id = a.doctor_id
      WHERE a.user_id = ?
      ORDER BY CASE a.status WHEN 'requested' THEN 0 WHEN 'accepted' THEN 1
                             WHEN 'completed' THEN 2 ELSE 3 END, a.date ASC
    `).all(userId);
  },

  upcoming(userId, limit = 3) {
    return db.prepare(`
      SELECT a.*, d.name AS doctor_name, d.specialty, d.hospital
      FROM appointments a JOIN doctors d ON d.id = a.doctor_id
      WHERE a.user_id = ? AND a.status = 'accepted'
      ORDER BY a.date ASC LIMIT ?`).all(userId, limit);
  },

  /** Booked at the desk, so it is confirmed the moment it is written. */
  book(userId, { doctor_id, date, time, reason }) {
    db.prepare(`INSERT INTO appointments (user_id, doctor_id, date, time, reason, status, requested_at)
                VALUES (?,?,?,?,?, 'accepted', ?)`)
      .run(userId, doctor_id, date, time, reason, new Date().toISOString());
  },

  cancel(id) {
    db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(id);
  },

  /* --------------------------------------------------- the request flow */

  /** The mother's own requests, shaped for the React client. */
  requestsFor(userId) {
    return db.prepare('SELECT * FROM appointments WHERE user_id = ? ORDER BY date ASC, time ASC')
      .all(userId).map(toDTO);
  },

  /** A doctor's inbox — oldest unanswered request first. */
  forDoctor(doctorId) {
    return db.prepare(
      `SELECT * FROM appointments WHERE doctor_id = ?
       ORDER BY CASE status WHEN 'requested' THEN 0 ELSE 1 END, requested_at ASC`,
    ).all(doctorId).map(toDTO);
  },

  find(id) {
    const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    return row ? toDTO(row) : null;
  },

  /**
   * Send a request. Refuses when the doctor cannot take her at all, and when
   * the slot went while she was choosing — in both cases with somewhere to go
   * next, because a bare error leaves her stuck.
   */
  request(userId, doctorId, { date, time, reason }) {
    const doctor = doctorModel.find(doctorId);
    if (!doctor) throw new NotBookableError('That clinician is no longer listed');
    if (doctor.status === 'away') throw new NotBookableError(`${doctor.name} is on leave right now`);
    if (!doctor.bookable) throw new NotBookableError(`${doctor.name}'s list is full`);
    if (!date || !time) throw new Error('A request needs a date and a time');
    if (date < todayISO()) throw new Error('That date has passed');

    if (!freeSlots(doctorId, date).includes(time)) {
      throw new SlotTakenError(nextOpenings(doctorId, date));
    }

    // one open request per doctor keeps the queue honest
    const dup = db.prepare(
      `SELECT 1 FROM appointments WHERE user_id = ? AND doctor_id = ? AND status = 'requested'`,
    ).get(userId, doctorId);
    if (dup) throw new NotBookableError(`You already have a request waiting with ${doctor.name}`);

    const info = db.prepare(
      `INSERT INTO appointments (user_id, doctor_id, date, time, reason, status, requested_at)
       VALUES (?,?,?,?,?,'requested',?)`,
    ).run(userId, doctorId, date, time, reason || 'Antenatal appointment', new Date().toISOString());

    return this.find(Number(info.lastInsertRowid));
  },

  /** The doctor answers. A decline carries a reason the mother will read. */
  respond(id, status, note) {
    if (!['accepted', 'declined'].includes(status)) throw new Error(`Cannot set status ${status}`);
    const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    if (!row) return null;
    if (row.status !== 'requested') throw new Error('That request has already been answered');

    db.prepare('UPDATE appointments SET status = ?, note = ?, responded_at = ? WHERE id = ?')
      .run(status, note || null, new Date().toISOString(), id);
    return this.find(id);
  },

  /** The mother withdraws, which frees the slot again. */
  withdraw(id, userId) {
    const row = db.prepare('SELECT * FROM appointments WHERE id = ? AND user_id = ?').get(id, userId);
    if (!row) return null;
    if (!OPEN.includes(row.status)) throw new Error('That appointment is already closed');
    db.prepare("UPDATE appointments SET status = 'cancelled', responded_at = ? WHERE id = ?")
      .run(new Date().toISOString(), id);
    return this.find(id);
  },
};

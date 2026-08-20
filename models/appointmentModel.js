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
const crypto = require('crypto');
const db = require('../config/db');
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

async function takenTimes(doctorId, date) {
  const rows = await db.sql(
    `SELECT time FROM appointments
     WHERE doctor_id = $1 AND date = $2 AND status IN ('requested','accepted')`,
    [doctorId, date],
  );
  return new Set(rows.map((r) => r.time));
}

/** Slots still free on a day, with today's already-passed times removed. */
async function freeSlots(doctorId, date) {
  const taken = await takenTimes(doctorId, date);
  const isToday = date === todayISO();
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  return doctorModel.SLOT_TIMES.filter((t) => {
    if (taken.has(t)) return false;
    if (!isToday) return true;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m > nowMins + 30; // half an hour's notice
  });
}

/**
 * The next few working days that still have room — used to offer a way out.
 *
 * Every taken slot in the window comes back in one query, rather than one
 * query per day as before.
 */
async function nextOpenings(doctorId, fromDate, days = 14, limit = 6) {
  const start = new Date(`${fromDate}T00:00:00`);
  const end = new Date(start.getTime() + days * DAY);

  const rows = await db.sql(
    `SELECT date, time FROM appointments
     WHERE doctor_id = $1 AND status IN ('requested','accepted')
       AND date >= $2 AND date < $3`,
    [doctorId, iso(start), iso(end)],
  );
  const taken = new Set(rows.map((r) => `${r.date} ${r.time}`));

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const out = [];

  for (let i = 0; i < days && out.length < limit; i += 1) {
    const d = new Date(start.getTime() + i * DAY);
    if (d.getDay() === 0) continue;                 // clinic closed Sunday
    const date = iso(d);
    for (const time of doctorModel.SLOT_TIMES) {
      if (taken.has(`${date} ${time}`)) continue;
      if (date === todayISO()) {
        const [h, m] = time.split(':').map(Number);
        if (h * 60 + m <= nowMins + 30) continue;
      }
      out.push({ date, time });
      if (out.length >= limit) break;
    }
  }
  return out;
}

/**
 * Everything that has to be true before a slot can be taken, whether it is
 * being requested or paid for. Returns the clinician so the caller does not
 * look them up again.
 */
async function ensureSlotFree(doctorId, date, time) {
  const doctor = await doctorModel.find(doctorId);
  if (!doctor) throw new NotBookableError('That clinician is no longer listed');
  if (doctor.status === 'away') throw new NotBookableError(`${doctor.name} is on leave right now`);
  if (!doctor.bookable) throw new NotBookableError(`${doctor.name}'s list is full`);
  if (!date || !time) throw new Error('A booking needs a date and a time');
  if (date < todayISO()) throw new Error('That date has passed');

  const free = await freeSlots(doctorId, date);
  if (!free.includes(time)) throw new SlotTakenError(await nextOpenings(doctorId, date));
  return doctor;
}

/** How many unanswered requests this doctor received before this one. */
async function queuePosition(row) {
  if (row.status !== 'requested') return 0;
  const r = await db.one(
    `SELECT count(*) AS c FROM appointments
     WHERE doctor_id = $1 AND status = 'requested' AND requested_at < $2`,
    [row.doctor_id, row.requested_at],
  );
  return r.c + 1;
}

/** Days a request has gone unanswered — drives the "still waiting" nudge. */
function waitingDays(row) {
  if (row.status !== 'requested' || !row.requested_at) return 0;
  return Math.floor((Date.now() - new Date(row.requested_at).getTime()) / DAY);
}

/**
 * Rows are selected with the doctor joined and the queue position computed in
 * SQL, so building the DTO needs no further queries.
 */
const WITH_DOCTOR = `
  SELECT a.*, d.name AS doctor_name, d.specialty, d.hospital,
         CASE WHEN a.status = 'requested' THEN
           (SELECT count(*) + 1 FROM appointments q
             WHERE q.doctor_id = a.doctor_id AND q.status = 'requested'
               AND q.requested_at < a.requested_at)
         ELSE 0 END AS queue_position
  FROM appointments a
  JOIN doctors d ON d.id = a.doctor_id
`;

function toDTO(row) {
  return {
    id: String(row.id),
    doctorId: String(row.doctor_id),
    doctorName: row.doctor_name ?? 'Unknown clinician',
    specialty: row.specialty ?? '',
    hospital: row.hospital ?? '',
    patientId: String(row.user_id),
    date: row.date,
    time: row.time,
    reason: row.reason,
    status: row.status,
    note: row.note || undefined,
    requestedAt: row.requested_at || undefined,
    respondedAt: row.responded_at || undefined,
    queuePosition: row.queue_position ?? 0,
    waitingDays: waitingDays(row),
    plan: row.plan || undefined,
    /** the date her month of messaging runs out, on a chat plan */
    chatUntil: row.chat_until || undefined,
    payment: row.paid_at
      ? {
        feeBdt: row.fee_bdt,
        method: row.payment_method,
        reference: row.payment_ref,
        paidAt: row.paid_at,
      }
      : undefined,
  };
}

/** Payment rails a Bangladeshi clinic actually takes. */
const PAY_METHODS = ['bkash', 'nagad', 'card'];

/** The consultation alone, or the consultation plus a month of messaging. */
const PLANS = ['visit', 'visit-plus-chat'];

/**
 * A reference the mother can quote back to the clinic. Deliberately not
 * sequential — a guessable one would let anybody name somebody else's receipt.
 */
function paymentReference() {
  return `MC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

module.exports = {
  SlotTakenError,
  NotBookableError,
  freeSlots,
  nextOpenings,

  /* ------------------------------------------------ server-rendered views
   * The EJS pages (routes/web.js) render raw joined rows. They predate the
   * request flow and are kept working alongside it.
   */

  async doctors({ specialty, availableOnly } = {}) {
    const where = [];
    const args = [];
    if (specialty && specialty !== 'All') {
      args.push(`%${specialty}%`);
      where.push(`specialty ILIKE $${args.length}`);
    }
    if (availableOnly) where.push('available = TRUE');
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return db.sql(`SELECT * FROM doctors ${clause} ORDER BY rating DESC`, args);
  },

  async specialties() {
    const rows = await db.sql('SELECT DISTINCT specialty FROM doctors ORDER BY specialty');
    return rows.map((r) => r.specialty);
  },

  async forUser(userId) {
    return db.sql(`
      SELECT a.*, d.name AS doctor_name, d.specialty, d.hospital
      FROM appointments a JOIN doctors d ON d.id = a.doctor_id
      WHERE a.user_id = $1
      ORDER BY CASE a.status WHEN 'requested' THEN 0 WHEN 'accepted' THEN 1
                             WHEN 'completed' THEN 2 ELSE 3 END, a.date ASC
    `, [userId]);
  },

  async upcoming(userId, limit = 3) {
    return db.sql(`
      SELECT a.*, d.name AS doctor_name, d.specialty, d.hospital
      FROM appointments a JOIN doctors d ON d.id = a.doctor_id
      WHERE a.user_id = $1 AND a.status = 'accepted'
      ORDER BY a.date ASC LIMIT $2
    `, [userId, limit]);
  },

  /** Booked at the desk, so it is confirmed the moment it is written. */
  async book(userId, { doctor_id, date, time, reason }) {
    await db.run(
      `INSERT INTO appointments (user_id, doctor_id, date, time, reason, status, requested_at)
       VALUES ($1,$2,$3,$4,$5,'accepted',now())`,
      [userId, doctor_id, date, time, reason],
    );
  },

  async cancel(id) {
    await db.run("UPDATE appointments SET status = 'cancelled' WHERE id = $1", [id]);
  },

  /* --------------------------------------------------- the request flow */

  /** Free times for a doctor on a given day. */
  async slots(doctorId, date) {
    return { date, times: await freeSlots(doctorId, date) };
  },

  /** The mother's own requests, shaped for the React client. */
  async requestsFor(userId) {
    const rows = await db.sql(`${WITH_DOCTOR} WHERE a.user_id = $1 ORDER BY a.date ASC, a.time ASC`,
      [userId]);
    return rows.map(toDTO);
  },

  /** A doctor's inbox — oldest unanswered request first. */
  async forDoctor(doctorId) {
    const rows = await db.sql(
      `${WITH_DOCTOR} WHERE a.doctor_id = $1
       ORDER BY CASE a.status WHEN 'requested' THEN 0 ELSE 1 END, a.requested_at ASC`,
      [doctorId],
    );
    return rows.map(toDTO);
  },

  async find(id) {
    const row = await db.one(`${WITH_DOCTOR} WHERE a.id = $1`, [id]);
    return row ? toDTO(row) : null;
  },

  /**
   * Send a request. Refuses when the doctor cannot take her at all, and when
   * the slot went while she was choosing — in both cases with somewhere to go
   * next, because a bare error leaves her stuck.
   */
  async request(userId, doctorId, { date, time, reason }) {
    const doctor = await ensureSlotFree(doctorId, date, time);

    // one open request per doctor keeps the queue honest
    const dup = await db.one(
      "SELECT 1 FROM appointments WHERE user_id = $1 AND doctor_id = $2 AND status = 'requested'",
      [userId, doctorId],
    );
    if (dup) throw new NotBookableError(`You already have a request waiting with ${doctor.name}`);

    const row = await db.insert(
      `INSERT INTO appointments (user_id, doctor_id, date, time, reason, status, requested_at)
       VALUES ($1,$2,$3,$4,$5,'requested',$6) RETURNING id`,
      [userId, doctorId, date, time, reason || 'Antenatal appointment', new Date().toISOString()],
    );
    return this.find(row.id);
  },

  /**
   * A paid booking. Unlike {@link request}, this comes back confirmed: the
   * consultation fee buys the slot outright, so there is no queue to sit in
   * and no acceptance to wait for.
   *
   * NOTE: no payment gateway is connected. This records the method and issues
   * a reference so the appointment and the clinician's diary are real, but no
   * money moves and no card details are taken anywhere in this flow. The fee
   * is read from the clinician rather than from the request, so a tampered
   * body cannot buy a consultant's slot at a junior's price.
   */
  async bookPaid(userId, doctorId, { date, time, reason, method, plan }) {
    const pay = String(method || '').toLowerCase();
    if (!PAY_METHODS.includes(pay)) throw new Error('Choose how you want to pay');

    const chosen = String(plan || 'visit');
    if (!PLANS.includes(chosen)) throw new Error('Choose what you are booking');

    const doctor = await ensureSlotFree(doctorId, date, time);
    // priced from the clinician, never from the request body
    const priced = doctorModel.plansFor({
      qualification: doctor.qualification,
      years: doctor.years,
    })[chosen];
    const now = new Date().toISOString();

    // a month of chat runs from the visit, not from the moment she paid —
    // the point of it is the questions that come *after* being seen
    const chatUntil = chosen === 'visit-plus-chat'
      ? iso(new Date(new Date(`${date}T00:00:00`).getTime() + doctorModel.CHAT_DAYS * DAY))
      : null;

    const row = await db.insert(
      `INSERT INTO appointments
         (user_id, doctor_id, date, time, reason, status,
          requested_at, responded_at, note,
          fee_bdt, payment_method, payment_ref, paid_at, plan, chat_until)
       VALUES ($1,$2,$3,$4,$5,'accepted',$6,$6,$7,$8,$9,$10,$6,$11,$12)
       RETURNING id`,
      [userId, doctorId, date, time, reason || 'Paid consultation', now,
        'Confirmed on payment of the consultation fee',
        priced.priceBdt, pay, paymentReference(), chosen, chatUntil],
    );
    return this.find(row.id);
  },

  /**
   * Is her chat with this clinician live right now?
   *
   * True while any 'visit-plus-chat' booking with them still has days on it.
   * Read on every message she sends, so it is one indexed lookup.
   */
  async chatOpen(userId, doctorId) {
    const row = await db.one(
      `SELECT max(chat_until) AS until FROM appointments
       WHERE user_id = $1 AND doctor_id = $2
         AND plan = 'visit-plus-chat' AND chat_until >= CURRENT_DATE
         AND status IN ('accepted','completed')`,
      [userId, doctorId],
    );
    return row && row.until ? { open: true, until: row.until } : { open: false, until: null };
  },

  /**
   * Confirmed visits starting within the next `minutes`, for the clinician's
   * "ready your meeting link" nudge. Ordered soonest first.
   */
  async imminentForDoctor(doctorId, minutes = 60) {
    const rows = await db.sql(`
      SELECT a.*, u.name AS patient_name,
             d.name AS doctor_name, d.specialty, d.hospital,
             0 AS queue_position
      FROM appointments a
      JOIN users u   ON u.id = a.user_id
      JOIN doctors d ON d.id = a.doctor_id
      WHERE a.doctor_id = $1 AND a.status = 'accepted' AND a.time IS NOT NULL
        AND (a.date + a.time::time) BETWEEN now() - interval '15 minutes'
                                        AND now() + ($2 || ' minutes')::interval
      ORDER BY a.date, a.time
    `, [doctorId, String(minutes)]);

    return rows.map((r) => ({
      ...toDTO(r),
      patientName: r.patient_name,
      startsAt: `${r.date}T${r.time}`,
    }));
  },

  /** The doctor answers. A decline carries a reason the mother will read. */
  async respond(id, status, note) {
    if (!['accepted', 'declined'].includes(status)) throw new Error(`Cannot set status ${status}`);
    const row = await db.one('SELECT * FROM appointments WHERE id = $1', [id]);
    if (!row) return null;
    if (row.status !== 'requested') throw new Error('That request has already been answered');

    await db.run(
      'UPDATE appointments SET status = $2, note = $3, responded_at = now() WHERE id = $1',
      [id, status, note || null],
    );
    return this.find(id);
  },

  /** The mother withdraws, which frees the slot again. */
  async withdraw(id, userId) {
    const row = await db.one(
      'SELECT * FROM appointments WHERE id = $1 AND user_id = $2', [id, userId],
    );
    if (!row) return null;
    if (!OPEN.includes(row.status)) throw new Error('That appointment is already closed');

    await db.run(
      "UPDATE appointments SET status = 'cancelled', responded_at = now() WHERE id = $1", [id],
    );
    return this.find(id);
  },
};

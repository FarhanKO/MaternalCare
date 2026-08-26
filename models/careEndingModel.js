/**
 * Care Ending Model — ending the relationship between a mother and a
 * clinician, from either side, with a reason.
 *
 * This is not cancelling an appointment. An appointment is one visit; this is
 * the arrangement the visits sit inside — the clinician on her care team, the
 * month of messaging she paid for, the person her SOS reaches. Until now there
 * was no way to end it and no way to say why. A mother stopped booking, a
 * clinician stopped accepting, and each stayed on the other's list forever
 * with nothing recorded.
 *
 * Why the reason matters more here than anywhere else in this app:
 *
 *  - a clinician being left because their replies take three days cannot fix
 *    that unless somebody tells them, and nobody tells a doctor that to their
 *    face;
 *  - a mother being let go needs to know whether it was capacity or something
 *    she did, because she will assume the worse of the two;
 *  - and a woman leaving because she cannot afford it is a different problem
 *    for the service than one leaving because she has given birth.
 *
 * So the category is required and comes from a fixed list per side — free text
 * alone cannot be counted — while the written note is optional, because
 * requiring an essay to leave is a way of making people not leave.
 *
 * Ending is reversible by starting again: booking with the same clinician
 * resumes the pairing and stamps `resumed_at`. The record of the ending
 * survives that, because it is a fact about what happened.
 */
const db = require('../config/db');

class EndingError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

/**
 * Why the relationship is ending. Two vocabularies, because they are not
 * symmetrical: a mother leaves for reasons about her life, a clinician ends it
 * for reasons about their practice, and showing either side the other's list
 * would be strange.
 */
const REASONS = {
  mother: {
    moved: {
      label: 'I have moved away',
      hint: 'Somewhere they cannot see you any more.',
    },
    'found-another': {
      label: 'I am seeing a different doctor',
      hint: 'Nothing wrong — just care somewhere else now.',
    },
    cost: {
      label: 'The cost',
      hint: 'Consultations or the chat plan are more than you can carry.',
    },
    communication: {
      label: 'Replies took too long',
      hint: 'You could not reach them when you needed to.',
    },
    'not-comfortable': {
      label: 'I did not feel comfortable',
      hint: 'Anything about how it felt to be their patient.',
    },
    'no-longer-needed': {
      label: 'I no longer need this care',
      hint: 'The birth is behind you, or the reason has passed.',
    },
    other: {
      label: 'Another reason',
      hint: 'Tell us below, if you would like to.',
    },
  },
  doctor: {
    'moved-practice': {
      label: 'I am leaving this practice',
      hint: 'Handing the patient on rather than ending their care.',
    },
    'wrong-specialty': {
      label: 'This needs a different specialty',
      hint: 'They should be with someone else clinically.',
    },
    capacity: {
      label: 'My list is full',
      hint: 'Taking on nobody new and reducing what I carry.',
    },
    'non-attendance': {
      label: 'Repeated non-attendance',
      hint: 'Appointments booked and not attended.',
    },
    'care-transferred': {
      label: 'Care has been transferred',
      hint: 'Another clinician has taken over formally.',
    },
    breakdown: {
      label: 'The relationship has broken down',
      hint: 'Trust or conduct, either way round.',
    },
    other: {
      label: 'Another reason',
      hint: 'Please give the detail below.',
    },
  },
};

/** A clinician ending it must say why in words; a mother need not. */
const NOTE_REQUIRED = { mother: false, doctor: true };

const toEnding = (r) => ({
  id: String(r.id),
  userId: String(r.user_id),
  doctorId: String(r.doctor_id),
  patientName: r.patient_name ?? undefined,
  doctorName: r.doctor_name ?? undefined,
  endedBy: r.ended_by,
  reason: r.reason,
  reasonLabel: REASONS[r.ended_by]?.[r.reason]?.label ?? r.reason,
  note: r.note || undefined,
  at: r.created_at,
  resumedAt: r.resumed_at ?? null,
  active: !r.resumed_at,
});

module.exports = {
  EndingError,
  REASONS,
  NOTE_REQUIRED,

  /** The reason list for one side, shaped for a client to render. */
  reasons(side) {
    const set = REASONS[side];
    if (!set) throw new EndingError(`Unknown side: ${side}`, 'BAD_SIDE');
    return {
      side,
      noteRequired: NOTE_REQUIRED[side],
      options: Object.entries(set).map(([key, r]) => ({ key, label: r.label, hint: r.hint })),
    };
  },

  /** Is this pairing currently ended? */
  async active(userId, doctorId) {
    const row = await db.one(
      `SELECT * FROM care_terminations
        WHERE user_id = $1 AND doctor_id = $2 AND resumed_at IS NULL`,
      [userId, doctorId],
    );
    return row ? toEnding(row) : null;
  },

  /**
   * Which of this mother's clinicians she has ended with, as a Set of ids, so
   * the care team can be filtered in one query rather than one per doctor.
   */
  async endedFor(userId) {
    const rows = await db.sql(
      `SELECT doctor_id FROM care_terminations
        WHERE user_id = $1 AND resumed_at IS NULL`,
      [userId],
    );
    return new Set(rows.map((r) => String(r.doctor_id)));
  },

  /**
   * End it.
   *
   * The write and everything that follows from it are one transaction: future
   * appointments are cancelled, and the paid month of messaging is closed off
   * at today. Half of this landing would leave a mother messaging a clinician
   * who thinks she has gone.
   */
  async end({
    userId, doctorId, endedBy, reason, note,
  }) {
    if (!['mother', 'doctor'].includes(endedBy)) {
      throw new EndingError('Unknown side', 'BAD_SIDE');
    }
    if (!REASONS[endedBy][reason]) {
      throw new EndingError('Choose a reason', 'BAD_REASON');
    }

    const text = String(note || '').trim().slice(0, 1000);
    if (NOTE_REQUIRED[endedBy] && text.length < 10) {
      throw new EndingError(
        'Please write a line explaining this — the patient will see it',
        'NOTE_REQUIRED',
      );
    }

    if (await this.active(userId, doctorId)) {
      throw new EndingError('This care relationship has already ended', 'ALREADY_ENDED');
    }

    return db.tx(async (t) => {
      const row = await t.one(
        `INSERT INTO care_terminations (user_id, doctor_id, ended_by, reason, note)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [userId, doctorId, endedBy, reason, text || null],
      );

      /*
       * Anything still ahead of them goes. A visit that neither party intends
       * to attend is worse than no visit: it holds a slot somebody else could
       * have had, and it shows on her dashboard as care she is still getting.
       */
      const cancelled = await t.run(
        `UPDATE appointments
            SET status = 'cancelled', cancelled_at = now(), cancelled_by = $3,
                cancel_reason = 'care-ended', cancel_note = $4, responded_at = now()
          WHERE user_id = $1 AND doctor_id = $2
            AND status IN ('requested','accepted')
            AND date >= CURRENT_DATE`,
        [userId, doctorId, endedBy, `Care relationship ended: ${REASONS[endedBy][reason].label}`],
      );

      /*
       * And the month of messaging stops today rather than running on. She
       * paid for it, so this is worth being careful about: it is closed, not
       * deleted, and the appointment that carried it keeps its record of what
       * was bought.
       */
      const chatClosed = await t.run(
        `UPDATE appointments
            SET chat_until = CURRENT_DATE
          WHERE user_id = $1 AND doctor_id = $2
            AND plan = 'visit-plus-chat' AND chat_until > CURRENT_DATE`,
        [userId, doctorId],
      );

      return { ...toEnding(row), cancelledAppointments: cancelled, chatClosed };
    });
  },

  /**
   * Start again.
   *
   * Called when the pair book together after an ending, so the arrangement
   * resumes rather than a second ending stacking on the first. The original
   * record keeps its reason and gains the date it was reversed.
   */
  async resume(userId, doctorId) {
    const n = await db.run(
      `UPDATE care_terminations SET resumed_at = now()
        WHERE user_id = $1 AND doctor_id = $2 AND resumed_at IS NULL`,
      [userId, doctorId],
    );
    return n > 0;
  },

  /** One mother's history, both directions, newest first. */
  async forUser(userId) {
    const rows = await db.sql(
      `SELECT ct.*, d.name AS doctor_name
         FROM care_terminations ct
         JOIN doctors d ON d.id = ct.doctor_id
        WHERE ct.user_id = $1
        ORDER BY ct.created_at DESC`,
      [userId],
    );
    return rows.map(toEnding);
  },

  /**
   * One clinician's history.
   *
   * Worth them being able to read: several mothers leaving in a month for the
   * same reason is the kind of thing nobody says out loud, and it is the only
   * feedback of this sort a doctor in this app will ever get.
   */
  async forDoctor(doctorId) {
    const rows = await db.sql(
      `SELECT ct.*, u.name AS patient_name
         FROM care_terminations ct
         JOIN users u ON u.id = ct.user_id
        WHERE ct.doctor_id = $1
        ORDER BY ct.created_at DESC`,
      [doctorId],
    );
    const endings = rows.map(toEnding);

    // counted by reason, because a list of twelve is not a signal and "four of
    // these say the replies were too slow" is
    const byReason = new Map();
    for (const e of endings.filter((x) => x.endedBy === 'mother')) {
      byReason.set(e.reasonLabel, (byReason.get(e.reasonLabel) ?? 0) + 1);
    }

    return {
      endings,
      leftByPatients: endings.filter((e) => e.endedBy === 'mother').length,
      endedByYou: endings.filter((e) => e.endedBy === 'doctor').length,
      topReasons: [...byReason.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
    };
  },
};

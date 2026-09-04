/**
 * Care API Controller — finding a doctor and requesting or buying an
 * appointment. Thin: every rule about who is bookable, which slots are free
 * and what a visit costs lives in the models.
 */
const doctorModel = require('../../models/doctorModel');
const appointmentModel = require('../../models/appointmentModel');
const userModel = require('../../models/userModel');

exports.me = async (req, res, next) => {
  try {
    const doctor = await doctorModel.forUser(req.user.id);
    if (!doctor) return res.status(404).json({ error: 'No clinician profile is linked to this account' });
    return res.json({ data: doctor });
  } catch (err) { return next(err); }
};

exports.doctors = async (req, res, next) => {
  try {
    res.json({ data: await doctorModel.all() });
  } catch (err) { next(err); }
};

/**
 * Ranked recommendations for the signed-in mother. `bookable` tells the client
 * whether anyone can actually see her, so it can show the empty state instead
 * of a list she cannot use.
 */
exports.recommended = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const stage = req.query.stage || user.stage;
    const ranked = await doctorModel.recommend({ stage });
    res.json({
      data: ranked,
      meta: { stage, bookable: ranked.filter((d) => d.bookable).length },
    });
  } catch (err) { next(err); }
};

/**
 * A clinician registering themselves.
 *
 * 201 with the row they will appear as, so the client can show them what a
 * mother will see rather than a success message. A field that failed
 * validation comes back named, because "check your details" on a form of
 * eight is not help.
 */
exports.registerDoctor = async (req, res, next) => {
  try {
    const doctor = await doctorModel.register(req.body || {});
    return res.status(201).json({ data: doctor });
  } catch (err) {
    if (err.code === 'INVALID_REGISTRATION') {
      return res.status(400).json({ error: err.message, field: err.field });
    }
    return next(err);
  }
};

exports.slots = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!(await doctorModel.exists(id))) return res.status(404).json({ error: 'Clinician not found' });
    const now = new Date();
    const date = req.query.date
      || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    res.json({ data: await appointmentModel.slots(id, date) });
  } catch (err) { next(err); }
};

/** What this clinician charges: the visit alone, or the visit plus a month. */
exports.plans = async (req, res, next) => {
  try {
    const doctor = await doctorModel.find(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Clinician not found' });
    return res.json({
      data: doctorModel.plansFor(doctor),
      meta: { chatDays: doctorModel.CHAT_DAYS },
    });
  } catch (err) { return next(err); }
};

/** The doctor's request inbox. */
exports.doctorAppointments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mine = await doctorModel.forUser(req.user.id);
    if (!mine || String(mine.id) !== String(id)) return res.status(403).json({ error: 'You can only open your own clinic inbox' });
    res.json({ data: await appointmentModel.forDoctor(id) });
  } catch (err) { next(err); }
};

exports.myAppointments = async (req, res, next) => {
  try {
    const user = await userModel.current();
    res.json({ data: await appointmentModel.requestsFor(user.id) });
  } catch (err) { next(err); }
};

exports.requestAppointment = async (req, res) => {
  const { doctorId, date, time, reason } = req.body || {};
  try {
    const user = await userModel.current();
    const created = await appointmentModel.request(user.id, doctorId, { date, time, reason });
    res.status(201).json({ data: created });
  } catch (err) {
    // a taken slot is not a failure the mother caused — hand back a way forward
    if (err.code === 'SLOT_TAKEN') {
      return res.status(409).json({ error: err.message, code: err.code, alternatives: err.alternatives });
    }
    if (err.code === 'NOT_BOOKABLE') {
      return res.status(409).json({ error: err.message, code: err.code });
    }
    res.status(400).json({ error: err.message });
  }
};

/**
 * Buy a slot outright. The fee is never read from the request body — the model
 * takes it from the clinician — so the client cannot name its own price.
 */
exports.payAndBook = async (req, res) => {
  const { doctorId, date, time, reason, method, plan } = req.body || {};
  try {
    const user = await userModel.current();
    const booked = await appointmentModel.bookPaid(user.id, doctorId, {
      date, time, reason, method, plan,
    });
    res.status(201).json({ data: booked });
  } catch (err) {
    if (err.code === 'SLOT_TAKEN') {
      return res.status(409).json({ error: err.message, code: err.code, alternatives: err.alternatives });
    }
    if (err.code === 'NOT_BOOKABLE') {
      return res.status(409).json({ error: err.message, code: err.code });
    }
    res.status(400).json({ error: err.message });
  }
};

/** Doctor accepts or declines. */
exports.respond = async (req, res) => {
  const { status, note } = req.body || {};
  try {
    const doctor = await doctorModel.forUser(req.user.id);
    if (!doctor) return res.status(403).json({ error: 'No clinician profile is linked to this account' });
    const updated = await appointmentModel.respond(req.params.id, status, note, doctor.id);
    if (!updated) return res.status(404).json({ error: 'Request not found' });
    res.json({ data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Cancel, with a reason.
 *
 * `side` says who is doing it — the mother from her own list, the clinician
 * from the inbox. The reason has to come from that side's vocabulary, so the
 * clinic can count cancellations by cause instead of only seeing empty slots.
 */
exports.cancel = async (req, res, next) => {
  const side = req.body?.side === 'doctor' ? 'doctor' : 'mother';
  try {
    const user = await userModel.current();
    const doctor = side === 'doctor' ? await doctorModel.forUser(req.user.id) : null;
    if (side === 'doctor' && (!doctor || String(doctor.id) !== String(req.body?.doctorId))) {
      return res.status(403).json({ error: 'You can only cancel appointments from your own clinic' });
    }
    const cancelled = await appointmentModel.cancelWithReason(req.params.id, {
      by: side,
      userId: user.id,
      doctorId: doctor?.id,
      reason: req.body?.reason || 'other',
      note: req.body?.note,
    });
    if (!cancelled) return res.status(404).json({ error: 'Appointment not found' });
    return res.json({ data: cancelled });
  } catch (err) {
    if (err instanceof appointmentModel.NotBookableError) {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  }
};

/** The reasons one side may give for cancelling. */
exports.cancelReasons = async (req, res) => {
  const side = req.query.side === 'doctor' ? 'doctor' : 'mother';
  res.json({ data: appointmentModel.cancelReasons(side), meta: { side } });
};

/**
 * Move an appointment to another slot.
 *
 * The whole of F11's "rescheduling" — until now a mother whose Tuesday stopped
 * working could only cancel and rejoin the queue at the back, behind everyone
 * who had not had to change anything.
 */
exports.reschedule = async (req, res, next) => {
  const side = req.body?.side === 'doctor' ? 'doctor' : 'mother';
  try {
    const user = await userModel.current();
    const doctor = side === 'doctor' ? await doctorModel.forUser(req.user.id) : null;
    if (side === 'doctor' && (!doctor || String(doctor.id) !== String(req.body?.doctorId))) {
      return res.status(403).json({ error: 'You can only move appointments from your own clinic' });
    }
    const moved = await appointmentModel.reschedule(req.params.id, {
      by: side,
      userId: user.id,
      doctorId: doctor?.id,
      date: req.body?.date,
      time: req.body?.time,
      reason: req.body?.reason,
    });
    if (!moved) return res.status(404).json({ error: 'Appointment not found' });
    return res.json({ data: moved, meta: { changes: await appointmentModel.changes(req.params.id) } });
  } catch (err) {
    // a taken slot is not the caller's fault — hand back somewhere else to go
    if (err.code === 'SLOT_TAKEN') {
      return res.status(409).json({
        error: 'Somebody took that time while you were choosing',
        code: 'SLOT_TAKEN',
        alternatives: err.alternatives,
      });
    }
    if (err instanceof appointmentModel.NotBookableError) {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  }
};

/** Everywhere an appointment has been moved from. */
exports.changes = async (req, res, next) => {
  try {
    return res.json({ data: await appointmentModel.changes(req.params.id) });
  } catch (err) { return next(err); }
};

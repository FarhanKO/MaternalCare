/**
 * Care API Controller — finding a doctor and requesting or buying an
 * appointment. Thin: every rule about who is bookable, which slots are free
 * and what a visit costs lives in the models.
 */
const doctorModel = require('../../models/doctorModel');
const appointmentModel = require('../../models/appointmentModel');
const userModel = require('../../models/userModel');

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
    if (!(await doctorModel.exists(id))) return res.status(404).json({ error: 'Clinician not found' });
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
    const updated = await appointmentModel.respond(req.params.id, status, note);
    if (!updated) return res.status(404).json({ error: 'Request not found' });
    res.json({ data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.cancel = async (req, res) => {
  try {
    const user = await userModel.current();
    const cancelled = await appointmentModel.withdraw(req.params.id, user.id);
    if (!cancelled) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ data: cancelled });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

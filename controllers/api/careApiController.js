/**
 * Care API Controller — finding a doctor and requesting an appointment.
 * Thin: every rule about who is bookable and which slots are free lives in
 * the models.
 */
const doctorModel = require('../../models/doctorModel');
const appointmentModel = require('../../models/appointmentModel');
const userModel = require('../../models/userModel');

exports.doctors = (req, res) => {
  res.json({ data: doctorModel.all() });
};

/**
 * Ranked recommendations for the signed-in mother. `bookable` tells the client
 * whether anyone can actually see her, so it can show the empty state instead
 * of a list she cannot use.
 */
exports.recommended = (req, res) => {
  const user = userModel.current();
  const stage = req.query.stage || user.stage;
  const ranked = doctorModel.recommend({ stage });
  res.json({
    data: ranked,
    meta: { stage, bookable: ranked.filter((d) => d.bookable).length },
  });
};

exports.slots = (req, res) => {
  const { id } = req.params;
  if (!doctorModel.exists(id)) return res.status(404).json({ error: 'Clinician not found' });
  const now = new Date();
  const date = req.query.date
    || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  res.json({ data: appointmentModel.slots(id, date) });
};

/** The doctor's request inbox. */
exports.doctorAppointments = (req, res) => {
  const { id } = req.params;
  if (!doctorModel.exists(id)) return res.status(404).json({ error: 'Clinician not found' });
  res.json({ data: appointmentModel.forDoctor(id) });
};

exports.myAppointments = (req, res) => {
  res.json({ data: appointmentModel.requestsFor(userModel.current().id) });
};

exports.requestAppointment = (req, res) => {
  const user = userModel.current();
  const { doctorId, date, time, reason } = req.body || {};
  try {
    res.status(201).json({ data: appointmentModel.request(user.id, doctorId, { date, time, reason }) });
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

/** Doctor accepts or declines. */
exports.respond = (req, res) => {
  const { status, note } = req.body || {};
  try {
    const updated = appointmentModel.respond(req.params.id, status, note);
    if (!updated) return res.status(404).json({ error: 'Request not found' });
    res.json({ data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.cancel = (req, res) => {
  const user = userModel.current();
  try {
    const cancelled = appointmentModel.withdraw(req.params.id, user.id);
    if (!cancelled) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ data: cancelled });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

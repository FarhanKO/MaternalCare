const userModel = require('../models/userModel');
const appointmentModel = require('../models/appointmentModel');
const doctorModel = require('../models/doctorModel');

/**
 * The directory used to open with a specialty dropdown and an "available
 * today" checkbox, and list whoever came back ordered by rating. Both are
 * gone. Every one of those controls asked her to guess at a weighting the
 * server can work out — and the guess she is least equipped to make is how
 * much a fellowship is worth against a free slot on Thursday.
 *
 * So the list arrives ranked, by the same model the React view uses, with
 * each entry carrying the sentences that say why it sits where it does.
 */
exports.index = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const [doctors, appointments] = await Promise.all([
      doctorModel.recommend({ stage: user.stage }),
      appointmentModel.forUser(user.id),
    ]);
    res.render('appointments', {
      page: 'appointments', user,
      doctors,
      appointments,
      booked: req.query.booked === '1',
    });
  } catch (err) { next(err); }
};

exports.book = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const { doctor_id, date, time, reason } = req.body || {};
    await appointmentModel.book(user.id, {
      doctor_id: Number(doctor_id),
      date: date || new Date().toISOString().slice(0, 10),
      time: time || '10:00 AM',
      reason: reason || 'Consultation',
    });
    res.redirect('/appointments?booked=1');
  } catch (err) { next(err); }
};

exports.cancel = async (req, res, next) => {
  try {
    await appointmentModel.cancel(Number(req.params.id));
    res.redirect('/appointments');
  } catch (err) { next(err); }
};

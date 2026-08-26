const userModel = require('../models/userModel');
const pregnancyModel = require('../models/pregnancyModel');
const vitalModel = require('../models/vitalModel');
const riskModel = require('../models/riskModel');
const appointmentModel = require('../models/appointmentModel');

exports.index = async (req, res, next) => {
  try {
    const patient = await userModel.current();
    const [pregnancy, vitals, latest, alerts, userAppointments] = await Promise.all([
      pregnancyModel.forUser(patient.id),
      vitalModel.history(patient.id),
      vitalModel.latest(patient.id),
      vitalModel.alerts(patient.id),
      appointmentModel.forUser(patient.id),
    ]);
    const risk = await riskModel.fromLatestVitals(patient, pregnancy);

    res.render('doctor', {
      page: 'doctor',
      user: patient,
      patient, pregnancy,
      vitals,
      latest,
      alerts,
      risk,
      appointments: userAppointments.filter(a => a.status !== 'cancelled'),
    });
  } catch (err) { next(err); }
};

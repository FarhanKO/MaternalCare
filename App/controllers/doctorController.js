const userModel = require('../models/userModel');
const pregnancyModel = require('../models/pregnancyModel');
const vitalModel = require('../models/vitalModel');
const riskModel = require('../models/riskModel');
const appointmentModel = require('../models/appointmentModel');

exports.index = (req, res) => {
  const patient = userModel.current();
  const pregnancy = pregnancyModel.forUser(patient.id);
  res.render('doctor', {
    page: 'doctor',
    user: patient,
    patient, pregnancy,
    vitals: vitalModel.history(patient.id),
    latest: vitalModel.latest(patient.id),
    alerts: vitalModel.alerts(patient.id),
    risk: riskModel.fromLatestVitals(patient, pregnancy),
    appointments: appointmentModel.forUser(patient.id).filter(a => a.status !== 'cancelled'),
  });
};

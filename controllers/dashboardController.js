const userModel = require('../models/userModel');
const pregnancyModel = require('../models/pregnancyModel');
const vitalModel = require('../models/vitalModel');
const childModel = require('../models/childModel');
const vaccinationModel = require('../models/vaccinationModel');
const appointmentModel = require('../models/appointmentModel');
const riskModel = require('../models/riskModel');

exports.home = (req, res) => {
  res.render('home', { page: 'home' });
};

exports.dashboard = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const [pregnancy, vitals, latest, alerts, child, vaxStats, nextVax, appointments] = await Promise.all([
      pregnancyModel.forUser(user.id),
      vitalModel.history(user.id),
      vitalModel.latest(user.id),
      vitalModel.alerts(user.id),
      childModel.forUser(user.id),
      vaccinationModel.stats(user.id),
      vaccinationModel.upcoming(user.id, 2),
      appointmentModel.upcoming(user.id, 3),
    ]);
    const risk = await riskModel.fromLatestVitals(user, pregnancy);

    res.render('dashboard', {
      page: 'dashboard', user, pregnancy, vitals, latest, alerts,
      child, vaxStats, nextVax, appointments, risk,
    });
  } catch (err) { next(err); }
};

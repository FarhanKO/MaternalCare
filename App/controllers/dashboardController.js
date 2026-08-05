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

exports.dashboard = (req, res) => {
  const user = userModel.current();
  const pregnancy = pregnancyModel.forUser(user.id);
  const vitals = vitalModel.history(user.id);

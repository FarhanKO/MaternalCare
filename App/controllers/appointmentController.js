const userModel = require('../models/userModel');
const appointmentModel = require('../models/appointmentModel');

exports.index = (req, res) => {
  const user = userModel.current();
  const specialty = req.query.specialty || 'All';
  const availableOnly = req.query.available === '1';
  res.render('appointments', {

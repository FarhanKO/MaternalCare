const userModel = require('../models/userModel');
const appointmentModel = require('../models/appointmentModel');

exports.index = (req, res) => {
  const user = userModel.current();
  const specialty = req.query.specialty || 'All';
  const availableOnly = req.query.available === '1';
  res.render('appointments', {
    page: 'appointments', user,
    doctors: appointmentModel.doctors({ specialty, availableOnly }),
    specialties: appointmentModel.specialties(),
    specialty, availableOnly,
    appointments: appointmentModel.forUser(user.id),
    booked: req.query.booked === '1',
  });
};

exports.book = (req, res) => {
  const user = userModel.current();
  const { doctor_id, date, time, reason } = req.body;

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
  appointmentModel.book(user.id, {
    doctor_id: Number(doctor_id),
    date: date || new Date().toISOString().slice(0, 10),
    time: time || '10:00 AM',
    reason: reason || 'Consultation',
  });
  res.redirect('/appointments?booked=1');
};

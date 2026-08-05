/**
 * Reminder API Controller
 * Appointments & reminders for the React dashboard.
 */
const userModel = require('../../models/userModel');
const reminderModel = require('../../models/reminderModel');

exports.index = (req, res) => {
  const user = userModel.current();
  const list = req.query.upcoming === 'true'
    ? reminderModel.upcoming(user.id)
    : reminderModel.all(user.id);
  res.json({ data: list, next: reminderModel.next(user.id) });
};

exports.create = (req, res) => {
  const user = userModel.current();
  try {
    const created = reminderModel.create(user.id, req.body || {});
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.destroy = (req, res) => {
  reminderModel.remove(req.params.id);
  res.status(204).end();
};

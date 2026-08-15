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

/**
 * A mother can clear her own reminders, but not care a clinician scheduled for
 * her — the assign screen promises exactly that, so it is enforced here rather
 * than only hidden in the UI.
 */
exports.destroy = (req, res) => {
  const user = userModel.current();
  const reminder = reminderModel.find(req.params.id);
  if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
  if (reminder.assignedBy) {
    return res.status(403).json({ error: `Only ${reminder.assignedBy} can remove this` });
  }
  reminderModel.remove(req.params.id, user.id);
  res.status(204).end();
};

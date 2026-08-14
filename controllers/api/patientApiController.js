/**
 * Patient API Controller — the clinician-facing endpoints.
 * Reads the caseload and writes care items onto a *specific* patient's account,
 * rather than the current session user.
 */
const patientModel = require('../../models/patientModel');
const reminderModel = require('../../models/reminderModel');
const symptomModel = require('../../models/symptomModel');

exports.index = (req, res) => {
  res.json({ data: patientModel.all() });
};

exports.show = (req, res) => {
  const patient = patientModel.find(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json({ data: patient });
};

/** What the clinician has already scheduled for this patient. */
exports.reminders = (req, res) => {
  if (!patientModel.exists(req.params.id)) return res.status(404).json({ error: 'Patient not found' });
  res.json({ data: reminderModel.upcoming(req.params.id) });
};

/** Assign a test, medicine, appointment, vaccine or exercise to this patient. */
exports.assign = (req, res) => {
  const { id } = req.params;
  if (!patientModel.exists(id)) return res.status(404).json({ error: 'Patient not found' });
  if (!req.body?.assignedBy) return res.status(400).json({ error: 'assignedBy is required' });
  try {
    res.status(201).json({ data: reminderModel.create(id, req.body) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/** Her symptom journal, so the clinician sees what she has been logging. */
exports.symptoms = (req, res) => {
  if (!patientModel.exists(req.params.id)) return res.status(404).json({ error: 'Patient not found' });
  res.json({ data: symptomModel.all(req.params.id) });
};

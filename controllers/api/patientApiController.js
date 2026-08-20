/**
 * Patient API Controller — the clinician-facing endpoints.
 * Reads the caseload and writes care items onto a *specific* patient's account,
 * rather than the current session user.
 */
const patientModel = require('../../models/patientModel');
const reminderModel = require('../../models/reminderModel');
const symptomModel = require('../../models/symptomModel');

exports.index = async (req, res, next) => {
  try {
    res.json({ data: await patientModel.all() });
  } catch (err) { next(err); }
};

exports.show = async (req, res, next) => {
  try {
    const patient = await patientModel.find(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json({ data: patient });
  } catch (err) { next(err); }
};

/** What the clinician has already scheduled for this patient. */
exports.reminders = async (req, res, next) => {
  try {
    if (!(await patientModel.exists(req.params.id))) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({ data: await reminderModel.upcoming(req.params.id) });
  } catch (err) { next(err); }
};

/** Assign a test, medicine, appointment, vaccine or exercise to this patient. */
exports.assign = async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await patientModel.exists(id))) return res.status(404).json({ error: 'Patient not found' });
    if (!req.body?.assignedBy) return res.status(400).json({ error: 'assignedBy is required' });
    res.status(201).json({ data: await reminderModel.create(id, req.body) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/** Her symptom journal, so the clinician sees what she has been logging. */
exports.symptoms = async (req, res, next) => {
  try {
    if (!(await patientModel.exists(req.params.id))) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({ data: await symptomModel.all(req.params.id) });
  } catch (err) { next(err); }
};

/**
 * Patient API Controller — the clinician-facing endpoints.
 * Reads the caseload and writes care items onto a *specific* patient's account,
 * rather than the current session user.
 */
const patientModel = require('../../models/patientModel');
const reminderModel = require('../../models/reminderModel');
const symptomModel = require('../../models/symptomModel');
const doctorModel = require('../../models/doctorModel');

async function myDoctor(req) { return doctorModel.forUser(req.user.id); }

exports.index = async (req, res, next) => {
  try {
    const doctor = await myDoctor(req);
    if (!doctor) return res.status(403).json({ error: 'No clinician profile is linked to this account' });
    res.json({ data: await patientModel.allForDoctor(doctor.id) });
  } catch (err) { next(err); }
};

exports.show = async (req, res, next) => {
  try {
    const doctor = await myDoctor(req);
    const patient = doctor && await patientModel.findForDoctor(req.params.id, doctor.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json({ data: patient });
  } catch (err) { next(err); }
};

/** What the clinician has already scheduled for this patient. */
exports.reminders = async (req, res, next) => {
  try {
    const doctor = await myDoctor(req);
    if (!doctor || !(await patientModel.existsForDoctor(req.params.id, doctor.id))) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({ data: await reminderModel.upcoming(req.params.id) });
  } catch (err) { next(err); }
};

/** Assign a test, medicine, appointment, vaccine or exercise to this patient. */
exports.assign = async (req, res) => {
  const { id } = req.params;
  try {
    const doctor = await myDoctor(req);
    if (!doctor || !(await patientModel.existsForDoctor(id, doctor.id))) return res.status(404).json({ error: 'Patient not found' });
    if (!req.body?.assignedBy) return res.status(400).json({ error: 'assignedBy is required' });
    res.status(201).json({ data: await reminderModel.create(id, req.body) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/** Her symptom journal, so the clinician sees what she has been logging. */
exports.symptoms = async (req, res, next) => {
  try {
    const doctor = await myDoctor(req);
    if (!doctor || !(await patientModel.existsForDoctor(req.params.id, doctor.id))) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({ data: await symptomModel.all(req.params.id) });
  } catch (err) { next(err); }
};

/**
 * Care Ending API Controller — ending the arrangement between a mother and a
 * clinician, from either side.
 *
 * Distinct from cancelling an appointment, which lives in the care controller.
 * That ends one visit; this ends the relationship the visits sit inside — the
 * clinician on her care team, the month of messaging, the person her records
 * are shared with.
 */
const careEndingModel = require('../../models/careEndingModel');
const userModel = require('../../models/userModel');
const doctorModel = require('../../models/doctorModel');
const patientModel = require('../../models/patientModel');

/** The reasons one side may give, and whether a written note is required. */
exports.reasons = async (req, res, next) => {
  try {
    const side = req.query.side === 'doctor' ? 'doctor' : 'mother';
    return res.json({ data: careEndingModel.reasons(side) });
  } catch (err) { return next(err); }
};

/** The mother ends it with one of her clinicians. */
exports.endByMother = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const { doctorId } = req.params;
    if (!(await doctorModel.exists(doctorId))) {
      return res.status(404).json({ error: 'Clinician not found' });
    }
    const ended = await careEndingModel.end({
      userId: user.id,
      doctorId,
      endedBy: 'mother',
      reason: req.body?.reason,
      note: req.body?.note,
    });
    return res.status(201).json({ data: ended });
  } catch (err) {
    if (err instanceof careEndingModel.EndingError) {
      const status = err.code === 'ALREADY_ENDED' ? 409 : 400;
      return res.status(status).json({ error: err.message, code: err.code });
    }
    return next(err);
  }
};

/**
 * The clinician ends it with a patient.
 *
 * A note is required on this side and enforced in the model. A doctor
 * discharging someone owes them a sentence about why, and "the system made me
 * pick from a dropdown" is not one.
 */
exports.endByDoctor = async (req, res, next) => {
  try {
    const { doctorId, patientId } = req.params;
    if (!(await doctorModel.exists(doctorId))) {
      return res.status(404).json({ error: 'Clinician not found' });
    }
    if (!(await patientModel.exists(patientId))) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    const ended = await careEndingModel.end({
      userId: patientId,
      doctorId,
      endedBy: 'doctor',
      reason: req.body?.reason,
      note: req.body?.note,
    });
    return res.status(201).json({ data: ended });
  } catch (err) {
    if (err instanceof careEndingModel.EndingError) {
      const status = err.code === 'ALREADY_ENDED' ? 409 : 400;
      return res.status(status).json({ error: err.message, code: err.code });
    }
    return next(err);
  }
};

/** Her own history of endings, both directions. */
exports.mine = async (req, res, next) => {
  try {
    const user = await userModel.current();
    return res.json({ data: await careEndingModel.forUser(user.id) });
  } catch (err) { return next(err); }
};

/**
 * A clinician's history, with the reasons counted.
 *
 * The counts are the point. One mother leaving tells a doctor nothing; four
 * of them saying the replies were too slow is the only feedback of this kind
 * they will ever get, because nobody says it to a doctor's face.
 */
exports.forDoctor = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    if (!(await doctorModel.exists(doctorId))) {
      return res.status(404).json({ error: 'Clinician not found' });
    }
    return res.json({ data: await careEndingModel.forDoctor(doctorId) });
  } catch (err) { return next(err); }
};

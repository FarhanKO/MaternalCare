/**
 * Guidance API Controller — the personalised nutrition, movement and
 * lifestyle plan.
 *
 * Two endpoints for the same document: the mother reads her own, a clinician
 * reads a patient's. It matters that they are the same document. A doctor
 * needs to know what the app has been telling her, not a separate clinical
 * summary — half the value of showing it in the portal is that a
 * recommendation she has been following can be corrected.
 */
const guidanceModel = require('../../models/guidanceModel');
const userModel = require('../../models/userModel');
const patientModel = require('../../models/patientModel');

/** Her own plan. */
exports.mine = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const plan = await guidanceModel.forUser(user.id);
    if (!plan) return res.status(404).json({ error: 'No plan could be built' });
    return res.json({ data: plan });
  } catch (err) { return next(err); }
};

/** A patient's plan, for the clinician portal. */
exports.forPatient = async (req, res, next) => {
  try {
    // checked against the caseload rather than the users table, so a clinician
    // cannot read a plan for someone who is not their patient by guessing an id
    if (!(await patientModel.exists(req.params.id))) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    const plan = await guidanceModel.forUser(req.params.id);
    if (!plan) return res.status(404).json({ error: 'No plan could be built' });
    return res.json({ data: plan });
  } catch (err) { return next(err); }
};

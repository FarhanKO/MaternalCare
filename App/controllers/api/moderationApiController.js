/**
 * Moderation API Controller — the clinician's side of the community board.
 *
 * Reporting lives in the community controller because it is something a member
 * does. Deciding lives here because it is something a clinician does, and the
 * two want different answers to "who is allowed".
 */
const moderationModel = require('../../models/moderationModel');
const doctorModel = require('../../models/doctorModel');

/** Everything waiting on a decision, grouped by the item reported. */
exports.queue = async (req, res, next) => {
  try {
    const state = ['open', 'upheld', 'dismissed', 'all'].includes(req.query.state)
      ? req.query.state
      : 'open';
    const [groups, open] = await Promise.all([
      moderationModel.queue({ state }),
      moderationModel.openCount(),
    ]);
    return res.json({
      data: groups,
      meta: { state, open, urgent: groups.filter((g) => g.urgent).length },
    });
  } catch (err) { return next(err); }
};

/** How many are waiting — for the badge on the portal's nav. */
exports.count = async (req, res, next) => {
  try {
    return res.json({ data: { open: await moderationModel.openCount() } });
  } catch (err) { return next(err); }
};

/**
 * Uphold or dismiss every open report against one item.
 *
 * The reviewing clinician is named in the body rather than inferred, because
 * this app has no session for them yet and a moderation log that records
 * "somebody" is not worth writing. It is validated against the doctors table
 * so the column cannot be filled with an id that means nothing.
 */
exports.resolve = async (req, res, next) => {
  try {
    const { action, note } = req.body || {};
    const doctor = await doctorModel.forUser(req.user.id);
    if (!doctor) return res.status(403).json({ error: 'No clinician profile is linked to this account' });
    const result = await moderationModel.resolve({
      target: req.params.target === 'comments' ? 'comment' : 'post',
      id: req.params.id,
      action,
      note,
      reviewerId: doctor.id,
    });
    return res.json({ data: result });
  } catch (err) {
    if (err instanceof moderationModel.ReportError) {
      const status = err.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ error: err.message, code: err.code });
    }
    return next(err);
  }
};

/**
 * Guardian API Controller — everything the companion app reads.
 *
 * The link token is the only credential, so every handler resolves it and a
 * bad one is a flat 404: telling an unknown caller that a token *exists* but
 * is wrong would leak that the person is on someone's guardian list.
 */
const guardianModel = require('../../models/guardianModel');

const notFound = (res) => res.status(404).json({ error: 'This link is not valid' });

exports.dashboard = async (req, res, next) => {
  try {
    const data = await guardianModel.dashboard(req.params.token);
    return data ? res.json({ data }) : notFound(res);
  } catch (err) { return next(err); }
};

exports.vitals = async (req, res, next) => {
  try {
    const data = await guardianModel.vitals(req.params.token);
    return data ? res.json({ data }) : notFound(res);
  } catch (err) { return next(err); }
};

/** Polled on a tight loop by the app, so it stays deliberately small. */
exports.alert = async (req, res, next) => {
  try {
    const data = await guardianModel.alert(req.params.token);
    return data ? res.json({ data }) : notFound(res);
  } catch (err) { return next(err); }
};

exports.acknowledge = async (req, res, next) => {
  try {
    const updated = await guardianModel.acknowledge(req.params.token);
    if (!updated) return res.status(409).json({ error: 'There is no active alert' });
    return res.json({ data: updated });
  } catch (err) { return next(err); }
};

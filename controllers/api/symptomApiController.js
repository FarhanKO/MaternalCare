/**
 * Symptom API Controller
 * Serves the React dashboard (client-side View). Uses the same Model layer
 * as the EJS controllers — no business logic lives here.
 */
const userModel = require('../../models/userModel');
const symptomModel = require('../../models/symptomModel');

exports.index = async (req, res, next) => {
  try {
    const user = await userModel.current();
    res.json({ data: await symptomModel.all(user.id) });
  } catch (err) { next(err); }
};

exports.replace = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const list = Array.isArray(req.body?.symptoms) ? req.body.symptoms : null;
    if (!list) return res.status(400).json({ error: 'Expected { symptoms: [] }' });
    res.json({ data: await symptomModel.replaceAll(user.id, list) });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Symptom name is required' });
    res.status(201).json({ data: await symptomModel.create(user.id, req.body) });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const updated = await symptomModel.update(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'Symptom not found' });
    res.json({ data: updated });
  } catch (err) { next(err); }
};

exports.destroy = async (req, res, next) => {
  try {
    await symptomModel.remove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
};

/** Ends the current entry: next visit asks "still there?" for each symptom. */
exports.clearConfirmations = async (req, res, next) => {
  try {
    const user = await userModel.current();
    res.json({ data: await symptomModel.clearConfirmations(user.id) });
  } catch (err) { next(err); }
};

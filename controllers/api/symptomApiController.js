/**
 * Symptom API Controller
 * Serves the React dashboard (client-side View). Uses the same Model layer
 * as the EJS controllers — no business logic lives here.
 */
const userModel = require('../../models/userModel');
const symptomModel = require('../../models/symptomModel');

exports.index = (req, res) => {
  const user = userModel.current();
  res.json({ data: symptomModel.all(user.id) });
};

exports.replace = (req, res) => {
  const user = userModel.current();
  const list = Array.isArray(req.body?.symptoms) ? req.body.symptoms : null;
  if (!list) return res.status(400).json({ error: 'Expected { symptoms: [] }' });
  res.json({ data: symptomModel.replaceAll(user.id, list) });
};

exports.create = (req, res) => {
  const user = userModel.current();
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Symptom name is required' });
  res.status(201).json({ data: symptomModel.create(user.id, req.body) });
};

exports.update = (req, res) => {
  const updated = symptomModel.update(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Symptom not found' });
  res.json({ data: updated });
};

exports.destroy = (req, res) => {
  symptomModel.remove(req.params.id);
  res.status(204).end();
};

/** Ends the current entry: next visit asks "still there?" for each symptom. */
exports.clearConfirmations = (req, res) => {
  const user = userModel.current();
  res.json({ data: symptomModel.clearConfirmations(user.id) });
};

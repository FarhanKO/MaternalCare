/**
 * SOS API Controller — emergency alerts and the guardians they reach.
 */
const sosModel = require('../../models/sosModel');
const doctorModel = require('../../models/doctorModel');
const userModel = require('../../models/userModel');

/* --------------------------------------------------------------- mother */

exports.state = async (req, res, next) => {
  try {
    const user = await userModel.current();
    // four independent reads — no reason for the panel to wait on them in turn
    const [active, contacts, history, emergencyNumber] = await Promise.all([
      sosModel.active(user.id),
      sosModel.contacts(user.id),
      sosModel.history(user.id),
      sosModel.emergencyNumber(user.id),
    ]);
    res.json({ data: { active, contacts, history, emergencyNumber } });
  } catch (err) { next(err); }
};

exports.setEmergencyNumber = async (req, res) => {
  try {
    const user = await userModel.current();
    const emergencyNumber = await sosModel.setEmergencyNumber(user.id, req.body?.number);
    res.json({ data: { emergencyNumber } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.trigger = async (req, res, next) => {
  const { lat, lng, accuracy, locationNote } = req.body || {};
  try {
    const user = await userModel.current();
    const alert = await sosModel.trigger(user.id, {
      lat: Number(lat), lng: Number(lng), accuracy: Number(accuracy), locationNote,
    });
    res.status(201).json({ data: alert });
  } catch (err) { next(err); }
};

/** Stand down: 'safe' after the fact, 'cancelled' during the countdown. */
exports.close = async (req, res) => {
  try {
    const user = await userModel.current();
    const closed = await sosModel.close(req.params.id, user.id, req.body?.status ?? 'safe', 'mother');
    if (!closed) return res.status(404).json({ error: 'Alert not found' });
    return res.json({ data: closed });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

exports.contacts = async (req, res, next) => {
  try {
    const user = await userModel.current();
    res.json({ data: await sosModel.contacts(user.id) });
  } catch (err) { next(err); }
};

exports.addContact = async (req, res) => {
  try {
    const user = await userModel.current();
    res.status(201).json({ data: await sosModel.addContact(user.id, req.body || {}) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.removeContact = async (req, res, next) => {
  try {
    const user = await userModel.current();
    if (!(await sosModel.removeContact(req.params.id, user.id))) {
      return res.status(404).json({ error: 'Guardian not found' });
    }
    return res.status(204).end();
  } catch (err) { return next(err); }
};

/* ------------------------------------------------------------ clinician */

/*
 * There was a `hospitals` endpoint here, serving a table of four named
 * institutions with placeholder phone numbers. It has been removed with the
 * table. An emergency screen is the last place to show a directory nobody is
 * maintaining: a mother would have read a name she recognised, dialled a
 * number that was never real, and lost the minutes she had. What is left is
 * what works — the national emergency number, and the contacts she chose
 * herself.
 */

exports.forDoctor = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (!(await doctorModel.exists(id))) return res.status(404).json({ error: 'Clinician not found' });
    return res.json({ data: await sosModel.openForDoctor(id) });
  } catch (err) { return next(err); }
};

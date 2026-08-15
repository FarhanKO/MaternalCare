/**
 * SOS API Controller — emergency alerts and the guardians they reach.
 */
const sosModel = require('../../models/sosModel');
const doctorModel = require('../../models/doctorModel');
const userModel = require('../../models/userModel');

/* --------------------------------------------------------------- mother */

exports.state = (req, res) => {
  const user = userModel.current();
  res.json({
    data: {
      active: sosModel.active(user.id),
      contacts: sosModel.contacts(user.id),
      history: sosModel.history(user.id),
    },
  });
};

exports.trigger = (req, res) => {
  const user = userModel.current();
  const { lat, lng, accuracy, locationNote } = req.body || {};
  res.status(201).json({
    data: sosModel.trigger(user.id, {
      lat: Number(lat), lng: Number(lng), accuracy: Number(accuracy), locationNote,
    }),
  });
};

/** Stand down: 'safe' after the fact, 'cancelled' during the countdown. */
exports.close = (req, res) => {
  const user = userModel.current();
  try {
    const closed = sosModel.close(req.params.id, user.id, req.body?.status ?? 'safe', 'mother');
    if (!closed) return res.status(404).json({ error: 'Alert not found' });
    res.json({ data: closed });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.contacts = (req, res) => {
  res.json({ data: sosModel.contacts(userModel.current().id) });
};

exports.addContact = (req, res) => {
  const user = userModel.current();
  try {
    res.status(201).json({ data: sosModel.addContact(user.id, req.body || {}) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.removeContact = (req, res) => {
  const user = userModel.current();
  if (!sosModel.removeContact(req.params.id, user.id)) {
    return res.status(404).json({ error: 'Guardian not found' });
  }
  res.status(204).end();
};

/* ------------------------------------------------------------ clinician */

exports.forDoctor = (req, res) => {
  const { id } = req.params;
  if (!doctorModel.exists(id)) return res.status(404).json({ error: 'Clinician not found' });
  res.json({ data: sosModel.openForDoctor(id) });
};

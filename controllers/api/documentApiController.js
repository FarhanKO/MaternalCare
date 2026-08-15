/**
 * Document API Controller — prescriptions and reports.
 * The mother owns her own documents; a clinician can read and file to any
 * patient on the caseload.
 */
const fs = require('fs');
const documentModel = require('../../models/documentModel');
const patientModel = require('../../models/patientModel');
const userModel = require('../../models/userModel');

const kindFrom = (q) => (documentModel.KINDS.includes(q) ? q : undefined);

/* ---------------------------------------------------------------- mother */

exports.index = (req, res) => {
  const user = userModel.current();
  res.json({
    data: documentModel.forUser(user.id, kindFrom(req.query.kind)),
    meta: documentModel.countsFor(user.id),
  });
};

exports.create = (req, res) => {
  const user = userModel.current();
  try {
    res.status(201).json({ data: documentModel.create(user.id, req.body || {}) });
  } catch (err) {
    if (err instanceof documentModel.DocumentError) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    throw err;
  }
};

exports.destroy = (req, res) => {
  const user = userModel.current();
  const doc = documentModel.find(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  // clinic-filed documents belong to the clinic, matching how reminders work
  if (doc.uploadedBy !== 'mother') {
    return res.status(403).json({ error: `Only ${doc.uploadedBy} can remove this` });
  }
  if (!documentModel.remove(req.params.id, user.id)) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.status(204).end();
};

/**
 * The bytes. Served from disk rather than inlined into JSON so the browser
 * can cache them and the list payload stays small.
 */
exports.file = (req, res) => {
  const found = documentModel.pathFor(req.params.id);
  if (!found) return res.status(404).json({ error: 'File not found' });
  res.type(found.mime);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  fs.createReadStream(found.path).pipe(res);
};

/* ------------------------------------------------------------- clinician */

exports.forPatient = (req, res) => {
  const { id } = req.params;
  if (!patientModel.exists(id)) return res.status(404).json({ error: 'Patient not found' });
  res.json({
    data: documentModel.forUser(id, kindFrom(req.query.kind)),
    meta: documentModel.countsFor(id),
  });
};

/** A clinician filing a scan or result onto the patient's record. */
exports.createForPatient = (req, res) => {
  const { id } = req.params;
  if (!patientModel.exists(id)) return res.status(404).json({ error: 'Patient not found' });
  if (!req.body?.uploadedBy) return res.status(400).json({ error: 'uploadedBy is required' });
  try {
    res.status(201).json({ data: documentModel.create(id, req.body) });
  } catch (err) {
    if (err instanceof documentModel.DocumentError) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    throw err;
  }
};

/**
 * Document API Controller — prescriptions and reports.
 * The mother owns her own documents; a clinician can read and file to any
 * patient on the caseload.
 */
const fs = require('fs');
const documentModel = require('../../models/documentModel');
const patientModel = require('../../models/patientModel');
const userModel = require('../../models/userModel');
const doctorModel = require('../../models/doctorModel');

const kindFrom = (q) => (documentModel.KINDS.includes(q) ? q : undefined);

/* ---------------------------------------------------------------- mother */

exports.index = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const [data, meta] = await Promise.all([
      documentModel.forUser(user.id, kindFrom(req.query.kind)),
      documentModel.countsFor(user.id),
    ]);
    res.json({ data, meta });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const user = await userModel.current();
    res.status(201).json({ data: await documentModel.create(user.id, req.body || {}) });
  } catch (err) {
    if (err instanceof documentModel.DocumentError) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    return next(err);
  }
};

exports.destroy = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const doc = await documentModel.find(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    // clinic-filed documents belong to the clinic, matching how reminders work
    if (doc.uploadedBy !== 'mother') {
      return res.status(403).json({ error: `Only ${doc.uploadedBy} can remove this` });
    }
    if (!(await documentModel.remove(req.params.id, user.id))) {
      return res.status(404).json({ error: 'Document not found' });
    }
    return res.status(204).end();
  } catch (err) { return next(err); }
};

/**
 * The bytes. Served from disk rather than inlined into JSON so the browser
 * can cache them and the list payload stays small.
 */
exports.file = async (req, res, next) => {
  try {
    const found = await documentModel.pathFor(req.params.id);
    if (!found) return res.status(404).json({ error: 'File not found' });
    res.type(found.mime);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return fs.createReadStream(found.path).pipe(res);
  } catch (err) { return next(err); }
};

/* ------------------------------------------------------------- clinician */

exports.forPatient = async (req, res, next) => {
  const { id } = req.params;
  try {
    const doctor = await doctorModel.forUser(req.user.id);
    if (!doctor || !(await patientModel.existsForDoctor(id, doctor.id))) return res.status(404).json({ error: 'Patient not found' });
    const [data, meta] = await Promise.all([
      documentModel.forUser(id, kindFrom(req.query.kind)),
      documentModel.countsFor(id),
    ]);
    return res.json({ data, meta });
  } catch (err) { return next(err); }
};

/** A clinician filing a scan or result onto the patient's record. */
exports.createForPatient = async (req, res, next) => {
  const { id } = req.params;
  try {
    const doctor = await doctorModel.forUser(req.user.id);
    if (!doctor || !(await patientModel.existsForDoctor(id, doctor.id))) return res.status(404).json({ error: 'Patient not found' });
    if (!req.body?.uploadedBy) return res.status(400).json({ error: 'uploadedBy is required' });
    return res.status(201).json({ data: await documentModel.create(id, req.body) });
  } catch (err) {
    if (err instanceof documentModel.DocumentError) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    return next(err);
  }
};

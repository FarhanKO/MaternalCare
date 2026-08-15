/**
 * Message API Controller — the mother/doctor conversation.
 *
 * A mother can only write to a clinician she actually has a relationship
 * with: one she has an appointment with, or one who has already written to
 * her. That keeps the inbox from becoming an open channel to every doctor
 * on the system.
 */
const db = require('../../config/database');
const messageModel = require('../../models/messageModel');
const doctorModel = require('../../models/doctorModel');
const patientModel = require('../../models/patientModel');
const userModel = require('../../models/userModel');

/** Doctors this mother is entitled to message. */
function careTeamFor(userId) {
  const rows = db.prepare(`
    SELECT DISTINCT d.id, d.name, d.specialty, d.hospital, d.qualification
    FROM appointments a JOIN doctors d ON d.id = a.doctor_id
    WHERE a.user_id = ? AND a.status IN ('accepted','completed','requested')
  `).all(userId);

  const seen = new Set(rows.map((r) => String(r.id)));
  // a doctor who wrote first is reachable even without a booking
  for (const t of messageModel.threadsForUser(userId)) {
    if (seen.has(t.doctorId)) continue;
    const d = doctorModel.find(t.doctorId);
    if (d) {
      rows.push({ id: d.id, name: d.name, specialty: d.specialty, hospital: d.hospital, qualification: d.qualification });
      seen.add(t.doctorId);
    }
  }

  return rows.map((r) => ({
    doctorId: String(r.id),
    doctorName: r.name,
    specialty: r.specialty,
    hospital: r.hospital,
    qualification: r.qualification || '',
    unread: messageModel.unread(userId, r.id, 'mother'),
  }));
}

const canMessage = (userId, doctorId) =>
  careTeamFor(userId).some((c) => c.doctorId === String(doctorId));

/* ------------------------------------------------------------- mother side */

exports.careTeam = (req, res) => {
  res.json({ data: careTeamFor(userModel.current().id) });
};

exports.threads = (req, res) => {
  const user = userModel.current();
  res.json({
    data: messageModel.threadsForUser(user.id),
    meta: { unread: messageModel.unreadForUser(user.id) },
  });
};

/** Opening a thread marks the doctor's lines as read. */
exports.thread = (req, res) => {
  const user = userModel.current();
  const { doctorId } = req.params;
  if (!doctorModel.exists(doctorId)) return res.status(404).json({ error: 'Clinician not found' });
  messageModel.markRead(user.id, doctorId, 'mother');
  res.json({ data: messageModel.thread(user.id, doctorId) });
};

exports.send = (req, res) => {
  const user = userModel.current();
  const { doctorId, body } = req.body || {};
  if (!doctorModel.exists(doctorId)) return res.status(404).json({ error: 'Clinician not found' });
  if (!canMessage(user.id, doctorId)) {
    return res.status(403).json({
      error: 'You can only message a doctor you have an appointment with',
    });
  }
  try {
    res.status(201).json({ data: messageModel.send(user.id, doctorId, 'mother', body) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/* ---------------------------------------------------------- clinician side */

exports.doctorThreads = (req, res) => {
  const { id } = req.params;
  if (!doctorModel.exists(id)) return res.status(404).json({ error: 'Clinician not found' });
  res.json({
    data: messageModel.threadsForDoctor(id),
    meta: { unread: messageModel.unreadForDoctor(id) },
  });
};

exports.doctorThread = (req, res) => {
  const { id, patientId } = req.params;
  if (!doctorModel.exists(id)) return res.status(404).json({ error: 'Clinician not found' });
  if (!patientModel.exists(patientId)) return res.status(404).json({ error: 'Patient not found' });
  messageModel.markRead(patientId, id, 'doctor');
  res.json({ data: messageModel.thread(patientId, id) });
};

/** A clinician may open a conversation with anyone on their caseload. */
exports.doctorSend = (req, res) => {
  const { id } = req.params;
  const { patientId, body } = req.body || {};
  if (!doctorModel.exists(id)) return res.status(404).json({ error: 'Clinician not found' });
  if (!patientModel.exists(patientId)) return res.status(404).json({ error: 'Patient not found' });
  try {
    res.status(201).json({ data: messageModel.send(patientId, id, 'doctor', body) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Message API Controller — the mother/doctor conversation.
 *
 * A mother can only write to a clinician she actually has a relationship
 * with: one she has an appointment with, or one who has already written to
 * her. That keeps the inbox from becoming an open channel to every doctor
 * on the system.
 */
const db = require('../../config/db');
const messageModel = require('../../models/messageModel');
const doctorModel = require('../../models/doctorModel');
const patientModel = require('../../models/patientModel');
const userModel = require('../../models/userModel');
const appointmentModel = require('../../models/appointmentModel');

/**
 * Doctors this mother is entitled to message.
 *
 * The unread counts used to be a query per clinician. They arrive with the
 * threads she already has, so the only extra work is for a doctor she has an
 * appointment with but has never spoken to — whose count is zero by definition.
 */
async function careTeamFor(userId) {
  const [rows, threads] = await Promise.all([
    db.sql(`
      SELECT DISTINCT d.id, d.name, d.specialty, d.hospital, d.qualification
      FROM appointments a JOIN doctors d ON d.id = a.doctor_id
      WHERE a.user_id = $1 AND a.status IN ('accepted','completed','requested')
    `, [userId]),
    messageModel.threadsForUser(userId),
  ]);

  const seen = new Set(rows.map((r) => String(r.id)));
  // a doctor who wrote first is reachable even without a booking
  for (const t of threads) {
    if (seen.has(t.doctorId)) continue;
    const d = await doctorModel.find(t.doctorId);
    if (d) {
      rows.push({
        id: d.id, name: d.name, specialty: d.specialty, hospital: d.hospital,
        qualification: d.qualification,
      });
      seen.add(t.doctorId);
    }
  }

  const unreadBy = new Map(threads.map((t) => [String(t.doctorId), t.unread ?? 0]));

  // whether her month of messaging with each of them is still running
  const chat = await Promise.all(
    rows.map((r) => appointmentModel.chatOpen(userId, r.id)),
  );

  return rows.map((r, i) => ({
    doctorId: String(r.id),
    doctorName: r.name,
    specialty: r.specialty,
    hospital: r.hospital,
    qualification: r.qualification || '',
    unread: unreadBy.get(String(r.id)) ?? 0,
    chatOpen: chat[i].open,
    chatUntil: chat[i].until ?? undefined,
  }));
}

const canMessage = async (userId, doctorId) =>
  (await careTeamFor(userId)).some((c) => c.doctorId === String(doctorId));

/* ------------------------------------------------------------- mother side */

exports.careTeam = async (req, res, next) => {
  try {
    const user = await userModel.current();
    res.json({ data: await careTeamFor(user.id) });
  } catch (err) { next(err); }
};

exports.threads = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const [data, unread] = await Promise.all([
      messageModel.threadsForUser(user.id),
      messageModel.unreadForUser(user.id),
    ]);
    res.json({ data, meta: { unread } });
  } catch (err) { next(err); }
};

/** Opening a thread marks the doctor's lines as read. */
exports.thread = async (req, res, next) => {
  const { doctorId } = req.params;
  try {
    const user = await userModel.current();
    if (!(await doctorModel.exists(doctorId))) {
      return res.status(404).json({ error: 'Clinician not found' });
    }
    await messageModel.markRead(user.id, doctorId, 'mother');
    return res.json({ data: await messageModel.thread(user.id, doctorId) });
  } catch (err) { return next(err); }
};

exports.send = async (req, res) => {
  const { doctorId, body, kind, image } = req.body || {};
  try {
    const user = await userModel.current();
    if (!(await doctorModel.exists(doctorId))) {
      return res.status(404).json({ error: 'Clinician not found' });
    }
    if (!(await canMessage(user.id, doctorId))) {
      return res.status(403).json({
        error: 'You can only message a doctor you have an appointment with',
      });
    }
    // a mother never sends 'call-link' — that is the clinician's to give
    const asked = kind === 'image' || kind === 'call-request' ? kind : 'text';
    const sent = await messageModel.send(user.id, doctorId, 'mother', body, { kind: asked, image });
    return res.status(201).json({ data: sent });
  } catch (err) {
    // the link rule is a rule, not a validation failure — the client shows a
    // dialog explaining who arranges calls, so it needs to tell them apart
    if (err.code === 'LINK_NOT_ALLOWED') {
      return res.status(422).json({
        error: 'Send failed — links cannot be sent from here.',
        code: err.code,
        hint: 'Schedule a meeting with your doctor first. They will send the joining link into this chat.',
      });
    }
    return res.status(400).json({ error: err.message });
  }
};

/** The photograph itself, streamed from disk rather than inlined in the list. */
exports.attachment = (req, res) => {
  const full = messageModel.attachmentPath(req.params.file);
  if (!full) return res.status(404).json({ error: 'Attachment not found' });
  res.setHeader('Cache-Control', 'private, max-age=3600');
  return require('fs').createReadStream(full).pipe(res);
};

/* ---------------------------------------------------------- clinician side */

exports.doctorThreads = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (!(await doctorModel.exists(id))) return res.status(404).json({ error: 'Clinician not found' });
    const [data, unread] = await Promise.all([
      messageModel.threadsForDoctor(id),
      messageModel.unreadForDoctor(id),
    ]);
    return res.json({ data, meta: { unread } });
  } catch (err) { return next(err); }
};

exports.doctorThread = async (req, res, next) => {
  const { id, patientId } = req.params;
  try {
    if (!(await doctorModel.exists(id))) return res.status(404).json({ error: 'Clinician not found' });
    if (!(await patientModel.exists(patientId))) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    await messageModel.markRead(patientId, id, 'doctor');
    return res.json({ data: await messageModel.thread(patientId, id) });
  } catch (err) { return next(err); }
};

/**
 * A clinician may open a conversation with anyone on their caseload — and,
 * unlike the mother, may send a joining link, because arranging the call is
 * their end of the deal.
 */
exports.doctorSend = async (req, res) => {
  const { id } = req.params;
  const { patientId, body, kind, image } = req.body || {};
  try {
    if (!(await doctorModel.exists(id))) return res.status(404).json({ error: 'Clinician not found' });
    if (!(await patientModel.exists(patientId))) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    const asked = ['image', 'call-link'].includes(kind) ? kind : 'text';
    const sent = await messageModel.send(patientId, id, 'doctor', body, { kind: asked, image });
    return res.status(201).json({ data: sent });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

/**
 * Visits about to start, so the clinician can be told to post a link before
 * the patient is sitting there waiting. Computed on read: no scheduler, and
 * nothing written into the conversation that the mother would see as noise.
 */
exports.doctorUpcoming = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (!(await doctorModel.exists(id))) return res.status(404).json({ error: 'Clinician not found' });
    const minutes = Math.min(720, Math.max(5, Number(req.query.within) || 60));
    return res.json({ data: await appointmentModel.imminentForDoctor(id, minutes), meta: { minutes } });
  } catch (err) { return next(err); }
};

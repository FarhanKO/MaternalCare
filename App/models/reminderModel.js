/**
 * Reminder Model — appointments & reminders created by the mother, or
 * scheduled for her by a clinician.
 */
const db = require('../config/db');

const KINDS = ['medicine', 'doctor', 'test', 'exercise', 'vaccination'];
const REPEATS = ['once', 'daily', 'weekly'];

const toDTO = (r) => ({
  id: String(r.id),
  kind: r.kind,
  title: r.title,
  note: r.note || undefined,
  at: r.due_at,
  repeat: r.repeat,
  // set when a clinician scheduled this for the mother
  assignedBy: r.assigned_by || undefined,
});

module.exports = {
  KINDS,


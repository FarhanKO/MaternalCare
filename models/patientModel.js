/**
 * Patient Model — the clinician's view of the mothers under their care.
 * Assembles each patient from her own account, pregnancy, vitals and symptoms,
 * and derives the triage fields the caseload screen needs.
 */
const db = require('../config/database');
const pregnancyModel = require('./pregnancyModel');
const symptomModel = require('./symptomModel');

const DAY = 86400000;

/** Human "2 weeks ago" / "in 3 days" from an ISO date string. */
function relative(dateStr) {
  if (!dateStr) return '—';
  const days = Math.round((new Date(dateStr + 'T00:00:00') - Date.now()) / DAY);
  const abs = Math.abs(days);
  if (abs === 0) return 'today';
  const unit = abs < 7 ? [abs, abs === 1 ? 'day' : 'days']
    : abs < 30 ? [Math.round(abs / 7), Math.round(abs / 7) === 1 ? 'week' : 'weeks']
    : [Math.round(abs / 30), Math.round(abs / 30) === 1 ? 'month' : 'months'];
  return days < 0 ? `${unit[0]} ${unit[1]} ago` : `in ${unit[0]} ${unit[1]}`;
}

/** Latest N systolic readings, oldest first — drives the caseload sparkline. */
function bpTrend(userId, n = 5) {
  return db
    .prepare('SELECT systolic, diastolic FROM vitals WHERE user_id = ? ORDER BY date DESC LIMIT ?')
    .all(userId, n)
    .reverse();
}

/**
 * Triage level from the newest blood pressure, history and age.
 * Supports the clinician's judgement — it does not replace it.
 */
function riskFor({ sys, dia, conditions, age }) {
  const flagged = /hypertension|diabetes|Rh negative|anaemia|anemia|pre-eclampsia/i.test(conditions || '');
  if (sys >= 140 || dia >= 90) return 'high';
  if (flagged && (sys >= 130 || age >= 35)) return 'high';
  if (sys >= 130 || dia >= 85 || flagged || age >= 35) return 'moderate';
  return 'low';
}

/** Wellbeing score, mirroring the client-side calculation closely enough to triage on. */
function scoreFor(userId, sys) {
  const burden = symptomModel.burden(userId);
  const bpPenalty = sys >= 140 ? 30 : sys >= 130 ? 15 : 0;
  return Math.max(0, Math.min(100, Math.round(100 - burden - bpPenalty)));
}

function toDTO(u) {
  const preg = pregnancyModel.forUser(u.id);
  const trend = bpTrend(u.id);
  const latest = trend[trend.length - 1] || { systolic: 118, diastolic: 76 };
  const conditions = (u.conditions || '').split(',').map((c) => c.trim()).filter(Boolean);
  const symptoms = symptomModel.all(u.id);

  const flags = [
    ...symptoms
      .filter((s) => symptomModel.URGENT.has(s.name) || s.daysPresent >= 5)
      .map((s) => `${s.name} · day ${s.daysPresent}`),
    ...(latest.systolic >= 140 ? ['Raised BP'] : []),
  ];

  const risk = riskFor({
    sys: latest.systolic, dia: latest.diastolic, conditions: u.conditions, age: u.age,
  });

  return {
    id: String(u.id),
    name: u.name,
    age: u.age,
    week: preg ? preg.week : 0,
    risk,
    bloodGroup: u.blood_group,
    lastVisit: relative(u.last_visit),
    nextVisit: relative(u.next_visit),
    bp: { sys: latest.systolic, dia: latest.diastolic },
    flags,
    conditions,
    score: scoreFor(u.id, latest.systolic),
    trend: trend.map((t) => t.systolic),
  };
}

module.exports = {
  all() {
    return db
      .prepare("SELECT * FROM users WHERE role = 'mother' ORDER BY id")
      .all()
      .map(toDTO);
  },

  find(id) {
    const u = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'mother'").get(id);
    return u ? toDTO(u) : null;
  },

  /** True when the id belongs to a real patient — guards clinician writes. */
  exists(id) {
    return Boolean(db.prepare("SELECT 1 FROM users WHERE id = ? AND role = 'mother'").get(id));
  },
};

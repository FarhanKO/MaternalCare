/**
 * Patient Model — the clinician's view of the mothers under their care.
 *
 * Assembles each patient from her own account, pregnancy, vitals and
 * symptoms, and derives the triage fields the caseload screen needs.
 *
 * This was the worst N+1 in the codebase: one query for the list, then four
 * more per patient for her pregnancy, blood-pressure trend, symptoms and
 * score. Twenty-five round trips for six patients, which is three and a half
 * seconds against a database in Sydney. It is two queries now — the roster
 * with its trend aggregated in SQL, and everyone's symptoms in one pass.
 */
const db = require('../config/db');
const symptomModel = require('./symptomModel');

const DAY = 86400000;

/** Human "2 weeks ago" / "in 3 days" from a date string. */
function relative(dateStr) {
  if (!dateStr) return '—';
  const days = Math.round((new Date(`${dateStr}T00:00:00`) - Date.now()) / DAY);
  const abs = Math.abs(days);
  if (abs === 0) return 'today';
  const unit = abs < 7 ? [abs, abs === 1 ? 'day' : 'days']
    : abs < 30 ? [Math.round(abs / 7), Math.round(abs / 7) === 1 ? 'week' : 'weeks']
    : [Math.round(abs / 30), Math.round(abs / 30) === 1 ? 'month' : 'months'];
  return days < 0 ? `${unit[0]} ${unit[1]} ago` : `in ${unit[0]} ${unit[1]}`;
}

/**
 * Triage level from the newest blood pressure, history and age.
 * Supports the clinician's judgement — it does not replace it.
 */
function riskFor({ sys, dia, conditions, age }) {
  const flagged = /hypertension|diabetes|Rh negative|anaemia|anemia|pre-eclampsia/i
    .test(conditions || '');
  if (sys >= 140 || dia >= 90) return 'high';
  if (flagged && (sys >= 130 || age >= 35)) return 'high';
  if (sys >= 130 || dia >= 85 || flagged || age >= 35) return 'moderate';
  return 'low';
}

/**
 * The roster, with each mother's gestational week and her last five blood
 * pressure readings resolved in the same statement.
 *
 * LATERAL is what makes this possible: a correlated subquery that can return
 * several rows, aggregated back into arrays per patient.
 */
const ROSTER = `
  SELECT u.*,
         LEAST(42, FLOOR((CURRENT_DATE - p.lmp) / 7))::int AS week,
         t.systolics,
         t.diastolics
  FROM users u
  LEFT JOIN pregnancies p ON p.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT array_agg(v.systolic  ORDER BY v.date) AS systolics,
           array_agg(v.diastolic ORDER BY v.date) AS diastolics
    FROM (
      SELECT systolic, diastolic, date FROM vitals
      WHERE user_id = u.id ORDER BY date DESC LIMIT 5
    ) v
  ) t ON TRUE
  WHERE u.role = 'mother'
`;

/** Row + her symptoms → the shape the caseload screen reads. */
function toDTO(u, symptoms) {
  const systolics = u.systolics ?? [];
  const diastolics = u.diastolics ?? [];
  const latest = {
    systolic: systolics[systolics.length - 1] ?? 118,
    diastolic: diastolics[diastolics.length - 1] ?? 76,
  };

  const conditions = (u.conditions || '').split(',').map((c) => c.trim()).filter(Boolean);

  const flags = [
    ...symptoms
      .filter((s) => symptomModel.URGENT.has(s.name) || s.daysPresent >= 5)
      .map((s) => `${s.name} · day ${s.daysPresent}`),
    ...(latest.systolic >= 140 ? ['Raised BP'] : []),
  ];

  const bpPenalty = latest.systolic >= 140 ? 30 : latest.systolic >= 130 ? 15 : 0;
  const score = Math.max(0, Math.min(100,
    Math.round(100 - symptomModel.burdenOf(symptoms) - bpPenalty)));

  return {
    id: String(u.id),
    name: u.name,
    age: u.age,
    week: u.week ?? 0,
    risk: riskFor({
      sys: latest.systolic, dia: latest.diastolic, conditions: u.conditions, age: u.age,
    }),
    bloodGroup: u.blood_group,
    lastVisit: relative(u.last_visit),
    nextVisit: relative(u.next_visit),
    bp: { sys: latest.systolic, dia: latest.diastolic },
    flags,
    conditions,
    score,
    trend: systolics,
  };
}

/** Everyone's symptoms in one query, grouped by patient. */
async function symptomsByPatient(userIds) {
  if (!userIds.length) return new Map();
  const rows = await db.sql(
    `SELECT * FROM symptoms WHERE user_id = ANY($1::int[])
     ORDER BY days_present DESC, id ASC`,
    [userIds.map(Number)],
  );

  const grouped = new Map(userIds.map((id) => [Number(id), []]));
  for (const r of rows) {
    grouped.get(r.user_id)?.push({
      id: String(r.id),
      name: r.name,
      intensity: r.intensity,
      daysPresent: r.days_present,
      confirmedToday: r.confirmed_today,
      fromVoice: r.from_voice,
      loggedAt: r.logged_at,
    });
  }
  return grouped;
}

module.exports = {
  async all() {
    const rows = await db.sql(`${ROSTER} ORDER BY u.id`);
    const symptoms = await symptomsByPatient(rows.map((r) => r.id));
    return rows.map((u) => toDTO(u, symptoms.get(u.id) ?? []));
  },

  async allForDoctor(doctorId) {
    const rows = await db.sql(`${ROSTER}
      AND EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.user_id = u.id AND a.doctor_id = $1
          AND a.status IN ('requested', 'accepted', 'completed')
      ) ORDER BY u.id`, [doctorId]);
    const symptoms = await symptomsByPatient(rows.map((r) => r.id));
    return rows.map((u) => toDTO(u, symptoms.get(u.id) ?? []));
  },

  async find(id) {
    const u = await db.one(`${ROSTER} AND u.id = $1`, [id]);
    if (!u) return null;
    const symptoms = await symptomsByPatient([u.id]);
    return toDTO(u, symptoms.get(u.id) ?? []);
  },

  async findForDoctor(id, doctorId) {
    const u = await db.one(`${ROSTER} AND u.id = $1
      AND EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.user_id = u.id AND a.doctor_id = $2
          AND a.status IN ('requested', 'accepted', 'completed')
      )`, [id, doctorId]);
    if (!u) return null;
    const symptoms = await symptomsByPatient([u.id]);
    return toDTO(u, symptoms.get(u.id) ?? []);
  },

  /** True when the id belongs to a real patient — guards clinician writes. */
  async exists(id) {
    return Boolean(await db.one(
      "SELECT 1 FROM users WHERE id = $1 AND role = 'mother'", [id],
    ));
  },

  async existsForDoctor(id, doctorId) {
    return Boolean(await db.one(
      `SELECT 1 FROM users u
       WHERE u.id = $1 AND u.role = 'mother'
         AND EXISTS (
           SELECT 1 FROM appointments a
           WHERE a.user_id = u.id AND a.doctor_id = $2
             AND a.status IN ('requested', 'accepted', 'completed')
         )`, [id, doctorId],
    ));
  },
};

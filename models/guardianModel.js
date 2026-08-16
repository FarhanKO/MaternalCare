/**
 * Guardian Model — the narrow, read-only view of a mother that the companion
 * app is allowed to see.
 *
 * A guardian is not a clinician. They get what helps them help her: how she
 * is doing, what she may be struggling with, and what to actually do about
 * it. They do not get her symptom journal, her messages, her documents or
 * her clinical notes.
 */
const crypto = require('crypto');
const db = require('../config/database');
const pregnancyModel = require('./pregnancyModel');
const vitalModel = require('./vitalModel');
const symptomModel = require('./symptomModel');
const sosModel = require('./sosModel');

const DAY = 86400000;

function newToken() {
  return crypto.randomBytes(18).toString('base64url');
}

/** Resolve a link token to the guardian and the mother it belongs to. */
function resolve(token) {
  if (!token || token.length < 10) return null;
  const row = db
    .prepare('SELECT * FROM emergency_contacts WHERE access_token = ?')
    .get(String(token));
  if (!row) return null;
  const mother = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
  if (!mother) return null;
  return { contact: row, mother };
}

/**
 * Where she is in the pregnancy, and how settled things look.
 *
 * The headline status is derived from the same insights shown underneath it,
 * not from a separate threshold table. Reading "Needs attention" above a list
 * with nothing urgent in it just teaches a guardian to distrust the badge.
 */
function overview(mother, insights) {
  const preg = pregnancyModel.forUser(mother.id);
  const latest = vitalModel.latest(mother.id) || {};
  const worst = insights.some((i) => i.level === 'urgent') ? 'high'
    : insights.some((i) => i.level === 'watch') ? 'watch'
    : 'settled';

  const due = preg && preg.lmp
    ? new Date(new Date(`${preg.lmp}T00:00:00`).getTime() + 280 * DAY)
    : null;
  const daysToGo = due ? Math.round((due - Date.now()) / DAY) : null;

  return {
    motherName: mother.name,
    week: preg ? preg.week : null,
    dueDate: due ? due.toISOString().slice(0, 10) : null,
    daysToGo,
    status: worst,
    lastReadingOn: latest.date || null,
    vitals: {
      systolic: latest.systolic ?? null,
      diastolic: latest.diastolic ?? null,
      sugar: latest.sugar ?? null,
      weightKg: latest.weight_kg ?? null,
      tempC: latest.temp_c ?? null,
    },
  };
}

/**
 * What she may be going through, phrased for the person beside her, with
 * something concrete they can do. Built from her own readings and logged
 * symptoms rather than generic pregnancy advice.
 */
function insight(mother) {
  const preg = pregnancyModel.forUser(mother.id);
  const week = preg ? preg.week : 0;
  const v = vitalModel.latest(mother.id) || {};
  const symptoms = symptomModel.all(mother.id);
  const out = [];

  const push = (level, facing, help) => out.push({ level, facing, help });

  if (v.systolic >= 140 || v.diastolic >= 90) {
    push('urgent',
      `Her blood pressure was ${v.systolic}/${v.diastolic}, which is above the safe range.`,
      'Ask her to sit and rest on her left side, and help her reach her doctor today. If she has a headache, blurred vision or sudden swelling, treat it as an emergency.');
  } else if (v.systolic >= 130 || v.diastolic >= 85) {
    push('watch',
      `Her blood pressure is creeping up (${v.systolic}/${v.diastolic}).`,
      'Keep the house calm, take something off her plate today, and remind her to take her readings at the same time each day.');
  }

  if (v.sugar >= 126) {
    push('urgent', `Her fasting glucose was ${v.sugar} mg/dL, well above target.`,
      'Help her keep to smaller, regular meals and make sure her next appointment is not missed.');
  } else if (v.sugar >= 95) {
    push('watch', `Her fasting glucose (${v.sugar} mg/dL) is above the pregnancy target.`,
      'Cook with less refined sugar and offer complex carbs — lentils, brown rice, oats — rather than sweet snacks.');
  }

  if (v.temp_c >= 38) {
    push('urgent', `She has a fever of ${v.temp_c} °C.`,
      'Fever in pregnancy needs same-day medical advice. Keep her cool and hydrated and call her clinic now.');
  }

  // her own words carry more weight than any threshold
  const urgent = symptoms.filter((s) => symptomModel.URGENT.has(s.name));
  const lingering = symptoms.filter((s) => s.daysPresent >= 4);

  if (urgent.length) {
    push('urgent', `She has logged ${urgent.map((s) => s.name).join(', ')}.`,
      'These are the symptoms her care team wants to hear about immediately. Do not wait for her next appointment.');
  }
  if (lingering.length) {
    push('watch',
      `${lingering.map((s) => `${s.name} (day ${s.daysPresent})`).join(', ')} has not eased.`,
      'Ask how it is today rather than whether it is better — it is easier to answer honestly.');
  }

  // stage-based, so there is always something useful even on a good week
  if (week >= 37) {
    push('info', 'She is full term, so labour could start any day.',
      'Know the route to the hospital, keep the bag by the door, and keep your phone loud overnight.');
  } else if (week >= 28) {
    push('info', 'Third trimester — sleep is usually broken and her back takes the load.',
      'Offer a pillow between her knees, take the night-time chores, and let her nap without guilt.');
  } else if (week >= 13) {
    push('info', 'Second trimester — usually the steadiest stretch.',
      'Good time to walk together, cook iron-rich meals, and go with her to a scan.');
  } else if (week > 0) {
    push('info', 'Early pregnancy — nausea and exhaustion are at their worst now.',
      'Small dry snacks before she gets up help. Take over cooking smells where you can.');
  }

  if (!out.length) {
    push('info', 'Nothing in her readings needs attention right now.',
      'Keep doing what you are doing, and check in on how she is sleeping.');
  }

  return out;
}

module.exports = {
  newToken,
  resolve,

  /** Everything the app's home screen needs in one call. */
  dashboard(token) {
    const found = resolve(token);
    if (!found) return null;
    const { contact, mother } = found;
    const insights = insight(mother);
    return {
      guardian: { name: contact.name, relation: contact.relation || undefined },
      overview: overview(mother, insights),
      insight: insights,
      alert: sosModel.active(mother.id),
      emergencyNumber: sosModel.emergencyNumber(mother.id),
    };
  },

  /** Recent readings for the little charts. */
  vitals(token, limit = 12) {
    const found = resolve(token);
    if (!found) return null;
    return vitalModel.history(found.mother.id, 60)
      .slice(-limit)
      .map((v) => ({
        date: v.date,
        systolic: v.systolic,
        diastolic: v.diastolic,
        sugar: v.sugar,
        weightKg: v.weight_kg,
        tempC: v.temp_c,
      }));
  },

  /** Just the alert — polled far more often than the rest. */
  alert(token) {
    const found = resolve(token);
    if (!found) return null;
    return {
      alert: sosModel.active(found.mother.id),
      emergencyNumber: sosModel.emergencyNumber(found.mother.id),
    };
  },

  /**
   * "I am on my way." Flips this guardian's row on the alert so the mother
   * sees who is actually coming, rather than only who was told.
   */
  acknowledge(token) {
    const found = resolve(token);
    if (!found) return null;
    const active = sosModel.active(found.mother.id);
    if (!active) return null;

    db.prepare(`
      UPDATE sos_notifications SET state = 'acknowledged', detail = 'On the way'
      WHERE alert_id = ? AND recipient = ?
    `).run(active.id, found.contact.name);

    return sosModel.find(active.id);
  },
};

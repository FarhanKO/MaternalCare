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
const db = require('../config/db');
const symptomModel = require('./symptomModel');
const sosModel = require('./sosModel');

const DAY = 86400000;

function newToken() {
  return crypto.randomBytes(18).toString('base64url');
}

/**
 * Resolve a link token to the guardian and the mother it belongs to.
 * One join rather than two lookups — this runs on every guardian request,
 * including the alert poll.
 */
async function resolve(token) {
  if (!token || token.length < 10) return null;
  const row = await db.one(`
    SELECT c.id AS contact_id, c.name AS contact_name, c.relation,
           u.*
    FROM emergency_contacts c
    JOIN users u ON u.id = c.user_id
    WHERE c.access_token = $1
  `, [String(token)]);
  if (!row) return null;

  return {
    contact: { id: row.contact_id, name: row.contact_name, relation: row.relation },
    mother: row,
  };
}

/**
 * Her pregnancy, latest reading and journal, fetched once.
 *
 * overview() and insight() both need all three. Fetching inside each of them
 * meant the dashboard asked for the same rows twice.
 */
async function context(motherId) {
  const [pregnancy, latest, symptoms] = await Promise.all([
    db.one(`SELECT lmp, LEAST(42, FLOOR((CURRENT_DATE - lmp) / 7))::int AS week
            FROM pregnancies WHERE user_id = $1`, [motherId]),
    db.one('SELECT * FROM vitals WHERE user_id = $1 ORDER BY date DESC LIMIT 1', [motherId]),
    symptomModel.all(motherId),
  ]);
  return { pregnancy, latest: latest || {}, symptoms };
}

/**
 * Where she is in the pregnancy, and how settled things look.
 *
 * The headline status is derived from the same insights shown underneath it,
 * not from a separate threshold table. Reading "Needs attention" above a list
 * with nothing urgent in it just teaches a guardian to distrust the badge.
 */
function overview(mother, { pregnancy, latest }, insights) {
  const worst = insights.some((i) => i.level === 'urgent') ? 'high'
    : insights.some((i) => i.level === 'watch') ? 'watch'
    : 'settled';

  const due = pregnancy && pregnancy.lmp
    ? new Date(new Date(`${pregnancy.lmp}T00:00:00`).getTime() + 280 * DAY)
    : null;

  return {
    motherName: mother.name,
    week: pregnancy ? pregnancy.week : null,
    dueDate: due ? due.toISOString().slice(0, 10) : null,
    daysToGo: due ? Math.round((due - Date.now()) / DAY) : null,
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
function insight({ pregnancy, latest: v, symptoms }) {
  const week = pregnancy ? pregnancy.week : 0;
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
  async dashboard(token) {
    const found = await resolve(token);
    if (!found) return null;
    const { contact, mother } = found;

    // resolve() already returned the mother row, so her emergency number is
    // in hand — asking for it again would be a wasted round trip
    const [ctx, alert] = await Promise.all([
      context(mother.id),
      sosModel.active(mother.id),
    ]);
    const insights = insight(ctx);

    return {
      guardian: { name: contact.name, relation: contact.relation || undefined },
      overview: overview(mother, ctx, insights),
      insight: insights,
      alert,
      emergencyNumber: mother.emergency_number || '999',
    };
  },

  /** Recent readings for the little charts. */
  async vitals(token, limit = 12) {
    const found = await resolve(token);
    if (!found) return null;

    const rows = await db.sql(
      `SELECT * FROM vitals WHERE user_id = $1 ORDER BY date DESC LIMIT $2`,
      [found.mother.id, limit],
    );
    return rows.reverse().map((v) => ({
      date: v.date,
      systolic: v.systolic,
      diastolic: v.diastolic,
      sugar: v.sugar,
      weightKg: v.weight_kg,
      tempC: v.temp_c,
    }));
  },

  /**
   * Just the alert. The guardian app polls this every few seconds, on a phone
   * over mobile data, so it is the hottest path in the system.
   *
   * The token lookup and the open-alert check are one statement, and the
   * fan-out is only fetched when there is something to fan out — so the
   * ordinary case, which is no emergency, costs a single round trip.
   */
  async alert(token) {
    if (!token || token.length < 10) return null;

    const row = await db.one(`
      SELECT u.id AS mother_id, u.emergency_number, s.id AS alert_id
      FROM emergency_contacts c
      JOIN users u ON u.id = c.user_id
      LEFT JOIN LATERAL (
        SELECT id FROM sos_alerts
        WHERE user_id = u.id AND status = 'active'
        ORDER BY id DESC LIMIT 1
      ) s ON TRUE
      WHERE c.access_token = $1
    `, [String(token)]);

    if (!row) return null;
    return {
      alert: row.alert_id ? await sosModel.find(row.alert_id) : null,
      emergencyNumber: row.emergency_number || '999',
    };
  },

  /**
   * "I am on my way." Flips this guardian's row on the alert so the mother
   * sees who is actually coming, rather than only who was told.
   */
  async acknowledge(token) {
    const found = await resolve(token);
    if (!found) return null;

    const active = await sosModel.active(found.mother.id);
    if (!active) return null;

    await db.run(`
      UPDATE sos_notifications SET state = 'acknowledged', detail = 'On the way'
      WHERE alert_id = $1 AND recipient = $2
    `, [active.id, found.contact.name]);

    return sosModel.find(active.id);
  },
};

const db = require('../config/db');

const DAY = 86400000;

/*
 * Growth against the WHO Child Growth Standards.
 *
 * What was here before: one hand-typed table of approximate P3/P50/P97 values
 * for *girls' weight*, applied to every child without ever reading
 * `children.gender`. A boy was silently graded against girls' curves and told
 * "healthy range" or "below the 3rd percentile" on the wrong reference, and
 * the height and head circumference this app records were compared to nothing
 * at all — two thirds of what a parent measures went nowhere.
 *
 * It read as working because the only seeded child is female.
 *
 * Now: the published WHO LMS parameters for all three measures and both sexes,
 * which give an exact percentile rather than a band chosen by eye.
 */
const { WHO, MAX_MONTHS } = require('./data/whoGrowth');

/** Cumulative normal, so a z-score can be stated as a percentile. */
function phi(z) {
  // Abramowitz & Stegun 7.1.26 — accurate to ~7.5e-8, far beyond what a
  // percentile printed to the nearest whole number needs.
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782
    + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

/** Linear interpolation between the whole-month rows the table carries. */
function at(series, months) {
  const clamped = Math.max(0, Math.min(MAX_MONTHS, months));
  const lo = Math.floor(clamped);
  const hi = Math.min(MAX_MONTHS, lo + 1);
  if (lo === hi) return series[lo];
  return series[lo] + (clamped - lo) * (series[hi] - series[lo]);
}

/**
 * Where one measurement sits on the WHO curve for a child of this sex and age.
 *
 * Returns null rather than guessing when the sex is unknown. Picking one
 * silently is what the previous implementation did, and a growth assessment
 * against the wrong reference is worse than no assessment: it is wrong in a
 * way a parent has no way to detect.
 */
function zScore(measure, sex, months, value) {
  const table = WHO[sex]?.[measure];
  if (!table || !Number.isFinite(value) || !Number.isFinite(months)) return null;

  const L = at(table.L, months);
  const M = at(table.M, months);
  const S = at(table.S, months);

  const z = Math.abs(L) < 1e-7
    ? Math.log(value / M) / S
    : ((value / M) ** L - 1) / (L * S);

  return Number.isFinite(z) ? z : null;
}

/**
 * How to describe a z-score.
 *
 * The wording follows what WHO says the bands mean, and deliberately does not
 * say "normal" for the middle band — a child tracking along the 5th centile
 * can be perfectly well, and one crossing downward through the 50th may not
 * be. The band is where they are; the trend is the clinical question, and only
 * the paediatrician holding the chart can answer it.
 */
function band(measure, z) {
  const LOW = {
    weight: { severe: 'Severely underweight', mild: 'Underweight' },
    height: { severe: 'Severely stunted', mild: 'Stunted' },
    head: { severe: 'Severe microcephaly', mild: 'Small head circumference' },
  }[measure];
  const HIGH = {
    weight: 'Above the expected range',
    height: 'Taller than the expected range',
    head: 'Large head circumference',
  }[measure];

  if (z < -3) return { key: 'severe-low', label: LOW.severe, tone: 'alert' };
  if (z < -2) return { key: 'low', label: LOW.mild, tone: 'warn' };
  if (z > 3) return { key: 'severe-high', label: HIGH, tone: 'warn' };
  if (z > 2) return { key: 'high', label: HIGH, tone: 'watch' };
  return { key: 'expected', label: 'Within the expected range', tone: 'ok' };
}

/** z at the 3rd and 97th centiles — the band the growth chart shades. */
const Z_P3 = -1.8808;
const Z_P97 = 1.8808;

/**
 * The reference curve to draw behind a child's readings.
 *
 * Computed from the same LMS parameters as the percentile, so the shaded band
 * and the number under it can never disagree. Sex-specific, which the previous
 * hardcoded curve was not: every child's chart was drawn against girls'
 * weight, whoever they were.
 */
function referenceCurve(sex, measure = 'weight', maxMonths = 24) {
  const table = WHO[sex]?.[measure];
  if (!table) return null;
  const value = (i, z) => {
    const L = table.L[i];
    const M = table.M[i];
    const S = table.S[i];
    const v = Math.abs(L) < 1e-7 ? M * Math.exp(S * z) : M * (1 + L * S * z) ** (1 / L);
    return Math.round(v * 100) / 100;
  };
  const months = [];
  const p3 = [];
  const p50 = [];
  const p97 = [];
  for (let m = 0; m <= Math.min(maxMonths, MAX_MONTHS); m += 1) {
    months.push(m);
    p3.push(value(m, Z_P3));
    p50.push(value(m, 0));
    p97.push(value(m, Z_P97));
  }
  return { sex, measure, months, p3, p50, p97 };
}

/**
 * "57th", "61st", "<1st". Emitted by the model so every consumer — the EJS
 * page, the React client and the PDF — spells it the same way, rather than
 * each appending "th" and producing "61th".
 */
function ordinal(centile) {
  if (centile === '<1') return 'below the 1st';
  if (centile === '>99') return 'above the 99th';
  const n = Number(centile);
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
}

const MEASURES = [
  { key: 'weight', column: 'weight_kg', label: 'Weight for age', unit: 'kg' },
  { key: 'height', column: 'height_cm', label: 'Height for age', unit: 'cm' },
  { key: 'head', column: 'head_cm', label: 'Head circumference', unit: 'cm' },
];

/** 'male' / 'boy' / 'M' all mean the same thing to a parent filling a form. */
function sexOf(child) {
  const raw = String(child?.gender || '').trim().toLowerCase();
  if (/^(m|male|boy)/.test(raw)) return 'boys';
  if (/^(f|female|girl)/.test(raw)) return 'girls';
  return null;
}

module.exports = {
  WHO,
  zScore,
  sexOf,
  referenceCurve,

  async forUser(userId) {
    const c = await db.one(
      'SELECT * FROM children WHERE user_id = $1 ORDER BY id LIMIT 1', [userId],
    );
    if (!c) return null;

    const ageDays = Math.floor((Date.now() - new Date(`${c.dob}T00:00:00`)) / DAY);
    const ageMonths = Math.floor(ageDays / 30.44);
    const years = Math.floor(ageMonths / 12);
    return {
      ...c,
      ageMonths,
      agePretty: `${years ? `${years} y ` : ''}${ageMonths % 12} months`,
    };
  },

  async growth(childId) {
    return db.sql(
      'SELECT * FROM growth_records WHERE child_id = $1 ORDER BY age_months ASC', [childId],
    );
  },

  async addGrowth(childId, { date, age_months, weight_kg, height_cm, head_cm }) {
    await db.run(
      `INSERT INTO growth_records (child_id, date, age_months, weight_kg, height_cm, head_cm)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [childId, date, age_months, weight_kg, height_cm, head_cm],
    );
  },

  /**
   * Where the child's latest measurements sit on the WHO curves.
   *
   * All three measures, against the reference for their sex, as an exact
   * percentile from the published LMS parameters.
   *
   * Returns `{ sexKnown: false }` when the child's sex is not recorded rather
   * than picking a reference. That is the whole of the bug this replaced: a
   * growth assessment made against the wrong curves is not a rough answer, it
   * is a wrong one, and a parent has no way to see that it is wrong.
   */
  async percentileSummary(childId) {
    const [child, rows] = await Promise.all([
      db.one('SELECT * FROM children WHERE id = $1', [childId]),
      this.growth(childId),
    ]);
    if (!child || !rows.length) return null;

    const last = rows[rows.length - 1];
    const sex = sexOf(child);
    const months = last.age_months;

    if (!sex) {
      return {
        sexKnown: false,
        ageMonths: months,
        measures: [],
        note: `The WHO curves are different for boys and girls, so ${child.name}'s sex is needed before any of these measurements can be placed on one. You can add it on their profile.`,
      };
    }

    const beyond = months > MAX_MONTHS;

    const measures = MEASURES.map((m) => {
      const value = last[m.column];
      if (!Number.isFinite(value) || beyond) {
        return {
          key: m.key, label: m.label, unit: m.unit, value: value ?? null, available: false,
        };
      }
      const z = zScore(m.key, sex, months, value);
      if (z === null) {
        return {
          key: m.key, label: m.label, unit: m.unit, value, available: false,
        };
      }
      const centile = phi(z) * 100;
      return {
        key: m.key,
        label: m.label,
        unit: m.unit,
        value,
        available: true,
        z: Math.round(z * 100) / 100,
        /* under 1 and over 99 are reported as bounds: the difference between
           the 0.2nd and the 0.4th centile is not a distinction a parent can
           use, and printing it implies a precision the measurement lacks */
        centile: centile < 1 ? '<1' : centile > 99 ? '>99' : String(Math.round(centile)),
        centileLabel: ordinal(centile < 1 ? '<1' : centile > 99 ? '>99' : String(Math.round(centile))),
        median: Math.round(at(WHO[sex][m.key].M, months) * 10) / 10,
        band: band(m.key, z),
      };
    });

    const flagged = measures.filter((m) => m.available && m.band.tone !== 'ok');

    return {
      sexKnown: true,
      sex,
      ageMonths: months,
      measuredOn: last.date,
      beyondReference: beyond,
      measures,
      note: beyond
        ? `The WHO standards used here run to ${MAX_MONTHS} months, and ${child.name} is past that.`
        : flagged.length === 0
          ? 'All three measurements sit within the expected range for their age.'
          : `${flagged.map((m) => m.label.toLowerCase()).join(' and ')} sit outside the expected range — worth raising at the next visit. A single reading matters less than the direction of travel, which your paediatrician can read from the chart.`,
    };
  },

  async milestones(childId) {
    return db.sql('SELECT * FROM milestones WHERE child_id = $1 ORDER BY id', [childId]);
  },

  /**
   * Flipped in one statement rather than read-then-write, so two taps in
   * quick succession cannot both read the same stale value.
   */
  async toggleMilestone(id) {
    await db.run(
      `UPDATE milestones
       SET achieved = NOT achieved,
           achieved_on = CASE WHEN achieved THEN NULL ELSE CURRENT_DATE END
       WHERE id = $1`,
      [id],
    );
  },
};

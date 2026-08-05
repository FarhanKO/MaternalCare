const db = require('../config/database');

const DAY = 86400000;

// WHO weight-for-age (girls, 0–24 months) — approximate P3 / P50 / P97 in kg
const WHO_WEIGHT_GIRLS = {
  months: [0, 2, 4, 6, 9, 12, 15, 18, 21, 24],
  p3:  [2.4, 3.9, 5.0, 5.7, 6.5, 7.0, 7.6, 8.1, 8.6, 9.0],
  p50: [3.2, 5.1, 6.4, 7.3, 8.2, 8.9, 9.6, 10.2, 10.9, 11.5],
  p97: [4.2, 6.6, 8.2, 9.3, 10.5, 11.5, 12.4, 13.2, 14.0, 14.8],
};

function interp(months, xs, ys) {
  if (months <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (months <= xs[i]) {
      const f = (months - xs[i - 1]) / (xs[i] - xs[i - 1]);
      return ys[i - 1] + f * (ys[i] - ys[i - 1]);
    }
  }
  return ys[ys.length - 1];
}

module.exports = {
  WHO_WEIGHT_GIRLS,

  forUser(userId) {
    const c = db.prepare('SELECT * FROM children WHERE user_id = ? LIMIT 1').get(userId);
    if (!c) return null;
    const ageDays = Math.floor((Date.now() - new Date(c.dob + 'T00:00:00')) / DAY);
    const ageMonths = Math.floor(ageDays / 30.44);
    return { ...c, ageMonths, agePretty: `${Math.floor(ageMonths / 12) ? Math.floor(ageMonths / 12) + ' y ' : ''}${ageMonths % 12} months` };
  },

  growth(childId) {
    return db.prepare('SELECT * FROM growth_records WHERE child_id = ? ORDER BY age_months ASC').all(childId);
  },

  addGrowth(childId, { date, age_months, weight_kg, height_cm, head_cm }) {
    db.prepare(`INSERT INTO growth_records (child_id, date, age_months, weight_kg, height_cm, head_cm)
                VALUES (?,?,?,?,?,?)`).run(childId, date, age_months, weight_kg, height_cm, head_cm);
  },

  /** Where the latest weight sits against WHO percentile curves */
  percentileSummary(childId) {
    const rows = this.growth(childId);
    if (!rows.length) return null;
    const last = rows[rows.length - 1];
    const w = WHO_WEIGHT_GIRLS;
    const p3 = interp(last.age_months, w.months, w.p3);
    const p50 = interp(last.age_months, w.months, w.p50);
    const p97 = interp(last.age_months, w.months, w.p97);
    let band, note;
    if (last.weight_kg < p3)       { band = 'Below P3';  note = 'Below the 3rd percentile — discuss with your pediatrician.'; }
    else if (last.weight_kg < p50) { band = 'P3 – P50';  note = 'Healthy range, tracking below the median curve.'; }
    else if (last.weight_kg < p97) { band = 'P50 – P97'; note = 'Healthy range, tracking above the median curve.'; }
    else                           { band = 'Above P97'; note = 'Above the 97th percentile — discuss with your pediatrician.'; }
    return { band, note, weight: last.weight_kg, ageMonths: last.age_months, p50: p50.toFixed(1) };
  },

  milestones(childId) {
    return db.prepare('SELECT * FROM milestones WHERE child_id = ? ORDER BY id').all(childId);
  },

  toggleMilestone(id) {
    const m = db.prepare('SELECT * FROM milestones WHERE id = ?').get(id);
    if (!m) return;
    db.prepare('UPDATE milestones SET achieved = ?, achieved_on = ? WHERE id = ?')
      .run(m.achieved ? 0 : 1, m.achieved ? null : new Date().toISOString().slice(0, 10), id);
  },
};

const db = require('../config/database');

// Safe medical thresholds used for automated alerts
const THRESHOLDS = {
  systolic:  { max: 140, warn: 130, label: 'Systolic BP',  unit: 'mmHg' },
  diastolic: { max: 90,  warn: 85,  label: 'Diastolic BP', unit: 'mmHg' },
  sugar:     { max: 95,  warn: 92,  label: 'Fasting glucose', unit: 'mg/dL' },
  temp_c:    { max: 38,  warn: 37.5, label: 'Temperature', unit: '°C' },
};

module.exports = {
  THRESHOLDS,

  history(userId, limit = 60) {
    return db.prepare(
      'SELECT * FROM vitals WHERE user_id = ? ORDER BY date ASC LIMIT ?'
    ).all(userId, limit);
  },

  latest(userId) {
    return db.prepare(
      'SELECT * FROM vitals WHERE user_id = ? ORDER BY date DESC LIMIT 1'
    ).get(userId);
  },

  add(userId, { date, systolic, diastolic, sugar, weight_kg, temp_c }) {
    db.prepare(`INSERT INTO vitals (user_id, date, systolic, diastolic, sugar, weight_kg, temp_c)
                VALUES (?,?,?,?,?,?,?)`)
      .run(userId, date, systolic, diastolic, sugar, weight_kg, temp_c);
  },

  /** Automated alerts for the most recent reading */
  alerts(userId) {
    const v = this.latest(userId);
    if (!v) return [];
    const out = [];
    for (const [key, t] of Object.entries(THRESHOLDS)) {
      const val = v[key];
      if (val == null) continue;
      if (val >= t.max)
        out.push({ level: 'critical', metric: t.label, value: `${val} ${t.unit}`,
                   message: `${t.label} is above the safe limit (${t.max} ${t.unit}). Contact your doctor.` });
      else if (val >= t.warn)
        out.push({ level: 'warning', metric: t.label, value: `${val} ${t.unit}`,
                   message: `${t.label} is approaching the safe limit (${t.max} ${t.unit}). Monitor closely.` });
    }
    return out;
  },
};

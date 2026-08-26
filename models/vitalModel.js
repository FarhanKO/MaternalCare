const db = require('../config/db');

// Safe medical thresholds used for automated alerts (High, Low, and Severe Red Flags)
const THRESHOLDS = {
  systolic: { severeMax: 160, max: 140, warn: 130, min: 90, label: 'Systolic BP', unit: 'mmHg' },
  diastolic: { severeMax: 110, max: 90, warn: 85, min: 60, label: 'Diastolic BP', unit: 'mmHg' },
  sugar: { max: 95, warn: 92, min: 70, label: 'Fasting glucose', unit: 'mg/dL' },
  temp_c: { max: 38, warn: 37.5, min: 35.5, label: 'Temperature', unit: '°C' },
  // 110–160 bpm is the standard normal band for a fetal heart rate; outside it
  // is tachycardia or bradycardia and is worth a clinician's eye either way
  fetal_bpm: { max: 160, warn: 155, min: 110, label: 'Fetal heart rate', unit: 'bpm' },
};

function validateReading({ systolic, diastolic, sugar, weight_kg, temp_c, fetal_bpm }) {
  if (systolic != null && (systolic < 50 || systolic > 250)) {
    throw new Error('Systolic BP must be between 50 and 250 mmHg');
  }
  if (diastolic != null && (diastolic < 30 || diastolic > 150)) {
    throw new Error('Diastolic BP must be between 30 and 150 mmHg');
  }
  if (sugar != null && (sugar < 40 || sugar > 400)) {
    throw new Error('Fasting glucose must be between 40 and 400 mg/dL');
  }
  if (weight_kg != null && (weight_kg < 30 || weight_kg > 250)) {
    throw new Error('Weight must be between 30 and 250 kg');
  }
  if (temp_c != null && (temp_c < 30 || temp_c > 45)) {
    throw new Error('Temperature must be between 30 and 45 °C');
  }
  // a doppler that reads outside this is picking up the mother's pulse, not baby's
  if (fetal_bpm != null && (fetal_bpm < 60 || fetal_bpm > 240)) {
    throw new Error('Fetal heart rate must be between 60 and 240 bpm');
  }
}

module.exports = {
  THRESHOLDS,
  validateReading,

  async history(userId, limit = 60) {
    return db.sql(
      'SELECT * FROM vitals WHERE user_id = $1 ORDER BY date ASC LIMIT $2',
      [userId, limit],
    );
  },

  async latest(userId) {
    return db.one(
      'SELECT * FROM vitals WHERE user_id = $1 ORDER BY date DESC, id DESC LIMIT 1',
      [userId],
    );
  },

  /**
   * The most recent value of each measurement, which is not the same thing as
   * the most recent row.
   *
   * A reading can carry any subset of the columns — weighing yourself writes a
   * row with only weight_kg. Reading alerts off the newest row alone therefore
   * let a partial entry hide an abnormal blood pressure taken an hour earlier.
   * Each column is resolved independently, newest non-null wins.
   */
  async current(userId) {
    const COLS = ['systolic', 'diastolic', 'sugar', 'weight_kg', 'temp_c', 'fetal_bpm'];
    const newest = (col, out) => `(SELECT ${col} FROM vitals
       WHERE user_id = $1 AND ${col} IS NOT NULL
       ORDER BY date DESC, id DESC LIMIT 1) AS ${out}`;
    const takenOn = (col) => `(SELECT date FROM vitals
       WHERE user_id = $1 AND ${col} IS NOT NULL
       ORDER BY date DESC, id DESC LIMIT 1) AS ${col}_on`;

    const parts = COLS.map((c) => newest(c, c)).concat(COLS.map(takenOn));
    return db.one(`SELECT ${parts.join(', ')}`, [userId]);
  },

  /**
   * Log a reading. Returns the stored row, so a caller can answer with what
   * was actually saved rather than echoing back what it was sent.
   */
  async add(userId, {
    date, systolic, diastolic, sugar, weight_kg, temp_c, fetal_bpm,
  }) {
    validateReading({
      systolic, diastolic, sugar, weight_kg, temp_c, fetal_bpm,
    });
    return db.insert(
      `INSERT INTO vitals (user_id, date, systolic, diastolic, sugar, weight_kg, temp_c, fetal_bpm)
       VALUES ($1, COALESCE($2, CURRENT_DATE), $3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [userId, date || null, systolic, diastolic, sugar, weight_kg, temp_c, fetal_bpm],
    );
  },

  /** Automated alerts across her most recent value of each measurement. */
  async alerts(userId) {
    const v = await this.current(userId);
    if (!v) return [];
    const out = [];

    // Severe BP check (Preeclampsia / Hypertensive Crisis red flag)
    if (v.systolic >= 160 || v.diastolic >= 110) {
      out.push({
        level: 'emergency',
        metric: 'Blood Pressure',
        value: `${v.systolic}/${v.diastolic} mmHg`,
        message: 'CRITICAL EMERGENCY: Severe High Blood Pressure detected (>=160/110). Contact emergency care immediately.',
      });
    }

    for (const [key, t] of Object.entries(THRESHOLDS)) {
      const val = v[key];
      if (val == null) continue;

      if (t.severeMax && val >= t.severeMax) {
        // Handled in emergency red flag above
        continue;
      } else if (val >= t.max) {
        out.push({
          level: 'critical',
          metric: t.label,
          value: `${val} ${t.unit}`,
          message: `${t.label} is above the safe limit (${t.max} ${t.unit}). Contact your doctor.`,
        });
      } else if (val >= t.warn) {
        out.push({
          level: 'warning',
          metric: t.label,
          value: `${val} ${t.unit}`,
          message: `${t.label} is approaching the safe limit (${t.max} ${t.unit}). Monitor closely.`,
        });
      } else if (t.min != null && val < t.min) {
        out.push({
          level: 'warning',
          metric: t.label,
          value: `${val} ${t.unit}`,
          message: `${t.label} is below the normal threshold (${t.min} ${t.unit}). Consult your physician.`,
        });
      }
    }
    return out;
  },
};

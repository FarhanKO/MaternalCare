/**
 * Vital API Controller — blood pressure, glucose, weight and temperature.
 *
 * The model and the table have been here all along; nothing exposed them, so
 * the React dashboard drew its charts from hardcoded arrays while thirteen
 * real readings sat in Postgres. This is the missing half.
 */
const userModel = require('../../models/userModel');
const vitalModel = require('../../models/vitalModel');

/** Row → the shape the charts read (camelCase, like every other endpoint). */
const toDTO = (v) => ({
  id: String(v.id),
  date: v.date,
  systolic: v.systolic,
  diastolic: v.diastolic,
  sugar: v.sugar,
  weightKg: v.weight_kg,
  tempC: v.temp_c,
  fetalBpm: v.fetal_bpm,
});

exports.index = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const limit = Math.min(120, Math.max(1, Number(req.query.limit) || 60));
    const [history, latest, alerts] = await Promise.all([
      vitalModel.history(user.id, limit),
      vitalModel.latest(user.id),
      vitalModel.alerts(user.id),
    ]);
    res.json({
      // the model already returns oldest first, which is how a chart reads
      data: history.map(toDTO),
      meta: { latest: latest ? toDTO(latest) : null, alerts },
    });
  } catch (err) { next(err); }
};

/**
 * Log a reading. Every field is optional except the date — a mother who only
 * took her blood pressure should not have to invent a glucose number to save it.
 */
exports.create = async (req, res) => {
  const {
    date, systolic, diastolic, sugar, weightKg, tempC, fetalBpm,
  } = req.body || {};
  const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

  try {
    const user = await userModel.current();
    const reading = {
      date: date || undefined,
      systolic: num(systolic),
      diastolic: num(diastolic),
      sugar: num(sugar),
      weight_kg: num(weightKg),
      temp_c: num(tempC),
      fetal_bpm: num(fetalBpm),
    };
    if (Object.entries(reading).every(([k, v]) => k === 'date' || v === null)) {
      return res.status(400).json({ error: 'A reading needs at least one measurement' });
    }
    const created = await vitalModel.add(user.id, reading);
    return res.status(201).json({ data: toDTO(created) });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

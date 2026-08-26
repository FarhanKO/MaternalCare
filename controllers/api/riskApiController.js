/**
 * Risk API Controller — the rule engine and the classifier, side by side.
 *
 * The React app had no risk endpoint at all until now: the assessment existed
 * only on the server-rendered pages and inside the PDF, so the primary view of
 * this application could not show a mother the one number the whole proposal
 * is built around.
 *
 * Both opinions are returned together and neither is presented as the answer.
 * The rules explain themselves and are deliberately cautious; the model has
 * seen real pregnancies and cannot say why. Where they disagree that is the
 * finding, not a bug to be resolved by picking a winner.
 */
const riskModel = require('../../models/riskModel');
const mlRiskModel = require('../../models/mlRiskModel');
const userModel = require('../../models/userModel');
const pregnancyModel = require('../../models/pregnancyModel');
const vitalModel = require('../../models/vitalModel');
const patientModel = require('../../models/patientModel');

/** Build both assessments for one person from their latest readings. */
async function assess(user, lang = user?.language || 'en') {
  const pregnancy = await pregnancyModel.forUser(user.id);
  const [latest, current] = await Promise.all([
    vitalModel.latest(user.id),
    vitalModel.current(user.id),
  ]);

  if (!latest || !pregnancy) {
    return { rules: null, model: null, comparison: { agreement: 'unavailable', note: null } };
  }

  const rules = riskModel.assess({
    age: user.age,
    systolic: latest.systolic,
    diastolic: latest.diastolic,
    sugar: latest.sugar,
    temp: latest.temp_c,
    week: pregnancy.week,
  }, lang);

  /*
   * The classifier gets her newest value of each measurement rather than the
   * newest row: a row logged for weight alone would otherwise hand it nulls
   * for everything else. This is the same `current()` the vital alerts use.
   */
  const model = await mlRiskModel.predict({
    age: user.age,
    systolic: current?.systolic ?? latest.systolic,
    diastolic: current?.diastolic ?? latest.diastolic,
    sugar: current?.sugar ?? latest.sugar,
    tempC: current?.temp_c ?? latest.temp_c,
    heartBpm: current?.heart_bpm,
  });

  return {
    rules,
    model,
    comparison: mlRiskModel.compare(rules, model),
    readings: {
      age: user.age,
      systolic: current?.systolic ?? latest.systolic,
      diastolic: current?.diastolic ?? latest.diastolic,
      sugar: current?.sugar ?? latest.sugar,
      tempC: current?.temp_c ?? latest.temp_c,
      heartBpm: current?.heart_bpm ?? null,
      week: pregnancy.week,
    },
  };
}

/** Her own assessment. */
exports.mine = async (req, res, next) => {
  try {
    const user = await userModel.current();
    // ?lang= overrides her stored preference, which is what the audit and a
    // reviewer checking the translation both need
    const result = await assess(user, req.query.lang || user.language || 'en');
    const health = await mlRiskModel.health();
    return res.json({ data: result, meta: { service: health } });
  } catch (err) { return next(err); }
};

/** A patient's, for the clinician portal. */
exports.forPatient = async (req, res, next) => {
  try {
    const patient = await patientModel.find(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const user = await userModel.find(req.params.id);
    const result = await assess(user);
    return res.json({ data: result, meta: { service: await mlRiskModel.health() } });
  } catch (err) { return next(err); }
};

/**
 * The model card — what it was trained on and how well it scores, including
 * the gap between its honest number and the inflated one this dataset's
 * duplicate rows produce. Served rather than hidden, because a model quoted
 * without its limitations is being oversold.
 */
exports.modelCard = async (req, res, next) => {
  try {
    const card = await mlRiskModel.card();
    if (!card) {
      return res.status(503).json({
        error: 'The risk model service is not reachable',
        hint: `Start it with: uvicorn app:app --port 8000 (from ml-service/), or set ML_SERVICE_URL`,
      });
    }
    return res.json({ data: card });
  } catch (err) { return next(err); }
};

/**
 * "What if my numbers were these" — the same hypothetical the server-rendered
 * page offers, now available to the React app and to the clinician.
 */
exports.simulate = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const pregnancy = await pregnancyModel.forUser(user.id);
    const {
      age, systolic, diastolic, sugar, tempC, heartBpm,
    } = req.body || {};

    const rules = riskModel.assess({
      age: Number(age ?? user.age),
      systolic: Number(systolic),
      diastolic: Number(diastolic),
      sugar: Number(sugar),
      temp: Number(tempC),
      week: pregnancy ? pregnancy.week : undefined,
    });
    const model = await mlRiskModel.predict({
      age: age ?? user.age, systolic, diastolic, sugar, tempC, heartBpm,
    });

    return res.json({
      data: { rules, model, comparison: mlRiskModel.compare(rules, model) },
    });
  } catch (err) { return next(err); }
};

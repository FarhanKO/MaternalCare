/**
 * AI-powered maternal health risk assessment.
 * A transparent scoring engine modelled on clinical risk factors
 * (the same features used by ML classifiers on the UCI Maternal Health
 * Risk dataset: age, blood pressure, blood sugar, temperature, heart rate).
 */
const vitalModel = require('./vitalModel');
const strings = require('./i18n/risk');

/**
 * The five factors, scored.
 *
 * The thresholds are the logic; the words are a lookup. Separating them is
 * what let this become translatable without touching a single number — a
 * factor now carries a stable `id` and `band`, and the sentence for that pair
 * is fetched in whichever language she reads.
 *
 * `id` is also what the care plan keys off, so a rename in one language can no
 * longer quietly break the guidance that depends on it.
 */
function scoreFactors({ age, systolic, diastolic, sugar, temp, week }, lang = 'en') {
  const factors = [];
  const vars = { age, systolic, diastolic, sugar, temp, week };
  const add = (id, band, points) => factors.push({
    id,
    band,
    name: strings.name(id, lang),
    points,
    detail: strings.detail(`${id}.${band}`, vars, lang),
  });

  if (age >= 35)      add('age', 'high', 25);
  else if (age <= 18) add('age', 'low', 20);
  else                add('age', 'ok', 0);

  if (systolic >= 140 || diastolic >= 90)      add('bp', 'high', 40);
  else if (systolic >= 130 || diastolic >= 85) add('bp', 'raised', 20);
  else                                         add('bp', 'ok', 0);

  if (sugar >= 126)      add('sugar', 'high', 35);
  else if (sugar >= 95)  add('sugar', 'raised', 18);
  else                   add('sugar', 'ok', 0);

  if (temp >= 38.0)      add('temp', 'fever', 25);
  else if (temp >= 37.5) add('temp', 'raised', 10);
  else                   add('temp', 'ok', 0);

  if (week >= 37)      add('week', 'term', 10);
  else if (week >= 28) add('week', 'third', 5);
  else                 add('week', 'ok', 0);

  return factors;
}

/*
 * Three arrays of four hardcoded tips used to live here, keyed only by risk
 * level. Every mother at "medium" read the same four sentences whether she was
 * in week 9 or week 39, whether her score came from her blood pressure or her
 * blood sugar, and whether or not she had gestational diabetes on her record —
 * which is to say they were not personalised at all, only sorted into three
 * buckets. The plan now comes from guidanceModel, which reads the factors this
 * file already produces along with her stage, her conditions and her own log.
 *
 * This model deliberately does not require guidanceModel: guidance depends on
 * risk, and a cycle between the two would be a worse problem than the
 * duplication it saves. Callers that want both ask for both.
 */

module.exports = {
  assess(input, lang = 'en') {
    const factors = scoreFactors(input, lang);
    const score = Math.min(100, factors.reduce((s, f) => s + f.points, 0));
    const level = score >= 55 ? 'high' : score >= 25 ? 'medium' : 'low';
    return { score, level, label: strings.level(level, lang), factors };
  },

  /** Assessment built from the user's latest logged vitals */
  async fromLatestVitals(user, pregnancy, lang = user?.language || 'en') {
    const v = await vitalModel.latest(user.id);
    if (!v || !pregnancy) return null;
    return this.assess({
      age: user.age, systolic: v.systolic, diastolic: v.diastolic,
      sugar: v.sugar, temp: v.temp_c, week: pregnancy.week,
    }, lang);
  },
};

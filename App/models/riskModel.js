/**
 * AI-powered maternal health risk assessment.
 * A transparent scoring engine modelled on clinical risk factors
 * (the same features used by ML classifiers on the UCI Maternal Health
 * Risk dataset: age, blood pressure, blood sugar, temperature, heart rate).
 */
const vitalModel = require('./vitalModel');

function scoreFactors({ age, systolic, diastolic, sugar, temp, week }) {
  const factors = [];
  const add = (name, points, detail) => factors.push({ name, points, detail });

  if (age >= 35)      add('Maternal age', 25, `${age} years — advanced maternal age raises monitoring needs`);
  else if (age <= 18) add('Maternal age', 20, `${age} years — adolescent pregnancy needs closer follow-up`);
  else                add('Maternal age', 0,  `${age} years — within the lower-risk range`);

  if (systolic >= 140 || diastolic >= 90)      add('Blood pressure', 40, `${systolic}/${diastolic} mmHg — hypertensive range`);
  else if (systolic >= 130 || diastolic >= 85) add('Blood pressure', 20, `${systolic}/${diastolic} mmHg — elevated, monitor daily`);
  else                                         add('Blood pressure', 0,  `${systolic}/${diastolic} mmHg — normal range`);

  if (sugar >= 126)      add('Blood glucose', 35, `${sugar} mg/dL — diabetic range, needs medical review`);
  else if (sugar >= 95)  add('Blood glucose', 18, `${sugar} mg/dL — above the fasting target for pregnancy`);
  else                   add('Blood glucose', 0,  `${sugar} mg/dL — within target`);

  if (temp >= 38.0)      add('Body temperature', 25, `${temp} °C — fever, possible infection`);
  else if (temp >= 37.5) add('Body temperature', 10, `${temp} °C — slightly raised`);
  else                   add('Body temperature', 0,  `${temp} °C — normal`);

  if (week >= 37)      add('Gestational stage', 10, `Week ${week} — full term, delivery preparation stage`);
  else if (week >= 28) add('Gestational stage', 5,  `Week ${week} — third trimester, increased monitoring`);
  else                 add('Gestational stage', 0,  `Week ${week} — routine monitoring stage`);

  return factors;
}

const RECOMMENDATIONS = {
  low: [
    { icon: '🥗', title: 'Nutrition', text: 'Keep a balanced plate: leafy greens, lentils, dairy and one iron-rich meal daily. Stay hydrated (2.5–3 L).' },
    { icon: '🚶‍♀️', title: 'Activity', text: '30 minutes of gentle walking or prenatal yoga most days. Avoid lying flat on your back for long periods.' },
    { icon: '😴', title: 'Rest', text: 'Aim for 7–9 hours of sleep, resting on your left side to improve blood flow to the baby.' },
    { icon: '📋', title: 'Monitoring', text: 'Log vitals twice a week and do daily kick counts after week 28.' },
  ],
  medium: [
    { icon: '🩺', title: 'Medical follow-up', text: 'Book a check-up within the next 7 days and share your vitals trend with your doctor.' },
    { icon: '🧂', title: 'Nutrition', text: 'Reduce salt and refined sugar. Prefer complex carbs, and split meals into 5–6 smaller portions.' },
    { icon: '📈', title: 'Monitoring', text: 'Log blood pressure and glucose daily. Set reminders — trends matter more than single readings.' },
    { icon: '🧘‍♀️', title: 'Stress', text: 'Practice 10 minutes of breathing exercises daily; elevated stress can raise blood pressure.' },
  ],
  high: [
    { icon: '🚨', title: 'Urgent review', text: 'Contact your obstetrician today. Readings in this range need professional evaluation.' },
    { icon: '🛏️', title: 'Rest', text: 'Avoid strenuous activity until your doctor reviews you. Rest on your left side.' },
    { icon: '📞', title: 'Emergency plan', text: 'Keep the SOS page ready, confirm your emergency contacts, and know your nearest 24/7 hospital.' },
    { icon: '📈', title: 'Monitoring', text: 'Check blood pressure twice daily and record symptoms like headache, blurred vision or swelling.' },
  ],
};

module.exports = {
  assess(input) {
    const factors = scoreFactors(input);
    const score = Math.min(100, factors.reduce((s, f) => s + f.points, 0));
    const level = score >= 55 ? 'high' : score >= 25 ? 'medium' : 'low';
    const label = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' }[level];
    return { score, level, label, factors, recommendations: RECOMMENDATIONS[level] };
  },

  /** Assessment built from the user's latest logged vitals */
  fromLatestVitals(user, pregnancy) {
    const v = vitalModel.latest(user.id);
    if (!v || !pregnancy) return null;
    return this.assess({
      age: user.age, systolic: v.systolic, diastolic: v.diastolic,
      sugar: v.sugar, temp: v.temp_c, week: pregnancy.week,
    });
  },
};

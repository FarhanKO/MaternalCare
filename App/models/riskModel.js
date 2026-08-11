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


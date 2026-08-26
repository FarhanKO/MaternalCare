/**
 * Bangla for the risk assessment.
 *
 * The assessment is composed as sentences on the server, so its translation
 * has to live here rather than in the client's dictionary. Each factor is
 * keyed by a stable id and a band, and the numbers are interpolated at the end
 * — never assembled by concatenation, because "১২৪/৮২ mmHg — স্বাভাবিক" and
 * "normal range — 124/82 mmHg" do not share a word order.
 *
 * Clinical units stay in Latin script and English abbreviation (mmHg, mg/dL,
 * °C). That is what is printed on every meter, strip and chart a Bangladeshi
 * mother will hold, and transliterating them would make the number on the
 * screen stop matching the number in her hand.
 *
 * Not reviewed by a clinician. The interface says so where a mother can see it.
 */

/** Risk bands, as the app names them. */
const LEVELS = {
  en: { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' },
  bn: { low: 'কম ঝুঁকি', medium: 'মাঝারি ঝুঁকি', high: 'বেশি ঝুঁকি' },
};

/** What each factor is called. */
const NAMES = {
  en: {
    age: 'Maternal age',
    bp: 'Blood pressure',
    sugar: 'Blood glucose',
    temp: 'Body temperature',
    week: 'Gestational stage',
  },
  bn: {
    age: 'মায়ের বয়স',
    bp: 'রক্তচাপ',
    sugar: 'রক্তে চিনির মাত্রা',
    temp: 'শরীরের তাপমাত্রা',
    week: 'গর্ভাবস্থার পর্যায়',
  },
};

/** The sentence under each factor, by id and band. */
const DETAILS = {
  en: {
    'age.high': '{age} years — advanced maternal age raises monitoring needs',
    'age.low': '{age} years — adolescent pregnancy needs closer follow-up',
    'age.ok': '{age} years — within the lower-risk range',
    'bp.high': '{systolic}/{diastolic} mmHg — hypertensive range',
    'bp.raised': '{systolic}/{diastolic} mmHg — elevated, monitor daily',
    'bp.ok': '{systolic}/{diastolic} mmHg — normal range',
    'sugar.high': '{sugar} mg/dL — diabetic range, needs medical review',
    'sugar.raised': '{sugar} mg/dL — above the fasting target for pregnancy',
    'sugar.ok': '{sugar} mg/dL — within target',
    'temp.fever': '{temp} °C — fever, possible infection',
    'temp.raised': '{temp} °C — slightly raised',
    'temp.ok': '{temp} °C — normal',
    'week.term': 'Week {week} — full term, delivery preparation stage',
    'week.third': 'Week {week} — third trimester, increased monitoring',
    'week.ok': 'Week {week} — routine monitoring stage',
  },
  bn: {
    'age.high': '{age} বছর — বেশি বয়সে গর্ভধারণে বাড়তি নজর রাখা দরকার',
    'age.low': '{age} বছর — কম বয়সে গর্ভধারণে আরও কাছ থেকে দেখা দরকার',
    'age.ok': '{age} বছর — কম ঝুঁকির বয়সসীমার মধ্যে',
    'bp.high': '{systolic}/{diastolic} mmHg — উচ্চ রক্তচাপের মাত্রা',
    'bp.raised': '{systolic}/{diastolic} mmHg — একটু বেশি, প্রতিদিন মেপে দেখুন',
    'bp.ok': '{systolic}/{diastolic} mmHg — স্বাভাবিক',
    'sugar.high': '{sugar} mg/dL — ডায়াবেটিসের মাত্রা, ডাক্তার দেখানো দরকার',
    'sugar.raised': '{sugar} mg/dL — গর্ভাবস্থার খালি পেটের লক্ষ্যমাত্রার চেয়ে বেশি',
    'sugar.ok': '{sugar} mg/dL — লক্ষ্যমাত্রার মধ্যে',
    'temp.fever': '{temp} °C — জ্বর, সংক্রমণ হতে পারে',
    'temp.raised': '{temp} °C — সামান্য বেশি',
    'temp.ok': '{temp} °C — স্বাভাবিক',
    'week.term': '{week} সপ্তাহ — পূর্ণ মেয়াদ, প্রসবের প্রস্তুতির সময়',
    'week.third': '{week} সপ্তাহ — তৃতীয় ত্রৈমাসিক, বাড়তি নজর দরকার',
    'week.ok': '{week} সপ্তাহ — নিয়মিত দেখার পর্যায়',
  },
};

const fill = (template, vars) => String(template).replace(
  /\{(\w+)\}/g,
  (whole, key) => (key in vars ? String(vars[key]) : whole),
);

/** A language we actually have, falling back to English. */
const pick = (lang) => (lang === 'bn' ? 'bn' : 'en');

module.exports = {
  LEVELS,
  NAMES,
  DETAILS,

  level: (band, lang) => LEVELS[pick(lang)][band] ?? LEVELS.en[band],
  name: (id, lang) => NAMES[pick(lang)][id] ?? NAMES.en[id],
  detail: (key, vars, lang) => fill(
    DETAILS[pick(lang)][key] ?? DETAILS.en[key],
    vars,
  ),
};

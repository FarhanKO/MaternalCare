/**
 * Guidance Model — the personalised nutrition, movement and lifestyle plan.
 *
 * What this replaces
 * ------------------
 * There were two things standing in for this feature, and both were fiction.
 *
 * `riskModel` carried three hardcoded arrays of four tips, keyed only by risk
 * level, so every mother at "medium" read the same four sentences whether she
 * was in week 9 or week 39, whether her score came from blood pressure or from
 * blood sugar, and whether or not she had gestational diabetes on her record.
 *
 * The mother's dashboard carried a "Nutrition today — % of daily goal" panel
 * reading Folate 92%, Iron 78%, Calcium 85%. The app has never had any food
 * logging of any kind. Those numbers could not have been measured, and a bar
 * chart is a claim of measurement; a mother reading "Iron 78%" would believe
 * something about her own body that nothing in this system knows.
 *
 * What this is
 * ------------
 * A deterministic rule engine, not a language model. Every line it emits is
 * traceable to a rule and to the reading that fired it, which is why each item
 * carries a `why` naming that reading. That is the difference between advice
 * and personalised advice, and it is the part a mother — or an examiner — can
 * actually check.
 *
 * The numeric targets follow published maternal guidance (WHO antenatal care
 * recommendations, the IOM gestational weight gain ranges the pregnancy model
 * already uses, and the widely published RNI/RDA figures for pregnancy). They
 * are stated as targets, never as intake, because intake is not something this
 * app can see.
 *
 * Safety
 * ------
 * The engine will not prescribe exercise to a high-risk profile. Activity is
 * the one domain here where following generic advice can do direct harm, so
 * above the medium band it hands the decision to her obstetrician and offers
 * only what is safe under any circumstance.
 */
const userModel = require('./userModel');
const pregnancyModel = require('./pregnancyModel');
const vitalModel = require('./vitalModel');
const dailyLogModel = require('./dailyLogModel');
const symptomModel = require('./symptomModel');
const riskModel = require('./riskModel');

/* ------------------------------------------------------------ constants */

/**
 * Daily nutrient targets by life stage.
 *
 * `key` is stable so the client can style an entry without matching on its
 * label, and `why` explains what the nutrient is for at this stage rather than
 * repeating the number in words.
 */
const TARGETS = {
  planning: [
    { key: 'folate', label: 'Folic acid', amount: '400 µg', why: 'Started before conception, it lowers the chance of neural tube defects — the window closes early, often before a pregnancy is known.' },
    { key: 'iron', label: 'Iron', amount: '18 mg', why: 'Building stores now makes the demands of a pregnancy easier to meet later.' },
    { key: 'iodine', label: 'Iodine', amount: '150 µg', why: 'Needed for the baby’s brain development from the earliest weeks.' },
  ],
  pregnant: [
    { key: 'folate', label: 'Folic acid', amount: '600 µg', why: 'Supports the baby’s spinal cord and brain, and your own rising red-cell production.' },
    { key: 'iron', label: 'Iron', amount: '27 mg', why: 'Your blood volume rises by nearly half; iron is what carries oxygen across it.' },
    { key: 'calcium', label: 'Calcium', amount: '1,000 mg', why: 'The baby’s skeleton is built from it. Where the diet falls short, it comes out of your bones.' },
    { key: 'protein', label: 'Protein', amount: '1.1 g per kg', why: 'The raw material for the baby’s tissue and for the placenta.' },
    { key: 'iodine', label: 'Iodine', amount: '220 µg', why: 'Thyroid hormones drive the baby’s brain development throughout.' },
    { key: 'dha', label: 'Omega-3 (DHA)', amount: '200–300 mg', why: 'Concentrated in the baby’s brain and retina, most of it laid down in the third trimester.' },
  ],
  'new-mother': [
    { key: 'energy', label: 'Extra energy', amount: '+450–500 kcal', why: 'What producing milk costs, on top of what you needed before you were pregnant.' },
    { key: 'fluid', label: 'Fluid', amount: '3 L', why: 'Milk is mostly water. Thirst while feeding is the body asking plainly.' },
    { key: 'calcium', label: 'Calcium', amount: '1,000 mg', why: 'Breastfeeding draws on your own stores if the diet does not cover it.' },
    { key: 'iron', label: 'Iron', amount: '9–18 mg', why: 'Replacing what the birth cost, particularly after heavy bleeding.' },
    { key: 'protein', label: 'Protein', amount: '+25 g', why: 'Recovery from the birth, and the milk itself.' },
  ],
  parent: [
    { key: 'iron', label: 'Iron (your child)', amount: '7–10 mg', why: 'The commonest deficiency in young children here, and it affects how they learn.' },
    { key: 'vitamin-a', label: 'Vitamin A', amount: 'Per the EPI schedule', why: 'Given as a capsule every six months from nine months — it runs on the vaccination card.' },
    { key: 'calcium', label: 'Calcium', amount: '500–700 mg', why: 'Bone laid down in the first years sets the ceiling for later.' },
  ],
};
TARGETS.general = TARGETS.pregnant;

/** Extra energy a pregnancy costs, by trimester. Not a target in trimester 1. */
const ENERGY_BY_TRIMESTER = {
  1: { amount: 'no extra', why: 'A common surprise: the first trimester needs no extra energy at all. "Eating for two" starts later, and not by much.' },
  2: { amount: '+340 kcal', why: 'Roughly a substantial snack — not a second dinner.' },
  3: { amount: '+450 kcal', why: 'The baby gains most of its weight now, and that has to come from somewhere.' },
};

/** Litres of fluid a day, by stage. */
const FLUID_TARGET = {
  pregnant: 2.5, 'new-mother': 3, planning: 2, parent: 2, general: 2.5,
};

/** Recognised entries in the free-text `conditions` column, and what they change. */
const CONDITION_RULES = [
  {
    match: /gestational diabetes|diabet/i,
    key: 'gdm',
    label: 'Gestational diabetes',
  },
  {
    match: /hypertension|pre-?eclampsia|high blood pressure/i,
    key: 'htn',
    label: 'Hypertension in pregnancy',
  },
  { match: /anaem|anem/i, key: 'anaemia', label: 'Anaemia' },
  { match: /rh negative|rh-/i, key: 'rh', label: 'Rh negative' },
  { match: /thyroid/i, key: 'thyroid', label: 'Thyroid condition' },
];

/* -------------------------------------------------------------- helpers */

/** One item of advice. `why` must name the reading that produced it. */
function item(domain, priority, title, text, why) {
  return { domain, priority, title, text, why };
}

/** urgent first, then high, then the rest — stable within each band. */
const ORDER = { urgent: 0, high: 1, normal: 2 };
const byPriority = (a, b) => ORDER[a.priority] - ORDER[b.priority];

/** Which risk factors actually contributed, biggest first. */
function driversOf(risk) {
  if (!risk) return [];
  return risk.factors
    .filter((f) => f.points > 0)
    .sort((a, b) => b.points - a.points)
    .map((f) => ({
      id: f.id, band: f.band, name: f.name, points: f.points, detail: f.detail,
    }));
}

/**
 * True when a factor is carrying weight in the score.
 *
 * Matched on `id` — a stable 'bp' or 'sugar' — and not on the display name.
 * The name is translated now, so `d.name === 'Blood pressure'` was true in
 * English and false in Bangla: every piece of blood-pressure advice would
 * have silently stopped appearing for exactly the mothers least able to spot
 * that it was missing.
 */
const driving = (drivers, id) => drivers.some((d) => d.id === id);

/** Her conditions, parsed out of the free-text column. */
function conditionsOf(user) {
  const raw = String(user.conditions || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  const known = CONDITION_RULES
    .filter((r) => raw.some((c) => r.match.test(c)))
    .map((r) => ({ key: r.key, label: r.label }));
  return { raw, known, has: (key) => known.some((k) => k.key === key) };
}

/* ------------------------------------------------------------ nutrition */

function nutrition(ctx) {
  const {
    stage, trimester, drivers, conditions, weightGain, vitals,
  } = ctx;
  const out = [];

  /* --- what the numbers on her own record change ---------------------- */

  const highGlucose = driving(drivers, 'sugar') || conditions.has('gdm');
  if (highGlucose) {
    const reading = vitals?.sugar;
    out.push(item('nutrition', 'high',
      'Spread the carbohydrate across the day',
      'Three modest meals and two or three snacks, rather than two large meals. Choose slower carbohydrates — brown rice, whole wheat roti, oats, lentils — and keep fruit juice and sweet drinks out of the day entirely.',
      reading
        ? `Your last fasting glucose was ${reading} mg/dL. Spreading the load is what flattens the peak after eating.`
        : 'Gestational diabetes is on your record, and how the carbohydrate is spread matters more than how much of it there is.'));
    out.push(item('nutrition', 'normal',
      'Put protein or fat alongside the starch',
      'An egg with the roti, yoghurt with the fruit, nuts with the rice. It slows the same food down.',
      'Same reason as above — this is the practical version of it.'));
  }

  const highBp = driving(drivers, 'bp') || conditions.has('htn');
  if (highBp) {
    const bp = vitals && vitals.systolic ? `${vitals.systolic}/${vitals.diastolic} mmHg` : null;
    out.push(item('nutrition', 'high',
      'Bring the salt down',
      'Under about 2 g of sodium a day — roughly one level teaspoon of salt across everything. The salt that matters is mostly not the salt shaker: it is pickles, packet snacks, stock cubes, processed meat and restaurant food.',
      bp
        ? `Your last reading was ${bp}, which is above the range this is aimed at.`
        : 'Raised blood pressure in pregnancy is on your record.'));
    out.push(item('nutrition', 'normal',
      'More potassium, from food',
      'Banana, sweet potato, spinach, beans, yoghurt. Potassium works against sodium rather than alongside it.',
      'Paired with the sodium reduction above — the ratio matters as much as either number.'));
  }

  if (conditions.has('anaemia')) {
    out.push(item('nutrition', 'high',
      'Take iron where it will actually absorb',
      'With something sour — lemon, orange, amla, tomato. Not with tea, coffee or milk, which cut absorption sharply. If it is prescribed as a tablet, an empty stomach absorbs best, but with food is better than not taking it.',
      'Anaemia is on your record, and iron taken with tea is close to iron not taken.'));
  }

  if (weightGain && weightGain.status === 'below') {
    out.push(item('nutrition', 'high',
      'Add energy in small, dense amounts',
      'Nuts, peanut butter, full-fat yoghurt, khichuri with an egg, a glass of milk. Easier to manage as extra snacks than as bigger meals, particularly if you are nauseous.',
      `You have gained ${weightGain.gainedKg} kg by week ${weightGain.week}; the usual range for your starting BMI is ${weightGain.expected.low}–${weightGain.expected.high} kg by now.`));
  }

  if (weightGain && weightGain.status === 'above') {
    out.push(item('nutrition', 'normal',
      'Look at drinks and portions before food groups',
      'Sweet drinks, juice and sugary tea are the usual place this shows up. Nothing needs cutting out — pregnancy is not the time to restrict — but the easy calories are worth finding.',
      `You have gained ${weightGain.gainedKg} kg by week ${weightGain.week}, against a usual range of ${weightGain.expected.low}–${weightGain.expected.high} kg.`));
  }

  /* --- what the stage changes ---------------------------------------- */

  if (stage === 'pregnant' && trimester) {
    const energy = ENERGY_BY_TRIMESTER[trimester];
    out.push(item('nutrition', 'normal',
      `Energy in trimester ${trimester}: ${energy.amount}`,
      energy.why,
      `You are in trimester ${trimester}, and the extra energy a pregnancy needs changes with it.`));
  }

  if (stage === 'pregnant' && trimester === 1) {
    out.push(item('nutrition', 'normal',
      'If you are being sick, aim for frequency over balance',
      'Dry, plain, small and often beats a balanced plate you cannot keep down. A balanced week matters; a balanced meal does not.',
      'Trimester 1 — nausea is at its worst now and eases for most people by around week 14.'));
  }

  if (stage === 'new-mother') {
    out.push(item('nutrition', 'normal',
      'Eat when the baby feeds',
      'Keep something one-handed within reach of where you feed — nuts, dates, a boiled egg, fruit. The gap between meals is what actually breaks in these months, not the food itself.',
      'You are in the months after the birth, when the obstacle is time rather than knowledge.'));
  }

  if (stage === 'parent') {
    out.push(item('nutrition', 'normal',
      'Iron-rich food at every main meal',
      'Egg yolk, liver once a week, lentils, dark leafy greens, meat if you eat it. Pair it with something sour rather than with milk.',
      'Iron deficiency is the commonest nutritional problem in young children in Bangladesh, and it is easiest to prevent at the table.'));
  }

  if (stage === 'planning') {
    out.push(item('nutrition', 'high',
      'Start folic acid now, not when you conceive',
      '400 µg daily, from at least a month before. The part of the baby it protects is formed in the weeks before most people know they are pregnant.',
      'You have told us you are planning a pregnancy — this is the one recommendation whose window is already open.'));
  }

  /* --- always true, and worth saying once ----------------------------- */

  if (stage === 'pregnant' || stage === 'planning') {
    out.push(item('nutrition', 'normal',
      'Caffeine under 200 mg',
      'About two cups of instant coffee, or three or four cups of tea. Worth counting because it adds up quietly.',
      'A general pregnancy limit rather than something in your readings.'));
  }

  return out.sort(byPriority);
}

/* -------------------------------------------------------------- targets */

/** The daily targets to show alongside the advice, for her stage. */
function targetsFor(ctx) {
  const { stage, trimester, conditions } = ctx;
  const base = (TARGETS[stage] || TARGETS.pregnant).map((t) => ({ ...t }));

  // an anaemic mother is not on the standard iron figure
  if (conditions.has('anaemia')) {
    const iron = base.find((t) => t.key === 'iron');
    if (iron) {
      iron.amount = 'As prescribed';
      iron.why = 'Anaemia on your record means your dose is a clinical decision, not a general figure. Take what you were prescribed.';
      iron.flagged = true;
    }
  }

  if (stage === 'pregnant' && trimester) {
    base.push({
      key: 'energy',
      label: 'Extra energy',
      amount: ENERGY_BY_TRIMESTER[trimester].amount,
      why: ENERGY_BY_TRIMESTER[trimester].why,
    });
  }

  return base;
}

/* ------------------------------------------------------------- exercise */

/**
 * Movement.
 *
 * The one place in this file where wrong advice can hurt someone directly, so
 * a high-risk profile gets no exercise programme at all — it gets told to ask
 * first, and offered only what is safe regardless.
 */
function exercise(ctx) {
  const {
    stage, week, trimester, risk, drivers, log,
  } = ctx;
  const out = [];
  const level = risk ? risk.level : null;

  if (level === 'high') {
    out.push(item('exercise', 'urgent',
      'Wait for your obstetrician before changing anything',
      'Do not start, continue or increase an exercise routine on the strength of this page. With readings in this range, whether activity is safe for you is a decision only the doctor seeing you can make.',
      `Your current assessment is ${risk.label.toLowerCase()} (${risk.score}/100), driven by ${drivers.slice(0, 2).map((d) => d.name.toLowerCase()).join(' and ') || 'your recent readings'}.`));
    out.push(item('exercise', 'normal',
      'Pelvic floor exercises are safe meanwhile',
      'Ten slow squeezes and ten quick ones, a few times a day. They need no exertion and can be done sitting or lying.',
      'Safe at any risk level, which is why it is the only thing offered here for now.'));
    return out;
  }

  if (stage === 'pregnant') {
    if (level === 'medium') {
      out.push(item('exercise', 'high',
        'Keep moving, but do not start anything new and hard',
        'Continue what your body is already used to. This is not the moment to begin a programme you have not done before — mention any change to your doctor at the next visit.',
        `Your assessment is medium risk (${risk.score}/100). Movement still helps; a sudden increase is what is not advised.`));
    } else {
      out.push(item('exercise', 'normal',
        '150 minutes a week, moderate',
        'Thirty minutes on most days: brisk walking, swimming, stationary cycling or prenatal yoga. Moderate means you can still hold a conversation while doing it.',
        'The standard antenatal recommendation, and your readings give no reason to reduce it.'));
    }

    if (driving(drivers, 'sugar')) {
      out.push(item('exercise', 'high',
        'Walk for ten minutes after meals',
        'A short walk after eating lowers the glucose peak more reliably than the same walk at another time of day.',
        'Blood glucose is one of the things raising your score, and this is the cheapest thing that moves it.'));
    }

    out.push(item('exercise', 'normal',
      'Pelvic floor, daily',
      'Ten slow squeezes and ten quick ones, two or three times a day. The habit is what matters, not the session.',
      'Recommended right through pregnancy and after the birth, whatever else is going on.'));

    if (trimester >= 2) {
      out.push(item('exercise', 'normal',
        'Nothing flat on your back',
        'From the second trimester the weight of the uterus presses on the vein returning blood to your heart. Side-lying or propped up instead — this rules out ordinary sit-ups and some yoga positions.',
        `You are in trimester ${trimester}, which is when this starts to matter.`));
    }

    out.push(item('exercise', 'normal',
      'Avoid falls and overheating',
      'No contact sport, no cycling on the road, nothing at altitude, no hot yoga and no saunas. A fall and a raised core temperature are the two specific risks.',
      'General to pregnancy rather than to your readings.'));

    if (week >= 28) {
      out.push(item('exercise', 'normal',
        'Stop and rest if anything feels wrong',
        'Bleeding, leaking fluid, contractions, chest pain, calf pain or swelling, or dizziness mean stop and call. Do not push through any of those.',
        `You are at week ${week}, when it is worth knowing the stop signs by heart.`));
    }
  }

  if (stage === 'new-mother') {
    out.push(item('exercise', 'high',
      'Pelvic floor first, everything else after the six-week check',
      'Pelvic floor work can start almost immediately and matters most. Running, jumping and abdominal work wait until you have been checked — earlier return is what causes lasting problems.',
      'You are in the months after the birth, where sequence matters more than effort.'));
    out.push(item('exercise', 'normal',
      'Walking, building slowly',
      'Start with what you can do without soreness the next day and add to it weekly. Pushing the pram counts.',
      'The safest way back, and the one least likely to be abandoned.'));
  }

  if (stage === 'planning') {
    out.push(item('exercise', 'normal',
      'Build the habit before you conceive',
      '150 minutes a week now is easier to maintain through a pregnancy than to start during one.',
      'You are planning a pregnancy — this is the easiest time to change it.'));
  }

  if (stage === 'parent') {
    out.push(item('exercise', 'normal',
      'Floor time for the baby, every day',
      'Supervised time on the tummy while awake builds the neck and shoulder strength that rolling and crawling need.',
      'Aimed at your child rather than at you, which is what this stage calls for.'));
  }

  // her own sleep is an exercise input, not only a lifestyle one
  if (log && log.avgSleepHours != null && log.avgSleepHours < 6) {
    out.push(item('exercise', 'normal',
      'Take the rest over the workout',
      'On the days you have slept badly, a walk is worth more than a session. Training on very little sleep is where injuries come from.',
      `You have averaged ${log.avgSleepHours} hours of sleep across your last ${log.days} logged days.`));
  }

  return out.sort(byPriority);
}

/* ------------------------------------------------------------ lifestyle */

function lifestyle(ctx) {
  const {
    stage, week, trimester, risk, drivers, log, symptoms, vitals, conditions,
  } = ctx;
  const out = [];
  const level = risk ? risk.level : null;

  /* --- monitoring, which is what the risk level really changes -------- */

  if (level === 'high') {
    out.push(item('lifestyle', 'urgent',
      'Speak to your obstetrician today',
      'Readings in this range need someone who can examine you. This page is not a substitute for that, and today is not the same as at the next appointment.',
      `${risk.label} (${risk.score}/100), driven by ${drivers.slice(0, 2).map((d) => d.name.toLowerCase()).join(' and ') || 'your recent readings'}.`));
    out.push(item('lifestyle', 'high',
      'Know the signs that mean go in now',
      'Severe headache, blurred or flashing vision, pain under the ribs on the right, sudden swelling of the face or hands, heavy bleeding, or the baby moving less than usual. Any one of them, go — do not wait to see if it settles.',
      'These are the warning signs specific to the range your readings are in.'));
    out.push(item('lifestyle', 'high',
      'Blood pressure twice a day, written down',
      'Morning and evening, sitting, same arm. The trend is what your doctor will want, not a single number.',
      'At this level, a single reading tells nobody very much.'));
  } else if (level === 'medium') {
    out.push(item('lifestyle', 'high',
      'A check-up within the week',
      'Bring your logged readings with you — the trend is the useful part, and this app can produce a report you can hand over.',
      `${risk.label} (${risk.score}/100). Nothing here is an emergency; it is worth a professional look sooner than your next routine visit.`));
    out.push(item('lifestyle', 'normal',
      'Log the readings that are driving this daily',
      drivers.length
        ? `Particularly ${drivers.map((d) => d.name.toLowerCase()).join(', ')}.`
        : 'Blood pressure and glucose, at the same time each day.',
      'Daily numbers make a trend; occasional ones make noise.'));
  } else if (level === 'low') {
    out.push(item('lifestyle', 'normal',
      'Keep logging twice a week',
      'There is nothing to chase here. The value of the record is that it exists before anything changes.',
      `${risk.label} (${risk.score}/100) — your readings are within range.`));
  }

  /* --- what she has actually been logging ----------------------------- */

  if (log && log.days > 0) {
    const target = FLUID_TARGET[stage] ?? 2.5;
    if (log.avgWaterLitres != null && log.avgWaterLitres < target) {
      out.push(item('lifestyle', 'normal',
        'Drink more water',
        `You are averaging ${log.avgWaterLitres} L a day; the target for where you are is about ${target} L. Dehydration shows up first as headaches, constipation and — later on — as tightenings that are not labour.`,
        `Measured from the ${log.days} days you logged, not assumed.`));
    }

    if (log.avgSleepHours != null && log.avgSleepHours < 7) {
      out.push(item('lifestyle', log.avgSleepHours < 6 ? 'high' : 'normal',
        'Protect the sleep you can get',
        'A pillow between the knees and one under the bump helps more than anything else at this stage. If you are waking to pass urine, move your fluid earlier in the day rather than drinking less overall.',
        `You have averaged ${log.avgSleepHours} hours across your last ${log.days} logged days.`));
    }

    if (['Sad', 'Anxiety', 'Stress', 'Tired'].includes(log.commonMood)) {
      out.push(item('lifestyle', log.commonMood === 'Sad' ? 'high' : 'normal',
        'This is worth telling someone about',
        'Low mood and anxiety in pregnancy and after birth are common, treatable, and consistently under-reported. Telling your midwife or doctor is not an overreaction, and it is not a complaint about the pregnancy.',
        `"${log.commonMood}" has been your most frequent mood across your last ${log.days} logged days.`));
    }
  }

  if (symptoms && symptoms.length) {
    const names = symptoms.slice(0, 3).map((s) => s.name.toLowerCase()).join(', ');
    out.push(item('lifestyle', 'normal',
      'Bring your symptom log to the next visit',
      'How many days something has lasted is the part that gets forgotten in the room, and it is usually the part that decides what happens next.',
      `You are currently logging ${names}${symptoms.length > 3 ? ` and ${symptoms.length - 3} more` : ''}.`));
  }

  /* --- what the stage changes ---------------------------------------- */

  if (stage === 'pregnant' && week >= 28) {
    out.push(item('lifestyle', 'high',
      'Count movements daily',
      'Get to know what a normal day of movement feels like for your baby, at the time of day they are usually busiest. Call the same day if that pattern changes — not tomorrow, and do not wait for a fixed number of kicks.',
      `You are at week ${week}, from which reduced movement is the single most important thing you can notice yourself.`));
  }

  if (stage === 'pregnant' && week >= 34) {
    out.push(item('lifestyle', 'normal',
      'Have the bag packed and the route decided',
      'Notes, cards, phone charger. Decide now who takes you and how, and make sure someone else knows the plan.',
      `Week ${week} — most people pack around now, earlier after a previous early birth.`));
  }

  if (stage === 'pregnant' && trimester === 1) {
    out.push(item('lifestyle', 'normal',
      'Nothing to smoke, nothing to drink, nothing unprescribed',
      'No safe amount of alcohol has been established in pregnancy. Check any medicine or supplement — including herbal ones — with a pharmacist before taking it.',
      'Trimester 1, when organs are forming and exposure matters most.'));
  }

  if (conditions.has('rh')) {
    out.push(item('lifestyle', 'high',
      'Ask about your anti-D injection',
      'If you are Rh negative and the baby is Rh positive, anti-D at the right times prevents problems in this pregnancy and the next. Check the timing has been booked.',
      'Rh negative is on your record.'));
  }

  if (vitals && vitals.temp_c >= 37.5) {
    out.push(item('lifestyle', 'urgent',
      'A fever in pregnancy is not something to wait out',
      'Drink, rest, and call your doctor rather than treating it yourself. Paracetamol is generally the only thing considered safe, and a fever is a reason to be seen, not only to be brought down.',
      `Your last recorded temperature was ${vitals.temp_c} °C.`));
  }

  if (stage === 'new-mother') {
    out.push(item('lifestyle', 'high',
      'Watch for more than the baby blues',
      'Low mood in the first two weeks is very common. Beyond that, or if it is severe, or if you cannot sleep even when the baby does, that is postnatal depression and it is treatable. Tell someone.',
      'You are in the window where this is both most likely and most often missed.'));
  }

  return out.sort(byPriority);
}

/* ----------------------------------------------------------------- API */

module.exports = {
  TARGETS,
  FLUID_TARGET,

  /**
   * Build the plan from a context that has already been gathered. Kept
   * separate from `forUser` so it can be exercised directly, without a
   * database, against a made-up profile.
   */
  build(ctx) {
    const conditions = ctx.conditions && ctx.conditions.has
      ? ctx.conditions
      : conditionsOf({ conditions: ctx.conditionsText || '' });
    const drivers = driversOf(ctx.risk);
    const full = { ...ctx, conditions, drivers };

    const log = ctx.log;
    const fluidTarget = FLUID_TARGET[ctx.stage] ?? 2.5;

    /*
     * The basis line. This is the feature, really: the difference between a
     * leaflet and a plan is being able to say what it was built from, and
     * being able to show it is what makes it checkable.
     */
    const basis = [];
    if (ctx.stage === 'pregnant' && ctx.week) basis.push(`week ${ctx.week} of your pregnancy`);
    else if (ctx.stage) basis.push(`your stage: ${ctx.stage.replace('-', ' ')}`);
    if (ctx.risk) basis.push(`your ${ctx.risk.label.toLowerCase()} assessment`);
    for (const d of drivers.slice(0, 3)) basis.push(d.name.toLowerCase());
    if (conditions.known.length) basis.push(...conditions.known.map((c) => c.label.toLowerCase()));
    if (ctx.weightGain) basis.push('your weight gain so far');
    if (log && log.days > 0) basis.push(`${log.days} days of your own log`);

    return {
      stage: ctx.stage,
      week: ctx.week ?? null,
      trimester: ctx.trimester ?? null,
      risk: ctx.risk
        ? {
          level: ctx.risk.level, label: ctx.risk.label, score: ctx.risk.score, drivers,
        }
        : null,
      conditions: conditions.known,
      targets: targetsFor(full),
      nutrition: nutrition(full),
      exercise: exercise(full),
      lifestyle: lifestyle(full),
      /*
       * The one intake figure this app can honestly show, because it is the
       * only one she actually logs. Everything else here is a target, and is
       * labelled as one.
       */
      hydration: log && log.avgWaterLitres != null
        ? {
          targetLitres: fluidTarget,
          avgLitres: log.avgWaterLitres,
          days: log.days,
          pct: Math.min(100, Math.round((log.avgWaterLitres / fluidTarget) * 100)),
        }
        : { targetLitres: fluidTarget, avgLitres: null, days: log?.days ?? 0, pct: null },
      basis,
      /*
       * Said plainly rather than buried. The proposal calls this feature
       * AI-generated; what it actually is, is a rule engine reading her own
       * record, and a mother is better served by knowing which.
       */
      method: 'Built by matching your record against published maternal guidance. No part of this is a diagnosis, and none of it overrides the person treating you.',
    };
  },

  /**
   * Everything one mother's plan is built from, gathered in parallel.
   *
   * Exposed separately from `forUser` so the "what if my numbers were these"
   * form can swap the readings and rebuild without re-fetching, and without
   * losing the parts of her record the hypothetical does not change.
   */
  async context(userId) {
    const user = await userModel.find(userId);
    if (!user) return null;

    const pregnancy = await pregnancyModel.forUser(userId);
    const [risk, weightGain, log, symptoms, vitals] = await Promise.all([
      riskModel.fromLatestVitals(user, pregnancy).catch(() => null),
      pregnancyModel.weightGain(userId).catch(() => null),
      dailyLogModel.summary(userId, 7).catch(() => null),
      symptomModel.all(userId).catch(() => []),
      vitalModel.current(userId).catch(() => null),
    ]);

    return {
      stage: user.stage || 'pregnant',
      week: pregnancy ? pregnancy.week : null,
      trimester: pregnancy ? pregnancy.trimester : null,
      conditions: conditionsOf(user),
      risk,
      weightGain,
      log,
      symptoms,
      vitals,
    };
  },

  async forUser(userId) {
    const ctx = await this.context(userId);
    return ctx ? this.build(ctx) : null;
  },
};

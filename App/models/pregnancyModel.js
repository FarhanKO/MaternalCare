const db = require('../config/db');

const DAY = 86400000;

// Approximate fetal size references by gestational week
const SIZE_BY_WEEK = {
  4:  ['Poppy seed', '0.1 cm', '< 1 g', '🌱'],   6:  ['Sweet pea', '0.6 cm', '< 1 g', '🟢'],
  8:  ['Raspberry', '1.6 cm', '1 g', '🫐'],      10: ['Strawberry', '3.1 cm', '4 g', '🍓'],
  12: ['Lime', '5.4 cm', '14 g', '🍈'],          14: ['Lemon', '8.7 cm', '43 g', '🍋'],
  16: ['Avocado', '11.6 cm', '100 g', '🥑'],     18: ['Bell pepper', '14.2 cm', '190 g', '🫑'],
  20: ['Banana', '25.6 cm', '300 g', '🍌'],      22: ['Papaya', '27.8 cm', '430 g', '🥭'],
  24: ['Corn cob', '30 cm', '600 g', '🌽'],      26: ['Lettuce head', '35.6 cm', '760 g', '🥬'],
  28: ['Eggplant', '37.6 cm', '1.0 kg', '🍆'],   30: ['Cabbage', '39.9 cm', '1.3 kg', '🥬'],
  32: ['Coconut', '42.4 cm', '1.7 kg', '🥥'],    34: ['Pineapple', '45 cm', '2.1 kg', '🍍'],
  36: ['Honeydew melon', '47.4 cm', '2.6 kg', '🍈'], 38: ['Winter melon', '49.8 cm', '3.0 kg', '🍈'],
  40: ['Watermelon', '51.2 cm', '3.4 kg', '🍉'],
};

const WEEK_NOTES = {
  24: 'Baby’s hearing is developing fast — they can recognise your voice now.',
  25: 'Baby is practising breathing movements with amniotic fluid.',
  26: 'Baby’s eyes are opening this week and eyelashes are fully formed.',
  27: 'Third trimester begins — brain tissue is developing rapidly.',
  28: 'Baby can blink and may respond to light and sound from outside.',
};

/**
 * The size table as a plottable series, in numbers rather than display
 * strings.
 *
 * The dashboard used to carry its own copy of these figures as a chart
 * fixture, which had drifted: it showed a week-26 baby at 35.6 cm while the
 * badge beside it read the week-28 row. Serving one table means the curve and
 * the badge cannot disagree, and it is honest about what it is — typical size
 * for a week, not a measurement of her baby.
 */
function growthReference() {
  const grams = (w) => (w.endsWith('kg')
    ? Math.round(parseFloat(w) * 1000)
    : Math.round(parseFloat(w) || 0));
  return Object.entries(SIZE_BY_WEEK)
    .map(([week, [fruit, length, weight]]) => ({
      week: Number(week),
      label: `W${week}`,
      fruit,
      lengthCm: parseFloat(length) || 0,
      weightG: grams(weight),
    }))
    .sort((a, b) => a.week - b.week);
}

module.exports = {
  growthReference,
  async forUser(userId) {
    const p = await db.one('SELECT * FROM pregnancies WHERE user_id = $1', [userId]);
    if (!p) return null;

    const lmp = new Date(`${p.lmp}T00:00:00`);
    const now = new Date();
    const daysElapsed = Math.floor((now - lmp) / DAY);
    const week = Math.min(42, Math.floor(daysElapsed / 7));
    const dayOfWeek = daysElapsed % 7;
    const edd = new Date(lmp.getTime() + 280 * DAY);
    const daysLeft = Math.max(0, Math.round((edd - now) / DAY));
    const trimester = week < 13 ? 1 : week < 27 ? 2 : 3;
    const progress = Math.min(100, Math.round((daysElapsed / 280) * 100));

    const sizeWeek = Math.max(4, Math.min(40, week - (week % 2)));
    const [fruit, length, weight, emoji] = SIZE_BY_WEEK[sizeWeek] || SIZE_BY_WEEK[40];

    return {
      ...p, week, dayOfWeek, trimester, progress, daysLeft,
      edd: edd.toISOString().slice(0, 10),
      eddPretty: edd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      babySize: { fruit, length, weight, emoji },
      weekNote: WEEK_NOTES[week] || 'Your baby is growing steadily — keep logging your vitals and rest well.',
    };
  },

  /**
   * Weight gain so far, against the range recommended for her starting BMI.
   *
   * This is what `pre_weight_kg` and `height_cm` were recorded for: a number
   * on the scales means little on its own, because the healthy range depends
   * entirely on where she started. Ranges are the Institute of Medicine's
   * 2009 guidance for a single baby, which is what antenatal clinics use.
   *
   * Guidance, not a verdict — the copy says so, and it defers to her doctor.
   */
  async weightGain(userId) {
    const p = await db.one('SELECT * FROM pregnancies WHERE user_id = $1', [userId]);
    if (!p || !p.pre_weight_kg || !p.height_cm) return null;

    const latest = await db.one(
      `SELECT date, weight_kg FROM vitals
       WHERE user_id = $1 AND weight_kg IS NOT NULL ORDER BY date DESC LIMIT 1`,
      [userId],
    );
    if (!latest) return null;

    const metres = p.height_cm / 100;
    const bmi = p.pre_weight_kg / (metres * metres);

    const category = bmi < 18.5 ? 'underweight'
      : bmi < 25 ? 'healthy'
      : bmi < 30 ? 'overweight'
      : 'obese';

    // total gain expected across the whole pregnancy, in kg
    const TOTAL = {
      underweight: [12.5, 18],
      healthy: [11.5, 16],
      overweight: [7, 11.5],
      obese: [5, 9],
    }[category];

    const { week } = await this.forUser(userId);
    const gained = Math.round((latest.weight_kg - p.pre_weight_kg) * 10) / 10;

    /*
     * Expected gain by *this* week, not by term. Roughly 2 kg over the first
     * trimester whatever the category, then a steady weekly rate for the
     * remaining 27 weeks — which is how the IOM tables are built.
     */
    const first = 2;
    const weeksAfter = Math.max(0, Math.min(week, 40) - 13);
    const expectedFor = (total) => (week <= 13
      ? (first * Math.min(week, 13)) / 13
      : first + ((total - first) * weeksAfter) / 27);

    const low = Math.round(expectedFor(TOTAL[0]) * 10) / 10;
    const high = Math.round(expectedFor(TOTAL[1]) * 10) / 10;

    const status = gained < low ? 'below' : gained > high ? 'above' : 'on-track';

    const NOTE = {
      below: 'A little under the usual range for this week. Worth mentioning at your next visit — it is often nothing.',
      'on-track': 'Within the usual range for this week.',
      above: 'A little over the usual range for this week. Your doctor can tell you whether it matters for you.',
    };

    return {
      preWeightKg: p.pre_weight_kg,
      currentWeightKg: latest.weight_kg,
      measuredOn: latest.date,
      gainedKg: gained,
      bmi: Math.round(bmi * 10) / 10,
      category,
      week,
      expected: { low, high },
      totalRange: { low: TOTAL[0], high: TOTAL[1] },
      status,
      note: NOTE[status],
    };
  },

  /** Per-week journey timeline entries around the current week */
  timeline(week) {
    const items = [
      { week: 12, label: 'First trimester screening', icon: '🩺' },
      { week: 20, label: 'Anatomy ultrasound scan', icon: '🖥️' },
      { week: 26, label: 'Glucose tolerance test', icon: '🧪' },
      { week: 28, label: 'Tdap vaccination & Rh check', icon: '💉' },
      { week: 32, label: 'Growth scan & position check', icon: '📏' },
      { week: 36, label: 'Group B strep screening', icon: '🔬' },
      { week: 40, label: 'Estimated delivery date', icon: '👶' },
    ];
    return items.map(i => ({ ...i, state: i.week < week ? 'done' : i.week === week ? 'now' : 'next' }));
  },
};

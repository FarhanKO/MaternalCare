const db = require('../config/database');

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

module.exports = {
  forUser(userId) {
    const p = db.prepare('SELECT * FROM pregnancies WHERE user_id = ?').get(userId);
    if (!p) return null;

    const lmp = new Date(p.lmp + 'T00:00:00');
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

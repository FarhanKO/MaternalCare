import {
  GENERIC_ADVICE, INTENSITY_WEIGHT, lexiconFor, URGENT_LABELS, type Symptom,
} from '@/data/symptoms';

/** Risk tone scale used by every message box in the dashboard. */
export type Tone = 'danger' | 'warn' | 'info' | 'good';

export const TONE_CLASS: Record<Tone, string> = {
  danger: 'bg-rose-500/12 text-rose-700 ring-rose-500/25',
  warn: 'bg-amber-500/12 text-amber-700 ring-amber-500/25',
  info: 'bg-brand-500/10 text-brand-700 ring-brand-500/20',
  good: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20',
};

export const TONE_DOT: Record<Tone, string> = {
  danger: '#e5484d', warn: '#f6b93b', info: '#3f66f0', good: '#2fbf9b',
};

export const GLASS_ML = 0.25;
export const WATER_GOAL = 2.0;
export const glassesFor = (litres: number) => Math.floor(litres / GLASS_ML);

/* ---------------- per-metric messages ---------------- */

export function waterStatus(l: number): { tone: Tone; text: string } {
  if (l >= WATER_GOAL) return { tone: 'good', text: 'Goal reached — you’re beautifully hydrated today.' };
  if (l >= 1.4) return { tone: 'info', text: `${(WATER_GOAL - l).toFixed(1)} L to go. You’re nearly at your daily goal.` };
  if (l >= 0.8) return { tone: 'warn', text: `${(WATER_GOAL - l).toFixed(1)} L left — low. Dehydration can trigger cramps and fatigue.` };
  return { tone: 'danger', text: 'Very low intake. Dehydration reduces amniotic fluid — please drink now.' };
}

export function kickStatus(n: number): { tone: Tone; text: string } {
  if (n === 0) return { tone: 'danger', text: 'No movements logged. If you feel none in 2 hours, contact your care team.' };
  if (n < 10) return { tone: 'warn', text: `${n} so far — below the usual daily pattern. Rest on your left side and recount.` };
  // deliberately no target number: what matters is her baby's own pattern
  if (n <= 15) return { tone: 'info', text: `${n} kicks — in line with a usual day. Watch for a change in the pattern, not a count.` };
  return { tone: 'good', text: `${n} kicks — baby is active and responsive today.` };
}

export function moodTone(name: string): Tone {
  if (['Happy', 'Loved'].includes(name)) return 'good';
  if (['Calm', 'Neutral'].includes(name)) return 'info';
  if (['Sad'].includes(name)) return 'danger';
  return 'warn';
}

/* ---------------- persistence ---------------- */

export type Stage = 'new' | 'ongoing' | 'persistent' | 'prolonged';

export function stageFor(daysPresent: number): Stage {
  if (daysPresent >= 14) return 'prolonged';
  if (daysPresent >= 7) return 'persistent';
  if (daysPresent >= 3) return 'ongoing';
  return 'new';
}

const STAGE_COPY: Record<Stage, { tone: Tone; note: string }> = {
  new: { tone: 'info', note: 'Newly logged — self-care first, and keep tracking how it changes.' },
  ongoing: { tone: 'warn', note: 'Present for several days — worth mentioning at your next appointment.' },
  persistent: { tone: 'warn', note: 'A week or more without easing — book a review rather than waiting.' },
  prolonged: { tone: 'danger', note: 'Two weeks or more unchanged — please report this to your doctor now.' },
};

export interface Advice {
  name: string;
  daysPresent: number;
  stage: Stage;
  tone: Tone;
  urgent: boolean;
  stageNote: string;
  causes: string[];
  relief: string[];
}

/** Per-symptom causes + immediate relief, escalating with how long it has persisted. */
export function buildAdvice(symptoms: Symptom[]): Advice[] {
  return symptoms.map((s) => {
    const entry = lexiconFor(s.name);
    const urgent = URGENT_LABELS.has(s.name);
    const stage = stageFor(s.daysPresent);
    const stageCopy = STAGE_COPY[stage];
    const intensityBump = s.intensity === 'severe';
    const tone: Tone = urgent || intensityBump ? 'danger' : stageCopy.tone;
    return {
      name: s.name,
      daysPresent: s.daysPresent,
      stage,
      tone,
      urgent,
      stageNote: urgent
        ? 'This symptom should be reviewed by a clinician today, regardless of how long it has been present.'
        : stageCopy.note,
      causes: entry?.causes ?? GENERIC_ADVICE.causes,
      relief: entry?.relief ?? GENERIC_ADVICE.relief,
    };
  });
}

/** Lines a mother can read out or hand to her clinician — escalates with persistence. */
export function doctorReport(symptoms: Symptom[]): { tone: Tone; lines: string[]; headline: string } {
  if (!symptoms.length) {
    return { tone: 'good', headline: 'Nothing to report', lines: ['No symptoms logged — nothing outstanding for your care team.'] };
  }
  const lines: string[] = [];
  const rank: Record<Tone, number> = { good: 0, info: 1, warn: 2, danger: 3 };
  const tones: Tone[] = ['info'];
  const bump = (t: Tone) => { tones.push(t); };

  for (const s of symptoms) {
    const stage = stageFor(s.daysPresent);
    const urgent = URGENT_LABELS.has(s.name);
    if (urgent) {
      bump('danger');
      lines.push(`${s.name} (${s.intensity}) — red-flag symptom, day ${s.daysPresent}. Needs same-day assessment.`);
    } else if (stage === 'prolonged') {
      bump('danger');
      lines.push(`${s.name} (${s.intensity}) — unchanged for ${s.daysPresent} days. Request a clinical review.`);
    } else if (stage === 'persistent') {
      bump('warn');
      lines.push(`${s.name} (${s.intensity}) — ongoing ${s.daysPresent} days despite self-care. Ask for assessment this week.`);
    } else if (stage === 'ongoing') {
      bump('warn');
      lines.push(`${s.name} (${s.intensity}) — day ${s.daysPresent}. Mention at the next appointment.`);
    } else {
      lines.push(s.daysPresent > 1
        ? `${s.name} (${s.intensity}) — day ${s.daysPresent}. Monitoring at home.`
        : `${s.name} (${s.intensity}) — new today. Monitoring at home.`);
    }
  }

  const worst = tones.reduce((a, b) => (rank[b] > rank[a] ? b : a), 'info' as Tone);
  const headline =
    worst === 'danger' ? 'Contact your care team' :
    worst === 'warn' ? 'Raise these at your next visit' :
    'Monitoring at home';

  return { tone: worst, lines, headline };
}

/* ---------------- what's ahead (forecast, not an echo of inputs) ---------------- */

export interface Prediction { label: string; value: string; note: string }
export interface Milestone { window: string; title: string; detail: string; status: 'due' | 'soon' | 'later' }

export interface Forecast {
  predictions: Prediction[];
  milestones: Milestone[];
  advice: Insight[];
}

/** Projections and upcoming care for the current week — information she hasn't entered herself. */
export function buildForecast(week: number, dueLabel = 'Apr 2'): Forecast {
  const toThird = Math.max(0, 28 - week);
  const toTerm = Math.max(0, 37 - week);
  const toDue = Math.max(0, 40 - week);
  const wk = (n: number) => (n === 0 ? 'this week' : n === 1 ? 'in 1 week' : `in ${n} weeks`);

  const predictions: Prediction[] = [
    { label: 'Estimated birth weight', value: '3.1 – 3.6 kg', note: `Projected from your growth curve — most babies roughly triple their current weight between week ${week} and birth.` },
    { label: 'Third trimester', value: wk(toThird), note: `Week 28 — from then, movement patterns matter more than counts.` },
    { label: 'Full term', value: wk(toTerm), note: `Week 37. Due ${dueLabel} — only about 1 in 20 babies arrive on the exact date.` },
  ];

  const milestones: Milestone[] = [
    { window: 'Weeks 24–28', title: 'Glucose screening', detail: 'Checks for gestational diabetes. Your window is open now — book it if you haven’t.', status: week >= 24 && week <= 28 ? 'due' : 'later' },
    { window: 'By week 32', title: 'Whooping cough vaccine', detail: 'Passes antibodies to baby, protecting them in their first weeks before their own jabs.', status: week <= 32 ? 'soon' : 'later' },
    { window: 'Week 28', title: 'Anti-D injection (if Rh negative)', detail: 'Only needed if your blood group is RhD negative — your notes will say.', status: toThird <= 2 ? 'soon' : 'later' },
    { window: 'Weeks 28–32', title: 'Growth scan', detail: 'Confirms baby is tracking along their expected curve.', status: toThird <= 2 ? 'soon' : 'later' },
    { window: 'By week 36', title: 'Hospital bag & birth plan', detail: 'Most people pack around week 34 — earlier if you’ve had a previous early birth.', status: 'later' },
  ];

  const advice: Insight[] = [
    { tone: 'info', title: 'Start side-sleeping now', detail: 'From the third trimester, going to sleep on your side (either side) is advised — back-sleeping is linked to a higher stillbirth risk. If you wake on your back, just settle back onto your side.' },
    { tone: 'info', title: 'Iron demand peaks next', detail: 'Baby stockpiles iron in the final 10 weeks for their first 6 months of life. Low iron now is common and easy to miss — worth asking for a check at your next visit.' },
    { tone: 'good', title: 'Brain growth accelerates', detail: 'Between now and birth your baby’s brain roughly triples in weight. Protein, omega-3 and sleep matter more in this stretch than at any earlier point.' },
    { tone: 'warn', title: 'Learn the preterm signs', detail: `You have ${toTerm} weeks until full term. Regular tightening, fluid loss, or persistent back pressure before then should be phoned in the same day — not left to the next appointment.` },
  ];

  return { predictions, milestones, advice };
}

/* ---------------- combined health report ---------------- */

export interface Factor { label: string; value: string; score: number; tone: Tone }
export interface Insight { title: string; detail: string; tone: Tone }

export interface HealthReport {
  score: number;
  band: { label: string; tone: Tone };
  factors: Factor[];
  alerts: Insight[];
  mother: Insight[];
  baby: Insight[];
  report: ReturnType<typeof doctorReport>;
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function buildReport({
  water, kicks, moodName, symptoms, sleepAvg = 7.5,
}: {
  water: number; kicks: number; moodName: string; symptoms: Symptom[]; sleepAvg?: number;
}): HealthReport {
  const hydrationScore = clamp((water / WATER_GOAL) * 100);
  const movementScore = clamp((Math.min(kicks, 16) / 16) * 100);
  const moodScore = { good: 100, info: 78, warn: 52, danger: 30 }[moodTone(moodName)];
  const sleepScore = clamp((sleepAvg / 8) * 100);

  // persistence makes an unresolved symptom count for more over time
  const burden = symptoms.reduce((a, s) => {
    const persistence = Math.min(2, 1 + (s.daysPresent - 1) * 0.12);
    return a + INTENSITY_WEIGHT[s.intensity] * persistence + (URGENT_LABELS.has(s.name) ? 14 : 0);
  }, 0);
  const symptomScore = clamp(100 - burden);

  const toneFor = (v: number): Tone => (v >= 85 ? 'good' : v >= 65 ? 'info' : v >= 45 ? 'warn' : 'danger');

  const longest = symptoms.reduce((m, s) => Math.max(m, s.daysPresent), 0);
  const factors: Factor[] = [
    { label: 'Hydration', value: `${water.toFixed(1)} / ${WATER_GOAL.toFixed(1)} L`, score: hydrationScore, tone: toneFor(hydrationScore) },
    { label: 'Baby movement', value: `${kicks} kicks`, score: movementScore, tone: toneFor(movementScore) },
    { label: 'Emotional wellbeing', value: moodName, score: moodScore, tone: toneFor(moodScore) },
    { label: 'Sleep', value: `${sleepAvg.toFixed(1)} h avg`, score: sleepScore, tone: toneFor(sleepScore) },
    {
      label: 'Symptom load',
      value: symptoms.length ? `${symptoms.length} logged${longest > 2 ? ` · ${longest}d longest` : ''}` : 'None logged',
      score: symptomScore, tone: toneFor(symptomScore),
    },
  ];

  const score = clamp(hydrationScore * 0.2 + movementScore * 0.25 + moodScore * 0.15 + sleepScore * 0.15 + symptomScore * 0.25);

  const band =
    score >= 85 ? { label: 'Thriving', tone: 'good' as Tone }
    : score >= 70 ? { label: 'Doing well', tone: 'info' as Tone }
    : score >= 50 ? { label: 'Needs attention', tone: 'warn' as Tone }
    : { label: 'Please seek advice', tone: 'danger' as Tone };

  /* --- alerts --- */
  const alerts: Insight[] = [];
  for (const u of symptoms.filter((s) => URGENT_LABELS.has(s.name))) {
    alerts.push({
      tone: 'danger',
      title: `${u.name} — contact your care team`,
      detail: lexiconFor(u.name)?.effect ?? 'This symptom should be reviewed by a clinician today.',
    });
  }
  for (const p of symptoms.filter((s) => !URGENT_LABELS.has(s.name) && stageFor(s.daysPresent) === 'prolonged')) {
    alerts.push({
      tone: 'danger',
      title: `${p.name} unchanged for ${p.daysPresent} days`,
      detail: 'Self-care has not resolved this. Please report it to your doctor — persistent symptoms deserve assessment.',
    });
  }
  for (const p of symptoms.filter((s) => !URGENT_LABELS.has(s.name) && stageFor(s.daysPresent) === 'persistent')) {
    alerts.push({
      tone: 'warn',
      title: `${p.name} ongoing for ${p.daysPresent} days`,
      detail: 'It has not eased with self-care. Ask for a review this week rather than waiting for your next appointment.',
    });
  }

  const names = new Set(symptoms.map((s) => s.name));
  if ((names.has('Severe headache') || names.has('Headache')) && names.has('Swelling') && names.has('Blurred vision')) {
    alerts.push({
      tone: 'danger',
      title: 'Combination flagged: headache + swelling + vision changes',
      detail: 'Together these are recognised pre-eclampsia warning signs. Please seek same-day medical review.',
    });
  }
  if (kicks < 10 && water < 1) {
    alerts.push({
      tone: 'warn',
      title: 'Low fluids alongside reduced movement',
      detail: 'Dehydration can make babies less active. Drink 500 ml, rest on your left side, then recount for 2 hours.',
    });
  }

  /* --- effect on mother --- */
  const mother: Insight[] = [];
  if (hydrationScore < 60) mother.push({ tone: hydrationScore < 40 ? 'danger' : 'warn', title: 'Dehydration strain', detail: 'Low fluids commonly cause headaches, leg cramps, constipation and dizziness. Aim for a glass every waking hour.' });
  else mother.push({ tone: 'good', title: 'Hydration supporting you', detail: 'Good fluid intake supports blood volume, digestion and energy levels.' });

  if (moodScore < 60) mother.push({ tone: 'warn', title: 'Emotional load', detail: `Feeling ${moodName.toLowerCase()} raises stress hormones that affect sleep, appetite and blood pressure. Support helps — talk to someone you trust.` });
  else mother.push({ tone: 'good', title: 'Emotional wellbeing steady', detail: 'A settled mood supports sleep quality and healthier blood pressure.' });

  if (sleepScore < 80) mother.push({ tone: 'warn', title: 'Sleep debt building', detail: 'Under 8 h average — short sleep is linked to higher blood pressure and daytime fatigue.' });
  if (longest >= 7) mother.push({ tone: 'warn', title: 'A symptom is not resolving', detail: `Something has been present ${longest} days. Long-running symptoms drain energy and are the ones most worth escalating.` });
  if (names.has('Heartburn') || names.has('Nausea')) mother.push({ tone: 'info', title: 'Digestive symptoms', detail: 'Smaller, more frequent meals and staying upright after eating usually ease this.' });

  /* --- effect on baby --- */
  const baby: Insight[] = [];
  if (movementScore >= 65) baby.push({ tone: 'good', title: 'Healthy activity pattern', detail: `${kicks} movements is consistent with a well-oxygenated, responsive baby.` });
  else baby.push({ tone: kicks === 0 ? 'danger' : 'warn', title: 'Movement below pattern', detail: 'Fetal movement is the clearest day-to-day signal of wellbeing. If reduced, seek review the same day.' });

  if (hydrationScore < 60) baby.push({ tone: 'warn', title: 'Amniotic fluid depends on your intake', detail: 'Maternal dehydration can lower amniotic fluid volume, which babies need for cushioning and lung development.' });
  else baby.push({ tone: 'good', title: 'Fluid balance supporting baby', detail: 'Steady hydration helps maintain amniotic fluid and nutrient delivery through the placenta.' });

  if (moodScore < 60) baby.push({ tone: 'info', title: 'Stress crosses over', detail: 'Sustained maternal stress is associated with altered fetal heart-rate patterns. Rest and support benefit you both.' });
  baby.push({ tone: 'info', title: 'This week', detail: 'Hearing is sharpening — your voice is already familiar. Talking and calm music genuinely stimulate baby now.' });

  return { score, band, factors, alerts, mother, baby, report: doctorReport(symptoms) };
}

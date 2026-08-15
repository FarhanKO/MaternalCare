export type Intensity = 'mild' | 'mid' | 'high' | 'severe';

export const INTENSITIES: Intensity[] = ['mild', 'mid', 'high', 'severe'];
export const INTENSITY_LABEL: Record<Intensity, string> = {
  mild: 'Mild', mid: 'Mid', high: 'High', severe: 'Severe',
};
export const INTENSITY_WEIGHT: Record<Intensity, number> = {
  mild: 5, mid: 10, high: 17, severe: 25,
};

export interface Symptom {
  id: string;
  name: string;
  intensity: Intensity;
  /** consecutive days this symptom has been reported as still present */
  daysPresent: number;
  /** confirmed as still present during the current logging session */
  confirmedToday?: boolean;
  /** captured from the voice transcript */
  fromVoice?: boolean;
}

export interface LexiconEntry {
  label: string;
  keywords: string[];
  urgent?: boolean;
  effect?: string;
  causes: string[];
  relief: string[];
}

export const SYMPTOM_LEXICON: LexiconEntry[] = [
  {
    label: 'Back ache', keywords: ['back ache', 'backache', 'back pain', 'lower back', 'my back'],
    effect: 'Common as the uterus grows and posture shifts.',
    causes: ['Growing uterus shifting your centre of gravity', 'Relaxin loosening pelvic ligaments', 'Long periods standing or sitting', 'Weakened abdominal support'],
    relief: ['Warm compress on the lower back for 15 minutes', 'Sleep on your side with a pillow between the knees', 'Short, frequent walks instead of long standing', 'Flat supportive shoes; avoid heels'],
  },
  {
    label: 'Nausea', keywords: ['nausea', 'nauseous', 'queasy', 'sick to my stomach', 'morning sickness'],
    effect: 'Can reduce appetite — watch hydration and small frequent meals.',
    causes: ['Pregnancy hormones (hCG and oestrogen)', 'Empty stomach or long gaps between meals', 'Strong smells', 'Low blood sugar'],
    relief: ['Small, dry snacks every 2 hours (crackers, toast)', 'Ginger tea or a slice of fresh ginger', 'Sip fluids between meals rather than with them', 'Fresh air and avoid trigger smells'],
  },
  {
    label: 'Vomiting', keywords: ['vomit', 'vomiting', 'throwing up', 'threw up'],
    effect: 'Raises dehydration risk; replace fluids and electrolytes.',
    causes: ['Severe morning sickness', 'Food intolerance or infection', 'Reflux or an over-full stomach'],
    relief: ['Rehydrate with small sips every 10 minutes', 'Oral rehydration salts if repeated', 'Rest upright after eating'],
  },
  {
    label: 'Headache', keywords: ['headache', 'head ache', 'migraine', 'head hurts'],
    effect: 'Often dehydration or fatigue — persistent ones need review.',
    causes: ['Dehydration', 'Poor sleep or skipped meals', 'Caffeine change', 'Tension in neck and shoulders'],
    relief: ['Drink 500 ml of water now', 'Rest in a dark, quiet room', 'Cool compress on the forehead', 'Paracetamol is generally considered safe — confirm with your doctor'],
  },
  {
    label: 'Dizziness', keywords: ['dizzy', 'dizziness', 'light headed', 'lightheaded', 'faint'],
    effect: 'May signal low blood pressure, low iron or low fluids.',
    causes: ['Blood pressure drops as vessels relax', 'Standing up too quickly', 'Low iron (anaemia)', 'Low blood sugar or dehydration'],
    relief: ['Stand up slowly, sit if the room spins', 'Eat something small with iron and protein', 'Never stand still for long — keep moving gently'],
  },
  {
    label: 'Swelling', keywords: ['swelling', 'swollen', 'puffy', 'oedema', 'edema'],
    effect: 'Mild ankle swelling is normal; sudden face/hand swelling is not.',
    causes: ['Extra fluid volume in pregnancy', 'Pressure from the uterus slowing return flow', 'Heat or long standing', 'High salt intake'],
    relief: ['Elevate feet above hip level for 20 minutes', 'Left-side lying improves circulation', 'Reduce added salt; keep drinking water', 'Compression stockings if standing a lot'],
  },
  {
    label: 'Heartburn', keywords: ['heartburn', 'acid reflux', 'reflux', 'indigestion'],
    effect: 'Very common in the second and third trimester.',
    causes: ['Progesterone relaxing the valve at the top of the stomach', 'Uterus pressing upward on the stomach', 'Large, spicy or fatty meals', 'Lying down soon after eating'],
    relief: ['Smaller meals, more often', 'Stay upright for 1 hour after eating', 'Raise the head of your bed slightly', 'Avoid spicy, fried and citrus foods late in the day'],
  },
  {
    label: 'Cramps', keywords: ['cramp', 'cramps', 'cramping'],
    effect: 'Often linked to dehydration or low magnesium.',
    causes: ['Dehydration', 'Low magnesium or calcium', 'Extra weight on leg muscles', 'Poor circulation at night'],
    relief: ['Flex the foot upward and massage the calf', 'Drink water — dehydration is the usual trigger', 'Gentle calf stretches before bed'],
  },
  {
    label: 'Fatigue', keywords: ['tired', 'fatigue', 'exhausted', 'no energy', 'worn out'],
    effect: 'Rest is protective — persistent fatigue may mean low iron.',
    causes: ['Energy going into building the placenta and baby', 'Low iron (anaemia)', 'Broken sleep', 'Dehydration'],
    relief: ['Short 20-minute rests rather than long naps', 'Iron-rich foods with vitamin C to absorb them', 'Ask about an iron check if it persists'],
  },
  {
    label: 'Poor sleep', keywords: ['cant sleep', "can't sleep", 'insomnia', 'not sleeping', 'sleepless'],
    effect: 'Sleep debt raises stress hormones and blood pressure.',
    causes: ['Discomfort finding a position', 'Night-time bathroom trips', 'Anxiety or racing thoughts', 'Heartburn or leg cramps'],
    relief: ['Pillow between knees, left-side lying', 'Stop fluids 1 hour before bed (not earlier)', 'Wind-down routine without screens'],
  },
  {
    label: 'Constipation', keywords: ['constipation', 'constipated', 'cannot go', 'bowel'],
    effect: 'Improves with fluids and fibre.',
    causes: ['Progesterone slowing the gut', 'Iron supplements', 'Not enough fibre or fluid'],
    relief: ['More water — this matters most', 'Fibre: oats, pears, prunes, beans', 'Gentle daily walking'],
  },
  {
    label: 'Shortness of breath', keywords: ['short of breath', 'shortness of breath', 'breathless', 'cant breathe', "can't breathe", 'hard to breathe'], urgent: true,
    effect: 'Needs review — especially if sudden or at rest.',
    causes: ['Uterus pressing on the diaphragm', 'Increased oxygen demand', 'Anaemia', 'Rarely: clot or heart strain — which is why it is checked'],
    relief: ['Sit upright and slow your breathing', 'Raise your arms overhead to open the chest', 'If sudden, at rest, or with chest pain — seek urgent care now'],
  },
  {
    label: 'Blurred vision', keywords: ['blurred vision', 'blurry vision', 'seeing spots', 'vision changes', 'flashing lights'], urgent: true,
    effect: 'A recognised pre-eclampsia warning sign.',
    causes: ['Raised blood pressure / pre-eclampsia', 'Fluid changes affecting the eye', 'Low blood sugar'],
    relief: ['Have your blood pressure checked today', 'Do not drive while vision is affected', 'Contact your doctor or maternity unit now'],
  },
  {
    label: 'Severe headache', keywords: ['severe headache', 'worst headache', 'terrible headache', 'pounding headache'], urgent: true,
    effect: 'With swelling or vision changes, this needs urgent review.',
    causes: ['Raised blood pressure / pre-eclampsia', 'Severe dehydration', 'Migraine'],
    relief: ['Contact your maternity unit today for a blood pressure check', 'Rest in a dark room while you arrange it'],
  },
  {
    label: 'Bleeding', keywords: ['bleeding', 'blood', 'spotting'], urgent: true,
    effect: 'Any bleeding in pregnancy should be assessed promptly.',
    causes: ['Placental causes', 'Cervical irritation', 'Infection'],
    relief: ['Contact your maternity unit now — do not wait', 'Note how much and what colour to tell them', 'Avoid intercourse until reviewed'],
  },
  {
    label: 'Reduced movement', keywords: ['not moving', 'less movement', 'reduced movement', 'baby is quiet', 'no kicks', 'fewer kicks'], urgent: true,
    effect: 'Reduced fetal movement always warrants same-day review.',
    causes: ['Baby sleeping cycle (usually 20–40 min)', 'Your position or activity masking movement', 'Reduced placental function — which is why it is checked'],
    relief: ['Lie on your left side and count for 2 hours', 'Cold drink and a quiet room to prompt movement', 'If still reduced — call your maternity unit immediately'],
  },
  {
    label: 'Fever', keywords: ['fever', 'temperature', 'chills', 'hot and cold'], urgent: true,
    effect: 'Infection can affect both mother and baby.',
    causes: ['Infection (urine, chest, viral)', 'Dehydration'],
    relief: ['Take your temperature and note it', 'Fluids and paracetamol', 'Contact your care team the same day if above 38°C'],
  },
  {
    label: 'Abdominal pain', keywords: ['stomach pain', 'abdominal pain', 'belly pain', 'tummy pain', 'sharp pain'], urgent: true,
    effect: 'Persistent or sharp pain needs clinical assessment.',
    causes: ['Round ligament stretching (usually brief)', 'Braxton Hicks tightening', 'Urine infection', 'Rarely placental problems'],
    relief: ['Rest and change position', 'If constant, severe, or with bleeding — seek review now'],
  },
  {
    label: 'Contractions', keywords: ['contraction', 'contractions', 'tightening'], urgent: true,
    effect: 'Regular tightening before 37 weeks needs urgent review.',
    causes: ['Braxton Hicks practice contractions', 'Dehydration can trigger them', 'Preterm labour — which is why timing matters'],
    relief: ['Drink water and rest — Braxton Hicks usually settle', 'Time them: if regular and under 37 weeks, call now'],
  },
  {
    label: 'Anxiety', keywords: ['anxious', 'anxiety', 'worried', 'panic', 'stressed', 'stress'],
    effect: 'Maternal stress affects sleep, blood pressure and appetite.',
    causes: ['Normal worry about birth and baby', 'Sleep deprivation', 'Hormonal shifts', 'Life or financial pressure'],
    relief: ['Slow breathing: 4 in, 6 out, for 2 minutes', 'Name it to someone you trust today', 'Gentle movement outdoors', 'Ask your doctor about perinatal mental health support'],
  },
  {
    label: 'Low mood', keywords: ['sad', 'low mood', 'depressed', 'crying', 'tearful', 'down'],
    effect: 'Persistent low mood deserves support — please tell your doctor.',
    causes: ['Hormonal changes', 'Exhaustion', 'Isolation or lack of support', 'Antenatal depression — common and treatable'],
    relief: ['Tell your doctor — this is a routine, supported conversation', 'Daylight and gentle activity each day', 'Stay connected; do not carry it alone'],
  },
];

export const URGENT_LABELS = new Set(SYMPTOM_LEXICON.filter((s) => s.urgent).map((s) => s.label));
export const lexiconFor = (label: string) => SYMPTOM_LEXICON.find((s) => s.label === label);

export const GENERIC_ADVICE = {
  causes: ['Pregnancy-related changes in circulation, hormones or posture', 'Fatigue, dehydration or diet', 'Something unrelated to pregnancy'],
  relief: ['Rest, fluids and note when it happens', 'Track whether it worsens or eases over 24 hours', 'Mention it at your next appointment'],
};

export const COMMON_SYMPTOMS = [
  'Back ache', 'Nausea', 'Heartburn', 'Swelling', 'Fatigue', 'Headache', 'Cramps', 'Poor sleep',
];

/** Extract symptoms from a spoken sentence by keyword matching (not a medical AI). */
export function parseTranscript(raw: string): { matches: Symptom[]; unmatched: boolean } {
  const text = ` ${raw.toLowerCase().replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ')} `;
  const severe = /\b(unbearable|excruciating|worst|severe|extreme)\b/.test(text);
  const high = /\b(really bad|very bad|terrible|awful|intense|bad|strong)\b/.test(text);
  const mild = /\b(mild|slight|a bit|a little|light|slightly)\b/.test(text);
  const intensity: Intensity = severe ? 'severe' : high ? 'high' : mild ? 'mild' : 'mid';

  const seen = new Set<string>();
  const matches: Symptom[] = [];
  for (const entry of SYMPTOM_LEXICON) {
    if (seen.has(entry.label)) continue;
    if (entry.keywords.some((k) => text.includes(` ${k} `) || text.includes(`${k} `))) {
      seen.add(entry.label);
      matches.push({
        id: `${entry.label}-${Date.now()}-${matches.length}`,
        name: entry.label,
        intensity: entry.urgent && intensity === 'mild' ? 'mid' : intensity,
        daysPresent: 1,
        confirmedToday: true,
        fromVoice: true,
      });
    }
  }
  return { matches, unmatched: matches.length === 0 && raw.trim().length > 0 };
}

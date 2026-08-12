export type LifeStage = 'planning' | 'pregnant' | 'new-mother' | 'parent';

export type DiagramKind = 'side-sleep' | 'iron' | 'glucose' | 'latch' | 'tummy-time' | 'cycle' | 'generic';

export interface Article {
  id: string;
  title: string;
  readMins: number;
  hook: string;
  diagram: DiagramKind;
  why: string;
  steps: { label: string; detail: string }[];
  caution?: string;
}

export interface NewsItem {
  id: string;
  category: string;
  title: string;
  summary: string;
  source: string;
  ago: string;
  /** question-and-answer pieces read differently to habit/behaviour pieces */
  kind: 'qa' | 'habit' | 'research' | 'guidance';
}

/* ------------------------------------------------------------------ reading */

const PREGNANT: Article[] = [
  {
    id: 'a-sleep', title: 'Sleeping safely in the third trimester', readMins: 3, diagram: 'side-sleep',
    hook: 'From 28 weeks, the position you fall asleep in matters more than any other habit you can change tonight.',
    why: 'Lying flat on your back lets the weight of the uterus press on the vena cava, the large vein returning blood to your heart. That reduces blood flow to the placenta. Large studies link going to sleep on your back after 28 weeks with a higher stillbirth risk — and it is one of the few risks you can change for free, tonight.',
    steps: [
      { label: 'Either side is fine', detail: 'Left is often quoted, but research shows left or right both work. What matters is not flat on your back.' },
      { label: 'Pillow between the knees', detail: 'Keeps the hips stacked and takes the pull off your lower back.' },
      { label: 'Pillow under the bump', detail: 'A small one supports the weight so your abdomen is not dragging downward.' },
      { label: 'Waking on your back is fine', detail: 'You have not done harm. Simply settle back onto your side. It is the position you fall asleep in that counts.' },
    ],
    caution: 'If you cannot get comfortable on your side at all, or you wake breathless, mention it at your next appointment.',
  },
  {
    id: 'a-iron', title: 'Iron, and why it peaks from here', readMins: 4, diagram: 'iron',
    hook: 'Your baby stockpiles enough iron in the final weeks to last their first six months of life.',
    why: 'Blood volume rises by almost half during pregnancy, so the same iron is spread thinner. At the same time your baby is drawing iron across the placenta to build their own stores. Low iron is easy to miss because the symptoms — tiredness, breathlessness, feeling cold — look like ordinary pregnancy.',
    steps: [
      { label: 'Pair iron with vitamin C', detail: 'Orange juice, tomato, or peppers alongside the tablet can multiply absorption several times over.' },
      { label: 'Keep tea and coffee apart from it', detail: 'Tannins bind iron. Leave an hour either side of the tablet.' },
      { label: 'Take it at the time you tolerate', detail: 'If it makes you queasy in the morning, night works just as well.' },
      { label: 'Ask for a check', detail: 'A haemoglobin test at your next visit tells you far more than guessing from symptoms.' },
    ],
    caution: 'Never start or double an iron supplement on your own — too much iron has its own risks.',
  },
  {
    id: 'a-glucose', title: 'Understanding your glucose screening', readMins: 3, diagram: 'glucose',
    hook: 'It is offered between 24 and 28 weeks, and a raised result is common, manageable and not your fault.',
    why: 'Pregnancy hormones make your body less responsive to insulin so more sugar reaches the baby. For most people the pancreas compensates. When it cannot, blood sugar rises — gestational diabetes. Untreated it can grow the baby larger than is safe for birth, so it is screened for routinely.',
    steps: [
      { label: 'Follow the fasting instructions', detail: 'If your clinic asks you to fast, do it — eating skews the result and you may need to repeat it.' },
      { label: 'Expect a sweet drink and a wait', detail: 'Blood is taken, you drink glucose, then blood is taken again after an hour or two.' },
      { label: 'Bring something to do', detail: 'You cannot eat or walk far during the wait.' },
      { label: 'A positive result is manageable', detail: 'Most people control it with diet and monitoring alone.' },
    ],
  },
];

const NEW_MOTHER: Article[] = [
  {
    id: 'b-latch', title: 'What a good latch actually looks like', readMins: 4, diagram: 'latch',
    hook: 'Feeding should feel like tugging, not pinching. Pain is information, not something to push through.',
    why: 'A shallow latch means baby is drawing on the nipple rather than the breast tissue behind it. That hurts you and empties the breast poorly, which lowers supply. A deep latch fixes both at once.',
    steps: [
      { label: 'Nose to nipple', detail: 'Line baby up so they tip their head back and lead with the chin, not the nose.' },
      { label: 'Wait for a wide mouth', detail: 'Bring baby to you at the moment the mouth is widest, like a yawn.' },
      { label: 'Chin buried, nose clear', detail: 'More areola visible above the top lip than below the bottom one.' },
      { label: 'Listen for swallowing', detail: 'A rhythmic suck-swallow-pause beats fast fluttery sucking.' },
    ],
    caution: 'Cracked or bleeding nipples are not a normal stage. Ask for a feeding assessment.',
  },
  {
    id: 'b-tummy', title: 'Tummy time without the tears', readMins: 3, diagram: 'tummy-time',
    hook: 'Start from the first week — a minute at a time counts, and your chest is a valid surface.',
    why: 'Time on the front builds the neck, shoulder and trunk strength needed to roll, sit and crawl, and it takes pressure off the back of the skull. Babies who protest usually need shorter, more frequent sessions rather than none.',
    steps: [
      { label: 'Chest-to-chest first', detail: 'Lie back and put baby on your chest. It is tummy time and it is easier for them.' },
      { label: 'Little and often', detail: 'Three to five short sessions a day beats one long unhappy one.' },
      { label: 'Get down to their level', detail: 'Your face is the most motivating thing in the room.' },
      { label: 'Pick their good hour', detail: 'After a nap and a nappy change, not when hungry or overtired.' },
    ],
  },
];

const PLANNING: Article[] = [
  {
    id: 'c-cycle', title: 'Finding your fertile window', readMins: 4, diagram: 'cycle',
    hook: 'There are only about six days each cycle when conception is possible — and they end on ovulation day.',
    why: 'An egg survives around 24 hours, but sperm can survive up to five days in fertile cervical mucus. That makes the days *before* ovulation more useful than the day after it.',
    steps: [
      { label: 'Track cycle length first', detail: 'Two or three cycles gives you a usable average before you predict anything.' },
      { label: 'Watch cervical mucus', detail: 'Clear and stretchy, like raw egg white, signals the fertile days.' },
      { label: 'Aim for every other day', detail: 'Across the fertile window this performs as well as daily and is far less pressure.' },
      { label: 'Start folic acid now', detail: 'It protects the neural tube, which closes before most people know they are pregnant.' },
    ],
  },
];

const PARENT: Article[] = [
  {
    id: 'd-sleep', title: 'Sleep needs from one to five years', readMins: 3, diagram: 'generic',
    hook: 'Most toddler bedtime battles are a schedule problem, not a behaviour problem.',
    why: 'An overtired child produces more cortisol, which makes falling asleep harder — the opposite of what tiredness suggests. Matching the nap and bedtime to actual sleep need usually settles it faster than any technique.',
    steps: [
      { label: '1–2 years: 11–14 hours', detail: 'Usually one afternoon nap.' },
      { label: '3–5 years: 10–13 hours', detail: 'Naps drop away for most children in this window.' },
      { label: 'Watch the wake window', detail: 'Overtired looks like wired, not sleepy.' },
      { label: 'Same order every night', detail: 'Predictable sequence matters more than exact timing.' },
    ],
  },
];

export function readingFor(stage: LifeStage, week: number): { heading: string; sub: string; items: Article[] } {
  switch (stage) {
    case 'new-mother':
      return { heading: `Reading for baby week ${week}`, sub: 'Written for these first weeks', items: NEW_MOTHER };
    case 'planning':
      return { heading: 'Reading for planning', sub: 'Before you start trying', items: PLANNING };
    case 'parent':
      return { heading: 'Reading for early childhood', sub: 'Toddler years', items: PARENT };
    default:
      return { heading: `Reading for week ${week}`, sub: 'Matched to where you are now', items: PREGNANT };
  }
}

/* --------------------------------------------------------------------- news */

const NEWS: Record<LifeStage, NewsItem[]> = {
  pregnant: [
    { id: 'n1', kind: 'guidance', category: 'Guidelines', ago: '2h', source: 'WHO Maternal Health',
      title: 'Updated guidance: side-sleeping advice extended to 26 weeks',
      summary: 'Advice previously given from 28 weeks now begins two weeks earlier, following pooled data from three cohort studies.' },
    { id: 'n2', kind: 'qa', category: 'Q&A', ago: '6h', source: 'Ask a midwife',
      title: '“Is it safe to keep exercising in the third trimester?”',
      summary: 'Yes for most people — the marker is being able to hold a conversation. Contact sports and lying flat are the exceptions.' },
    { id: 'n3', kind: 'habit', category: 'Habits', ago: '1d', source: 'MaternalCare+ Research',
      title: 'Mothers who log symptoms daily reach their care team 3 days sooner',
      summary: 'Analysis of anonymised logs suggests consistent tracking shortens the gap between a symptom appearing and being reviewed.' },
    { id: 'n4', kind: 'research', category: 'Research', ago: '2d', source: 'The Lancet',
      title: 'Hydration linked to amniotic fluid volume in third trimester',
      summary: 'A observational study of 1,400 pregnancies found measurable differences in fluid index across hydration quartiles.' },
    { id: 'n5', kind: 'guidance', category: 'Vaccines', ago: '3d', source: 'National Immunisation',
      title: 'Whooping cough vaccine window widened to weeks 16–32',
      summary: 'Earlier vaccination gives more time for antibodies to cross the placenta before birth.' },
  ],
  'new-mother': [
    { id: 'm1', kind: 'guidance', category: 'Safe sleep', ago: '4h', source: 'Lullaby Trust',
      title: 'Room-sharing guidance reaffirmed for the first six months',
      summary: 'Baby in their own cot, in your room, remains the recommendation for day and night sleep.' },
    { id: 'm2', kind: 'qa', category: 'Q&A', ago: '1d', source: 'Ask a midwife',
      title: '“How do I know my baby is getting enough milk?”',
      summary: 'Nappy output, weight trend and alertness tell you more than time spent at the breast.' },
    { id: 'm3', kind: 'habit', category: 'Recovery', ago: '2d', source: 'MaternalCare+ Research',
      title: 'Short daily walks shorten postnatal recovery time',
      summary: 'Ten minutes outdoors most days was associated with better mood scores at the six-week check.' },
  ],
  planning: [
    { id: 'p1', kind: 'guidance', category: 'Preconception', ago: '5h', source: 'Public Health',
      title: 'Folic acid recommended three months before conception',
      summary: 'Earlier start than previously advised, to ensure stores are adequate when the neural tube closes.' },
    { id: 'p2', kind: 'qa', category: 'Q&A', ago: '2d', source: 'Ask a fertility nurse',
      title: '“How long is normal before seeking help?”',
      summary: 'Twelve months under 35, six months over 35 — sooner if cycles are irregular.' },
    { id: 'p3', kind: 'habit', category: 'Habits', ago: '4d', source: 'MaternalCare+ Research',
      title: 'Sleep regularity is emerging as a fertility factor',
      summary: 'Consistent sleep and wake times correlate with more regular ovulation in early findings.' },
  ],
  parent: [
    { id: 'k1', kind: 'guidance', category: 'Immunisation', ago: '8h', source: 'National Immunisation',
      title: 'Preschool booster reminder window opens',
      summary: 'The 3-years-4-months booster is due — clinics are reporting a backlog, so book early.' },
    { id: 'k2', kind: 'qa', category: 'Q&A', ago: '1d', source: 'Ask a paediatric nurse',
      title: '“When should I worry about a fever?”',
      summary: 'Age matters more than the number. Under three months, any fever needs same-day review.' },
    { id: 'k3', kind: 'habit', category: 'Development', ago: '3d', source: 'MaternalCare+ Research',
      title: 'Shared reading at bedtime linked to larger vocabulary at four',
      summary: 'Even ten minutes nightly showed measurable differences against matched controls.' },
  ],
};

export const newsFor = (stage: LifeStage) => NEWS[stage];

export const KIND_TINT: Record<NewsItem['kind'], string> = {
  qa: '#8b7bf3', habit: '#2fbf9b', research: '#3f66f0', guidance: '#fb7534',
};

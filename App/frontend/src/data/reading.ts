export type LifeStage = 'planning' | 'pregnant' | 'new-mother' | 'parent';

export type DiagramKind =
  | 'side-sleep' | 'iron' | 'glucose' | 'latch' | 'tummy-time' | 'cycle'
  | 'nausea' | 'scan' | 'movements' | 'generic';

export interface Article {
  id: string;
  title: string;
  readMins: number;
  hook: string;
  diagram: DiagramKind;
  why: string;
  steps: { label: string; detail: string }[];
  caution?: string;
  /**
   * The gestational weeks this is written for, inclusive. Omitted on articles
   * that hold at any point in the stage — those always stay in the list.
   */
  weeks?: [number, number];
  /** Shown on the card when the week is what put it there. */
  timing?: string;
}

/** Picks the generated thumbnail drawn beside each headline. */
export type NewsImage =
  | 'sleep' | 'nutrition' | 'bp' | 'vaccine' | 'movement' | 'mind' | 'exercise'
  | 'screening' | 'hydration' | 'feeding' | 'recovery' | 'fertility' | 'clinic' | 'child';

/** Personal circumstances a story can be matched against. */
export type NewsFlag = 'rh-negative' | 'older-mother' | 'low-hydration';

export interface NewsItem {
  id: string;
  category: string;
  title: string;
  summary: string;
  source: string;
  ago: string;
  /** question-and-answer pieces read differently to habit/behaviour pieces */
  kind: 'qa' | 'habit' | 'research' | 'guidance';
  /** opens in a new tab when the story is clicked */
  url: string;
  image: NewsImage;
  /** what makes this story relevant to a particular mother */
  match?: {
    /** symptom labels from the logger, matched case-insensitively */
    symptoms?: string[];
    flags?: NewsFlag[];
    /** inclusive week range this is worth reading in */
    weeks?: [number, number];
  };
}

/* ------------------------------------------------------------------ reading */

const PREGNANT: Article[] = [
  {
    id: 'a-nausea', title: 'Sickness that will not wait for morning', readMins: 3, diagram: 'nausea',
    weeks: [4, 16], timing: 'Usually eases by 14 weeks',
    hook: 'It peaks around week 9 and is the one symptom that reliably improves on its own.',
    why: 'Nausea tracks the hormone hCG, which rises steeply in the first weeks and then falls away — which is why most people turn a corner somewhere between weeks 12 and 16. It is unpleasant rather than dangerous, and it is not a sign anything is wrong. What matters is keeping fluids down.',
    steps: [
      { label: 'Eat before you get up', detail: 'Keep dry crackers by the bed. An empty stomach makes it worse, and the dip is deepest overnight.' },
      { label: 'Small and often beats three meals', detail: 'Something every two hours, even a few bites, keeps blood sugar from swinging.' },
      { label: 'Sip, do not gulp', detail: 'Large drinks fill the stomach and come back. Small mouthfuls through the day add up to more.' },
      { label: 'Ginger genuinely helps some people', detail: 'Tea, biscuits or capsules — worth trying before anything stronger.' },
    ],
    caution: 'If you cannot keep fluids down for a day, are losing weight, or your urine is dark and scant, that is hyperemesis and it needs treating — go to your clinic rather than waiting it out.',
  },
  {
    id: 'a-scan', title: 'What the dating scan actually checks', readMins: 3, diagram: 'scan',
    weeks: [8, 16], timing: 'Offered at 11–14 weeks',
    hook: 'It is the measurement that fixes your due date — and every date after it is counted from this one.',
    why: 'Cycle length varies, so the date worked out from your last period can be off by a week or more. The scan measures the baby crown to rump, which is remarkably consistent between pregnancies at this stage, and the due date is reset to that. It also confirms how many babies there are and where the placenta has settled.',
    steps: [
      { label: 'Come with a full bladder', detail: 'It lifts the uterus into view. Your clinic will say how much to drink and when.' },
      { label: 'Expect the date to move', detail: 'A shift of a few days either way is normal and is not a sign of a problem.' },
      { label: 'Nuchal translucency is optional', detail: 'A screening measurement at the back of the neck, usually offered alongside a blood test. You can decline it.' },
      { label: 'Ask for the report, not just the photo', detail: 'The measurements go in your notes and are what later scans are compared against.' },
    ],
  },
  {
    id: 'a-movements', title: 'Counting movements, and what actually matters', readMins: 3, diagram: 'movements',
    weeks: [24, 42], timing: 'From 24 weeks',
    hook: 'There is no magic number. What matters is your baby’s own pattern, and a change to it.',
    why: 'Advice used to be "ten kicks a day", and it was dropped because it is not what the evidence supports. Babies establish an individual rhythm by around 24 to 28 weeks. A reduction in that rhythm can be the earliest sign the placenta is not working as well as it should, which is why it is the one thing worth calling about the same day.',
    steps: [
      { label: 'Learn the pattern, not a target', detail: 'Notice when your baby is usually busy. For most people it is evening and after meals.' },
      { label: 'Lie on your side to check', detail: 'If you are unsure, lie down on your left and focus for a while. Movements are easier to feel than to see.' },
      { label: 'Do not use cold drinks or sugar to provoke a kick', detail: 'It does not reliably work, and it delays the call that does.' },
      { label: 'Call the same day, every time', detail: 'Never wait until morning, and never feel it is a fuss. Repeated checks are expected and welcomed.' },
    ],
    caution: 'Reduced movement is always worth a same-day call to your maternity unit — no matter how many times you have already rung.',
  },
  {
    id: 'a-sleep', title: 'Sleeping safely in the third trimester', readMins: 3, diagram: 'side-sleep',
    weeks: [26, 42], timing: 'From 28 weeks',
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
    weeks: [16, 42], timing: 'Second half',
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
    weeks: [22, 30], timing: 'Offered at 24–28 weeks',
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

/** How far outside its window an article sits, in weeks. 0 = in range. */
function weeksAway(article: Article, week: number): number {
  if (!article.weeks) return 0;
  const [from, to] = article.weeks;
  if (week < from) return from - week;
  if (week > to) return week - to;
  return 0;
}

/**
 * The reading list for where she actually is.
 *
 * This used to take `week` and spend it only on the heading — the article
 * list was the same constant at week 6 and week 40, under a title promising
 * otherwise. Now the week selects: articles written for this week come first,
 * ordered by how squarely they land on it.
 *
 * Nothing in range is not an empty screen. The nearest articles are shown
 * instead, so the very first weeks — before anything is really due — still
 * have something to read.
 */
export function readingFor(stage: LifeStage, week: number): { heading: string; sub: string; items: Article[] } {
  if (stage === 'planning') {
    return { heading: 'Reading for planning', sub: 'Before you start trying', items: PLANNING };
  }
  if (stage === 'parent') {
    return { heading: 'Reading for early childhood', sub: 'Toddler years', items: PARENT };
  }
  if (stage === 'new-mother') {
    return { heading: `Reading for baby week ${week}`, sub: 'Written for these first weeks', items: NEW_MOTHER };
  }

  const ranked = PREGNANT
    .map((article, order) => ({ article, away: weeksAway(article, week), order }))
    .sort((a, b) => a.away - b.away || a.order - b.order);

  const inRange = ranked.filter((r) => r.away === 0);
  const chosen = inRange.length > 0 ? inRange : ranked.slice(0, 2);

  return {
    heading: `Reading for week ${week}`,
    sub: inRange.length > 0
      ? 'Written for the week you are in'
      : 'Nothing is due yet — here is what comes first',
    items: chosen.map((r) => r.article),
  };
}

/* --------------------------------------------------------------------- news */

const NEWS: Record<LifeStage, NewsItem[]> = {
  pregnant: [
    { id: 'n-sleep', kind: 'guidance', category: 'Safer sleep', ago: '2h', source: 'Tommy’s', image: 'sleep',
      url: 'https://www.tommys.org/pregnancy-information',
      title: 'Side-sleeping from 28 weeks: what the evidence now says',
      summary: 'Left or right both work — what matters is the position you fall asleep in, not the one you wake in.',
      match: { symptoms: ['Poor sleep', 'Back ache'], weeks: [24, 42] } },
    { id: 'n-bp', kind: 'guidance', category: 'Blood pressure', ago: '5h', source: 'NICE Guidance', image: 'bp',
      url: 'https://www.nice.org.uk/guidance/ng133',
      title: 'Why blood pressure is checked at every visit after week 24',
      summary: 'Rising readings are the earliest measurable sign of pre-eclampsia, often weeks before symptoms appear.',
      match: { symptoms: ['Headache', 'Severe headache', 'Swelling', 'Blurred vision'], weeks: [20, 42] } },
    { id: 'n-preeclampsia', kind: 'guidance', category: 'Pre-eclampsia', ago: '9h', source: 'NHS', image: 'bp',
      url: 'https://www.nhs.uk/conditions/pre-eclampsia/',
      title: 'Three symptoms that should never wait until morning',
      summary: 'A severe headache, vision changes, or sudden swelling of the face and hands together need same-day review.',
      match: { symptoms: ['Severe headache', 'Blurred vision', 'Swelling'], weeks: [20, 42] } },
    { id: 'n-iron', kind: 'habit', category: 'Nutrition', ago: '1d', source: 'NHS', image: 'nutrition',
      url: 'https://www.nhs.uk/conditions/iron-deficiency-anaemia/',
      title: 'Vitamin C alongside iron: the timing that changes absorption',
      summary: 'Tannins in tea and coffee bind iron. An hour either side of the tablet, with juice, does far more than the dose itself.',
      match: { symptoms: ['Fatigue', 'Dizziness', 'Shortness of breath'] } },
    { id: 'n-heartburn', kind: 'qa', category: 'Q&A', ago: '1d', source: 'Ask your doctor', image: 'nutrition',
      url: 'https://www.nhs.uk/conditions/heartburn-and-acid-reflux/',
      title: '“Heartburn every night — is anything safe to take?”',
      summary: 'Smaller evening meals and raising the head of the bed come first; some antacids are fine, but check the brand.',
      match: { symptoms: ['Heartburn', 'Nausea', 'Vomiting'] } },
    { id: 'n-movement', kind: 'guidance', category: 'Movement', ago: '1d', source: 'Tommy’s', image: 'movement',
      url: 'https://www.tommys.org/pregnancy-information',
      title: 'Movement patterns, not kick counts, are the signal to watch',
      summary: 'There is no magic number. A change from your baby’s own usual pattern is what needs a call the same day.',
      match: { symptoms: ['Reduced movement'], weeks: [24, 42] } },
    { id: 'n-glucose', kind: 'research', category: 'Screening', ago: '2d', source: 'Diabetes Research', image: 'screening',
      url: 'https://www.nhs.uk/conditions/gestational-diabetes/',
      title: 'Screening at 24 weeks picks up more cases than at 28',
      summary: 'Earlier testing gave four extra weeks of dietary management in a cohort of 2,100 pregnancies.',
      match: { weeks: [20, 30] } },
    { id: 'n-whooping', kind: 'guidance', category: 'Vaccines', ago: '2d', source: 'National Immunisation', image: 'vaccine',
      url: 'https://www.nhs.uk/conditions/whooping-cough/',
      title: 'Whooping cough vaccine window widened to weeks 16–32',
      summary: 'Earlier vaccination gives antibodies more time to cross the placenta before birth.',
      match: { weeks: [16, 32] } },
    { id: 'n-rh', kind: 'guidance', category: 'Blood type', ago: '3d', source: 'NHS', image: 'clinic',
      url: 'https://www.nhs.uk/conditions/rhesus-disease/',
      title: 'Anti-D at 28 weeks: what Rh negative mothers need to know',
      summary: 'One routine injection prevents your immune system reacting to a Rh positive baby in this or a later pregnancy.',
      match: { flags: ['rh-negative'], weeks: [20, 36] } },
    { id: 'n-exercise', kind: 'qa', category: 'Q&A', ago: '3d', source: 'Ask a physiotherapist', image: 'exercise',
      url: 'https://www.nhs.uk/live-well/exercise/',
      title: '“Can I keep exercising in the third trimester?”',
      summary: 'For most people yes — the marker is being able to hold a conversation. Contact sports and lying flat are the exceptions.',
      match: { symptoms: ['Back ache', 'Cramps', 'Constipation'], weeks: [12, 42] } },
    { id: 'n-hydration', kind: 'research', category: 'Research', ago: '4d', source: 'Maternal Medicine Review', image: 'hydration',
      url: 'https://www.who.int/health-topics/maternal-health',
      title: 'Hydration linked to amniotic fluid volume in the third trimester',
      summary: 'An observational study of 1,400 pregnancies found measurable differences in fluid index across hydration quartiles.',
      match: { flags: ['low-hydration'], symptoms: ['Headache', 'Cramps', 'Dizziness'], weeks: [26, 42] } },
    { id: 'n-mind', kind: 'guidance', category: 'Mental health', ago: '4d', source: 'Perinatal Mental Health', image: 'mind',
      url: 'https://www.nhs.uk/mental-health/',
      title: 'Antenatal anxiety is as common as postnatal — and as treatable',
      summary: 'Roughly one in ten mothers meets the threshold before birth. Talking therapies are offered on the same pathway.',
      match: { symptoms: ['Anxiety', 'Low mood', 'Poor sleep'] } },
    { id: 'n-constipation', kind: 'habit', category: 'Digestion', ago: '5d', source: 'NHS', image: 'nutrition',
      url: 'https://www.nhs.uk/conditions/constipation/',
      title: 'Untangling constipation from your iron tablets',
      summary: 'Fibre without extra fluid makes it worse. The order you change things in matters more than any one change.',
      match: { symptoms: ['Constipation', 'Abdominal pain'] } },
    { id: 'n-birth', kind: 'guidance', category: 'Birth prep', ago: '6d', source: 'NHS', image: 'clinic',
      url: 'https://www.nhs.uk/pregnancy/labour-and-birth/',
      title: 'Writing a birth plan that survives contact with labour',
      summary: 'Preferences ranked rather than listed, so your team knows what to protect when circumstances change.',
      match: { weeks: [28, 42] } },
    { id: 'n-age', kind: 'research', category: 'Research', ago: '1w', source: 'ACOG', image: 'clinic',
      url: 'https://www.acog.org/womens-health',
      title: 'Care pathways updated for mothers over 35',
      summary: 'Additional growth scans in the third trimester, with earlier discussion of timing of birth.',
      match: { flags: ['older-mother'] } },
  ],

  'new-mother': [
    { id: 'm-sleep', kind: 'guidance', category: 'Safe sleep', ago: '4h', source: 'Lullaby Trust', image: 'sleep',
      url: 'https://www.lullabytrust.org.uk/safer-sleep-advice/',
      title: 'Room-sharing reaffirmed for the first six months',
      summary: 'Baby in their own cot, in your room, remains the recommendation for day and night sleep.',
      match: { symptoms: ['Poor sleep', 'Fatigue'] } },
    { id: 'm-feed', kind: 'qa', category: 'Q&A', ago: '1d', source: 'Ask your doctor', image: 'feeding',
      url: 'https://www.nhs.uk/conditions/baby/breastfeeding-and-bottle-feeding/',
      title: '“How do I know my baby is getting enough milk?”',
      summary: 'Nappy output, weight trend and alertness tell you far more than time spent at the breast.' },
    { id: 'm-mood', kind: 'guidance', category: 'Mental health', ago: '1d', source: 'NHS', image: 'mind',
      url: 'https://www.nhs.uk/mental-health/',
      title: 'Low mood after two weeks is not the baby blues',
      summary: 'Postnatal depression affects around one in ten mothers and responds well to early treatment.',
      match: { symptoms: ['Low mood', 'Anxiety', 'Fatigue'] } },
    { id: 'm-recovery', kind: 'habit', category: 'Recovery', ago: '2d', source: 'Maternal Medicine Review', image: 'recovery',
      url: 'https://www.nhs.uk/live-well/exercise/',
      title: 'Short daily walks shorten postnatal recovery time',
      summary: 'Ten minutes outdoors most days was associated with better mood scores at the six-week check.',
      match: { symptoms: ['Fatigue', 'Back ache'] } },
    { id: 'm-jaundice', kind: 'guidance', category: 'Newborn', ago: '3d', source: 'NHS', image: 'clinic',
      url: 'https://www.nhs.uk/conditions/jaundice-newborn/',
      title: 'Newborn jaundice: when yellow needs a phone call',
      summary: 'Common and usually harmless in the first week — but appearing in the first 24 hours is always urgent.' },
    { id: 'm-colic', kind: 'qa', category: 'Q&A', ago: '4d', source: 'Ask a health visitor', image: 'child',
      url: 'https://www.nhs.uk/conditions/colic/',
      title: '“Why does my baby cry every evening?”',
      summary: 'Evening clustering peaks around six weeks and eases by four months. It is not a feeding failure.' },
    { id: 'm-vax', kind: 'guidance', category: 'Immunisation', ago: '5d', source: 'National Immunisation', image: 'vaccine',
      url: 'https://www.nhs.uk/conditions/vaccinations/',
      title: 'The eight-week immunisations, explained before you go',
      summary: 'Three injections in one visit. Knowing the order and the aftercare makes the appointment much easier.' },
    { id: 'm-check', kind: 'guidance', category: 'Your health', ago: '1w', source: 'NHS', image: 'bp',
      url: 'https://www.nhs.uk/conditions/baby/',
      title: 'The six-week check is for you as well as the baby',
      summary: 'Blood pressure, healing, contraception and mood are all on the list — bring your own questions.' },
  ],

  planning: [
    { id: 'p-folic', kind: 'guidance', category: 'Preconception', ago: '5h', source: 'Public Health', image: 'nutrition',
      url: 'https://www.nhs.uk/conditions/vitamins-and-minerals/vitamin-b/',
      title: 'Folic acid recommended three months before conception',
      summary: 'The neural tube closes before most people know they are pregnant, so stores need to be adequate already.' },
    { id: 'p-help', kind: 'qa', category: 'Q&A', ago: '1d', source: 'Ask a fertility nurse', image: 'clinic',
      url: 'https://www.nhs.uk/conditions/infertility/',
      title: '“How long is normal before seeking help?”',
      summary: 'Twelve months under 35, six months over 35 — sooner if your cycles are irregular.' },
    { id: 'p-cycle', kind: 'research', category: 'Cycles', ago: '2d', source: 'Maternal Medicine Review', image: 'fertility',
      url: 'https://www.nhs.uk/pregnancy/trying-for-a-baby/',
      title: 'Cervical mucus outperformed app predictions in a 900-cycle study',
      summary: 'Calendar-based apps misplaced the fertile window in a third of cycles longer or shorter than average.' },
    { id: 'p-sleep', kind: 'habit', category: 'Habits', ago: '3d', source: 'Maternal Medicine Review', image: 'sleep',
      url: 'https://www.nhs.uk/live-well/sleep-and-tiredness/',
      title: 'Sleep regularity is emerging as a fertility factor',
      summary: 'Consistent sleep and wake times correlate with more regular ovulation in early findings.',
      match: { symptoms: ['Poor sleep', 'Fatigue'] } },
    { id: 'p-rubella', kind: 'guidance', category: 'Immunisation', ago: '4d', source: 'National Immunisation', image: 'vaccine',
      url: 'https://www.nhs.uk/conditions/vaccinations/',
      title: 'Check your rubella immunity before you start trying',
      summary: 'The MMR vaccine cannot be given in pregnancy, so the gap has to be closed beforehand.' },
    { id: 'p-weight', kind: 'guidance', category: 'Health', ago: '5d', source: 'NHS', image: 'recovery',
      url: 'https://www.nhs.uk/live-well/healthy-weight/',
      title: 'Why weight is discussed at the preconception appointment',
      summary: 'It affects ovulation, medication doses and screening accuracy — not a judgement, a set of adjustments.' },
    { id: 'p-alcohol', kind: 'habit', category: 'Habits', ago: '1w', source: 'NHS', image: 'nutrition',
      url: 'https://www.nhs.uk/live-well/alcohol-advice/',
      title: 'Caffeine and alcohol in the trying-to-conceive window',
      summary: 'Guidance applies from the point you start trying, because the first weeks pass before a test turns positive.' },
  ],

  parent: [
    { id: 'k-booster', kind: 'guidance', category: 'Immunisation', ago: '8h', source: 'National Immunisation', image: 'vaccine',
      url: 'https://www.nhs.uk/conditions/vaccinations/',
      title: 'Preschool booster reminder window opens',
      summary: 'The 3-years-4-months booster is due — clinics are reporting a backlog, so book early.' },
    { id: 'k-fever', kind: 'qa', category: 'Q&A', ago: '1d', source: 'Ask a paediatric nurse', image: 'clinic',
      url: 'https://www.nhs.uk/conditions/fever-in-children/',
      title: '“When should I worry about a fever?”',
      summary: 'Age matters more than the number. Under three months, any fever needs same-day review.',
      match: { symptoms: ['Fever'] } },
    { id: 'k-sleep', kind: 'guidance', category: 'Sleep', ago: '2d', source: 'NHS', image: 'sleep',
      url: 'https://www.nhs.uk/live-well/sleep-and-tiredness/',
      title: 'Most bedtime battles are a schedule problem, not behaviour',
      summary: 'An overtired child produces more cortisol, which makes falling asleep harder — the opposite of what tiredness suggests.',
      match: { symptoms: ['Poor sleep', 'Fatigue'] } },
    { id: 'k-reading', kind: 'habit', category: 'Development', ago: '3d', source: 'Maternal Medicine Review', image: 'child',
      url: 'https://www.nhs.uk/conditions/baby/babys-development/',
      title: 'Shared reading at bedtime linked to larger vocabulary at four',
      summary: 'Even ten minutes nightly showed measurable differences against matched controls.' },
    { id: 'k-food', kind: 'habit', category: 'Feeding', ago: '4d', source: 'NHS', image: 'nutrition',
      url: 'https://www.nhs.uk/conditions/baby/',
      title: 'Fussy eating peaks at two and is usually a phase',
      summary: 'Repeated neutral exposure beats persuasion. Counting intake across a week, not a meal, is more useful.' },
    { id: 'k-screen', kind: 'research', category: 'Research', ago: '5d', source: 'Maternal Medicine Review', image: 'mind',
      url: 'https://www.nhs.uk/conditions/baby/babys-development/',
      title: 'Screen time findings depend on what it replaces',
      summary: 'Displaced conversation, not the screen itself, accounted for most of the language difference.' },
    { id: 'k-teeth', kind: 'guidance', category: 'Dental', ago: '1w', source: 'NHS', image: 'clinic',
      url: 'https://www.nhs.uk/live-well/dental-health/',
      title: 'First dental visit is due by the first birthday',
      summary: 'Earlier than most parents expect, and free — it is about habits and fluoride advice, not treatment.' },
  ],
};

/** What we know about the mother, used to rank the feed. */
export interface NewsContext {
  /** symptom labels currently in her journal */
  symptoms?: string[];
  week?: number;
  age?: number;
  bloodGroup?: string;
  /** true when today's water intake is below target */
  lowHydration?: boolean;
}

export interface RankedNews extends NewsItem {
  /** why this surfaced — shown on the card when it is a personal match */
  reason?: string;
}

const lower = (s: string) => s.trim().toLowerCase();

/**
 * Ranks the stage's stories against what this mother has actually logged, so
 * the feed leads with what applies to her rather than a fixed editorial order.
 * Everything still appears — matching only changes the order and adds a reason.
 */
export function newsFor(stage: LifeStage, ctx: NewsContext = {}): RankedNews[] {
  const logged = new Set((ctx.symptoms ?? []).map(lower));
  const flags = new Set<NewsFlag>();
  if (ctx.bloodGroup?.trim().endsWith('-')) flags.add('rh-negative');
  if ((ctx.age ?? 0) >= 35) flags.add('older-mother');
  if (ctx.lowHydration) flags.add('low-hydration');

  return NEWS[stage]
    .map((item, order) => {
      const m = item.match;
      let score = 0;
      let reason: string | undefined;

      const hits = (m?.symptoms ?? []).filter((s) => logged.has(lower(s)));
      if (hits.length) {
        score += 6 * hits.length;
        reason = `You logged ${hits.slice(0, 2).map(lower).join(' and ')}`;
      }

      const flagHit = (m?.flags ?? []).find((f) => flags.has(f));
      if (flagHit) {
        score += 5;
        if (!reason) {
          reason = flagHit === 'rh-negative' ? `You are ${ctx.bloodGroup} — Rh negative`
            : flagHit === 'older-mother' ? 'Guidance for mothers over 35'
            : 'Your water intake is below target';
        }
      }

      // written for a condition she does not have — keep it available, but never
      // let a week match float it above stories that do apply to her
      const misapplied = Boolean(m?.flags?.length) && !flagHit && !hits.length;
      if (misapplied) score -= 4;

      if (!misapplied && m?.weeks && ctx.week && ctx.week >= m.weeks[0] && ctx.week <= m.weeks[1]) {
        score += 3;
        if (!reason) reason = `Relevant at week ${ctx.week}`;
      }

      return { item: { ...item, reason }, score, order };
    })
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((r) => r.item);
}

export const KIND_TINT: Record<NewsItem['kind'], string> = {
  qa: '#8b7bf3', habit: '#2fbf9b', research: '#3f66f0', guidance: '#fb7534',
};

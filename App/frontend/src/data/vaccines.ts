import type { LifeStage } from '@/data/reading';

/**
 * The vaccines commonly recommended at each stage, and when they are given.
 *
 * This is a reference list, not a prescription. Every entry states a window
 * rather than a date, and the interface says plainly that a clinician confirms
 * it — schedules differ by country, by history and by the individual, and an
 * app that presented these as instructions would be overstepping.
 *
 * The content follows the Bangladesh EPI schedule for children and the
 * standard maternal immunisation guidance the seed data already uses (TT, Tdap,
 * influenza), so the catalogue and the records agree with each other.
 */

/** Where the timing bar is measured from — each stage counts time differently. */
export type Axis = 'pregnancy-weeks' | 'before-conception-months' | 'after-birth-weeks' | 'child-months';

export const AXIS: Record<Axis, { label: string; min: number; max: number; unit: string; ticks: number[] }> = {
  'pregnancy-weeks': {
    label: 'Weeks of pregnancy', min: 0, max: 40, unit: 'wk', ticks: [0, 10, 20, 27, 36, 40],
  },
  'before-conception-months': {
    label: 'Months before trying to conceive', min: 0, max: 6, unit: 'mo', ticks: [0, 1, 3, 6],
  },
  'after-birth-weeks': {
    label: 'Weeks after birth', min: 0, max: 12, unit: 'wk', ticks: [0, 2, 6, 8, 12],
  },
  'child-months': {
    label: 'Age of the child, in months', min: 0, max: 24, unit: 'mo', ticks: [0, 1.5, 2.5, 3.5, 9, 15, 24],
  },
};

export interface VaccineDose {
  /** what to call this dose on the diagram */
  label: string;
  /** window on the axis, in that axis's unit */
  from: number;
  to: number;
}

export interface Vaccine {
  id: string;
  name: string;
  /** the shorthand a clinic would use */
  short: string;
  /** one line — what it is for */
  protects: string;
  /** two or three sentences of detail */
  detail: string;
  /** the plain-language timing sentence under the diagram */
  timing: string;
  axis: Axis;
  doses: VaccineDose[];
  /** who it is for, used to pick the list */
  stages: LifeStage[];
  /** true where the vaccine protects the baby rather than her */
  forBaby?: boolean;
  /** anything a mother should know before agreeing to it */
  caution?: string;
}

export const VACCINES: Vaccine[] = [
  /* ------------------------------------------------------ in pregnancy */
  {
    id: 'tdap',
    name: 'Whooping cough (Tdap)',
    short: 'Tdap',
    protects: 'Protects your newborn from whooping cough in their first weeks',
    detail:
      'Given in every pregnancy, not once in a lifetime. The antibodies you make cross the placenta and cover the baby for the months before their own immunisations begin — which is exactly when whooping cough is most dangerous to them.',
    timing: 'Between weeks 27 and 36. Earlier in that window gives the baby more antibodies.',
    axis: 'pregnancy-weeks',
    doses: [{ label: 'Single dose', from: 27, to: 36 }],
    stages: ['pregnant'],
    forBaby: true,
  },
  {
    id: 'tt',
    name: 'Tetanus (TT / Td)',
    short: 'TT',
    protects: 'Prevents tetanus in you and in the newborn',
    detail:
      'A course of five doses across a lifetime rather than one per pregnancy. If you have had earlier doses, you may only need a booster — your card or your clinic record decides how many are left.',
    timing: 'First dose at your first antenatal visit, the second four weeks later. Later doses are months apart.',
    axis: 'pregnancy-weeks',
    doses: [
      { label: 'TT1', from: 8, to: 16 },
      { label: 'TT2', from: 12, to: 22 },
    ],
    stages: ['pregnant'],
  },
  {
    id: 'flu',
    name: 'Influenza (seasonal)',
    short: 'Flu',
    protects: 'Lowers the chance of severe flu, which is harder in pregnancy',
    detail:
      'Pregnancy changes how the body handles flu, and a bad case carries real risk for both of you. The inactivated vaccine is given in any trimester, and it also passes some protection to the baby.',
    timing: 'Any trimester, ideally before the season starts.',
    axis: 'pregnancy-weeks',
    doses: [{ label: 'Single dose', from: 0, to: 40 }],
    stages: ['pregnant', 'planning', 'new-mother'],
  },
  {
    id: 'covid',
    name: 'COVID-19',
    short: 'COVID',
    protects: 'Reduces the risk of severe illness during pregnancy',
    detail:
      'Recommended in pregnancy, and safe at any stage. Whether you need a dose depends on what you have already had and how long ago, so bring your record to the appointment.',
    timing: 'Any trimester. Follow the current national schedule for boosters.',
    axis: 'pregnancy-weeks',
    doses: [{ label: 'Dose or booster', from: 0, to: 40 }],
    stages: ['pregnant', 'planning', 'new-mother'],
  },

  /* --------------------------------------------------- before pregnancy */
  {
    id: 'mmr',
    name: 'Measles, mumps and rubella (MMR)',
    short: 'MMR',
    protects: 'Rubella in early pregnancy can seriously harm a baby',
    detail:
      'If you are not already immune to rubella, this is worth sorting out before you conceive. A blood test can tell you whether you need it at all.',
    timing: 'At least one month before trying to conceive.',
    axis: 'before-conception-months',
    doses: [{ label: 'One or two doses', from: 1, to: 3 }],
    stages: ['planning', 'new-mother'],
    caution: 'A live vaccine — it is not given during pregnancy. If you are already pregnant, it waits until after the birth.',
  },
  {
    id: 'varicella',
    name: 'Chickenpox (varicella)',
    short: 'Varicella',
    protects: 'Chickenpox caught in pregnancy can be severe for both of you',
    detail:
      'Only needed if you have never had chickenpox and were never vaccinated. Two doses, a month or so apart.',
    timing: 'Both doses completed at least one month before conceiving.',
    axis: 'before-conception-months',
    doses: [
      { label: 'Dose 1', from: 2, to: 3 },
      { label: 'Dose 2', from: 1, to: 2 },
    ],
    stages: ['planning', 'new-mother'],
    caution: 'Also a live vaccine, so it is given before pregnancy or after the birth — not during.',
  },
  {
    id: 'hepb',
    name: 'Hepatitis B',
    short: 'Hep B',
    protects: 'Prevents passing hepatitis B to the baby at birth',
    detail:
      'A three-dose course. Worth discussing if you have not been vaccinated, particularly if anyone in the household carries it or your work brings you into contact with blood.',
    timing: 'Three doses over six months. Safe in pregnancy if it cannot wait.',
    axis: 'before-conception-months',
    doses: [
      { label: 'Dose 1', from: 5, to: 6 },
      { label: 'Dose 2', from: 4, to: 5 },
      { label: 'Dose 3', from: 0, to: 1 },
    ],
    stages: ['planning'],
  },

  /* ---------------------------------------------------- after the birth */
  {
    id: 'postpartum-rubella',
    name: 'Rubella catch-up (MMR)',
    short: 'MMR',
    protects: 'Covers you before any future pregnancy',
    detail:
      'If booking bloods showed you were not immune to rubella, this is normally given before you leave hospital or at the six-week check. Safe while breastfeeding.',
    timing: 'Any time after the birth — often at the postnatal visit.',
    axis: 'after-birth-weeks',
    doses: [{ label: 'Single dose', from: 0, to: 8 }],
    stages: ['new-mother'],
  },
  {
    id: 'postpartum-tdap',
    name: 'Whooping cough catch-up (Tdap)',
    short: 'Tdap',
    protects: 'Reduces the chance of you passing whooping cough to the baby',
    detail:
      'Only if you did not have it during the pregnancy. It will not give the baby the antibodies an antenatal dose would, but it stops you being the one who brings it home.',
    timing: 'As soon as possible after the birth.',
    axis: 'after-birth-weeks',
    doses: [{ label: 'Single dose', from: 0, to: 4 }],
    stages: ['new-mother'],
    forBaby: true,
  },

  /* ---------------------------------------------------------- the child */
  {
    id: 'bcg',
    name: 'BCG',
    short: 'BCG',
    protects: 'Protects against severe forms of childhood tuberculosis',
    detail:
      'Given as early as possible, usually before leaving the hospital. It leaves a small scar on the upper arm, which is normal and is how the record is often checked later.',
    timing: 'At birth, or as soon after as you can.',
    axis: 'child-months',
    doses: [{ label: 'Single dose', from: 0, to: 1 }],
    stages: ['parent', 'new-mother'],
    forBaby: true,
  },
  {
    id: 'penta',
    name: 'Pentavalent (DPT–HepB–Hib)',
    short: 'Penta',
    protects: 'Five diseases in one injection: diphtheria, pertussis, tetanus, hepatitis B and Hib',
    detail:
      'Three doses, four weeks apart. Mild fever or a sore leg for a day afterwards is common and expected — it is the immune system doing its job.',
    timing: 'At six, ten and fourteen weeks of age.',
    axis: 'child-months',
    doses: [
      { label: 'Dose 1', from: 1.4, to: 1.8 },
      { label: 'Dose 2', from: 2.3, to: 2.7 },
      { label: 'Dose 3', from: 3.2, to: 3.6 },
    ],
    stages: ['parent', 'new-mother'],
    forBaby: true,
  },
  {
    id: 'opv-pcv',
    name: 'Polio and pneumococcal (OPV, IPV, PCV)',
    short: 'OPV / PCV',
    protects: 'Polio, and the bacteria behind most childhood pneumonia',
    detail:
      'Given alongside the pentavalent doses, so they are the same visits rather than extra ones. Polio drops are oral; the injected dose comes at fourteen weeks.',
    timing: 'Six, ten and fourteen weeks, with a PCV dose at around eighteen weeks.',
    axis: 'child-months',
    doses: [
      { label: 'Dose 1', from: 1.4, to: 1.8 },
      { label: 'Dose 2', from: 2.3, to: 2.7 },
      { label: 'Dose 3', from: 3.2, to: 4.2 },
    ],
    stages: ['parent', 'new-mother'],
    forBaby: true,
  },
  {
    id: 'mr',
    name: 'Measles and rubella (MR)',
    short: 'MR',
    protects: 'Measles is one of the most contagious illnesses there is',
    detail:
      'Two doses. The first is the one most often missed, because by nine months the early visits are over and it is easy to lose track of.',
    timing: 'At nine months, and again at fifteen months.',
    axis: 'child-months',
    doses: [
      { label: 'Dose 1', from: 9, to: 10 },
      { label: 'Dose 2', from: 15, to: 16 },
    ],
    stages: ['parent'],
    forBaby: true,
  },
  {
    id: 'vitamin-a',
    name: 'Vitamin A supplement',
    short: 'Vit A',
    protects: 'Supports vision and lowers the risk of severe infection',
    detail:
      'Not a vaccine, but it runs on the same schedule and the same card, so it is worth tracking here. A capsule rather than an injection.',
    timing: 'From nine months, then every six months.',
    axis: 'child-months',
    doses: [
      { label: 'Round 1', from: 9, to: 10 },
      { label: 'Round 2', from: 15, to: 16 },
      { label: 'Round 3', from: 21, to: 22 },
    ],
    stages: ['parent'],
    forBaby: true,
  },
];

/** What to suggest for a given life stage, babies' vaccines last. */
export function vaccinesFor(stage: string): Vaccine[] {
  const s = (stage === 'general' ? 'pregnant' : stage) as LifeStage;
  return VACCINES
    .filter((v) => v.stages.includes(s))
    .sort((a, b) => Number(a.forBaby ?? false) - Number(b.forBaby ?? false));
}

export const STAGE_LABEL: Record<string, string> = {
  planning: 'planning a pregnancy',
  pregnant: 'pregnant',
  'new-mother': 'a new mother',
  parent: 'a parent of a young child',
  general: 'pregnant',
};

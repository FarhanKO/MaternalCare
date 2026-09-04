import {
  Activity,
  Baby,
  ClipboardList,
  Droplet,
  HeartPulse,
  Pill,
  Ruler,
  Smile,
  Stethoscope,
  Syringe,
  User,
  type LucideIcon,
} from 'lucide-react';

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'chips';

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  unit?: string;
  optional?: boolean;
  placeholder?: string;
}

export interface Step {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  fields: Field[];
  custom?: 'body-metrics';
}

export type Stage = 'pregnant' | 'new-mother' | 'parent' | 'planning' | 'general';

export const STAGE_LABEL: Record<Stage, string> = {
  pregnant: 'Pregnancy',
  'new-mother': 'New mother',
  parent: 'Parenting',
  planning: 'Planning',
  general: 'Your profile',
};

export function normalizeStage(s: string | null): Stage {
  const v = (s || '').toLowerCase();
  if (v.includes('planning')) return 'planning';
  if (v.includes('pregnant')) return 'pregnant';
  if (v.includes('new mother') || v === 'new-mother') return 'new-mother';
  if (v.includes('parent')) return 'parent';
  if (['pregnant', 'new-mother', 'parent', 'planning'].includes(v)) return v as Stage;
  return 'general';
}

/* --- shared intake, asked of every mother (standard antenatal-booking basics) --- */
const common: Step[] = [
  {
    icon: User,
    title: 'A few basics about you',
    subtitle: 'This helps us personalise your care from day one.',
    fields: [
      { id: 'dob', label: 'Date of birth', type: 'date' },
      { id: 'blood', label: 'Blood group', type: 'select', options: ['A+', 'A−', 'B+', 'B−', 'O+', 'O−', 'AB+', 'AB−', 'Not sure'] },
    ],
  },
  {
    icon: Ruler,
    title: 'Your body metrics',
    subtitle: 'Used to track healthy ranges and trends over time.',
    custom: 'body-metrics',
    fields: [
      { id: 'height', label: 'Height', type: 'number', unit: 'cm' },
      { id: 'weight', label: 'Weight', type: 'number', unit: 'kg' },
    ],
  },
  {
    icon: ClipboardList,
    title: 'Medical history',
    subtitle: 'Select anything that applies — you can always update this later.',
    fields: [
      { id: 'conditions', label: 'Ongoing conditions', type: 'chips', options: ['Diabetes', 'Hypertension', 'Thyroid', 'Asthma', 'Anemia', 'PCOS', 'None'] },
      { id: 'allergies', label: 'Allergies', type: 'text', optional: true, placeholder: 'e.g. penicillin' },
    ],
  },
];

/* --- stage-specific questions --- */
const byStage: Record<Stage, Step[]> = {
  pregnant: [
    {
      icon: Baby,
      title: 'Your pregnancy',
      subtitle: 'So we can calculate your current week and due date.',
      fields: [
        { id: 'lmp', label: 'First day of your last period', type: 'date' },
        { id: 'first', label: 'Is this your first pregnancy?', type: 'select', options: ['Yes', 'No'] },
      ],
    },
    {
      icon: ClipboardList,
      title: 'Pregnancy history',
      subtitle: 'Helps us watch early for anything that needs extra care.',
      fields: [
        { id: 'prev', label: 'Previous pregnancies', type: 'number', optional: true },
        { id: 'complications', label: 'Any past complications?', type: 'chips', options: ['Miscarriage', 'Preterm birth', 'Gestational diabetes', 'Pre-eclampsia', 'C-section', 'None'] },
      ],
    },
    {
      icon: Stethoscope,
      title: 'Your current care',
      fields: [
        { id: 'care', label: 'Are you already under a doctor’s care?', type: 'select', options: ['Yes', 'Not yet'] },
        { id: 'multiples', label: 'Are you expecting multiples?', type: 'select', options: ['No', 'Twins', 'Triplets or more'] },
      ],
    },
    {
      icon: Activity,
      title: 'How are you feeling?',
      subtitle: 'We’ll track symptoms and flag anything unusual.',
      fields: [
        {
          id: 'symptoms',
          label: 'Any symptoms lately?',
          type: 'chips',
          options: ['Nausea', 'Vomiting', 'Fatigue', 'Back pain', 'Swelling', 'Headaches', 'Heartburn', 'Constipation', 'Dizziness', 'None'],
        },
      ],
    },
  ],
  'new-mother': [
    {
      icon: Baby,
      title: 'About your baby',
      fields: [
        { id: 'baby_dob', label: 'Baby’s date of birth', type: 'date' },
        { id: 'delivery', label: 'Delivery type', type: 'select', options: ['Vaginal', 'C-section'] },
      ],
    },
    {
      icon: Droplet,
      title: 'Feeding',
      fields: [
        { id: 'feeding', label: 'Feeding method', type: 'select', options: ['Breastfeeding', 'Formula', 'Mixed'] },
        { id: 'birth_weight', label: 'Baby’s birth weight', type: 'number', unit: 'kg', optional: true },
      ],
    },
    {
      icon: Syringe,
      title: 'Baby’s health',
      fields: [{ id: 'baby_vax', label: 'Vaccinations up to date?', type: 'select', options: ['Yes', 'No', 'Not sure'] }],
    },
    {
      icon: Smile,
      title: 'Your wellbeing',
      subtitle: 'Your health matters just as much as your baby’s.',
      fields: [{ id: 'mood', label: 'In the past 2 weeks, have you often felt down or anxious?', type: 'select', options: ['Rarely', 'Sometimes', 'Often'] }],
    },
  ],
  parent: [
    {
      icon: Baby,
      title: 'About your child',
      fields: [
        { id: 'child_dob', label: 'Child’s date of birth', type: 'date' },
        { id: 'num_children', label: 'Number of children', type: 'number' },
      ],
    },
    {
      icon: Activity,
      title: 'Growth & development',
      fields: [
        { id: 'growth', label: 'Any concerns about growth?', type: 'select', options: ['No', 'Some', 'Not sure'] },
        { id: 'milestones', label: 'Are milestones on track?', type: 'select', options: ['Yes', 'No', 'Not sure'] },
      ],
    },
    {
      icon: Syringe,
      title: 'Vaccinations',
      fields: [{ id: 'child_vax', label: 'Immunizations up to date?', type: 'select', options: ['Yes', 'No', 'Not sure'] }],
    },
  ],
  planning: [
    {
      icon: HeartPulse,
      title: 'Your journey',
      fields: [
        { id: 'trying', label: 'How long have you been trying?', type: 'select', options: ['Just starting', 'Under 6 months', '6–12 months', 'Over a year'] },
        { id: 'cycle', label: 'How are your cycles?', type: 'select', options: ['Regular', 'Irregular', 'Not sure'] },
      ],
    },
    {
      icon: Pill,
      title: 'Preconception health',
      fields: [
        { id: 'folic', label: 'Are you taking folic acid?', type: 'select', options: ['Yes', 'No', 'Not yet'] },
        { id: 'prev_preg', label: 'Any previous pregnancies?', type: 'select', options: ['Yes', 'No'] },
      ],
    },
  ],
  general: [],
};

export function stepsFor(stage: Stage): Step[] {
  return [...common, ...byStage[stage]];
}

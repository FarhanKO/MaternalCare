import {
  Activity,
  Baby,
  BrainCircuit,
  CalendarHeart,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Syringe,
  type LucideIcon,
} from 'lucide-react';

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string; // tailwind gradient classes for the icon tile
}

export const features: Feature[] = [
  {
    icon: HeartPulse,
    title: 'Pregnancy tracking',
    description:
      'Gestational age, delivery date and week-by-week development, calculated automatically from your history.',
    accent: 'from-brand-400 to-brand-600',
  },
  {
    icon: Activity,
    title: 'Vitals & smart alerts',
    description:
      'Log blood pressure, glucose and weight. Elegant trends surface risk the moment a reading drifts.',
    accent: 'from-aqua-400 to-brand-500',
  },
  {
    icon: BrainCircuit,
    title: 'AI risk insight',
    description:
      'A transparent model classifies each pregnancy as low, medium or high risk with an explainable score.',
    accent: 'from-brand-500 to-brand-700',
  },
  {
    icon: Baby,
    title: 'Child growth & WHO curves',
    description:
      'Track height, weight and milestones against WHO growth standards in beautiful, readable charts.',
    accent: 'from-brand-400 to-aqua-500',
  },
  {
    icon: Syringe,
    title: 'Vaccination timeline',
    description:
      'Personalised immunisation schedules for mother and child, with reminders that never let a dose slip.',
    accent: 'from-brand-500 to-brand-600',
  },
  {
    icon: CalendarHeart,
    title: 'Connected appointments',
    description:
      'Find specialists, book visits and keep a complete medical history — shared securely with your doctor.',
    accent: 'from-aqua-400 to-brand-600',
  },
];

export interface Stat {
  value: string;
  label: string;
}

export const stats: Stat[] = [
  { value: '98%', label: 'of maternal risks are preventable with timely care' },
  { value: '20+', label: 'connected care features in one calm space' },
  { value: '24/7', label: 'monitoring with intelligent alerts' },
  { value: '3', label: 'AI risk tiers, fully explainable' },
];

export interface JourneyStep {
  icon: LucideIcon;
  phase: string;
  title: string;
  description: string;
}

export const journey: JourneyStep[] = [
  {
    icon: ShieldCheck,
    phase: 'Onboard',
    title: 'A private, secure profile',
    description: 'Set up your pregnancy and child profiles in minutes. Your data stays encrypted and yours.',
  },
  {
    icon: Activity,
    phase: 'Monitor',
    title: 'Effortless daily tracking',
    description: 'Log vitals in seconds. MaternalCare+ turns each reading into a clear, calm trend.',
  },
  {
    icon: BrainCircuit,
    phase: 'Understand',
    title: 'Insight you can trust',
    description: 'The AI engine explains its reasoning, so you and your doctor always know why.',
  },
  {
    icon: Stethoscope,
    phase: 'Connect',
    title: 'Care, together',
    description: 'Share reports with clinicians and caregivers, and act early when it matters most.',
  },
];

// --- decorative chart data for the hero product preview ---
export const bpTrend = [
  { d: 'W20', systolic: 112, diastolic: 72 },
  { d: 'W21', systolic: 114, diastolic: 73 },
  { d: 'W22', systolic: 116, diastolic: 74 },
  { d: 'W23', systolic: 115, diastolic: 75 },
  { d: 'W24', systolic: 118, diastolic: 76 },
  { d: 'W25', systolic: 119, diastolic: 77 },
  { d: 'W26', systolic: 118, diastolic: 76 },
];

export const weightTrend = [
  { d: 'W20', kg: 61.1 },
  { d: 'W21', kg: 61.9 },
  { d: 'W22', kg: 62.6 },
  { d: 'W23', kg: 63.4 },
  { d: 'W24', kg: 64.3 },
  { d: 'W25', kg: 65.1 },
  { d: 'W26', kg: 65.8 },
];

export type RiskLevel = 'low' | 'moderate' | 'high';

export interface Patient {
  id: string;
  name: string;
  age: number;
  week: number;
  risk: RiskLevel;
  bloodGroup: string;
  lastVisit: string;
  nextVisit: string;
  /** most recent blood pressure reading */
  bp: { sys: number; dia: number };
  /** flags raised by the mother's own logging */
  flags: string[];
  conditions: string[];
  /** wellbeing score carried over from her dashboard */
  score: number;
  /** systolic trend across recent visits — drawn as a sparkline */
  trend: number[];
}

export const RISK_META: Record<RiskLevel, { label: string; color: string; ring: string }> = {
  low: { label: 'Low', color: '#2fbf9b', ring: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/25' },
  moderate: { label: 'Moderate', color: '#f6b93b', ring: 'bg-amber-500/12 text-amber-700 ring-amber-500/25' },
  high: { label: 'High', color: '#e5484d', ring: 'bg-rose-500/12 text-rose-700 ring-rose-500/25' },
};

export const PATIENTS: Patient[] = [
  {
    id: 'pt1', name: 'Aisha Rahman', age: 28, week: 26, risk: 'moderate', bloodGroup: 'B+',
    lastVisit: '2 weeks ago', nextVisit: 'Dec 20', bp: { sys: 121, dia: 78 },
    flags: ['Back ache · day 6', 'Glucose screening due'],
    conditions: ['First pregnancy'], score: 79, trend: [116, 118, 119, 121, 121],
  },
  {
    id: 'pt2', name: 'Nusrat Jahan', age: 33, week: 34, risk: 'high', bloodGroup: 'O−',
    lastVisit: '4 days ago', nextVisit: 'Dec 18', bp: { sys: 142, dia: 93 },
    flags: ['Raised BP', 'Swelling + headache', 'Anti-D given'],
    conditions: ['Rh negative', 'Gestational hypertension'], score: 54, trend: [124, 128, 133, 138, 142],
  },
  {
    id: 'pt3', name: 'Farhana Rahim', age: 25, week: 19, risk: 'low', bloodGroup: 'A+',
    lastVisit: '1 week ago', nextVisit: 'Jan 04', bp: { sys: 110, dia: 70 },
    flags: [], conditions: ['Second pregnancy'], score: 92, trend: [108, 109, 111, 110, 110],
  },
  {
    id: 'pt4', name: 'Priya Sengupta', age: 30, week: 29, risk: 'moderate', bloodGroup: 'AB+',
    lastVisit: '6 days ago', nextVisit: 'Dec 22', bp: { sys: 128, dia: 84 },
    flags: ['Low iron (9.8 g/dL)'], conditions: ['Anaemia'], score: 71, trend: [118, 121, 124, 126, 128],
  },
  {
    id: 'pt5', name: 'Maria Gomes', age: 22, week: 12, risk: 'low', bloodGroup: 'O+',
    lastVisit: '3 days ago', nextVisit: 'Jan 09', bp: { sys: 112, dia: 72 },
    flags: [], conditions: ['First pregnancy'], score: 88, trend: [110, 112, 111, 113, 112],
  },
  {
    id: 'pt6', name: 'Shirin Akter', age: 37, week: 31, risk: 'high', bloodGroup: 'B−',
    lastVisit: '2 days ago', nextVisit: 'Dec 19', bp: { sys: 138, dia: 90 },
    flags: ['Reduced movement reported', 'Age 35+'], conditions: ['Gestational diabetes'],
    score: 58, trend: [126, 130, 133, 136, 138],
  },
];

export interface Slot {
  id: string;
  time: string;
  patient: string;
  reason: string;
  kind: 'scan' | 'checkup' | 'result' | 'urgent';
  done?: boolean;
}

export const KIND_META: Record<Slot['kind'], { label: string; color: string }> = {
  scan: { label: 'Scan', color: '#3f66f0' },
  checkup: { label: 'Check-up', color: '#22b8c4' },
  result: { label: 'Results', color: '#8b7bf3' },
  urgent: { label: 'Urgent', color: '#e5484d' },
};

export const TODAY_SLOTS: Slot[] = [
  { id: 's1', time: '09:00', patient: 'Maria Gomes', reason: 'Booking bloods review', kind: 'result', done: true },
  { id: 's2', time: '09:40', patient: 'Farhana Rahim', reason: 'Week 19 check-up', kind: 'checkup', done: true },
  { id: 's3', time: '10:30', patient: 'Nusrat Jahan', reason: 'Raised BP — same-day review', kind: 'urgent' },
  { id: 's4', time: '11:15', patient: 'Aisha Rahman', reason: 'Growth ultrasound', kind: 'scan' },
  { id: 's5', time: '12:00', patient: 'Priya Sengupta', reason: 'Iron studies follow-up', kind: 'result' },
  { id: 's6', time: '14:30', patient: 'Shirin Akter', reason: 'Reduced movement assessment', kind: 'urgent' },
];

export interface Alert {
  id: string;
  patient: string;
  title: string;
  detail: string;
  severity: 'critical' | 'warning';
  ago: string;
}

export const ALERTS: Alert[] = [
  {
    id: 'a1', patient: 'Shirin Akter', severity: 'critical', ago: '25m',
    title: 'Reduced fetal movement reported',
    detail: 'Logged 3 movements over 2 hours at week 31. Patient advised to attend — awaiting arrival.',
  },
  {
    id: 'a2', patient: 'Nusrat Jahan', severity: 'critical', ago: '2h',
    title: 'BP 142/93 with headache and swelling',
    detail: 'Three readings above threshold in 48 hours. Pre-eclampsia screen indicated today.',
  },
  {
    id: 'a3', patient: 'Priya Sengupta', severity: 'warning', ago: '1d',
    title: 'Haemoglobin 9.8 g/dL',
    detail: 'Below range at week 29. Oral iron started; recheck in 4 weeks.',
  },
  {
    id: 'a4', patient: 'Aisha Rahman', severity: 'warning', ago: '2d',
    title: 'Back ache unresolved for 6 days',
    detail: 'Self-care has not eased it. Flagged by the app for review at her next appointment.',
  },
];

/* practice-level analytics */
export const CLINIC_WEEK = [
  { d: 'Mon', seen: 12, booked: 14 },
  { d: 'Tue', seen: 9, booked: 11 },
  { d: 'Wed', seen: 15, booked: 15 },
  { d: 'Thu', seen: 11, booked: 13 },
  { d: 'Fri', seen: 8, booked: 10 },
  { d: 'Sat', seen: 6, booked: 6 },
];

export const TRIMESTER_SPLIT = [
  { name: 'First', value: 9, color: '#7fe3e8' },
  { name: 'Second', value: 17, color: '#45cdd6' },
  { name: 'Third', value: 12, color: '#0f97a6' },
];

export const SCREENING = [
  { name: 'Glucose screening', done: 82 },
  { name: 'Anomaly scan', done: 94 },
  { name: 'Whooping cough vaccine', done: 68 },
  { name: 'Anti-D (Rh negative)', done: 100 },
  { name: 'Haemoglobin check', done: 76 },
];

export const OUTCOMES = [
  { m: 'Jul', term: 18, preterm: 3 },
  { m: 'Aug', term: 21, preterm: 2 },
  { m: 'Sep', term: 19, preterm: 4 },
  { m: 'Oct', term: 24, preterm: 2 },
  { m: 'Nov', term: 22, preterm: 1 },
  { m: 'Dec', term: 16, preterm: 2 },
];

export const riskCount = (level: RiskLevel) => PATIENTS.filter((p) => p.risk === level).length;

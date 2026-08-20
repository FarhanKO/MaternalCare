/**
 * Shapes for the data that used to live only in the browser — the community
 * board, her profile, her daily self-reporting — plus the child records that
 * existed in the database but which the React client had no route to.
 */

export interface ServerProfile {
  id: string;
  name: string;
  stage: string;
  bio: string;
  /** API path, or null to fall back to initials */
  avatar: string | null;
  bloodGroup: string | null;
  age: number | null;
  emergencyNumber: string;
}

/* --------------------------------------------------------- daily log */

export interface DailyLogEntry {
  date: string;
  mood?: string;
  kicks?: number;
  waterLitres?: number;
}

export interface DailyLogSummary {
  days: number;
  avgWaterLitres: number | null;
  avgKicks: number | null;
  commonMood: string | null;
}

export interface DailyLogState {
  today: DailyLogEntry;
  /** oldest first, ready to chart */
  history: DailyLogEntry[];
  summary: DailyLogSummary;
}

/* --------------------------------------------------------- community */

export interface ServerComment {
  id: string;
  author: string;
  role: 'mother' | 'doctor';
  body: string;
  ago: string;
}

export interface ServerPost {
  id: string;
  author: string;
  role: 'mother' | 'doctor';
  week?: number;
  topic?: string;
  title: string;
  body: string;
  /** API path to the image, absent when there is none */
  image?: string;
  hearts: number;
  clinicianAnswered: boolean;
  ago: string;
  comments: ServerComment[];
}

/* ------------------------------------------------------------- child */

export interface GrowthPoint {
  date: string;
  ageMonths: number;
  weightKg: number;
  heightCm: number | null;
  headCm: number | null;
}

export interface Milestone {
  id: string;
  title: string;
  typical?: string;
  icon?: string;
  achieved: boolean;
  achievedOn?: string;
}

export interface PercentileSummary {
  band: string;
  note: string;
  weight: number;
  ageMonths: number;
  p50: string;
}

/** WHO weight-for-age reference curves the chart draws behind her readings. */
export interface GrowthReference {
  months: number[];
  p3: number[];
  p50: number[];
  p97: number[];
}

export interface ChildState {
  child: {
    id: string;
    name: string;
    dob: string;
    gender: string | null;
    ageMonths: number;
    agePretty: string;
  };
  growth: GrowthPoint[];
  percentile: PercentileSummary | null;
  reference: GrowthReference;
  milestones: Milestone[];
}

/* ------------------------------------------------------ vaccinations */

export interface Vaccination {
  id: string;
  subject: 'child' | 'mother';
  name: string;
  dose?: string;
  dueDate: string;
  status: 'done' | 'due' | 'upcoming';
  completedOn?: string;
}

export interface VaccinationStats {
  done: number;
  due: number;
  upcoming: number;
  total: number;
  pct: number;
}

/* -------------------------------------------------------- weight gain */

/** Why booking records a pre-pregnancy weight and a height. */
/** One logged set of measurements. Every field but the date is optional. */
export interface VitalReading {
  id: string;
  date: string;
  systolic: number | null;
  diastolic: number | null;
  sugar: number | null;
  weightKg: number | null;
  tempC: number | null;
}

export interface VitalAlert {
  metric: string;
  value: number;
  level: string;
  message?: string;
}

export interface VitalState {
  /** oldest first, ready to chart */
  readings: VitalReading[];
  latest: VitalReading | null;
  alerts: VitalAlert[];
}

export interface WeightGain {
  preWeightKg: number;
  currentWeightKg: number;
  measuredOn: string;
  gainedKg: number;
  bmi: number;
  category: 'underweight' | 'healthy' | 'overweight' | 'obese';
  week: number;
  /** what is expected by this week, not by term */
  expected: { low: number; high: number };
  /** the whole-pregnancy range for her BMI category */
  totalRange: { low: number; high: number };
  status: 'below' | 'on-track' | 'above';
  note: string;
}

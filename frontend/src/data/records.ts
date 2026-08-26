import type { CareDocument } from '@/data/care';

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
  sleepHours?: number;
}

export interface DailyLogSummary {
  days: number;
  avgWaterLitres: number | null;
  avgKicks: number | null;
  avgSleepHours: number | null;
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
  /** true where a moderator took it down; `body` is then the tombstone */
  removed?: boolean;
  removedReason?: string | null;
  /** whether the signed-in member has already reported this */
  reported?: boolean;
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
  /** whether the signed-in member has already reported this */
  reported?: boolean;
}

/** Why something is being reported, as the server defines it. */
export interface ReportReason {
  key: string;
  label: string;
  hint: string;
}

/** One item in the clinician's moderation queue, with everything to decide on. */
export interface ReportGroup {
  key: string;
  target: 'post' | 'comment';
  postId: string;
  commentId: string | null;
  content: {
    author: string;
    role: 'mother' | 'doctor';
    title: string | null;
    body: string;
    image: string | null;
    hidden: boolean;
  };
  reports: {
    id: string;
    reason: string;
    reasonLabel: string;
    detail: string;
    state: 'open' | 'upheld' | 'dismissed';
    createdAt: string;
    reporter: string;
    reviewNote: string | null;
  }[];
  /** summed severity of the reasons given */
  weight: number;
  urgent: boolean;
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

/** One measurement placed on the WHO curve for this child's sex and age. */
export interface PercentileMeasure {
  key: 'weight' | 'height' | 'head';
  label: string;
  unit: string;
  value: number | null;
  available: boolean;
  z?: number;
  /** '<1' and '>99' are reported as bounds rather than false precision */
  centile?: string;
  /** the same figure spelled for display: '57th', 'below the 1st' */
  centileLabel?: string;
  median?: number;
  band?: { key: string; label: string; tone: 'ok' | 'watch' | 'warn' | 'alert' };
}

export interface PercentileSummary {
  /** false when the child's sex is not recorded — no reference is picked */
  sexKnown: boolean;
  sex?: 'boys' | 'girls';
  ageMonths: number;
  measuredOn?: string;
  beyondReference?: boolean;
  measures: PercentileMeasure[];
  note: string;
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
  /** cards filed as evidence for this dose */
  cards: CareDocument[];
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
/**
 * Her pregnancy as the server derives it from her LMP — the single source of
 * "what week is she in". Every screen that mentions a week reads this rather
 * than carrying its own number.
 */
export interface Pregnancy {
  lmp: string;
  week: number;
  dayOfWeek: number;
  trimester: number;
  /** 0–100, how far through the 40 weeks */
  progress: number;
  daysLeft: number;
  edd: string;
  eddPretty: string;
  babySize: { fruit: string; length: string; weight: string; emoji: string };
  weekNote: string;
}

/** One logged set of measurements. Every field but the date is optional. */
export interface VitalReading {
  id: string;
  date: string;
  systolic: number | null;
  diastolic: number | null;
  sugar: number | null;
  weightKg: number | null;
  tempC: number | null;
  fetalBpm: number | null;
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

/* ------------------------------------------------- the care plan (F14) */

export type Advice = {
  domain: 'nutrition' | 'exercise' | 'lifestyle';
  priority: 'urgent' | 'high' | 'normal';
  title: string;
  text: string;
  /** the reading that produced this item — what makes it personal */
  why: string;
};

export interface NutrientTarget {
  key: string;
  label: string;
  amount: string;
  why: string;
  /** true where a general figure has been replaced by "ask your doctor" */
  flagged?: boolean;
}

export interface CarePlan {
  stage: string;
  week: number | null;
  trimester: number | null;
  risk: {
    level: 'low' | 'medium' | 'high';
    label: string;
    score: number;
    drivers: { name: string; points: number; detail: string }[];
  } | null;
  conditions: { key: string; label: string }[];
  targets: NutrientTarget[];
  nutrition: Advice[];
  exercise: Advice[];
  lifestyle: Advice[];
  /** the only intake figure the app can honestly show, because she logs it */
  hydration: {
    targetLitres: number;
    avgLitres: number | null;
    days: number;
    pct: number | null;
  };
  /** what the plan was built from, in her own terms */
  basis: string[];
  method: string;
}


/* ------------------------------------------------- risk assessment (F13) */

export interface RuleAssessment {
  score: number;
  level: 'low' | 'medium' | 'high';
  label: string;
  factors: { name: string; points: number; detail: string }[];
}

/** What the FastAPI classifier said, when it could be reached. */
export interface ModelAssessment {
  available: boolean;
  /** set instead of a prediction when the reading is outside its training range */
  refused?: boolean;
  reason?: string;
  level?: 'low' | 'medium' | 'high';
  label?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
  /** features it had to stand in for, and readings it pulled into range */
  imputed?: string[];
  clamped?: { field: string; given: number; used: number }[];
  quality?: {
    trained_on_rows: number;
    cv_f1_macro: number;
    test_accuracy: number;
    caveat: string;
  };
}

export interface RiskView {
  rules: RuleAssessment | null;
  model: ModelAssessment | null;
  comparison: {
    agreement: 'agree' | 'model-higher' | 'rules-higher' | 'unavailable';
    note: string | null;
  };
  readings?: {
    age: number; systolic: number; diastolic: number;
    sugar: number; tempC: number; heartBpm: number | null; week: number;
  };
}

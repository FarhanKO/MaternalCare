/**
 * Symptom Model — data access + domain logic for the symptom journal.
 * Consumed by both the EJS views and the JSON API behind the React
 * dashboard.
 */
const db = require('../config/db');

/** Symptoms that always warrant same-day clinical review. */
const URGENT = new Set([
  'Shortness of breath', 'Blurred vision', 'Severe headache', 'Bleeding',
  'Reduced movement', 'Fever', 'Abdominal pain', 'Contractions',
]);

const INTENSITY_WEIGHT = { mild: 5, mid: 10, high: 17, severe: 25 };


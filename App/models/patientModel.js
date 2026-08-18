/**
 * Patient Model — the clinician's view of the mothers under their care.
 *
 * Assembles each patient from her own account, pregnancy, vitals and
 * symptoms, and derives the triage fields the caseload screen needs.
 *
 * This was the worst N+1 in the codebase: one query for the list, then four
 * more per patient for her pregnancy, blood-pressure trend, symptoms and
 * score. Twenty-five round trips for six patients, which is three and a half
 * seconds against a database in Sydney. It is two queries now — the roster
 * with its trend aggregated in SQL, and everyone's symptoms in one pass.
 */
const db = require('../config/db');
const symptomModel = require('./symptomModel');

const DAY = 86400000;



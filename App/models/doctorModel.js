/**
 * Doctor Model — the clinicians a mother can request an appointment with,
 * and the ranking that decides who to recommend first.
 *
 * The ranking answers one question: of the doctors who could actually see her
 * soon, who is best qualified for what she needs? Qualification alone would
 * send everybody to the busiest consultant; availability alone would send them
 * to whoever happens to be idle. Both are scored, then added.
 */
const db = require('../config/db');

/** Consulting times a clinic offers in a day. */
const SLOT_TIMES = [
  '09:00', '09:40', '10:20', '11:00', '11:40',
  '14:00', '14:40', '15:20', '16:00',
];

/**
 * Every doctor with their live diary counts.
 *
 * This used to be one query for the list plus two per doctor for the booked
 * and pending counts — fifteen round trips for seven clinicians, which is
 * about two seconds against a database in Sydney. The counts are correlated
 * subqueries now, so it is one.
 */

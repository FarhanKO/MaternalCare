/**
 * Doctor Model — the clinicians a mother can request an appointment with,
 * and the ranking that decides who to recommend first.
 *
 * The ranking answers one question: of the doctors who could actually see her
 * soon, who is best qualified for what she needs? Qualification alone would
 * send everybody to the busiest consultant; availability alone would send them
 * to whoever happens to be idle. Both are scored, then added.
 */
const db = require('../config/database');

/** Consulting times a clinic offers in a day. */
const SLOT_TIMES = [
  '09:00', '09:40', '10:20', '11:00', '11:40',
  '14:00', '14:40', '15:20', '16:00',
];

// local calendar date — see the note in appointmentModel
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Requests and confirmed visits still ahead — what actually fills a diary. */
function activeAppointments(doctorId) {
  return db.prepare(
    `SELECT COUNT(*) AS c FROM appointments
     WHERE doctor_id = ? AND status IN ('requested','accepted') AND date >= ?`,
  ).get(doctorId, todayISO()).c;
}

/** Requests this doctor has not answered yet — the mother's queue ahead of her. */
function pendingCount(doctorId) {
  return db.prepare(
    "SELECT COUNT(*) AS c FROM appointments WHERE doctor_id = ? AND status = 'requested'",
  ).get(doctorId).c;
}

/**
 * Weight for what a clinician is trained in. Postgraduate maternal
 * qualifications count for more than years served, because that is the
 * distinction a mother is actually choosing between. Capped so a long list of
 * letters cannot outrank being available at all.
 */
function qualificationScore(doctor) {
  const q = (doctor.qualification || '').toUpperCase();
  let score = 0;
  if (/FCPS|MRCOG|FRCOG/.test(q)) score += 26;       // specialist fellowship
  if (/\bMD\b|\bMS\b|MRCPCH/.test(q)) score += 16;   // doctorate / membership
  if (/DGO|DCH|MPH/.test(q)) score += 8;             // diploma
  if (/MBBS/.test(q)) score += 5;                    // baseline licence
  score += Math.min(14, doctor.years || 0);          // a point a year, capped
  return Math.min(60, score);
}

/** 0 when the list is full, 30 when it is empty. */
function availabilityScore(load) {
  return Math.round(Math.max(0, 1 - load) * 30);
}

/**
 * How a mother's need maps onto a specialty. Anything unmatched still ranks —
 * it simply gets no bonus, rather than being hidden.
 */
const SPECIALTY_FOR = {
  pregnant: /obstetric|maternal|gynaec/i,
  planning: /obstetric|gynaec|nutrition/i,
  'new-mother': /obstetric|maternal|paediatric|nutrition/i,
  parent: /paediatric/i,
};

function toDTO(d) {
  const booked = activeAppointments(d.id);
  const panel = (d.patients || 0) + booked;
  const capacity = d.capacity || 30;
  const load = Math.min(1, panel / capacity);
  const openings = Math.max(0, capacity - panel);
  const queue = pendingCount(d.id);

  const status = !d.available ? 'away'
    : openings === 0 ? 'full'
    : load >= 0.85 ? 'busy'
    : 'open';

  return {
    id: String(d.id),
    name: d.name,
    specialty: d.specialty,
    hospital: d.hospital,
    qualification: d.qualification || '',
    years: d.years || 0,
    rating: d.rating,
    distanceKm: d.distance_km,
    panel,
    capacity,
    openings,
    queue,
    /** 0–1, how full the list is */
    load: Math.round(load * 100) / 100,
    /** open | busy | full | away */
    status,
    /** true when a request can be sent at all */
    bookable: Boolean(d.available) && openings > 0,
  };
}

module.exports = {
  SLOT_TIMES,

  all() {
    return db.prepare('SELECT * FROM doctors ORDER BY id').all().map(toDTO);
  },

  find(id) {
    const row = db.prepare('SELECT * FROM doctors WHERE id = ?').get(id);
    return row ? toDTO(row) : null;
  },

  exists(id) {
    return Boolean(db.prepare('SELECT 1 FROM doctors WHERE id = ?').get(id));
  },

  /**
   * Ranked list for a mother at a given life stage.
   *
   * Ordered in tiers before it is ordered by score, because no amount of
   * qualification makes a paediatrician the right answer for an antenatal
   * visit, and no merit at all helps if the clinician cannot see her:
   *   0 — right specialty and able to take her
   *   1 — able to take her, but a different specialty
   *   2 — full or on leave
   * Nobody is hidden; the tier is returned so the UI can say why.
   */
  recommend({ stage } = {}) {
    const pattern = SPECIALTY_FOR[stage];

    return this.all()
      .map((d) => {
        const qual = qualificationScore({ qualification: d.qualification, years: d.years });
        const avail = availabilityScore(d.load);
        const relevant = !pattern || pattern.test(d.specialty);
        const stars = Math.round((d.rating || 0) * 2);
        const near = d.distanceKm <= 2 ? 3 : d.distanceKm <= 4 ? 1 : 0;

        const tier = !d.bookable ? 2 : relevant ? 0 : 1;

        const reasons = [];
        if (relevant && pattern) reasons.push(`Specialises in ${d.specialty.toLowerCase()}`);
        if (qual >= 40) reasons.push('Senior specialist qualification');
        else if (qual >= 25) reasons.push('Specialist qualified');
        if (d.status === 'open') reasons.push(`${d.openings} places left on their list`);
        if (d.bookable && d.queue === 0) reasons.push('No one waiting — usually answers same day');
        else if (d.bookable) reasons.push(`${d.queue} request${d.queue > 1 ? 's' : ''} ahead of you`);
        if (d.status === 'away') reasons.push('Currently on leave');
        if (d.status === 'full') reasons.push('List is full — not taking new requests');
        if (!relevant && d.bookable) reasons.push('A different specialty to what you need now');

        return {
          ...d,
          tier,
          relevant,
          score: qual + avail + stars + near,
          breakdown: { qualification: qual, availability: avail, rating: stars, distance: near },
          reasons,
        };
      })
      .sort((a, b) => a.tier - b.tier || b.score - a.score || a.distanceKm - b.distanceKm);
  },
};

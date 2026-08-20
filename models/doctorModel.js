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
const WITH_COUNTS = `
  SELECT d.*,
         (SELECT count(*) FROM appointments a
           WHERE a.doctor_id = d.id
             AND a.status IN ('requested','accepted')
             AND a.date >= CURRENT_DATE)                  AS booked,
         (SELECT count(*) FROM appointments a
           WHERE a.doctor_id = d.id AND a.status = 'requested') AS queue
  FROM doctors d
`;

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

/** What every clinic visit costs before seniority is added, in taka. */
const BASE_FEE_BDT = 400;

/**
 * The consultation fee for a paid booking, in taka.
 *
 * Derived from the same two things the ranking already reads — what they are
 * qualified in and how long they have practised — rather than stored as a
 * number somebody has to remember to update. That also makes "varies by
 * clinician" on the booking page a description of the list rather than a
 * disclaimer covering a single hardcoded price.
 */
function consultationFee(doctor) {
  const q = (doctor.qualification || '').toUpperCase();
  let fee = BASE_FEE_BDT;
  if (/FCPS|MRCOG|FRCOG/.test(q)) fee += 350;
  else if (/\bMD\b|\bMS\b|MRCPCH/.test(q)) fee += 200;
  else if (/DGO|DCH|MPH/.test(q)) fee += 100;
  fee += Math.min(20, doctor.years || 0) * 15;
  return Math.round(fee / 50) * 50;               // clinics quote round numbers
}

/**
 * What a month of chat access adds on top of the visit.
 *
 * Priced off the same visit fee rather than as a flat rate: a month of a
 * consultant's attention is not worth the same as a month of a registrar's.
 * Deliberately well under a second visit, because the point is that she asks
 * the small question instead of saving it up or going without.
 */
function chatMonthFee(doctor) {
  return Math.round((consultationFee(doctor) * 0.6) / 50) * 50;
}

/** Days of messaging a 'visit-plus-chat' booking buys. */
const CHAT_DAYS = 30;

/** The two things she can buy, priced for this clinician. */
function plansFor(doctor) {
  const visit = consultationFee(doctor);
  const chat = chatMonthFee(doctor);
  return {
    visit: {
      key: 'visit',
      label: 'The visit',
      priceBdt: visit,
      blurb: 'One consultation, on call, at the time you pick.',
    },
    'visit-plus-chat': {
      key: 'visit-plus-chat',
      label: 'Visit + a month of chat',
      priceBdt: visit + chat,
      addOnBdt: chat,
      blurb: `The visit, plus ${CHAT_DAYS} days of messaging — they answer between appointments and can read the reports you upload in that time.`,
    },
  };
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

/** Row (already carrying booked/queue) → the shape the client reads. */
function toDTO(d) {
  const panel = (d.patients || 0) + (d.booked || 0);
  const capacity = d.capacity || 30;
  const load = Math.min(1, panel / capacity);
  const openings = Math.max(0, capacity - panel);
  const queue = d.queue || 0;

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
    /** what one paid visit costs, in taka */
    feeBdt: consultationFee(d),
    /** what a month of messaging adds on top */
    chatFeeBdt: chatMonthFee(d),
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
  CHAT_DAYS,
  consultationFee,
  chatMonthFee,
  plansFor,

  async all() {
    const rows = await db.sql(`${WITH_COUNTS} ORDER BY d.id`);
    return rows.map(toDTO);
  },

  async find(id) {
    const row = await db.one(`${WITH_COUNTS} WHERE d.id = $1`, [id]);
    return row ? toDTO(row) : null;
  },

  async exists(id) {
    return Boolean(await db.one('SELECT 1 FROM doctors WHERE id = $1', [id]));
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
  async recommend({ stage } = {}) {
    const pattern = SPECIALTY_FOR[stage];
    const doctors = await this.all();

    return doctors
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

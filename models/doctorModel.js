/**
 * Doctor Model — the clinicians a mother can request an appointment with,
 * and the ranking that decides who to recommend first.
 *
 * The ranking answers one question: of the doctors who could actually see her
 * soon, who is best qualified for what she needs? Qualification alone would
 * send everybody to the busiest consultant; availability alone would send them
 * to whoever happens to be idle. Both are scored, then added.
 *
 * There is deliberately nothing here for her to filter by. Every input the
 * list could be filtered on — what they specialise in, how they are rated,
 * whether they have room, how fast they answer — is already read, weighted
 * and ordered below. Handing a woman four dropdowns asks her to guess at
 * weightings the server can work out from the data it holds, and the guess
 * she is least equipped to make is the one that matters most: how much
 * "FCPS" should count against "free on Thursday". So she gets a list, in
 * order, each entry saying in words why it sits where it does.
 */
const db = require('../config/db');

/** Consulting times a clinic offers in a day. */
const SLOT_TIMES = [
  '09:00', '09:40', '10:20', '11:00', '11:40',
  '14:00', '14:40', '15:20', '16:00',
];

/**
 * Every doctor with their live diary counts and their answering record.
 *
 * This used to be one query for the list plus two per doctor for the booked
 * and pending counts — fifteen round trips for seven clinicians, which is
 * about two seconds against a database in Sydney. The counts are correlated
 * subqueries now, so it is one.
 *
 * `answered` and `reply_hours` come from the requests they have already been
 * sent: `requested_at` to `responded_at`, which the appointment flow has
 * always written and nothing has ever read. It is the one thing here measured
 * from what a clinician did rather than what they told us about themselves.
 */
const WITH_COUNTS = `
  SELECT d.*,
         (SELECT count(*) FROM appointments a
           WHERE a.doctor_id = d.id
             AND a.status IN ('requested','accepted')
             AND a.date >= CURRENT_DATE)                  AS booked,
         (SELECT count(*) FROM appointments a
           WHERE a.doctor_id = d.id AND a.status = 'requested') AS queue,
         (SELECT count(*) FROM appointments a
           WHERE a.doctor_id = d.id
             AND a.responded_at IS NOT NULL
             AND a.requested_at IS NOT NULL)               AS answered,
         (SELECT avg(EXTRACT(EPOCH FROM (a.responded_at - a.requested_at)) / 3600.0)
            FROM appointments a
           WHERE a.doctor_id = d.id
             AND a.responded_at IS NOT NULL
             AND a.requested_at IS NOT NULL)               AS reply_hours
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

/**
 * Weight for how fast they answer, out of 10.
 *
 * A clinician who has not been asked anything yet scores the middle of the
 * band rather than nothing. Being new is not the same as being slow, and
 * starting everyone at zero would mean no doctor who registered today could
 * ever climb past the seeded roster — the list would ossify on its first day.
 */
function responseScore(answered, hours) {
  if (!answered || answered < 2 || hours == null) return 5;   // no record yet
  if (hours <= 6) return 10;
  if (hours <= 24) return 8;
  if (hours <= 48) return 5;
  if (hours <= 96) return 2;
  return 0;
}

/**
 * Weight for how she is rated, out of 10, with an unrated clinician held at
 * the roster average for the same reason as above.
 */
function ratingScore(rating, average) {
  const r = rating == null ? average : rating;
  return Math.round(Math.max(0, Math.min(5, r)) * 2);
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
 *
 * The optional 'a' matters now that clinicians type their own specialty:
 * "Pediatrics" and "Paediatrics" are the same doctor, and matching only the
 * British spelling would have quietly filed every American-trained
 * paediatrician under "a different specialty to what you need".
 */
const SPECIALTY_FOR = {
  pregnant: /obstetric|maternal|gyn[a]?ec/i,
  planning: /obstetric|gyn[a]?ec|nutrition/i,
  'new-mother': /obstetric|maternal|p[a]?ediatric|nutrition/i,
  parent: /p[a]?ediatric/i,
};

/** A registration field that came back wrong, with the message to show. */
function invalid(field, message) {
  const err = new Error(message);
  err.code = 'INVALID_REGISTRATION';
  err.field = field;
  return err;
}

/** Trim, collapse runs of whitespace, and cap — every text field gets this. */
const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

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
    qualification: d.qualification || '',
    years: d.years || 0,
    /** null until they have been rated — not zero, which would read as bad */
    rating: d.rating == null ? null : d.rating,
    /** requests they have answered, and how long they took on average */
    answered: Number(d.answered || 0),
    replyHours: d.reply_hours == null ? null : Math.round(Number(d.reply_hours) * 10) / 10,
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

  /**
   * A clinician signing themselves up.
   *
   * Everything the ranking reads is asked for here, because a doctor who
   * registers has to be able to reach the top of the list on merit. The one
   * that matters most is `qualification`: it is worth up to 60 of the ~110
   * points, so leaving it out would file every new registration below a
   * seeded row forever. It is a free-text field on purpose — a clinician
   * writes what is on their certificate, not what fits our dropdown.
   *
   * Nothing here is a credential check. We store what they claim and the
   * licence number they claim it under; the interface says exactly that
   * rather than implying an approval step that nobody is performing.
   */
  async register(input = {}) {
    const name = clean(input.name, 120);
    const specialty = clean(input.specialty, 80);
    const qualification = clean(input.qualification, 160);
    const licenseNo = clean(input.licenseNo, 40);
    const email = clean(input.email, 160).toLowerCase();
    const phone = clean(input.phone, 40);
    const years = Math.max(0, Math.min(60, Math.round(Number(input.years) || 0)));

    if (name.length < 3) throw invalid('name', 'Please give your full name');
    if (!specialty) throw invalid('specialty', 'Please choose a specialty');
    if (qualification.length < 4) {
      throw invalid('qualification', 'Please list your qualifications as they appear on your certificate');
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw invalid('email', 'That does not look like an email address');
    }
    // loose on purpose: numbers are written a dozen ways here, and a format
    // rule that rejects a real number is worse than one that accepts a typo
    if (phone.replace(/\D/g, '').length < 6) throw invalid('phone', 'Please give a phone number');
    if (licenseNo.length < 3) throw invalid('licenseNo', 'Please give your medical licence number');

    const taken = await db.one(
      `SELECT lower(email) = $1 AS by_email FROM doctors
        WHERE lower(email) = $1 OR lower(license_no) = $2 LIMIT 1`,
      [email, licenseNo.toLowerCase()],
    );
    if (taken) {
      throw taken.by_email
        ? invalid('email', 'A clinician is already registered with that email')
        : invalid('licenseNo', 'A clinician is already registered under that licence number');
    }

    const row = await db.insert(
      `INSERT INTO doctors (name, specialty, qualification, years,
                            email, phone, license_no, available, patients, capacity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, 0, 30)
       RETURNING id`,
      [name, specialty, qualification, years, email, phone, licenseNo],
    );

    return this.find(row.id);
  },

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

    // the prior an unrated clinician is held at, taken from the roster she is
    // actually choosing among rather than from a number picked in advance
    const rated = doctors.filter((d) => d.rating != null);
    const average = rated.length
      ? rated.reduce((n, d) => n + d.rating, 0) / rated.length
      : 4;

    return doctors
      .map((d) => {
        const qual = qualificationScore({ qualification: d.qualification, years: d.years });
        const avail = availabilityScore(d.load);
        const relevant = !pattern || pattern.test(d.specialty);
        const stars = ratingScore(d.rating, average);
        const reply = responseScore(d.answered, d.replyHours);

        const tier = !d.bookable ? 2 : relevant ? 0 : 1;

        const reasons = [];
        if (relevant && pattern) reasons.push(`Specialises in ${d.specialty.toLowerCase()}`);
        if (qual >= 40) reasons.push('Senior specialist qualification');
        else if (qual >= 25) reasons.push('Specialist qualified');
        if (d.status === 'open') reasons.push(`${d.openings} places left on their list`);
        // "usually answers same day" used to hang off an empty queue, which
        // was a guess dressed as a fact — and once reply times were measured
        // it could contradict them on the same card. The queue says what is
        // in front of her; how fast they answer is said below, from the record.
        if (d.bookable && d.queue === 0) reasons.push('Nothing waiting to be answered');
        else if (d.bookable) reasons.push(`${d.queue} request${d.queue > 1 ? 's' : ''} ahead of you`);
        if (d.answered >= 2 && d.replyHours != null) {
          reasons.push(d.replyHours <= 24
            ? `Answers requests within a day`
            : `Takes about ${Math.round(d.replyHours / 24)} days to answer`);
        }
        if (d.rating == null) reasons.push('New here — not rated yet');
        if (d.status === 'away') reasons.push('Currently on leave');
        if (d.status === 'full') reasons.push('List is full — not taking new requests');
        if (!relevant && d.bookable) reasons.push('A different specialty to what you need now');

        return {
          ...d,
          tier,
          relevant,
          score: qual + avail + stars + reply,
          breakdown: {
            qualification: qual, availability: avail, rating: stars, response: reply,
          },
          reasons,
        };
      })
      // the tie-break is the queue: same score, so send her to whoever has
      // fewer people already waiting
      .sort((a, b) => a.tier - b.tier || b.score - a.score || a.queue - b.queue);
  },
};

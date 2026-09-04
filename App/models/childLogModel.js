/**
 * Child Log Model — the daily check-in for a baby or young child.
 *
 * Mirrors `dailyLogModel`, which asks a woman about herself. That set of
 * questions — mood, kicks, water, sleep — is right while she is pregnant and
 * wrong the day after. A mother of a four-month-old is not counting kicks; she
 * is counting feeds and wet nappies, and those are the first numbers a
 * paediatrician asks for when something is wrong.
 *
 * Same partial-update rule as the mother's log: sending one field must not
 * blank the others, because the check-in is answered in pieces across a day
 * that a parent does not control.
 */
const db = require('../config/db');

const MOODS = ['Content', 'Fussy', 'Sleepy', 'Playful', 'Unsettled'];
const MAX_NOTE = 2000;

const pad = (n) => String(n).padStart(2, '0');
/** Local calendar date — their "today", not UTC's. */
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toDTO = (r) => ({
  date: r.date,
  feeds: r.feeds ?? undefined,
  wetNappies: r.wet_nappies ?? undefined,
  sleepHours: r.sleep_hours ?? undefined,
  tempC: r.temp_c ?? undefined,
  mood: r.mood || undefined,
  note: r.note || undefined,
});

/**
 * What is worth saying back about a day's entry.
 *
 * Only rules that are genuinely actionable and genuinely age-independent. The
 * wet-nappy count is the classic one — it is how a parent and a midwife tell
 * whether a baby is getting enough milk, before any weight is lost. The fever
 * threshold is the age-sensitive one, and it is the reason `ageMonths` is
 * passed in at all: a temperature that warrants a call at three weeks is
 * different from the same reading at three years.
 */
function flagsFor(entry, ageMonths) {
  const out = [];

  if (entry.tempC != null && entry.tempC >= 38) {
    out.push({
      level: ageMonths != null && ageMonths < 3 ? 'urgent' : 'warn',
      text: ageMonths != null && ageMonths < 3
        ? `${entry.tempC} °C in a baby under three months needs to be seen today, not watched.`
        : `${entry.tempC} °C is a fever. Keep fluids up and call if it holds or they seem unwell with it.`,
    });
  }

  if (entry.wetNappies != null && entry.wetNappies < 4 && (ageMonths == null || ageMonths < 12)) {
    out.push({
      level: 'warn',
      text: `${entry.wetNappies} wet nappies is fewer than usual. Under six a day in a young baby is worth mentioning — it is the earliest sign of not getting enough milk.`,
    });
  }

  if (entry.feeds != null && entry.feeds < 6 && (ageMonths == null || ageMonths < 6)) {
    out.push({
      level: 'watch',
      text: `${entry.feeds} feeds is on the low side for this age. Most babies under six months feed eight to twelve times in a day.`,
    });
  }

  return out;
}

module.exports = {
  MOODS,
  todayISO,
  flagsFor,

  /** One day, or an empty shape so the form has something to bind to. */
  async forDate(childId, date = todayISO()) {
    const row = await db.one(
      'SELECT * FROM child_logs WHERE child_id = $1 AND date = $2', [childId, date],
    );
    return row ? toDTO(row) : {
      date,
      feeds: undefined,
      wetNappies: undefined,
      sleepHours: undefined,
      tempC: undefined,
      mood: undefined,
      note: undefined,
    };
  },

  /** Oldest first, which is the order a chart wants to plot. */
  async history(childId, days = 14) {
    const rows = await db.sql(
      'SELECT * FROM child_logs WHERE child_id = $1 ORDER BY date DESC LIMIT $2',
      [childId, days],
    );
    return rows.reverse().map(toDTO);
  },

  /**
   * Write one day.
   *
   * COALESCE on every column so a partial update leaves the rest alone — the
   * same bug that had to be fixed on the mother's check-in, where sending
   * `{ kicks }` blanked her mood.
   */
  async save(childId, {
    date, feeds, wetNappies, sleepHours, tempC, mood, note,
  } = {}) {
    if (mood != null && !MOODS.includes(mood)) throw new Error(`Unknown mood: ${mood}`);
    const day = date || todayISO();
    const noteText = String(note || '').trim();
    if (noteText.length > MAX_NOTE) throw new Error('Child log notes must be 2,000 characters or fewer');

    await db.run(
      `INSERT INTO child_logs (child_id, date, feeds, wet_nappies, sleep_hours, temp_c, mood, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (child_id, date) DO UPDATE SET
         feeds       = COALESCE(EXCLUDED.feeds,       child_logs.feeds),
         wet_nappies = COALESCE(EXCLUDED.wet_nappies, child_logs.wet_nappies),
         sleep_hours = COALESCE(EXCLUDED.sleep_hours, child_logs.sleep_hours),
         temp_c      = COALESCE(EXCLUDED.temp_c,      child_logs.temp_c),
         mood        = COALESCE(EXCLUDED.mood,        child_logs.mood),
         note        = COALESCE(EXCLUDED.note,        child_logs.note)`,
      [childId, day,
        feeds ?? null, wetNappies ?? null, sleepHours ?? null,
        tempC ?? null, mood ?? null, noteText || null],
    );

    return this.forDate(childId, day);
  },

  /** Averages over the recent days, for the summary strip. */
  async summary(childId, days = 7) {
    const row = await db.one(
      `SELECT count(*)                              AS days,
              round(avg(feeds)::numeric, 1)         AS avg_feeds,
              round(avg(wet_nappies)::numeric, 1)   AS avg_nappies,
              round(avg(sleep_hours)::numeric, 1)   AS avg_sleep,
              mode() WITHIN GROUP (ORDER BY mood)   AS common_mood
         FROM (
           SELECT * FROM child_logs WHERE child_id = $1 ORDER BY date DESC LIMIT $2
         ) recent`,
      [childId, days],
    );

    return {
      days: row?.days ?? 0,
      avgFeeds: row?.avg_feeds ?? null,
      avgNappies: row?.avg_nappies ?? null,
      avgSleepHours: row?.avg_sleep ?? null,
      commonMood: row?.common_mood ?? null,
    };
  },
};

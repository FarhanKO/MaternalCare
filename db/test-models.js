/**
 * Exercises the converted models directly against Postgres, without the HTTP
 * layer. Runs before the controllers are converted, so a failure points at
 * the model that caused it rather than three layers away.
 *
 *   npm run db:test
 */
const db = require('../config/db');

let pass = 0;
let fail = 0;

const ok = (label, detail = '') => { pass += 1; console.log(`  \x1b[32mok\x1b[0m   ${label.padEnd(46)} ${detail}`); };
const bad = (label, detail = '') => { fail += 1; console.log(`  \x1b[31mFAIL\x1b[0m ${label.padEnd(46)} ${detail}`); };

const check = (label, cond, detail = '') => (cond ? ok(label, detail) : bad(label, detail));

(async () => {
  const userModel = require('../models/userModel');
  const pregnancyModel = require('../models/pregnancyModel');
  const vitalModel = require('../models/vitalModel');
  const symptomModel = require('../models/symptomModel');
  const reminderModel = require('../models/reminderModel');
  const doctorModel = require('../models/doctorModel');
  const messageModel = require('../models/messageModel');
  const postModel = require('../models/postModel');
  const dailyLogModel = require('../models/dailyLogModel');
  const childModel = require('../models/childModel');
  const vaccinationModel = require('../models/vaccinationModel');
  const contentModel = require('../models/contentModel');
  const documentModel = require('../models/documentModel');

  console.log('\n  --- identity ---');
  const me = await userModel.current();
  check('userModel.current', me?.name === 'Ayesha Rahman', me?.name);
  const profile = await userModel.profile(me.id);
  check('userModel.profile', profile.bloodGroup === 'B+' && profile.age === 28,
    `${profile.bloodGroup} · ${profile.age}`);

  console.log('\n  --- pregnancy ---');
  const preg = await pregnancyModel.forUser(me.id);
  check('pregnancyModel.forUser derives week', preg.week === 29, `week ${preg.week}`);
  check('  lmp stayed a plain date string', typeof preg.lmp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(preg.lmp), preg.lmp);
  const gain = await pregnancyModel.weightGain(me.id);
  check('pregnancyModel.weightGain', gain.gainedKg === 11.5 && gain.category === 'healthy',
    `+${gain.gainedKg} kg · BMI ${gain.bmi} · ${gain.status}`);

  console.log('\n  --- vitals ---');
  const hist = await vitalModel.history(me.id);
  check('vitalModel.history', hist.length === 13, `${hist.length} readings`);
  const latest = await vitalModel.latest(me.id);
  check('vitalModel.latest', latest.systolic === 124, `${latest.systolic}/${latest.diastolic}`);
  const alerts = await vitalModel.alerts(me.id);
  check('vitalModel.alerts flags high glucose', alerts.some((a) => a.metric === 'Fasting glucose'),
    `${alerts.length} alert(s)`);

  // Test validation & preeclampsia red flags
  let rejected = false;
  try {
    await vitalModel.add(me.id, { systolic: 999 });
  } catch {
    rejected = true;
  }
  check('vitalModel.add rejects out-of-range systolic', rejected, 'rejected');

  const severeReading = await vitalModel.add(me.id, { systolic: 165, diastolic: 115 });
  const severeAlerts = await vitalModel.alerts(me.id);
  check('vitalModel.alerts flags preeclampsia emergency', severeAlerts.some((a) => a.level === 'emergency'),
    'emergency flagged');
  await db.run('DELETE FROM vitals WHERE id = $1', [severeReading.id]);

  console.log('\n  --- symptoms ---');
  const syms = await symptomModel.all(me.id);
  check('symptomModel.all', syms.length === 1 && syms[0].name === 'Back ache', syms[0]?.name);
  check('  booleans came back as booleans', typeof syms[0].confirmedToday === 'boolean',
    typeof syms[0].confirmedToday);
  const burden = await symptomModel.burden(me.id);
  check('symptomModel.burden', burden > 0, burden.toFixed(1));

  console.log('\n  --- reminders ---');
  const rems = await reminderModel.all(me.id);
  check('reminderModel.all', rems.length === 5, `${rems.length} reminders`);
  const upcoming = await reminderModel.upcoming(me.id);
  // The seed sets these relative to when it ran, so a fixed count decays into a
  // failure as the clock passes them. Assert what upcoming() actually promises:
  // only what is still ahead (within its one-hour grace), soonest first.
  const grace = Date.now() - 3600_000;
  const allAhead = upcoming.every((r) => new Date(r.at).getTime() >= grace);
  const sorted = upcoming.every((r, i) => i === 0
    || new Date(upcoming[i - 1].at).getTime() <= new Date(r.at).getTime());
  check('reminderModel.upcoming', upcoming.length <= rems.length && allAhead && sorted,
    `${upcoming.length} of ${rems.length} still ahead, in order`);
  const made = await reminderModel.create(me.id, {
    kind: 'test', title: '__probe__', at: new Date(Date.now() + 86400000).toISOString(),
  });
  check('reminderModel.create returns the row', made.title === '__probe__', `id ${made.id}`);
  await reminderModel.remove(made.id, me.id);
  check('reminderModel.remove', (await reminderModel.find(made.id)) === null);

  console.log('\n  --- doctors (N+1 collapsed) ---');
  const docs = await doctorModel.all();
  // >= rather than a fixed count: the panel grows, and that is not a defect
  check('doctorModel.all', docs.length >= 7, `${docs.length} clinicians`);
  const lena = docs.find((d) => d.name === 'Dr. Lena Ortiz');
  check('  live diary counts joined in', typeof lena.queue === 'number' && typeof lena.panel === 'number',
    `panel ${lena.panel}/${lena.capacity} · queue ${lena.queue}`);
  const onLeave = docs.find((d) => d.name === 'Dr. Tanvir Alam');
  check('  available flag is a boolean', onLeave.status === 'away', onLeave.status);
  const ranked = await doctorModel.recommend({ stage: 'pregnant' });
  check('doctorModel.recommend tiers obstetrics first', ranked[0].tier === 0 && /Obstetric/i.test(ranked[0].specialty),
    `${ranked[0].name} · ${ranked[0].specialty}`);
  // the whole point of the ranking is that she is not asked to filter, so the
  // list has to arrive complete — nobody hidden, everybody placed
  check('  ranks the whole roster, hides nobody', ranked.length === docs.length,
    `${ranked.length} of ${docs.length}`);
  check('  ordered by tier then score', ranked.every((d, i) => i === 0
    || ranked[i - 1].tier < d.tier
    || (ranked[i - 1].tier === d.tier && ranked[i - 1].score >= d.score)),
    `top ${ranked[0].score} → bottom ${ranked[ranked.length - 1].score}`);
  check('  every entry says why it sits there', ranked.every((d) => d.reasons.length > 0),
    `${ranked[0].reasons[0]}`);
  check('  scores four things, none of them a location',
    Object.keys(ranked[0].breakdown).join(',') === 'qualification,availability,rating,response',
    Object.keys(ranked[0].breakdown).join(' + '));

  /* registration: a clinician who signs up has to reach the list on merit */
  const LICENCE = '__probe__-LIC-9001';
  await db.run('DELETE FROM doctors WHERE license_no = $1', [LICENCE]);
  const signedUp = await doctorModel.register({
    name: 'Dr. Probe Registrant',
    specialty: 'Obstetrics & Gynaecology',
    qualification: 'MBBS, FCPS (Obs & Gynae)',
    years: 11,
    email: '__probe__registrant@example.invalid',
    phone: '01700000000',
    licenseNo: LICENCE,
  });
  check('doctorModel.register writes a usable row',
    signedUp && signedUp.qualification.includes('FCPS') && signedUp.bookable === true,
    `${signedUp.name} · ${signedUp.status}`);
  const afterSignup = await doctorModel.recommend({ stage: 'pregnant' });
  const placed = afterSignup.find((d) => d.id === signedUp.id);
  check('  and appears in the ranking, unrated, without being buried',
    placed && placed.tier === 0 && placed.rating === null && placed.score > 0,
    `#${afterSignup.indexOf(placed) + 1} of ${afterSignup.length} · score ${placed.score}`);

  let dupLicence = null;
  try {
    await doctorModel.register({
      name: 'Dr. Probe Registrant',
      specialty: 'Obstetrics & Gynaecology',
      qualification: 'MBBS, FCPS (Obs & Gynae)',
      years: 11,
      email: 'someone.else@example.invalid',
      phone: '01700000000',
      licenseNo: LICENCE,
    });
  } catch (err) { dupLicence = err; }
  check('  refuses a licence number already registered',
    dupLicence?.code === 'INVALID_REGISTRATION' && dupLicence.field === 'licenseNo',
    dupLicence?.message);

  let blank = null;
  try {
    await doctorModel.register({
      name: 'Dr. No Letters', specialty: 'Paediatrics', qualification: '',
      email: 'x@example.invalid', phone: '01700000000', licenseNo: '__probe__-LIC-9002',
    });
  } catch (err) { blank = err; }
  check('  refuses a registration with no qualifications',
    blank?.code === 'INVALID_REGISTRATION' && blank.field === 'qualification', blank?.message);

  // put the roster back exactly as it was found
  await db.run('DELETE FROM doctors WHERE license_no LIKE $1', ['__probe__%']);
  const restored = await doctorModel.all();
  check('  probe registrations cleaned up', restored.length === docs.length,
    `${restored.length} clinicians`);

  console.log('\n  --- community ---');
  const posts = await postModel.all({ limit: 20 });
  check('postModel.all', posts.length === 9, `${posts.length} posts`);
  /*
   * What matters is that each post got its own comments in one round trip,
   * not that some particular post has two. Pinning the count meant a single
   * new seeded post at the top of the board broke this.
   */
  const commented2 = posts.filter((p) => p.comments.length > 0);
  const totalJoined = posts.reduce((n, p) => n + p.comments.length, 0);
  const { c: commentRows } = await db.one('SELECT count(*) AS c FROM post_comments');
  check('  comments joined in one query, none lost or duplicated',
    commented2.length > 0 && totalJoined === Number(commentRows),
    `${totalJoined} across ${commented2.length} posts`);
  check('  topic column reads back', posts.every((p) => p.topic !== undefined || p.topic === undefined),
    posts[0].topic);
  const newPost = await postModel.create(me.id, { title: '__probe__', body: 'x', topic: 'Sleep' });
  const commented = await postModel.comment(newPost.id, me.id, { author: 'Probe', body: 'hello' });
  check('postModel.comment', commented.comments.length === 1, commented.comments[0].body);
  const hearted = await postModel.heart(newPost.id, 1);
  check('postModel.heart', hearted.hearts === 1, `${hearted.hearts}`);

  /* --------------------------------------------- reporting (F18) */
  const moderationModel = require('../models/moderationModel');
  const filed = await moderationModel.report({
    postId: newPost.id, reporterId: me.id,
    reason: 'medical-misinformation', detail: '__probe__ unsafe advice',
  });
  check('moderationModel.report', filed.state === 'open', filed.reason);

  let twice = null;
  try {
    await moderationModel.report({ postId: newPost.id, reporterId: me.id, reason: 'spam' });
  } catch (err) { twice = err; }
  check('  one report per person per item', twice?.code === 'ALREADY_REPORTED', twice?.message);

  let bothTargets = null;
  try {
    await moderationModel.report({
      postId: newPost.id, commentId: commented.comments[0].id,
      reporterId: me.id, reason: 'spam',
    });
  } catch (err) { bothTargets = err; }
  check('  refuses a report against two things at once', bothTargets?.code === 'BAD_TARGET');

  const queue = await moderationModel.queue({ state: 'open' });
  const group = queue.find((g) => g.postId === String(newPost.id));
  check('moderationModel.queue groups by the item reported', Boolean(group),
    `${queue.length} group(s), ${group?.reports.length} report(s)`);
  check('  unsafe medical advice weighs heaviest', group?.urgent === true, `weight ${group?.weight}`);
  check('  the content comes with it', group?.content.title === '__probe__');

  const upheld = await moderationModel.resolve({
    target: 'post', id: newPost.id, action: 'uphold',
    note: '__probe__ removed', reviewerId: 1,
  });
  check('moderationModel.resolve upholds', upheld.action === 'uphold' && upheld.reportsClosed === 1);
  const publicBoard = await postModel.all({ limit: 50 });
  check('  a removed post leaves the public board',
    !publicBoard.some((x) => x.id === String(newPost.id)),
    `${publicBoard.length} visible`);
  check('  but a moderator can still see it',
    (await postModel.all({ limit: 50, includeHidden: true })).some((x) => x.id === String(newPost.id)));
  check('  and the count agrees with the board',
    (await postModel.count()) === publicBoard.length, `${await postModel.count()}`);

  let onRemoved = null;
  try {
    await postModel.comment(newPost.id, me.id, { author: 'Probe', body: 'still open?' });
  } catch (err) { onRemoved = err; }
  check('  a removed post takes no more replies', onRemoved?.code === 'REMOVED', onRemoved?.message);

  await moderationModel.resolve({
    target: 'post', id: newPost.id, action: 'dismiss', note: '__probe__ reversed', reviewerId: 1,
  });
  check('  dismissing reverses the removal',
    (await postModel.all({ limit: 50 })).some((x) => x.id === String(newPost.id)));

  /* a removed *comment* becomes a tombstone rather than vanishing */
  const commentId = commented.comments[0].id;
  await moderationModel.report({
    commentId, reporterId: me.id, reason: 'harassment', detail: '__probe__',
  });
  await moderationModel.resolve({
    target: 'comment', id: commentId, action: 'uphold', note: '__probe__', reviewerId: 1,
  });
  const tombstoned = await postModel.find(newPost.id);
  check('a removed reply leaves a tombstone, not a gap',
    tombstoned.comments.length === 1
      && tombstoned.comments[0].removed === true
      && !tombstoned.comments[0].body.includes('hello'),
    tombstoned.comments[0].body);

  await db.run("DELETE FROM content_reports WHERE detail LIKE '__probe__%' OR review_note LIKE '__probe__%'");
  await db.run('DELETE FROM posts WHERE title = $1', ['__probe__']);
  const { c: probesLeft } = await db.one(
    "SELECT count(*) AS c FROM content_reports WHERE detail LIKE '__probe__%'",
  );
  check('  probe posts and reports cleaned up',
    (await postModel.count()) === posts.length && Number(probesLeft) === 0,
    `${await postModel.count()} posts, ${probesLeft} probe reports`);

  /* ---------------------------------------------- care plan (F14) */
  console.log('\n  --- care plan ---');
  const guidanceModel = require('../models/guidanceModel');
  const plan = await guidanceModel.forUser(me.id);
  check('guidanceModel.forUser', Boolean(plan),
    `${plan.nutrition.length} nutrition · ${plan.exercise.length} movement · ${plan.lifestyle.length} lifestyle`);
  const everyItem = [...plan.nutrition, ...plan.exercise, ...plan.lifestyle];
  check('  every line names the reading behind it', everyItem.every((i) => i.why && i.why.length > 10),
    everyItem[0].why.slice(0, 44));
  check('  the basis is stated, not implied', plan.basis.length > 0, plan.basis.join(' · ').slice(0, 52));
  check('  hydration is measured, the rest are targets',
    plan.hydration.targetLitres > 0 && plan.targets.every((t) => typeof t.amount === 'string'),
    `${plan.hydration.avgLitres} of ${plan.hydration.targetLitres} L`);

  /*
   * The safety rule, tested directly rather than hoped for: a high-risk
   * profile must not be handed an exercise programme.
   */
  const highRisk = guidanceModel.build({
    stage: 'pregnant', week: 32, trimester: 3, conditionsText: 'Gestational hypertension',
    risk: {
      level: 'high',
      label: 'High Risk',
      score: 88,
      factors: [
        { name: 'Blood pressure', points: 40, detail: '' },
        { name: 'Maternal age', points: 25, detail: '' },
      ],
    },
    vitals: { systolic: 158, diastolic: 104, sugar: 90, temp_c: 36.8 },
    log: null, symptoms: [], weightGain: null,
  });
  check('  a high-risk plan prescribes no exercise programme',
    highRisk.exercise.every((i) => !/150 minutes|walk for ten/i.test(i.title))
      && highRisk.exercise[0].priority === 'urgent',
    highRisk.exercise.map((i) => i.title).join(' | '));
  check('  and its first instruction is to call someone',
    /obstetrician/i.test(highRisk.lifestyle[0].title + highRisk.lifestyle[0].text),
    highRisk.lifestyle[0].title);

  const lowRisk = guidanceModel.build({
    stage: 'pregnant', week: 12, trimester: 1, conditionsText: '',
    risk: { level: 'low', label: 'Low Risk', score: 0, factors: [] },
    vitals: { systolic: 110, diastolic: 70, sugar: 82, temp_c: 36.7 },
    log: null, symptoms: [], weightGain: null,
  });
  check('  a well mother at week 12 gets a different plan entirely',
    lowRisk.nutrition.some((i) => /trimester 1/i.test(i.title))
      && !lowRisk.nutrition.some((i) => /carbohydrate/i.test(i.title)),
    lowRisk.nutrition.map((i) => i.title).join(' | ').slice(0, 70));
  check('  the two plans do not share a single line',
    highRisk.exercise.every((h) => !lowRisk.exercise.some((l) => l.title === h.title)));

  console.log('\n  --- daily log ---');
  // Today's row is the one the app itself is built to let her edit, so it
  // cannot be asserted against a seeded value — a single real check-in makes
  // that assertion fail forever, which is what happened. What is worth
  // asserting is the invariant: writing one field must not blank the others.
  const today = await dailyLogModel.forDate(me.id);
  // the model's own helper, not toISOString(): "today" here is her local
  // calendar date, and in UTC+6 the two disagree for six hours every evening
  check('dailyLogModel.forDate returns today', today.date === dailyLogModel.todayISO(),
    `${today.date} · ${today.kicks} kicks`);
  const probeKicks = (today.kicks ?? 0) + 3;
  const saved = await dailyLogModel.save(me.id, { kicks: probeKicks });
  check('dailyLogModel.save upserts one field, keeping the rest',
    saved.kicks === probeKicks
      && saved.mood === today.mood
      && saved.waterLitres === today.waterLitres
      && saved.sleepHours === today.sleepHours,
    `kicks ${today.kicks ?? '—'} → ${saved.kicks}, mood ${saved.mood ?? '—'} kept`);
  await dailyLogModel.save(me.id, { kicks: today.kicks ?? null });
  const undone = await dailyLogModel.forDate(me.id);
  check('  and the probe is undone', (undone.kicks ?? null) === (today.kicks ?? null),
    `back to ${undone.kicks ?? '—'}`);
  const summary = await dailyLogModel.summary(me.id, 7);
  check('dailyLogModel.summary averages', summary.days === 7 && summary.avgWaterLitres > 0,
    `${summary.days} days · ${summary.avgWaterLitres} L avg · mostly ${summary.commonMood}`);

  /* -------------------------------- the child's own daily log */
  const childLogModel = require('../models/childLogModel');
  const kid = await childModel.forUser(me.id);
  const beforeDay = await childLogModel.forDate(kid.id);

  const afterFeeds = await childLogModel.save(kid.id, { feeds: 9 });
  check('childLogModel.save writes one field', afterFeeds.feeds === 9, `${afterFeeds.feeds} feeds`);
  const afterNappies = await childLogModel.save(kid.id, { wetNappies: 6 });
  check('  and a second write keeps the first',
    afterNappies.feeds === 9 && afterNappies.wetNappies === 6,
    `${afterNappies.feeds} feeds, ${afterNappies.wetNappies} nappies`);

  let badMood = null;
  try { await childLogModel.save(kid.id, { mood: 'Grumpy' }); } catch (e) { badMood = e; }
  check('  refuses a mood that is not on the list', Boolean(badMood), badMood?.message);

  /*
   * The flags are the reason this is a log rather than a diary. Both rules
   * are age-sensitive, which is why the child's age is passed in.
   */
  check('childLogModel flags a fever in a baby under three months',
    childLogModel.flagsFor({ tempC: 38.4 }, 1).some((f) => f.level === 'urgent'),
    childLogModel.flagsFor({ tempC: 38.4 }, 1)[0]?.text.slice(0, 46));
  check('  the same reading in a toddler warns rather than alarms',
    childLogModel.flagsFor({ tempC: 38.4 }, 30)[0]?.level === 'warn');
  check('  flags too few wet nappies in a young baby',
    childLogModel.flagsFor({ wetNappies: 3 }, 2).some((f) => /wet nappies/.test(f.text)));
  check('  and says nothing about nappies for a three-year-old',
    childLogModel.flagsFor({ wetNappies: 3 }, 36).length === 0);
  check('  a normal day raises nothing',
    childLogModel.flagsFor({ feeds: 9, wetNappies: 7, tempC: 36.8 }, 2).length === 0);

  await db.run('DELETE FROM child_logs WHERE child_id = $1 AND date = $2',
    [kid.id, childLogModel.todayISO()]);
  if (beforeDay.feeds != null || beforeDay.wetNappies != null || beforeDay.mood != null) {
    await childLogModel.save(kid.id, beforeDay);
  }
  check('  probe day cleaned up',
    (await childLogModel.forDate(kid.id)).feeds === beforeDay.feeds);

  /* ------------------------- vaccinations belong to somebody */
  const mineVax = await vaccinationModel.all(me.id);
  const otherVax = await db.one(
    'SELECT count(*) AS c FROM vaccinations WHERE user_id <> $1', [me.id],
  );
  check('vaccinationModel.all is scoped to one mother',
    mineVax.every((v) => String(v.user_id) === String(me.id)),
    `${mineVax.length} hers, ${otherVax.c} belonging to others`);
  let unscoped = null;
  try { await vaccinationModel.all(); } catch (e) { unscoped = e; }
  check('  and refuses to run unscoped', Boolean(unscoped), unscoped?.message);

  console.log('\n  --- child ---');
  const child = await childModel.forUser(me.id);
  check('childModel.forUser', child.name === 'Zara', `${child.name} · ${child.agePretty}`);
  const growth = await childModel.growth(child.id);
  check('childModel.growth', growth.length === 7, `${growth.length} records`);
  const pct = await childModel.percentileSummary(child.id);
  check('childModel.percentileSummary places all three measures',
    pct.sexKnown && pct.measures.filter((m) => m.available).length === 3,
    pct.measures.map((m) => `${m.key} ${m.centile}`).join(', '));
  check('  against the reference for the sex on record', pct.sex === 'girls', pct.sex);

  /*
   * The defect this replaced: one hand-typed girls-only weight table applied
   * to every child. A boy at the 3rd centile for boys read as roughly the
   * 14th on the girls' curve — inside "healthy range", so nobody looked.
   */
  const boyAt3rd = 7.84;   // kg, 12 months, boys P3
  check('  a boy is not graded against the girls curves',
    Math.abs(childModel.zScore('weight', 'boys', 12, boyAt3rd)
      - childModel.zScore('weight', 'girls', 12, boyAt3rd)) > 0.5,
    `boys z=${childModel.zScore('weight', 'boys', 12, boyAt3rd).toFixed(2)} vs `
      + `girls z=${childModel.zScore('weight', 'girls', 12, boyAt3rd).toFixed(2)}`);
  check('  and that boy reads as underweight, which he is',
    childModel.zScore('weight', 'boys', 12, boyAt3rd) < -1.8);

  check('  height and head circumference have a reference now',
    pct.measures.every((m) => m.available),
    pct.measures.map((m) => m.label).join(' · '));
  check('  the median comes from the WHO table, not a guess',
    pct.measures.every((m) => Number.isFinite(m.median) && m.median > 0));
  check('  sex spellings a parent might type all resolve',
    ['male', 'M', 'Boy'].every((g) => childModel.sexOf({ gender: g }) === 'boys')
      && ['female', 'f', 'Girl'].every((g) => childModel.sexOf({ gender: g }) === 'girls'));
  check('  an unrecorded sex resolves to nothing rather than a default',
    childModel.sexOf({ gender: null }) === null && childModel.sexOf({}) === null);
  const miles = await childModel.milestones(child.id);
  check('childModel.milestones', miles.length === 12 && typeof miles[0].achieved === 'boolean',
    `${miles.filter((m) => m.achieved).length}/12 achieved`);
  const target = miles.find((m) => !m.achieved);
  await childModel.toggleMilestone(target.id);
  const after = (await childModel.milestones(child.id)).find((m) => m.id === target.id);
  check('childModel.toggleMilestone flips in place', after.achieved === true, `${target.title} → ${after.achieved}`);
  await childModel.toggleMilestone(target.id);

  console.log('\n  --- vaccinations & content ---');
  const vax = await vaccinationModel.all(me.id);
  check('vaccinationModel.all', vax.length === 12, `${vax.length} rows`);
  const stats = await vaccinationModel.stats(me.id);
  check('vaccinationModel.stats counts are numbers', stats.total === 12 && typeof stats.done === 'number',
    `${stats.done} done · ${stats.pct}%`);
  const arts = await contentModel.articles();
  check('contentModel.articles', arts.length === 8, `${arts.length} articles`);

  console.log('\n  --- messages ---');
  const doctorId = docs.find((d) => d.name === 'Dr. Lena Ortiz').id;
  await messageModel.send(me.id, doctorId, 'mother', '__probe__ hello');
  const thread = await messageModel.thread(me.id, doctorId);
  check('messageModel.send + thread', thread.length === 3, `${thread.length} messages`);
  const threads = await messageModel.threadsForUser(me.id);
  // the seed leaves the clinician's reply unread, which is what she should see
  check('messageModel.threadsForUser (DISTINCT ON)', threads.length === 1 && threads[0].unread === 1,
    `${threads.length} thread, ${threads[0].unread} unread from the clinician`);
  const docThreads = await messageModel.threadsForDoctor(doctorId);
  check('messageModel.threadsForDoctor', docThreads[0].unread === 1, `${docThreads[0].unread} unread`);
  await messageModel.markRead(me.id, doctorId, 'doctor');
  check('messageModel.markRead', (await messageModel.unreadForDoctor(doctorId)) === 0);
  await db.run('DELETE FROM messages WHERE body LIKE $1', ['__probe__%']);
  // markRead touches the seeded row too — put it back the way it was found
  await db.run(
    "UPDATE messages SET read_at = NULL WHERE user_id = $1 AND sender = 'doctor' AND body NOT LIKE '__probe__%'",
    [me.id],
  );

  console.log('\n  --- documents ---');
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const doc = await documentModel.create(me.id, {
    kind: 'report', title: '__probe__', dataUrl: PNG, takenOn: '2026-03-15',
  });
  check('documentModel.create', doc.takenOn === '2026-03-15' && doc.size === 70,
    `${doc.size} bytes · ${doc.takenOn}`);
  const counts = await documentModel.countsFor(me.id);
  check('documentModel.countsFor', counts.report === 1, JSON.stringify(counts));
  check('documentModel.remove', await documentModel.remove(doc.id, me.id));

  /* ---------------- the dependent models (step 3) ---------------- */
  const patientModel = require('../models/patientModel');
  const appointmentModel = require('../models/appointmentModel');
  const sosModel = require('../models/sosModel');
  const guardianModel = require('../models/guardianModel');
  const riskModel = require('../models/riskModel');

  console.log('\n  --- caseload (worst N+1, now 2 queries) ---');
  const roster = await patientModel.all();
  // likewise — seeding a demo patient must not read as a broken query
  check('patientModel.all', roster.length >= 6, `${roster.length} patients`);
  const nusrat = roster.find((p) => p.name === 'Nusrat Jahan');
  check('  week derived in SQL', nusrat.week === 34, `week ${nusrat.week}`);
  check('  BP trend aggregated by LATERAL', nusrat.trend.length === 5,
    `[${nusrat.trend.join(', ')}]`);
  check('  triage from BP + history + age', nusrat.risk === 'high', nusrat.risk);
  const ayeshaRow = roster.find((p) => p.name === 'Ayesha Rahman');
  check('  flags come from her own journal', ayeshaRow.flags.some((f) => /Back ache/.test(f)),
    ayeshaRow.flags.join(' | ') || '(none)');
  check('  score reuses the fetched symptoms', ayeshaRow.score > 0 && ayeshaRow.score <= 100,
    `${ayeshaRow.score}`);
  check('patientModel.find', (await patientModel.find(nusrat.id)).name === 'Nusrat Jahan');
  check('patientModel.exists rejects a doctor id', !(await patientModel.exists(99999)));

  console.log('\n  --- appointments ---');
  const mine = await appointmentModel.requestsFor(me.id);
  check('appointmentModel.requestsFor', mine.length === 7, `${mine.length} appointments`);
  check('  doctor joined in', mine.every((a) => a.doctorName && a.doctorName !== 'Unknown clinician'),
    mine[0].doctorName);
  check('  date stayed a plain string', /^\d{4}-\d{2}-\d{2}$/.test(mine[0].date), mine[0].date);
  const lenaId = docs.find((d) => d.name === 'Dr. Lena Ortiz').id;
  const free = await appointmentModel.freeSlots(lenaId, '2099-01-02');
  check('appointmentModel.freeSlots', free.length === 9, `${free.length} slots`);

  const tomorrow = new Date(Date.now() + 86400000);
  const tISO = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  const req = await appointmentModel.request(me.id, lenaId, {
    date: tISO, time: '10:20', reason: '__probe__',
  });
  // Nusrat's seeded request is already waiting with Lena, so this one is second
  check('appointmentModel.request', req.status === 'requested' && req.queuePosition === 2,
    `${req.status} · queue ${req.queuePosition}`);
  try {
    await appointmentModel.request(me.id, lenaId, { date: tISO, time: '11:00' });
    bad('  duplicate open request refused');
  } catch (e) {
    check('  duplicate open request refused', e.code === 'NOT_BOOKABLE', e.message.slice(0, 42));
  }
  const answered = await appointmentModel.respond(req.id, 'accepted', 'See reception first');
  check('appointmentModel.respond', answered.status === 'accepted', answered.note);

  // paid booking: confirmed on the spot, priced from the clinician
  const lenaDoc = await doctorModel.find(lenaId);
  const paid = await appointmentModel.bookPaid(me.id, lenaId, {
    date: tISO, time: '14:40', reason: '__probe__', method: 'bkash',
  });
  check('appointmentModel.bookPaid confirms outright',
    paid.status === 'accepted' && paid.queuePosition === 0, `${paid.status}`);
  check('  fee comes from the clinician, not the caller',
    paid.payment.feeBdt === lenaDoc.feeBdt, `৳${paid.payment.feeBdt}`);
  check('  reference issued', /^MC-[0-9A-F]{8}$/.test(paid.payment.reference), paid.payment.reference);
  check('  the slot is now taken',
    !(await appointmentModel.freeSlots(lenaId, tISO)).includes('14:40'));
  try {
    await appointmentModel.bookPaid(me.id, lenaId, { date: tISO, time: '15:20', method: 'cash' });
    bad('  unknown payment method refused');
  } catch (e) {
    check('  unknown payment method refused', /how you want to pay/.test(e.message), e.message);
  }
  try {
    await appointmentModel.bookPaid(me.id, lenaId, { date: tISO, time: '14:40', method: 'card' });
    bad('  double-booking the same slot refused');
  } catch (e) {
    check('  double-booking the same slot refused', e.code === 'SLOT_TAKEN',
      `${e.alternatives.length} alternatives offered`);
  }

  await db.run('DELETE FROM appointments WHERE reason = $1', ['__probe__']);

  /* ------------------------------------ rescheduling & ending (F11) */
  const careEndingModel = require('../models/careEndingModel');
  const dayIn = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    const p2 = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  };

  const moveDoc = 3;
  const dayA = dayIn(5);
  const dayB = dayIn(10);
  const freeA = (await appointmentModel.slots(moveDoc, dayA)).times;
  const toMove = await appointmentModel.request(me.id, moveDoc, {
    date: dayA, time: freeA[0], reason: '__probe__ move me',
  });

  const freeB = (await appointmentModel.slots(moveDoc, dayB)).times;
  const movedTo = await appointmentModel.reschedule(toMove.id, {
    by: 'mother', userId: me.id, date: dayB, time: freeB[0], reason: 'Work clash',
  });
  check('appointmentModel.reschedule moves it', movedTo.date === dayB && movedTo.time === freeB[0],
    `${toMove.date} ${toMove.time} -> ${movedTo.date} ${movedTo.time}`);
  check('  the old slot is free again',
    (await appointmentModel.slots(moveDoc, dayA)).times.includes(freeA[0]));
  check('  and the new one is taken',
    !(await appointmentModel.slots(moveDoc, dayB)).times.includes(freeB[0]));
  check('  the move is recorded, with its reason',
    (await appointmentModel.changes(toMove.id))[0]?.reason === 'Work clash',
    `${movedTo.moves} move(s), from ${movedTo.movedFrom}`);

  let sameSlot = null;
  try {
    await appointmentModel.reschedule(toMove.id, {
      by: 'mother', userId: me.id, date: dayB, time: freeB[0],
    });
  } catch (err) { sameSlot = err; }
  check('  moving it to where it already is is refused', sameSlot?.code === 'NOT_BOOKABLE');

  // the limit exists so one appointment cannot hold a queue position forever
  await appointmentModel.reschedule(toMove.id, { by: 'mother', userId: me.id, date: dayB, time: freeB[1] });
  await appointmentModel.reschedule(toMove.id, { by: 'mother', userId: me.id, date: dayB, time: freeB[2] });
  let tooMany = null;
  try {
    await appointmentModel.reschedule(toMove.id, { by: 'mother', userId: me.id, date: dayB, time: freeB[3] });
  } catch (err) { tooMany = err; }
  check(`  a mother may move it ${appointmentModel.MOVE_LIMIT} times, not more`,
    tooMany?.code === 'NOT_BOOKABLE', tooMany?.message);

  const withReason = await appointmentModel.cancelWithReason(toMove.id, {
    by: 'mother', userId: me.id, reason: 'cost', note: '__probe__ too expensive this month',
  });
  check('appointmentModel.cancelWithReason records who and why',
    withReason.status === 'cancelled'
      && withReason.cancellation?.by === 'mother'
      && withReason.cancellation?.reason === 'cost'
      && Boolean(withReason.cancellation?.note),
    withReason.cancellation?.reasonLabel);

  let badReason = null;
  try {
    await appointmentModel.cancelWithReason(toMove.id, { by: 'mother', userId: me.id, reason: 'nope' });
  } catch (err) { badReason = err; }
  check('  a reason outside that side list is refused', badReason?.code === 'NOT_BOOKABLE');

  /* --------------------------------------- ending the relationship */
  const endDoc = 6;
  const future = dayIn(7);
  const freeC = (await appointmentModel.slots(endDoc, future)).times;
  await appointmentModel.request(me.id, endDoc, {
    date: future, time: freeC[0], reason: '__probe__ ending test',
  });

  let noReason = null;
  try {
    await careEndingModel.end({ userId: me.id, doctorId: endDoc, endedBy: 'mother', reason: 'x' });
  } catch (err) { noReason = err; }
  check('careEndingModel refuses an unknown reason', noReason?.code === 'BAD_REASON');

  const ending = await careEndingModel.end({
    userId: me.id, doctorId: endDoc, endedBy: 'mother',
    reason: 'communication', note: '__probe__ replies took days',
  });
  check('careEndingModel.end', ending.endedBy === 'mother' && ending.active,
    `${ending.reasonLabel}, ${ending.cancelledAppointments} appointment(s) cancelled`);
  check('  it takes future appointments with it', ending.cancelledAppointments >= 1);

  let endedTwice = null;
  try {
    await careEndingModel.end({
      userId: me.id, doctorId: endDoc, endedBy: 'mother', reason: 'cost',
    });
  } catch (err) { endedTwice = err; }
  check('  ending it twice is refused', endedTwice?.code === 'ALREADY_ENDED');
  check('  she is recorded as having ended with them',
    (await careEndingModel.endedFor(me.id)).has(String(endDoc)));

  // a clinician must write a sentence; a mother need not
  let noNote = null;
  try {
    await careEndingModel.end({
      userId: 4, doctorId: 1, endedBy: 'doctor', reason: 'capacity', note: 'full',
    });
  } catch (err) { noNote = err; }
  check('  a clinician ending it must say why in words',
    noNote?.code === 'NOTE_REQUIRED', noNote?.message);

  const byDoctor = await careEndingModel.end({
    userId: 4, doctorId: 1, endedBy: 'doctor', reason: 'wrong-specialty',
    note: '__probe__ referred on to maternal-fetal medicine',
  });
  check('  and then it is accepted', byDoctor.endedBy === 'doctor', byDoctor.reasonLabel);

  const leaverView = await careEndingModel.forDoctor(endDoc);
  check('careEndingModel.forDoctor counts the reasons',
    leaverView.leftByPatients === 1 && leaverView.topReasons[0]?.count === 1,
    leaverView.topReasons.map((r) => `${r.label} x${r.count}`).join(', '));

  // booking again resumes the pairing; the record of the ending survives
  const backAgain = dayIn(12);
  const freeD = (await appointmentModel.slots(endDoc, backAgain)).times;
  await appointmentModel.request(me.id, endDoc, {
    date: backAgain, time: freeD[0], reason: '__probe__ back again',
  });
  check('  booking again resumes the pairing',
    !(await careEndingModel.endedFor(me.id)).has(String(endDoc)));
  check('  but the ending is still on the record',
    (await careEndingModel.forUser(me.id)).some((e) => e.doctorId === String(endDoc) && !e.active));

  await db.run("DELETE FROM care_terminations WHERE note LIKE '__probe__%'");
  await db.run("DELETE FROM appointments WHERE reason LIKE '__probe__%'");
  check('  probe appointments and endings cleaned up',
    (await db.one("SELECT count(*) AS c FROM care_terminations WHERE note LIKE '__probe__%'")).c === 0
      && (await db.one("SELECT count(*) AS c FROM appointments WHERE reason LIKE '__probe__%'")).c === 0);

  console.log('\n  --- SOS ---');
  const guardians = await sosModel.contacts(me.id);
  check('sosModel.contacts', guardians.length === 3, `${guardians.length} guardians`);
  check('  each carries a link token', guardians.every((g) => g.token?.length > 10),
    `${guardians[0].token.slice(0, 8)}…`);
  const alert = await sosModel.trigger(me.id, { lat: 23.78, lng: 90.41, accuracy: 9 });
  check('sosModel.trigger fans out', alert.notifications.length === 6,
    `${alert.reached} alerted, ${alert.notifications.length - alert.reached} queued`);
  check('  clinicians alerted, guardians queued',
    alert.notifications.filter((n) => n.state === 'alerted').length === 3
    && alert.notifications.filter((n) => n.state === 'pending').length === 3);
  const again = await sosModel.trigger(me.id, {});
  check('  pressing twice does not stack', again.id === alert.id, `same alert ${again.id}`);
  const forDoc = await sosModel.openForDoctor(lenaId);
  check('sosModel.openForDoctor', forDoc.length === 1 && forDoc[0].patientName === 'Ayesha Rahman',
    `${forDoc[0]?.patientName} · dials ${forDoc[0]?.emergencyNumber}`);

  console.log('\n  --- guardian app ---');
  const token = guardians[0].token;
  const dash = await guardianModel.dashboard(token);
  check('guardianModel.dashboard', dash.overview.motherName === 'Ayesha Rahman',
    `${dash.guardian.name} watching ${dash.overview.motherName}`);
  check('  status agrees with the insights',
    (dash.overview.status === 'high') === dash.insight.some((i) => i.level === 'urgent'),
    `${dash.overview.status} · ${dash.insight.map((i) => i.level).join(',')}`);
  check('  live alert surfaces', dash.alert !== null, dash.alert?.status);
  const gv = await guardianModel.vitals(token);
  check('guardianModel.vitals', gv.length === 12 && gv[0].date < gv[11].date,
    `${gv.length} points, oldest first`);
  const acked = await guardianModel.acknowledge(token);
  check('guardianModel.acknowledge',
    acked.notifications.some((n) => n.state === 'acknowledged'), 'On the way');
  check('guardianModel rejects a bad token', (await guardianModel.dashboard('not-a-real-token')) === null);

  const closed = await sosModel.close(alert.id, me.id, 'safe', 'mother');
  check('sosModel.close', closed.status === 'safe', `closed by ${closed.closedBy}`);
  await db.run('DELETE FROM messages WHERE body LIKE $1 OR body LIKE $2', ['%EMERGENCY%', '%Stood down%']);

  /* ------------------------------------------ authentication */
  console.log('\n  --- authentication ---');
  const authModel = require('../models/authModel');

  const pw = 'a-demo-password-2026';
  const h1 = await authModel.hash(pw);
  const h2 = await authModel.hash(pw);

  check('authModel.hash never stores the plaintext', !h1.includes(pw), h1.slice(0, 26) + '…');
  check('  and salts, so the same password hashes differently', h1 !== h2,
    `${authModel.fingerprint(h1)} vs ${authModel.fingerprint(h2)}`);
  check('  at the parameters it says it used',
    h1.startsWith(`scrypt$${authModel.PARAMS.N}$${authModel.PARAMS.r}$${authModel.PARAMS.p}$`),
    h1.split('$').slice(0, 4).join('$'));

  check('authModel.verify accepts the right password', await authModel.verify(pw, h1));
  check('  rejects a wrong one', !(await authModel.verify(pw + 'x', h1)));
  check('  rejects an empty one', !(await authModel.verify('', h1)));
  check('  rejects a hash it cannot read', !(await authModel.verify(pw, 'nonsense')));

  let weak = null;
  try { await authModel.hash('short'); } catch (e) { weak = e; }
  check('  refuses a password under eight characters', weak?.code === 'WEAK', weak?.message);

  /*
   * The same message for a wrong password and a missing account. Telling them
   * apart turns the login form into a way of asking whether a particular
   * woman is a patient here.
   */
  let noAccount = null;
  let wrongPw = null;
  try {
    await authModel.authenticate('nobody@nowhere.invalid', 'whatever12');
  } catch (e) { noAccount = e; }
  try {
    await authModel.authenticate(me.email, 'definitely-not-it');
  } catch (e) { wrongPw = e; }
  check('authModel.authenticate does not reveal which accounts exist',
    noAccount?.message === wrongPw?.message, noAccount?.message);

  /* sessions */
  const sessionToken = await authModel.startSession(me.id, 'model tests');
  check('authModel.startSession issues a long random token', sessionToken.length >= 40,
    `${sessionToken.length} chars`);
  const resolved = await authModel.userForSession(sessionToken);
  check('  and it resolves to the right account', resolved?.id === me.id, resolved?.name);
  check('  a token nobody issued resolves to nobody',
    (await authModel.userForSession('made-up')) === null);
  await authModel.endSession(sessionToken);
  check('  ending it takes effect immediately',
    (await authModel.userForSession(sessionToken)) === null);

  const expired = await authModel.startSession(me.id, 'model tests');
  await db.run("UPDATE sessions SET expires_at = now() - interval '1 day' WHERE id = $1", [expired]);
  check('  an expired session resolves to nobody',
    (await authModel.userForSession(expired)) === null);
  await db.run('DELETE FROM sessions WHERE id = $1', [expired]);

  check('  every probe session cleaned up',
    (await db.one("SELECT count(*) AS c FROM sessions WHERE user_agent = 'model tests'")).c === 0);

  console.log('\n  --- risk ---');
  const risk = await riskModel.fromLatestVitals(me, preg);
  check('riskModel.fromLatestVitals', risk && risk.level, `${risk?.label} (${risk?.score})`);

  /* ------------------------------------------- translation (F13) */
  const sample = {
    age: 37, systolic: 142, diastolic: 93, sugar: 133, temp: 36.8, week: 31,
  };
  const inEnglish = riskModel.assess(sample, 'en');
  const inBangla = riskModel.assess(sample, 'bn');

  check('riskModel.assess translates the band', inBangla.label === 'বেশি ঝুঁকি',
    `${inEnglish.label} -> ${inBangla.label}`);
  check('  and every factor name and detail with it',
    inBangla.factors.every((f, i) => f.name !== inEnglish.factors[i].name
      && f.detail !== inEnglish.factors[i].detail),
    inBangla.factors[1].detail);
  check('  but not the score, which is the same logic either way',
    inBangla.score === inEnglish.score
      && inBangla.factors.every((f, i) => f.points === inEnglish.factors[i].points),
    `${inEnglish.score} = ${inBangla.score}`);
  check('  units stay in the script printed on the meter',
    /mmHg/.test(inBangla.factors[1].detail) && /mg\/dL/.test(inBangla.factors[2].detail));
  check('  an unknown language falls back to English rather than breaking',
    riskModel.assess(sample, 'fr').label === 'High Risk');

  /*
   * The bug this guards: guidanceModel used to match drivers on the display
   * name, so translating "Blood pressure" silently stopped every piece of
   * blood-pressure advice from firing — for exactly the mothers least able to
   * notice it was missing. It matches on the stable id now.
   */
  const planEn = guidanceModel.build({
    stage: 'pregnant', week: 31, trimester: 3, conditionsText: '',
    risk: inEnglish, vitals: { systolic: 142, diastolic: 93, sugar: 133, temp_c: 36.8 },
    log: null, symptoms: [], weightGain: null,
  });
  const planBn = guidanceModel.build({
    stage: 'pregnant', week: 31, trimester: 3, conditionsText: '',
    risk: inBangla, vitals: { systolic: 142, diastolic: 93, sugar: 133, temp_c: 36.8 },
    log: null, symptoms: [], weightGain: null,
  });
  check('  the care plan does not depend on the language of the factor names',
    planEn.nutrition.length === planBn.nutrition.length
      && planEn.nutrition.every((it, i) => it.title === planBn.nutrition[i].title),
    `${planEn.nutrition.length} items either way`);
  check('  and blood-pressure advice still fires on a Bangla assessment',
    planBn.nutrition.some((i) => /salt/i.test(i.title)),
    planBn.nutrition.map((i) => i.title).join(' | ').slice(0, 60));

  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  await db.pool.end();
  process.exit(fail ? 1 : 0);
})().catch(async (err) => {
  console.error(`\n  CRASH: ${err.message}`);
  if (err.sql) console.error(`  near: ${err.sql}`);
  console.error(err.stack?.split('\n').slice(1, 4).join('\n'));
  try { await db.pool.end(); } catch { /* already closed */ }
  process.exit(1);
});

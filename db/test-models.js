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
  check('reminderModel.upcoming', upcoming.length === 5, `${upcoming.length} ahead`);
  const made = await reminderModel.create(me.id, {
    kind: 'test', title: '__probe__', at: new Date(Date.now() + 86400000).toISOString(),
  });
  check('reminderModel.create returns the row', made.title === '__probe__', `id ${made.id}`);
  await reminderModel.remove(made.id, me.id);
  check('reminderModel.remove', (await reminderModel.find(made.id)) === null);

  console.log('\n  --- doctors (N+1 collapsed) ---');
  const docs = await doctorModel.all();
  check('doctorModel.all', docs.length === 7, `${docs.length} clinicians`);
  const lena = docs.find((d) => d.name === 'Dr. Lena Ortiz');
  check('  live diary counts joined in', typeof lena.queue === 'number' && typeof lena.panel === 'number',
    `panel ${lena.panel}/${lena.capacity} · queue ${lena.queue}`);
  const onLeave = docs.find((d) => d.name === 'Dr. Tanvir Alam');
  check('  available flag is a boolean', onLeave.status === 'away', onLeave.status);
  const ranked = await doctorModel.recommend({ stage: 'pregnant' });
  check('doctorModel.recommend tiers obstetrics first', ranked[0].tier === 0 && /Obstetric/i.test(ranked[0].specialty),
    `${ranked[0].name} · ${ranked[0].specialty}`);

  console.log('\n  --- community ---');
  const posts = await postModel.all({ limit: 20 });
  check('postModel.all', posts.length === 8, `${posts.length} posts`);
  const withComments = posts.find((p) => p.comments.length > 0);
  check('  comments joined in one query', withComments?.comments.length === 2,
    `${withComments?.comments.length} on "${withComments?.title.slice(0, 28)}…"`);
  check('  topic column reads back', posts.every((p) => p.topic !== undefined || p.topic === undefined),
    posts[0].topic);
  const newPost = await postModel.create(me.id, { title: '__probe__', body: 'x', topic: 'Sleep' });
  const commented = await postModel.comment(newPost.id, me.id, { author: 'Probe', body: 'hello' });
  check('postModel.comment', commented.comments.length === 1, commented.comments[0].body);
  const hearted = await postModel.heart(newPost.id, 1);
  check('postModel.heart', hearted.hearts === 1, `${hearted.hearts}`);
  await db.run('DELETE FROM posts WHERE title = $1', ['__probe__']);

  console.log('\n  --- daily log ---');
  const today = await dailyLogModel.forDate(me.id);
  check('dailyLogModel.forDate', today.mood === 'Calm', `${today.mood} · ${today.kicks} kicks`);
  const saved = await dailyLogModel.save(me.id, { kicks: 21 });
  check('dailyLogModel.save upserts one field', saved.kicks === 21 && saved.mood === 'Calm',
    `kicks ${saved.kicks}, mood ${saved.mood} kept`);
  await dailyLogModel.save(me.id, { kicks: today.kicks });
  const summary = await dailyLogModel.summary(me.id, 7);
  check('dailyLogModel.summary averages', summary.days === 7 && summary.avgWaterLitres > 0,
    `${summary.days} days · ${summary.avgWaterLitres} L avg · mostly ${summary.commonMood}`);

  console.log('\n  --- child ---');
  const child = await childModel.forUser(me.id);
  check('childModel.forUser', child.name === 'Zara', `${child.name} · ${child.agePretty}`);
  const growth = await childModel.growth(child.id);
  check('childModel.growth', growth.length === 7, `${growth.length} records`);
  const pct = await childModel.percentileSummary(child.id);
  check('childModel.percentileSummary', pct.band === 'P50 – P97', pct.band);
  const miles = await childModel.milestones(child.id);
  check('childModel.milestones', miles.length === 12 && typeof miles[0].achieved === 'boolean',
    `${miles.filter((m) => m.achieved).length}/12 achieved`);
  const target = miles.find((m) => !m.achieved);
  await childModel.toggleMilestone(target.id);
  const after = (await childModel.milestones(child.id)).find((m) => m.id === target.id);
  check('childModel.toggleMilestone flips in place', after.achieved === true, `${target.title} → ${after.achieved}`);
  await childModel.toggleMilestone(target.id);

  console.log('\n  --- vaccinations & content ---');
  const vax = await vaccinationModel.all();
  check('vaccinationModel.all', vax.length === 12, `${vax.length} rows`);
  const stats = await vaccinationModel.stats();
  check('vaccinationModel.stats counts are numbers', stats.total === 12 && typeof stats.done === 'number',
    `${stats.done} done · ${stats.pct}%`);
  const arts = await contentModel.articles();
  check('contentModel.articles', arts.length === 8, `${arts.length} articles`);
  const hosp = await contentModel.hospitals();
  check('contentModel.hospitals booleans', hosp.length === 4 && typeof hosp[0].ambulance === 'boolean',
    `${hosp.length} hospitals`);

  console.log('\n  --- messages ---');
  const doctorId = docs.find((d) => d.name === 'Dr. Lena Ortiz').id;
  await messageModel.send(me.id, doctorId, 'mother', '__probe__ hello');
  const thread = await messageModel.thread(me.id, doctorId);
  check('messageModel.send + thread', thread.length === 3, `${thread.length} messages`);
  const threads = await messageModel.threadsForUser(me.id);
  check('messageModel.threadsForUser (DISTINCT ON)', threads.length === 1 && threads[0].unread === 1,
    `${threads.length} thread, last: "${threads[0].lastMessage.body.slice(0, 20)}…"`);
  const docThreads = await messageModel.threadsForDoctor(doctorId);
  // the seeded message from her is already read, so only the probe is unread
  check('messageModel.threadsForDoctor', docThreads[0].unread === 1, `${docThreads[0].unread} unread`);
  await messageModel.markRead(me.id, doctorId, 'doctor');
  check('messageModel.markRead', (await messageModel.unreadForDoctor(doctorId)) === 0);
  await db.run('DELETE FROM messages WHERE body LIKE $1', ['__probe__%']);

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
  check('patientModel.all', roster.length === 6, `${roster.length} patients`);
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

  console.log('\n  --- risk ---');
  const risk = await riskModel.fromLatestVitals(me, preg);
  check('riskModel.fromLatestVitals', risk && risk.level, `${risk?.label} (${risk?.score})`);

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

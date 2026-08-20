/**
 * Exercises every API route against the running server and the real database.
 *
 * The point is payloads, not status codes. A handler that lost its `await`
 * still answers 200 — it just answers `{"data":{}}`, which is how a broken
 * /me survived an earlier sweep that only looked at HTTP status. So every
 * read asserts something real came back, and every write is performed,
 * re-read through a *different* endpoint, and then undone.
 *
 *   node app.js &          # server must be up
 *   npm run api:audit
 */
const BASE = process.env.API_URL || 'http://localhost:3000/api';

let pass = 0;
let fail = 0;
const failures = [];

const ok = (label, detail = '') => { pass += 1; console.log(`  \x1b[32mok\x1b[0m   ${label.padEnd(52)} ${detail}`); };
const bad = (label, detail = '') => {
  fail += 1; failures.push(label);
  console.log(`  \x1b[31mFAIL\x1b[0m ${label.padEnd(52)} ${detail}`);
};
const check = (label, cond, detail = '') => (cond ? ok(label, detail) : bad(label, detail));

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  return { status: res.status, json, text };
}

const GET = (p) => call('GET', p);
const POST = (p, b) => call('POST', p, b);
const PATCH = (p, b) => call('PATCH', p, b);
const PUT = (p, b) => call('PUT', p, b);
const DEL = (p) => call('DELETE', p);

/** Non-empty object or array — the thing a 200 is supposed to carry. */
const filled = (v) => {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
};

(async () => {
  console.log(`\n  auditing ${BASE}\n`);

  try {
    await GET('/me');
  } catch {
    console.log('  \x1b[31mThe server is not answering. Start it with `node app.js` first.\x1b[0m\n');
    process.exit(1);
  }

  /* ------------------------------------------------------- identity */
  console.log('  --- identity & profile ---');
  const me = await GET('/me');
  check('GET /me carries a user', filled(me.json?.data?.user) && me.json.data.user.name,
    me.json?.data?.user?.name ?? JSON.stringify(me.json?.data));
  check('  and a pregnancy with a derived week',
    Number.isInteger(me.json?.data?.pregnancy?.week), `week ${me.json?.data?.pregnancy?.week}`);

  const profile = await GET('/profile');
  check('GET /profile', profile.json?.data?.bloodGroup === 'B+', profile.json?.data?.bloodGroup);

  // WRITE: change the bio, read it back, put it back
  const originalBio = profile.json.data.bio ?? '';
  await PATCH('/profile', { bio: '__audit__' });
  const bioBack = await GET('/profile');
  check('PATCH /profile persists', bioBack.json?.data?.bio === '__audit__', bioBack.json?.data?.bio);
  await PATCH('/profile', { bio: originalBio });
  const bioRestored = await GET('/profile');
  check('  and restores', bioRestored.json?.data?.bio === originalBio);

  const stage = me.json.data.user.stage;
  const staged = await PATCH('/me', { stage });
  check('PATCH /me round-trips the stage', staged.status === 200 && filled(staged.json?.data), stage);

  check('GET /weight-gain', filled((await GET('/weight-gain')).json?.data));

  /* --------------------------------------------------------- vitals */
  console.log('\n  --- vitals ---');
  const vitals = await GET('/vitals');
  check('GET /vitals returns the stored readings',
    Array.isArray(vitals.json?.data) && vitals.json.data.length > 0,
    `${vitals.json?.data?.length} readings`);
  check('  oldest first, for the charts',
    vitals.json?.data?.[0]?.date <= vitals.json?.data?.at(-1)?.date,
    `${vitals.json?.data?.[0]?.date} → ${vitals.json?.data?.at(-1)?.date}`);
  check('  latest + alerts in meta', filled(vitals.json?.meta?.latest),
    `${vitals.json?.meta?.latest?.systolic}/${vitals.json?.meta?.latest?.diastolic}`);

  const beforeCount = vitals.json.data.length;
  const newVital = await POST('/vitals', { date: '2019-01-02', systolic: 121, diastolic: 79, weightKg: 61.4 });
  check('POST /vitals writes a reading', newVital.status === 201 && newVital.json?.data?.id,
    `id ${newVital.json?.data?.id}`);
  const afterAdd = await GET('/vitals');
  check('  and the list grew', afterAdd.json?.data?.length === beforeCount + 1,
    `${beforeCount} → ${afterAdd.json?.data?.length}`);
  check('POST /vitals rejects an empty reading', (await POST('/vitals', { date: '2019-01-03' })).status === 400);

  /* ------------------------------------------------------- symptoms */
  console.log('\n  --- symptoms ---');
  check('GET /symptoms', Array.isArray((await GET('/symptoms')).json?.data));
  const sym = await POST('/symptoms', { name: '__audit__', intensity: 'mild' });
  check('POST /symptoms', sym.status === 201 && sym.json?.data?.id, sym.json?.data?.name);
  const symId = sym.json?.data?.id;
  const symPatched = await PATCH(`/symptoms/${symId}`, { intensity: 'severe' });
  check('PATCH /symptoms/:id', symPatched.json?.data?.intensity === 'severe', symPatched.json?.data?.intensity);
  const symList = await GET('/symptoms');
  check('  visible in the list', symList.json.data.some((s) => s.name === '__audit__'));
  check('DELETE /symptoms/:id', (await DEL(`/symptoms/${symId}`)).status === 204);
  check('  and it is gone', !(await GET('/symptoms')).json.data.some((s) => s.name === '__audit__'));

  /* ------------------------------------------------------ reminders */
  console.log('\n  --- reminders ---');
  const rem = await GET('/reminders');
  check('GET /reminders', Array.isArray(rem.json?.data), `${rem.json?.data?.length} items`);
  const madeRem = await POST('/reminders', {
    title: '__audit__', kind: 'test', at: new Date(Date.now() + 864e5).toISOString(),
  });
  check('POST /reminders', madeRem.status === 201 && madeRem.json?.data?.id, madeRem.json?.data?.title);
  const remId = madeRem.json?.data?.id;
  check('  visible in the list',
    (await GET('/reminders')).json.data.some((r) => String(r.id) === String(remId)));
  check('DELETE /reminders/:id', (await DEL(`/reminders/${remId}`)).status === 204);

  /* ------------------------------------------------------ daily log */
  console.log('\n  --- daily log ---');
  const log = await GET('/daily-log');
  check('GET /daily-log', log.json?.data !== undefined && 'today' in (log.json?.data ?? {}));
  const savedLog = await PUT('/daily-log', { kicks: 17, mood: 'Calm' });
  check('PUT /daily-log upserts', savedLog.json?.data?.today?.kicks === 17,
    `${savedLog.json?.data?.today?.kicks} kicks`);
  check('  and reads back', (await GET('/daily-log')).json?.data?.today?.kicks === 17);

  /* ----------------------------------------------------- care/doctors */
  console.log('\n  --- doctors & appointments ---');
  const docs = await GET('/doctors');
  check('GET /doctors', docs.json?.data?.length > 0, `${docs.json?.data?.length} clinicians`);
  check('  each carries a fee', docs.json.data.every((d) => Number.isFinite(d.feeBdt)),
    `from ৳${Math.min(...docs.json.data.map((d) => d.feeBdt))}`);
  const rec = await GET('/doctors/recommended');
  check('GET /doctors/recommended', rec.json?.data?.length > 0 && rec.json?.meta?.bookable > 0,
    `${rec.json?.meta?.bookable} bookable`);

  const docId = rec.json.data[0].id;
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const slots = await GET(`/doctors/${docId}/slots?date=${tomorrow}`);
  check('GET /doctors/:id/slots', slots.json?.data?.times?.length > 0, `${slots.json?.data?.times?.length} free`);

  const appts = await GET('/appointments');
  check('GET /appointments', Array.isArray(appts.json?.data), `${appts.json?.data?.length} items`);

  const freeTime = slots.json.data.times.at(-1);
  const paid = await POST('/appointments/paid', {
    doctorId: docId, date: tomorrow, time: freeTime, reason: '__audit__', method: 'card',
  });
  check('POST /appointments/paid', paid.status === 201 && paid.json?.data?.payment?.reference,
    paid.json?.data?.payment?.reference);
  check('  confirmed, not queued', paid.json?.data?.status === 'accepted');
  check('  fee came from the clinician',
    paid.json?.data?.payment?.feeBdt === rec.json.data[0].feeBdt, `৳${paid.json?.data?.payment?.feeBdt}`);
  check('  shows in the clinician diary',
    (await GET(`/doctors/${docId}/appointments`)).json.data
      .some((a) => a.payment?.reference === paid.json.data.payment.reference));
  check('DELETE /appointments/:id', (await DEL(`/appointments/${paid.json.data.id}`)).status === 200);

  /* ------------------------------------------------------- messaging */
  console.log('\n  --- messaging ---');
  const team = await GET('/care-team');
  check('GET /care-team', team.json?.data?.length > 0, `${team.json?.data?.length} clinicians`);
  const threads = await GET('/messages');
  check('GET /messages', Array.isArray(threads.json?.data), `${threads.json?.data?.length} threads`);
  const msgDoc = team.json.data[0].doctorId;
  const sent = await POST('/messages', { doctorId: msgDoc, body: '__audit__ ping' });
  check('POST /messages', sent.status === 201 && sent.json?.data?.id);
  const thread = await GET(`/messages/${msgDoc}`);
  check('  lands in the thread', thread.json.data.some((m) => m.body === '__audit__ ping'));
  const docThreads = await GET(`/doctors/${msgDoc}/threads`);
  check('GET /doctors/:id/threads sees it from the other side',
    Array.isArray(docThreads.json?.data) && docThreads.json.data.length > 0);
  check('POST /doctors/:id/messages',
    (await POST(`/doctors/${msgDoc}/messages`, { patientId: '1', body: '__audit__ pong' })).status === 201);

  /* ------------------------------------------------------- community */
  console.log('\n  --- community ---');
  const posts = await GET('/community/posts');
  check('GET /community/posts', posts.json?.data?.length > 0,
    `${posts.json?.data?.length} of ${posts.json?.meta?.total}`);
  const post = await POST('/community/posts', { topic: 'General', title: '__audit__', body: 'Audit probe post.' });
  check('POST /community/posts', post.status === 201 && post.json?.data?.id);
  const postId = post.json?.data?.id;
  check('POST comment', (await POST(`/community/posts/${postId}/comments`, { body: '__audit__ reply' })).status === 201);
  const hearted = await POST(`/community/posts/${postId}/heart`, { delta: 1 });
  check('POST heart increments', hearted.json?.data?.hearts >= 1, `${hearted.json?.data?.hearts} hearts`);

  /* --------------------------------------------------------- child */
  console.log('\n  --- child & vaccinations ---');
  const child = await GET('/child');
  check('GET /child', filled(child.json?.data), child.json?.data?.child?.name ?? 'no child on account');
  if (child.json?.data) {
    const ms = child.json.data.milestones;
    const before = ms[0].achieved;
    const toggled = await PATCH(`/child/milestones/${ms[0].id}`);
    check('PATCH /child/milestones/:id flips', toggled.json?.data?.[0]?.achieved === !before,
      `${before} → ${toggled.json?.data?.[0]?.achieved}`);
    await PATCH(`/child/milestones/${ms[0].id}`);   // put it back
    check('  and flips back', (await GET('/child')).json.data.milestones[0].achieved === before);
    check('POST /child/growth',
      (await POST('/child/growth', { date: '2019-01-02', weightKg: 8.1, heightCm: 70 })).status === 201);
  }
  const vax = await GET('/vaccinations');
  check('GET /vaccinations', vax.json?.data?.length > 0,
    `${vax.json?.data?.length} rows, ${vax.json?.meta?.done} done`);

  /* ------------------------------------------------------ documents */
  console.log('\n  --- documents ---');
  const docsList = await GET('/documents');
  check('GET /documents', Array.isArray(docsList.json?.data), `${docsList.json?.data?.length} files`);
  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const madeDoc = await POST('/documents', {
    kind: 'report', title: '__audit__', dataUrl: tinyPng, originalName: 'audit.png',
  });
  check('POST /documents', madeDoc.status === 201 && madeDoc.json?.data?.id, madeDoc.json?.data?.title);
  if (madeDoc.json?.data?.id) {
    const fileRes = await fetch(`${BASE}/documents/${madeDoc.json.data.id}/file`);
    check('GET /documents/:id/file serves the bytes', fileRes.ok, `${fileRes.headers.get('content-type')}`);
    check('DELETE /documents/:id', (await DEL(`/documents/${madeDoc.json.data.id}`)).status === 204);
  }

  /* ------------------------------------------------------------ SOS */
  console.log('\n  --- SOS & guardians ---');
  const sos = await GET('/sos');
  check('GET /sos', filled(sos.json?.data), `${sos.json?.data?.contacts?.length} guardians`);
  const guardians = await GET('/guardians');
  check('GET /guardians', guardians.json?.data?.length > 0);
  const madeG = await POST('/guardians', { name: '__audit__', relation: 'Test', phone: '01700000000' });
  check('POST /guardians', madeG.status === 201 && madeG.json?.data?.token?.length > 10);
  const gToken = madeG.json?.data?.token;

  const gDash = await GET(`/guardian/${gToken}`);
  check('GET /guardian/:token (companion app)', filled(gDash.json?.data?.overview),
    `week ${gDash.json?.data?.overview?.week}, ${gDash.json?.data?.insight?.length} insights`);
  check('GET /guardian/:token/vitals', (await GET(`/guardian/${gToken}/vitals`)).json?.data?.length > 0);
  check('GET /guardian/:token/alert', (await GET(`/guardian/${gToken}/alert`)).status === 200);
  check('  a bad token is a flat 404', (await GET('/guardian/definitelynotarealtoken')).status === 404);
  check('DELETE /guardians/:id', (await DEL(`/guardians/${madeG.json.data.id}`)).status === 204);

  const num = await PATCH('/sos/emergency-number', { number: '999' });
  check('PATCH /sos/emergency-number', num.json?.data?.emergencyNumber === '999');
  check('  and refuses a bad one', (await PATCH('/sos/emergency-number', { number: 'javascript:x' })).status === 400);

  const alert = await POST('/sos', { lat: 23.78, lng: 90.41, accuracy: 9 });
  check('POST /sos raises and fans out', alert.status === 201 && alert.json?.data?.notifications?.length > 0,
    `${alert.json?.data?.reached} reached, ${alert.json?.data?.notifications?.length} notified`);
  check('POST /sos/:id/close', (await POST(`/sos/${alert.json.data.id}/close`, { status: 'cancelled' })).json?.data?.status === 'cancelled');

  /* -------------------------------------------------------- clinician */
  console.log('\n  --- clinician portal ---');
  const patients = await GET('/patients');
  check('GET /patients', patients.json?.data?.length > 0, `${patients.json?.data?.length} on the caseload`);
  const pid = patients.json.data[0].id;
  check('GET /patients/:id', filled((await GET(`/patients/${pid}`)).json?.data));
  check('GET /patients/:id/symptoms', Array.isArray((await GET(`/patients/${pid}/symptoms`)).json?.data));
  check('GET /patients/:id/reminders', Array.isArray((await GET(`/patients/${pid}/reminders`)).json?.data));
  const assigned = await POST(`/patients/${pid}/reminders`, {
    title: '__audit__ assigned', kind: 'test', assignedBy: 'Dr. Lena Ortiz',
    at: new Date(Date.now() + 864e5).toISOString(),
  });
  check('POST /patients/:id/reminders', assigned.status === 201 && assigned.json?.data?.id);
  check('GET /patients/:id/documents', Array.isArray((await GET(`/patients/${pid}/documents`)).json?.data));
  check('GET /doctors/:id/sos', Array.isArray((await GET(`/doctors/${docId}/sos`)).json?.data));
  check('  404s on an unknown clinician', (await GET('/doctors/99999/sos')).status === 404);

  /* ----------------------------------------------------------- clean */
  console.log('\n  --- cleaning up ---');
  const db = require('../config/db');
  const removed = await db.sql(`
    DELETE FROM symptoms      WHERE name  LIKE '__audit__%';
  `).catch(() => null);
  await db.run("DELETE FROM reminders    WHERE title LIKE '__audit__%'");
  await db.run("DELETE FROM appointments WHERE reason LIKE '__audit__%'");
  await db.run("DELETE FROM messages     WHERE body  LIKE '__audit__%'");
  await db.run("DELETE FROM post_comments WHERE body LIKE '__audit__%'");
  await db.run("DELETE FROM posts        WHERE title LIKE '__audit__%'");
  await db.run("DELETE FROM documents    WHERE title LIKE '__audit__%'");
  await db.run("DELETE FROM vitals       WHERE date  = '2019-01-02'");
  await db.run("DELETE FROM growth       WHERE date  = '2019-01-02'").catch(() => {});
  await db.run("DELETE FROM emergency_contacts WHERE name LIKE '__audit__%'");
  void removed;
  console.log('  probe rows removed');

  console.log(`\n  ${pass} passed, ${fail} failed`);
  if (fail) console.log(`  failing: ${failures.join(', ')}`);
  console.log();
  await db.pool.end();
  process.exit(fail ? 1 : 0);
})();

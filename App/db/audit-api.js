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
/** The same host without /api, for the file endpoints that return raw bytes. */
const ORIGIN = BASE.replace(/\/api$/, '');

let pass = 0;
let fail = 0;
const failures = [];

const ok = (label, detail = '') => { pass += 1; console.log(`  \x1b[32mok\x1b[0m   ${label.padEnd(52)} ${detail}`); };
const bad = (label, detail = '') => {
  fail += 1; failures.push(label);
  console.log(`  \x1b[31mFAIL\x1b[0m ${label.padEnd(52)} ${detail}`);
};
const check = (label, cond, detail = '') => (cond ? ok(label, detail) : bad(label, detail));

/*
 * The audit signs in like a browser does.
 *
 * Every endpoint below /api now needs a session, so the cookie has to be
 * carried between requests. Node's fetch has no cookie jar, and one variable
 * is smaller than a dependency.
 */
let cookie = null;

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const set = res.headers.getSetCookie?.() ?? [];
  for (const c of set) {
    const [pair] = c.split(';');
    if (pair.startsWith('mc_session=')) {
      cookie = pair.endsWith('=') ? null : pair;   // cleared on logout
    }
  }

  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  return { status: res.status, json, text };
}

/**
 * A raw fetch that still carries the session.
 *
 * `call` is for JSON; the endpoints that stream bytes — a document, a post
 * image, the PDF — need the response object itself. They still need the
 * cookie, which was the one thing that broke when the API stopped being open.
 */
function authed(url, init) {
  return fetch(url, {
    ...init,
    headers: { ...(init?.headers || {}), ...(cookie ? { Cookie: cookie } : {}) },
  });
}

/** Sign in as one of the seeded accounts. */
async function signIn(email, password = 'demo-mother-2026') {
  const r = await call('POST', '/auth/login', { email, password });
  return r.status === 200 ? r.json.data.user : null;
}

const GET = (p) => call('GET', p);
const POST = (p, b) => call('POST', p, b);
const PATCH = (p, b) => call('PATCH', p, b);
const PUT = (p, b) => call('PUT', p, b);
const DEL = (p, b) => call('DELETE', p, b);

/**
 * Remove everything this audit creates.
 *
 * Run at both ends: `before`, so a previous run that threw part way through
 * cannot make this one fail on its own litter — a leftover probe clinician
 * makes the registration check fail on a unique constraint, which reads as a
 * broken feature rather than a dirty database. And `after`, so a clean run
 * leaves nothing behind.
 */
async function sweep(when) {
  const db = require('../config/db');
  if (when === 'after') console.log('\n  --- cleaning up ---');
  console.log('\n  --- cleaning up ---');
  const removed = await db.sql(`
    DELETE FROM symptoms      WHERE name  LIKE '__audit__%';
  `).catch(() => null);
  await db.run("DELETE FROM reminders    WHERE title LIKE '__audit__%'");
  await db.run("DELETE FROM appointments WHERE reason LIKE '__audit__%'");
  await db.run("DELETE FROM messages     WHERE body  LIKE '__audit__%'");
  await db.run("DELETE FROM post_comments WHERE body LIKE '__audit__%'");
  await db.run("DELETE FROM content_reports WHERE detail LIKE '__audit__%' OR review_note LIKE '__audit__%'");
  await db.run("DELETE FROM care_terminations WHERE note LIKE '__audit__%'");
  await db.run("DELETE FROM posts        WHERE title LIKE '__audit__%'");
  await db.run("DELETE FROM documents    WHERE title LIKE '__audit__%'");
  await db.run("DELETE FROM doctors      WHERE license_no LIKE '__audit__%'");
  await db.run("DELETE FROM users        WHERE email LIKE '__audit__%'");
  await db.run("DELETE FROM vitals       WHERE date  = '2019-01-02'");
  // the table is growth_records; this said `growth` and swallowed the error,
  // so every audit run silently left its probe row behind and the child's
  // percentile band drifted a little further off with each one
  await db.run("DELETE FROM growth_records WHERE date = '2019-01-02'");
  await db.run("DELETE FROM emergency_contacts WHERE name LIKE '__audit__%'");
  // GET /messages/:id legitimately marks the clinician's replies read — that is
  // what opening a thread means. The audit still has to put the seeded one back,
  // or it quietly changes state the model tests assert on.
  await db.run(
    "UPDATE messages SET read_at = NULL WHERE sender = 'doctor' AND body NOT LIKE '__audit__%'",
  );
  void removed;

  if (when === 'after') console.log('  probe rows removed');
}


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

  /*
   * Pin the account this run audits.
   *
   * Most of what follows assumes a pregnant mother with a full record. The
   * demo account is switchable now, so inheriting whatever the app was last
   * left as made the whole run depend on the previous session — a section
   * would fail with "week undefined" because somebody had been looking at the
   * planning dashboard an hour earlier.
   */
  /* ------------------------------------------------------------ auth */
  console.log('  --- authentication ---');

  check('the API refuses an anonymous request', (await GET('/patients/1')).status === 401,
    'GET /patients/1 without a session');
  check('  and so does her own record', (await GET('/me')).status === 401);
  check('  signing in is still reachable', (await GET('/auth/session')).status === 200);

  check('POST /auth/login rejects a wrong password',
    (await POST('/auth/login', { email: 'ayesha@example.com', password: 'nope' })).status === 401);
  check('  and says the same thing about an account that does not exist',
    (await POST('/auth/login', { email: 'nobody@nowhere.invalid', password: 'nope' })).json?.error
      === (await POST('/auth/login', { email: 'ayesha@example.com', password: 'nope' })).json?.error);

  const primary = await signIn('ayesha@example.com');
  check('POST /auth/login signs in', Boolean(primary), `${primary?.name} · ${primary?.stage}`);
  check('  the session then resolves', (await GET('/auth/session')).json?.data?.user?.name === primary?.name);
  check('  and her record is reachable', (await GET('/me')).status === 200);
  check('  no response carries a password or a hash',
    !JSON.stringify((await GET('/auth/session')).json).match(/password|scrypt/i));

  // clear any litter a previous crashed run left behind, before it can make
  // this one fail on a unique constraint against its own probe rows
  await sweep('before');

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

  check('  ranks everyone, exposing nothing to filter on',
    rec.json.data.length === docs.json.data.length
      && rec.json.data.every((d) => Array.isArray(d.reasons) && d.reasons.length > 0),
    `${rec.json.data.length} placed, each with a stated reason`);
  check('  no clinician carries a hospital or a distance',
    docs.json.data.every((d) => !('hospital' in d) && !('distanceKm' in d)));
  check('GET /hospitals is gone', (await GET('/hospitals')).status === 404);

  /* a clinician signing themselves up — the only way into that list */
  const reg = await POST('/doctors/register', {
    name: 'Dr. __audit__ Registrant',
    specialty: 'Obstetrics & Gynaecology',
    qualification: 'MBBS, FCPS (Obs & Gynae)',
    years: 8,
    email: '__audit__registrant@example.invalid',
    phone: '01700000000',
    licenseNo: '__audit__-LIC-1',
    password: 'audit-password-2026',
  });
  check('POST /doctors/register', reg.status === 201 && reg.json?.data?.bookable === true,
    `${reg.json?.data?.name} · ${reg.json?.data?.status} · ৳${reg.json?.data?.feeBdt}`);
  const afterReg = await GET('/doctors/recommended');
  const regId = reg.json?.data?.id;
  check('  and is ranked immediately',
    Boolean(regId) && afterReg.json.data.some((d) => d.id === regId),
    regId
      ? `#${afterReg.json.data.findIndex((d) => d.id === regId) + 1} of ${afterReg.json.data.length}`
      : 'registration did not return a clinician');
  const dupe = await POST('/doctors/register', {
    name: 'Dr. __audit__ Twin',
    specialty: 'Paediatrics',
    qualification: 'MBBS, DCH',
    years: 4,
    email: '__audit__twin@example.invalid',
    phone: '01700000001',
    licenseNo: '__audit__-LIC-1',
    password: 'audit-password-2026',
  });
  check('  400s on a licence already registered, naming the field',
    dupe.status === 400 && dupe.json?.field === 'licenseNo', dupe.json?.error);

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
  await signIn('lena.ortiz@demo.maternalcare.app', 'demo-clinician-2026');
  check('  shows in the clinician diary',
    (await GET(`/doctors/${docId}/appointments`)).json.data
      .some((a) => a.payment?.reference === paid.json.data.payment.reference));
  await signIn('ayesha@example.com');

  /* --------------------------------------- reschedule & cancel (F11) */
  const day = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    const p2 = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  };
  const moveA = day(5);
  const moveB = day(11);
  const freeA = (await GET(`/doctors/${docId}/slots?date=${moveA}`)).json.data.times;
  const toMove = await POST('/appointments', {
    doctorId: docId, date: moveA, time: freeA[0], reason: '__audit__ move me',
  });
  check('booked something to move', toMove.status === 201, `${moveA} ${freeA[0]}`);

  const freeB = (await GET(`/doctors/${docId}/slots?date=${moveB}`)).json.data.times;
  const moved = await PATCH(`/appointments/${toMove.json.data.id}/reschedule`, {
    date: moveB, time: freeB[0], reason: 'Audit probe move',
  });
  check('PATCH /appointments/:id/reschedule',
    moved.status === 200 && moved.json?.data?.date === moveB,
    `${moved.json?.data?.date} ${moved.json?.data?.time} (move ${moved.json?.data?.moves})`);
  check('  the old slot goes back on offer',
    (await GET(`/doctors/${docId}/slots?date=${moveA}`)).json.data.times.includes(freeA[0]));
  check('  the move is on the record, with its reason',
    (await GET(`/appointments/${toMove.json.data.id}/changes`)).json.data[0]?.reason === 'Audit probe move');
  check('  moving it nowhere is refused',
    (await PATCH(`/appointments/${toMove.json.data.id}/reschedule`,
      { date: moveB, time: freeB[0] })).status === 400);

  check('GET /cancel-reasons', (await GET('/cancel-reasons?side=mother')).json?.data?.length > 0);
  const withReason = await DEL(`/appointments/${toMove.json.data.id}`,
    { reason: 'cost', note: '__audit__ too expensive' });
  check('DELETE /appointments/:id records a reason',
    withReason.status === 200 && withReason.json?.data?.cancellation?.reason === 'cost',
    withReason.json?.data?.cancellation?.reasonLabel);
  check('  and refuses a reason not on the list',
    (await DEL(`/appointments/${paid.json.data.id}`, { reason: '__nope__' })).status === 400);

  /* --------------------------------- ending the care relationship */
  const endDoc = '6';
  const endDay = day(6);
  const freeC = (await GET(`/doctors/${endDoc}/slots?date=${endDay}`)).json.data.times;
  await POST('/appointments', {
    doctorId: endDoc, date: endDay, time: freeC[0], reason: '__audit__ ending test',
  });
  const endReasons = await GET('/care-endings/reasons?side=doctor');
  check('GET /care-endings/reasons',
    endReasons.json?.data?.options?.length > 0 && endReasons.json.data.noteRequired === true,
    `${endReasons.json?.data?.options?.length} reasons, note required for clinicians`);

  const ended = await POST(`/care-endings/${endDoc}`, {
    reason: 'communication', note: '__audit__ replies took days',
  });
  check('POST /care-endings/:doctorId',
    ended.status === 201 && ended.json?.data?.endedBy === 'mother',
    `${ended.json?.data?.reasonLabel} · ${ended.json?.data?.cancelledAppointments} cancelled`);
  check('  it cancels what was still ahead', ended.json?.data?.cancelledAppointments >= 1);
  check('  ending it twice is a 409',
    (await POST(`/care-endings/${endDoc}`, { reason: 'cost' })).status === 409);
  check('  they leave her care team',
    !(await GET('/care-team')).json.data.some((d) => d.doctorId === endDoc));
  check('GET /care-endings', (await GET('/care-endings')).json?.data?.length >= 1);

  await signIn('lena.ortiz@demo.maternalcare.app', 'demo-clinician-2026');
  const clinicianRoster = await GET('/patients');
  const doctorPatient = clinicianRoster.json?.data?.[0]?.id;
  const doctorView = await GET(`/doctors/${endDoc}/care-endings`);
  check('GET /doctors/:id/care-endings counts the reasons',
    doctorView.json?.data?.leftByPatients >= 1,
    doctorView.json?.data?.topReasons?.map((r) => `${r.label} x${r.count}`).join(', '));
  check('  a clinician ending it must write a reason',
    (await POST(`/doctors/1/care-endings/${doctorPatient}`, { reason: 'capacity', note: 'no' })).status === 400);
  check('  and then it is accepted',
    (await POST(`/doctors/1/care-endings/${doctorPatient}`,
      { reason: 'wrong-specialty', note: '__audit__ referred on to fetal medicine' })).status === 201);
  await signIn('ayesha@example.com');

  const backDay = day(13);
  const freeD = (await GET(`/doctors/${endDoc}/slots?date=${backDay}`)).json.data.times;
  await POST('/appointments', {
    doctorId: endDoc, date: backDay, time: freeD[0], reason: '__audit__ back again',
  });
  check('  booking again resumes the pairing',
    (await GET('/care-team')).json.data.some((d) => d.doctorId === endDoc));
  check('  and the ending stays on her record',
    (await GET('/care-endings')).json.data.some((e) => e.doctorId === endDoc && e.active === false));

  check('DELETE /appointments/:id', (await DEL(`/appointments/${paid.json.data.id}`, { reason: 'other' })).status === 200);

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
  await signIn('lena.ortiz@demo.maternalcare.app', 'demo-clinician-2026');
  const docThreads = await GET(`/doctors/${msgDoc}/threads`);
  check('GET /doctors/:id/threads sees it from the other side',
    Array.isArray(docThreads.json?.data) && docThreads.json.data.length > 0);
  check('POST /doctors/:id/messages',
    (await POST(`/doctors/${msgDoc}/messages`, { patientId: '1', body: '__audit__ pong' })).status === 201);
  await signIn('ayesha@example.com');

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

  // an uploaded image must come back as an image, not as bytes the browser
  // has to guess at — this said nothing at all until it was fixed
  const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP8z8Dwn4GBgYGJAQiGAgMAKCcCAtCVJAoAAAAASUVORK5CYII=';
  const withImage = await POST('/community/posts', { topic: 'General', title: '__audit__ image', image: PIXEL });
  check('POST a post with an image', withImage.status === 201 && Boolean(withImage.json?.data?.image),
    withImage.json?.data?.image);
  const shot = await authed(`${ORIGIN}${withImage.json.data.image}`);
  const shotBytes = Buffer.from(await shot.arrayBuffer());
  check('  served back with a declared type',
    shot.status === 200
      && shot.headers.get('content-type') === 'image/png'
      && shot.headers.get('x-content-type-options') === 'nosniff',
    `${shot.headers.get('content-type')} · ${shotBytes.length} bytes`);
  check('  and they are the bytes that went in',
    shotBytes.subarray(0, 4).toString('hex') === '89504e47');
  check('  image paths cannot escape the upload directory',
    (await authed(`${ORIGIN}/api/community/images/..%2F..%2Fpackage.json`)).status === 404);

  /* ------------------------------------------------- reporting (F18) */
  console.log('\n  --- reporting & moderation ---');
  const reasons = posts.json?.meta?.reasons ?? [];
  check('the board offers report reasons', reasons.some((r) => r.key === 'medical-misinformation'),
    `${reasons.length} reasons`);

  const filed = await POST(`/community/posts/${postId}/report`, {
    reason: 'medical-misinformation', detail: '__audit__ probe report',
  });
  check('POST /community/posts/:id/report', filed.status === 201 && filed.json?.data?.state === 'open');
  check('  the same person cannot report twice',
    (await POST(`/community/posts/${postId}/report`, { reason: 'spam' })).status === 409);
  check('  an unknown reason is refused',
    (await POST(`/community/posts/${postId}/report`, { reason: '__nope__' })).status === 400);
  check('  reporting something that does not exist 404s',
    (await POST('/community/posts/999999/report', { reason: 'spam' })).status === 404);
  check('  the board now says she reported it',
    (await GET('/community/posts?limit=50')).json.data.find((x) => x.id === postId)?.reported === true);

  await signIn('lena.ortiz@demo.maternalcare.app', 'demo-clinician-2026');
  const queue = await GET('/moderation/reports');
  const group = queue.json?.data?.find((g) => g.postId === postId);
  check('GET /moderation/reports', queue.status === 200 && Boolean(group),
    `${queue.json?.meta?.open} open, ${queue.json?.meta?.urgent} urgent`);
  check('  unsafe medical advice sorts as urgent', group?.urgent === true, `weight ${group?.weight}`);
  check('  the content travels with the report', group?.content?.title === '__audit__');

  const upheld = await POST(`/moderation/posts/${postId}/resolve`, {
    action: 'uphold', note: '__audit__ decision',
  });
  check('POST /moderation/:target/:id/resolve', upheld.status === 200 && upheld.json?.data?.action === 'uphold',
    `${upheld.json?.data?.reportsClosed} report(s) closed`);
  check('  a removed post leaves the public board',
    !(await GET('/community/posts?limit=50')).json.data.some((x) => x.id === postId));
  check('  and stops taking replies',
    (await POST(`/community/posts/${postId}/comments`, { body: 'still here?' })).status === 400);
  check('  dismissing puts it back', (await POST(`/moderation/posts/${postId}/resolve`,
    { action: 'dismiss', note: '__audit__ reversed' })).status === 200);
  check('  it is on the board again',
    (await GET('/community/posts?limit=50')).json.data.some((x) => x.id === postId));
  check('  a bad decision is refused',
    (await POST(`/moderation/posts/${postId}/resolve`, { action: 'incinerate' })).status === 400);
  check('GET /moderation/count', Number.isFinite((await GET('/moderation/count')).json?.data?.open));
  await signIn('ayesha@example.com');

  /* --------------------- the four life stages, each its own account */
  console.log('\n  --- life stages ---');

  const STAGE_LOGINS = [
    ['amena@stage.demo', 'planning'],
    ['nabila@stage.demo', 'new-mother'],
    ['orpa@stage.demo', 'parent'],
  ];

  const schedules = new Map();
  for (const [email, stage] of STAGE_LOGINS) {
    const who = await signIn(email);
    if (!who) { check(`  ${stage}: sign in`, false, `${email} — run npm run db:passwords`); continue; }

    const vax = await GET('/vaccinations');
    const child = await GET('/child');
    schedules.set(email, (vax.json?.data ?? []).map((v) => v.id).join(','));
    const wantsChild = stage === 'new-mother' || stage === 'parent';

    check(`  ${who.name} signs in as ${stage}`,
      who.stage === stage
        && Array.isArray(vax.json?.data)
        && (!wantsChild || Boolean(child.json?.data?.child)),
      `${vax.json?.data?.length} vaccinations`
        + (child.json?.data?.child ? `, child ${child.json.data.child.name}` : ''));
  }

  const lists = [...schedules.values()].filter(Boolean);
  check('  no two accounts share a vaccination schedule',
    new Set(lists).size === lists.length, `${lists.length} distinct schedules`);

  /* the child's own daily check-in, as the parent */
  await signIn('orpa@stage.demo');
  const childLog = await GET('/child/log');
  check('GET /child/log', childLog.status === 200 && Boolean(childLog.json?.data?.child),
    `${childLog.json?.data?.child?.name}, ${childLog.json?.data?.history?.length} days logged`);
  const wasNappies = childLog.json?.data?.today?.wetNappies ?? null;
  const patched = await PATCH('/child/log', { feeds: 5 });
  check('PATCH /child/log writes one field', patched.json?.data?.today?.feeds === 5);
  check('  without blanking the rest of the day',
    (patched.json?.data?.today?.wetNappies ?? null) === wasNappies,
    `nappies still ${patched.json?.data?.today?.wetNappies}`);
  check('  and refuses a mood it does not know',
    (await PATCH('/child/log', { mood: '__nope__' })).status === 400);

  await signIn('amena@stage.demo');
  check('  a mother with no child gets 404 from /child/log, not a crash',
    (await GET('/child/log')).status === 404);

  /* back to the account the rest of this run assumes */
  await signIn('ayesha@example.com');

  /* ---------------------------- the dashboard follows her stage */
  console.log('\n  --- life stage ---');
  const startStage = (await GET('/me')).json?.data?.user?.stage;
  check('GET /me carries her life stage', ['pregnant', 'planning', 'new-mother', 'parent', 'general'].includes(startStage), startStage);

  /*
   * The dashboard hero is chosen from this value, so what matters is that
   * every stage is served the data its hero needs. A planning user has no
   * pregnancy, and used to be shown a 40-week countdown anyway.
   */
  for (const stage of ['planning', 'new-mother', 'parent', 'pregnant']) {
    await PATCH('/me', { stage });
    const me = await GET('/me');
    const child = await GET('/child');
    const vax = await GET('/vaccinations');
    const ok = me.json?.data?.user?.stage === stage
      && (stage !== 'pregnant' || Boolean(me.json?.data?.pregnancy))
      && Array.isArray(vax.json?.data);
    check(`  ${stage}: the hero has what it needs`, ok,
      stage === 'pregnant'
        ? `week ${me.json?.data?.pregnancy?.week}, due ${me.json?.data?.pregnancy?.eddPretty}`
        : `child ${child.json?.data?.child?.agePretty ?? 'none'}, ${vax.json?.data?.length} vaccinations`);
  }
  await PATCH('/me', { stage: startStage });

  /* ------------------------------------------------ language (F13) */
  console.log('\n  --- language ---');
  const startingLang = (await GET('/me/language')).json?.data?.language;
  check('GET /me/language', ['en', 'bn'].includes(startingLang), startingLang);
  check('PATCH /me/language',
    (await PATCH('/me/language', { language: 'bn' })).json?.data?.language === 'bn');
  check('  refuses a language it has no words for',
    (await PATCH('/me/language', { language: 'fr' })).status === 400);

  const bnRisk = await GET('/risk');
  check('  her assessment comes back in Bangla',
    /[ঀ-৿]/.test(bnRisk.json?.data?.rules?.label ?? ''),
    bnRisk.json?.data?.rules?.label);
  check('  including every factor the score is built from',
    (bnRisk.json?.data?.rules?.factors ?? []).every((f) => /[ঀ-৿]/.test(f.name)),
    bnRisk.json?.data?.rules?.factors?.[1]?.detail);
  check('  but the numbers and units are untouched',
    /mmHg/.test(bnRisk.json?.data?.rules?.factors?.[1]?.detail ?? ''));

  const enRisk = await GET('/risk?lang=en');
  check('  ?lang= overrides the stored preference', enRisk.json?.data?.rules?.label === 'Low Risk',
    enRisk.json?.data?.rules?.label);
  check('  and the score is identical in both languages',
    enRisk.json.data.rules.score === bnRisk.json.data.rules.score,
    `${enRisk.json.data.rules.score} either way`);
  // put her back the way the audit found her
  await PATCH('/me/language', { language: startingLang });

  /* --------------------------------------- risk: rules + model (F13) */
  console.log('\n  --- risk assessment ---');
  const risk = await GET('/risk');
  check('GET /risk', risk.status === 200 && Boolean(risk.json?.data?.rules),
    `rules say ${risk.json?.data?.rules?.label} (${risk.json?.data?.rules?.score}/100)`);
  check('  the rules explain themselves',
    (risk.json?.data?.rules?.factors ?? []).every((f) => f.name && f.detail),
    `${risk.json?.data?.rules?.factors?.length} factors`);

  const mlUp = risk.json?.meta?.service?.up === true;
  if (mlUp) {
    const m = risk.json.data.model;
    check('  the FastAPI classifier answered too', Boolean(m?.available),
      `${m?.label} at ${Math.round((m?.confidence ?? 0) * 100)}%`);
    check('  it returns a probability per class',
      Math.abs(Object.values(m?.probabilities ?? {}).reduce((a, b) => a + b, 0) - 1) < 0.02,
      JSON.stringify(m?.probabilities));
    check('  and declares what it had to assume',
      Array.isArray(m?.imputed) && Array.isArray(m?.clamped));
    check('  the two answers are compared, not merged',
      ['agree', 'model-higher', 'rules-higher'].includes(risk.json.data.comparison.agreement),
      risk.json.data.comparison.agreement);
    const card = await GET('/risk/model');
    check('GET /risk/model publishes the honest score',
      card.status === 200
        && card.json.data.cv_f1_macro_mean < card.json.data.cv_f1_macro_if_duplicates_kept,
      `honest ${card.json?.data?.cv_f1_macro_mean} vs leaked ${card.json?.data?.cv_f1_macro_if_duplicates_kept}`);
    const sim = await POST('/risk/simulate',
      { systolic: 150, diastolic: 100, sugar: 220, tempC: 38.2, heartBpm: 96 });
    check('POST /risk/simulate runs both engines',
      sim.status === 200 && sim.json?.data?.rules?.level === 'high',
      `rules ${sim.json?.data?.rules?.label}, model ${sim.json?.data?.model?.label ?? 'n/a'}`);
  } else {
    // Not a failure. The application is built so this service is optional, and
    // the audit has to be able to pass without Python running.
    check('  the model is not running, and the rules still answered',
      risk.json?.data?.model === null && Boolean(risk.json?.data?.rules),
      'start it with: uvicorn app:app --port 8000 (from ml-service/)');
    check('  GET /risk/model says so plainly', (await GET('/risk/model')).status === 503);
  }
  check('GET /patients/:id/risk',
    (await GET(`/patients/${(await GET('/patients')).json.data[0].id}/risk`)).status === 200);
  check('  404s on someone who is not a patient', (await GET('/patients/99999/risk')).status === 404);

  /* ------------------------------------------------- care plan (F14) */
  console.log('\n  --- care plan ---');
  const plan = await GET('/guidance');
  check('GET /guidance', plan.status === 200 && Boolean(plan.json?.data),
    `${plan.json?.data?.nutrition?.length} nutrition · ${plan.json?.data?.exercise?.length} movement · ${plan.json?.data?.lifestyle?.length} lifestyle`);
  const all = [...(plan.json?.data?.nutrition ?? []), ...(plan.json?.data?.exercise ?? []),
    ...(plan.json?.data?.lifestyle ?? [])];
  check('  every line says which reading produced it', all.length > 0 && all.every((i) => i.why),
    all[0]?.why?.slice(0, 46));
  check('  it names what it was built from', (plan.json?.data?.basis ?? []).length > 0,
    plan.json?.data?.basis?.join(' · ').slice(0, 60));
  check('  targets are targets, and hydration is the measured one',
    plan.json?.data?.targets?.length > 0 && 'targetLitres' in (plan.json?.data?.hydration ?? {}),
    `${plan.json?.data?.targets?.length} targets`);
  const patientPlan = await GET(`/patients/${(await GET('/patients')).json.data[0].id}/guidance`);
  check('GET /patients/:id/guidance', patientPlan.status === 200 && Boolean(patientPlan.json?.data));
  check('  404s on someone who is not a patient',
    (await GET('/patients/99999/guidance')).status === 404);

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
    const fileRes = await authed(`${BASE}/documents/${madeDoc.json.data.id}/file`);
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
  await signIn('lena.ortiz@demo.maternalcare.app', 'demo-clinician-2026');
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

  await sweep('after');


  // `db` used to be required inside the cleanup block, which is a function now
  const db = require('../config/db');
  console.log(`\n  ${pass} passed, ${fail} failed`);
  if (fail) console.log(`  failing: ${failures.join(', ')}`);
  console.log();
  await db.pool.end();
  process.exit(fail ? 1 : 0);
})();

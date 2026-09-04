/**
 * Counts the round trips a call makes, and times it.
 *
 * Against a database 141 ms away, the query count *is* the performance
 * story — so it is worth measuring rather than assuming.
 */
const db = require('../config/db');

const original = db.pool.query.bind(db.pool);
let queries = 0;
db.pool.query = (...args) => { queries += 1; return original(...args); };

async function measure(label, fn) {
  await fn();          // warm: a cold pool pays a TLS handshake per connection
  queries = 0;
  const t0 = Date.now();
  await fn();
  const ms = Date.now() - t0;
  console.log(`  ${label.padEnd(38)} ${String(queries).padStart(3)} queries   ${String(ms).padStart(5)} ms`);
}

(async () => {
  const doctorModel = require('../models/doctorModel');
  const messageModel = require('../models/messageModel');
  const postModel = require('../models/postModel');
  const userModel = require('../models/userModel');
  const patientModel = require('../models/patientModel');
  const appointmentModel = require('../models/appointmentModel');
  const guardianModel = require('../models/guardianModel');
  const sosModel = require('../models/sosModel');

  await db.one('SELECT 1');   // warm the pool
  const me = await userModel.current();

  console.log('\n  after collapsing the per-row lookups\n');
  await measure('doctorModel.all (7 clinicians)', () => doctorModel.all());
  await measure('doctorModel.recommend', () => doctorModel.recommend({ stage: 'pregnant' }));
  await measure('postModel.all (8 posts + comments)', () => postModel.all({ limit: 20 }));
  await measure('messageModel.threadsForUser', () => messageModel.threadsForUser(me.id));
  await measure('patientModel.all (6 patients)', () => patientModel.all());
  await measure('appointmentModel.requestsFor', () => appointmentModel.requestsFor(me.id));

  const token = (await sosModel.contacts(me.id))[0].token;
  await measure('guardianModel.dashboard', () => guardianModel.dashboard(token));
  await measure('guardianModel.alert (polled)', () => guardianModel.alert(token));
  console.log();

  await db.pool.end();
})();

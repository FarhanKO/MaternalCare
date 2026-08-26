/**
 * Seeds one demo patient whose record already has paper on it.
 *
 *   npm run db:demo-patient
 *
 * The clinician's Files pane reads from the documents table, so with an empty
 * table there is nothing to show and no way to tell a working feature from a
 * broken one. This creates a mother with a pregnancy, a run of vitals and five
 * documents spread across four months, so the timeline actually groups by
 * year, month and day.
 *
 * The images are generated here rather than shipped as fixtures: a plain page
 * with a coloured header band and grey rules where text would be. They are
 * unmistakably placeholders — nobody could mistake one for a real result — and
 * each row carries a note saying so.
 *
 * Re-running removes the previous demo patient first, so it is idempotent.
 */
const zlib = require('zlib');
const db = require('../config/db');
const documentModel = require('../models/documentModel');

const DEMO_EMAIL = 'demo.patient@maternalcare.local';
const NOTE = 'Demo document — a generated placeholder, not a real medical record.';

/* ------------------------------------------------------------ PNG writer */

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** RGB pixel buffer → a PNG file. */
function encodePng(width, height, rgb) {
  const stride = width * 3;
  // one filter byte (0 = none) in front of every scanline
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A page: white, a coloured band across the top, grey rules below it. */
function documentImage([r, g, b]) {
  const W = 420;
  const H = 560;
  const px = Buffer.alloc(W * H * 3, 0xf7);

  const set = (x, y, c) => {
    const i = (y * W + x) * 3;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
  };
  const rect = (x0, y0, w, h, c) => {
    for (let y = y0; y < Math.min(H, y0 + h); y += 1) {
      for (let x = x0; x < Math.min(W, x0 + w); x += 1) set(x, y, c);
    }
  };

  rect(0, 0, W, H, [255, 255, 255]);        // the page
  rect(0, 0, W, 78, [r, g, b]);             // header band
  rect(28, 26, 150, 12, [255, 255, 255]);   // "letterhead"
  rect(28, 46, 96, 8, [
    Math.min(255, r + 60), Math.min(255, g + 60), Math.min(255, b + 60),
  ]);

  // body rules, in blocks, with a short last line per block
  let y = 118;
  for (let block = 0; block < 5; block += 1) {
    const lines = 3 + (block % 2);
    for (let i = 0; i < lines; i += 1) {
      const w = i === lines - 1 ? 150 + ((block * 37) % 120) : 364;
      rect(28, y, w, 9, [0xd6, 0xda, 0xe4]);
      y += 22;
    }
    y += 18;
  }
  rect(28, H - 62, 128, 9, [r, g, b]);      // a signature-ish mark
  rect(0, H - 4, W, 4, [r, g, b]);

  return `data:image/png;base64,${encodePng(W, H, px).toString('base64')}`;
}

const PRESCRIPTION = [0x8b, 0x7b, 0xf3];
const REPORT = [0x22, 0xb8, 0xc4];

/* ------------------------------------------------------------- the patient */

const PAPERS = [
  { kind: 'prescription', title: 'Iron + folic acid', takenOn: '2026-08-19', by: 'mother' },
  { kind: 'report', title: 'Full blood count', takenOn: '2026-08-05', by: 'clinic' },
  { kind: 'report', title: 'Anomaly scan — 20 weeks', takenOn: '2026-07-14', by: 'clinic' },
  { kind: 'prescription', title: 'Cyclizine for nausea', takenOn: '2026-06-28', by: 'mother' },
  { kind: 'report', title: 'Glucose tolerance test', takenOn: '2026-05-30', by: 'clinic' },
];

/** Weekly readings running up to today, drifting gently upward. */
function vitalRows(userId, weeks = 8) {
  const rows = [];
  const today = new Date();
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 7);
    const step = weeks - 1 - i;
    rows.push([
      userId,
      d.toISOString().slice(0, 10),
      116 + step,                        // systolic
      74 + Math.round(step * 0.7),       // diastolic
      88 + step,                          // fasting glucose
      Number((58 + step * 0.6).toFixed(1)),
      36.8,
      138 + ((step * 3) % 9),            // fetal bpm
    ]);
  }
  return rows;
}

(async () => {
  console.log('\n  Seeding the demo patient\n');

  // start clean so re-running does not stack duplicates
  const existing = await db.one('SELECT id FROM users WHERE email = $1', [DEMO_EMAIL]);
  if (existing) {
    await db.run('DELETE FROM users WHERE id = $1', [existing.id]);
    console.log(`  removed the previous demo patient (id ${existing.id})`);
  }

  const user = await db.insert(
    `INSERT INTO users (name, role, email, age, blood_group, stage, conditions,
                        last_visit, next_visit, bio)
     VALUES ($1,'mother',$2,$3,$4,'pregnant',$5,
             CURRENT_DATE - 9, CURRENT_DATE + 5,
             'Demo record used to show the clinician view.')
     RETURNING *`,
    ['Sadia Karim', DEMO_EMAIL, 31, 'A+', 'Gestational diabetes, Second pregnancy'],
  );
  console.log(`  user            ${user.name} (id ${user.id})`);

  await db.insert(
    `INSERT INTO pregnancies (user_id, lmp, height_cm, pre_weight_kg)
     VALUES ($1, CURRENT_DATE - 224, 161, 57) RETURNING id`,
    [user.id],
  );
  console.log('  pregnancy       32 weeks');

  for (const row of vitalRows(user.id)) {
    await db.run(
      `INSERT INTO vitals (user_id, date, systolic, diastolic, sugar, weight_kg, temp_c, fetal_bpm)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      row,
    );
  }
  console.log('  vitals          8 weekly readings');

  await db.run(
    `INSERT INTO symptoms (user_id, name, intensity, days_present, confirmed_today,
                           from_voice, logged_at)
     VALUES ($1,'Swollen ankles','mid',4,TRUE,FALSE, now()),
            ($1,'Heartburn','mild',2,TRUE,FALSE, now())`,
    [user.id],
  );
  console.log('  symptoms        2 logged');

  for (const p of PAPERS) {
    const doc = await documentModel.create(user.id, {
      kind: p.kind,
      title: p.title,
      note: NOTE,
      takenOn: p.takenOn,
      uploadedBy: p.by,
      originalName: `${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`,
      dataUrl: documentImage(p.kind === 'prescription' ? PRESCRIPTION : REPORT),
    });
    console.log(`  ${p.kind.padEnd(13)} ${p.takenOn}  ${doc.title} (${doc.size} bytes)`);
  }

  console.log('\n  Done. Open the clinician portal → Patients → Sadia Karim → Files.\n');
  process.exit(0);
})().catch((err) => {
  console.error('\n  Seeding failed:', err.message, '\n');
  process.exit(1);
});

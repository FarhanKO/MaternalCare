/**
 * Report API Controller — the downloadable maternal health report.
 *
 * Streams a multi-page PDF built from `reportModel`. Generated on the server
 * for three reasons: the Model layer already holds every figure, the uploaded
 * prescriptions and scans live on this disk so their pages can carry the real
 * image rather than a filename, and the charts can be drawn as vectors instead
 * of screenshotting a chart library.
 *
 * The same document serves both sides. A mother gets her own record; a
 * clinician gets one of their patients'. Only the userId differs.
 */
const fs = require('fs');
const PDFDocument = require('pdfkit');
const reportModel = require('../../models/reportModel');
const patientModel = require('../../models/patientModel');
const userModel = require('../../models/userModel');

/* ------------------------------------------------------------- palette */

const INK = '#0d1526';
const SOFT = '#3d4763';
const MUTED = '#6b7590';
const FAINT = '#9aa3ba';
const RULE = '#dbe4f7';
const BRAND = '#3f66f0';
const AQUA = '#22b8c4';
const ROSE = '#e05c7e';
const AMBER = '#c98a11';
const GREEN = '#0b7f61';

const M = 48;                       // page margin
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - M * 2;

const TONE = { low: GREEN, medium: AMBER, high: ROSE };

/* -------------------------------------------------------------- format */

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const STAMP = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

/**
 * Dates arrive as 'YYYY-MM-DD' strings, as timestamps and as Date objects.
 * Both formatters take all three and answer with an em dash rather than
 * throwing — a report must never fail to render over one bad field.
 */
const asDate = (v) => {
  if (!v) return null;
  // a plain calendar date is pinned to midday so no timezone can shift it
  const d = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.slice(0, 10)) && v.length <= 10
    ? new Date(`${v.slice(0, 10)}T12:00:00`)
    : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const day = (v) => { const d = asDate(v); return d ? DATE.format(d) : '—'; };
const when = (v) => { const d = asDate(v); return d ? STAMP.format(d) : '—'; };
const num = (v, dp = 0) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(dp) : '—');

/* --------------------------------------------------------- primitives */

/**
 * Running header + footer.
 *
 * The margins are zeroed for the duration. pdfkit starts a new page whenever
 * text is placed below the bottom margin — and a footer is, by definition,
 * below it. Left alone, every footer pushed a fresh page and the report came
 * out at 27 pages instead of nine.
 */
function furniture(doc, data, pageNo) {
  const margins = { ...doc.page.margins };
  doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
  doc.save();
  doc.fontSize(8).fillColor(FAINT).font('Helvetica');
  doc.text('MaternalCare+ · Maternal health report', M, 24, { width: CONTENT_W / 2 });
  doc.text(`${data.user.name} · generated ${when(data.generatedAt)}`,
    M + CONTENT_W / 2, 24, { width: CONTENT_W / 2, align: 'right' });
  doc.moveTo(M, 38).lineTo(PAGE_W - M, 38).lineWidth(0.5).strokeColor(RULE).stroke();

  doc.moveTo(M, PAGE_H - 42).lineTo(PAGE_W - M, PAGE_H - 42).lineWidth(0.5).strokeColor(RULE).stroke();
  doc.fontSize(8).fillColor(FAINT);
  doc.text('Generated from her own logged records. Not a substitute for clinical assessment.',
    M, PAGE_H - 34, { width: CONTENT_W * 0.75 });
  doc.text(`Page ${pageNo}`, M + CONTENT_W * 0.75, PAGE_H - 34,
    { width: CONTENT_W * 0.25, align: 'right' });
  doc.restore();
  doc.page.margins = margins;
}

/**
 * Space check before drawing a block. Returns the y to draw at, starting a
 * fresh page when the block would not fit — so a long list breaks where we
 * decide rather than wherever the text engine happens to run out.
 */
function room(doc, y, need) {
  if (y + need <= PAGE_H - 70) return y;
  doc.addPage();
  return 62;
}

/** A section title with a rule under it. Returns the y to carry on from. */
function heading(doc, text, y, sub) {
  doc.font('Helvetica-Bold').fontSize(15).fillColor(INK).text(text, M, y);
  let next = doc.y + 2;
  if (sub) {
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(sub, M, next, { width: CONTENT_W });
    next = doc.y + 2;
  }
  doc.moveTo(M, next + 4).lineTo(PAGE_W - M, next + 4).lineWidth(1).strokeColor(RULE).stroke();
  return next + 16;
}

/** Label over value, the unit of most of this document. */
function field(doc, label, value, x, y, w) {
  doc.font('Helvetica').fontSize(7.5).fillColor(FAINT)
    .text(String(label).toUpperCase(), x, y, { width: w, characterSpacing: 0.6 });
  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK)
    .text(value == null || value === '' ? '—' : String(value), x, y + 11, { width: w });
}

/**
 * The WHO growth line for the report.
 *
 * Names the reference used — a clinician reading this needs to know which
 * curves the centiles came from, and the answer used to be "girls, always".
 */
function whoLine(p) {
  if (!p) return '';
  if (!p.sexKnown) return p.note;
  const done = (p.measures || []).filter((m) => m.available);
  if (!done.length) return p.note;
  const parts = done.map((m) => `${m.label.toLowerCase()} ${m.centileLabel} centile`);
  return `WHO ${p.sex} standard — ${parts.join(', ')}. ${p.note}`;
}

/** A pill, used for status and risk. Returns its width. */
function pill(doc, text, x, y, colour) {
  doc.font('Helvetica-Bold').fontSize(7.5);
  const w = doc.widthOfString(text.toUpperCase(), { characterSpacing: 0.6 }) + 12;
  doc.roundedRect(x, y, w, 14, 3).fillColor(colour).fillOpacity(0.13).fill().fillOpacity(1);
  doc.fillColor(colour).text(text.toUpperCase(), x + 6, y + 4, { characterSpacing: 0.6 });
  return w;
}

/**
 * A line chart drawn as vectors.
 *
 * `series` is [{ key, label, colour }]; points carry those keys. Drawing it
 * here rather than rasterising a chart component keeps it sharp at any zoom
 * and means the report does not need a browser to render.
 */
function chart(doc, { x, y, w, h, points, series, unit }) {
  doc.save();
  doc.roundedRect(x, y, w, h, 6).lineWidth(0.8).strokeColor(RULE).stroke();

  const values = points.flatMap((p) => series.map((s) => p[s.key])).filter((v) => typeof v === 'number');
  if (!points.length || !values.length) {
    doc.font('Helvetica').fontSize(9).fillColor(FAINT)
      .text('No readings logged', x, y + h / 2 - 5, { width: w, align: 'center' });
    doc.restore();
    return;
  }

  const pad = { t: 12, r: 12, b: 20, l: 34 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi === lo) { hi += 1; lo -= 1; }
  const span = hi - lo;
  lo -= span * 0.12;
  hi += span * 0.12;

  const px = (i) => x + pad.l + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const py = (v) => y + pad.t + plotH - ((v - lo) / (hi - lo)) * plotH;

  // horizontal guides + axis labels
  doc.font('Helvetica').fontSize(6.5).fillColor(FAINT);
  for (let g = 0; g <= 2; g += 1) {
    const v = lo + ((hi - lo) / 2) * g;
    const gy = py(v);
    doc.moveTo(x + pad.l, gy).lineTo(x + w - pad.r, gy)
      .lineWidth(0.4).strokeColor(RULE).stroke();
    doc.fillColor(FAINT).text(v.toFixed(0), x + 6, gy - 3, { width: pad.l - 10, align: 'right' });
  }

  for (const s of series) {
    const pts = points.map((p, i) => [px(i), py(p[s.key]), p[s.key]]).filter((p) => typeof p[2] === 'number');
    if (!pts.length) continue;
    doc.lineWidth(1.6).strokeColor(s.colour);
    pts.forEach(([cx, cy], i) => (i ? doc.lineTo(cx, cy) : doc.moveTo(cx, cy)));
    doc.stroke();
    for (const [cx, cy] of pts) doc.circle(cx, cy, 1.9).fillColor(s.colour).fill();
  }

  // first and last date, so the x axis means something
  doc.font('Helvetica').fontSize(6.5).fillColor(FAINT);
  doc.text(day(points[0].date), x + pad.l, y + h - 14, { width: plotW / 2 });
  doc.text(day(points[points.length - 1].date), x + pad.l + plotW / 2, y + h - 14,
    { width: plotW / 2, align: 'right' });

  // legend
  let lx = x + pad.l;
  const ly = y + h - 14;
  for (const s of series) {
    doc.circle(lx + 2, ly + 3, 2).fillColor(s.colour).fill();
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(MUTED)
      .text(`${s.label}${unit ? ` (${unit})` : ''}`, lx + 7, ly);
    lx += doc.widthOfString(`${s.label}${unit ? ` (${unit})` : ''}`) + 22;
  }
  doc.restore();
}

/** Simple column chart for the daily figures. */
function bars(doc, { x, y, w, h, points, key, colour, unit }) {
  doc.save();
  doc.roundedRect(x, y, w, h, 6).lineWidth(0.8).strokeColor(RULE).stroke();
  const vals = points.map((p) => p[key]).filter((v) => typeof v === 'number');
  if (!vals.length) {
    doc.font('Helvetica').fontSize(9).fillColor(FAINT)
      .text('Nothing logged', x, y + h / 2 - 5, { width: w, align: 'center' });
    doc.restore();
    return;
  }
  const hi = Math.max(...vals) * 1.15 || 1;
  const pad = { t: 12, b: 18, l: 10, r: 10 };
  const plotH = h - pad.t - pad.b;
  const slot = (w - pad.l - pad.r) / points.length;
  const bw = Math.min(14, slot * 0.6);

  points.forEach((p, i) => {
    const v = p[key];
    if (typeof v !== 'number') return;
    const bh = Math.max(1, (v / hi) * plotH);
    const bx = x + pad.l + i * slot + (slot - bw) / 2;
    doc.roundedRect(bx, y + pad.t + plotH - bh, bw, bh, 2).fillColor(colour).fill();
  });

  doc.font('Helvetica').fontSize(6.5).fillColor(FAINT);
  doc.text(`${day(points[0].date)} — ${day(points[points.length - 1].date)}${unit ? ` · ${unit}` : ''}`,
    x, y + h - 13, { width: w, align: 'center' });
  doc.restore();
}

/* ------------------------------------------------------------ the pages */

function coverPage(doc, data) {
  let y = 62;

  doc.font('Helvetica-Bold').fontSize(26).fillColor(INK)
    .text('Maternal health report', M, y);
  y = doc.y + 4;
  doc.font('Helvetica').fontSize(10.5).fillColor(MUTED)
    .text('A summary of everything on record, for a consultation.', M, y);
  y = doc.y + 22;

  // who
  doc.roundedRect(M, y, CONTENT_W, 96, 8).fillColor('#f5f8ff').fill();
  const col = CONTENT_W / 4;
  field(doc, 'Patient', data.user.name, M + 16, y + 16, col - 16);
  field(doc, 'Age', data.user.age ? `${data.user.age} years` : '—', M + 16 + col, y + 16, col - 16);
  field(doc, 'Blood group', data.user.bloodGroup, M + 16 + col * 2, y + 16, col - 16);
  field(doc, 'Report date', day(data.generatedAt), M + 16 + col * 3, y + 16, col - 16);

  field(doc, 'Last seen', day(data.user.lastVisit), M + 16, y + 56, col - 16);
  field(doc, 'Next visit', day(data.user.nextVisit), M + 16 + col, y + 56, col - 16);
  field(doc, 'Emergency number', data.user.emergencyNumber, M + 16 + col * 2, y + 56, col * 2 - 16);
  y += 116;

  // pregnancy
  if (data.pregnancy) {
    y = heading(doc, 'Pregnancy', y);
    const p = data.pregnancy;
    const c3 = CONTENT_W / 4;
    field(doc, 'Gestation', `Week ${p.week}`, M, y, c3);
    field(doc, 'Trimester', String(p.trimester), M + c3, y, c3);
    field(doc, 'Due date', p.eddPretty || day(p.edd), M + c3 * 2, y, c3);
    field(doc, 'Days to go', String(p.daysLeft), M + c3 * 3, y, c3);
    y += 44;
    if (p.weekNote) {
      doc.font('Helvetica').fontSize(9.5).fillColor(SOFT)
        .text(p.weekNote, M, y, { width: CONTENT_W });
      y = doc.y + 14;
    }
  }

  // risk
  if (data.risk) {
    y = heading(doc, 'Risk assessment', y,
      'Scored from her latest readings, history and age. Every factor is listed — this supports a clinician’s judgement, it does not replace it.');
    const colour = TONE[data.risk.level] || MUTED;
    pill(doc, data.risk.label, M, y, colour);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(SOFT)
      .text(`Score ${data.risk.score} / 100`, M + 90, y + 3);
    y += 26;

    for (const f of data.risk.factors || []) {
      y = room(doc, y, 16);
      doc.font('Helvetica').fontSize(9.5).fillColor(SOFT)
        .text(`· ${f.label ?? f.name ?? 'Factor'}`, M + 4, y, { width: CONTENT_W - 60 });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(f.points > 0 ? AMBER : MUTED)
        .text(f.points > 0 ? `+${f.points}` : '0', PAGE_W - M - 40, y, { width: 40, align: 'right' });
      y = doc.y + 3;
    }
    y += 8;
  }

  // anything currently out of range
  if (data.alerts?.length) {
    y = heading(doc, 'Readings outside their range', y);
    for (const a of data.alerts) {
      y = room(doc, y, 44);
      const colour = a.level === 'warning' ? AMBER : ROSE;
      doc.roundedRect(M, y, CONTENT_W, 34, 5).fillColor(colour).fillOpacity(0.08).fill().fillOpacity(1);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(INK)
        .text(`${a.metric} — ${a.value}`, M + 10, y + 7);
      doc.font('Helvetica').fontSize(8.5).fillColor(SOFT)
        .text(a.message || '', M + 10, y + 20, { width: CONTENT_W - 20, height: 11, ellipsis: true });
      y += 40;
    }
  }
}

function vitalsPage(doc, data) {
  let y = 62;
  y = heading(doc, 'Vital signs', y,
    `${data.vitals.length} readings on record. Each chart is drawn from what she logged — no reading is interpolated.`);

  const pts = data.vitals.map((v) => ({
    date: v.date,
    sys: v.systolic,
    dia: v.diastolic,
    kg: v.weight_kg,
    sugar: v.sugar,
    bpm: v.fetal_bpm,
    temp: v.temp_c,
  }));

  const half = (CONTENT_W - 14) / 2;

  chart(doc, {
    x: M, y, w: half, h: 118, points: pts, unit: 'mmHg',
    series: [
      { key: 'sys', label: 'Systolic', colour: BRAND },
      { key: 'dia', label: 'Diastolic', colour: AQUA },
    ],
  });
  chart(doc, {
    x: M + half + 14, y, w: half, h: 118, points: pts, unit: 'kg',
    series: [{ key: 'kg', label: 'Weight', colour: BRAND }],
  });
  y += 132;

  chart(doc, {
    x: M, y, w: half, h: 118, points: pts, unit: 'mg/dL',
    series: [{ key: 'sugar', label: 'Fasting glucose', colour: AMBER }],
  });
  chart(doc, {
    x: M + half + 14, y, w: half, h: 118, points: pts, unit: 'bpm',
    series: [{ key: 'bpm', label: 'Fetal heart rate', colour: ROSE }],
  });
  y += 140;

  // latest of each measurement
  y = heading(doc, 'Most recent value of each measurement', y,
    'Resolved per measurement rather than per row — a reading may carry only some of them.');
  const c = data.current || {};
  const cw = CONTENT_W / 5;
  field(doc, 'Blood pressure',
    c.systolic && c.diastolic ? `${c.systolic}/${c.diastolic}` : '—', M, y, cw);
  field(doc, 'Weight', c.weight_kg != null ? `${num(c.weight_kg, 1)} kg` : '—', M + cw, y, cw);
  field(doc, 'Glucose', c.sugar != null ? `${c.sugar} mg/dL` : '—', M + cw * 2, y, cw);
  field(doc, 'Temperature', c.temp_c != null ? `${num(c.temp_c, 1)} °C` : '—', M + cw * 3, y, cw);
  field(doc, 'Fetal heart', c.fetal_bpm != null ? `${c.fetal_bpm} bpm` : '—', M + cw * 4, y, cw);
  y += 48;

  if (data.weightGain) {
    const g = data.weightGain;
    y = room(doc, y, 90);
    y = heading(doc, 'Weight gain', y);
    doc.font('Helvetica').fontSize(9.5).fillColor(SOFT).text(
      `${g.gainedKg >= 0 ? '+' : ''}${g.gainedKg} kg since before pregnancy. `
      + `Expected ${g.expected.low}–${g.expected.high} kg by week ${g.week} for a starting BMI of ${num(g.bmi, 1)} `
      + `(${g.category}). ${g.note}`,
      M, y, { width: CONTENT_W },
    );
  }
}

function dailyPage(doc, data) {
  let y = 62;
  y = heading(doc, 'Daily activities', y,
    `What she recorded day to day over the last ${data.log.length} logged days.`);

  const pts = data.log.map((e) => ({
    date: e.date, kicks: e.kicks, water: e.waterLitres, sleep: e.sleepHours,
  }));
  const third = (CONTENT_W - 20) / 3;

  bars(doc, { x: M, y, w: third, h: 108, points: pts, key: 'kicks', colour: '#8b7bf3', unit: 'kicks/day' });
  bars(doc, { x: M + third + 10, y, w: third, h: 108, points: pts, key: 'water', colour: AQUA, unit: 'litres/day' });
  bars(doc, { x: M + (third + 10) * 2, y, w: third, h: 108, points: pts, key: 'sleep', colour: BRAND, unit: 'hours/night' });
  y += 124;

  if (data.summary) {
    const s = data.summary;
    const cw = CONTENT_W / 4;
    field(doc, 'Days logged', String(s.days ?? 0), M, y, cw);
    field(doc, 'Average kicks', s.avgKicks ?? '—', M + cw, y, cw);
    field(doc, 'Average water', s.avgWaterLitres != null ? `${s.avgWaterLitres} L` : '—', M + cw * 2, y, cw);
    field(doc, 'Most common mood', s.commonMood ?? '—', M + cw * 3, y, cw);
    y += 48;
  }

  // mood, day by day — a small strip rather than a chart
  const moods = data.log.filter((e) => e.mood);
  if (moods.length) {
    y = heading(doc, 'Mood', y);
    let mx = M;
    for (const e of moods.slice(-14)) {
      const w = 74;
      if (mx + w > PAGE_W - M) { mx = M; y += 30; y = room(doc, y, 30); }
      doc.roundedRect(mx, y, w - 6, 24, 4).fillColor('#f5f8ff').fill();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(SOFT).text(e.mood, mx + 6, y + 4);
      doc.font('Helvetica').fontSize(6.5).fillColor(FAINT).text(day(e.date), mx + 6, y + 14);
      mx += w;
    }
    y += 40;
  }

  if (data.symptoms?.length) {
    y = heading(doc, 'Symptoms logged', y, 'Each with how many days she has had it, and how it felt.');
    for (const s of data.symptoms) {
      y = room(doc, y, 18);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(s.name, M + 4, y, { width: CONTENT_W - 160 });
      doc.font('Helvetica').fontSize(9).fillColor(MUTED)
        .text(`${s.intensity} · day ${s.daysPresent}${s.confirmedToday ? ' · confirmed today' : ''}`,
          PAGE_W - M - 160, y, { width: 160, align: 'right' });
      y = doc.y + 5;
    }
  }
}

function carePage(doc, data) {
  let y = 62;
  y = heading(doc, 'Case summary', y, 'Consultations, immunisations and what is coming up.');

  const appts = [...(data.appointments || [])]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  doc.font('Helvetica-Bold').fontSize(8).fillColor(FAINT);
  doc.text('DATE', M, y, { width: 70, characterSpacing: 0.5 });
  doc.text('CLINICIAN', M + 74, y, { width: 150, characterSpacing: 0.5 });
  doc.text('REASON', M + 228, y, { width: 170, characterSpacing: 0.5 });
  doc.text('STATUS', PAGE_W - M - 90, y, { width: 90, align: 'right', characterSpacing: 0.5 });
  y += 13;
  doc.moveTo(M, y).lineTo(PAGE_W - M, y).lineWidth(0.5).strokeColor(RULE).stroke();
  y += 7;

  if (!appts.length) {
    doc.font('Helvetica').fontSize(9.5).fillColor(FAINT).text('No consultations on record.', M, y);
    y += 20;
  }
  for (const a of appts.slice(0, 14)) {
    y = room(doc, y, 18);
    doc.font('Helvetica').fontSize(9).fillColor(SOFT);
    doc.text(day(a.date), M, y, { width: 70 });
    doc.text(a.doctor_name || '—', M + 74, y, { width: 150, height: 11, ellipsis: true });
    doc.text(a.reason || '—', M + 228, y, { width: 170, height: 11, ellipsis: true });
    doc.font('Helvetica-Bold').fontSize(8.5)
      .fillColor(a.status === 'accepted' ? GREEN : a.status === 'declined' ? ROSE : MUTED)
      .text(String(a.status || '').toUpperCase(), PAGE_W - M - 90, y, { width: 90, align: 'right' });
    y += 16;
  }
  y += 10;

  if (data.vaccinations?.length) {
    y = heading(doc, 'Immunisations', y,
      data.vaxStats ? `${data.vaxStats.done ?? 0} of ${data.vaccinations.length} complete.` : undefined);
    const half = CONTENT_W / 2;
    let i = 0;
    for (const v of data.vaccinations) {
      const cx = M + (i % 2) * half;
      if (i % 2 === 0 && i > 0) { y += 17; y = room(doc, y, 20); }
      doc.font('Helvetica').fontSize(9).fillColor(SOFT)
        .text(`${v.name}${v.dose ? ` · ${v.dose}` : ''}`, cx, y, { width: half - 90, height: 11, ellipsis: true });
      doc.font('Helvetica-Bold').fontSize(8)
        .fillColor(v.status === 'done' ? GREEN : MUTED)
        .text(v.status === 'done' ? `DONE ${day(v.completed_on)}` : `DUE ${day(v.due_date)}`,
          cx + half - 92, y, { width: 88, align: 'right' });
      i += 1;
    }
    y += 26;
  }

  if (data.child) {
    y = room(doc, y, 120);
    y = heading(doc, 'Child', y);
    const cw = CONTENT_W / 4;
    // growth rows come straight off the table, so they are snake_case
    const g = data.child.growth?.[data.child.growth.length - 1];
    field(doc, 'Name', `${data.child.name}${data.child.agePretty ? ` · ${data.child.agePretty}` : ''}`,
      M, y, cw);
    field(doc, 'Height', g ? `${num(g.height_cm, 1)} cm` : '—', M + cw, y, cw);
    field(doc, 'Weight', g ? `${num(g.weight_kg, 1)} kg` : '—', M + cw * 2, y, cw);
    field(doc, 'Head circumference', g ? `${num(g.head_cm, 1)} cm` : '—', M + cw * 3, y, cw);
    y += 46;
    if (data.child.percentile) {
      doc.font('Helvetica').fontSize(9.5).fillColor(SOFT)
        .text(whoLine(data.child.percentile),
          M, y, { width: CONTENT_W });
      y = doc.y + 6;
    }
    const done = (data.child.milestones || []).filter((m) => m.achieved).length;
    if (data.child.milestones?.length) {
      doc.font('Helvetica').fontSize(9.5).fillColor(MUTED)
        .text(`${done} of ${data.child.milestones.length} developmental milestones reached.`,
          M, y, { width: CONTENT_W });
    }
  }
}

/**
 * One page per filed document, carrying the image itself.
 *
 * The proposal asks for prescriptions and test reports in the report, and a
 * list of filenames would not be that — a clinician needs to read the paper.
 * Each page states what it is and when it was uploaded, so the printed copy
 * is self-describing.
 */
async function documentPages(doc, data) {
  const docs = [...(data.documents || [])]
    .sort((a, b) => String(b.takenOn).localeCompare(String(a.takenOn)));

  for (const d of docs) {
    doc.addPage();

    let y = 62;
    const label = d.kind === 'prescription' ? 'Prescription' : 'Test report';
    y = heading(doc, d.title || label, y);

    const cw = CONTENT_W / 4;
    field(doc, 'Type', label, M, y, cw);
    field(doc, 'Date on document', day(d.takenOn), M + cw, y, cw);
    field(doc, 'Uploaded', when(d.uploadedAt), M + cw * 2, y, cw);
    field(doc, 'Filed by', d.uploadedBy === 'mother' ? 'The patient' : d.uploadedBy, M + cw * 3, y, cw);
    y += 50;

    if (d.note) {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(d.note, M, y, { width: CONTENT_W });
      y = doc.y + 10;
    }

    const found = await reportModel.fileFor(d).catch(() => null);
    const maxH = PAGE_H - y - 70;

    if (found && /^image\/(jpe?g|png)$/.test(found.mime) && fs.existsSync(found.path)) {
      try {
        doc.image(found.path, M, y, {
          fit: [CONTENT_W, maxH],
          align: 'center',
          valign: 'top',
        });
      } catch {
        doc.font('Helvetica').fontSize(9.5).fillColor(FAINT)
          .text('This image could not be rendered into the report.', M, y, { width: CONTENT_W });
      }
    } else {
      // PDFs and formats pdfkit cannot place are named rather than faked
      doc.roundedRect(M, y, CONTENT_W, 90, 6).fillColor('#f5f8ff').fill();
      doc.font('Helvetica-Bold').fontSize(10).fillColor(SOFT)
        .text(d.originalName || 'Attached file', M + 16, y + 26, { width: CONTENT_W - 32 });
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(
        `${d.mime} · held on the patient record. Open it in the app to view the original.`,
        M + 16, y + 44, { width: CONTENT_W - 32 },
      );
    }
  }
}

/* ------------------------------------------------------------ streaming */

async function stream(res, data, filename) {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true, autoFirstPage: false });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // every page gets its furniture, including any pdfkit adds itself when a
  // section runs long — otherwise a spilled page arrives bare and unnumbered
  let pageNo = 0;
  doc.on('pageAdded', () => { pageNo += 1; furniture(doc, data, pageNo); });

  doc.addPage(); coverPage(doc, data);
  doc.addPage(); vitalsPage(doc, data);
  doc.addPage(); dailyPage(doc, data);
  doc.addPage(); carePage(doc, data);
  await documentPages(doc, data);

  doc.end();
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ------------------------------------------------------------- handlers */

/** The mother downloading her own record. */
exports.mine = async (req, res, next) => {
  try {
    const me = await userModel.current();
    const data = await reportModel.build(me.id);
    if (!data) return res.status(404).json({ error: 'No record to report on' });
    return stream(res, data, `maternalcare-report-${slug(data.user.name)}.pdf`);
  } catch (err) { return next(err); }
};

/** A clinician downloading one of their patients'. */
exports.forPatient = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (!(await patientModel.exists(id))) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    const data = await reportModel.build(id);
    if (!data) return res.status(404).json({ error: 'No record to report on' });
    return stream(res, data, `maternalcare-report-${slug(data.user.name)}.pdf`);
  } catch (err) { return next(err); }
};

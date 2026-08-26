/**
 * Report Model — everything that goes into a mother's health report.
 *
 * The report is the one place the whole record is read at once: who she is,
 * how the pregnancy is progressing, every vital she has logged, what she
 * reports day to day, the symptoms and alerts a clinician should see, her
 * appointments, and the paper she has filed. Assembling it is domain work, so
 * it happens here rather than in the controller that streams the PDF — the
 * controller only turns this into pages.
 *
 * Everything is read for one `userId`, which is what lets the same report
 * serve a mother downloading her own record and a clinician downloading one
 * of their patients'.
 */
const userModel = require('./userModel');
const pregnancyModel = require('./pregnancyModel');
const vitalModel = require('./vitalModel');
const dailyLogModel = require('./dailyLogModel');
const symptomModel = require('./symptomModel');
const appointmentModel = require('./appointmentModel');
const vaccinationModel = require('./vaccinationModel');
const documentModel = require('./documentModel');
const riskModel = require('./riskModel');
const childModel = require('./childModel');

/** Anything that fails is left out rather than taking the whole report down. */
const soft = (p, fallback) => p.then((v) => v ?? fallback).catch(() => fallback);

module.exports = {
  /**
   * The whole record, in one pass.
   *
   * Reads are issued together — a report that took eleven sequential round
   * trips to a database in Sydney would spend most of its life waiting.
   */
  async build(userId) {
    const user = await userModel.find(userId);
    if (!user) return null;

    const pregnancy = await soft(pregnancyModel.forUser(userId), null);

    const [
      profile, weightGain, vitals, log, summary, symptoms,
      appointments, vaccinations, vaxStats, documents, child,
    ] = await Promise.all([
      soft(userModel.profile(userId), null),
      soft(pregnancyModel.weightGain(userId), null),
      soft(vitalModel.history(userId, 120), []),
      soft(dailyLogModel.history(userId, 30), []),
      soft(dailyLogModel.summary(userId, 7), null),
      soft(symptomModel.all(userId), []),
      soft(appointmentModel.forUser(userId), []),
      soft(vaccinationModel.all(userId), []),
      soft(vaccinationModel.stats(userId), null),
      soft(documentModel.forUser(userId), []),
      soft(childModel.forUser(userId), null),
    ]);

    const [alerts, risk] = await Promise.all([
      soft(vitalModel.alerts(userId), []),
      soft(riskModel.fromLatestVitals(user, pregnancy), null),
    ]);

    // childModel.forUser returns the child row alone — growth and the WHO
    // band are separate reads, and the report needs all three together
    const childBlock = child
      ? {
        ...child,
        growth: await soft(childModel.growth(child.id), []),
        percentile: await soft(childModel.percentileSummary(child.id), null),
        milestones: await soft(childModel.milestones(child.id), []),
      }
      : null;

    // the newest value of each measurement, which is not the newest row —
    // weighing yourself writes a row carrying only a weight
    const current = await soft(vitalModel.current(userId), null);

    return {
      generatedAt: new Date(),
      user: {
        id: String(user.id),
        name: user.name,
        age: user.age,
        bloodGroup: user.blood_group,
        stage: user.stage,
        conditions: (user.conditions || '').split(',').map((c) => c.trim()).filter(Boolean),
        lastVisit: user.last_visit,
        nextVisit: user.next_visit,
        emergencyNumber: user.emergency_number,
        bio: profile?.bio || '',
      },
      pregnancy,
      weightGain,
      risk,
      alerts,
      current,
      vitals,
      log,
      summary,
      symptoms,
      appointments,
      vaccinations,
      vaxStats,
      documents,
      child: childBlock,
    };
  },

  /**
   * Where a document's bytes live, so the report can print the page itself
   * rather than a line saying one exists.
   */
  fileFor(doc) {
    return documentModel.pathFor(doc.id);
  },
};

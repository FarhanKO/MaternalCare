/**
 * Child API Controller — growth, milestones and vaccinations.
 *
 * These models already existed and were rendered by the EJS pages, but the
 * React client had never been given a way to reach them, so it drew growth
 * charts and milestone lists from hardcoded arrays. Same models, second view.
 */
const childModel = require('../../models/childModel');
const childLogModel = require('../../models/childLogModel');
const vaccinationModel = require('../../models/vaccinationModel');
const userModel = require('../../models/userModel');
const documentModel = require('../../models/documentModel');

/** Everything the child section needs, in one round trip. */
exports.show = async (req, res, next) => {
  try {
  const user = await userModel.current();
  const child = await childModel.forUser(user.id);
  if (!child) return res.json({ data: null });

  const [growth, percentile, milestones] = await Promise.all([
    childModel.growth(child.id),
    childModel.percentileSummary(child.id),
    childModel.milestones(child.id),
  ]);

  return res.json({
    data: {
      child: {
        id: String(child.id),
        name: child.name,
        dob: child.dob,
        gender: child.gender,
        ageMonths: child.ageMonths,
        agePretty: child.agePretty,
      },
      // shaped for the chart: the reading plus the WHO band around it
      growth: growth.map((g) => ({
        date: g.date,
        ageMonths: g.age_months,
        weightKg: g.weight_kg,
        heightCm: g.height_cm,
        headCm: g.head_cm,
      })),
      percentile,
      reference: childModel.referenceCurve(childModel.sexOf(child) || 'girls'),
      milestones: milestones.map((m) => ({
        id: String(m.id),
        title: m.title,
        typical: m.typical,
        icon: m.icon,
        achieved: Boolean(m.achieved),
        achievedOn: m.achieved_on || undefined,
      })),
    },
  });
  } catch (err) { return next(err); }
};

exports.toggleMilestone = async (req, res, next) => {
  try {
  const user = await userModel.current();
  const child = await childModel.forUser(user.id);
  if (!child) return res.status(404).json({ error: 'No child on this account' });

  const owned = (await childModel.milestones(child.id))
    .some((m) => String(m.id) === String(req.params.id));
  if (!owned) return res.status(404).json({ error: 'Milestone not found' });

  await childModel.toggleMilestone(req.params.id);
  return res.json({
    data: (await childModel.milestones(child.id)).map((m) => ({
      id: String(m.id),
      title: m.title,
      typical: m.typical,
      icon: m.icon,
      achieved: Boolean(m.achieved),
      achievedOn: m.achieved_on || undefined,
    })),
  });
  } catch (err) { return next(err); }
};

exports.addGrowth = async (req, res, next) => {
  try {
  const user = await userModel.current();
  const child = await childModel.forUser(user.id);
  if (!child) return res.status(404).json({ error: 'No child on this account' });

  const { date, ageMonths, weightKg, heightCm, headCm } = req.body || {};
  if (!date || !Number.isFinite(Number(weightKg))) {
    return res.status(400).json({ error: 'A date and a weight are required' });
  }
  await childModel.addGrowth(child.id, {
    date,
    age_months: Number(ageMonths) || child.ageMonths,
    weight_kg: Number(weightKg),
    height_cm: heightCm != null ? Number(heightCm) : null,
    head_cm: headCm != null ? Number(headCm) : null,
  });
  return res.status(201).json({ data: await childModel.growth(child.id) });
  } catch (err) { return next(err); }
};

/* ------------------------------------------------------- vaccinations */

const toVax = (v, cards = []) => ({
  id: String(v.id),
  subject: v.subject,
  name: v.name,
  dose: v.dose || undefined,
  dueDate: v.due_date,
  status: v.status,
  completedOn: v.completed_on || undefined,
  /** the cards filed as evidence for this dose */
  cards,
});

/**
 * The list, with each dose carrying the cards attached to it.
 *
 * Marking a dose done is a claim; the card is the proof. Sending them together
 * means the screen can show both without a second round trip per dose.
 */
async function vaxPayload(userId) {
  const [rows, meta] = await Promise.all([
    vaccinationModel.all(userId), vaccinationModel.stats(userId),
  ]);
  const cards = await documentModel.forVaccinations(rows.map((r) => r.id));
  return { data: rows.map((r) => toVax(r, cards.get(String(r.id)) ?? [])), meta };
}

exports.vaccinations = async (req, res, next) => {
  try {
    const user = await userModel.current();
    res.json(await vaxPayload(user.id));
  } catch (err) { next(err); }
};

exports.markVaccinationDone = async (req, res, next) => {
  try {
    const user = await userModel.current();
    await vaccinationModel.markDone(req.params.id, user.id);
    res.json(await vaxPayload(user.id));
  } catch (err) { next(err); }
};

/**
 * File a vaccination card against a dose.
 *
 * It is stored in the same place as every other document — this only records
 * which dose it evidences, so the card is still hers if the schedule changes.
 */
exports.uploadVaccinationCard = async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await userModel.current();
    const vax = await vaccinationModel.find(id);
    // scoped, so a card cannot be filed against somebody else's dose
    if (!vax || String(vax.user_id) !== String(user.id)) {
      return res.status(404).json({ error: 'Vaccination not found' });
    }
    await documentModel.create(user.id, {
      kind: 'report',
      title: req.body?.title?.trim() || `${vax.name}${vax.dose ? ` · ${vax.dose}` : ''} card`,
      note: 'Vaccination card',
      dataUrl: req.body?.dataUrl,
      originalName: req.body?.originalName,
      takenOn: req.body?.takenOn || vax.completed_on || undefined,
      uploadedBy: req.body?.uploadedBy || 'mother',
      vaccinationId: id,
    });
    return res.status(201).json(await vaxPayload(user.id));
  } catch (err) {
    if (err instanceof documentModel.DocumentError) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    return next(err);
  }
};

/* ------------------------------------------------ the child's daily log */

/**
 * Today's entry, the recent history, and the averages.
 *
 * Mirrors the mother's check-in endpoint exactly, because the two are answered
 * together: a parent opening the check-in should not have to visit two screens
 * to say how the day went for both of them.
 */
exports.log = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const child = await childModel.forUser(user.id);
    if (!child) return res.status(404).json({ error: 'No child on this account' });

    const date = req.query.date || childLogModel.todayISO();
    const [today, history, summary] = await Promise.all([
      childLogModel.forDate(child.id, date),
      childLogModel.history(child.id, 14),
      childLogModel.summary(child.id, 7),
    ]);

    return res.json({
      data: {
        child: { id: String(child.id), name: child.name },
        today,
        history,
        summary,
        flags: childLogModel.flagsFor(today, child.ageMonths),
        moods: childLogModel.MOODS,
      },
    });
  } catch (err) { return next(err); }
};

exports.saveLog = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const child = await childModel.forUser(user.id);
    if (!child) return res.status(404).json({ error: 'No child on this account' });

    const saved = await childLogModel.save(child.id, req.body || {});
    return res.json({ data: { today: saved, flags: childLogModel.flagsFor(saved, child.ageMonths) } });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

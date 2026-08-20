/**
 * Child API Controller — growth, milestones and vaccinations.
 *
 * These models already existed and were rendered by the EJS pages, but the
 * React client had never been given a way to reach them, so it drew growth
 * charts and milestone lists from hardcoded arrays. Same models, second view.
 */
const childModel = require('../../models/childModel');
const vaccinationModel = require('../../models/vaccinationModel');
const userModel = require('../../models/userModel');

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
      reference: childModel.WHO_WEIGHT_GIRLS,
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

const toVax = (v) => ({
  id: String(v.id),
  subject: v.subject,
  name: v.name,
  dose: v.dose || undefined,
  dueDate: v.due_date,
  status: v.status,
  completedOn: v.completed_on || undefined,
});

exports.vaccinations = async (req, res, next) => {
  try {
    const [rows, meta] = await Promise.all([vaccinationModel.all(), vaccinationModel.stats()]);
    res.json({ data: rows.map(toVax), meta });
  } catch (err) { next(err); }
};

exports.markVaccinationDone = async (req, res, next) => {
  try {
    await vaccinationModel.markDone(req.params.id);
    const [rows, meta] = await Promise.all([vaccinationModel.all(), vaccinationModel.stats()]);
    res.json({ data: rows.map(toVax), meta });
  } catch (err) { next(err); }
};

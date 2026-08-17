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
exports.show = (req, res) => {
  const user = userModel.current();
  const child = childModel.forUser(user.id);
  if (!child) return res.json({ data: null });

  const growth = childModel.growth(child.id);

  res.json({
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
      percentile: childModel.percentileSummary(child.id),
      reference: childModel.WHO_WEIGHT_GIRLS,
      milestones: childModel.milestones(child.id).map((m) => ({
        id: String(m.id),
        title: m.title,
        typical: m.typical,
        icon: m.icon,
        achieved: Boolean(m.achieved),
        achievedOn: m.achieved_on || undefined,
      })),
    },
  });
};

exports.toggleMilestone = (req, res) => {
  const user = userModel.current();
  const child = childModel.forUser(user.id);
  if (!child) return res.status(404).json({ error: 'No child on this account' });

  const owned = childModel.milestones(child.id).some((m) => String(m.id) === String(req.params.id));
  if (!owned) return res.status(404).json({ error: 'Milestone not found' });

  childModel.toggleMilestone(req.params.id);
  res.json({
    data: childModel.milestones(child.id).map((m) => ({
      id: String(m.id),
      title: m.title,
      typical: m.typical,
      icon: m.icon,
      achieved: Boolean(m.achieved),
      achievedOn: m.achieved_on || undefined,
    })),
  });
};

exports.addGrowth = (req, res) => {
  const user = userModel.current();
  const child = childModel.forUser(user.id);
  if (!child) return res.status(404).json({ error: 'No child on this account' });

  const { date, ageMonths, weightKg, heightCm, headCm } = req.body || {};
  if (!date || !Number.isFinite(Number(weightKg))) {
    return res.status(400).json({ error: 'A date and a weight are required' });
  }
  childModel.addGrowth(child.id, {
    date,
    age_months: Number(ageMonths) || child.ageMonths,
    weight_kg: Number(weightKg),
    height_cm: heightCm != null ? Number(heightCm) : null,
    head_cm: headCm != null ? Number(headCm) : null,
  });
  res.status(201).json({ data: childModel.growth(child.id) });
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

exports.vaccinations = (req, res) => {
  res.json({
    data: vaccinationModel.all().map(toVax),
    meta: vaccinationModel.stats(),
  });
};

exports.markVaccinationDone = (req, res) => {
  vaccinationModel.markDone(req.params.id);
  res.json({
    data: vaccinationModel.all().map(toVax),
    meta: vaccinationModel.stats(),
  });
};

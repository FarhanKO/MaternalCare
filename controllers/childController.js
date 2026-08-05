const userModel = require('../models/userModel');
const childModel = require('../models/childModel');

exports.index = (req, res) => {
  const user = userModel.current();
  const child = childModel.forUser(user.id);
  const growth = childModel.growth(child.id);
  const milestones = childModel.milestones(child.id);
  const achieved = milestones.filter(m => m.achieved).length;
  res.render('child', {
    page: 'child', user, child, growth, milestones,
    achieved, milestonePct: Math.round((achieved / milestones.length) * 100),
    percentile: childModel.percentileSummary(child.id),
    who: childModel.WHO_WEIGHT_GIRLS,
    saved: req.query.saved === '1',
  });
};

exports.addGrowth = (req, res) => {
  const user = userModel.current();
  const child = childModel.forUser(user.id);
  const { date, age_months, weight_kg, height_cm, head_cm } = req.body;
  childModel.addGrowth(child.id, {
    date: date || new Date().toISOString().slice(0, 10),
    age_months: Number(age_months), weight_kg: Number(weight_kg),
    height_cm: Number(height_cm), head_cm: Number(head_cm),
  });
  res.redirect('/child?saved=1');
};

exports.toggleMilestone = (req, res) => {
  childModel.toggleMilestone(Number(req.params.id));
  res.redirect('/child#milestones');
};

const userModel = require('../models/userModel');
const childModel = require('../models/childModel');

exports.index = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const child = await childModel.forUser(user.id);
    const [growth, milestones, percentile] = await Promise.all([
      childModel.growth(child.id),
      childModel.milestones(child.id),
      childModel.percentileSummary(child.id),
    ]);
    const achieved = milestones.filter(m => m.achieved).length;
    res.render('child', {
      page: 'child', user, child, growth, milestones,
      achieved, milestonePct: milestones.length ? Math.round((achieved / milestones.length) * 100) : 0,
      percentile,
      // the curve for *this* child, not girls' weight for everyone
      who: childModel.referenceCurve(childModel.sexOf(child) || 'girls')
        || childModel.referenceCurve('girls'),
      saved: req.query.saved === '1',
    });
  } catch (err) { next(err); }
};

exports.addGrowth = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const child = await childModel.forUser(user.id);
    const { date, age_months, weight_kg, height_cm, head_cm } = req.body || {};
    await childModel.addGrowth(child.id, {
      date: date || new Date().toISOString().slice(0, 10),
      age_months: Number(age_months), weight_kg: Number(weight_kg),
      height_cm: Number(height_cm), head_cm: Number(head_cm),
    });
    res.redirect('/child?saved=1');
  } catch (err) { next(err); }
};

exports.toggleMilestone = async (req, res, next) => {
  try {
    await childModel.toggleMilestone(Number(req.params.id));
    res.redirect('/child#milestones');
  } catch (err) { next(err); }
};

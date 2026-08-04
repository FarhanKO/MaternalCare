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



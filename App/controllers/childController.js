const userModel = require('../models/userModel');
const childModel = require('../models/childModel');

exports.index = (req, res) => {
  const user = userModel.current();
  const child = childModel.forUser(user.id);
  const growth = childModel.growth(child.id);
  const milestones = childModel.milestones(child.id);
  const achieved = milestones.filter(m => m.achieved).length;


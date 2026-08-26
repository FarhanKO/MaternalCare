const userModel = require('../models/userModel');
const pregnancyModel = require('../models/pregnancyModel');
const vitalModel = require('../models/vitalModel');

exports.index = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const [pregnancy, vitals] = await Promise.all([
      pregnancyModel.forUser(user.id),
      vitalModel.history(user.id),
    ]);
    const timeline = pregnancyModel.timeline ? pregnancyModel.timeline(pregnancy.week) : [];
    res.render('pregnancy', {
      page: 'pregnancy', user, pregnancy,
      timeline,
      vitals,
    });
  } catch (err) { next(err); }
};

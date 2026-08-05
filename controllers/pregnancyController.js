const userModel = require('../models/userModel');
const pregnancyModel = require('../models/pregnancyModel');
const vitalModel = require('../models/vitalModel');

exports.index = (req, res) => {
  const user = userModel.current();
  const pregnancy = pregnancyModel.forUser(user.id);
  res.render('pregnancy', {
    page: 'pregnancy', user, pregnancy,
    timeline: pregnancyModel.timeline(pregnancy.week),
    vitals: vitalModel.history(user.id),
  });
};

const userModel = require('../models/userModel');
const pregnancyModel = require('../models/pregnancyModel');
const vitalModel = require('../models/vitalModel');
const riskModel = require('../models/riskModel');

exports.index = (req, res) => {
  const user = userModel.current();
  const pregnancy = pregnancyModel.forUser(user.id);
  const latest = vitalModel.latest(user.id);
  res.render('risk', {
    page: 'risk', user, pregnancy, latest,
    result: riskModel.fromLatestVitals(user, pregnancy),
    custom: false,
  });
};


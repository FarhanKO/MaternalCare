const vaccinationModel = require('../models/vaccinationModel');
const userModel = require('../models/userModel');
const childModel = require('../models/childModel');

exports.index = (req, res) => {
  const user = userModel.current();
  res.render('vaccinations', {
    page: 'vaccinations', user,
    child: childModel.forUser(user.id),
    vaccinations: vaccinationModel.all(),
    stats: vaccinationModel.stats(),
  });
};

exports.markDone = (req, res) => {
  vaccinationModel.markDone(Number(req.params.id));
  res.redirect('/vaccinations');
};

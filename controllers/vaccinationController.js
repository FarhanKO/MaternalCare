const vaccinationModel = require('../models/vaccinationModel');
const userModel = require('../models/userModel');
const childModel = require('../models/childModel');

exports.index = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const [child, vaccinations, stats] = await Promise.all([
      childModel.forUser(user.id),
      vaccinationModel.all(),
      vaccinationModel.stats(),
    ]);
    res.render('vaccinations', {
      page: 'vaccinations', user,
      child,
      vaccinations,
      stats,
    });
  } catch (err) { next(err); }
};

exports.markDone = async (req, res, next) => {
  try {
    await vaccinationModel.markDone(Number(req.params.id));
    res.redirect('/vaccinations');
  } catch (err) { next(err); }
};

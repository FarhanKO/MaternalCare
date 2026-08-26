const userModel = require('../models/userModel');
const vitalModel = require('../models/vitalModel');
const pregnancyModel = require('../models/pregnancyModel');

exports.index = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const [pregnancy, vitals, latest, alerts] = await Promise.all([
      pregnancyModel.forUser(user.id),
      vitalModel.history(user.id),
      vitalModel.latest(user.id),
      vitalModel.alerts(user.id),
    ]);
    res.render('vitals', {
      page: 'vitals',
      user,
      pregnancy,
      vitals,
      latest,
      alerts,
      thresholds: vitalModel.THRESHOLDS,
      saved: req.query.saved === '1',
    });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const { date, systolic, diastolic, sugar, weight_kg, temp_c } = req.body || {};
    const parseNum = (v) => (v === undefined || v === null || v === '' ? null : Number(v));
    await vitalModel.add(user.id, {
      date: date || new Date().toISOString().slice(0, 10),
      systolic: parseNum(systolic),
      diastolic: parseNum(diastolic),
      sugar: parseNum(sugar),
      weight_kg: parseNum(weight_kg),
      temp_c: parseNum(temp_c),
    });
    res.redirect('/vitals?saved=1');
  } catch (err) { next(err); }
};

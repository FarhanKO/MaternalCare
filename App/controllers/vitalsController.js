const userModel = require('../models/userModel');
const vitalModel = require('../models/vitalModel');
const pregnancyModel = require('../models/pregnancyModel');

exports.index = (req, res) => {
  const user = userModel.current();
  res.render('vitals', {
    page: 'vitals',
    user,
    pregnancy: pregnancyModel.forUser(user.id),
    vitals: vitalModel.history(user.id),
    latest: vitalModel.latest(user.id),
    alerts: vitalModel.alerts(user.id),
    thresholds: vitalModel.THRESHOLDS,
    saved: req.query.saved === '1',
  });
};

exports.create = (req, res) => {
  const user = userModel.current();
  const { date, systolic, diastolic, sugar, weight_kg, temp_c } = req.body;
  vitalModel.add(user.id, {
    date: date || new Date().toISOString().slice(0, 10),
    systolic: Number(systolic), diastolic: Number(diastolic),
    sugar: Number(sugar), weight_kg: Number(weight_kg), temp_c: Number(temp_c),
  });
  res.redirect('/vitals?saved=1');
};

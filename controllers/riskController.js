const userModel = require('../models/userModel');
const pregnancyModel = require('../models/pregnancyModel');
const vitalModel = require('../models/vitalModel');
const riskModel = require('../models/riskModel');
const guidanceModel = require('../models/guidanceModel');

exports.index = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const [pregnancy, latest] = await Promise.all([
      pregnancyModel.forUser(user.id),
      vitalModel.latest(user.id),
    ]);
    const [result, plan] = await Promise.all([
      riskModel.fromLatestVitals(user, pregnancy),
      guidanceModel.forUser(user.id),
    ]);
    res.render('risk', {
      page: 'risk', user, pregnancy, latest,
      result, plan,
      custom: false,
    });
  } catch (err) { next(err); }
};

/**
 * The "what if my numbers were these" form.
 *
 * The plan is rebuilt against the hypothetical assessment rather than her
 * stored one, because a page that recalculates the score and leaves last
 * week's advice underneath it is worse than one that does neither. Everything
 * except the readings still comes from her real record — her stage, her
 * conditions, her log — since none of that is what she is changing.
 */
exports.assess = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const pregnancy = await pregnancyModel.forUser(user.id);
    const { age, systolic, diastolic, sugar, temp } = req.body || {};
    const vitals = {
      systolic: Number(systolic), diastolic: Number(diastolic),
      sugar: Number(sugar), temp_c: Number(temp),
    };
    const result = riskModel.assess({
      age: Number(age), ...vitals, temp: Number(temp),
      week: pregnancy ? pregnancy.week : undefined,
    });
    const ctx = await guidanceModel.context(user.id);
    const plan = guidanceModel.build({ ...ctx, risk: result, vitals });
    res.render('risk', {
      page: 'risk', user, pregnancy,
      latest: { systolic, diastolic, sugar, temp_c: temp },
      result, plan, custom: true,
    });
  } catch (err) { next(err); }
};

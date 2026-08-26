const userModel = require('../models/userModel');

exports.index = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const contacts = await userModel.emergencyContacts(user.id);
    res.render('emergency', { page: 'emergency', user, contacts });
  } catch (err) { next(err); }
};

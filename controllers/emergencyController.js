const userModel = require('../models/userModel');
const contentModel = require('../models/contentModel');

exports.index = (req, res) => {
  const user = userModel.current();
  res.render('emergency', {
    page: 'emergency', user,
    contacts: userModel.emergencyContacts(user.id),
    hospitals: contentModel.hospitals(),
  });
};

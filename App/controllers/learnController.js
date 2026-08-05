const userModel = require('../models/userModel');
const contentModel = require('../models/contentModel');

exports.index = (req, res) => {
  const user = userModel.current();
  const category = req.query.category || 'All';
  res.render('learn', {
    page: 'learn', user, category,
    articles: contentModel.articles(category),
    categories: contentModel.articleCategories(),
    posts: contentModel.posts(),
    posted: req.query.posted === '1',
  });
};


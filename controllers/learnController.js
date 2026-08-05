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

exports.post = (req, res) => {
  const user = userModel.current();
  const { tag, title, body } = req.body;
  if (title && title.trim())
    contentModel.addPost({ author: user.name, tag: tag || 'General', title: title.trim(), body: (body || '').trim() });
  res.redirect('/learn?posted=1#community');
};

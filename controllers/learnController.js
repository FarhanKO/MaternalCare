const userModel = require('../models/userModel');
const contentModel = require('../models/contentModel');

exports.index = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const category = req.query.category || 'All';
    const [articles, categories, posts] = await Promise.all([
      contentModel.articles(category),
      contentModel.articleCategories(),
      contentModel.posts(),
    ]);
    res.render('learn', {
      page: 'learn', user, category,
      articles,
      categories,
      posts,
      posted: req.query.posted === '1',
    });
  } catch (err) { next(err); }
};

exports.post = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const { tag, title, body } = req.body || {};
    if (title && title.trim()) {
      await contentModel.addPost({ author: user.name, tag: tag || 'General', title: title.trim(), body: (body || '').trim() });
    }
    res.redirect('/learn?posted=1#community');
  } catch (err) { next(err); }
};

/**
 * Community API Controller — posts and their comments.
 * Thin: paging, validation and image handling all live in postModel.
 */
const fs = require('fs');
const postModel = require('../../models/postModel');
const userModel = require('../../models/userModel');
const pregnancyModel = require('../../models/pregnancyModel');

exports.index = async (req, res, next) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const topic = req.query.topic;

  try {
    const [data, total] = await Promise.all([
      postModel.all({ limit, offset, topic }),
      postModel.count(topic),
    ]);
    res.json({ data, meta: { total, limit, offset } });
  } catch (err) { next(err); }
};

/** She posts as herself, at whatever week she is currently in. */
exports.create = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const pregnancy = await pregnancyModel.forUser(user.id);
    const created = await postModel.create(user.id, {
      author: req.body?.author || user.name,
      role: 'mother',
      week: pregnancy ? pregnancy.week : undefined,
      topic: req.body?.topic,
      title: req.body?.title,
      body: req.body?.body,
      imageDataUrl: req.body?.image,
    });
    res.status(201).json({ data: created });
  } catch (err) {
    if (err instanceof postModel.PostError) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    return next(err);
  }
};

exports.comment = async (req, res, next) => {
  try {
    const user = await userModel.current();
    res.status(201).json({
      data: await postModel.comment(req.params.id, user.id, {
        author: req.body?.author || user.name,
        role: req.body?.role === 'doctor' ? 'doctor' : 'mother',
        body: req.body?.body,
      }),
    });
  } catch (err) {
    if (err instanceof postModel.PostError) {
      const status = err.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ error: err.message, code: err.code });
    }
    return next(err);
  }
};

exports.heart = async (req, res, next) => {
  const delta = req.body?.delta === -1 ? -1 : 1;
  try {
    const updated = await postModel.heart(req.params.id, delta);
    if (!updated) return res.status(404).json({ error: 'Post not found' });
    return res.json({ data: updated });
  } catch (err) { return next(err); }
};

/** Post images, streamed from disk so list payloads stay small. */
exports.image = (req, res) => {
  const full = postModel.imagePath(req.params.file);
  if (!full) return res.status(404).json({ error: 'Image not found' });
  res.setHeader('Cache-Control', 'private, max-age=86400');
  fs.createReadStream(full).pipe(res);
};

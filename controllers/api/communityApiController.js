/**
 * Community API Controller — posts and their comments.
 * Thin: paging, validation and image handling all live in postModel.
 */
const fs = require('fs');
const postModel = require('../../models/postModel');
const userModel = require('../../models/userModel');
const pregnancyModel = require('../../models/pregnancyModel');

exports.index = (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const topic = req.query.topic;

  res.json({
    data: postModel.all({ limit, offset, topic }),
    meta: { total: postModel.count(topic), limit, offset },
  });
};

/** She posts as herself, at whatever week she is currently in. */
exports.create = (req, res) => {
  const user = userModel.current();
  const pregnancy = pregnancyModel.forUser(user.id);
  try {
    const created = postModel.create(user.id, {
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
    throw err;
  }
};

exports.comment = (req, res) => {
  const user = userModel.current();
  try {
    res.status(201).json({
      data: postModel.comment(req.params.id, user.id, {
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
    throw err;
  }
};

exports.heart = (req, res) => {
  const delta = req.body?.delta === -1 ? -1 : 1;
  const updated = postModel.heart(req.params.id, delta);
  if (!updated) return res.status(404).json({ error: 'Post not found' });
  res.json({ data: updated });
};

/** Post images, streamed from disk so list payloads stay small. */
exports.image = (req, res) => {
  const full = postModel.imagePath(req.params.file);
  if (!full) return res.status(404).json({ error: 'Image not found' });
  res.setHeader('Cache-Control', 'private, max-age=86400');
  fs.createReadStream(full).pipe(res);
};

/**
 * Profile API Controller — her name, photo, bio and clinical basics.
 * These used to live only in the browser, so a changed photo never reached
 * the doctor and was lost on refresh.
 */
const fs = require('fs');
const userModel = require('../../models/userModel');
const dailyLogModel = require('../../models/dailyLogModel');
const pregnancyModel = require('../../models/pregnancyModel');

exports.show = (req, res) => {
  res.json({ data: userModel.profile(userModel.current().id) });
};

/** One PATCH handles whichever fields the panel changed. */
exports.update = (req, res) => {
  const id = userModel.current().id;
  const { name, bio, avatar, bloodGroup, age, stage } = req.body || {};
  try {
    if (name !== undefined) userModel.setName(id, name);
    if (bio !== undefined) userModel.setBio(id, bio);
    if (avatar !== undefined) userModel.setAvatar(id, avatar);
    if (stage !== undefined) userModel.setStage(id, stage);
    if (bloodGroup !== undefined || age !== undefined) {
      userModel.setDetails(id, { bloodGroup, age });
    }
    res.json({ data: userModel.profile(id) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Weight gain against the range recommended for her starting BMI — the
 * reason pre-pregnancy weight and height are recorded at booking.
 */
exports.weightGain = (req, res) => {
  res.json({ data: pregnancyModel.weightGain(userModel.current().id) });
};

exports.avatar = (req, res) => {
  const full = userModel.avatarPath(req.params.file);
  if (!full) return res.status(404).json({ error: 'Photo not found' });
  res.setHeader('Cache-Control', 'private, max-age=3600');
  fs.createReadStream(full).pipe(res);
};

/* ------------------------------------------------- daily self-reporting */

exports.dailyLog = (req, res) => {
  const id = userModel.current().id;
  res.json({
    data: {
      today: dailyLogModel.forDate(id),
      history: dailyLogModel.history(id, 14),
      summary: dailyLogModel.summary(id, 7),
    },
  });
};

exports.saveDailyLog = (req, res) => {
  const id = userModel.current().id;
  try {
    const saved = dailyLogModel.save(id, {
      mood: req.body?.mood,
      kicks: req.body?.kicks,
      waterLitres: req.body?.waterLitres,
    });
    res.json({
      data: { today: saved, history: dailyLogModel.history(id, 14),
        summary: dailyLogModel.summary(id, 7) },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Profile API Controller — her name, photo, bio and clinical basics.
 * These used to live only in the browser, so a changed photo never reached
 * the doctor and was lost on refresh.
 */
const fs = require('fs');
const userModel = require('../../models/userModel');
const dailyLogModel = require('../../models/dailyLogModel');
const pregnancyModel = require('../../models/pregnancyModel');

exports.show = async (req, res, next) => {
  try {
    const me = await userModel.current();
    res.json({ data: await userModel.profile(me.id) });
  } catch (err) { next(err); }
};

/** One PATCH handles whichever fields the panel changed. */
exports.update = async (req, res) => {
  const { name, bio, avatar, bloodGroup, age, stage } = req.body || {};
  try {
    const { id } = await userModel.current();
    if (name !== undefined) await userModel.setName(id, name);
    if (bio !== undefined) await userModel.setBio(id, bio);
    if (avatar !== undefined) await userModel.setAvatar(id, avatar);
    if (stage !== undefined) await userModel.setStage(id, stage);
    if (bloodGroup !== undefined || age !== undefined) {
      await userModel.setDetails(id, { bloodGroup, age });
    }
    res.json({ data: await userModel.profile(id) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Weight gain against the range recommended for her starting BMI — the
 * reason pre-pregnancy weight and height are recorded at booking.
 */
exports.weightGain = async (req, res, next) => {
  try {
    const me = await userModel.current();
    res.json({ data: await pregnancyModel.weightGain(me.id) });
  } catch (err) { next(err); }
};

/** Serving bytes off disk stayed synchronous — there is no query behind it. */
exports.avatar = (req, res) => {
  const full = userModel.avatarPath(req.params.file);
  if (!full) return res.status(404).json({ error: 'Photo not found' });
  res.setHeader('Cache-Control', 'private, max-age=3600');
  fs.createReadStream(full).pipe(res);
};

/* ------------------------------------------------- daily self-reporting */

exports.dailyLog = async (req, res, next) => {
  try {
    const { id } = await userModel.current();
    const [today, history, summary] = await Promise.all([
      dailyLogModel.forDate(id),
      dailyLogModel.history(id, 14),
      dailyLogModel.summary(id, 7),
    ]);
    res.json({ data: { today, history, summary } });
  } catch (err) { next(err); }
};

exports.saveDailyLog = async (req, res) => {
  try {
    const { id } = await userModel.current();
    const saved = await dailyLogModel.save(id, {
      mood: req.body?.mood,
      kicks: req.body?.kicks,
      waterLitres: req.body?.waterLitres,
    });
    const [history, summary] = await Promise.all([
      dailyLogModel.history(id, 14),
      dailyLogModel.summary(id, 7),
    ]);
    res.json({ data: { today: saved, history, summary } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

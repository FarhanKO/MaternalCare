/**
 * Session API Controller — who is signed in, and the pregnancy summary that
 * travels with them.
 *
 * These two handlers used to sit inline in routes/api.js. That put logic in
 * the routing layer, and it hid a real bug through the Postgres conversion:
 * the models went async around them, so both were serialising unresolved
 * promises and answering 200 with `{"user":{},"pregnancy":{}}`.
 */
const userModel = require('../../models/userModel');
const pregnancyModel = require('../../models/pregnancyModel');

exports.show = async (req, res, next) => {
  try {
    const user = await userModel.current();
    const pregnancy = await pregnancyModel.forUser(user.id);
    res.json({ data: { user, pregnancy } });
  } catch (err) { next(err); }
};

/** Set at the end of onboarding; decides which stage the whole app renders. */
exports.setStage = async (req, res) => {
  try {
    const user = await userModel.current();
    res.json({ data: await userModel.setStage(user.id, req.body?.stage) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Which language she reads the app in.
 *
 * Separate from setStage because it is set from a different place and means a
 * different thing, and because this one is read by the server when it composes
 * her care plan — not only by the client when it renders chrome.
 */
exports.language = async (req, res, next) => {
  try {
    const user = await userModel.current();
    return res.json({ data: { language: await userModel.language(user.id) } });
  } catch (err) { return next(err); }
};

exports.setLanguage = async (req, res) => {
  try {
    const user = await userModel.current();
    const language = await userModel.setLanguage(user.id, req.body?.language);
    return res.json({ data: { language } });
  } catch (err) {
    return res.status(400).json({ error: err.message, supported: userModel.LANGUAGES });
  }
};

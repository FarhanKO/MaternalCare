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

/**
 * Auth API Controller — signing in, signing out, and who am I.
 *
 * The session lives in an httpOnly cookie, so the token never reaches
 * JavaScript and an XSS bug cannot carry it away. Nothing here puts a password
 * in a response, a log line or an error message.
 */
const authModel = require('../../models/authModel');
const userModel = require('../../models/userModel');
const context = require('../../config/context');
const session = require('../../middleware/session');

/** The shape the client is allowed to see. Never the hash. */
const publicUser = (u) => ({
  id: String(u.id),
  name: u.name,
  role: u.role,
  stage: u.stage,
  email: u.email,
  language: u.language,
});

exports.login = async (req, res, next) => {
  const { email, password } = req.body || {};
  try {
    const user = await authModel.authenticate(email, password);
    const token = await authModel.startSession(user.id, req.headers['user-agent']);

    res.cookie(session.COOKIE, token, session.cookieOptions());
    // so anything else this request touches is already her
    context.setUser(user);

    return res.json({ data: { user: publicUser(user) } });
  } catch (err) {
    if (err instanceof authModel.AuthError) {
      /*
       * 401 with one message for every failure mode. Saying "no such account"
       * separately from "wrong password" turns this form into a way of asking
       * whether a particular woman is a patient here.
       */
      return res.status(401).json({ error: err.message, code: 'BAD_LOGIN' });
    }
    return next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await authModel.endSession(req.sessionId);
    res.clearCookie(session.COOKIE, { path: '/' });
    return res.status(204).end();
  } catch (err) { return next(err); }
};

/** Who is signed in. 200 with null rather than 401 — the client asks on load. */
exports.session = async (req, res) => {
  res.json({ data: { user: req.user ? publicUser(req.user) : null } });
};

/**
 * Change a password.
 *
 * Requires the current one even though the caller is already signed in: it is
 * what stops an unattended screen becoming a permanent account takeover.
 * Succeeding ends every other session, which is the point of changing it.
 */
exports.changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body || {};
  try {
    await authModel.authenticate(req.user.email, currentPassword);
    await authModel.setPassword(req.user.id, newPassword);

    // she stays signed in here; every other device does not
    const token = await authModel.startSession(req.user.id, req.headers['user-agent']);
    res.cookie(session.COOKIE, token, session.cookieOptions());

    return res.json({ data: { changed: true } });
  } catch (err) {
    if (err instanceof authModel.AuthError) {
      const status = err.code === 'BAD_LOGIN' ? 401 : 400;
      return res.status(status).json({
        error: err.code === 'BAD_LOGIN' ? 'Your current password is not right' : err.message,
        code: err.code,
      });
    }
    return next(err);
  }
};

/**
 * The demo accounts, for the sign-in screen.
 *
 * Names and emails only — never the passwords, which live in the seed script
 * and in the README where a person can read them, not in an endpoint the
 * whole internet can. It exists so somebody demonstrating this does not have
 * to memorise four addresses.
 */
exports.demoAccounts = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not available' });
    }
    const mothers = await userModel.mothers();
    return res.json({
      data: mothers
        .filter((m) => m.email)
        .map((m) => ({
          name: m.name, email: m.email, stage: m.stage, conditions: m.conditions || '',
        })),
      meta: { note: 'Demo accounts. Passwords are in the project README.' },
    });
  } catch (err) { return next(err); }
};

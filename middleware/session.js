/**
 * Session middleware.
 *
 * Reads the session cookie, resolves the user, and runs the rest of the
 * request inside a context that `userModel.current()` can see.
 *
 * The cookie is parsed by hand rather than with `cookie-parser`. It is six
 * lines for the one cookie this app sets, and a dependency that exists to
 * split a string on ';' is a dependency that still has to be audited and
 * updated.
 */
const authModel = require('../models/authModel');
const context = require('../config/context');

const COOKIE = 'mc_session';

/** `a=1; b=2` → { a: '1', b: '2' }. Values are URL-encoded on the way out. */
function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const eq = part.indexOf('=');
    if (eq < 1) continue;
    const key = part.slice(0, eq).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      /* a malformed cookie is not a reason to fail the request */
    }
  }
  return out;
}

/**
 * Cookie flags.
 *
 *   httpOnly  script cannot read it, so an XSS bug cannot steal the session
 *   sameSite  the browser will not send it on a cross-site request, which is
 *             what stops a CSRF from acting as her
 *   secure    only over HTTPS — off in development, where there is none
 */
function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: authModel.SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

module.exports = {
  COOKIE,
  cookieOptions,

  /**
   * Attach the session to every request.
   *
   * Never rejects. Deciding what an anonymous request may do is the guards'
   * job below — this only answers "who is this", and "nobody" is a valid
   * answer for the sign-in page and the marketing site.
   */
  attach() {
    return async (req, res, next) => {
      const token = parseCookies(req.headers.cookie)[COOKIE] || null;
      let user = null;
      try {
        user = token ? await authModel.userForSession(token) : null;
      } catch {
        user = null;                       // database trouble is not a login
      }
      req.user = user;
      req.sessionId = token;
      context.run({ user, sessionId: token }, () => next());
    };
  },

  /** Reject anything without a signed-in user. */
  requireUser(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Please sign in', code: 'NO_SESSION' });
    }
    return next();
  },

  /**
   * Reject anything not signed in as one of these roles.
   *
   * Coarse on purpose: the finer question — may *this* clinician read *that*
   * patient — belongs with the patient model, which already checks the
   * caseload.
   */
  requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Please sign in', code: 'NO_SESSION' });
      }
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'This is not available to your account', code: 'WRONG_ROLE' });
      }
      return next();
    };
  },
};

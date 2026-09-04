/**
 * Per-request context.
 *
 * `userModel.current()` is called from deep inside the model layer — the care
 * plan, the risk assessment, the report builder — none of which take a user
 * id, because for the whole life of this project there was only ever one user.
 * Real sessions break that assumption: the answer now depends on who is
 * asking, and the answer has to reach code that was never given a way to ask.
 *
 * The alternatives were threading a userId through every model signature —
 * dozens of functions, and one missed call silently serving the wrong woman's
 * record — or this: Node's own AsyncLocalStorage, which carries a value down
 * an async call tree without touching anything in between.
 *
 * The important property is that it is *per request*. A module-level variable
 * would look identical in a single-user demo and would serve one patient's
 * data to another the moment two requests overlapped.
 */
const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

module.exports = {
  /** Run `fn` with this request's context attached. */
  run(context, fn) {
    return storage.run(context, fn);
  },

  /** The signed-in user, or null outside a request (scripts, tests, seeds). */
  user() {
    return storage.getStore()?.user ?? null;
  },

  /** The session token, for logout. */
  sessionId() {
    return storage.getStore()?.sessionId ?? null;
  },

  /**
   * Replace the user on the current context.
   *
   * Used after signing in within the same request, so the response can be
   * built as the person who just authenticated rather than as nobody.
   */
  setUser(user) {
    const store = storage.getStore();
    if (store) store.user = user;
  },
};

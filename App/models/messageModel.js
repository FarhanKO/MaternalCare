/**
 * Message Model — the conversation between one mother and one doctor.
 *
 * A thread is identified by the pair (mother, doctor); there is no separate
 * conversation table because a mother only ever has one running conversation
 * with a given clinician. `sender` says which end wrote each line, and
 * `read_at` is set when the *other* end opens the thread.
 */
const db = require('../config/db');

const SENDERS = ['mother', 'doctor'];
/** Long enough for real clinical advice, short enough to stay a message. */
const MAX_BODY = 2000;


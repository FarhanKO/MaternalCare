/**
 * SOS Model — raising, fanning out and standing down an emergency alert.
 *
 * Honesty about delivery matters more here than anywhere else in the app, so
 * each recipient records the channel it went out on and whether it actually
 * landed:
 *
 *   in-app        the clinician sees it in their portal now      → alerted
 *   guardian-app  needs the companion app, which is not built    → pending
 *   sms           needs a gateway we do not have                 → pending
 *
 * A screen that claimed every guardian had been reached would be a dangerous
 * lie in exactly the situation where the mother is relying on it.
 */
const crypto = require('crypto');
const db = require('../config/db');
const messageModel = require('./messageModel');

const OPEN = 'active';
/** Bangladesh's national emergency line; overridable per account. */
const DEFAULT_EMERGENCY = '999';


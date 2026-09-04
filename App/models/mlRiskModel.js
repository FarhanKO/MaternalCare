/**
 * ML Risk Model — the Node side of the FastAPI classifier.
 *
 * The application does not depend on this service being up, and that is the
 * central design decision rather than a nicety. A maternal health app that
 * shows nothing when a Python process is not running is worse than one with no
 * model at all, so every call here is short, guarded, and returns null instead
 * of throwing. `riskModel` — the transparent rule engine — remains the thing
 * the rest of the app is built on.
 *
 * Why keep both rather than replace one with the other:
 *
 *   * The rule engine explains itself. It returns the individual factors that
 *     produced the score, and the care plan (guidanceModel) is built entirely
 *     out of those factors — "your last fasting glucose was 104 mg/dL" comes
 *     from there. A classifier returns a class and a probability and has
 *     nothing to say about why.
 *
 *   * The model has seen real pregnancies. Its thresholds were learned from
 *     451 distinct records from Bangladeshi clinics rather than written into a
 *     JavaScript file by hand.
 *
 * They are therefore reported side by side, and where they disagree that is
 * shown rather than resolved. A disagreement is information: it means the
 * reading sits somewhere the two ways of looking at it part company, which is
 * exactly when a clinician should be the one deciding.
 */
const SERVICE = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Milliseconds to wait. Deliberately short — this sits inside a page render,
 * and a slow answer is worth less here than a fast absence of one.
 */
const TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS || 2500);

/**
 * Health is cached because it is asked far more often than it changes, and a
 * dead service should cost one failed connection a minute rather than one per
 * page view.
 */
const HEALTH_TTL_MS = 60_000;
let healthCache = { at: 0, value: null };

/**
 * Forget what we last believed about the service.
 *
 * Called when a real request fails. A cached "up" from fifty seconds ago is
 * weaker evidence than a call that just refused to connect, and reporting the
 * stale one leaves a page saying the model is running next to a space where
 * its answer should be.
 */
function forgetHealth() {
  healthCache = { at: 0, value: null };
}

async function call(path, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${SERVICE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      signal: controller.signal,
    });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  } catch {
    // unreachable, refused, or too slow — all the same to the caller
    forgetHealth();
    return { ok: false, status: 0, body: null };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  SERVICE,

  /** Is the classifier reachable and loaded? Cached for a minute. */
  async health() {
    if (Date.now() - healthCache.at < HEALTH_TTL_MS) return healthCache.value;
    const { ok, body } = await call('/health', { method: 'GET' });
    const value = ok && body?.status === 'ok'
      ? { up: true, trainedOnRows: body.trained_on_rows ?? null }
      : { up: false, trainedOnRows: null };
    healthCache = { at: Date.now(), value };
    return value;
  },

  /** The model card — how it was trained and how well it scores. */
  async card() {
    const { ok, body } = await call('/model', { method: 'GET' });
    return ok ? body : null;
  },

  /**
   * Classify one set of vitals.
   *
   * Returns null whenever the service cannot answer — down, too slow, or
   * asked about a reading outside what it was trained on. The caller shows the
   * rule engine alone in that case, which is the same thing it showed before
   * this service existed.
   *
   * `refused` is distinguished from `down` because they mean different things
   * to a reader: one is "the model is not running", the other is "the model
   * has seen nothing like this reading", and the second is worth saying.
   */
  async predict({
    age, systolic, diastolic, sugar, tempC, heartBpm,
  }) {
    if (![age, systolic, diastolic, sugar, tempC].every((v) => Number.isFinite(Number(v)))) {
      return null;
    }

    const { ok, status, body } = await call('/predict', {
      method: 'POST',
      body: JSON.stringify({
        age: Number(age),
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        sugar_mg_dl: Number(sugar),
        temp_c: Number(tempC),
        heart_bpm: Number.isFinite(Number(heartBpm)) ? Number(heartBpm) : null,
      }),
    });

    if (!ok) {
      if (status === 422) {
        return {
          available: false,
          refused: true,
          reason: typeof body?.detail === 'string'
            ? body.detail
            : 'That reading is outside what the model was trained on',
        };
      }
      return null;
    }

    return {
      available: true,
      level: body.level,
      label: { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' }[body.level],
      confidence: body.confidence,
      probabilities: body.probabilities,
      /** features the service had to stand in for, and readings it pulled into range */
      imputed: body.imputed ?? [],
      clamped: body.clamped ?? [],
      quality: body.model_quality ?? null,
    };
  },

  /**
   * Both opinions on one reading, and whether they agree.
   *
   * `agreement` is the useful field. 'agree' means two unrelated methods
   * reached the same answer; 'model-higher' means the classifier is more
   * worried than the rules are, which is the direction worth acting on.
   */
  compare(rule, ml) {
    if (!rule || !ml?.available) return { agreement: 'unavailable', note: null };

    const ORDER = { low: 0, medium: 1, high: 2 };
    const delta = ORDER[ml.level] - ORDER[rule.level];

    if (delta === 0) {
      return {
        agreement: 'agree',
        note: `The rules and the model both read this as ${rule.label.toLowerCase()}.`,
      };
    }
    if (delta > 0) {
      return {
        agreement: 'model-higher',
        note: `The rules read this as ${rule.label.toLowerCase()}, but the model — trained on real clinic records — puts it at ${ml.label.toLowerCase()}. Worth a clinician's eye.`,
      };
    }
    return {
      agreement: 'rules-higher',
      note: `The rules read this as ${rule.label.toLowerCase()} while the model reads it lower. The rules are deliberately cautious; treat the higher of the two as the one to act on.`,
    };
  },
};

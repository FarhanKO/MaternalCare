/**
 * API routes — JSON interface consumed by the React client (frontend/).
 * Mirrors the MVC split of routes/web.js: routes → controllers → models.
 */
const express = require('express');
const router = express.Router();

const symptomApi = require('../controllers/api/symptomApiController');
const reminderApi = require('../controllers/api/reminderApiController');
const patientApi = require('../controllers/api/patientApiController');
const userModel = require('../models/userModel');
const pregnancyModel = require('../models/pregnancyModel');

/* current demo session user + pregnancy summary */
router.get('/me', (req, res) => {
  const user = userModel.current();
  const pregnancy = pregnancyModel.forUser(user.id);
  res.json({ data: { user, pregnancy } });
});

/* update the signed-in user's life stage (set at the end of onboarding) */
router.patch('/me', (req, res) => {
  const user = userModel.current();
  try {
    res.json({ data: userModel.setStage(user.id, req.body?.stage) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* patients — the clinician's caseload */
router.get('/patients', patientApi.index);
router.get('/patients/:id', patientApi.show);
router.get('/patients/:id/reminders', patientApi.reminders);
router.get('/patients/:id/symptoms', patientApi.symptoms);
router.post('/patients/:id/reminders', patientApi.assign);

/* symptoms */
router.get('/symptoms', symptomApi.index);
router.put('/symptoms', symptomApi.replace);
router.post('/symptoms', symptomApi.create);
router.patch('/symptoms/:id', symptomApi.update);
router.delete('/symptoms/:id', symptomApi.destroy);
router.post('/symptoms/end-entry', symptomApi.clearConfirmations);

/* reminders & appointments */
router.get('/reminders', reminderApi.index);
router.post('/reminders', reminderApi.create);
router.delete('/reminders/:id', reminderApi.destroy);

module.exports = router;

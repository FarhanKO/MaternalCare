/**
 * API routes — JSON interface consumed by the React client (frontend/).
 * Mirrors the MVC split of routes/web.js: routes → controllers → models.
 */
const express = require('express');
const router = express.Router();

const symptomApi = require('../controllers/api/symptomApiController');
const reminderApi = require('../controllers/api/reminderApiController');
const patientApi = require('../controllers/api/patientApiController');
const careApi = require('../controllers/api/careApiController');
const messageApi = require('../controllers/api/messageApiController');
const documentApi = require('../controllers/api/documentApiController');
const sosApi = require('../controllers/api/sosApiController');
const guardianApi = require('../controllers/api/guardianApiController');
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

/* finding a doctor */
router.get('/doctors', careApi.doctors);
router.get('/doctors/recommended', careApi.recommended);
router.get('/doctors/:id/slots', careApi.slots);
router.get('/doctors/:id/appointments', careApi.doctorAppointments);

/* appointment requests — the mother asks, the doctor answers */
router.get('/appointments', careApi.myAppointments);
router.post('/appointments', careApi.requestAppointment);
router.patch('/appointments/:id', careApi.respond);
router.delete('/appointments/:id', careApi.cancel);

/* the guardian companion app — scoped by link token, read-only */
router.get('/guardian/:token', guardianApi.dashboard);
router.get('/guardian/:token/vitals', guardianApi.vitals);
router.get('/guardian/:token/alert', guardianApi.alert);
router.post('/guardian/:token/ack', guardianApi.acknowledge);

/* emergency SOS */
router.get('/sos', sosApi.state);
router.post('/sos', sosApi.trigger);
router.post('/sos/:id/close', sosApi.close);
router.patch('/sos/emergency-number', sosApi.setEmergencyNumber);
router.get('/guardians', sosApi.contacts);
router.post('/guardians', sosApi.addContact);
router.delete('/guardians/:id', sosApi.removeContact);
router.get('/doctors/:id/sos', sosApi.forDoctor);

/* prescriptions & reports */
router.get('/documents', documentApi.index);
router.post('/documents', documentApi.create);
router.get('/documents/:id/file', documentApi.file);
router.delete('/documents/:id', documentApi.destroy);
router.get('/patients/:id/documents', documentApi.forPatient);
router.post('/patients/:id/documents', documentApi.createForPatient);

/* messages — the mother/doctor conversation */
router.get('/care-team', messageApi.careTeam);
router.get('/messages', messageApi.threads);
router.post('/messages', messageApi.send);
router.get('/messages/:doctorId', messageApi.thread);
router.get('/doctors/:id/threads', messageApi.doctorThreads);
router.get('/doctors/:id/threads/:patientId', messageApi.doctorThread);
router.post('/doctors/:id/messages', messageApi.doctorSend);

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

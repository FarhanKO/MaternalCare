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
const communityApi = require('../controllers/api/communityApiController');
const profileApi = require('../controllers/api/profileApiController');
const childApi = require('../controllers/api/childApiController');
const sessionApi = require('../controllers/api/sessionApiController');
const vitalApi = require('../controllers/api/vitalApiController');
const networkApi = require('../controllers/api/networkApiController');
const reportApi = require('../controllers/api/reportApiController');
const guidanceApi = require('../controllers/api/guidanceApiController');
const moderationApi = require('../controllers/api/moderationApiController');
const careEndingApi = require('../controllers/api/careEndingApiController');
const riskApi = require('../controllers/api/riskApiController');
const authApi = require('../controllers/api/authApiController');
const session = require('../middleware/session');

/*
 * Everything below this line needs a signed-in account.
 *
 * Listed as exceptions rather than applied route by route, because the
 * failure mode of the other arrangement is silent: a new endpoint added
 * without its guard serves patient records to anybody, and nothing complains.
 * This way a new route is protected by default and has to be argued out of it.
 *
 * The exceptions:
 *   /auth/*      you cannot sign in while signed in
 *   /guardian/*  carries its own capability token, held by a family member
 *                who has no account here
 *   /network     the LAN address the guardian pairing link is built from
 *   /community/images  <img> tags cannot send credentials in every context,
 *                and these are already unguessable UUID filenames
 */
const PUBLIC = [/^\/auth\//, /^\/guardian\//, /^\/network$/, /^\/community\/images\//, /^\/doctors\/register$/];

router.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  if (PUBLIC.some((rx) => rx.test(req.path))) return next();
  return session.requireUser(req, res, next);
});

/* the signed-in user + her pregnancy summary */
router.get('/me', sessionApi.show);

/* update the signed-in user's life stage (set at the end of onboarding) */
router.patch('/me', sessionApi.setStage);
router.get('/me/language', sessionApi.language);

/* ------------------------------------------------------------ auth */
router.post('/auth/login', authApi.login);
router.post('/auth/logout', authApi.logout);
router.get('/auth/session', authApi.session);
router.post('/auth/register', authApi.register);
router.post('/auth/password', session.requireUser, authApi.changePassword);
/* names and emails for the sign-in screen; never the passwords */
router.get('/auth/demo-accounts', authApi.demoAccounts);
router.patch('/me/language', sessionApi.setLanguage);

/* patients — the clinician's caseload */
router.get('/patients', session.requireRole('clinician'), patientApi.index);
router.get('/patients/:id', session.requireRole('clinician'), patientApi.show);
router.get('/patients/:id/reminders', session.requireRole('clinician'), patientApi.reminders);
router.get('/patients/:id/symptoms', session.requireRole('clinician'), patientApi.symptoms);
router.post('/patients/:id/reminders', session.requireRole('clinician'), patientApi.assign);
router.get('/patients/:id/guidance', session.requireRole('clinician'), guidanceApi.forPatient);

/* the personalised nutrition, movement and lifestyle plan */
router.get('/guidance', guidanceApi.mine);

/* F13: the rule engine and the FastAPI classifier, side by side */
router.get('/risk', riskApi.mine);
router.post('/risk/simulate', riskApi.simulate);
router.get('/risk/model', riskApi.modelCard);
router.get('/patients/:id/risk', session.requireRole('clinician'), riskApi.forPatient);

/* finding a doctor */
router.get('/doctors', careApi.doctors);
router.get('/doctors/recommended', careApi.recommended);
router.get('/me/doctor', session.requireRole('clinician'), careApi.me);
// a clinician signing themselves up — the only way a doctor enters the list
router.post('/doctors/register', careApi.registerDoctor);
router.get('/doctors/:id/slots', careApi.slots);
router.get('/doctors/:id/plans', careApi.plans);
router.get('/doctors/:id/appointments', session.requireRole('clinician'), careApi.doctorAppointments);

/* appointment requests — the mother asks, the doctor answers */
router.get('/appointments', careApi.myAppointments);
router.post('/appointments', careApi.requestAppointment);
/* paid booking — the fee confirms the slot, so there is nothing to answer */
router.post('/appointments/paid', careApi.payAndBook);
router.patch('/appointments/:id', session.requireRole('clinician'), careApi.respond);
router.delete('/appointments/:id', careApi.cancel);
/* F11: move an appointment rather than losing your place in the queue */
router.patch('/appointments/:id/reschedule', careApi.reschedule);
router.get('/appointments/:id/changes', careApi.changes);
router.get('/cancel-reasons', careApi.cancelReasons);

/* ending the care relationship — either side, with a reason */
router.get('/care-endings/reasons', careEndingApi.reasons);
router.get('/care-endings', careEndingApi.mine);
router.post('/care-endings/:doctorId', careEndingApi.endByMother);
router.get('/doctors/:doctorId/care-endings', session.requireRole('clinician'), careEndingApi.forDoctor);
router.post('/doctors/:doctorId/care-endings/:patientId', session.requireRole('clinician'), careEndingApi.endByDoctor);

/* profile: name, photo, bio — previously lost on every refresh */
router.get('/profile', profileApi.show);
router.patch('/profile', profileApi.update);
router.get('/profile/avatar/:file', profileApi.avatar);

/* weight gain vs the range recommended for her starting BMI */
router.get('/weight-gain', profileApi.weightGain);

/* the downloadable health report — same document, both sides */
router.get('/report.pdf', reportApi.mine);
router.get('/patients/:id/report.pdf', session.requireRole('clinician'), reportApi.forPatient);

/* where this server can be reached from — the guardian pairing link needs it */
router.get('/network', networkApi.index);

/* vitals — the readings behind the trend charts */
router.get('/vitals', vitalApi.index);
router.post('/vitals', vitalApi.create);

/* mood, kicks and hydration she reports each day */
router.get('/daily-log', profileApi.dailyLog);
router.put('/daily-log', profileApi.saveDailyLog);

/* community board */
router.get('/community/posts', communityApi.index);
router.post('/community/posts', communityApi.create);
router.post('/community/posts/:id/comments', communityApi.comment);
router.post('/community/posts/:id/heart', communityApi.heart);
router.get('/community/images/:file', communityApi.image);

/* reporting — :target is 'posts' or 'comments' */
router.post('/community/:target/:id/report', communityApi.report);

/* moderation — the clinician's queue */
router.get('/moderation/reports', session.requireRole('clinician'), moderationApi.queue);
router.get('/moderation/count', session.requireRole('clinician'), moderationApi.count);
router.post('/moderation/:target/:id/resolve', session.requireRole('clinician'), moderationApi.resolve);

/* child: growth, milestones, vaccinations — the React client had no route
   to these, so it drew them from hardcoded arrays */
router.get('/child', childApi.show);
router.post('/child/growth', childApi.addGrowth);
router.patch('/child/milestones/:id', childApi.toggleMilestone);
/* the child's own daily check-in — feeds, nappies, sleep, temperature */
router.get('/child/log', childApi.log);
router.patch('/child/log', childApi.saveLog);

router.get('/vaccinations', childApi.vaccinations);
router.patch('/vaccinations/:id/done', childApi.markVaccinationDone);
router.post('/vaccinations/:id/card', childApi.uploadVaccinationCard);

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
router.get('/doctors/:id/sos', session.requireRole('clinician'), sosApi.forDoctor);

/* prescriptions & reports */
router.get('/documents', documentApi.index);
router.post('/documents', documentApi.create);
router.get('/documents/:id/file', documentApi.file);
router.delete('/documents/:id', documentApi.destroy);
router.get('/patients/:id/documents', session.requireRole('clinician'), documentApi.forPatient);
router.post('/patients/:id/documents', session.requireRole('clinician'), documentApi.createForPatient);

/* messages — the mother/doctor conversation */
router.get('/care-team', messageApi.careTeam);
router.get('/messages', messageApi.threads);
router.post('/messages', messageApi.send);
/* photographs sent in a thread, streamed from disk */
router.get('/messages/attachments/:file', messageApi.attachment);
router.get('/messages/:doctorId', messageApi.thread);
router.get('/doctors/:id/threads', session.requireRole('clinician'), messageApi.doctorThreads);
router.get('/doctors/:id/threads/:patientId', session.requireRole('clinician'), messageApi.doctorThread);
router.post('/doctors/:id/messages', session.requireRole('clinician'), messageApi.doctorSend);
/* visits about to start — drives the "ready your meeting link" nudge */
router.get('/doctors/:id/upcoming', session.requireRole('clinician'), messageApi.doctorUpcoming);

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

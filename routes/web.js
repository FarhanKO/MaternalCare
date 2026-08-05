const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const pregnancyController = require('../controllers/pregnancyController');
const vitalsController = require('../controllers/vitalsController');
const childController = require('../controllers/childController');
const vaccinationController = require('../controllers/vaccinationController');
const appointmentController = require('../controllers/appointmentController');
const riskController = require('../controllers/riskController');
const emergencyController = require('../controllers/emergencyController');
const learnController = require('../controllers/learnController');
const doctorController = require('../controllers/doctorController');

router.get('/', dashboardController.home);
router.get('/dashboard', dashboardController.dashboard);

router.get('/pregnancy', pregnancyController.index);

router.get('/vitals', vitalsController.index);
router.post('/vitals', vitalsController.create);

router.get('/child', childController.index);
router.post('/child/growth', childController.addGrowth);
router.post('/child/milestone/:id/toggle', childController.toggleMilestone);

router.get('/vaccinations', vaccinationController.index);
router.post('/vaccinations/:id/done', vaccinationController.markDone);

router.get('/appointments', appointmentController.index);
router.post('/appointments', appointmentController.book);
router.post('/appointments/:id/cancel', appointmentController.cancel);

router.get('/risk', riskController.index);
router.post('/risk', riskController.assess);

router.get('/emergency', emergencyController.index);

router.get('/learn', learnController.index);
router.post('/learn/post', learnController.post);

router.get('/doctor', doctorController.index);

module.exports = router;

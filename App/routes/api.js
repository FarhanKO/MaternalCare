/**
 * API routes — JSON interface consumed by the React client (frontend/).
 * Mirrors the MVC split of routes/web.js: routes → controllers → models.
 */
const express = require('express');
const router = express.Router();

const symptomApi = require('../controllers/api/symptomApiController');
const reminderApi = require('../controllers/api/reminderApiController');
const userModel = require('../models/userModel');
const pregnancyModel = require('../models/pregnancyModel');

/* current demo session user + pregnancy summary */
router.get('/me', (req, res) => {
  const user = userModel.current();
  const pregnancy = pregnancyModel.forUser(user.id);
  res.json({ data: { user, pregnancy } });
});


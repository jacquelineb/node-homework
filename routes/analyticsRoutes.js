const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const router = express.Router();

router.get('/users/:id', analyticsController.getUserAnalytics);

module.exports = router;

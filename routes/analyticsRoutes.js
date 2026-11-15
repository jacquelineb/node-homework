const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const router = express.Router();

router.get('/users/:id', analyticsController.getUserAnalytics);
router.get('/users', analyticsController.getUsersWithStats);

module.exports = router;

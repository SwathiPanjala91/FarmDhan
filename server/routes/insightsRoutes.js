const express = require('express');
const router = express.Router();
const { getMarketInsights } = require('../controllers/insightsController');

router.get('/', getMarketInsights);

module.exports = router;

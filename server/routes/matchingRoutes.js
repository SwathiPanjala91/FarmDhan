const express = require('express');
const router = express.Router();
const {
  getRecommendedBuyers,
  getPriceComparison,
  getFarmerDashboardStats,
} = require('../controllers/matchingController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/farmer/stats', protect, restrictTo('farmer', 'admin'), getFarmerDashboardStats);
router.get('/:listingId', getRecommendedBuyers);
router.get('/:listingId/price-comparison', getPriceComparison);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getBuyers,
  getNearbyBuyers,
  getBuyerById,
  updateBuyerProfile,
  getBuyerDashboardStats,
} = require('../controllers/buyerController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', getBuyers);
router.get('/nearby', getNearbyBuyers);
router.get('/dashboard/stats', protect, restrictTo('buyer', 'admin'), getBuyerDashboardStats);
router.get('/:id', getBuyerById);
router.put('/profile', protect, restrictTo('buyer', 'admin'), updateBuyerProfile);

module.exports = router;

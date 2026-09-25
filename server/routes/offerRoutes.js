const express = require('express');
const router = express.Router();
const { createOffer, getOffers, getOfferById, updateOfferStatus } = require('../controllers/offerController');
const { protect, restrictTo } = require('../middleware/auth');

router.post('/', protect, restrictTo('buyer', 'admin'), createOffer);
router.get('/', protect, getOffers);
router.get('/:id', protect, getOfferById);
router.put('/:id/status', protect, updateOfferStatus);

module.exports = router;


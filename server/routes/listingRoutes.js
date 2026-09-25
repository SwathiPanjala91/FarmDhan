const express = require('express');
const router = express.Router();
const {
  createListing,
  getListings,
  getMyListings,
  getListingById,
  updateListing,
  deleteListing,
} = require('../controllers/listingController');
const { protect, restrictTo } = require('../middleware/auth');

router.post('/', protect, restrictTo('farmer', 'seller', 'admin'), createListing);
router.get('/', getListings);
router.get('/my', protect, restrictTo('farmer', 'seller', 'admin'), getMyListings);
router.get('/:id', getListingById);
router.put('/:id', protect, restrictTo('farmer', 'seller', 'admin'), updateListing);
router.delete('/:id', protect, restrictTo('farmer', 'seller', 'admin'), deleteListing);

module.exports = router;

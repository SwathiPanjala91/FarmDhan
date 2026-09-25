const WasteListing = require('../models/WasteListing');
const BuyerProfile = require('../models/BuyerProfile');
const BuyerOffer = require('../models/BuyerOffer');
const Transaction = require('../models/Transaction');
const {
  calculateBuyerMatches,
  sortOffersByPriceDescending,
  DEFAULT_WEIGHTS,
} = require('../services/matchingEngine');

// @desc    Get recommended buyers for a specific waste listing (Weighted Scoring)
// @route   GET /api/matching/:listingId
// @access  Public / Private
const getRecommendedBuyers = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const listing = await WasteListing.findById(listingId).populate('farmerId');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    // Fetch all buyers
    const buyers = await BuyerProfile.find().populate('userId', 'name phone location');

    // Calculate weighted scores
    const recommendedBuyers = calculateBuyerMatches(listing, buyers);

    res.json({
      success: true,
      listingId: listing._id,
      wasteType: listing.wasteType,
      quantity: listing.quantity,
      unit: listing.unit,
      weightsConfig: DEFAULT_WEIGHTS,
      algorithm: 'Weighted Multi-Criteria Scoring (Price 50%, Waste 20%, Distance 20%, Quantity 10%)',
      count: recommendedBuyers.length,
      recommendedBuyers,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get price comparison sorted descending for a specific listing
// @route   GET /api/matching/:listingId/price-comparison
// @access  Public / Private
const getPriceComparison = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const listing = await WasteListing.findById(listingId);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    // Get buyers matching waste type
    const buyers = await BuyerProfile.find().populate('userId', 'name phone location');
    const matches = calculateBuyerMatches(listing, buyers);

    // Also get direct formal offers submitted by buyers for this listing
    const directOffers = await BuyerOffer.find({ listingId: listing._id })
      .populate('buyerId', 'name phone');

    // Map into comparison entries
    const comparisonEntries = matches.map((m) => {
      // Check if buyer submitted a custom direct offer
      const customOffer = directOffers.find(
        (o) => o.buyerId?._id?.toString() === m.buyerId?.toString()
      );

      const price = customOffer ? customOffer.offeredPrice : m.offeredPrice;

      return {
        buyerId: m.buyerId,
        buyerProfileId: m.buyerProfileId,
        buyerName: m.buyerName,
        businessType: m.businessType,
        rating: m.rating,
        price,
        unit: m.unit,
        distanceKm: m.distanceKm,
        distanceText: m.distanceText,
        requirements: m.requirements,
        matchScore: m.matchScore,
        hasDirectOffer: Boolean(customOffer),
        pickupDetails: customOffer ? customOffer.pickupDetails : 'Buyer arranged vehicle within 48 hours',
      };
    });

    // Section 12 Specification:
    // buyers.sort((a, b) => b.price - a.price)
    // Described as: Price-based descending sorting for buyer offers
    const sortedComparison = sortOffersByPriceDescending(comparisonEntries);

    res.json({
      success: true,
      listingId: listing._id,
      wasteType: listing.wasteType,
      farmerExpectedPrice: listing.expectedPrice,
      sortingMethod: 'Price-based descending sorting (highest offered price first)',
      count: sortedComparison.length,
      priceComparison: sortedComparison,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get summary metrics for Farmer Dashboard
// @route   GET /api/matching/farmer/stats
// @access  Private (Farmer)
const getFarmerDashboardStats = async (req, res, next) => {
  try {
    const activeListingsCount = await WasteListing.countDocuments({
      farmerId: req.user._id,
      status: 'active',
    });

    const totalBuyersCount = await BuyerProfile.countDocuments();

    const farmerListings = await WasteListing.find({ farmerId: req.user._id }).select('_id');
    const listingIds = farmerListings.map((l) => l._id);

    const latestOffersCount = await BuyerOffer.countDocuments({
      listingId: { $in: listingIds },
      status: 'pending',
    });

    const pendingTransactionsCount = await Transaction.countDocuments({
      farmerId: req.user._id,
      status: { $in: ['Pending', 'Buyer Confirmed', 'Pickup Scheduled'] },
    });

    const recentOffers = await BuyerOffer.find({ listingId: { $in: listingIds } })
      .populate('buyerId', 'name phone')
      .populate('listingId', 'wasteType quantity unit')
      .sort({ createdAt: -1 })
      .limit(3);

    const highestOffer = await BuyerOffer.findOne({ listingId: { $in: listingIds } })
      .sort({ offeredPrice: -1 });
    const topRate = highestOffer ? highestOffer.offeredPrice : null;

    res.json({
      success: true,
      stats: {
        activeListingsCount,
        availableBuyersCount: totalBuyersCount,
        latestOffersCount,
        pendingActionsCount: pendingTransactionsCount,
        topRate,
        recentOffers,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getRecommendedBuyers,
  getPriceComparison,
  getFarmerDashboardStats,
};

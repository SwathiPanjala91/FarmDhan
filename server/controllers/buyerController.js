const BuyerProfile = require('../models/BuyerProfile');
const WasteListing = require('../models/WasteListing');
const BuyerOffer = require('../models/BuyerOffer');
const Transaction = require('../models/Transaction');
const { calculateDistanceKm, formatDistance } = require('../services/distanceService');

// @desc    Get all buyers with optional filtering
// @route   GET /api/buyers
// @access  Public / Private
const getBuyers = async (req, res, next) => {
  try {
    const { wasteType, district } = req.query;
    const query = {};

    if (wasteType && wasteType !== 'All') {
      query.wasteTypes = { $in: [wasteType, 'All Biomass', 'All Residues'] };
    }

    if (district) {
      query['location.district'] = new RegExp(district, 'i');
    }

    const buyers = await BuyerProfile.find(query)
      .populate('userId', 'name language location')
      .sort({ rating: -1, offeredPrice: -1 });

    res.json({
      success: true,
      count: buyers.length,
      buyers,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get nearby buyers based on GPS coordinates
// @route   GET /api/buyers/nearby
// @access  Public / Private
const getNearbyBuyers = async (req, res, next) => {
  try {
    const lat = Number(req.query.lat) || (req.user?.location?.latitude) || 17.3850;
    const lon = Number(req.query.lon) || (req.user?.location?.longitude) || 78.4867;
    const maxDistanceKm = Number(req.query.maxDistance) || 100;
    const wasteType = req.query.wasteType;

    const query = {};
    if (wasteType && wasteType !== 'All') {
      query.wasteTypes = { $in: [wasteType, 'All Biomass', 'All Residues'] };
    }

    const allBuyers = await BuyerProfile.find(query).populate('userId', 'name location');

    const buyersWithDistance = allBuyers.map((b) => {
      const bLat = b.location?.latitude || lat + 0.1;
      const bLon = b.location?.longitude || lon + 0.1;
      const distanceKm = calculateDistanceKm(lat, lon, bLat, bLon);

      return {
        ...b.toObject(),
        distanceKm,
        distanceText: formatDistance(distanceKm),
      };
    });

    // Filter within max distance and sort closest first
    const nearby = buyersWithDistance
      .filter((b) => b.distanceKm <= maxDistanceKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({
      success: true,
      count: nearby.length,
      userLocation: { latitude: lat, longitude: lon },
      buyers: nearby,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single buyer details
// @route   GET /api/buyers/:id
// @access  Public / Private
const getBuyerById = async (req, res, next) => {
  try {
    const buyer = await BuyerProfile.findById(req.params.id).populate(
      'userId',
      'name location'
    );

    if (!buyer) {
      return res.status(404).json({
        success: false,
        message: 'Buyer profile not found',
      });
    }

    res.json({
      success: true,
      buyer,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update buyer profile / requirement
// @route   PUT /api/buyers/profile
// @access  Private (Buyer)
const updateBuyerProfile = async (req, res, next) => {
  try {
    const profile = await BuyerProfile.findOneAndUpdate(
      { userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Buyer profile not found',
      });
    }

    res.json({
      success: true,
      message: 'Buyer profile updated successfully',
      profile,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get dashboard metrics for Buyer
// @route   GET /api/buyers/dashboard/stats
// @access  Private (Buyer)
const getBuyerDashboardStats = async (req, res, next) => {
  try {
    const buyerProfile = await BuyerProfile.findOne({ userId: req.user._id });
    const wasteTypes = buyerProfile ? buyerProfile.wasteTypes : ['Paddy Straw'];

    const newFarmerListingsCount = await WasteListing.countDocuments({
      status: 'active',
      wasteType: { $in: [...wasteTypes, 'All Biomass'] },
    });

    const activeOffersCount = await BuyerOffer.countDocuments({
      buyerId: req.user._id,
      status: 'pending',
    });

    const activeTransactionsCount = await Transaction.countDocuments({
      buyerId: req.user._id,
      status: { $in: ['Pending', 'Buyer Confirmed', 'Pickup Scheduled'] },
    });

    res.json({
      success: true,
      stats: {
        newFarmerListingsCount,
        activeOffersCount,
        activeTransactionsCount,
        profile: buyerProfile,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBuyers,
  getNearbyBuyers,
  getBuyerById,
  updateBuyerProfile,
  getBuyerDashboardStats,
};

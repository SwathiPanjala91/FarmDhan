const WasteListing = require('../models/WasteListing');
const BuyerProfile = require('../models/BuyerProfile');
const { createNotification } = require('../services/notificationService');

// @desc    Create a new waste listing
// @route   POST /api/listings
// @access  Private (Farmer)
const createListing = async (req, res, next) => {
  try {
    const {
      wasteType,
      quantity,
      unit = 'ton',
      image = '',
      description = '',
      expectedPrice = 0,
      location,
    } = req.body;

    if (!wasteType || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Please provide waste type and quantity',
      });
    }

    const userLoc = req.user?.location || {};
    const listingLocation = {
      latitude: location?.latitude || userLoc.latitude || 17.3850,
      longitude: location?.longitude || userLoc.longitude || 78.4867,
      village: location?.village || userLoc.village || '',
      district: location?.district || userLoc.district || '',
      state: location?.state || userLoc.state || 'Telangana',
    };

    const listing = await WasteListing.create({
      farmerId: req.body.sellerId || req.body.farmerId || req.user._id,
      wasteType,
      quantity: Number(quantity),
      unit,
      image,
      description,
      expectedPrice: Number(expectedPrice) || 0,
      location: listingLocation,
      status: 'active',
    });

    // Notify matching buyers in background
    try {
      const interestedBuyers = await BuyerProfile.find({
        wasteTypes: { $in: [wasteType, 'All Biomass', 'All Residues'] },
      }).limit(5);

      for (const buyer of interestedBuyers) {
        await createNotification({
          userId: buyer.userId,
          type: 'new_listing',
          title: 'New Crop Residue Available',
          message: `A farmer posted ${quantity} ${unit} of ${wasteType} near ${listingLocation.district || 'your area'}.`,
          relatedListingId: listing._id,
        });
      }
    } catch (notifErr) {
      console.warn('[Listing] Notification dispatch error:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Waste listing created successfully',
      listing,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all listings with filters (for Buyers & public browsing)
// @route   GET /api/listings
// @access  Public / Private
const getListings = async (req, res, next) => {
  try {
    const { wasteType, status = 'active', minPrice, maxPrice, search } = req.query;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    if (wasteType && wasteType !== 'All') {
      query.wasteType = new RegExp(wasteType, 'i');
    }

    if (minPrice || maxPrice) {
      query.expectedPrice = {};
      if (minPrice) query.expectedPrice.$gte = Number(minPrice);
      if (maxPrice) query.expectedPrice.$lte = Number(maxPrice);
    }

    if (search) {
      query.$or = [
        { wasteType: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { 'location.district': new RegExp(search, 'i') },
        { 'location.village': new RegExp(search, 'i') },
      ];
    }

    const listings = await WasteListing.find(query)
      .populate('farmerId', 'name location')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get listings created by current farmer
// @route   GET /api/listings/my
// @access  Private (Farmer)
const getMyListings = async (req, res, next) => {
  try {
    const listings = await WasteListing.find({ farmerId: req.user._id })
      .populate('selectedBuyerId', 'name phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single listing details
// @route   GET /api/listings/:id
// @access  Public / Private
const getListingById = async (req, res, next) => {
  try {
    const listing = await WasteListing.findById(req.params.id)
      .populate('farmerId', 'name location')
      .populate('selectedBuyerId', 'name');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    // Increment view count
    listing.viewsCount = (listing.viewsCount || 0) + 1;
    await listing.save();

    res.json({
      success: true,
      listing,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update listing
// @route   PUT /api/listings/:id
// @access  Private (Farmer owner)
const updateListing = async (req, res, next) => {
  try {
    let listing = await WasteListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    if (listing.farmerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this listing',
      });
    }

    listing = await WasteListing.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      listing,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete/Cancel listing
// @route   DELETE /api/listings/:id
// @access  Private (Farmer owner)
const deleteListing = async (req, res, next) => {
  try {
    const listing = await WasteListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    if (listing.farmerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this listing',
      });
    }

    await listing.deleteOne();

    res.json({
      success: true,
      message: 'Listing deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createListing,
  getListings,
  getMyListings,
  getListingById,
  updateListing,
  deleteListing,
};

const BuyerOffer = require('../models/BuyerOffer');
const WasteListing = require('../models/WasteListing');
const { createNotification } = require('../services/notificationService');

// @desc    Submit a buyer offer on a listing
// @route   POST /api/offers
// @access  Private (Buyer)
const createOffer = async (req, res, next) => {
  try {
    const { listingId, offeredPrice, quantity, pickupDetails, message } = req.body;

    if (!listingId || !offeredPrice || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Please provide listing ID, offered price, and quantity',
      });
    }

    let listing = null;
    const mongoose = require('mongoose');
    if (mongoose.isValidObjectId(listingId)) {
      listing = await WasteListing.findById(listingId);
    }

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found in database',
      });
    }

    // Check if offer already exists for this buyer and listing
    let offer = await BuyerOffer.findOne({
      buyerId: req.user._id,
      listingId: listing._id,
      status: 'pending',
    });

    if (offer) {
      // Update existing offer
      offer.offeredPrice = Number(offeredPrice);
      offer.quantity = Number(quantity);
      if (pickupDetails) offer.pickupDetails = pickupDetails;
      if (message) offer.message = message;
      await offer.save();
    } else {
      offer = await BuyerOffer.create({
        buyerId: req.user._id,
        listingId: listing._id,
        offeredPrice: Number(offeredPrice),
        quantity: Number(quantity),
        unit: listing.unit || 'ton',
        pickupDetails: pickupDetails || 'Buyer arranges pickup vehicle within 48 hours',
        message: message || '',
      });
    }

    // Notify farmer about new offer
    if (listing.farmerId) {
      await createNotification({
        userId: listing.farmerId,
        type: 'offer_received',
        title: 'New Buyer Offer Received 🏷️',
        message: `${req.user.name || 'A verified buyer'} offered ₹${offeredPrice}/${listing.unit || 'ton'} for ${quantity || listing.quantity} ${listing.unit || 'ton'} of ${listing.wasteType}.`,
        relatedListingId: listing._id,
        relatedOfferId: offer._id,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Offer submitted successfully to farmer',
      offer,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get offers for a listing (Farmer view) or by a buyer
// @route   GET /api/offers
// @access  Private
const getOffers = async (req, res, next) => {
  try {
    const { listingId } = req.query;
    const query = {};

    if (req.user.role === 'buyer') {
      query.buyerId = req.user._id;
    } else if (listingId) {
      query.listingId = listingId;
    } else {
      // For farmer without specific listingId, find offers on all their listings
      const myListings = await WasteListing.find({ farmerId: req.user._id }).select('_id');
      const listingIds = myListings.map((l) => l._id);
      query.listingId = { $in: listingIds };
    }

    const rawOffers = await BuyerOffer.find(query)
      .populate('buyerId', 'name phone location')
      .populate({
        path: 'listingId',
        select: 'wasteType quantity unit expectedPrice status location farmerId',
        populate: {
          path: 'farmerId',
          select: 'name phone location',
        },
      })
      .sort({ createdAt: -1 });

    // Strict Contact Privacy:
    // Phone numbers are ONLY exposed when status === 'accepted' AND requester is one of the participants
    const offers = rawOffers.map((offer) => {
      const o = offer.toObject();
      const isAccepted = o.status === 'accepted';
      const isBuyer = req.user._id.toString() === o.buyerId?._id?.toString();
      const isFarmer = o.listingId?.farmerId?._id?.toString() === req.user._id.toString();

      if (!isAccepted || (!isBuyer && !isFarmer && req.user.role !== 'admin')) {
        if (o.buyerId && o.buyerId.phone) {
          delete o.buyerId.phone;
        }
        if (o.listingId?.farmerId && o.listingId.farmerId.phone) {
          delete o.listingId.farmerId.phone;
        }
      }
      return o;
    });

    res.json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single offer details
// @route   GET /api/offers/:id
// @access  Private
const getOfferById = async (req, res, next) => {
  try {
    const rawOffer = await BuyerOffer.findById(req.params.id)
      .populate('buyerId', 'name phone location')
      .populate({
        path: 'listingId',
        select: 'wasteType quantity unit expectedPrice status location farmerId',
        populate: {
          path: 'farmerId',
          select: 'name phone location',
        },
      });

    if (!rawOffer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    const isBuyer = req.user._id.toString() === rawOffer.buyerId?._id?.toString();
    const isFarmer = rawOffer.listingId?.farmerId?._id?.toString() === req.user._id.toString();

    if (!isBuyer && !isFarmer && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this offer',
      });
    }

    const o = rawOffer.toObject();
    const isAccepted = o.status === 'accepted';

    // Strict privacy before acceptance
    if (!isAccepted && req.user.role !== 'admin') {
      if (o.buyerId && o.buyerId.phone) {
        delete o.buyerId.phone;
      }
      if (o.listingId?.farmerId && o.listingId.farmerId.phone) {
        delete o.listingId.farmerId.phone;
      }
    }

    res.json({
      success: true,
      offer: o,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update offer status (Farmer accepts/rejects, or Buyer cancels)
// @route   PUT /api/offers/:id/status
// @access  Private
const updateOfferStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['pending', 'accepted', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, accepted, rejected, or cancelled',
      });
    }

    const offer = await BuyerOffer.findById(req.params.id)
      .populate('listingId')
      .populate('buyerId', 'name phone location');

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found',
      });
    }

    // Check permissions
    const isFarmer = offer.listingId && offer.listingId.farmerId && offer.listingId.farmerId.toString() === req.user._id.toString();
    const isBuyer = offer.buyerId && offer.buyerId._id.toString() === req.user._id.toString();

    if (!isFarmer && !isBuyer && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this offer',
      });
    }

    offer.status = status;
    await offer.save();

    const Transaction = require('../models/Transaction');
    let transaction = null;

    if (status === 'accepted') {
      // Find or create confirmed transaction
      transaction = await Transaction.findOne({
        listingId: offer.listingId._id,
        buyerId: offer.buyerId._id,
      });

      if (!transaction) {
        transaction = await Transaction.create({
          listingId: offer.listingId._id,
          farmerId: req.user._id,
          buyerId: offer.buyerId._id,
          wasteType: offer.listingId.wasteType,
          agreedPrice: offer.offeredPrice,
          quantity: offer.quantity,
          unit: offer.unit || offer.listingId.unit || 'ton',
          totalAmount: Math.round(offer.offeredPrice * offer.quantity),
          pickupDetails: offer.pickupDetails || 'Buyer arranged logistics within 48 hours',
          status: 'Buyer Confirmed',
        });
      }

      // Mark listing status as pending
      await WasteListing.findByIdAndUpdate(offer.listingId._id, {
        status: 'pending',
        selectedBuyerId: offer.buyerId._id,
      });
    }

    // If accepted or rejected by farmer, notify buyer
    if (isFarmer && offer.buyerId) {
      await createNotification({
        userId: offer.buyerId._id,
        type: status === 'accepted' ? 'offer_accepted' : 'offer_rejected',
        title: status === 'accepted' ? 'Offer Accepted! 🎉' : 'Offer Declined',
        message: `Your offer of ₹${offer.offeredPrice}/${offer.unit} for ${offer.quantity} ${offer.unit} was ${status} by the farmer.`,
        relatedListingId: offer.listingId ? offer.listingId._id : null,
        relatedOfferId: offer._id,
        relatedTransactionId: transaction ? transaction._id : null,
      });
    }

    // If accepted, also notify farmer of deal confirmation
    if (isFarmer && status === 'accepted' && transaction) {
      await createNotification({
        userId: req.user._id,
        type: 'transaction_update',
        title: 'Offer Accepted & Deal Confirmed! 🎉',
        message: `You accepted ${offer.buyerId.name}'s offer for ${offer.quantity} ${offer.unit} of ${offer.listingId?.wasteType || 'crop residue'}.`,
        relatedListingId: offer.listingId ? offer.listingId._id : null,
        relatedOfferId: offer._id,
        relatedTransactionId: transaction._id,
      });
    }

    // Re-populate with contact details if accepted
    const updatedOffer = await BuyerOffer.findById(offer._id)
      .populate('buyerId', 'name phone location')
      .populate({
        path: 'listingId',
        select: 'wasteType quantity unit expectedPrice status location farmerId',
        populate: { path: 'farmerId', select: 'name phone location' },
      });

    res.json({
      success: true,
      message: `Offer status updated to ${status}`,
      offer: updatedOffer,
      transaction,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createOffer, getOffers, getOfferById, updateOfferStatus };


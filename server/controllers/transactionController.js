const Transaction = require('../models/Transaction');
const WasteListing = require('../models/WasteListing');
const BuyerProfile = require('../models/BuyerProfile');
const BuyerOffer = require('../models/BuyerOffer');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');

// @desc    Farmer explicitly chooses a buyer and confirms deal
// @route   POST /api/transactions
// @access  Private (Farmer only)
const createTransaction = async (req, res, next) => {
  try {
    const {
      listingId,
      buyerId,
      agreedPrice,
      quantity,
      pickupDetails,
      notes,
    } = req.body;

    if (!listingId || !buyerId || !agreedPrice) {
      return res.status(400).json({
        success: false,
        message: 'Please provide listingId, buyerId, and agreedPrice',
      });
    }

    const mongoose = require('mongoose');
    let listing = null;
    if (mongoose.isValidObjectId(listingId)) {
      listing = await WasteListing.findById(listingId);
    }

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found in database',
      });
    }

    let buyerUser = null;
    if (mongoose.isValidObjectId(buyerId)) {
      buyerUser = await User.findById(buyerId);
      if (!buyerUser) {
        const bp = await BuyerProfile.findById(buyerId);
        if (bp && bp.userId) {
          buyerUser = await User.findById(bp.userId);
        }
      }
    }

    if (!buyerUser) {
      return res.status(404).json({
        success: false,
        message: 'Selected buyer not found in system',
      });
    }

    const tradeQuantity = Number(quantity) || listing.quantity;
    const finalPrice = Number(agreedPrice) || listing.expectedPrice;
    const totalAmount = Math.round(tradeQuantity * finalPrice);
    const wasteTypeName = listing ? listing.wasteType : 'Paddy Straw';
    const unitName = listing ? listing.unit : 'ton';

    // Create transaction record
    const transaction = await Transaction.create({
      listingId: listing ? listing._id : null,
      farmerId: req.user._id,
      buyerId: buyerUser._id,
      wasteType: wasteTypeName,
      agreedPrice: finalPrice,
      quantity: tradeQuantity,
      unit: unitName,
      totalAmount,
      pickupDetails: pickupDetails || 'Buyer arranged logistics to farm gate within 48 hours',
      status: 'Buyer Confirmed', // Farmer has chosen and confirmed
      notes: notes || '',
    });

    // Mark listing as pending/sold if exists
    if (listing) {
      listing.status = 'pending';
      listing.selectedBuyerId = buyerUser._id;
      await listing.save();

      // Mark corresponding offer as accepted if exists
      await BuyerOffer.updateMany(
        { listingId: listing._id, buyerId: buyerUser._id },
        { status: 'accepted' }
      );
    }

    // Increment buyer completed purchases counter
    await BuyerProfile.findOneAndUpdate(
      { userId: buyerUser._id },
      { $inc: { completedPurchases: 1 } }
    );

    // Notify Buyer that farmer chose them
    await createNotification({
      userId: buyerUser._id,
      type: 'buyer_selected',
      title: 'Offer Accepted by Farmer! 🎉',
      message: `${req.user.name || 'Farmer'} accepted your offer for ${tradeQuantity} ${unitName} of ${wasteTypeName} at ₹${finalPrice}/${unitName}. Please coordinate pickup.`,
      relatedListingId: listing ? listing._id : null,
      relatedTransactionId: transaction._id,
    });

    // Notify Farmer confirmation receipt
    await createNotification({
      userId: req.user._id,
      type: 'transaction_update',
      title: 'Buyer Selection Confirmed',
      message: `You confirmed ${buyerUser.name} for ${tradeQuantity} ${unitName} of ${wasteTypeName} at ₹${finalPrice}/${unitName}. Buyer has been notified.`,
      relatedListingId: listing ? listing._id : null,
      relatedTransactionId: transaction._id,
    });

    res.status(201).json({
      success: true,
      message: 'Buyer successfully chosen. Transaction initiated and buyer notified.',
      transaction,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's transactions (Farmer or Buyer)
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res, next) => {
  try {
    const query = {
      $or: [{ farmerId: req.user._id }, { buyerId: req.user._id }],
    };

    const transactions = await Transaction.find(query)
      .populate('farmerId', 'name phone location')
      .populate('buyerId', 'name phone location')
      .populate('listingId', 'wasteType quantity unit image location')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('farmerId', 'name phone location')
      .populate('buyerId', 'name phone location')
      .populate('listingId', 'wasteType quantity unit image location');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    const isFarmer = transaction.farmerId?._id?.toString() === req.user._id.toString();
    const isBuyer = transaction.buyerId?._id?.toString() === req.user._id.toString();

    if (!isFarmer && !isBuyer && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this transaction',
      });
    }

    res.json({
      success: true,
      transaction,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update transaction status (e.g. Pickup Scheduled, Completed)
// @route   PUT /api/transactions/:id/status
// @access  Private
const updateTransactionStatus = async (req, res, next) => {
  try {
    const { status, pickupDate, paymentStatus, notes } = req.body;
    const transaction = await Transaction.findById(req.params.id)
      .populate('farmerId', 'name phone')
      .populate('buyerId', 'name phone');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    // Check authorization
    const isFarmer = transaction.farmerId._id.toString() === req.user._id.toString();
    const isBuyer = transaction.buyerId._id.toString() === req.user._id.toString();

    if (!isFarmer && !isBuyer && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this transaction',
      });
    }

    if (status) transaction.status = status;
    if (pickupDate) transaction.pickupDate = pickupDate;
    if (paymentStatus) transaction.paymentStatus = paymentStatus;
    if (notes) transaction.notes = notes;

    await transaction.save();

    // If completed, mark listing as sold
    if (status === 'Completed') {
      await WasteListing.findByIdAndUpdate(transaction.listingId, { status: 'sold' });
    }

    // Send status notification to counterpart
    const targetUserId = isFarmer ? transaction.buyerId._id : transaction.farmerId._id;
    await createNotification({
      userId: targetUserId,
      type: 'transaction_update',
      title: `Transaction Status: ${status}`,
      message: `Transaction for ${transaction.wasteType} has been updated to "${status}".`,
      relatedTransactionId: transaction._id,
    });

    res.json({
      success: true,
      message: 'Transaction status updated successfully',
      transaction,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransactionStatus,
};

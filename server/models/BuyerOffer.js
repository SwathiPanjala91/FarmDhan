const mongoose = require('mongoose');

const buyerOfferSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WasteListing',
      required: true,
    },
    offeredPrice: {
      type: Number,
      required: [true, 'Offered price is required'],
    },
    quantity: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      default: 'ton',
    },
    pickupDetails: {
      type: String,
      default: 'Buyer arranged vehicle within 48 hours of confirmation',
    },
    message: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BuyerOffer', buyerOfferSchema);

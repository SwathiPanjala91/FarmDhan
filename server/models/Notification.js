const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'offer_received',
        'offer_accepted',
        'offer_rejected',
        'buyer_selected',
        'pickup_update',
        'transaction_update',
        'new_listing',
        'new_requirement',
        'fpo',
        'message',
        'general',
      ],
      default: 'general',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedListingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WasteListing',
      default: null,
    },
    relatedOfferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BuyerOffer',
      default: null,
    },
    relatedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);

const mongoose = require('mongoose');

const wasteListingSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    wasteType: {
      type: String,
      required: [true, 'Waste type is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.1, 'Quantity must be greater than 0'],
    },
    unit: {
      type: String,
      enum: ['kg', 'quintal', 'ton', 'acre', 'acres'],
      default: 'ton',
      required: true,
    },
    image: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      village: { type: String, default: '' },
      district: { type: String, default: '' },
      state: { type: String, default: 'Telangana' },
    },
    expectedPrice: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'sold', 'cancelled'],
      default: 'active',
    },
    selectedBuyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual alias: sellerId points to farmerId
wasteListingSchema.virtual('sellerId').get(function () {
  return this.farmerId;
});

module.exports = mongoose.model('WasteListing', wasteListingSchema);

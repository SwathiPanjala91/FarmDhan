const mongoose = require('mongoose');

const buyerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
    },
    businessType: {
      type: String,
      enum: ['Biomass Power Plant', 'Bio-CNG Producer', 'Pellet Manufacturer', 'Paper Mill', 'Mushroom Cultivator', 'Composting Unit', 'Animal Feed Manufacturer', 'Trader/Aggregator'],
      default: 'Pellet Manufacturer',
    },
    wasteTypes: [
      {
        type: String,
        required: true,
      },
    ],
    requiredQuantity: {
      type: Number,
      default: 100,
    },
    unit: {
      type: String,
      enum: ['kg', 'quintal', 'ton'],
      default: 'ton',
    },
    offeredPrice: {
      type: Number,
      required: [true, 'Offered price is required'],
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      city: { type: String, default: '' },
      district: { type: String, default: '' },
      state: { type: String, default: '' },
    },
    serviceRadius: {
      type: Number,
      default: 50, // in km
    },
    requirements: {
      type: String,
      default: 'Moisture content < 15%, no plastic or stones',
    },
    contactPhone: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      default: 4.8,
      min: 1,
      max: 5,
    },
    completedPurchases: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BuyerProfile', buyerProfileSchema);

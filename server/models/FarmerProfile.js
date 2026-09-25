const mongoose = require('mongoose');

const farmerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    farmLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    village: { type: String, default: '' },
    district: { type: String, default: '' },
    state: { type: String, default: '' },
    landSizeAcres: { type: Number, default: 0 },
    primaryCrops: [{ type: String }],
    fpoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FPO',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FarmerProfile', farmerProfileSchema);

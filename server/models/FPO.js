const mongoose = require('mongoose');

const fpoSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    registrationNumber: {
      type: String,
      default: '',
    },
    district: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String, default: '' },
    },
    contactPerson: {
      type: String,
      default: '',
    },
    contactPhone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      default: '',
    },
    supportedWasteTypes: [{ type: String }],
    memberCount: {
      type: Number,
      default: 250,
    },
    servicesOffered: [{ type: String }],
    collectionCentres: [
      {
        name: { type: String },
        address: { type: String },
        phone: { type: String },
        capacityTons: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('FPO', fpoSchema);

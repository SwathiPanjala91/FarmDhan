const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index to auto-prune expired records
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    resendAvailableAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Helper method to check if OTP is currently expired
otpSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

// Helper method to check if cooldown has elapsed
otpSchema.methods.canResend = function () {
  return new Date() >= this.resendAvailableAt;
};

module.exports = mongoose.model('Otp', otpSchema);
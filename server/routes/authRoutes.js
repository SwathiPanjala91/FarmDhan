const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  sendOTP,
  resendOTP,
  verifyOTP,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOTP);
router.post('/resend-otp', resendOTP);
router.post('/verify-otp', verifyOTP);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;

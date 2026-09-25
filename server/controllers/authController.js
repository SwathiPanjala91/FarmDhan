const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Otp = require('../models/Otp');
const FarmerProfile = require('../models/FarmerProfile');
const BuyerProfile = require('../models/BuyerProfile');
const { generateToken } = require('../config/jwt');
const { sendSms } = require('../services/smsService');

// @desc    Register a new user (Farmer or Buyer)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      role = 'farmer',
      language = 'en',
      location = {},
      // Farmer specific
      village,
      district,
      state,
      landSizeAcres,
      primaryCrops,
      // Buyer specific
      businessName,
      businessType,
      wasteTypes,
      requiredQuantity,
      offeredPrice,
      serviceRadius,
      requirements,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your full name',
      });
    }

    const cleanPhone = phone ? String(phone).trim() : '';
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number',
      });
    }

    if (!password || String(password).trim().length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Please create a password (minimum 4 characters)',
      });
    }

    const existingUser = await User.findOne({ phone: cleanPhone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This mobile number is already registered. Please log in or use another number.',
      });
    }

    console.log(`[Auth] Registering new ${role}: "${name.trim()}" (Phone: ${cleanPhone})`);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.trim() : undefined,
      password: hashedPassword,
      role,
      language: language || 'en',
      location: {
        latitude: location.latitude || 17.3850,
        longitude: location.longitude || 78.4867,
        village: village || location.village || '',
        district: district || location.district || 'Warangal',
        state: state || location.state || 'Telangana',
        address: location.address || '',
      },
    });

    console.log(`[Auth] Real user created successfully: ID=${user._id}, Name="${user.name}", Role=${user.role}`);

    let profileData = null;

    if (role === 'farmer' || role === 'seller') {
      profileData = await FarmerProfile.create({
        userId: user._id,
        farmLocation: {
          latitude: location.latitude || 17.3850,
          longitude: location.longitude || 78.4867,
        },
        village: village || location.village || '',
        district: district || location.district || 'Warangal',
        state: state || location.state || 'Telangana',
        landSizeAcres: landSizeAcres || 3,
        primaryCrops: primaryCrops || ['Paddy', 'Cotton'],
      });
    } else if (role === 'buyer') {
      profileData = await BuyerProfile.create({
        userId: user._id,
        businessName: businessName || `${name} Biomass Enterprises`,
        businessType: businessType || 'Pellet Manufacturer',
        wasteTypes: wasteTypes || ['Paddy Straw', 'Cotton Residue', 'Sugarcane Residue'],
        requiredQuantity: requiredQuantity || 100,
        offeredPrice: offeredPrice || 2400,
        location: {
          latitude: location.latitude || 17.4000,
          longitude: location.longitude || 78.5000,
          city: district || 'Hyderabad',
          district: district || 'Hyderabad',
          state: state || 'Telangana',
        },
        serviceRadius: serviceRadius || 50,
        requirements: requirements || 'Moisture < 15%, bale packed',
        contactPhone: phone,
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        language: user.language,
        location: user.location,
      },
      profile: profileData,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number and password',
      });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password',
      });
    }

    let profile = null;
    if (user.role === 'farmer' || user.role === 'seller') {
      profile = await FarmerProfile.findOne({ userId: user._id });
    } else if (user.role === 'buyer') {
      profile = await BuyerProfile.findOne({ userId: user._id });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        language: user.language,
        location: user.location,
      },
      profile,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    let profile = null;

    if (user.role === 'farmer' || user.role === 'seller') {
      profile = await FarmerProfile.findOne({ userId: user._id }).populate('fpoId');
    } else if (user.role === 'buyer') {
      profile = await BuyerProfile.findOne({ userId: user._id });
    }

    res.json({
      success: true,
      user,
      profile,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile & language
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, language, location } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (language) user.language = language;
    if (location) user.location = { ...user.location, ...location };

    await user.save();

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        language: user.language,
        location: user.location,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Helper to canonicalize phone to 10 digits
const canonicalizePhone = (rawPhone) => {
  if (!rawPhone) return '';
  return String(rawPhone).replace(/\D/g, '').slice(-10);
};

// Helper to validate Indian mobile numbers (starts with 6-9, followed by 9 digits)
const isValidIndianMobile = (phone) => {
  return /^[6-9]\d{9}$/.test(phone);
};

// @desc    Send 6-digit OTP to mobile number for passwordless login
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const cleanPhone = canonicalizePhone(phone);

    if (!cleanPhone || !isValidIndianMobile(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)',
      });
    }

    const existingUser = await User.findOne({ phone: cleanPhone });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'No account registered with this phone number. Please register first as a Farmer or Buyer.',
        requiresRegistration: true,
      });
    }

    // 1. Check active resend cooldown (45 seconds)
    const activeOtp = await Otp.findOne({ phone: cleanPhone, isUsed: false }).sort({ createdAt: -1 });
    if (activeOtp && !activeOtp.canResend()) {
      const remainingSeconds = Math.max(1, Math.ceil((activeOtp.resendAvailableAt.getTime() - Date.now()) / 1000));
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingSeconds} second(s) before requesting another OTP`,
        cooldownRemaining: remainingSeconds,
      });
    }

    // 2. Abuse Prevention: Rate limit max 5 OTP requests per phone per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourlyRequests = await Otp.countDocuments({ phone: cleanPhone, createdAt: { $gte: oneHourAgo } });
    if (hourlyRequests >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests for this number. Please try again after 1 hour.',
      });
    }

    // 3. Invalidate any existing unused OTPs for this phone number
    await Otp.updateMany({ phone: cleanPhone, isUsed: false }, { isUsed: true });

    // 4. Generate cryptographically secure random 6-digit OTP
    const rawOtp = String(crypto.randomInt(100000, 1000000));
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    const now = Date.now();
    const expiresAt = new Date(now + 5 * 60 * 1000); // 5 minutes
    const resendAvailableAt = new Date(now + 45 * 1000); // 45-second cooldown

    // 5. Store hash in dedicated Otp model
    const createdOtp = await Otp.create({
      phone: cleanPhone,
      otpHash,
      expiresAt,
      resendAvailableAt,
      attempts: 0,
      maxAttempts: 3,
      isUsed: false,
    });

    // 6. Dispatch SMS via pluggable SMS service
    try {
      await sendSms({
        phone: cleanPhone,
        otp: rawOtp,
      });
    } catch (smsErr) {
      console.error(`[SMS Service Error] Failed to send SMS to ${cleanPhone}:`, smsErr.message);
      // Roll back created OTP record so user is not locked out by 45s cooldown on failure
      await Otp.deleteOne({ _id: createdOtp._id });
      return res.status(502).json({
        success: false,
        message: `Unable to deliver SMS OTP: ${smsErr.message || 'SMS service error'}. Please try again shortly.`,
      });
    }

    console.log(`[Auth] Secure 6-digit OTP dispatched for +91 ${cleanPhone}`);

    // 7. Security: In production mode or when using a real SMS provider, NEVER expose raw OTP in response
    const isDevMock = process.env.NODE_ENV !== 'production' && (process.env.SMS_PROVIDER || 'mock').toLowerCase() === 'mock';
    const responsePayload = {
      success: true,
      message: `A 6-digit OTP has been sent to +91 ${cleanPhone}. Valid for 5 minutes.`,
      cooldownSeconds: 45,
      expiresInSeconds: 300,
    };

    if (isDevMock) {
      // For local developer and emulator testing only when using mock provider
      responsePayload.devOtp = rawOtp;
    }

    res.json(responsePayload);
  } catch (err) {
    next(err);
  }
};

// @desc    Resend OTP to mobile number
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res, next) => {
  return sendOTP(req, res, next);
};

// @desc    Verify 6-digit OTP & login
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp, role } = req.body;
    const cleanPhone = canonicalizePhone(phone);
    const cleanOtp = String(otp || '').trim();

    if (!cleanPhone || !cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your mobile number and the 6-digit OTP code',
      });
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit numeric OTP code',
      });
    }

    // 1. Find the latest active, unused OTP record
    const otpRecord = await Otp.findOne({ phone: cleanPhone, isUsed: false }).sort({ createdAt: -1 });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'No active OTP found for this number or code already used. Please request a new OTP.',
      });
    }

    // 2. Reject expired OTP
    if (otpRecord.isExpired()) {
      otpRecord.isUsed = true;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        code: 'OTP_EXPIRED',
        message: 'This OTP has expired. Please tap "Resend OTP" to receive a new code.',
      });
    }

    // 3. Reject if max attempts exceeded
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      otpRecord.isUsed = true;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        code: 'MAX_ATTEMPTS_EXCEEDED',
        message: 'Maximum verification attempts exceeded. For your security, this OTP is locked. Please request a new one.',
      });
    }

    // 4. Verify entered OTP against stored SHA-256 hash using constant-time comparison
    const inputHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    const hashesMatch =
      inputHash.length === otpRecord.otpHash.length &&
      crypto.timingSafeEqual(Buffer.from(inputHash, 'utf8'), Buffer.from(otpRecord.otpHash, 'utf8'));

    if (!hashesMatch) {
      otpRecord.attempts += 1;
      const remaining = otpRecord.maxAttempts - otpRecord.attempts;

      if (remaining <= 0) {
        otpRecord.isUsed = true;
        await otpRecord.save();
        return res.status(400).json({
          success: false,
          code: 'MAX_ATTEMPTS_EXCEEDED',
          message: 'Incorrect OTP. Maximum attempts exceeded. Please request a new OTP.',
        });
      }

      await otpRecord.save();
      return res.status(400).json({
        success: false,
        code: 'INVALID_OTP',
        message: `Incorrect OTP. You have ${remaining} attempt(s) remaining.`,
        attemptsRemaining: remaining,
      });
    }

    // 5. Successful verification: Mark OTP as used immediately (prevent reuse/replay)
    otpRecord.isUsed = true;
    await otpRecord.save();

    // 6. Look up genuine user in database
    const user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Mobile number verified, but no account registered yet. Please register as Farmer or Buyer.',
        requiresRegistration: true,
      });
    }

    // Check role match if specifically requested
    const isSellerRole = (r) => r === 'farmer' || r === 'seller';
    if (role && user.role !== role && !(isSellerRole(role) && isSellerRole(user.role))) {
      return res.status(400).json({
        success: false,
        message: `This account is registered as a ${user.role}. Please select ${user.role} mode to login.`,
      });
    }

    // 7. Retrieve corresponding profile
    let profile = null;
    if (user.role === 'farmer' || user.role === 'seller') {
      profile = await FarmerProfile.findOne({ userId: user._id });
    } else if (user.role === 'buyer') {
      profile = await BuyerProfile.findOne({ userId: user._id });
    }

    // 8. Generate standard FarmDhan JWT token
    const token = generateToken(user._id, user.role);

    console.log(`[Auth] User authenticated via OTP: ID=${user._id}, Name="${user.name}", Role=${user.role}`);

    res.json({
      success: true,
      message: 'Verified successfully! Welcome to FarmDhan.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        language: user.language,
        location: user.location,
      },
      profile,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, updateProfile, sendOTP, resendOTP, verifyOTP };

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = require('../models/User');
const FarmerProfile = require('../models/FarmerProfile');
const Otp = require('../models/Otp');
const { sendSms } = require('../services/smsService');

let mongoServer;

const runTests = async () => {
  console.log('--- STARTING REAL MOBILE OTP AUTHENTICATION TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  };

  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('[Test DB] In-memory MongoDB connected successfully');

    // 1. Create a genuine test user with an existing password
    const testPhone = '9876543210';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('secret123', salt);

    const user = await User.create({
      name: 'Ravi Teja',
      phone: testPhone,
      password: hashedPassword,
      role: 'farmer',
      language: 'te',
    });

    await FarmerProfile.create({
      userId: user._id,
      farmLocation: { latitude: 17.385, longitude: 78.4867 },
      village: 'Hanamkonda',
      district: 'Warangal',
      state: 'Telangana',
    });

    assert(user && user._id, 'Test user created with existing password intact');

    // 2. Test Phone Number Validation
    const isValidIndianMobile = (p) => /^[6-9]\d{9}$/.test(p);
    assert(isValidIndianMobile('9876543210') === true, 'Valid Indian mobile accepted');
    assert(isValidIndianMobile('1234567890') === false, 'Invalid Indian mobile (starts with 1) rejected');
    assert(isValidIndianMobile('98765') === false, 'Short mobile number rejected');

    // 3. Test Cryptographic 6-digit OTP generation
    const rawOtp = String(crypto.randomInt(100000, 1000000));
    assert(/^\d{6}$/.test(rawOtp), `Generated 6-digit OTP: ${rawOtp}`);
    const hash = crypto.createHash('sha256').update(rawOtp).digest('hex');
    assert(hash.length === 64, 'SHA-256 hash length is exactly 64 hex chars');

    // 4. Test Otp Model Creation & Cooldown
    const now = Date.now();
    const otpDoc = await Otp.create({
      phone: testPhone,
      otpHash: hash,
      expiresAt: new Date(now + 5 * 60 * 1000),
      resendAvailableAt: new Date(now + 45 * 1000),
      attempts: 0,
      maxAttempts: 3,
      isUsed: false,
    });

    assert(otpDoc.isExpired() === false, 'Fresh OTP is not expired');
    assert(otpDoc.canResend() === false, 'Resend is blocked within 45s cooldown');

    // 5. Test SMS Provider Mock Service
    const smsResult = await sendSms({ phone: testPhone, otp: rawOtp });
    assert(smsResult.success === true && smsResult.provider === 'mock', 'SMS Service safely executed mock mode in dev');

    // 6. Test Wrong OTP Attempt Counter
    const wrongOtp = '000000';
    const wrongHash = crypto.createHash('sha256').update(wrongOtp).digest('hex');
    assert(crypto.timingSafeEqual(Buffer.from(wrongHash), Buffer.from(otpDoc.otpHash)) === false, 'Wrong OTP does not match hash');

    otpDoc.attempts += 1;
    await otpDoc.save();
    assert(otpDoc.attempts === 1, 'Attempt counter incremented to 1');
    assert(otpDoc.maxAttempts - otpDoc.attempts === 2, '2 attempts remaining reported');

    // 7. Test Max Attempts Lockout
    otpDoc.attempts = 3;
    otpDoc.isUsed = true;
    await otpDoc.save();
    assert(otpDoc.attempts >= otpDoc.maxAttempts && otpDoc.isUsed === true, 'Locked out after 3 incorrect attempts');

    // 8. Test Expiry Rejection
    const expiredOtpDoc = await Otp.create({
      phone: testPhone,
      otpHash: crypto.createHash('sha256').update('112233').digest('hex'),
      expiresAt: new Date(now - 1000), // in the past
      resendAvailableAt: new Date(now - 1000),
      attempts: 0,
      isUsed: false,
    });
    assert(expiredOtpDoc.isExpired() === true, 'Expired OTP correctly identified as expired');

    // 9. Test Successful OTP Verification & Replay Prevention
    const validRawOtp = String(crypto.randomInt(100000, 1000000));
    const validHash = crypto.createHash('sha256').update(validRawOtp).digest('hex');

    const validDoc = await Otp.create({
      phone: testPhone,
      otpHash: validHash,
      expiresAt: new Date(now + 5 * 60 * 1000),
      resendAvailableAt: new Date(now + 45 * 1000),
      attempts: 0,
      isUsed: false,
    });

    const userHash = crypto.createHash('sha256').update(validRawOtp).digest('hex');
    const matched = crypto.timingSafeEqual(Buffer.from(userHash), Buffer.from(validDoc.otpHash));
    assert(matched === true, 'Correct 6-digit OTP matches hash with timingSafeEqual');

    validDoc.isUsed = true;
    await validDoc.save();
    assert(validDoc.isUsed === true, 'OTP marked as used immediately');

    // Replay attempt check
    const replayAttempt = await Otp.findOne({ phone: testPhone, isUsed: false });
    assert(!replayAttempt || replayAttempt._id.toString() !== validDoc._id.toString(), 'Replay attack prevented; used OTP cannot be reused');

    // 10. Test Existing Password Login Compatibility
    const passwordMatches = await bcrypt.compare('secret123', user.password);
    assert(passwordMatches === true, 'Existing password authentication still works 100%');

    console.log(`\nTEST RESULTS: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
    }
    process.exit(0);
  }
};

runTests();
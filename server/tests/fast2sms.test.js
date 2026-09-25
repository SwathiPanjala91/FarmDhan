const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const FarmerProfile = require('../models/FarmerProfile');
const Otp = require('../models/Otp');
const authRoutes = require('../routes/authRoutes');
const smsService = require('../services/smsService');

let server;
let mongoServer;
let baseUrl;

const postJson = (path, body) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(path, baseUrl);
    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let respData = '';
        res.on('data', (chunk) => (respData += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(respData) });
          } catch (e) {
            resolve({ status: res.statusCode, body: respData });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

const runFast2SMSTests = async () => {
  console.log('--- STARTING FAST2SMS VALIDATION & ISOLATION TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  const assert = (condition, name) => {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}`);
      failed++;
    }
  };

  try {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const testPhone = '9876543210';
    const salt = await bcrypt.genSalt(10);
    const user = await User.create({
      name: 'Ramesh Farmer',
      phone: testPhone,
      password: await bcrypt.hash('secretPass123', salt),
      role: 'farmer',
      language: 'te',
    });
    await FarmerProfile.create({
      userId: user._id,
      farmLocation: { latitude: 17.385, longitude: 78.4867 },
      village: 'Hanamkonda',
      district: 'Warangal',
    });

    // Test 1: FAST2SMS without API Key throws clear error
    process.env.SMS_PROVIDER = 'fast2sms';
    delete process.env.FAST2SMS_API_KEY;

    let errMissingKey = null;
    try {
      await smsService.sendSms({ phone: testPhone, otp: '123456' });
    } catch (e) {
      errMissingKey = e;
    }
    assert(
      errMissingKey && errMissingKey.message.includes('FAST2SMS_API_KEY'),
      'Missing FAST2SMS_API_KEY throws explicit server configuration error'
    );

    // Test 2: FAST2SMS with invalid phone format rejects immediately
    process.env.FAST2SMS_API_KEY = 'mock_key_for_format_test';
    let errInvalidPhone = null;
    try {
      await smsService.sendSms({ phone: '12345', otp: '123456' });
    } catch (e) {
      errInvalidPhone = e;
    }
    assert(
      errInvalidPhone && errInvalidPhone.message.includes('Invalid 10-digit Indian mobile number'),
      'Invalid phone format rejected before calling Fast2SMS'
    );

    // Test 3: FAST2SMS with non-numeric OTP rejects
    let errNonNumericOtp = null;
    try {
      await smsService.sendSms({ phone: testPhone, otp: 'ABC123' });
    } catch (e) {
      errNonNumericOtp = e;
    }
    assert(
      errNonNumericOtp && errNonNumericOtp.message.includes('numeric OTP'),
      'Non-numeric OTP rejected before calling Fast2SMS'
    );

    // Test 4: Verify controller rolls back created Otp when SMS fails
    // (With FAST2SMS_API_KEY set to dummy key, delivery fails and rolls back OTP)
    const resFailedSms = await postJson('/api/auth/send-otp', { phone: testPhone });
    assert(resFailedSms.status === 502, 'Failed SMS dispatch returns HTTP 502 to client');
    assert(resFailedSms.body.success === false, 'success is false on delivery failure');

    // Confirm that the OTP record was deleted (rolled back) from MongoDB
    const otpInDb = await Otp.findOne({ phone: testPhone });
    assert(otpInDb === null, 'OTP record rolled back from DB on SMS failure (prevents locked cooldown)');

    // Test 5: devOtp is strictly NOT returned when SMS_PROVIDER=fast2sms
    // Even in development mode!
    assert(
      resFailedSms.body.devOtp === undefined,
      'devOtp is NEVER exposed in payload when SMS_PROVIDER=fast2sms'
    );

    // Test 6: Restore SMS_PROVIDER=mock and verify normal dev flow
    process.env.SMS_PROVIDER = 'mock';
    const resMockSms = await postJson('/api/auth/send-otp', { phone: testPhone });
    assert(resMockSms.status === 200, 'Mock mode returns HTTP 200');
    assert(resMockSms.body.devOtp !== undefined, 'devOtp is returned ONLY in development mock mode');

    const createdOtpDoc = await Otp.findOne({ phone: testPhone, isUsed: false });
    assert(createdOtpDoc !== null, 'OTP record exists in DB for successful dispatch');

    console.log(`\nFAST2SMS TEST SUITE: ${passed} passed, ${failed} failed\n`);
  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    if (server) server.close();
    if (mongoose.connection) await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  }
};

runFast2SMSTests();

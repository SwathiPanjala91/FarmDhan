const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const FarmerProfile = require('../models/FarmerProfile');
const authRoutes = require('../routes/authRoutes');

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

const run = async () => {
  console.log('--- TESTING OTP HTTP ENDPOINTS ---');
  let passed = 0;
  let failed = 0;

  const check = (condition, name) => {
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

    // Create existing user with password
    const testPhone = '9876543210';
    const salt = await bcrypt.genSalt(10);
    const user = await User.create({
      name: 'Swathi Farmer',
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

    // Test 1: Send OTP to unregistered phone (Expect 404)
    const resUnregistered = await postJson('/api/auth/send-otp', { phone: '9123456780' });
    check(resUnregistered.status === 404, 'Unregistered phone returns 404 with registration prompt');
    check(resUnregistered.body.requiresRegistration === true, 'requiresRegistration flag is true');

    // Test 2: Send OTP with invalid phone (Expect 400)
    const resInvalid = await postJson('/api/auth/send-otp', { phone: '12345' });
    check(resInvalid.status === 400, 'Invalid phone number returns 400');

    // Test 3: Send OTP to valid registered user (Expect 200)
    const resSend = await postJson('/api/auth/send-otp', { phone: testPhone });
    check(resSend.status === 200, 'Send OTP returns 200 for registered user');
    check(resSend.body.success === true, 'Success is true');
    check(resSend.body.cooldownSeconds === 45, 'Cooldown seconds is 45');
    const devOtp = resSend.body.devOtp;
    check(/^\d{6}$/.test(devOtp), `Dev OTP received in development mode: ${devOtp}`);

    // Test 4: Immediate Resend within cooldown (Expect 429)
    const resCooldown = await postJson('/api/auth/resend-otp', { phone: testPhone });
    check(resCooldown.status === 429, 'Immediate resend within cooldown returns 429 Too Many Requests');
    check(resCooldown.body.cooldownRemaining > 0, `Remaining cooldown returned: ${resCooldown.body.cooldownRemaining}s`);

    // Test 5: Verify with wrong OTP (Expect 400)
    const resWrong = await postJson('/api/auth/verify-otp', { phone: testPhone, otp: '000000' });
    check(resWrong.status === 400, 'Wrong OTP returns 400');
    check(resWrong.body.attemptsRemaining === 2, 'Returns 2 attempts remaining');

    // Test 6: Verify with correct OTP (Expect 200 + JWT)
    const resVerify = await postJson('/api/auth/verify-otp', { phone: testPhone, otp: devOtp });
    check(resVerify.status === 200, 'Correct OTP returns 200');
    check(!!resVerify.body.token, 'JWT token returned on verification');
    check(resVerify.body.user.phone === testPhone, 'User profile returned in session payload');

    // Test 7: Verify again with already used OTP (Expect 400)
    const resReplay = await postJson('/api/auth/verify-otp', { phone: testPhone, otp: devOtp });
    check(resReplay.status === 400, 'Replay attack with used OTP returns 400');

    // Test 8: Verify existing password login still works (Expect 200)
    const resLogin = await postJson('/api/auth/login', { phone: testPhone, password: 'secretPass123' });
    check(resLogin.status === 200, 'Existing password login still works 100%');
    check(!!resLogin.body.token, 'JWT token returned on password login');

    console.log(`\nHTTP ENDPOINT TEST RESULTS: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Route test error:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
    }
    process.exit(0);
  }
};

run();
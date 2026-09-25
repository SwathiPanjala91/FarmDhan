const https = require('https');

/**
 * Clean SMS Provider Abstraction for FarmDhan
 * Configurable via backend environment variables ONLY.
 */

const sendViaFast2SMS = async (phone, otp) => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('FAST2SMS_API_KEY environment variable is not configured on the server');
  }

  // Fast2SMS expects 10-digit Indian phone number without country code
  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw new Error(`Invalid 10-digit Indian mobile number: ${phone}`);
  }

  const cleanOtp = String(otp).trim();
  if (!/^\d+$/.test(cleanOtp)) {
    throw new Error(`Fast2SMS OTP route requires numeric OTP, received: ${otp}`);
  }

  // Official Fast2SMS bulkV2 OTP payload
  const postData = JSON.stringify({
    route: 'otp',
    variables_values: cleanOtp,
    numbers: cleanPhone,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.fast2sms.com',
      path: '/dev/bulkV2',
      method: 'POST',
      headers: {
        authorization: apiKey.trim(),
        'Content-Type': 'application/json',
        accept: 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Note: Fast2SMS returns HTTP 200 even when return: false (e.g. invalid key or zero balance)
          // Official success criteria: parsed.return === true
          if (parsed && parsed.return === true) {
            resolve({
              success: true,
              provider: 'fast2sms',
              requestId: parsed.request_id,
              response: parsed,
            });
          } else {
            let errorMsg = '';
            if (Array.isArray(parsed?.message)) {
              errorMsg = parsed.message.join(', ');
            } else if (parsed?.message) {
              errorMsg = String(parsed.message);
            }

            const statusCode = parsed?.status_code;
            if (statusCode === 412) {
              errorMsg = 'Fast2SMS: Invalid or inactive Authorization Key. Check FAST2SMS_API_KEY.';
            } else if (statusCode === 416) {
              errorMsg = 'Fast2SMS: Insufficient wallet balance to send SMS.';
            } else if (statusCode === 996) {
              errorMsg = 'Fast2SMS: Account KYC verification required before sending OTPs.';
            } else if (statusCode === 999) {
              errorMsg = 'Fast2SMS: Minimum wallet recharge threshold not met.';
            } else if (!errorMsg) {
              errorMsg = `Fast2SMS delivery failed (Status: ${statusCode || res.statusCode})`;
            }

            reject(new Error(errorMsg));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Fast2SMS response (HTTP ${res.statusCode}): ${e.message}`));
        }
      });
    });

    req.on('error', (err) => reject(new Error(`Fast2SMS network error: ${err.message}`)));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Fast2SMS Gateway connection timed out (10s)'));
    });
    req.write(postData);
    req.end();
  });
};

const sendViaTwilio = async (phone, message) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials (ACCOUNT_SID, AUTH_TOKEN, PHONE_NUMBER) not fully configured');
  }

  const postData = new URLSearchParams({
    To: `+91${phone}`,
    From: fromNumber,
    Body: message,
  }).toString();

  return new Promise((resolve, reject) => {
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const options = {
      hostname: 'api.twilio.com',
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, provider: 'twilio', sid: parsed.sid });
          } else {
            reject(new Error(parsed.message || 'Twilio SMS failed'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Twilio connection timed out'));
    });
    req.write(postData);
    req.end();
  });
};

/**
 * Main sendSms function
 * Dispatches via configured provider or mock mode in development.
 */
const sendSms = async ({ phone, otp, message }) => {
  const provider = (process.env.SMS_PROVIDER || 'mock').toLowerCase();
  const textMessage = message || `Your FarmDhan verification OTP is ${otp}. Valid for 5 minutes. Do not share this code.`;

  if (provider === 'fast2sms') {
    return await sendViaFast2SMS(phone, otp);
  }

  if (provider === 'twilio') {
    return await sendViaTwilio(phone, textMessage);
  }

  // Default: Mock Provider (Development mode)
  // Safely logs to server console without third-party billing
  console.log('----------------------------------------------------');
  console.log(`📱 [SMS SERVICE - DEV MOCK MODE]`);
  console.log(`   To Phone: +91 ${phone}`);
  console.log(`   OTP Code: ${otp}`);
  console.log(`   Message:  "${textMessage}"`);
  console.log('----------------------------------------------------');

  return {
    success: true,
    provider: 'mock',
    devMode: true,
  };
};

module.exports = { sendSms };
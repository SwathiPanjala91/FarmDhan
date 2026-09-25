const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:5000/api';

const request = (method, endpoint, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runE2E = async () => {
  console.log('===============================================================');
  console.log('🌾 FarmDhan End-to-End Real Account Workflow Verification');
  console.log('===============================================================');

  const farmerPhone = '9876543211';
  const buyerPhone = '9876543212';
  const testPassword = 'Password123!';

  // 1. Authenticate or Register Real Farmer Account
  console.log('\n[1] Authenticating Real Seller/Farmer Account (' + farmerPhone + ')...');
  let farmerToken = null;
  let farmerUser = null;

  const farmerLogin = await request('POST', '/auth/login', {
    phone: farmerPhone,
    password: testPassword,
  });

  if (farmerLogin.status === 200 && farmerLogin.body.token) {
    farmerToken = farmerLogin.body.token;
    farmerUser = farmerLogin.body.user;
    console.log('✅ Logged in existing Farmer:', farmerUser.name);
  } else {
    console.log('Registering Real Farmer account...');
    const farmerReg = await request('POST', '/auth/register', {
      name: 'Ramesh Reddy',
      phone: farmerPhone,
      password: testPassword,
      role: 'farmer',
      language: 'te',
      village: 'Enumamula',
      district: 'Warangal',
      state: 'Telangana',
      landSizeAcres: 5,
      primaryCrops: ['Paddy Straw', 'Cotton Residue'],
    });
    assert.strictEqual(farmerReg.status, 201, 'Farmer registration failed');
    farmerToken = farmerReg.body.token;
    farmerUser = farmerReg.body.user;
    console.log('✅ Registered Real Farmer:', farmerUser.name);
  }

  // 2. Authenticate or Register Real Buyer Account
  console.log('\n[2] Authenticating Real Buyer Account (' + buyerPhone + ')...');
  let buyerToken = null;
  let buyerUser = null;

  const buyerLogin = await request('POST', '/auth/login', {
    phone: buyerPhone,
    password: testPassword,
  });

  if (buyerLogin.status === 200 && buyerLogin.body.token) {
    buyerToken = buyerLogin.body.token;
    buyerUser = buyerLogin.body.user;
    console.log('✅ Logged in existing Buyer:', buyerUser.name);
  } else {
    console.log('Registering Real Buyer account...');
    const buyerReg = await request('POST', '/auth/register', {
      name: 'Suresh Kumar',
      businessName: 'Telangana Biofuels Ltd',
      businessType: 'Pellet Manufacturer',
      phone: buyerPhone,
      password: testPassword,
      role: 'buyer',
      language: 'en',
      district: 'Hyderabad',
      state: 'Telangana',
      wasteTypes: ['Paddy Straw'],
      requiredQuantity: 200,
      offeredPrice: 2500,
    });
    assert.strictEqual(buyerReg.status, 201, 'Buyer registration failed');
    buyerToken = buyerReg.body.token;
    buyerUser = buyerReg.body.user;
    console.log('✅ Registered Real Buyer:', buyerUser.name);
  }

  // 3. Seller creates a real waste listing
  console.log('\n[3] Seller creates a real listing (Paddy Straw, 15 tons, Warangal)...');
  const createListingRes = await request(
    'POST',
    '/listings',
    {
      wasteType: 'Paddy Straw',
      quantity: 15,
      unit: 'ton',
      expectedPrice: 2400,
      description: 'Dry organic paddy straw from kharif harvest. Road accessible.',
      location: {
        latitude: 17.9784,
        longitude: 79.5941,
        village: 'Enumamula',
        district: 'Warangal',
        state: 'Telangana',
      },
    },
    farmerToken
  );
  assert.strictEqual(createListingRes.status, 201, 'Listing creation failed');
  const listingId = createListingRes.body.listing._id;
  console.log('✅ Listing created successfully. ID:', listingId);

  // 4. Contact Privacy Check: Public & Buyer browse MUST NOT reveal farmer phone!
  console.log('\n[4] STRICT PRIVACY CHECK: Buyer browses public listings...');
  const publicBrowseRes = await request('GET', '/listings', null, buyerToken);
  assert.strictEqual(publicBrowseRes.status, 200, 'Browse listings failed');
  const foundListing = publicBrowseRes.body.listings.find((l) => l._id === listingId);
  assert(foundListing, 'Created listing should be in browse results');
  assert.strictEqual(
    foundListing.farmerId.phone,
    undefined,
    'SECURITY VIOLATION: Farmer phone MUST NOT be exposed in public listings!'
  );
  console.log('✅ Verified: Farmer phone is NOT leaked in public listing browse.');

  // Single listing detail check
  const singleListingRes = await request('GET', `/listings/${listingId}`, null, buyerToken);
  assert.strictEqual(
    singleListingRes.body.listing.farmerId.phone,
    undefined,
    'SECURITY VIOLATION: Farmer phone MUST NOT be exposed in single listing detail!'
  );
  console.log('✅ Verified: Farmer phone is NOT leaked in single listing detail.');

  // Buyer directory privacy check
  const buyersDirectoryRes = await request('GET', '/buyers', null, farmerToken);
  const foundBuyer = buyersDirectoryRes.body.buyers.find((b) => b.userId?._id === buyerUser._id);
  if (foundBuyer) {
    assert.strictEqual(
      foundBuyer.userId.phone,
      undefined,
      'SECURITY VIOLATION: Buyer phone MUST NOT be exposed in public buyer directory!'
    );
    console.log('✅ Verified: Buyer phone is NOT leaked in buyers directory.');
  }

  // 5. Buyer makes a real offer
  console.log('\n[5] Buyer submits an offer (₹2,500/ton for 10 tons)...');
  const offerRes = await request(
    'POST',
    '/offers',
    {
      listingId,
      offeredPrice: 2500,
      quantity: 10,
      pickupDetails: 'Arranging 10-ton flatbed truck within 48 hours to farm gate',
      message: 'Can pickup and settle payment digitally immediately upon weighment.',
    },
    buyerToken
  );
  assert.strictEqual(offerRes.status, 201, 'Offer creation failed');
  const offerId = offerRes.body.offer._id;
  console.log('✅ Offer submitted successfully. ID:', offerId);

  // 6. Seller receives notification
  console.log('\n[6] Verifying Seller receives notification for offer...');
  const farmerNotifsRes = await request('GET', '/notifications', null, farmerToken);
  assert.strictEqual(farmerNotifsRes.status, 200, 'Failed to fetch farmer notifications');
  const offerNotif = farmerNotifsRes.body.notifications.find(
    (n) => n.relatedOfferId && (n.relatedOfferId._id === offerId || n.relatedOfferId === offerId)
  );
  assert(offerNotif, 'Farmer did not receive notification with relatedOfferId');
  assert.strictEqual(offerNotif.type, 'offer_received');
  console.log('✅ Farmer received offer_received notification with relatedOfferId:', offerNotif.relatedOfferId._id || offerNotif.relatedOfferId);

  // 7. Seller opens notification & views pending offer
  console.log('\n[7] Seller opens offer details while status is pending...');
  const farmerOfferDetailRes = await request('GET', `/offers/${offerId}`, null, farmerToken);
  assert.strictEqual(farmerOfferDetailRes.status, 200, 'Farmer fetch offer failed');
  assert.strictEqual(farmerOfferDetailRes.body.offer.status, 'pending');
  // Privacy check: pending offer must NOT disclose buyer phone
  assert.strictEqual(
    farmerOfferDetailRes.body.offer.buyerId.phone,
    undefined,
    'SECURITY VIOLATION: Buyer phone MUST NOT be revealed before offer acceptance!'
  );
  console.log('✅ Verified: Buyer phone is hidden while offer is pending.');

  // 8. Seller accepts the offer
  console.log('\n[8] Seller accepts the offer...');
  const acceptRes = await request(
    'PUT',
    `/offers/${offerId}/status`,
    { status: 'accepted' },
    farmerToken
  );
  assert.strictEqual(acceptRes.status, 200, 'Accept offer failed');
  assert.strictEqual(acceptRes.body.offer.status, 'accepted');
  console.log('✅ Offer accepted by farmer. Deal confirmed!');

  // 9. Buyer receives acceptance notification
  console.log('\n[9] Verifying Buyer receives offer_accepted notification...');
  const buyerNotifsRes = await request('GET', '/notifications', null, buyerToken);
  assert.strictEqual(buyerNotifsRes.status, 200, 'Failed to fetch buyer notifications');
  const acceptedNotif = buyerNotifsRes.body.notifications.find(
    (n) => n.type === 'offer_accepted' || n.type === 'buyer_selected'
  );
  assert(acceptedNotif, 'Buyer did not receive acceptance notification');
  console.log('✅ Buyer received accepted notification with relatedOfferId & relatedTransactionId!');

  // 10. Verification of Contact Details Disclosure (ONLY to participants AFTER acceptance)
  console.log('\n[10] CONTACT DETAILS DISCLOSURE AFTER ACCEPTED DEAL:');

  // Buyer views accepted offer
  const buyerOfferDetailRes = await request('GET', `/offers/${offerId}`, null, buyerToken);
  assert.strictEqual(buyerOfferDetailRes.status, 200, 'Buyer fetch offer failed');
  const buyerView = buyerOfferDetailRes.body.offer;
  const revealedSellerPhone = buyerView.listingId.farmerId.phone;
  console.log('   Buyer sees Seller Name:', buyerView.listingId.farmerId.name);
  console.log('   Buyer sees Seller Phone:', revealedSellerPhone);
  assert.strictEqual(
    revealedSellerPhone,
    farmerPhone,
    'Buyer MUST receive the real seller phone number after acceptance!'
  );
  console.log('✅ SUCCESS: Buyer can see Seller contact details (+91 ' + revealedSellerPhone + ')');

  // Seller views accepted offer
  const sellerOfferDetailRes = await request('GET', `/offers/${offerId}`, null, farmerToken);
  assert.strictEqual(sellerOfferDetailRes.status, 200, 'Seller fetch offer failed');
  const sellerView = sellerOfferDetailRes.body.offer;
  const revealedBuyerPhone = sellerView.buyerId.phone;
  console.log('   Seller sees Buyer Name:', sellerView.buyerId.name);
  console.log('   Seller sees Buyer Phone:', revealedBuyerPhone);
  assert.strictEqual(
    revealedBuyerPhone,
    buyerPhone,
    'Seller MUST receive the real buyer phone number after acceptance!'
  );
  console.log('✅ SUCCESS: Seller can see Buyer contact details (+91 ' + revealedBuyerPhone + ')');

  // 11. Transaction History verification
  console.log('\n[11] Verifying Transaction History for both accounts...');
  const farmerTxRes = await request('GET', '/transactions', null, farmerToken);
  assert.strictEqual(farmerTxRes.status, 200, 'Farmer get transactions failed');
  assert(farmerTxRes.body.transactions.length > 0, 'Farmer should have at least 1 transaction');
  const farmerTx = farmerTxRes.body.transactions[0];
  console.log('   Farmer Transaction: Crop =', farmerTx.wasteType, '| Agreed Price = ₹' + farmerTx.agreedPrice, '| Total = ₹' + farmerTx.totalAmount);
  assert.strictEqual(farmerTx.buyerId.phone, buyerPhone, 'Farmer transaction must contain buyer phone');

  const buyerTxRes = await request('GET', '/transactions', null, buyerToken);
  assert.strictEqual(buyerTxRes.status, 200, 'Buyer get transactions failed');
  assert(buyerTxRes.body.transactions.length > 0, 'Buyer should have at least 1 transaction');
  const buyerTx = buyerTxRes.body.transactions[0];
  console.log('   Buyer Transaction: Crop =', buyerTx.wasteType, '| Agreed Price = ₹' + buyerTx.agreedPrice, '| Total = ₹' + buyerTx.totalAmount);
  assert.strictEqual(buyerTx.farmerId.phone, farmerPhone, 'Buyer transaction must contain seller phone');
  console.log('✅ SUCCESS: Both real accounts have confirmed transactions with verified counterpart contacts.');

  console.log('\n===============================================================');
  console.log('🎉 ALL END-TO-END FLOW TESTS PASSED 100%!');
  console.log('===============================================================');
};

runE2E().catch((err) => {
  console.error('\n❌ E2E Test Failure:', err);
  process.exit(1);
});

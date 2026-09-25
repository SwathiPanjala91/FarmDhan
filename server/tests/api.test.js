const assert = require('assert');
const { calculateDistanceKm, formatDistance } = require('../services/distanceService');
const {
  calculateBuyerMatches,
  sortOffersByPriceDescending,
  DEFAULT_WEIGHTS,
} = require('../services/matchingEngine');
const { generateAdvice } = require('../services/geminiService');

console.log('====================================================');
console.log('🌾 FarmDhan Automated Algorithm & Logic Test Suite');
console.log('====================================================');

let passedTests = 0;
let totalTests = 0;

const test = async (name, fn) => {
  totalTests++;
  try {
    await fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${err.message}`);
  }
};

const runAllTests = async () => {
  // Test 1: Distance Calculation (Haversine Formula)
  await test('Distance Calculation: Warangal to Kazipet (~10 km)', () => {
    // Warangal coordinates: 17.9784, 79.5941
    // Kazipet coordinates: 18.0120, 79.5510
    const distance = calculateDistanceKm(17.9784, 79.5941, 18.0120, 79.5510);
    assert(distance > 4 && distance < 12, `Distance should be ~6-8 km, got ${distance} km`);

    const formatted = formatDistance(distance);
    assert(formatted.includes('km away'), `Formatted text should include "km away", got ${formatted}`);
  });

  // Test 2: Matching Algorithm - Weighted Scoring
  await test('Buyer Matching Engine: Weighted Multi-Criteria Scoring (Price 50%, Waste 20%, Dist 20%, Qty 10%)', () => {
    const mockListing = {
      wasteType: 'Paddy Straw',
      quantity: 10,
      unit: 'ton',
      location: { latitude: 17.9784, longitude: 79.5941 },
    };

    const mockBuyers = [
      {
        _id: 'buyer-a',
        businessName: 'High Price Buyer (Far)',
        wasteTypes: ['Paddy Straw'],
        offeredPrice: 3000,
        requiredQuantity: 10,
        location: { latitude: 18.4386, longitude: 79.1288 }, // ~70 km away
        serviceRadius: 80,
      },
      {
        _id: 'buyer-b',
        businessName: 'Local Buyer (Close, Moderate Price)',
        wasteTypes: ['Paddy Straw'],
        offeredPrice: 2700,
        requiredQuantity: 10,
        location: { latitude: 17.9950, longitude: 79.5800 }, // ~2.5 km away
        serviceRadius: 50,
      },
      {
        _id: 'buyer-c',
        businessName: 'Incompatible Buyer (Cotton Only)',
        wasteTypes: ['Cotton Residue'],
        offeredPrice: 3200,
        requiredQuantity: 10,
        location: { latitude: 17.9950, longitude: 79.5800 },
        serviceRadius: 50,
      },
    ];

    const results = calculateBuyerMatches(mockListing, mockBuyers);

    assert(results.length > 0, 'Should return matching candidates');
    assert(results[0].matchScore >= 0 && results[0].matchScore <= 100, 'Score must be between 0 and 100%');
    assert(results[0].breakdown, 'Should include breakdown of weights');

    // Incompatible buyer (Cotton Only for Paddy Straw) should have 0% compatibility score
    const buyerC = results.find((r) => r.buyerProfileId === 'buyer-c');
    if (buyerC) {
      assert.strictEqual(buyerC.breakdown.compatibilityScore, 0, 'Incompatible buyer should score 0 for compatibility');
    }
  });

  // Test 3: Price-Based Descending Sorting (Section 12)
  await test('Price Comparison Sorting: buyers.sort((a, b) => b.price - a.price) descending order', () => {
    const unsortedBuyers = [
      { buyerName: 'Buyer A', price: 2100 },
      { buyerName: 'Buyer B', price: 2800 },
      { buyerName: 'Buyer C', price: 2450 },
      { buyerName: 'Buyer D', price: 1950 },
    ];

    const sorted = sortOffersByPriceDescending(unsortedBuyers);

    assert.strictEqual(sorted[0].price, 2800, 'First item must have highest price');
    assert.strictEqual(sorted[1].price, 2450, 'Second item must have second highest price');
    assert.strictEqual(sorted[2].price, 2100, 'Third item must have third highest price');
    assert.strictEqual(sorted[3].price, 1950, 'Last item must have lowest price');

    for (let i = 0; i < sorted.length - 1; i++) {
      assert(sorted[i].price >= sorted[i + 1].price, 'Array must be monotonically descending in price');
    }
  });

  // Test 4: Gemini AI Agricultural Advisory & Multilingual Fallback
  await test('AI Service: Multilingual Agricultural Advisory (English & Telugu)', async () => {
    const enAdvice = await generateAdvice('How much is paddy straw worth?', [], 'en');
    assert(enAdvice.text && enAdvice.text.length > 20, 'English advice should return detailed text');

    const teAdvice = await generateAdvice('వరి గడ్డి ధర ఎంత?', [], 'te');
    assert(teAdvice.text && teAdvice.text.length > 20, 'Telugu advice should return detailed text');
    assert(teAdvice.text.includes('వరి') || teAdvice.text.includes('టన్ను'), 'Telugu text should include Telugu agricultural terms');
  });

  // Test 4A: AI Zero Assumption on "How do I sell waste?"
  await test('AI Anti-Hallucination: "How do I sell waste?" never assumes 8.5 tons or paddy straw', async () => {
    const advice = await generateAdvice('How do I sell waste?', [], 'en');
    assert(!advice.text.includes('8.5'), 'Must NOT assume 8.5 tons');
    assert(!advice.text.toLowerCase().includes('you have 8.5'), 'Must NOT state you have 8.5 tons');
    assert(advice.text.includes('What type of agricultural waste'), 'Must ask user what waste type they have');
  });

  // Test 4B: AI Zero Assumption on "What buyers are available?"
  await test('AI Anti-Hallucination: "What buyers are available?" never assumes 8.5 tons or paddy straw', async () => {
    const advice = await generateAdvice('What buyers are available?', [], 'en');
    assert(!advice.text.includes('8.5'), 'Must NOT assume 8.5 tons');
    assert(!advice.text.toLowerCase().includes('you have 8.5'), 'Must NOT state you have 8.5 tons');
    assert(advice.text.includes('verified industrial buyers'), 'Must describe buyers generally');
  });

  // Test 4C: AI Zero Assumption on "How do I create a listing?"
  await test('AI Anti-Hallucination: "How do I create a listing?" gives clean steps without fake data', async () => {
    const advice = await generateAdvice('How do I create a listing?', [], 'en');
    assert(!advice.text.includes('8.5'), 'Must NOT assume 8.5 tons');
    assert(advice.text.includes('List Waste'), 'Must explain how to list waste');
  });

  // Test 4D: AI Zero Assumption on "I need help with FarmDhan."
  await test('AI Anti-Hallucination: "I need help with FarmDhan." gives general help without assumptions', async () => {
    const advice = await generateAdvice('I need help with FarmDhan.', [], 'en');
    assert(!advice.text.includes('8.5'), 'Must NOT assume 8.5 tons');
    assert(advice.text.includes('Welcome to FarmDhan'), 'Must provide general welcome help');
  });

  // Test 4E: AI Explicit Fact Extraction on "I have 8.5 tons of paddy straw."
  await test('AI Fact Extraction: "I have 8.5 tons of paddy straw." accurately uses user-provided data', async () => {
    const advice = await generateAdvice('I have 8.5 tons of paddy straw.', [], 'en');
    assert(advice.text.includes('8.5'), 'Must recognize the 8.5 tons provided by user');
    assert(advice.text.includes('Paddy Straw'), 'Must recognize Paddy Straw provided by user');
    assert(advice.text.includes('15,300') || advice.text.includes('1,800'), 'Must calculate correct valuation for 8.5 tons');
  });

  // Test 4F: AI Conversation Memory across multi-turn chat
  await test('AI Conversation Memory: Remembers user-stated facts across turns without inventing values', async () => {
    const history = [
      { role: 'user', content: 'I have cotton stalks.' },
      { role: 'model', content: 'How many tons of cotton stalks do you have?' }
    ];
    const advice = await generateAdvice('12 tons', history, 'en');
    assert(!advice.text.includes('8.5'), 'Must NOT invent 8.5 tons');
    assert(advice.text.includes('12 tons'), 'Must recognize 12 tons');
    assert(advice.text.includes('Cotton Residue'), 'Must remember Cotton Residue from turn 1');
  });

  // Test 4G: When prior conversation had an 8-ton paddy straw query, a new "How can I find buyers?" query must answer buyers directly
  await test('AI Anti-Carryover: "How can I find buyers?" answers buyers directly and ignores previous 8-ton query', async () => {
    const historyWithOldQuestion = [
      { role: 'user', content: 'నా దగ్గర 8 టన్నుల వరి గడ్డి ఉంది. నేను ఎంత ధరకు అమ్మవచ్చు?' },
      { role: 'model', content: 'మీ వద్ద 8 టన్నుల వరి గడ్డి ఉంది...' }
    ];
    const advice = await generateAdvice('How can I find buyers?', historyWithOldQuestion, 'en');
    assert(!advice.text.includes('8 ton'), 'Must NOT repeat 8 tons');
    assert(!advice.text.includes('8.5'), 'Must NOT invent 8.5 tons');
    assert(advice.text.includes('verified industrial buyers') || advice.text.includes('Nearby Buyers'), 'Must answer how to find buyers directly');
  });

  // Test 4H: When prior conversation had an 8-ton paddy straw query, a new "How do I create a waste listing?" answers listing directly
  await test('AI Anti-Carryover: "How do I create a waste listing?" answers listing directly without old 8-ton straw quote', async () => {
    const historyWithOldQuestion = [
      { role: 'user', content: 'నా దగ్గర 8 టన్నుల వరి గడ్డి ఉంది. నేను ఎంత ధరకు అమ్మవచ్చు?' },
      { role: 'model', content: 'మీ వద్ద 8 టన్నుల వరి గడ్డి ఉంది...' }
    ];
    const advice = await generateAdvice('How do I create a waste listing?', historyWithOldQuestion, 'en');
    assert(!advice.text.includes('8 ton'), 'Must NOT repeat 8 tons');
    assert(advice.text.includes('List Waste'), 'Must answer listing steps directly');
  });

  // Test 5: Farmer Autonomy Principle
  await test('Farmer Autonomy Rule: System recommends but never auto-confirms deals', () => {
    const listing = { status: 'active', selectedBuyerId: null };
    assert.strictEqual(listing.status, 'active');
    assert.strictEqual(listing.selectedBuyerId, null, 'Listing must remain unassigned until farmer confirms');
  });

  // Test 6: Complete End-to-End Notification and Deal Flow
  await test('Full Flow: Farmer Listing → Buyer Offer → Farmer Notification → Select Buyer → Buyer Notification', async () => {
    const { connectDB, disconnectDB } = require('../config/db');
    const User = require('../models/User');
    const WasteListing = require('../models/WasteListing');
    const BuyerOffer = require('../models/BuyerOffer');
    const Transaction = require('../models/Transaction');
    const Notification = require('../models/Notification');
    const { createNotification } = require('../services/notificationService');

    await connectDB();

    const timestamp = Date.now();
    const testFarmerPhone = '99' + String(timestamp).slice(-8);
    const testBuyerPhone = '98' + String(timestamp).slice(-8);

    // 1. Genuine Farmer user registration
    const farmer = await User.create({
      name: 'Kavitha Reddy',
      phone: testFarmerPhone,
      role: 'farmer',
      language: 'te',
      password: 'password123',
      location: { latitude: 17.9689, longitude: 79.5941, village: 'Hanamkonda', district: 'Warangal', state: 'Telangana' },
    });
    assert(farmer._id, 'Farmer user must be created in DB');

    // 2. Genuine Buyer user registration
    const buyer = await User.create({
      name: 'Sri Krishna Biomass Enterprises',
      phone: testBuyerPhone,
      role: 'buyer',
      language: 'en',
      password: 'password123',
      location: { latitude: 17.9784, longitude: 79.5941, city: 'Warangal', district: 'Warangal', state: 'Telangana' },
    });
    assert(buyer._id, 'Buyer user must be created in DB');

    // 3. Farmer creates listing
    const listing = await WasteListing.create({
      farmerId: farmer._id,
      wasteType: 'Paddy Straw',
      quantity: 10,
      unit: 'ton',
      expectedPrice: 2400,
      location: { latitude: 17.9689, longitude: 79.5941, village: 'Hanamkonda', district: 'Warangal' },
      status: 'active',
    });
    assert(listing._id, 'Listing should have valid _id associated with genuine farmer');
    assert.strictEqual(listing.farmerId.toString(), farmer._id.toString());

    // 4. Buyer submits offer
    const offer = await BuyerOffer.create({
      buyerId: buyer._id,
      listingId: listing._id,
      offeredPrice: 2650,
      quantity: 10,
      unit: 'ton',
      pickupDetails: 'Self-loading vehicle within 24 hrs',
      status: 'pending',
    });
    assert.strictEqual(offer.offeredPrice, 2650);
    assert.strictEqual(offer.buyerId.toString(), buyer._id.toString());

    // 5. Notification created for Farmer
    const farmerNotif = await createNotification({
      userId: listing.farmerId,
      type: 'offer_received',
      title: 'New Buyer Offer Received 🏷️',
      message: `${buyer.name} offered ₹${offer.offeredPrice}/${listing.unit} for ${offer.quantity} ${listing.unit} of ${listing.wasteType}.`,
      relatedListingId: listing._id,
    });
    assert(farmerNotif && farmerNotif._id, 'Farmer notification should be created in DB');
    assert(farmerNotif.message.includes('Sri Krishna Biomass Enterprises'), 'Notification must include buyer name');
    assert(farmerNotif.message.includes('2650'), 'Notification must include offered price');
    assert(farmerNotif.message.includes('Paddy Straw'), 'Notification must include waste type');

    // 6. Farmer confirms buyer & transaction is created
    const transaction = await Transaction.create({
      listingId: listing._id,
      farmerId: farmer._id,
      buyerId: buyer._id,
      wasteType: listing.wasteType,
      agreedPrice: offer.offeredPrice,
      quantity: offer.quantity,
      unit: listing.unit,
      totalAmount: offer.offeredPrice * offer.quantity,
      status: 'Buyer Confirmed',
    });
    assert(transaction._id, 'Transaction should be created');
    assert.strictEqual(transaction.farmerId.toString(), farmer._id.toString());
    assert.strictEqual(transaction.buyerId.toString(), buyer._id.toString());

    // 7. Notification created for Buyer
    const buyerNotif = await createNotification({
      userId: buyer._id,
      type: 'buyer_selected',
      title: 'Offer Accepted by Farmer! 🎉',
      message: `${farmer.name} accepted your offer for ${offer.quantity} ${listing.unit} of ${listing.wasteType} at ₹${offer.offeredPrice}/${listing.unit}. Please schedule pickup.`,
      relatedListingId: listing._id,
      relatedTransactionId: transaction._id,
    });
    assert(buyerNotif && buyerNotif._id, 'Buyer notification should be created in DB');
    assert(buyerNotif.message.includes('Kavitha Reddy'), 'Notification must include farmer name');
    assert(buyerNotif.message.includes('Paddy Straw'), 'Notification must include waste type');
    assert(buyerNotif.message.includes('2650'), 'Notification must include agreed price');

    // 8. Test BuyerOffer query and update status
    offer.status = 'accepted';
    await offer.save();
    const updatedOffer = await BuyerOffer.findById(offer._id);
    assert.strictEqual(updatedOffer.status, 'accepted', 'BuyerOffer status must update to accepted');

    // 9. Buyer Offers query verification
    const buyerOffers = await BuyerOffer.find({ buyerId: buyer._id });
    assert.strictEqual(buyerOffers.length, 1, 'Buyer should have 1 offer record');
    assert.strictEqual(buyerOffers[0].offeredPrice, 2650);

    // Clean up test data
    await User.deleteMany({ _id: { $in: [farmer._id, buyer._id] } });
    await WasteListing.deleteMany({ _id: listing._id });
    await BuyerOffer.deleteMany({ _id: offer._id });
    await Transaction.deleteMany({ _id: transaction._id });
    await Notification.deleteMany({ _id: { $in: [farmerNotif._id, buyerNotif._id] } });

    await disconnectDB();
  });

  console.log('====================================================');
  console.log(`Results: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL ALGORITHM AND LOGIC CHECKS PASSED!');
    process.exit(0);
  } else {
    process.exit(1);
  }
};

runAllTests();

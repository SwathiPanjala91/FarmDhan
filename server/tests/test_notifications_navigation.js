const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Notification = require('../models/Notification');

// Load translations via eval to support ES module export in Node
const translationsPath = path.join(__dirname, '../../mobile/src/constants/translations.js');
const translationsContent = fs.readFileSync(translationsPath, 'utf8');
const mod = {};
eval(translationsContent.replace('export const TRANSLATIONS =', 'mod.TRANSLATIONS ='));
const translations = mod.TRANSLATIONS;

console.log('===============================================================');
console.log('🔔 FarmDhan Notifications & Navigation Logic Verification Suite');
console.log('===============================================================');

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

// Frontend Navigation Dispatch Logic (matches NotificationsScreen.js)
const extractIds = (item) => {
  const listingId =
    item.listingId ||
    item.relatedListingId?._id ||
    (typeof item.relatedListingId === 'string' ? item.relatedListingId : null);

  const offerId =
    item.offerId ||
    item.relatedOfferId?._id ||
    (typeof item.relatedOfferId === 'string' ? item.relatedOfferId : null);

  const transactionId =
    item.transactionId ||
    item.relatedTransactionId?._id ||
    (typeof item.relatedTransactionId === 'string' ? item.relatedTransactionId : null);

  return { listingId, offerId, transactionId };
};

const resolveNavigation = (item, userRole) => {
  const { listingId, offerId, transactionId } = extractIds(item);
  let targetScreen = null;
  let params = null;

  switch (item.type) {
    case 'offer_received':
      if (listingId) {
        targetScreen = 'PriceComparison';
        params = { listingId, offerId };
      } else if (offerId) {
        targetScreen = 'PriceComparison';
        params = { offerId };
      } else {
        targetScreen = 'MyListings';
        params = {};
      }
      break;

    case 'offer_accepted':
      if (userRole === 'buyer') {
        targetScreen = 'MyOffers';
        params = { offerId, statusFilter: 'accepted' };
      } else {
        if (transactionId) {
          targetScreen = 'Profile';
          params = { transactionId };
        } else if (listingId) {
          targetScreen = 'PriceComparison';
          params = { listingId, offerId };
        } else {
          targetScreen = 'Profile';
          params = {};
        }
      }
      break;

    case 'offer_rejected':
      if (userRole === 'buyer') {
        targetScreen = 'MyOffers';
        params = { offerId, statusFilter: 'rejected' };
      } else {
        targetScreen = 'PriceComparison';
        params = { listingId };
      }
      break;

    case 'buyer_selected':
    case 'transaction_update':
    case 'pickup_update':
      targetScreen = 'Profile';
      params = transactionId ? { transactionId } : {};
      break;

    case 'new_listing':
      if (userRole === 'buyer') {
        targetScreen = 'BrowseListings';
        params = listingId ? { listingId } : {};
      } else {
        targetScreen = listingId ? 'PriceComparison' : 'MyListings';
        params = listingId ? { listingId } : {};
      }
      break;

    case 'new_requirement':
      targetScreen = 'NearbyBuyers';
      params = { wasteType: item.relatedListingId?.wasteType || 'All' };
      break;

    case 'fpo':
      targetScreen = 'Support';
      params = { initialTab: 'fpo' };
      break;

    case 'message':
      targetScreen = 'AIAssistant';
      params = {};
      break;

    default:
      if (transactionId) {
        targetScreen = 'Profile';
        params = { transactionId };
      } else if (offerId) {
        targetScreen = userRole === 'buyer' ? 'MyOffers' : 'PriceComparison';
        params = userRole === 'buyer' ? { offerId } : { listingId, offerId };
      } else if (listingId) {
        targetScreen = userRole === 'buyer' ? 'BrowseListings' : 'PriceComparison';
        params = { listingId };
      }
      break;
  }

  return { targetScreen, params };
};

const runAllTests = async () => {
  // 1. Notification Model Schema Validation
  await test('Notification Model Enum includes all required types', () => {
    const enumValues = Notification.schema.path('type').enumValues;
    const requiredTypes = [
      'offer_received',
      'offer_accepted',
      'offer_rejected',
      'buyer_selected',
      'pickup_update',
      'transaction_update',
      'new_listing',
      'new_requirement',
      'fpo',
      'message',
      'general',
    ];
    for (const t of requiredTypes) {
      assert(enumValues.includes(t), `Notification schema enum missing type: ${t}`);
    }
  });

  // 2. Translations Parity for Notifications & Fallbacks
  await test('Localization: recordNotFound and detailsUnavailable present in EN, TE, HI', () => {
    for (const lang of ['en', 'te', 'hi']) {
      assert(translations[lang].recordNotFound, `Missing recordNotFound in ${lang}`);
      assert(translations[lang].detailsUnavailable, `Missing detailsUnavailable in ${lang}`);
      assert(translations[lang].viewDetails, `Missing viewDetails in ${lang}`);
      assert(translations[lang].notificationsTitle, `Missing notificationsTitle in ${lang}`);
    }
    assert.strictEqual(translations.te.recordNotFound, 'రికార్డు కనుగొనబడలేదు');
    assert.strictEqual(translations.te.detailsUnavailable, 'అభ్యర్థించిన రికార్డు అందుబాటులో లేదు లేదా తీసివేయబడింది.');
    assert.strictEqual(translations.hi.recordNotFound, 'रिकॉर्ड नहीं मिला');
    assert.strictEqual(translations.hi.detailsUnavailable, 'अनुरोधित रिकॉर्ड अब उपलब्ध नहीं है या हटा दिया गया है।');
  });

  // 3. Farmer Flow: offer_received -> PriceComparison
  await test('Farmer Flow: offer_received notification routes to PriceComparison with { listingId, offerId }', () => {
    const notif = {
      type: 'offer_received',
      listingId: 'listing-123',
      offerId: 'offer-456',
    };
    const nav = resolveNavigation(notif, 'farmer');
    assert.strictEqual(nav.targetScreen, 'PriceComparison');
    assert.strictEqual(nav.params.listingId, 'listing-123');
    assert.strictEqual(nav.params.offerId, 'offer-456');
  });

  // 4. Buyer Flow: offer_accepted -> MyOffers with statusFilter='accepted'
  await test('Buyer Flow: offer_accepted notification routes to MyOffers with { offerId, statusFilter: "accepted" }', () => {
    const notif = {
      type: 'offer_accepted',
      offerId: 'offer-456',
      listingId: 'listing-123',
      transactionId: 'tx-789',
    };
    const nav = resolveNavigation(notif, 'buyer');
    assert.strictEqual(nav.targetScreen, 'MyOffers');
    assert.strictEqual(nav.params.offerId, 'offer-456');
    assert.strictEqual(nav.params.statusFilter, 'accepted');
  });

  // 5. Buyer Flow: offer_rejected -> MyOffers with statusFilter='rejected'
  await test('Buyer Flow: offer_rejected notification routes to MyOffers with { offerId, statusFilter: "rejected" }', () => {
    const notif = {
      type: 'offer_rejected',
      offerId: 'offer-456',
      listingId: 'listing-123',
    };
    const nav = resolveNavigation(notif, 'buyer');
    assert.strictEqual(nav.targetScreen, 'MyOffers');
    assert.strictEqual(nav.params.offerId, 'offer-456');
    assert.strictEqual(nav.params.statusFilter, 'rejected');
  });

  // 6. Buyer Flow: buyer_selected -> Profile with { transactionId }
  await test('Buyer Flow: buyer_selected notification routes to Profile with { transactionId }', () => {
    const notif = {
      type: 'buyer_selected',
      transactionId: 'tx-789',
      listingId: 'listing-123',
    };
    const nav = resolveNavigation(notif, 'buyer');
    assert.strictEqual(nav.targetScreen, 'Profile');
    assert.strictEqual(nav.params.transactionId, 'tx-789');
  });

  // 7. Farmer Flow: transaction_update -> Profile with { transactionId }
  await test('Farmer Flow: transaction_update notification routes to Profile with { transactionId }', () => {
    const notif = {
      type: 'transaction_update',
      transactionId: 'tx-789',
    };
    const nav = resolveNavigation(notif, 'farmer');
    assert.strictEqual(nav.targetScreen, 'Profile');
    assert.strictEqual(nav.params.transactionId, 'tx-789');
  });

  // 8. Buyer Flow: new_listing -> BrowseListings with { listingId }
  await test('Buyer Flow: new_listing notification routes to BrowseListings with { listingId }', () => {
    const notif = {
      type: 'new_listing',
      listingId: 'listing-123',
    };
    const nav = resolveNavigation(notif, 'buyer');
    assert.strictEqual(nav.targetScreen, 'BrowseListings');
    assert.strictEqual(nav.params.listingId, 'listing-123');
  });

  // 9. Farmer Flow: new_requirement -> NearbyBuyers with { wasteType }
  await test('Farmer Flow: new_requirement notification routes to NearbyBuyers', () => {
    const notif = {
      type: 'new_requirement',
      relatedListingId: { wasteType: 'Paddy Straw' },
    };
    const nav = resolveNavigation(notif, 'farmer');
    assert.strictEqual(nav.targetScreen, 'NearbyBuyers');
    assert.strictEqual(nav.params.wasteType, 'Paddy Straw');
  });

  // 10. Support/FPO Flow: fpo -> Support with { initialTab: 'fpo' }
  await test('FPO Flow: fpo notification routes to Support with initialTab="fpo"', () => {
    const notif = { type: 'fpo' };
    const nav = resolveNavigation(notif, 'farmer');
    assert.strictEqual(nav.targetScreen, 'Support');
    assert.strictEqual(nav.params.initialTab, 'fpo');
  });

  // 11. Message Flow: message -> AIAssistant
  await test('Message Flow: message notification routes to AIAssistant', () => {
    const notif = { type: 'message' };
    const nav = resolveNavigation(notif, 'farmer');
    assert.strictEqual(nav.targetScreen, 'AIAssistant');
  });

  // 12. Populated object entity ID extraction
  await test('Populated Object ID Extraction: extracts _id from populated Mongoose documents', () => {
    const notif = {
      type: 'offer_received',
      relatedListingId: { _id: 'pop-listing-999', wasteType: 'Cotton Residue' },
      relatedOfferId: { _id: 'pop-offer-888', offeredPrice: 2500 },
      relatedTransactionId: { _id: 'pop-tx-777', status: 'Pending' },
    };
    const { listingId, offerId, transactionId } = extractIds(notif);
    assert.strictEqual(listingId, 'pop-listing-999');
    assert.strictEqual(offerId, 'pop-offer-888');
    assert.strictEqual(transactionId, 'pop-tx-777');
  });

  // 13. General/Unknown Notification with IDs fallback safely
  await test('Fallback: general notification with transactionId falls back to Profile safely', () => {
    const notif = {
      type: 'general',
      transactionId: 'tx-fallback-111',
    };
    const nav = resolveNavigation(notif, 'buyer');
    assert.strictEqual(nav.targetScreen, 'Profile');
    assert.strictEqual(nav.params.transactionId, 'tx-fallback-111');
  });

  // 14. Empty/Generic Notification does not crash
  await test('Empty notification: resolves gracefully without throwing', () => {
    const notif = {
      type: 'general',
      title: 'Platform update',
      message: 'Maintenance scheduled',
    };
    const nav = resolveNavigation(notif, 'farmer');
    assert.strictEqual(nav.targetScreen, null);
  });

  console.log('\n===============================================================');
  console.log(`📊 Test Summary: ${passedTests}/${totalTests} Passed (${totalTests - passedTests} Failed)`);
  console.log('===============================================================');

  process.exit(passedTests === totalTests ? 0 : 1);
};

runAllTests();

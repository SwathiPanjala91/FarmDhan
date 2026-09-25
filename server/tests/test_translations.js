const fs = require('fs');

const content = fs.readFileSync('c:/Users/Panjala Swathi/OneDrive/Desktop/SIH/mobile/src/constants/translations.js', 'utf8');

const mod = {};
eval(content.replace('export const TRANSLATIONS =', 'mod.TRANSLATIONS ='));
const t = mod.TRANSLATIONS;

console.log('Available Languages:', Object.keys(t));
const requiredKeys = [
  'notificationsTitle',
  'liveAlerts',
  'markAllRead',
  'allTab',
  'unreadTab',
  'noNotifsYet',
  'noNotifsSub',
  'offerDetailsTitle',
  'dealConfirmedTitle',
  'cropResidueLabel',
  'quantityLabel',
  'totalValueLabel',
  'pickupPlanLabel',
  'acceptOfferBtn',
  'rejectOfferBtn',
  'offerAcceptedSuccess',
  'offerDeclinedSuccess',
  'sellerContactLabel',
  'buyerContactLabel',
  'callSellerBtn',
  'callBuyerBtn',
  'viewMyOffers',
  'viewMyListings',
  'contactHiddenUntilAccepted',
  'dealSummary',
  'rateLabel',
  'totalLabel',
  'buyerLabel',
  'farmerLabel',
  'pickupLabel',
  'registeredUser',
  'autoVoiceTitle',
  'autoVoiceSub',
  'voiceOn',
  'voiceOff',
  'testVoice',
  'call',
  'dealConfirmedSub',
  'viewTransactionDetails'
];

for (const lang of ['en', 'te', 'hi']) {
  const missing = requiredKeys.filter((k) => !t[lang][k]);
  console.log('[' + lang + '] Checked ' + requiredKeys.length + ' keys. Missing: ' + missing.length);
  if (missing.length > 0) {
    console.error('Missing in ' + lang + ':', missing);
    process.exit(1);
  }
}
console.log('✅ ALL TRANSLATION KEYS VERIFIED ACROSS EN, TE, AND HI!');

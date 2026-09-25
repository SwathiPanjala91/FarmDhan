const dotenv = require('dotenv');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const FarmerProfile = require('../models/FarmerProfile');
const BuyerProfile = require('../models/BuyerProfile');
const WasteListing = require('../models/WasteListing');
const BuyerOffer = require('../models/BuyerOffer');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');

dotenv.config({ path: __dirname + '/../.env' });

const DUMMY_PHONES = [
  '9876543210',
  '9876543211',
  '9123456701',
  '9123456702',
  '9123456703',
  '9123456704',
];

const DUMMY_NAMES = [
  'Ramesh Patel',
  'Suresh Rao',
  'Deccan Green Energy Ltd',
  'Telangana Bio-CNG Innovations',
  'Singareni Pellet & Briquette Fuel',
  'Godavari Kraft Paper Mills',
];

const cleanDummyData = async () => {
  try {
    await connectDB();
    console.log('[Clean] Identifying dummy/demo accounts...');

    // Find all dummy users by phone or known demo names
    const dummyUsers = await User.find({
      $or: [
        { phone: { $in: DUMMY_PHONES } },
        { name: { $in: DUMMY_NAMES } },
        { email: { $regex: /@farmdhan\.org$/i } },
      ],
    });

    const dummyUserIds = dummyUsers.map((u) => u._id);
    console.log(`[Clean] Found ${dummyUsers.length} dummy user account(s) to remove.`);

    if (dummyUserIds.length > 0) {
      // Remove associated farmer profiles
      const farmerProfilesDel = await FarmerProfile.deleteMany({ userId: { $in: dummyUserIds } });
      console.log(`[Clean] Deleted ${farmerProfilesDel.deletedCount} dummy FarmerProfile(s).`);

      // Remove associated buyer profiles
      const buyerProfilesDel = await BuyerProfile.deleteMany({ userId: { $in: dummyUserIds } });
      console.log(`[Clean] Deleted ${buyerProfilesDel.deletedCount} dummy BuyerProfile(s).`);

      // Find dummy listings
      const dummyListings = await WasteListing.find({ farmerId: { $in: dummyUserIds } });
      const dummyListingIds = dummyListings.map((l) => l._id);

      // Remove dummy offers (either by dummy buyer or for dummy listing)
      const offersDel = await BuyerOffer.deleteMany({
        $or: [
          { buyerId: { $in: dummyUserIds } },
          { listingId: { $in: dummyListingIds } },
        ],
      });
      console.log(`[Clean] Deleted ${offersDel.deletedCount} dummy BuyerOffer(s).`);

      // Remove dummy transactions
      const txDel = await Transaction.deleteMany({
        $or: [
          { farmerId: { $in: dummyUserIds } },
          { buyerId: { $in: dummyUserIds } },
          { listingId: { $in: dummyListingIds } },
        ],
      });
      console.log(`[Clean] Deleted ${txDel.deletedCount} dummy Transaction(s).`);

      // Remove dummy notifications
      const notifDel = await Notification.deleteMany({
        $or: [
          { userId: { $in: dummyUserIds } },
          { relatedListingId: { $in: dummyListingIds } },
        ],
      });
      console.log(`[Clean] Deleted ${notifDel.deletedCount} dummy Notification(s).`);

      // Remove dummy listings
      const listingsDel = await WasteListing.deleteMany({ _id: { $in: dummyListingIds } });
      console.log(`[Clean] Deleted ${listingsDel.deletedCount} dummy WasteListing(s).`);

      // Finally remove the dummy users
      const usersDel = await User.deleteMany({ _id: { $in: dummyUserIds } });
      console.log(`[Clean] Deleted ${usersDel.deletedCount} dummy User account(s).`);
    }

    console.log('✅ [Clean] Database cleanup complete. Zero dummy accounts remain.');
    await disconnectDB();
  } catch (err) {
    console.error('❌ [Clean] Error cleaning dummy data:', err);
    process.exit(1);
  }
};

cleanDummyData();

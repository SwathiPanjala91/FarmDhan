const dotenv = require('dotenv');
const { connectDB, disconnectDB } = require('../config/db');
const FPO = require('../models/FPO');

dotenv.config({ path: __dirname + '/../.env' });

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('[Seed] Ensuring official FPO cooperative directories are available...');

    // Only seed official FPO institutions if collection is empty
    const existingFPOCount = await FPO.countDocuments();
    if (existingFPOCount === 0) {
      await FPO.create([
        {
          name: 'Kakatiya Agricultural Producers Co-operative FPO',
          registrationNumber: 'FPO-TS-WGL-2021-042',
          district: 'Warangal',
          state: 'Telangana',
          location: {
            latitude: 17.9700,
            longitude: 79.6000,
            address: 'APMC Market Yard Complex, Warangal',
          },
          contactPerson: 'K. Rajeshwar Rao (President)',
          contactPhone: '+91 98480 11223',
          email: 'kakatiya.fpo@agricoop.org',
          supportedWasteTypes: ['Paddy Straw', 'Cotton Residue', 'Maize Residue'],
          memberCount: 480,
          servicesOffered: [
            'Custom hiring center for balers & rakes',
            'Aggregated biomass transport to power plants',
            'Soil health consultation and bio-char conversion',
          ],
          collectionCentres: [
            {
              name: 'Warangal Central Aggregation Hub',
              address: 'Enumamula Grain Market Road, Warangal',
              phone: '+91 98480 11224',
              capacityTons: 1500,
            },
            {
              name: 'Parkal Sub-Center',
              address: 'Near Old Bus Stand, Parkal',
              phone: '+91 98480 11225',
              capacityTons: 600,
            },
          ],
        },
        {
          name: 'Karimnagar Bio-Agri Farmers Producer Company',
          registrationNumber: 'FPO-TS-KMN-2020-019',
          district: 'Karimnagar',
          state: 'Telangana',
          location: {
            latitude: 18.4386,
            longitude: 79.1288,
            address: 'Collectorate Road, Karimnagar',
          },
          contactPerson: 'V. Sammaiah',
          contactPhone: '+91 98480 33445',
          email: 'karimnagar.bioagri@agricoop.org',
          supportedWasteTypes: ['Paddy Straw', 'Sugarcane Residue'],
          memberCount: 320,
          servicesOffered: [
            'Mechanized biomass baling assistance',
            'Direct buyer contract aggregation',
          ],
          collectionCentres: [
            {
              name: 'Choppadandi Depot',
              address: 'Main Road, Choppadandi',
              phone: '+91 98480 33446',
              capacityTons: 800,
            },
          ],
        },
      ]);
      console.log('✅ [Seed] Official FPO directory established.');
    } else {
      console.log(`ℹ️ [Seed] FPO directory already has ${existingFPOCount} registered cooperatives.`);
    }

    console.log('✅ [Seed] No dummy user accounts created. Real users register via app.');
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('❌ [Seed] Error seeding database:', err);
    process.exit(1);
  }
};

seedDatabase();

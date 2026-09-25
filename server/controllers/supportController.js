const FPO = require('../models/FPO');

// @desc    Get all FPOs and support centers
// @route   GET /api/support/fpos
// @access  Public / Private
const getFPOs = async (req, res, next) => {
  try {
    const { district, wasteType } = req.query;
    const query = {};

    if (district) {
      query.district = new RegExp(district, 'i');
    }

    if (wasteType && wasteType !== 'All') {
      query.supportedWasteTypes = { $in: [wasteType, 'All Biomass'] };
    }

    const fpos = await FPO.find(query).sort({ memberCount: -1 });

    res.json({
      success: true,
      count: fpos.length,
      fpos,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Kisan Community Groups
// @route   GET /api/support/kisan-groups
// @access  Public / Private
const getKisanGroups = async (req, res, next) => {
  try {
    const groups = [
      {
        id: 'kg-1',
        name: 'Telangana Rice Straw Biomass Cluster',
        region: 'Warangal & Karimnagar',
        members: 420,
        focus: 'Paddy straw baling & collective sales to Bio-CNG plants',
        coordinator: 'Rajeshwar Rao (FPO Director)',
        phone: '+91 98480 11223',
        status: 'Active',
      },
      {
        id: 'kg-2',
        name: 'Cotton Stalk Shredding Co-op',
        region: 'Adilabad & Nalgonda',
        members: 280,
        focus: 'Mobile shredders & briquetting for power boilers',
        coordinator: 'Venkat Reddy',
        phone: '+91 94401 55667',
        status: 'Active',
      },
      {
        id: 'kg-3',
        name: 'Deccan Sugarcane Bagasse Alliance',
        region: 'Nizamabad & Medak',
        members: 195,
        focus: 'Aggregated supply contracts to paper mills',
        coordinator: 'Suresh Kumar',
        phone: '+91 98492 44331',
        status: 'Active',
      },
    ];

    res.json({
      success: true,
      count: groups.length,
      groups,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Helpline and Emergency Support
// @route   GET /api/support/helpline
// @access  Public / Private
const getHelpline = async (req, res, next) => {
  try {
    res.json({
      success: true,
      helpline: {
        tollFree: '1800-425-1551 (Kisan Call Centre)',
        farmdhanDirect: '040-23456789 (FarmDhan Waste Support)',
        whatsappSupport: '+91 98765 43210',
        operatingHours: '6:00 AM - 9:00 PM (Monday - Saturday)',
        languages: ['Telugu', 'Hindi', 'English'],
        email: 'support@farmdhan.gov.in',
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFPOs,
  getKisanGroups,
  getHelpline,
};

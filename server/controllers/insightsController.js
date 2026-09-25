const WasteListing = require('../models/WasteListing');
const BuyerProfile = require('../models/BuyerProfile');
const BuyerOffer = require('../models/BuyerOffer');
const Transaction = require('../models/Transaction');

// @desc    Get Market Insights & Analytics
// @route   GET /api/insights
// @access  Public / Private
const getMarketInsights = async (req, res, next) => {
  try {
    // 1. Real Stored Platform Data Calculations
    const totalListings = await WasteListing.countDocuments();
    const activeListings = await WasteListing.countDocuments({ status: 'active' });
    const totalBuyers = await BuyerProfile.countDocuments();
    const totalTransactions = await Transaction.countDocuments();

    // Aggregate average listed price by waste type from actual database
    const wasteTypeAggregation = await WasteListing.aggregate([
      {
        $group: {
          _id: '$wasteType',
          totalQuantityTons: { $sum: '$quantity' },
          avgPrice: { $avg: '$expectedPrice' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalQuantityTons: -1 } },
    ]);

    // Aggregate buyer demand from BuyerProfiles
    const buyerDemandAggregation = await BuyerProfile.aggregate([
      { $unwind: '$wasteTypes' },
      {
        $group: {
          _id: '$wasteTypes',
          totalRequiredQuantity: { $sum: '$requiredQuantity' },
          avgOfferedPrice: { $avg: '$offeredPrice' },
          buyerCount: { $sum: 1 },
        },
      },
      { $sort: { totalRequiredQuantity: -1 } },
    ]);

    // 2. Reference / Demo Benchmark Indicators (clearly demarcated as sample reference)
    const referenceBenchmarks = [
      {
        wasteType: 'Paddy Straw',
        benchmarkPricePerTon: 2350,
        demandLevel: 'High',
        keyIndustries: ['Pellet Plants', 'Bio-CNG', 'Mushroom Farms'],
        moistureStandard: '< 15%',
      },
      {
        wasteType: 'Cotton Stalks',
        benchmarkPricePerTon: 2800,
        demandLevel: 'High',
        keyIndustries: ['Briquette Manufacturers', 'Thermal Power Co-firing'],
        moistureStandard: '< 12%',
      },
      {
        wasteType: 'Sugarcane Bagasse',
        benchmarkPricePerTon: 2450,
        demandLevel: 'Medium',
        keyIndustries: ['Paper Mills', 'Cogeneration Plants'],
        moistureStandard: '< 45%',
      },
      {
        wasteType: 'Wheat Straw',
        benchmarkPricePerTon: 2600,
        demandLevel: 'High',
        keyIndustries: ['Animal Feed', 'Pelletization'],
        moistureStandard: '< 14%',
      },
      {
        wasteType: 'Groundnut Shells',
        benchmarkPricePerTon: 3200,
        demandLevel: 'Very High',
        keyIndustries: ['Activated Carbon', 'High-caloric Boilers'],
        moistureStandard: '< 10%',
      },
    ];

    res.json({
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        disclaimer:
          'Platform metrics represent actual live listings and transactions in the FarmDhan database. Market benchmarks are provided as agricultural reference guides.',
      },
      livePlatformData: {
        totalListings,
        activeListings,
        totalRegisteredBuyers: totalBuyers,
        completedTransactions: totalTransactions,
        totalVolumeTons: wasteTypeAggregation.reduce((acc, c) => acc + (c.totalQuantityTons || 0), 0),
        wasteVolumeBreakdown: wasteTypeAggregation,
        buyerDemandBreakdown: buyerDemandAggregation,
      },
      regionalReferenceBenchmarks: referenceBenchmarks,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMarketInsights };

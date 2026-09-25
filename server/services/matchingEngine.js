const { calculateDistanceKm, formatDistance } = require('./distanceService');

// Configurable weights as defined in Section 10 of the FarmDhan Specification
const DEFAULT_WEIGHTS = {
  price: 0.50,         // 50%
  compatibility: 0.20, // 20%
  distance: 0.20,      // 20%
  quantity: 0.10,      // 10%
};

/**
 * Standardizes waste types for case-insensitive matching
 */
const normalizeType = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Check waste compatibility between farmer listing and buyer profile
 */
const checkCompatibility = (listingWasteType, buyerWasteTypes) => {
  if (!buyerWasteTypes || !Array.isArray(buyerWasteTypes)) return 0;

  const target = normalizeType(listingWasteType);
  for (const t of buyerWasteTypes) {
    const norm = normalizeType(t);
    if (norm === 'all' || norm === 'allbiomass' || norm === 'allresidues' || norm === target) {
      return 1.0;
    }
    // Partial inclusion (e.g., "paddy" in "paddystraw")
    if (norm.includes(target) || target.includes(norm)) {
      return 0.9;
    }
  }
  return 0.0;
};

/**
 * Calculate quantity match ratio
 */
const calculateQuantityMatch = (farmerQty, buyerReqQty) => {
  if (!farmerQty || !buyerReqQty) return 0.5;
  const f = Number(farmerQty);
  const b = Number(buyerReqQty);
  if (f <= 0 || b <= 0) return 0.5;

  // If farmer quantity satisfies or is close to buyer required quantity
  const ratio = Math.min(f, b) / Math.max(f, b);
  return Math.max(0.1, Math.min(1.0, ratio));
};

/**
 * Calculate distance score (closer is better)
 * 1.0 when distance is 0 km, decays towards 0 beyond serviceRadius
 */
const calculateDistanceScore = (distanceKm, serviceRadius = 50) => {
  const maxRange = Math.max(serviceRadius, 100);
  if (distanceKm <= 5) return 1.0;
  if (distanceKm >= maxRange) return 0.1;
  return Math.max(0.1, 1 - (distanceKm / maxRange));
};

/**
 * Calculate matching score using weighted algorithm
 * @param {Object} listing - WasteListing document
 * @param {Array} buyers - Array of BuyerProfile documents populated with User info
 * @param {Object} customWeights - Optional override for weights
 * @returns {Array} Recommended buyers ranked by matchScore
 */
const calculateBuyerMatches = (listing, buyers, customWeights = {}) => {
  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

  // Validate weights sum to ~1.0
  const totalWeight = weights.price + weights.compatibility + weights.distance + weights.quantity;
  const normWeights = {
    price: weights.price / totalWeight,
    compatibility: weights.compatibility / totalWeight,
    distance: weights.distance / totalWeight,
    quantity: weights.quantity / totalWeight,
  };

  const farmerLat = listing.location?.latitude || 17.3850;
  const farmerLon = listing.location?.longitude || 78.4867;

  // Find max offered price among buyers to normalize price score
  const validPrices = buyers
    .map((b) => Number(b.offeredPrice) || 0)
    .filter((p) => p > 0);
  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 3000;

  const rankedBuyers = buyers.map((buyer) => {
    // 1. Waste Compatibility (0 to 1)
    const compatibilityScore = checkCompatibility(listing.wasteType, buyer.wasteTypes);

    // 2. Distance in KM & Distance Score (0 to 1)
    const buyerLat = buyer.location?.latitude || farmerLat + 0.05;
    const buyerLon = buyer.location?.longitude || farmerLon + 0.05;
    const distanceKm = calculateDistanceKm(farmerLat, farmerLon, buyerLat, buyerLon);
    const distanceScore = calculateDistanceScore(distanceKm, buyer.serviceRadius || 50);

    // 3. Price Score (0 to 1)
    // Higher offered price gives higher score
    const offeredPrice = Number(buyer.offeredPrice) || 0;
    const priceScore = maxPrice > 0 ? Math.min(1.0, Math.max(0.1, offeredPrice / maxPrice)) : 0.5;

    // 4. Quantity Match Score (0 to 1)
    const quantityScore = calculateQuantityMatch(listing.quantity, buyer.requiredQuantity || 50);

    // Weighted Combined Score
    const compositeScore =
      normWeights.price * priceScore +
      normWeights.compatibility * compatibilityScore +
      normWeights.distance * distanceScore +
      normWeights.quantity * quantityScore;

    const matchScorePercent = Math.round(compositeScore * 100);

    return {
      buyerId: buyer.userId?._id || buyer.userId || buyer._id,
      buyerProfileId: buyer._id,
      buyerName: buyer.businessName || buyer.userId?.name || 'Authorized Buyer',
      businessType: buyer.businessType || 'Pellet / Biofuel Processor',
      rating: buyer.rating || 4.8,
      completedPurchases: buyer.completedPurchases || 12,
      offeredPrice,
      unit: buyer.unit || listing.unit || 'ton',
      distanceKm,
      distanceText: formatDistance(distanceKm),
      serviceRadius: buyer.serviceRadius || 50,
      requirements: buyer.requirements || 'Standard agricultural moisture < 15%',
      contactPhone: '', // Privacy: hidden until offer accepted
      matchScore: matchScorePercent,
      breakdown: {
        priceScore: Math.round(priceScore * 100),
        compatibilityScore: Math.round(compatibilityScore * 100),
        distanceScore: Math.round(distanceScore * 100),
        quantityScore: Math.round(quantityScore * 100),
      },
      weightsUsed: normWeights,
    };
  });

  // Filter out completely incompatible buyers (0% compatibility) unless no buyers match
  const filtered = rankedBuyers.filter((b) => b.breakdown.compatibilityScore > 0);
  const candidates = filtered.length > 0 ? filtered : rankedBuyers;

  // Sort primarily by matchScore in descending order
  candidates.sort((a, b) => b.matchScore - a.matchScore);

  return candidates;
};

/**
 * Sort buyer offers strictly in descending order of price
 * Section 12 Specification: Price-based descending sorting
 * buyers.sort((a, b) => b.price - a.price)
 */
const sortOffersByPriceDescending = (offersOrBuyers) => {
  return [...offersOrBuyers].sort((a, b) => {
    const priceA = Number(a.offeredPrice || a.price || 0);
    const priceB = Number(b.offeredPrice || b.price || 0);
    return priceB - priceA; // Descending price order: highest first
  });
};

module.exports = {
  DEFAULT_WEIGHTS,
  calculateBuyerMatches,
  sortOffersByPriceDescending,
};

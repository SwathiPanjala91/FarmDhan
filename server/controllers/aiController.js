const WasteListing = require('../models/WasteListing');
const { generateAdvice } = require('../services/geminiService');

// @desc    Process AI assistant question (Gemini API)
// @route   POST /api/ai/chat
// @access  Public / Private
const chatWithAI = async (req, res, next) => {
  try {
    const { message, history = [], language, listingContext } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid question in message parameter',
      });
    }

    const userLang = language || (req.user ? req.user.language : 'en');

    const isBuyer = (req.user && req.user.role === 'buyer') || req.body.role === 'buyer';

    // Retrieve contextual data based on authenticated role
    let userListings = [];
    let availableListings = [];
    let buyerOffers = [];
    let buyerProfile = null;

    if (isBuyer) {
      try {
        availableListings = await WasteListing.find({ status: 'active' })
          .populate('farmerId', 'name phone location')
          .select('wasteType quantity unit expectedPrice location status createdAt farmerId')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();

        if (req.user) {
          const BuyerOffer = require('../models/BuyerOffer');
          const BuyerProfile = require('../models/BuyerProfile');
          buyerOffers = await BuyerOffer.find({ buyerId: req.user._id })
            .populate('listingId', 'wasteType quantity unit expectedPrice')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();
          buyerProfile = await BuyerProfile.findOne({ userId: req.user._id }).lean();
        }
      } catch (err) {
        console.warn('Could not fetch buyer context listings/offers:', err.message);
      }
    } else if (req.user) {
      try {
        userListings = await WasteListing.find({
          farmerId: req.user._id,
          status: 'active',
        })
          .select('wasteType quantity unit expectedPrice location status createdAt')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();
      } catch (err) {
        console.warn('Could not fetch user listings for context:', err.message);
      }
    }

    // Build verified factual application context (no dummy/fake values allowed)
    const verifiedContext = {
      role: isBuyer ? 'buyer' : (req.user ? req.user.role : 'farmer'),
      user: req.user
        ? {
            name: req.user.name,
            role: req.user.role,
            phone: req.user.phone,
            district: req.user.location?.district,
            village: req.user.location?.village,
            state: req.user.location?.state,
          }
        : null,
      userListings,
      availableListings,
      buyerOffers,
      buyerProfile,
      listing: listingContext && listingContext.wasteType
        ? {
            wasteType: listingContext.wasteType,
            quantity: listingContext.quantity,
            unit: listingContext.unit || 'ton',
            expectedPrice: listingContext.expectedPrice,
          }
        : null,
    };

    const result = await generateAdvice(message, history, userLang, verifiedContext);

    res.json({
      success: true,
      reply: result.text,
      source: result.source,
      model: result.model,
      language: userLang,
      listingDraft: result.listingDraft || null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { chatWithAI };

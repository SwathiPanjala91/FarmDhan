const { GoogleGenAI } = require('@google/genai');

const SYSTEM_INSTRUCTION = `You are FarmDhan AI, an intelligent, empathetic, and knowledgeable agricultural advisor built for Indian farmers and Farmer Producer Organizations (FPOs).
Your goal is to help farmers turn agricultural waste and crop residues (paddy straw, wheat straw, sugarcane bagasse, cotton stalks, groundnut shells, maize stover, chili waste) into valuable economic income instead of burning them.

CRITICAL FACTUALITY & ANTI-HALLUCINATION RULES:
1. ABSOLUTE ZERO ASSUMPTION RULE: You must NEVER invent, assume, or fabricate specific values that the user did not explicitly provide or that are not present in verified application context.
   - Do NOT assume the user has "8.5 tons", "8 tons", "paddy straw", or any specific crop residue type, quantity, price, location, buyer, or listing unless explicitly stated by the user in the current question or verified context.
   - If the user asks general questions like "How do I sell waste?", "How can I find buyers?", "What buyers are available?", "How do I create a listing?", "How can I check my offers?", "I want to sell my agricultural waste", or "I need help with FarmDhan", provide helpful direct guidance for that question and do NOT invent or force crop details.
2. DISTINGUISH CONTEXT & PREVENT CARRYOVER:
   - Always answer the user's CURRENT question directly.
   - If the user asks an unrelated or general question (such as "How can I find buyers?"), do NOT drag in crop types, tonnages, or calculations from earlier questions.
   - User-provided information: Only facts explicitly provided in the current message or relevant follow-up context.
   - Verified current user application data: Provided strictly in the [VERIFIED APPLICATION CONTEXT] section.
   - Missing information: If necessary information is missing to provide a tailored quote or match, politely ask the user instead of guessing.
3. CONVERSATION MEMORY: Remember information explicitly stated earlier in the conversation only when the user is continuing the same topic (e.g., if user specified a crop in turn 1 and specifies quantity in turn 2). Never hallucinate initial values.
4. Support English, Telugu (తెలుగు), and Hindi (हिंदी). Respond in the language requested or used by the user.
5. Keep responses concise, warm, practical, and farmer-friendly. Avoid overly technical jargon.
6. DIRECT RELEVANCE: Process ONLY what the user actually types or speaks. Never assume a default crop question.`;

const BUYER_SYSTEM_INSTRUCTION = `You are FarmDhan Buyer AI, an intelligent procurement and sourcing advisor built for industrial biomass buyers, bio-energy plants, bio-pellet manufacturers, paper mills, and bio-CNG facilities in India.
Your goal is to help buyers find, evaluate, and procure agricultural residues (paddy straw, cotton stalks, maize stover, sugarcane bagasse, groundnut shells, chili waste) directly from farmers and FPOs.

CRITICAL FACTUALITY & SOURCING RULES:
1. ONLY USE REAL DATA: Ground your responses strictly in the live available listings provided in [VERIFIED APPLICATION CONTEXT]. Never invent fake sellers, phone numbers, or imaginary listings.
2. If real listings exist in the user's requested region or for their requested residue (e.g. Karimnagar, Paddy Straw), present the real seller, location, quantity, and price accurately.
3. If no matching listings exist in that district or crop residue, state clearly that no active listings currently match that criteria on FarmDhan, and suggest checking nearby districts or browsing the live market.
4. Support English, Telugu (తెలుగు), and Hindi (हिंदी). Respond in the language requested or used by the user.
5. Keep responses direct, commercial, concise, and helpful for procurement decisions.`;

let aiClient = null;

const getClient = () => {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
};

// Benchmark rate dictionary for regional crop residues in Telangana & AP
const CROP_RATES = {
  'Paddy Straw': { min: 1800, max: 2600, unit: 'ton', te: 'వరి గడ్డి', hi: 'धान की पराली' },
  'Cotton Residue': { min: 2200, max: 3200, unit: 'ton', te: 'పత్తి కట్టెలు', hi: 'कपास के डंठल' },
  'Maize Residue': { min: 1600, max: 2400, unit: 'ton', te: 'మొక్కజొన్న వ్యర్థాలు', hi: 'मक्का अवशेष' },
  'Sugarcane Bagasse': { min: 2000, max: 2800, unit: 'ton', te: 'చెరకు పిప్పి', hi: 'गन्ने की खोई' },
  'Groundnut Shells': { min: 2500, max: 3500, unit: 'ton', te: 'వేరుశనగ పొట్టు', hi: 'मूंगफली के छिलके' },
  'Wheat Straw': { min: 2000, max: 2800, unit: 'ton', te: 'గోధుమ గడ్డి', hi: 'गेहूं का भूसा' },
  'Chili Waste': { min: 1500, max: 2200, unit: 'ton', te: 'మిర్చి వ్యర్థాలు', hi: 'मिर्च के अवशेष' },
};

/**
 * Extract factual agricultural parameters explicitly stated in text
 */
function extractFactsFromText(text) {
  if (!text || typeof text !== 'string') return {};
  const t = text.toLowerCase();
  const facts = {};

  // Crop detection
  if (t.includes('paddy') || t.includes('వరి గడ్డి') || (t.includes('వరి') && !t.includes('వివరి')) || t.includes('पराली') || t.includes('धान')) {
    facts.wasteType = 'Paddy Straw';
  } else if (t.includes('cotton') || t.includes('పత్తి') || t.includes('कपास')) {
    facts.wasteType = 'Cotton Residue';
  } else if (t.includes('maize') || t.includes('corn') || t.includes('మొక్కజొన్న') || t.includes('मक्का')) {
    facts.wasteType = 'Maize Residue';
  } else if (t.includes('sugarcane') || t.includes('bagasse') || t.includes('చెరకు') || t.includes('खोई') || t.includes('गन्ना')) {
    facts.wasteType = 'Sugarcane Bagasse';
  } else if (t.includes('groundnut') || t.includes('వేరుశనగ') || t.includes('मूंगफली')) {
    facts.wasteType = 'Groundnut Shells';
  } else if (t.includes('wheat') || t.includes('గోధుమ') || t.includes('भूसा') || t.includes('गेहूं')) {
    facts.wasteType = 'Wheat Straw';
  } else if (t.includes('chili') || t.includes('chilli') || t.includes('మిర్చి') || t.includes('मिर्च')) {
    facts.wasteType = 'Chili Waste';
  }

  // Quantity detection: e.g. "8.5 ton", "8.5 tons", "8.5t", "10 tonnes", "5 quintals", "8 టన్నులు", "10 टन"
  const qtyMatch =
    t.match(/\b(\d+(?:\.\d+)?)\s*(tons?|tonnes?|t|quintals?|q|acres?|ac|టన్నులు?|టన్ను|క్వింటాలు|క్వింటాళ్ళు|टन|क्विंटल|एकड़)\b/i) ||
    t.match(/(?:quantity|పరిమాణం|మాత్ర|have|దగ్గర|పాస్)\s*(?:is|of|ఉంది|హై)?\s*(\d+(?:\.\d+)?)\s*(tons?|t|టన్నులు|टन)?/i);

  if (qtyMatch) {
    facts.quantity = parseFloat(qtyMatch[1]);
    const unitRaw = (qtyMatch[2] || 'ton').toLowerCase();
    if (unitRaw.includes('quintal') || unitRaw.includes('క్వింటా') || unitRaw.includes('क्विंटल') || unitRaw === 'q') {
      facts.unit = 'quintal';
    } else if (unitRaw.includes('acre') || unitRaw.includes('ఎకర') || unitRaw.includes('एकड़') || unitRaw === 'ac') {
      facts.unit = 'acre';
    } else if (unitRaw.includes('kg') || unitRaw.includes('కిలో') || unitRaw.includes('किग्रा')) {
      facts.unit = 'kg';
    } else {
      facts.unit = 'ton';
    }
  }

  // Location detection: Regional districts & towns in Telangana / Andhra Pradesh
  const locMatch = t.match(/\b(warangal|hanamkonda|karimnagar|nalgonda|khammam|nizamabad|mahabubnagar|medak|rangareddy|hyderabad|adilabad|guntur|krishna|kurnool|anantapur|chittoor|kadapa|nellore|suryapet|siddipet|jangaon|yadadri|vikarabad|kamareddy|nirmal|mancherial|jagtial|peddapalli|mulugu|వరంగల్|హనుమకొండ|కరీంనగర్|నల్గొండ|ఖమ్మం|గుంటూరు|वारंगल|करीमनगर|नलगोंडा|खम्मम)\b/i);
  if (locMatch) {
    const rawLoc = locMatch[1];
    facts.location = rawLoc.charAt(0).toUpperCase() + rawLoc.slice(1);
  }

  // Expected price detection: e.g. "₹2200", "2200 per ton", "ధర 2000"
  const priceMatch =
    t.match(/(?:₹|rs\.?|inr|ధర|రేటు|rate|price|भाव|दाम)\s*(?:is|of|ఉంది|హై|:)?\s*(\d{3,5})/i) ||
    t.match(/(\d{3,5})\s*(?:₹|rs\.?|per ton|\/ton|\/టన్ను|టన్నుకు|రూపాయలు|रुपये)/i);
  if (priceMatch) {
    facts.expectedPrice = parseInt(priceMatch[1], 10);
  }

  // Listing intent detection
  if (
    t.includes('list') ||
    t.includes('sell') ||
    t.includes('post') ||
    t.includes('లిస్ట్') ||
    t.includes('నమోదు') ||
    t.includes('అమ్మాలి') ||
    t.includes('విక్రయించ') ||
    t.includes('बेचना') ||
    t.includes('बेचें') ||
    t.includes('लिस्ट')
  ) {
    facts.isListingIntent = true;
  }

  return facts;
}

/**
 * Scan multi-turn history to accumulate facts explicitly provided in previous turns
 */
function extractConversationMemory(history = []) {
  const memory = {};
  if (!Array.isArray(history)) return memory;

  for (const item of history) {
    // Only extract facts from user turns to avoid remembering hallucinated assistant defaults
    if (item.role === 'user' || item.sender === 'user') {
      const text = item.content || item.text || (typeof item === 'string' ? item : '');
      const facts = extractFactsFromText(text);
      if (facts.wasteType && !memory.wasteType) memory.wasteType = facts.wasteType;
      if (facts.quantity !== undefined && memory.quantity === undefined) {
        memory.quantity = facts.quantity;
        memory.unit = facts.unit || 'ton';
      }
      if (facts.location && !memory.location) memory.location = facts.location;
      if (facts.expectedPrice !== undefined && memory.expectedPrice === undefined) memory.expectedPrice = facts.expectedPrice;
      if (facts.isListingIntent) memory.isListingIntent = true;
    }
  }
  return memory;
}

/**
 * Buyer-specific fallback response generator grounded strictly in live database listings
 */
function getBuyerFallbackAdvice(userMessage, history = [], language = 'en', verifiedContext = {}) {
  const rawMsg = (userMessage || '').trim();
  const msg = rawMsg.toLowerCase();

  const isTe = language === 'te' || /[\u0C00-\u0C7F]/.test(rawMsg);
  const isHi = language === 'hi' || /[\u0900-\u097F]/.test(rawMsg);

  const availableListings = verifiedContext?.availableListings || [];
  const buyerOffers = verifiedContext?.buyerOffers || [];
  const currentFacts = extractFactsFromText(rawMsg);

  // Check location query
  const locationMentioned = currentFacts.location || null;

  // Check residue query
  const wasteType = currentFacts.wasteType || null;
  const quantity = currentFacts.quantity !== undefined ? currentFacts.quantity : null;
  const unit = currentFacts.unit || 'ton';

  // 1. Location-specific search (e.g. "Show me sellers near Karimnagar")
  if (locationMentioned) {
    const locLower = locationMentioned.toLowerCase();
    const matching = availableListings.filter((l) => {
      const dist = (l.location?.district || '').toLowerCase();
      const vill = (l.location?.village || '').toLowerCase();
      return dist.includes(locLower) || vill.includes(locLower);
    });

    if (matching.length > 0) {
      if (isTe) {
        const listItems = matching
          .map((l, i) => {
            const sellerName = l.farmerId?.name || 'ధృవీకరించబడిన విక్రేత';
            const locStr = [l.location?.village, l.location?.district].filter(Boolean).join(', ') || locationMentioned;
            return `${i + 1}. **${l.wasteType}** - ${sellerName}\n   పరిమాణం: ${l.quantity} ${l.unit === 'ton' ? 'టన్నులు' : l.unit} | ధర: ₹${l.expectedPrice || 'చర్చించదగినది'}/${l.unit}\n   స్థానం: 📍 ${locStr}`;
          })
          .join('\n\n');
        return `${locationMentioned} మరియు సమీపంలో అందుబాటులో ఉన్న విక్రేతలు & లిస్టింగ్‌లు:\n\n${listItems}\n\nఆఫర్ పంపడానికి బ్రౌజ్ లిస్టింగ్స్ విభాగంలో 'ఆఫర్ చేయండి' నొక్కండి.`;
      }
      if (isHi) {
        const listItems = matching
          .map((l, i) => {
            const sellerName = l.farmerId?.name || 'सत्यापित विक्रेता';
            const locStr = [l.location?.village, l.location?.district].filter(Boolean).join(', ') || locationMentioned;
            return `${i + 1}. **${l.wasteType}** - ${sellerName}\n   मात्रा: ${l.quantity} ${l.unit === 'ton' ? 'टन' : l.unit} | मूल्य: ₹${l.expectedPrice || 'परक्राम्य'}/${l.unit}\n   स्थान: 📍 ${locStr}`;
          })
          .join('\n\n');
        return `${locationMentioned} और उसके आसपास उपलब्ध विक्रेता और लिस्टिंग:\n\n${listItems}\n\nबोली लगाने के लिए 'ब्राउज़ लिस्टिंग' टैब में 'ऑफ़र दें' पर टैप करें।`;
      }
      const listItems = matching
        .map((l, i) => {
          const sellerName = l.farmerId?.name || 'Verified Seller';
          const locStr = [l.location?.village, l.location?.district].filter(Boolean).join(', ') || locationMentioned;
          return `${i + 1}. **${l.wasteType}** - ${sellerName}\n   Quantity: ${l.quantity} ${l.unit} | Price: ₹${l.expectedPrice || 'Negotiable'}/${l.unit}\n   Location: 📍 ${locStr}`;
        })
        .join('\n\n');
      return `Available sellers and listings in/near ${locationMentioned}:\n\n${listItems}\n\nTo place a purchase offer, tap "Make Offer" in the Browse Listings tab.`;
    } else {
      if (isTe) {
        return `ప్రస్తుతం ${locationMentioned}లో ప్రత్యక్ష లిస్టింగ్‌లు ఏవీ లేవు. అయితే, మీరు 'లిస్టింగ్‌లను బ్రౌజ్ చేయండి' ట్యాబ్‌లో ఇతర సమీప జిల్లాల విక్రేతలను చూడవచ్చు లేదా మీకు కావాల్సిన పరిమాణాన్ని తెలియజేయవచ్చు.`;
      }
      if (isHi) {
        return `वर्तमान में ${locationMentioned} में कोई सक्रिय लिस्टिंग उपलब्ध नहीं है। आप 'ब्राउज़ लिस्टिंग' टैब में अन्य नजदीकी जिलों के विक्रेताओं को देख सकते हैं।`;
      }
      return `Currently, there are no active listings directly in ${locationMentioned}. However, you can check the Browse tab for listings from nearby districts or tell me the crop residue you require.`;
    }
  }

  // 2. Buyer says "I need X tonnes of crop" (e.g. "I need 5 tonnes of paddy straw")
  if (wasteType) {
    const matching = availableListings.filter((l) => (l.wasteType || '').toLowerCase() === wasteType.toLowerCase());
    const rateInfo = CROP_RATES[wasteType] || CROP_RATES['Paddy Straw'];

    if (matching.length > 0) {
      if (isTe) {
        const listItems = matching
          .map((l, i) => {
            const sellerName = l.farmerId?.name || 'విక్రేత';
            const locStr = [l.location?.village, l.location?.district].filter(Boolean).join(', ') || 'స్థానం పేర్కొనలేదు';
            return `${i + 1}. ${sellerName}: ${l.quantity} ${l.unit === 'ton' ? 'టన్నులు' : l.unit} @ ₹${l.expectedPrice || 'చర్చించదగినది'}/${l.unit} (📍 ${locStr})`;
          })
          .join('\n');
        const qtyMsg = quantity
          ? `మీకు అవసరమైన ${quantity} ${unit === 'ton' ? 'టన్నుల' : unit} ${wasteType} కోసం మార్కెట్లో ఉన్న సరఫరా:\n\n${listItems}`
          : `అందుబాటులో ఉన్న ${wasteType} సరఫరా:\n\n${listItems}`;
        return `${qtyMsg}\n\nధర బెంచ్‌మార్క్: టన్నుకు ₹${rateInfo.min.toLocaleString('en-IN')} - ₹${rateInfo.max.toLocaleString('en-IN')}.\nబ్రౌజ్ స్క్రీన్‌లో 'ఆఫర్ చేయండి' ద్వారా మీరు నేరుగా కొనుగోలు ఆఫర్ పంపవచ్చు.`;
      }
      if (isHi) {
        const listItems = matching
          .map((l, i) => {
            const sellerName = l.farmerId?.name || 'विक्रेता';
            const locStr = [l.location?.village, l.location?.district].filter(Boolean).join(', ') || 'स्थान उपलब्ध नहीं';
            return `${i + 1}. ${sellerName}: ${l.quantity} ${l.unit === 'ton' ? 'टन' : l.unit} @ ₹${l.expectedPrice || 'परक्राम्य'}/${l.unit} (📍 ${locStr})`;
          })
          .join('\n');
        const qtyMsg = quantity
          ? `आपके द्वारा मांगे गए ${quantity} ${unit === 'ton' ? 'टन' : unit} ${wasteType} के लिए उपलब्ध आपूर्ति:\n\n${listItems}`
          : `उपलब्ध ${wasteType} आपूर्ति:\n\n${listItems}`;
        return `${qtyMsg}\n\nबाजार बेंचमार्क: ₹${rateInfo.min.toLocaleString('en-IN')} - ₹${rateInfo.max.toLocaleString('en-IN')} / टन।\nऑफ़र भेजने के लिए 'ब्राउज़' में जाकर 'ऑफ़र दें' चुनें।`;
      }
      const listItems = matching
        .map((l, i) => {
          const sellerName = l.farmerId?.name || 'Seller';
          const locStr = [l.location?.village, l.location?.district].filter(Boolean).join(', ') || 'Location not provided';
          return `${i + 1}. ${sellerName}: ${l.quantity} ${l.unit} @ ₹${l.expectedPrice || 'Negotiable'}/${l.unit} (📍 ${locStr})`;
        })
        .join('\n');
      const qtyMsg = quantity
        ? `For your requirement of ${quantity} ${unit} of ${wasteType}, here is active supply on FarmDhan:\n\n${listItems}`
        : `Available ${wasteType} supply on FarmDhan:\n\n${listItems}`;
      return `${qtyMsg}\n\nMarket benchmark: ₹${rateInfo.min.toLocaleString('en-IN')} - ₹${rateInfo.max.toLocaleString('en-IN')} / ton.\nTap "Browse" and click "Make Offer" to negotiate or lock in purchase!`;
    } else {
      if (isTe) {
        return `ప్రస్తుతం ${wasteType}కు సంబంధించిన క్రియాశీల లిస్టింగ్‌లు లేవు. దీని ప్రాంతీయ మార్కెట్ బెంచ్‌మార్క్ ధర టన్నుకు ₹${rateInfo.min.toLocaleString('en-IN')} - ₹${rateInfo.max.toLocaleString('en-IN')}. రైతులు కొత్త బ్యాచ్ నమోదు చేసిన వెంటనే మీకు బ్రౌజ్ స్క్రీన్‌లో కనిపిస్తుంది.`;
      }
      if (isHi) {
        return `वर्तमान में ${wasteType} के लिए कोई सक्रिय लिस्टिंग उपलब्ध नहीं है। इसका क्षेत्रीय बेंचमार्क मूल्य ₹${rateInfo.min.toLocaleString('en-IN')} - ₹${rateInfo.max.toLocaleString('en-IN')} प्रति टन है। किसानों द्वारा नई लिस्टिंग पोस्ट करते ही यह उपलब्ध होगा।`;
      }
      return `Currently, there are no active listings for ${wasteType}. The regional benchmark rate is ₹${rateInfo.min.toLocaleString('en-IN')} - ₹${rateInfo.max.toLocaleString('en-IN')} per ton. As soon as farmers or sellers list new batches, they will appear in Browse.`;
    }
  }

  // 3. User asks: "What listings are available?", "What sellers are available?", "Show listings"
  const isAvailableQuery =
    msg.includes('available') ||
    msg.includes('listing') ||
    msg.includes('seller') ||
    msg.includes('browse') ||
    msg.includes('మార్కెట్') ||
    msg.includes('విక్రేత') ||
    msg.includes('లిస్టింగ్') ||
    msg.includes('उपलब्ध') ||
    msg.includes('विक्रेता');

  if (isAvailableQuery && availableListings.length > 0) {
    if (isTe) {
      const items = availableListings
        .slice(0, 5)
        .map((l, i) => {
          const sellerName = l.farmerId?.name || 'రైతు/విక్రేత';
          const locStr = [l.location?.village, l.location?.district].filter(Boolean).join(', ') || 'తెలంగాణ';
          return `${i + 1}. **${l.wasteType}** (${l.quantity} ${l.unit === 'ton' ? 'టన్నులు' : l.unit}) - ₹${l.expectedPrice || 'చర్చించదగినది'}/${l.unit}\n   విక్రేత: ${sellerName} | 📍 ${locStr}`;
        })
        .join('\n\n');
      return `ప్రస్తుతం FarmDhan మార్కెట్లో అందుబాటులో ఉన్న పంట వ్యర్థాలు:\n\n${items}\n\nమరిన్ని వివరాలు చూడటానికి మరియు కొనుగోలు ఆఫర్ ఇవ్వడానికి 'బ్రౌజ్ లిస్టింగ్స్' ట్యాబ్ ఉపయోగించండి.`;
    }
    if (isHi) {
      const items = availableListings
        .slice(0, 5)
        .map((l, i) => {
          const sellerName = l.farmerId?.name || 'किसान/विक्रेता';
          const locStr = [l.location?.village, l.location?.district].filter(Boolean).join(', ') || 'स्थान';
          return `${i + 1}. **${l.wasteType}** (${l.quantity} ${l.unit === 'ton' ? 'टन' : l.unit}) - ₹${l.expectedPrice || 'परक्राम्य'}/${l.unit}\n   विक्रेता: ${sellerName} | 📍 ${locStr}`;
        })
        .join('\n\n');
      return `FarmDhan पर वर्तमान में उपलब्ध फसल अवशेष लिस्टिंग:\n\n${items}\n\nसभी लिस्टिंग देखने और खरीद ऑफ़र भेजने के लिए 'ब्राउज़ लिस्टिंग' पर जाएं।`;
    }
    const items = availableListings
      .slice(0, 5)
      .map((l, i) => {
        const sellerName = l.farmerId?.name || 'Verified Seller';
        const locStr = [l.location?.village, l.location?.district].filter(Boolean).join(', ') || 'Location not provided';
        return `${i + 1}. **${l.wasteType}** (${l.quantity} ${l.unit}) - ₹${l.expectedPrice || 'Negotiable'}/${l.unit}\n   Seller: ${sellerName} | 📍 ${locStr}`;
      })
      .join('\n\n');
    return `Currently active crop residue listings on FarmDhan:\n\n${items}\n\nTap "Browse Listings" to view complete details, inspect moisture/quality, or submit an offer!`;
  }

  // 4. Offers check
  const isOffersQuery = msg.includes('offer') || msg.includes('bid') || msg.includes('ఆఫర్') || msg.includes('ऑफर');
  if (isOffersQuery) {
    if (buyerOffers.length > 0) {
      if (isTe) {
        const items = buyerOffers
          .map(
            (o, i) =>
              `${i + 1}. ${o.listingId?.wasteType || 'వ్యర్థం'}: ఆఫర్ ₹${o.offeredPrice}/టన్ను (${o.status === 'accepted' ? 'ఆమోదించబడింది' : o.status === 'rejected' ? 'తిరస్కరించబడింది' : 'పెండింగ్'})`
          )
          .join('\n');
        return `మీ తాజా కొనుగోలు ఆఫర్లు:\n${items}\n\nపూర్తి వివరాల కోసం 'నా ఆఫర్లు' స్క్రీన్‌ను పరిశీలించండి.`;
      }
      if (isHi) {
        const items = buyerOffers
          .map(
            (o, i) =>
              `${i + 1}. ${o.listingId?.wasteType || 'अवशेष'}: बोली ₹${o.offeredPrice}/टन (${o.status === 'accepted' ? 'स्वीकृत' : o.status === 'rejected' ? 'अस्वीकृत' : 'लंबित'})`
          )
          .join('\n');
        return `आपके हालिया खरीद ऑफ़र:\n${items}\n\nविवरण देखने के लिए 'मेरे ऑफ़र' स्क्रीन पर जाएं।`;
      }
      const items = buyerOffers
        .map(
          (o, i) =>
            `${i + 1}. ${o.listingId?.wasteType || 'Residue'}: ₹${o.offeredPrice}/${o.listingId?.unit || 'ton'} (${o.status.toUpperCase()})`
        )
        .join('\n');
      return `Your submitted purchase offers:\n${items}\n\nCheck the "My Offers" tab to track seller responses and view contact details for accepted deals.`;
    } else {
      if (isTe) return `మీరు ఇంకా ఎటువంటి కొనుగోలు ఆఫర్లు పంపలేదు. 'బ్రౌజ్ లిస్టింగ్స్' ద్వారా సరైన లిస్టింగ్‌ను ఎంచుకుని ఆఫర్ చేయండి.`;
      if (isHi) return `आपने अभी तक कोई खरीद ऑफ़र नहीं भेजा है। 'ब्राउज़ लिस्टिंग' पर जाकर उपलब्ध स्टॉक पर बोली लगाएं।`;
      return `You haven't submitted any purchase offers yet. Go to "Browse Listings" to review active crop residues and submit your first offer!`;
    }
  }

  // 5. Default Neutral Buyer Greeting / Procurement Assistance
  if (isTe) {
    return `నమస్కారం! నేను మీ FarmDhan కొనుగోలు AI సహాయకుడిని. బయోమాస్, పెల్లెట్ మరియు బయో-ఎనర్జీ అవసరాల కోసం నాణ్యమైన పంట వ్యర్థాలను రైతుల నుండి నేరుగా సేకరించడంలో నేను మీకు సహాయం చేస్తాను.\n\nనేను వీటిని చేయగలను:\n• నిర్దిష్ట జిల్లాలలో (ఉదా. కరీంనగర్, వరంగల్) విక్రేతలను కనుగొనడం\n• వరి గడ్డి, పత్తి కట్టెలు మొదలైన పంటల లభ్యతను తనిఖీ చేయడం\n• ప్రస్తుత మార్కెట్ సేకరణ ధరలను పోల్చడం\n• మీ కొనుగోలు ఆఫర్లను ట్రాక్ చేయడం\n\nమీకు ఏ పంట వ్యర్థం లేదా ఏ ప్రాంతం విక్రేతలు కావాలి?`;
  }
  if (isHi) {
    return `नमस्ते! मैं आपका FarmDhan Buyer AI सहायक हूँ। बायोमास, बायो-सीएनजी और उद्योगों के लिए सीधे किसानों और FPO से उच्च गुणवत्ता वाले फसल अवशेष खरीदने में मैं आपकी मदद करता हूँ।\n\nमैं आपकी सहायता कर सकता हूँ:\n• विशिष्ट जिलों (जैसे करीमनगर, वारंगल) में विक्रेताओं को खोजना\n• धान की पराली, कपास अवशेष आदि की उपलब्धता की जांच करना\n• मौजूदा बाजार खरीद दरों की तुलना करना\n• आपके खरीद ऑफ़र को ट्रैक करना\n\nआपको किस फसल अवशेष या किस क्षेत्र के विक्रेताओं की तलाश है?`;
  }
  return `Welcome to FarmDhan Buyer Procurement AI! I help industrial buyers, bio-energy plants, and recyclers source agricultural residue directly from verified farmers and FPOs.\n\nI can assist you with:\n• Finding sellers in specific districts (e.g. "Show me sellers near Karimnagar")\n• Checking active supply (e.g. "I need 5 tonnes of paddy straw")\n• Reviewing procurement rates and price benchmarks\n• Tracking your purchase offers and negotiating with farmers\n\nWhat residue type or location are you sourcing today?`;
}

/**
 * Fallback response generator when GEMINI_API_KEY is not configured or in case of network failover
 */
const getFallbackAdvice = (userMessage, history = [], language = 'en', verifiedContext = {}) => {
  if (verifiedContext?.role === 'buyer') {
    return getBuyerFallbackAdvice(userMessage, history, language, verifiedContext);
  }

  const rawMsg = (userMessage || '').trim();
  const msg = rawMsg.toLowerCase();

  // Check user language
  const isTe = language === 'te' || /[\u0C00-\u0C7F]/.test(rawMsg);
  const isHi = language === 'hi' || /[\u0900-\u097F]/.test(rawMsg);

  // 1. Gather all factual context strictly from verified context, memory, and current message
  const verifiedListing = verifiedContext?.listing || null;
  const memory = extractConversationMemory(history);
  const currentFacts = extractFactsFromText(rawMsg);

  // Intent 0: User asks to see their listings ("Show my listings", "నా లిస్టింగ్స్", "मेरी लिस्टिंग")
  const isMyListingsQuery =
    msg.includes('my listings') ||
    msg.includes('my listing') ||
    msg.includes('show my listings') ||
    msg.includes('నా లిస్టింగ్') ||
    msg.includes('నా లిస్టింగ్‌లు') ||
    msg.includes('मेरी लिस्टिंग') ||
    msg.includes('मेरी लिस्टिंग्स');

  if (isMyListingsQuery) {
    const userListings = verifiedContext?.userListings || [];
    if (userListings.length > 0) {
      if (isTe) {
        const items = userListings
          .map(
            (l, i) =>
              `${i + 1}. ${l.wasteType}: ${l.quantity} ${l.unit === 'ton' ? 'టన్నులు' : l.unit}${l.location?.district ? ` (${l.location.district})` : ''} - ₹${l.expectedPrice || 0}/టన్ను`
          )
          .join('\n');
        return `మీ క్రియాశీల లిస్టింగ్‌లు:\n${items}\n\nకొనుగోలుదారుల ఆఫర్లను చూడటానికి డ్యాష్‌బోర్డ్‌లో 'నా ఆఫర్లు' నొక్కండి.`;
      }
      if (isHi) {
        const items = userListings
          .map(
            (l, i) =>
              `${i + 1}. ${l.wasteType}: ${l.quantity} ${l.unit === 'ton' ? 'टन' : l.unit}${l.location?.district ? ` (${l.location.district})` : ''} - ₹${l.expectedPrice || 0}/टन`
          )
          .join('\n');
        return `आपकी सक्रिय लिस्टिंग:\n${items}\n\nखरीदारों की बोलियां देखने के लिए डैशबोर्ड पर 'मेरे ऑफ़र' पर जाएं।`;
      }
      const items = userListings
        .map(
          (l, i) =>
            `${i + 1}. ${l.wasteType}: ${l.quantity} ${l.unit}${l.location?.district ? ` (${l.location.district})` : ''} - ₹${l.expectedPrice || 0}/${l.unit}`
        )
        .join('\n');
      return `Your active listings:\n${items}\n\nTo view buyer offers, tap "My Offers" or "Compare Prices" on your Dashboard.`;
    } else {
      if (isTe) {
        return `మీ వద్ద ప్రస్తుతం క్రియాశీల లిస్టింగ్‌లు ఏవీ లేవు. కొత్త లిస్టింగ్ సృష్టించడానికి 'వ్యర్థాలను లిస్ట్ చేయండి' నొక్కండి లేదా మీ పంట వివరాలను ఇక్కడ చెప్పండి.`;
      }
      if (isHi) {
        return `आपके पास वर्तमान में कोई सक्रिय लिस्टिंग नहीं है। नई लिस्टिंग बनाने के लिए 'कचरा लिस्ट करें' पर टैप करें या यहाँ फसल विवरण बताएं।`;
      }
      return `You do not have any active listings right now. Tap "List Waste" on your Dashboard or tell me what crop residue you have to create one!`;
    }
  }

  // Intent A: How to find buyers / What buyers are available?
  const isBuyerQuery =
    msg.includes('buyer') ||
    msg.includes('buyers') ||
    msg.includes('కొనుగోలు') ||
    msg.includes('కొనుగోలుదారు') ||
    msg.includes('खरीदार') ||
    msg.includes('who buys') ||
    msg.includes('available buyers') ||
    msg.includes('find buyer') ||
    msg.includes('find buyers');

  if (isBuyerQuery) {
    if (isTe) {
      return `ఫామ్‌ధన్ బయో-ఎనర్జీ ప్లాంట్లు, పెల్లెట్ యూనిట్లు, పేపర్ మిల్లులు మరియు బయో-సిఎన్‌జి రిఫైనరీల వంటి గుర్తింపు పొందిన పరిశ్రమలతో మిమ్మల్ని నేరుగా కలుపుతుంది.\n\nకొనుగోలుదారులను చూడటానికి:\n1. 'వ్యర్థాలను లిస్ట్ చేయండి' ద్వారా మీ పంటను నమోదు చేస్తే, అత్యధిక ధర ఇచ్చే సమీప కొనుగోలుదారులు ర్యాంక్ చేయబడతారు.\n2. లేదా డ్యాష్‌బోర్డ్‌లో 'సమీప కొనుగోలుదారులు' విభాగంలో మీ జిల్లాలోని పరిశ్రమలను పరిశీలించవచ్చు.\n\nమీ వద్ద ఏ పంట వ్యర్థం ఉంది, మరియు మీ పొలం ఏ జిల్లాలో ఉంది?`;
    }
    if (isHi) {
      return `फार्मधन आपको बायोमास बिजली संयंत्रों, पेलेट इकाइयों, पेपर मिलों और बायो-सीएनजी संयंत्रों जैसे प्रमाणित खरीदारों से सीधे जोड़ता है।\n\nखरीदार खोजने के लिए:\n1. 'कचरा लिस्ट करें' पर जाकर अपनी फसल दर्ज करें, हमारा सिस्टम उच्चतम मूल्य वाले खरीदारों को रैंक करेगा।\n2. या डैशबोर्ड पर 'नजदीकी खरीदार' विकल्प से अपने जिले के उद्योगों को देखें।\n\nआपके पास कौन सा फसल अवशेष है और आपका खेत किस जिले में है?`;
    }
    return `FarmDhan connects you directly with verified industrial buyers including biomass power plants, bio-pellet manufacturers, paper mills, and bio-CNG refineries.\n\nTo find buyers:\n1. Tap "List Waste" on your Dashboard to post your crop details—our matching engine will rank buyers by highest price and closest distance.\n2. Or tap "Nearby Buyers" to explore industrial plants operating in your district.\n\nWhat type of agricultural waste do you have, and in which district is your farm located?`;
  }

  // Intent B: How to create a listing / How to list waste
  const isListingQuery =
    msg.includes('create a listing') ||
    msg.includes('create listing') ||
    msg.includes('how to list') ||
    msg.includes('waste listing') ||
    msg.includes('post waste') ||
    msg.includes('లిస్టింగ్') ||
    msg.includes('నమోదు') ||
    msg.includes('లిస్ట్') ||
    msg.includes('लिस्टिंग');

  if (isListingQuery) {
    if (isTe) {
      return `ఫామ్‌ధన్‌లో లిస్టింగ్ చేసే విధానం:\n1. డ్యాష్‌బోర్డ్‌లో 'వ్యర్థాలను లిస్ట్ చేయండి' నొక్కండి.\n2. పంట వ్యర్థం రకాన్ని ఎంచుకోండి.\n3. పరిమాణాన్ని టన్నులు లేదా క్వింటాళ్లలో నమోదు చేయండి.\n4. ఆశించిన ధరను నిర్ణయించండి (లేదా కొనుగోలుదారుల ఆఫర్ల కోసం ఖాళీగా ఉంచండి).\n5. మీ పొలం స్థానం ధృవీకరించి, ఫోటో జోడించండి.\n6. సమర్పించండి! కొనుగోలుదారులు వెంటనే మీ లిస్టింగ్‌ను చూసి బిడ్లు పంపగలరు.`;
    }
    if (isHi) {
      return `फार्मधन पर लिस्टिंग बनाने के चरण:\n1. डैशबोर्ड पर 'कचरा लिस्ट करें' पर टैप करें।\n2. फसल अवशेष का प्रकार चुनें।\n3. मात्रा दर्ज करें (टन या क्विंटल में)।\n4. अपेक्षित मूल्य प्रति टन दर्ज करें (या खुली बोली के लिए खाली छोड़ें)।\n5. अपने खेत का स्थान पुष्टि करें और फोटो जोड़ें।\n6. सबमिट करें! खरीदार तुरंत आपकी लिस्टिंग देख सकेंगे।`;
    }
    return `To create a listing on FarmDhan:\n1. Tap "List Waste" on your Dashboard.\n2. Select your crop residue type.\n3. Enter your quantity in tons or quintals.\n4. Set your expected price per ton (or leave it blank for competitive bids).\n5. Confirm your farm location and attach a farm photo.\n6. Review and submit!\nOnce submitted, verified regional buyers will see your listing and you can compare their offers in descending price order.`;
  }

  // Intent C: Offers / Bids
  const isOffersQuery =
    msg.includes('check my offers') ||
    msg.includes('my offers') ||
    msg.includes('check offers') ||
    msg.includes('buyer offers') ||
    msg.includes('ఆఫర్') ||
    msg.includes('ఆఫర్లు') ||
    msg.includes('బిడ్') ||
    msg.includes('బోలి') ||
    msg.includes('ओफ़र') ||
    msg.includes('ऑफर');

  if (isOffersQuery) {
    if (isTe) {
      return `మీ లిస్టింగ్‌లపై వచ్చిన కొనుగోలుదారుల ఆఫర్లను చూడటానికి:\n1. డ్యాష్‌బోర్డ్‌లో 'ధరల పోలిక' లేదా 'నా లిస్టింగ్‌లు' నొక్కండి.\n2. అక్కడ కొనుగోలుదారుల ఆఫర్లు అత్యధిక ధర నుండి క్రమబద్ధీకరించబడి కనిపిస్తాయి.\n3. మీకు నచ్చిన కొనుగోలుదారుని ఎంచుకుని నిర్ధారించవచ్చు.`;
    }
    if (isHi) {
      return `खरीदारों के ऑफ़र देखने के लिए:\n1. डैशबोर्ड पर 'मूल्य तुलना' या 'मेरी लिस्टिंग' पर जाएं।\n2. वहां सभी खरीदारों की बोलियां सबसे ज्यादा कीमत के क्रम में दिखेंगी।\n3. अपनी पसंद का खरीदार चुनकर पुष्टि करें।`;
    }
    return `To check buyer offers on your crop residue:\n1. Tap "Compare Prices" or "My Listings" on your Dashboard.\n2. All buyer bids are displayed in descending order with the highest price first.\n3. Review their distance and terms, then confirm your preferred buyer!`;
  }

  // Intent D: How to sell waste / General "want to sell" without specific quantity in current prompt
  const isSellGeneral =
    (msg.includes('sell') ||
      msg.includes('how do i sell') ||
      msg.includes('want to sell') ||
      msg.includes('అమ్మాలి') ||
      msg.includes('అమ్మకం') ||
      msg.includes('విక్రయించ') ||
      msg.includes('बेचना') ||
      msg.includes('बेचें')) &&
    currentFacts.quantity === undefined;

  if (isSellGeneral && !currentFacts.wasteType) {
    if (isTe) {
      return `మీరు ఏ రకమైన పంట వ్యర్థాలను అమ్మాలనుకుంటున్నారు? ఉదాహరణకు, వరి గడ్డి, పత్తి కట్టెలు, మొక్కజొన్న వ్యర్థాలు, చెరకు పిప్పి లేదా వేరుశనగ పొట్టు?\n\nఫామ్‌ధన్‌లో అమ్మే విధానం చాలా సులభం:\n1. మీ డ్యాష్‌బోర్డ్‌లో 'వ్యర్థాలను లిస్ట్ చేయండి' నొక్కండి.\n2. పంట వ్యర్థం రకం మరియు పరిమాణాన్ని (టన్నులు లేదా క్వింటాళ్లలో) నమోదు చేయండి.\n3. మీ పొలం స్థానం మరియు ఫోటోను జోడించండి.\n4. సమీప గుర్తింపు పొందిన పరిశ్రమలు మీకు ఆఫర్లు పంపుతాయి.\n\nమీ వద్ద ఏ పంట వ్యర్థం ఉంది మరియు ఎంత పరిమాణం ఉందో చెబితే, మార్కెట్ ధరలను తెలియజేస్తాను!`;
    }
    if (isHi) {
      return `आप किस प्रकार का कृषि अवशेष बेचना चाहते हैं? उदाहरण के लिए, धान की पराली, कपास के डंठल, मक्का अवशेष, गन्ने की खोई या मूंगफली के छिलके?\n\nफार्मधन पर बेचने की प्रक्रिया:\n1. डैशबोर्ड पर 'कचरा लिस्ट करें' दबाएं।\n2. फसल अवशेष का प्रकार और मात्रा (टन या क्विंटल में) दर्ज करें।\n3. अपने खेत का स्थान और फोटो जोड़ें।\n4. प्रमाणित औद्योगिक खरीदार आपको सीधे बोलियां भेजेंगे!\n\nबताएं कि आपके पास कौन सा फसल अवशेष है और कितनी मात्रा है, ताकि मैं आपको सटीक बाजार भाव बता सकूं!`;
    }
    return `What type of agricultural waste do you want to sell? For example, paddy straw, cotton residue, maize residue, sugarcane bagasse, or groundnut shells?\n\nSelling on FarmDhan is straightforward:\n1. Tap "List Waste" on your Dashboard.\n2. Select your crop residue type and enter your quantity (in tons or quintals).\n3. Confirm your farm location and attach an optional photo.\n4. Verified industrial buyers will submit purchase bids, and you can choose the highest offer!\n\nTell me what crop residue you have and roughly how much, and I will help you estimate market value.`;
  }

  // Intent E: Help / General assistance
  const isHelpQuery =
    msg.includes('help') ||
    msg.includes('need help') ||
    msg.includes('how can you help') ||
    msg.includes('what can you do') ||
    msg.includes('సహాయం') ||
    msg.includes('మదద్') ||
    msg.includes('मदद') ||
    msg.includes('सहायता');

  if (isHelpQuery) {
    if (isTe) {
      return `ఫామ్‌ధన్‌కు స్వాగతం! పంట వ్యర్థాలను కాల్చకుండా ఆదాయం పొందడానికి నేను మీకు సహాయం చేస్తాను.\n\nనేను వీటిలో సహాయపడగలను:\n• పంట వ్యర్థాలను అమ్మకానికి లిస్ట్ చేయడం\n• పరిశ్రమల కొనుగోలుదారులను కనుగొనడం\n• ప్రస్తుత మార్కెట్ ధరల వివరాలు\n• సమీప FPO సేకరణ కేంద్రాలతో అనుసంధానం\n\nమీకు ఎలాంటి సహాయం కావాలి? మీరు ఏదైనా పంట వ్యర్థాన్ని అమ్మాలనుకుంటున్నారా?`;
    }
    if (isHi) {
      return `फार्मधन में आपका स्वागत है! मैं फसल अवशेषों को जलाने के बजाय उनसे उचित आय प्राप्त करने में आपकी मदद करता हूँ।\n\nमैं इसमें मदद कर सकता हूँ:\n• फसल अवशेषों को बिक्री के लिए लिस्ट करना\n• प्रमाणित औद्योगिक खरीदार खोजना\n• क्षेत्रीय बाजार मूल्यों की तुलना करना\n• नजदीकी एफपीओ एकत्रीकरण केंद्रों से जुड़ना\n\nआज मैं आपकी क्या सहायता कर सकता हूँ? क्या आप कोई फसल अवशेष बेचना चाहते हैं?`;
    }
    return `Welcome to FarmDhan! I'm here to help you turn agricultural residue into income instead of burning it.\n\nI can assist you with:\n• Listing crop residue for sale\n• Finding verified industrial buyers\n• Checking price benchmarks across districts\n• Connecting with local FPO aggregation hubs\n\nWhat would you like help with today? Do you have agricultural waste you want to sell?`;
  }

  // Intent F: General Price query without a specific crop or quantity
  const isPriceQuery =
    (msg.includes('price') ||
      msg.includes('rate') ||
      msg.includes('cost') ||
      msg.includes('worth') ||
      msg.includes('ధర') ||
      msg.includes('రేటు') ||
      msg.includes('दाम') ||
      msg.includes('भाव') ||
      msg.includes('कीमत')) &&
    !currentFacts.quantity;

  if (isPriceQuery && !currentFacts.wasteType && !memory.wasteType) {
    if (isTe) {
      return `ప్రస్తుత మార్కెట్ ధరల వివరాలు:\n• వరి గడ్డి: టన్నుకు ₹1,800 - ₹2,600\n• పత్తి కట్టెలు: టన్నుకు ₹2,200 - ₹3,200\n• మొక్కజొన్న వ్యర్థాలు: టన్నుకు ₹1,600 - ₹2,400\n• చెరకు పిప్పి: టన్నుకు ₹2,000 - ₹2,800\n(ధరలు తేమ 15% కంటే తక్కువగా ఉండటంపై ఆధారపడి ఉంటాయి).\n\nమీ వద్ద ఏ పంట వ్యర్థం ఉంది, మరియు ఎంత పరిమాణం ఉంది?`;
    }
    if (isHi) {
      return `फसल अवशेषों के वर्तमान बाजार भाव:\n• धान की पराली: ₹1,800 - ₹2,600 / टन\n• कपास के डंठल: ₹2,200 - ₹3,200 / टन\n• मक्का अवशेष: ₹1,600 - ₹2,400 / टन\n• गन्ने की खोई: ₹2,000 - ₹2,800 / टन\n(दरें 15% से कम नमी और परिवहन दूरी पर निर्भर करती हैं)।\n\nआपके पास कौन सा फसल अवशेष है और कितनी मात्रा है?`;
    }
    return `Current market price benchmarks for agricultural residues:\n• Paddy Straw: ₹1,800 - ₹2,600 / ton\n• Cotton Residue: ₹2,200 - ₹3,200 / ton\n• Maize Residue: ₹1,600 - ₹2,400 / ton\n• Sugarcane Bagasse: ₹2,000 - ₹2,800 / ton\n(Rates depend on moisture <15% and transport distance).\n\nWhat type of crop residue do you have, and in which district?`;
  }

  // -------------------------------------------------------------------------
  // CROP-SPECIFIC QUOTES & ADVISORY (When user provided crop and/or quantity)
  // -------------------------------------------------------------------------
  const wasteType = currentFacts.wasteType || memory.wasteType || verifiedListing?.wasteType || null;
  const quantity =
    currentFacts.quantity !== undefined
      ? currentFacts.quantity
      : memory.quantity !== undefined && (currentFacts.wasteType || isPriceQuery)
      ? memory.quantity
      : verifiedListing?.quantity !== undefined
      ? parseFloat(verifiedListing.quantity)
      : null;
  const unit = currentFacts.unit || memory.unit || verifiedListing?.unit || 'ton';

  // CASE 1: User provided BOTH crop and quantity
  if (wasteType && quantity !== null) {
    const rateInfo = CROP_RATES[wasteType] || CROP_RATES['Paddy Straw'];
    const totalMin = Math.round(quantity * rateInfo.min);
    const totalMax = Math.round(quantity * rateInfo.max);

    const location =
      currentFacts.location ||
      memory.location ||
      verifiedContext?.user?.district ||
      'Warangal';
    const expectedPrice =
      currentFacts.expectedPrice !== undefined
        ? currentFacts.expectedPrice
        : memory.expectedPrice !== undefined
        ? memory.expectedPrice
        : rateInfo.min;

    const listingDraft = {
      wasteType,
      quantity,
      unit,
      location,
      expectedPrice,
    };

    if (isTe) {
      const cropName = rateInfo.te;
      const unitLabel = unit === 'ton' ? 'టన్నుల' : unit;
      return {
        text: `మీ వద్ద ${quantity} ${unitLabel} ${cropName} ఉంది. బయోమాస్ గుళికలు (pellets) మరియు బయో-సిఎన్‌జి తయారీకి ${cropName}కు మంచి డిమాండ్ ఉంది. ప్రస్తుతం మార్కెట్ ధర టన్నుకు ₹${rateInfo.min.toLocaleString('en-IN')} నుండి ₹${rateInfo.max.toLocaleString('en-IN')} వరకు పలుకుతోంది (తేమ 15% కంటే తక్కువగా ఉన్నప్పుడు).\n\nమీ ${quantity} ${unitLabel}కు అంచనా మొత్తం ఆదాయం సుమారు ₹${totalMin.toLocaleString('en-IN')} నుండి ₹${totalMax.toLocaleString('en-IN')} వరకు ఉంటుంది.\n\nగుర్తింపు పొందిన కొనుగోలుదారుల నుండి ఆఫర్లు పొందడానికి మీ డ్యాష్‌బోర్డ్‌లో 'వ్యర్థాలను లిస్ట్ చేయండి' నొక్కండి!`,
        listingDraft,
      };
    }

    if (isHi) {
      const cropName = rateInfo.hi;
      const unitLabel = unit === 'ton' ? 'टन' : unit;
      return {
        text: `आपके पास ${quantity} ${unitLabel} ${cropName} है। बायोमास पेलेट्स और बायो-सीएनजी के लिए ${cropName} की अच्छी मांग है। वर्तमान बाजार दर ₹${rateInfo.min.toLocaleString('en-IN')} से ₹${rateInfo.max.toLocaleString('en-IN')} प्रति ${rateInfo.unit} के बीच है (यदि नमी 15% से कम हो)।\n\nआपके ${quantity} ${unitLabel} के लिए अनुमानित कुल आय लगभग ₹${totalMin.toLocaleString('en-IN')} से ₹${totalMax.toLocaleString('en-IN')} होगी।\n\nप्रमाणित खरीदारों से सीधे प्रस्ताव प्राप्त करने के लिए अपने डैशबोर्ड पर 'कचरा लिस्ट करें' पर जाएं!`,
        listingDraft,
      };
    }

    // English
    const unitLabel = `${unit}${quantity > 1 && !unit.endsWith('s') ? 's' : ''}`;
    return {
      text: `You have ${quantity} ${unitLabel} of ${wasteType}. ${wasteType} is in high demand for bio-pellets, bio-CNG, and industrial processing. Current market rates range between ₹${rateInfo.min.toLocaleString('en-IN')} and ₹${rateInfo.max.toLocaleString('en-IN')} per ${rateInfo.unit} (for moisture <15%).\n\nFor your ${quantity} ${unitLabel}, your estimated total revenue is approximately ₹${totalMin.toLocaleString('en-IN')} to ₹${totalMax.toLocaleString('en-IN')}.\n\nTo connect with interested verified buyers, tap "List Waste" on your Dashboard to publish this batch!`,
      listingDraft,
    };
  }

  // CASE 2: User provided crop only (quantity is missing)
  if (wasteType && quantity === null) {
    const rateInfo = CROP_RATES[wasteType] || CROP_RATES['Paddy Straw'];

    if (isTe) {
      return `${rateInfo.te} బయో-ఎనర్జీ మరియు పెల్లెట్ ప్లాంట్లకు చాలా విలువైనది. ప్రస్తుతం దీని మార్కెట్ ధర టన్నుకు ₹${rateInfo.min.toLocaleString('en-IN')} నుండి ₹${rateInfo.max.toLocaleString('en-IN')} వరకు ఉంది.\n\nమీ వద్ద ఎన్ని టన్నుల ${rateInfo.te} ఉంది? పరిమాణాన్ని తెలియజేస్తే మీ అంచనా ఆదాయాన్ని మరియు సమీప కొనుగోలుదారుల వివరాలను తెలియజేస్తాను.`;
    }

    if (isHi) {
      return `${rateInfo.hi} बायोमास उद्योगों और पेलेट प्लांट्स के लिए बहुत उपयोगी है। वर्तमान में इसकी दर ₹${rateInfo.min.toLocaleString('en-IN')} से ₹${rateInfo.max.toLocaleString('en-IN')} प्रति टन के बीच है।\n\nआपके पास कितने टन ${rateInfo.hi} है? कृपया मात्रा बताएं ताकि मैं आपकी अनुमानित आय की गणना कर सकूं।`;
    }

    return `${wasteType} is actively purchased on FarmDhan for bio-energy and pellet manufacturing. Current benchmark rates range between ₹${rateInfo.min.toLocaleString('en-IN')} and ₹${rateInfo.max.toLocaleString('en-IN')} per ton.\n\nHow many tons or acres of ${wasteType} do you have? Please share your quantity so I can calculate your estimated revenue and match local buyers!`;
  }

  // CASE 3: User provided quantity only (crop is missing)
  if (!wasteType && quantity !== null) {
    const unitLabel = `${unit}${quantity > 1 && !unit.endsWith('s') ? 's' : ''}`;

    if (isTe) {
      return `మీ వద్ద ${quantity} ${unit === 'ton' ? 'టన్నుల' : unit} వ్యర్థం ఉన్నట్లు తెలిపారు. ఇది ఏ పంటకు సంబంధించినది? (ఉదాహరణకు: వరి గడ్డి, పత్తి కట్టెలు, మొక్కజొన్న వ్యర్థాలు లేదా చెరకు పిప్పి?) పంట రకాన్ని చెబితే కచ్చితమైన మార్కెట్ ధరలు మరియు కొనుగోలుదారుల వివరాలను అందిస్తాను.`;
    }

    if (isHi) {
      return `आपने ${quantity} ${unit === 'ton' ? 'टन' : unit} अवशेष का उल्लेख किया है। यह किस फसल का अवशेष है? (उदाहरण के लिए: धान की पराली, कपास के डंठल, मक्का या गन्ने की खोई?) फसल का प्रकार बताने पर मैं आपको सटीक मूल्य और मांग बता सकूंगा।`;
    }

    return `You mentioned having ${quantity} ${unitLabel}. What type of crop residue is this? (For example, paddy straw, cotton residue, maize residue, or sugarcane bagasse?) Once you tell me the crop type, I can provide exact price benchmarks and buyer demand.`;
  }

  // Default neutral greeting without assuming any crop or quantity
  if (isTe) {
    return `నమస్కారం! నేను మీ FarmDhan AI సహాయకుడిని. పంట వ్యర్థాల ధరలు, లిస్టింగ్ విధానం మరియు కొనుగోలుదారుల వివరాల గురించి మీరు నన్ను ఏ ప్రశ్నైనా అడగవచ్చు. మీరు ఏ పంట వ్యర్థం గురించి తెలుసుకోవాలనుకుంటున్నారు?`;
  }
  if (isHi) {
    return `नमस्ते! मैं FarmDhan AI सहायक हूँ। फसल अवशेषों के मूल्य, लिस्टिंग प्रक्रिया और खरीदारों की जानकारी के लिए आप मुझसे पूछ सकते हैं। आप किस फसल अवशेष के बारे में जानकारी चाहते हैं?`;
  }
  return `Welcome to FarmDhan! I can guide you on crop residue pricing, listing steps, and matching with verified buyers. What crop residue are you looking to sell or buy today?`;
};

/**
 * Generate AI chat response using Gemini API or contextual fallback
 */
const generateAdvice = async (userMessage, history = [], language = 'en', verifiedContext = {}) => {
  const client = getClient();
  const fallback = getFallbackAdvice(userMessage, history, language, verifiedContext);
  const fallbackText = typeof fallback === 'object' ? fallback.text : fallback;
  const fallbackDraft = typeof fallback === 'object' ? fallback.listingDraft : null;

  // If no Gemini API key configured, use our factual fallback engine
  if (!client) {
    return {
      text: fallbackText,
      source: 'offline_knowledge_base',
      model: 'farmdhan-advisory-v1',
      listingDraft: fallbackDraft,
    };
  }

  try {
    const formattedHistory = (history || []).map((h) => ({
      role: h.role === 'user' || h.sender === 'user' ? 'user' : 'model',
      parts: [{ text: h.content || h.text || '' }],
    }));

    // Build verified context prompt
    const isBuyer = verifiedContext?.role === 'buyer';
    const verifiedListing = verifiedContext?.listing;
    const verifiedUser = verifiedContext?.user;

    const contextNotes = [];
    if (isBuyer) {
      contextNotes.push('User Role: Industrial Buyer / Procurement Officer');
      if (verifiedUser?.name) contextNotes.push(`Buyer Name: ${verifiedUser.name}`);
      const availableListings = verifiedContext?.availableListings || [];
      if (availableListings.length > 0) {
        const listSummary = availableListings
          .map((l, i) => {
            const sName = l.farmerId?.name || 'Verified Seller';
            const locStr = [l.location?.village, l.location?.district].filter(Boolean).join(', ');
            return `${i + 1}. Seller: ${sName}, Residue: ${l.wasteType}, Quantity: ${l.quantity} ${l.unit}, Price: ₹${l.expectedPrice || 'Negotiable'}/${l.unit}, Location: ${locStr || 'Telangana'}`;
          })
          .join('\n');
        contextNotes.push(`LIVE ACTIVE RESIDUE LISTINGS IN DATABASE:\n${listSummary}`);
      } else {
        contextNotes.push('No active listings currently available in database.');
      }
      const buyerOffers = verifiedContext?.buyerOffers || [];
      if (buyerOffers.length > 0) {
        const offersSummary = buyerOffers
          .map(
            (o, i) =>
              `${i + 1}. Residue: ${o.listingId?.wasteType || 'Residue'}, Offered Price: ₹${o.offeredPrice}, Status: ${o.status}`
          )
          .join('\n');
        contextNotes.push(`BUYER'S RECENT OFFERS:\n${offersSummary}`);
      }
    } else {
      if (verifiedUser) {
        contextNotes.push(`Registered User Role: ${verifiedUser.role || 'farmer'}, Name: ${verifiedUser.name || 'User'}`);
        if (verifiedUser.district) contextNotes.push(`District: ${verifiedUser.district}`);
      }
      if (verifiedListing) {
        contextNotes.push(
          `User explicitly attached listing: ${verifiedListing.quantity || ''} ${verifiedListing.unit || 'ton'} of ${verifiedListing.wasteType}`
        );
      } else {
        contextNotes.push('No listing attached. You must NOT assume any crop residue type or quantity.');
      }

      const memory = extractConversationMemory(history);
      if (memory.wasteType || memory.quantity) {
        contextNotes.push(
          `Conversation Memory: User previously stated: ${memory.wasteType || ''} ${memory.quantity ? `${memory.quantity} ${memory.unit || 'ton'}` : ''}`
        );
      }
    }

    const promptLabel = isBuyer ? 'Buyer Question' : 'Farmer Question';
    const promptText = `[VERIFIED APPLICATION CONTEXT]:\n${contextNotes.join('\n')}\n[User Language Preference: ${language}]\n${promptLabel}: ${userMessage}`;

    const response = await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        ...formattedHistory,
        {
          role: 'user',
          parts: [{ text: promptText }],
        },
      ],
      config: {
        systemInstruction: isBuyer ? BUYER_SYSTEM_INSTRUCTION : SYSTEM_INSTRUCTION,
        temperature: 0.5,
        maxOutputTokens: 600,
      },
    });

    const aiReply = response.text ? response.text.trim() : null;
    return {
      text: aiReply || fallbackText,
      source: 'gemini-3.8-flash',
      model: 'gemini-3.8-flash',
      listingDraft: fallbackDraft,
    };
  } catch (err) {
    console.error('[GeminiService] Error calling Gemini API, falling back to rule-based engine:', err.message);
    return {
      text: fallbackText,
      source: 'fallback_error_recovery',
      model: 'farmdhan-advisory-v1',
      listingDraft: fallbackDraft,
    };
  }
};

module.exports = {
  generateAdvice,
  extractFactsFromText,
  extractConversationMemory,
  getFallbackAdvice,
  CROP_RATES,
};

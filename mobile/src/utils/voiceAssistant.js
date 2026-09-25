import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

// Standard BCP-47 language codes for Indian regional speech synthesis
export const SPEECH_LANG_MAP = {
  te: 'te-IN', // Telugu
  hi: 'hi-IN', // Hindi
  en: 'en-US', // Indian / Standard English
};

// Screen-by-Screen Comprehensive Voice Explanations in 3 Languages
export const SCREEN_GUIDES = {
  farmerDashboard: {
    title: {
      te: 'రైతు డ్యాష్‌బోర్డ్ సూచనలు',
      hi: 'किसान डैशबोर्ड निर्देश',
      en: 'Farmer Dashboard Guidance',
    },
    sub: {
      te: 'డ్యాష్‌బోర్డ్ వివరాలు మరియు అందుబాటులో ఉన్న కొనుగోలుదారులు',
      hi: 'डैशबोर्ड विवरण और उपलब्ध खरीदार',
      en: 'Overview of your listings, buyers, and incoming bids',
    },
    speech: {
      te: 'రైతు డ్యాష్‌బోర్డ్‌కు స్వాగతం. ఇక్కడ మీ క్రియాశీల పంట వ్యర్థాలు, అందుబాటులో ఉన్న కొనుగోలుదారులు మరియు తాజా ఆఫర్లు కనిపిస్తాయి. కొత్త వ్యర్థాలను అమ్మడానికి "వ్యర్థాలను లిస్ట్ చేయండి" బటన్ నొక్కండి. కొనుగోలుదారులను చూడటానికి "కొనుగోలుదారులను కనుగొనండి" నొక్కండి. మీకు నచ్చిన కొనుగోలుదారుని ఎంచుకునే అధికారం పూర్తిగా మీదే.',
      hi: 'किसान डैशबोर्ड में आपका स्वागत है। यहां आप अपनी फसल अवशेष लिस्टिंग, उपलब्ध खरीदार और नवीनतम बोलियां देख सकते हैं। अपनी पराली बेचने के लिए "कचरा लिस्ट करें" दबाएं। खरीदारों की तुलना करने के लिए "खरीदार खोजें" दबाएं। अंतिम निर्णय हमेशा आपका ही रहेगा।',
      en: 'Welcome to Farmer Dashboard. Here you can track your crop residue listings, active buyers, and incoming offers. Tap "List Waste" to sell crop residue, or "Find Buyers" to compare industrial rates. You always retain complete control over choosing your preferred buyer.',
    },
  },
  listWaste: {
    title: {
      te: 'వ్యర్థాలను లిస్ట్ చేసే సూచనలు',
      hi: 'फसल अवशेष लिस्टिंग निर्देश',
      en: 'List Waste Guidance',
    },
    sub: {
      te: 'పంట వ్యర్థాల రకం, పరిమాణం మరియు ఫోటో నమోదు చేయండి',
      hi: 'अवशेष का प्रकार, मात्रा और स्थान दर्ज करें',
      en: 'Enter crop type, quantity, expected price, and farm photo',
    },
    speech: {
      te: 'వ్యవసాయ వ్యర్థాలను లిస్ట్ చేసే పేజీకి స్వాగతం. ఇక్కడ మీ వరి గడ్డి, పత్తి కట్టెలు లేదా ఇతర పంట వ్యర్థాల రకాన్ని ఎంచుకోండి. పరిమాణం మరియు ఆశించిన ధరను నమోదు చేసి మీ పొలం ఫోటో తీయండి. సమర్పించిన వెంటనే సమీప బయోమాస్ కొనుగోలుదారులు మీకు ఆఫర్లు పంపుతారు.',
      hi: 'फसल अवशेष लिस्टिंग पेज में आपका स्वागत है। यहां धान की पराली, कपास के डंठल या अन्य अवशेष का प्रकार चुनें। मात्रा और अपेक्षित मूल्य दर्ज करके अपने खेत की फोटो जोड़ें। सबमिट करते ही नजदीकी खरीदार आपसे संपर्क करेंगे।',
      en: 'Welcome to List Waste screen. Select your crop residue type such as paddy straw or cotton stalks. Enter your quantity, expected price per ton, and upload a farm photo. Once submitted, nearby buyers will be automatically matched to your crop.',
    },
  },
  myListings: {
    title: {
      te: 'నా లిస్టింగ్‌ల సూచనలు',
      hi: 'मेरी लिस्टिंग निर्देश',
      en: 'My Listings Guidance',
    },
    sub: {
      te: 'మీరు నమోదు చేసిన పంట వ్యర్థాల వివరాలు',
      hi: 'आपकी सक्रिय और पूर्ण की गई लिस्टिंग',
      en: 'View all your active, pending, and completed residue listings',
    },
    speech: {
      te: 'నా లిస్టింగ్‌ల పేజీ. మీరు నమోదు చేసిన పంట వ్యర్థాలు ఇక్కడ కనిపిస్తాయి. ప్రతి లిస్టింగ్ పై వచ్చిన కొనుగోలుదారుల ఆఫర్లను చూడటానికి దానిపై నొక్కండి.',
      hi: 'मेरी लिस्टिंग स्क्रीन। आपके द्वारा दर्ज किए गए सभी अवशेष यहां दिखाई देंगे। प्राप्त बोलियों को देखने के लिए किसी भी लिस्टिंग पर टैप करें।',
      en: 'My Listings screen. Here you can view all residue batches you have listed. Tap any listing to review buyer bids and manage transaction status.',
    },
  },
  buyerMatching: {
    title: {
      te: 'కొనుగోలుదారుల సరిపోలిక సూచనలు',
      hi: 'खरीदार मिलान निर्देश',
      en: 'Buyer Matching Guidance',
    },
    sub: {
      te: 'అత్యధిక ధర మరియు సమీప కొనుగోలుదారుల ర్యాంకింగ్',
      hi: 'सर्वोत्तम मूल्य और नजदीकी खरीदार',
      en: 'Ranked buyers based on price, distance, and requirements',
    },
    speech: {
      te: 'కొనుగోలుదారుల సరిపోలిక పేజీ. మా వ్యవస్థ మీ ప్రాంతంలోని కొనుగోలుదారులను, వారు ఇచ్చే ధర మరియు దూరం ఆధారంగా ర్యాంక్ చేసి చూపిస్తుంది. వివరాలు పరిశీలించి మీకు నచ్చిన కొనుగోలుదారుని ఎంచుకోండి.',
      hi: 'खरीदार मिलान स्क्रीन। हमारा सिस्टम उच्चतम कीमत और न्यूनतम दूरी के आधार पर खरीदारों को रैंक करता है। शर्तें जांचें और अपना पसंदीदा खरीदार चुनें।',
      en: 'Buyer Matching screen. Our algorithm ranks nearby industrial buyers by offered price, proximity, and capacity. Review terms and choose the best buyer for your crop.',
    },
  },
  priceComparison: {
    title: {
      te: 'ధరల పోలిక సూచనలు',
      hi: 'मूल्य तुलना निर्देश',
      en: 'Price Comparison Guidance',
    },
    sub: {
      te: 'అత్యధిక ఆఫర్ ఇచ్చిన కొనుగోలుదారు మొదట కనిపిస్తారు',
      hi: 'सबसे ज्यादा बोली देने वाले खरीदार पहले देखें',
      en: 'Transparent descending order comparison of buyer bids',
    },
    speech: {
      te: 'ధరల పోలిక పేజీ. ఇక్కడ కొనుగోలుదారుల ఆఫర్లు అత్యధిక ధర నుండి క్రమబద్ధీకరించబడ్డాయి. ఎక్కువ ధర ఇచ్చే కొనుగోలుదారుని ఎంచుకుని నేరుగా నిర్ధారించండి.',
      hi: 'मूल्य तुलना स्क्रीन। सभी खरीदारों की बोलियां घटते क्रम में व्यवस्थित हैं। सबसे ज्यादा कीमत देने वाले खरीदार को चुनें और सीधे पुष्टि करें।',
      en: 'Price Comparison screen. All buyer offers are sorted in descending order with the highest rate first, ensuring transparent market pricing for your harvest.',
    },
  },
  nearbyBuyers: {
    title: {
      te: 'సమీప కొనుగోలుదారుల సూచనలు',
      hi: 'नजदीकी खरीदार निर्देश',
      en: 'Nearby Buyers Guidance',
    },
    sub: {
      te: 'మీ పరిధిలోని బయో-ఎనర్జీ మరియు పెల్లెట్ ప్లాంట్లు',
      hi: 'आपके क्षेत्र के बायोमास और सीएनजी उद्योग',
      en: 'Verified bio-energy and processing plants in your region',
    },
    speech: {
      te: 'సమీప కొనుగోలుదారుల పేజీ. మీ జిల్లా మరియు సమీప ప్రాంతాల్లో ఉన్న గుర్తింపు పొందిన బయోమాస్ ఫ్యాక్టరీలు, పెల్లెట్ యూనిట్లు మరియు వారి కొనుగోలు అవసరాలు ఇక్కడ చూడవచ్చు.',
      hi: 'नजदीकी खरीदार स्क्रीन। अपने जिले और आसपास के प्रमाणित बायोमास उद्योगों, पेलेट प्लांट्स और उनकी खरीद आवश्यकताओं को देखें।',
      en: 'Nearby Buyers screen. Explore verified biomass power plants, bio-CNG refineries, and paper mills operating within your transport radius.',
    },
  },
  aiAssistant: {
    title: {
      te: 'AI సలహాదారు సూచనలు',
      hi: 'AI सलाहकार निर्देश',
      en: 'AI Assistant Guidance',
    },
    sub: {
      te: 'పంట వ్యర్థాల ధరలు మరియు బయోమాస్ వినియోగంపై సమాచారం',
      hi: 'पराली के मूल्य और सर्वोत्तम उपयोग पर सलाह',
      en: 'Ask questions about residue valuation, fair rates, and market trends',
    },
    speech: {
      te: 'ఫార్మ్‌ధన్ AI సలహాదారు. వరి గడ్డి మరియు పత్తి కట్టెల సరసమైన ధరలు, బయోమాస్ మార్కెట్ మరియు అమ్మకం పద్ధతులపై మీ ప్రశ్నలను తెలుగులో మాట్లాడి లేదా టైప్ చేసి అడగండి.',
      hi: 'फार्मधन AI सलाहकार। फसल अवशेषों के उचित मूल्य, सरकारी योजनाओं और बायोमास उपयोग के बारे में बोलकर या लिखकर सवाल पूछें।',
      en: 'FarmDhan AI Advisory screen. Ask questions via voice or text in English, Telugu, or Hindi about crop residue pricing, industrial demand, and clean handling practices.',
    },
  },
  buyerDashboard: {
    title: {
      te: 'కొనుగోలుదారు డ్యాష్‌బోర్డ్ సూచనలు',
      hi: 'खरीदार डैशबोर्ड निर्देश',
      en: 'Buyer Dashboard Guidance',
    },
    sub: {
      te: 'రైతుల వ్యర్థాల సరఫరా మరియు మీ కొనుగోలు డిమాండ్',
      hi: 'किसानों की आपूर्ति और आपकी खरीद मांग',
      en: 'Manage residue procurement, post buying rates, and review offers',
    },
    speech: {
      te: 'కొనుగోలుదారు డ్యాష్‌బోర్డ్‌కు స్వాగతం. సమీప రైతుల నుండి అందుబాటులో ఉన్న పంట వ్యర్థాలను పరిశీలించండి. మీ ఫ్యాక్టరీకి కావలసిన పరిమాణం మరియు కొనుగోలు రేటును నమోదు చేయడానికి "నా రేటు" నొక్కండి.',
      hi: 'खरीदार डैशबोर्ड में आपका स्वागत है। किसानों द्वारा उपलब्ध फसल अवशेष देखें। अपनी औद्योगिक आवश्यकता और खरीद दर निर्धारित करने के लिए "मांग दर्ज करें" पर जाएं।',
      en: 'Welcome to Buyer Dashboard. Browse active crop residue supply from nearby farmers. Post your factory procurement requirements and offered prices per ton.',
    },
  },
  browseListings: {
    title: {
      te: 'వ్యర్థాల శోధన సూచనలు',
      hi: 'पराली खोज निर्देश',
      en: 'Browse Waste Guidance',
    },
    sub: {
      te: 'రైతులు నమోదు చేసిన పంట వ్యర్థాలను శోధించి ఆఫర్ ఇవ్వండి',
      hi: 'किसानों द्वारा सूचीबद्ध पराली खोजें और बोली लगाएं',
      en: 'Search available agricultural residue and submit purchase offers',
    },
    speech: {
      te: 'వ్యర్థాల శోధన పేజీ. పంట రకం, పరిమాణం మరియు గ్రామం వారీగా ఫిల్టర్ చేయండి. రైతు వివరాలు పరిశీలించి నేరుగా మీ కొనుగోలు బిడ్ సమర్పించండి.',
      hi: 'पराली खोज स्क्रीन। फसल के प्रकार और जिले के आधार पर अवशेष खोजें। किसान की लिस्टिंग देखकर अपना खरीद प्रस्ताव सबमिट करें।',
      en: 'Browse Waste screen. Search farmer residue listings by crop type, quantity, and location. Review farm details and submit your purchase bid directly.',
    },
  },
  createRequirement: {
    title: {
      te: 'కొనుగోలు అవసరం సూచనలు',
      hi: 'खरीद मांग निर्देश',
      en: 'Buyer Requirements Guidance',
    },
    sub: {
      te: 'మీ పరిశ్రమకు కావలసిన వ్యర్థాల రకం మరియు కొనుగోలు రేటు',
      hi: 'आवश्यक बायोमास प्रकार, मात्रा और खरीद दर',
      en: 'Specify procurement targets, moisture terms, and offered price',
    },
    speech: {
      te: 'కొనుగోలు రేటు నమోదు పేజీ. మీ ప్లాంట్‌కు అవసరమైన పంట వ్యర్థం, టన్నుల పరిమాణం మరియు టన్నుకు ఇచ్చే ధరను నమోదు చేయండి. సమీప రైతులకు మీ డిమాండ్ వెంటనే కనిపిస్తుంది.',
      hi: 'खरीद मांग स्क्रीन। अपने प्लांट के लिए आवश्यक बायोमास प्रकार, कुल मात्रा और प्रति टन कीमत तय करें। यह दर सीधे किसानों को दिखाई देगी।',
      en: 'Buyer Requirements screen. Enter your target biomass residue type, required tonnage, moisture terms, and purchase price per ton to attract regional farmers.',
    },
  },
  notifications: {
    title: {
      te: 'నోటిఫికేషన్ల సూచనలు',
      hi: 'सूचनाएं निर्देश',
      en: 'Notifications Guidance',
    },
    sub: {
      te: 'తాజా ఆఫర్లు మరియు లావాదేవీల సమాచారం',
      hi: 'नए प्रस्तावों और पुष्टि की जानकारी',
      en: 'Live updates on buyer offers, deals, and pickup scheduling',
    },
    speech: {
      te: 'నోటిఫికేషన్ల పేజీ. మీ పంట వ్యర్థాలపై కొనుగోలుదారులు సమర్పించిన బిడ్లు మరియు ఖరారైన ఒప్పందాల సమాచారం ఇక్కడ లభిస్తుంది.',
      hi: 'सूचनाएं स्क्रीन। आपकी लिस्टिंग पर आए नए खरीद प्रस्ताव और पुष्टि किए गए सौदों की ताजा जानकारी यहां देखें।',
      en: 'Notifications screen. Receive real-time alerts when buyers submit bids, when farmers confirm purchases, and for logistics updates.',
    },
  },
  profile: {
    title: {
      te: 'ఖాతా మరియు సెట్టింగ్‌ల సూచనలు',
      hi: 'प्रोफ़ाइल और सेटिंग्स निर्देश',
      en: 'Profile and Settings Guidance',
    },
    sub: {
      te: 'భాష మార్చడం, వాయిస్ సెట్టింగ్‌లు మరియు లాగౌట్',
      hi: 'भाषा बदलना, आवाज सेटिंग्स और लॉग आउट',
      en: 'Manage account, switch application language, and voice preferences',
    },
    speech: {
      te: 'ఖాతా మరియు సెట్టింగ్‌ల పేజీ. ఇక్కడ మీ వివరాలు చూడవచ్చు, యాప్ భాషను తెలుగు, హిందీ లేదా ఇంగ్లీషుకు మార్చవచ్చు, మరియు లాగౌట్ అవ్వవచ్చు.',
      hi: 'प्रोफ़ाइल और सेटिंग्स स्क्रीन। यहां अपनी जानकारी देखें, ऐप की भाषा बदलें और आवाज सहायता सेटिंग्स प्रबंधित करें।',
      en: 'Profile and Settings screen. Manage your registration information, switch app language between Telugu, Hindi, and English, and sign out securely.',
    },
  },
  support: {
    title: {
      te: 'FPO & మద్దతు నెట్‌వర్క్ సూచనలు',
      hi: 'FPO और सहायता निर्देश',
      en: 'FPO & Support Guidance',
    },
    sub: {
      te: 'రైతు సమూహాలు, సేకరణ కేంద్రాలు మరియు ఉచిత హెల్ప్‌లైన్',
      hi: 'किसान समूह, संग्रह केंद्र और टोल-फ्री हेल्पलाइन',
      en: 'Connect with verified FPOs and call the toll-free Kisan helpline',
    },
    speech: {
      te: 'FPO మరియు మద్దతు కేంద్రాల పేజీ. రవాణా మరియు నిల్వ సహాయం కోసం గుర్తింపు పొందిన రైతు ఉత్పత్తిదారుల సంఘాలను సంప్రదించండి లేదా కిసాన్ టోల్ ఫ్రీ నంబర్‌కు కాల్ చేయండి.',
      hi: 'FPO और सहायता केंद्र स्क्रीन। पराली एकत्रीकरण और परिवहन के लिए किसान उत्पादक संगठनों से जुड़ें या टोल-फ्री किसान हेल्पलाइन पर कॉल करें।',
      en: 'FPO and Support Network. Connect with verified Farmer Producer Organizations for collection hub logistics, or call the 24/7 toll-free helpline for assistance.',
    },
  },
  marketInsights: {
    title: {
      te: 'మార్కెట్ విశ్లేషణ సూచనలు',
      hi: 'बाजार रुझान निर्देश',
      en: 'Market Insights Guidance',
    },
    sub: {
      te: 'పంట వ్యర్థాల మార్కెట్ డిమాండ్ మరియు సగటు ధరలు',
      hi: 'फसल अवशेषों की मांग और औसत मूल्य रुझान',
      en: 'Regional residue supply, industrial demand, and price benchmarks',
    },
    speech: {
      te: 'మార్కెట్ విశ్లేషణ పేజీ. తెలంగాణ మరియు సమీప జిల్లాల్లో వరి గడ్డి, పత్తి కట్టెల సగటు మార్కెట్ ధరలు మరియు పరిశ్రమల డిమాండ్‌ను ఇక్కడ చూడవచ్చు.',
      hi: 'बाजार रुझान स्क्रीन। विभिन्न फसल अवशेषों की औसत खरीद दर और औद्योगिक मांग का तुलनात्मक विश्लेषण देखें।',
      en: 'Market Insights screen. Track live price benchmarks across districts, seasonal biomass supply, and bio-energy industry consumption trends.',
    },
  },
  login: {
    title: {
      te: 'లాగిన్ మార్గదర్శకత్వం',
      hi: 'लॉगिन निर्देश',
      en: 'Login Guidance',
    },
    sub: {
      te: 'మొబైల్ నంబర్ మరియు పాస్‌వర్డ్ లేదా ఓటీపీతో ప్రవేశించండి',
      hi: 'फोन नंबर और पासवर्ड या ओटीपी से लॉगिन करें',
      en: 'Sign in with phone number & password or OTP',
    },
    speech: {
      te: 'ఫార్మ్‌ధన్ లాగిన్ పేజీకి స్వాగతం. మీ 10 అంకెల రిజిస్టర్డ్ మొబైల్ నంబరు మరియు పాస్‌వర్డ్ నమోదు చేసి లాగిన్ అవ్వండి. లేదా ఓటీపీ ద్వారా కూడా లాగిన్ కావచ్చు. ఖాతా లేకపోతే క్రింద ఉన్న రిజిస్టర్ బటన్ నొక్కండి.',
      hi: 'फार्मधन लॉगिन पेज में आपका स्वागत है। अपना 10 अंकों का पंजीकृत मोबाइल नंबर और पासवर्ड दर्ज करके लॉगिन करें। या आप ओटीपी से भी लॉगिन कर सकते हैं। यदि आपके पास खाता नहीं है, तो नीचे दिए गए रजिस्टर बटन पर जाएं।',
      en: 'Welcome to FarmDhan Login. Enter your registered 10-digit mobile number and password, or use OTP login. If you do not have an account yet, click the Register button below.',
    },
  },
  register: {
    title: {
      te: 'రిజిస్ట్రేషన్ మార్గదర్శకత్వం',
      hi: 'पंजीकरण निर्देश',
      en: 'Registration Guidance',
    },
    sub: {
      te: 'రైతు లేదా కొనుగోలుదారుగా సులభంగా నమోదు చేసుకోండి',
      hi: 'किसान या खरीदार के रूप में पंजीकरण करें',
      en: 'Create a real Farmer or Buyer account',
    },
    speech: {
      te: 'ఫార్మ్‌ధన్ రిజిస్ట్రేషన్ పేజీకి స్వాగతం. మీ పూర్తి పేరు, మొబైల్ నంబరు, మరియు పాస్‌వర్డ్ నమోదు చేయండి. ఆపై మీరు రైతు లేదా కొనుగోలుదారు అని ఎంచుకుని ఖాతా సృష్టించండి. మీ వివరాలు సురక్షితంగా ఉంటాయి.',
      hi: 'फार्मधन पंजीकरण पेज में आपका स्वागत है। अपना पूरा नाम, मोबाइल नंबर और पासवर्ड दर्ज करें। फिर किसान या खरीदार चुनें और अपना खाता बनाएं। आपकी जानकारी पूरी तरह सुरक्षित है।',
      en: 'Welcome to FarmDhan Registration. Enter your full name, mobile number, and create a password. Then choose whether you are a Farmer or Buyer to create your real verified account.',
    },
  },
};

// Form Field Guidance Prompts in 3 Languages
export const VOICE_PROMPTS = {
  welcome: {
    en: 'Welcome to FarmDhan. Please choose your language.',
    te: 'ఫార్మ్‌ధన్‌కు స్వాగతం. దయచేసి మీ భాషను ఎంచుకోండి.',
    hi: 'फार्मधन में आपका स्वागत है। कृपया अपनी भाषा चुनें।',
  },
  loginPhone: {
    en: 'Please enter your 10-digit mobile number.',
    te: 'దయచేసి మీ 10 అంకెల మొబైల్ నంబరును నమోదు చేయండి.',
    hi: 'कृपया अपना 10 अंकों का मोबाइल नंबर दर्ज करें।',
  },
  loginPassword: {
    en: 'Please enter your password.',
    te: 'దయచేసి మీ పాస్‌వర్డ్‌ను నమోదు చేయండి.',
    hi: 'कृपया अपना पासवर्ड दर्ज करें।',
  },
  otpSent: {
    en: 'An OTP has been sent to your mobile number. Enter the 6-digit OTP.',
    te: 'మీ మొబైల్ నంబర్కు OTP పంపబడింది. 6 అంకెల OTP నమోదు చేయండి.',
    hi: 'आपके मोबाइल नंबर पर OTP भेजा गया है। 6 अंकों का OTP दर्ज करें।',
  },
  otpInvalid: {
    en: 'Incorrect OTP. Please enter the correct 6-digit code.',
    te: 'తప్పు OTP కోడ్. దయచేసి సరైన 6 అంకెల కోడ్‌ను నమోదు చేయండి.',
    hi: 'गलत OTP कोड। कृपया सही 6 अंकों का कोड दर्ज करें।',
  },
  otpExpired: {
    en: 'This OTP has expired. Please tap Resend OTP.',
    te: 'ఈ OTP గడువు ముగిసింది. దయచేసి మళ్లీ పంపండి బటన్ నొక్కండి.',
    hi: 'यह OTP समाप्त हो गया है। कृपया रीसेंड बटन दबाएं।',
  },
  otpMaxAttempts: {
    en: 'Maximum attempts exceeded. Please request a new OTP.',
    te: 'పరిమితి మించిపోయింది. దయచేసి కొత్త OTP కోసం అభ్యర్థించండి.',
    hi: 'अधिकतम प्रयास पार हो गए। कृपया नया OTP प्राप्त करें।',
  },
  registerName: {
    en: 'Please enter your full name.',
    te: 'దయచేసి మీ పూర్తి పేరును నమోదు చేయండి.',
    hi: 'कृपया अपना पूरा नाम दर्ज करें।',
  },
  registerPhone: {
    en: 'Please enter your mobile number.',
    te: 'దయచేసి మీ మొబైల్ నంబరును నమోదు చేయండి.',
    hi: 'कृपया अपना मोबाइल नंबर दर्ज करें।',
  },
  registerPassword: {
    en: 'Please create your password.',
    te: 'దయచేసి మీ పాస్‌వర్డ్‌ను తయారు చేయండి.',
    hi: 'कृपया अपना पासवर्ड बनाएं।',
  },
  registerRole: {
    en: 'Please select Farmer or Buyer.',
    te: 'దయచేసి రైతు లేదా కొనుగోలుదారుని ఎంచుకోండి.',
    hi: 'कृपया किसान या खरीदार का चयन करें।',
  },
  // Step-by-Step Listing Prompts
  listStepWasteType: {
    en: 'Step 1: Please select your crop residue type.',
    te: 'మొదటి దశ: దయచేసి మీ పంట వ్యర్థ రకాన్ని ఎంచుకోండి.',
    hi: 'चरण 1: कृपया अपनी फसल अवशेष का प्रकार चुनें।',
  },
  listStepQuantity: {
    en: 'Step 2: Please enter the quantity in tons or quintals.',
    te: 'రెండవ దశ: దయచేసి పరిమాణాన్ని టన్నులు లేదా క్వింటాళ్లలో నమోదు చేయండి.',
    hi: 'चरण 2: कृपया मात्रा टनों या क्विंटलों में दर्ज करें।',
  },
  listStepPrice: {
    en: 'Step 3: Enter your expected price per ton, or leave blank for buyer offers.',
    te: 'మూడవ దశ: టన్నుకు ఆశించిన ధరను నమోదు చేయండి, లేదా ఖాళీగా ఉంచండి.',
    hi: 'चरण 3: प्रति टन अपेक्षित मूल्य दर्ज करें, या खाली छोड़ें।',
  },
  listStepLocation: {
    en: 'Step 4: Confirm your farm location or village name.',
    te: 'నాల్గవ దశ: మీ పొలం స్థానం లేదా గ్రామ పేరును నిర్ధారించండి.',
    hi: 'चरण 4: अपने खेत का स्थान या गांव का नाम दर्ज करें।',
  },
  listStepPhoto: {
    en: 'Step 5: Please take a photo of your crop residue.',
    te: 'ఐదవ దశ: దయచేసి మీ పంట వ్యర్థాల ఫోటో తీయండి.',
    hi: 'चरण 5: कृपया अपने फसल अवशेष की फोटो खींचें।',
  },
  listStepReview: {
    en: 'Final Step: Please review your waste details and tap Submit.',
    te: 'చివరి దశ: వివరాలు సరిచూసుకుని సమర్పించండి.',
    hi: 'अंतिम चरण: विवरण की जांच करें और सबमिट करें।',
  },
};

// Internal active speech listeners set
const speechListeners = new Set();
let watchdogTimer = null;
let pollTimer = null;

const clearTimers = () => {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

const notifyListeners = (isSpeaking) => {
  speechListeners.forEach((listener) => {
    try {
      listener(isSpeaking);
    } catch {
      // ignore
    }
  });
};

/**
 * Register a speech listener and return an unsubscribe function.
 */
export const addSpeechListener = (listener) => {
  if (typeof listener === 'function') {
    speechListeners.add(listener);
    return () => speechListeners.delete(listener);
  }
  return () => {};
};

export const setSpeechListener = (listener) => {
  speechListeners.clear();
  if (typeof listener === 'function') {
    speechListeners.add(listener);
  }
};

/**
 * Speak text in the target language safely with full event callbacks and auto-recovery watchdog.
 */
export const speakVoice = (text, langCode = 'en', onDone = null) => {
  if (!text) return;
  try {
    clearTimers();
    Speech.stop();

    notifyListeners(true);

    let completed = false;
    const finalize = () => {
      if (completed) return;
      completed = true;
      clearTimers();
      notifyListeners(false);
      if (onDone) {
        try {
          onDone();
        } catch {
          // ignore
        }
      }
    };

    // Safety Watchdog: estimated duration based on text length + 3s margin (min 5s, max 20s)
    const wordCount = text.trim().split(/\s+/).length;
    const estimatedDurationMs = Math.max(5000, Math.min(20000, (wordCount / 2.2) * 1000 + 3000));
    watchdogTimer = setTimeout(() => {
      finalize();
    }, estimatedDurationMs);

    // Periodic check to detect when speech ends or fails natively on Android
    let pollCount = 0;
    pollTimer = setInterval(async () => {
      pollCount++;
      // Give TTS engine at least 1.2s to start before assuming it failed to start
      if (pollCount >= 2) {
        try {
          const speaking = await Speech.isSpeakingAsync();
          if (!speaking) {
            finalize();
          }
        } catch {
          finalize();
        }
      }
    }, 600);

    const voiceLang = SPEECH_LANG_MAP[langCode] || 'en-US';
    Speech.speak(text, {
      language: voiceLang,
      pitch: 1.0,
      rate: Platform.OS === 'ios' ? 0.9 : 0.85,
      onDone: () => finalize(),
      onStopped: () => finalize(),
      onError: () => finalize(),
    });
  } catch (err) {
    console.warn('[VoiceAssistant] Speech error:', err.message);
    clearTimers();
    notifyListeners(false);
    if (onDone) onDone();
  }
};

/**
 * Stop any ongoing voice speech immediately.
 */
export const stopVoice = () => {
  try {
    clearTimers();
    Speech.stop();
  } catch (err) {
    // ignore
  } finally {
    notifyListeners(false);
  }
};

/**
 * Speak a predefined prompt by key and language.
 */
export const speakPrompt = (promptKey, langCode = 'en', onDone = null) => {
  const promptGroup = VOICE_PROMPTS[promptKey];
  if (!promptGroup) return;
  const text = promptGroup[langCode] || promptGroup.en;
  speakVoice(text, langCode, onDone);
};

/**
 * Speak the full screen-by-screen guidance for a specific screenKey.
 */
export const speakScreenGuide = (screenKey, langCode = 'en', onDone = null) => {
  const guide = SCREEN_GUIDES[screenKey];
  if (!guide || !guide.speech) return;
  const text = guide.speech[langCode] || guide.speech.en;
  speakVoice(text, langCode, onDone);
};

/**
 * Check if speech is actively speaking (wrapper around expo-speech)
 */
export const isVoiceSpeaking = async () => {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
};

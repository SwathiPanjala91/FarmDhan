# FarmDhan (ఫార్మ్‌ధన్ / फार्मधन) 🌾
### Smart Agricultural Residue & Waste Marketplace Mobile Application

> **"Turn Agricultural Waste into Value."**

FarmDhan is a full-stack mobile marketplace application that connects Indian farmers and Farmer Producer Organizations (FPOs) with buyers of agricultural waste and crop residues (paddy straw, wheat straw, sugarcane bagasse, cotton stalks, maize stover, and groundnut shells).

Instead of burning stubble and causing severe environmental pollution and soil nutrient degradation, farmers can list their crop residues, discover verified industrial buyers, compare prices transparently, and choose the most suitable buyer.

---

## 🌟 Core System Principles

1. **Farmer Autonomy**: The system calculates multi-criteria matching scores and sorts buyer offers by price, but **the farmer always makes the final buyer selection**. Agricultural waste is **never** automatically sold without explicit farmer confirmation.
2. **Weighted Scoring Buyer Matching**: Matches suitable buyers based on **Price (50%)**, **Waste Compatibility (20%)**, **Distance (20%)**, and **Quantity Match (10%)**.
3. **Descending Price-Based Sorting**: Buyer offers are sorted in strict descending order (`b.price - a.price`) so farmers can immediately see the highest offered price.
4. **Multilingual & Rural Accessible**: Built-in support for **English**, **Telugu (తెలుగు)**, and **Hindi (हिंदी)**, designed with high contrast, large buttons, and simple navigation.
5. **AI Advisory & Voice Interaction**: Integrated with **Gemini AI** (`gemini-3.8-flash`) with speech-to-text input and text-to-speech audio readout for farmers.

---

## 🏗️ Architecture & Technology Stack

```text
FarmDhan/
│
├── mobile/                        # React Native / Expo Mobile Application
│   ├── src/
│   │   ├── components/            # Reusable UI (Header, Button, Card, MetricTile, StatusBadge)
│   │   ├── constants/             # Theme (Rural Agriculture Palette), Translations (EN, TE, HI)
│   │   ├── contexts/              # AuthContext (Auth, JWT, Multilingual state)
│   │   ├── navigation/            # AppNavigator (Auth stack, Farmer Tabs, Buyer Tabs)
│   │   ├── screens/
│   │   │   ├── auth/              # SplashScreen, OnboardingScreen, LoginScreen, RegisterScreen
│   │   │   ├── farmer/            # FarmerDashboard, ListWasteScreen, MyListingsScreen,
│   │   │   │                      # BuyerMatchingScreen, PriceComparisonScreen,
│   │   │   │                      # NearbyBuyersScreen, AIAssistantScreen
│   │   │   ├── buyer/             # BuyerDashboard, BrowseListingsScreen, CreateRequirementScreen
│   │   │   └── common/            # SupportScreen (FPOs/Helpline), NotificationsScreen,
│   │   │                          # MarketInsightsScreen, ProfileScreen
│   │   └── services/              # API Client (RESTful HTTP service with JWT injection)
│   ├── App.js                     # Root Provider Setup
│   └── package.json
│
└── server/                        # Node.js & Express.js REST API
    ├── config/                    # MongoDB Connection (with zero-config in-memory fallback), JWT config
    ├── controllers/               # Auth, Listings, Buyers, Matching, Offers, Transactions, AI, Support, Insights
    ├── middleware/                # JWT Auth, Role-based access control, Centralized Error Handler
    ├── models/                    # User, FarmerProfile, BuyerProfile, WasteListing, BuyerOffer,
    │                              # Transaction, Notification, FPO
    ├── routes/                    # RESTful Route handlers
    ├── seeds/                     # Comprehensive Indian agricultural seed data
    ├── services/                  # Matching Engine, Haversine Distance, Gemini AI, Notifications
    ├── tests/                     # Automated test suite
    ├── server.js                  # Express Entrypoint
    └── package.json
```

---

## ⚡ Quick Start Guide

### 1. Start the Backend REST API

```bash
cd server
npm install
npm run seed       # Seeds realistic Indian agricultural buyers, listings, and FPOs
npm start          # Starts server on http://localhost:5000
```

> **Note on Database**: If you have a local MongoDB daemon or MongoDB Atlas URI, specify it in `server/.env`. If not, `server` automatically spins up an in-memory MongoDB database so it runs out-of-the-box!

### 2. Run Automated Test Suite

```bash
cd server
npm test
```
Tests:
- Haversine geodesic distance calculation
- Weighted multi-criteria matching engine (50% Price, 20% Waste, 20% Dist, 10% Qty)
- Descending price comparison sorting (`b.price - a.price`)
- Gemini AI agricultural advisory and Telugu/Hindi multilingual fallback
- Farmer autonomy validation

### 3. Start the Mobile Application

```bash
cd mobile
npx expo start
```
- Press `a` for Android emulator / Android device
- Press `w` for Web preview
- Or scan the QR code with the **Expo Go** app on any Android smartphone.

---

## 🔐 Authentication

FarmDhan uses secure JWT-based authentication with OTP verification.

Users can register and authenticate as:
- 🌾 Farmer
- 🏭 Buyer

No default demo accounts or hardcoded user credentials are included.

---

## 📡 REST API Summary

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new Farmer or Buyer | Public |
| `POST` | `/api/auth/login` | Login and obtain JWT token | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Private |
| `POST` | `/api/listings` | Create agricultural residue listing | Farmer |
| `GET` | `/api/listings` | Browse listings with filters | Public |
| `GET` | `/api/listings/my` | Farmer's active & completed listings | Farmer |
| `GET` | `/api/matching/:listingId` | **Weighted Scoring Algorithm** recommendations | Public |
| `GET` | `/api/matching/:listingId/price-comparison` | **Price-based descending sorting** | Public |
| `GET` | `/api/buyers/nearby` | Distance-based nearby buyer discovery | Public |
| `POST` | `/api/offers` | Buyer submits price offer on listing | Buyer |
| `POST` | `/api/transactions` | Farmer confirms chosen buyer | Farmer |
| `GET` | `/api/transactions` | User's transactions and pickup tracker | Private |
| `POST` | `/api/ai/chat` | Gemini AI agricultural assistant | Public |
| `GET` | `/api/support/fpos` | FPO Directory & Collection Hubs | Public |
| `GET` | `/api/support/helpline` | Kisan Helpline and toll-free contact | Public |
| `GET` | `/api/insights` | Market demand analytics & benchmarks | Public |

---

## ⚖️ License
Built for Smart India Hackathon (SIH) — Agricultural Residue Valorization.

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

const app = express();

// Express Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'FarmDhan REST API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/listings', require('./routes/listingRoutes'));
app.use('/api/buyers', require('./routes/buyerRoutes'));
app.use('/api/matching', require('./routes/matchingRoutes'));
app.use('/api/offers', require('./routes/offerRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/insights', require('./routes/insightsRoutes'));

// Root route
app.get('/', (req, res) => {
  res.send('🌾 FarmDhan API is running. Access endpoints under /api/*');
});

// Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 [FarmDhan Server] Running on port ${PORT} (bound to 0.0.0.0)`);
      console.log(`🌾 Local: http://localhost:${PORT}`);
      console.log(`🌾 API documentation and endpoints accessible at /api/*`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;

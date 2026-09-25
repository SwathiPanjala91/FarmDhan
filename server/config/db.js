const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farmdhan';
  const useFallback = process.env.USE_MEMORY_DB_FALLBACK !== 'false';

  try {
    console.log(`[Database] Attempting connection to ${uri}...`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[Database] MongoDB connected successfully to ${mongoose.connection.host}`);
  } catch (err) {
    console.warn(`[Database] Could not connect to MongoDB at ${uri}: ${err.message}`);
    if (useFallback) {
      console.log('[Database] Starting in-memory MongoDB fallback server...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongoMemoryServer = await MongoMemoryServer.create({
          instance: {
            launchTimeout: 60000,
          },
        });
        const memoryUri = mongoMemoryServer.getUri();
        await mongoose.connect(memoryUri);
        console.log(`[Database] In-memory MongoDB connected successfully at ${memoryUri}`);
      } catch (memErr) {
        console.error('[Database] Failed to start in-memory MongoDB:', memErr.message);
        throw memErr;
      }
    } else {
      throw err;
    }
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
};

module.exports = { connectDB, disconnectDB };

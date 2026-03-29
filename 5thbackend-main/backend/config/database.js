import mongoose from 'mongoose';
import 'dotenv/config';

const { MONGO_URI } = process.env;

// A small retry/backoff wrapper to make Atlas connection more resilient for local dev
const connectWithRetry = async (uri, opts = {}, maxAttempts = 5) => {
  let attempt = 0;
  const baseDelay = 2000; // ms

  while (attempt < maxAttempts) {
    try {
      attempt += 1;
      console.log(`🔌 Attempting MongoDB connection (attempt ${attempt}/${maxAttempts})`);
      await mongoose.connect(uri, opts);
      console.log('✅ DB Connection Success');
      return;
    } catch (err) {
      console.error(`⚠️ MongoDB connection attempt ${attempt} failed:`, err && err.message ? err.message : err);
      if (attempt >= maxAttempts) {
        throw err;
      }
      const delay = baseDelay * attempt;
      console.log(`⏳ Waiting ${delay}ms before retrying...`);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, delay));
    }
  }
};

export const connect = async () => {
  console.log('🔍 MONGO_URI from env:', MONGO_URI ? 'Found' : 'Not found');
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI is undefined! Check your .env file');
    process.exit(1);
  }

  const options = {
    // recommended options
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // tune timeouts for slower networks / paused clusters
    serverSelectionTimeoutMS: 10000, // 10s
    connectTimeoutMS: 10000,
  };

  try {
    await connectWithRetry(MONGO_URI, options, 5);

    // attach helpful event listeners
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ Mongoose disconnected');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('🔁 Mongoose reconnected');
    });
  } catch (err) {
    console.error('❌ Could not connect to MongoDB after retries:', err);
    console.error('Possible causes: Atlas cluster paused, network/IP access blocked, wrong credentials, or DNS issues.');
    console.error('Quick checks: 1) Is your cluster running in Atlas? 2) Is your IP allowed (try 0.0.0.0/0 for testing)? 3) Is username/password correct?');
    // Do NOT exit the process here — surface the error so the server can start for local testing.
    // process.exit(1);
  }
};

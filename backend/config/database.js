import mongoose from 'mongoose';
import 'dotenv/config';

const { MONGO_URI } = process.env;

let cachedDb = null;

export const connect = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    console.log('✅ Using cached database connection');
    return cachedDb;
  }

  console.log('🔍 MONGO_URI from env:', MONGO_URI ? 'Found' : 'Not found');
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI is undefined!');
    throw new Error('MONGO_URI is undefined');
  }

  const options = {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  };

  try {
    console.log('🔌 Attempting MongoDB connection...');
    const db = await mongoose.connect(MONGO_URI, options);
    console.log('✅ DB Connection Success');
    cachedDb = db;
    return cachedDb;
  } catch (err) {
    console.error('❌ Could not connect to MongoDB:', err);
    throw err;
  }
};

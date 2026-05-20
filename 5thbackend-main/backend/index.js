import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { connect } from './config/database.js';
import mongoose from 'mongoose';

// Import routes
import cryptoRoutes from './Routes/CryptoRoutes.js';
import authRoutes from './Routes/AuthRoutes.js';
import alertRoutes from './Routes/AlertRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Connect to DB (in serverless, this will reuse connection if possible)
connect().catch(err => console.error('Initial DB connection error:', err));

// Register API routes
app.use('/api', cryptoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', alertRoutes);

// Health endpoint
app.get('/api/health', (req, res) => {
    const mongooseState = mongoose.connection ? mongoose.connection.readyState : 0;
    const stateMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };

    res.json({
        serverTime: new Date(),
        db: {
            readyState: mongooseState,
            status: stateMap[mongooseState] || 'unknown',
        }
    });
});

// For local development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
        console.log(`🚀 Local server running at http://localhost:${PORT}`);
    });
}

export default app;

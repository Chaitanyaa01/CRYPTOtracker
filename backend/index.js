import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { connect } from './config/database.js';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import cryptoRoutes from './Routes/CryptoRoutes.js';
import authRoutes from './Routes/AuthRoutes.js';
import alertRoutes from './Routes/AlertRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend static files if they exist
const buildPath = path.join(__dirname, '../frontend/build');
if (process.env.NODE_ENV === 'production' || !process.env.VERCEL) {
    app.use(express.static(buildPath));
}

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

// Serve React app for any non-API route
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    const indexPath = path.join(buildPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.log('Frontend not available, sending API message');
            res.status(500).json({ message: 'Frontend build not available' });
        }
    });
});

// Start server unless running on Vercel (serverless)
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
}

export default app;

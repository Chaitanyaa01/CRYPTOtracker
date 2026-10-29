import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connect } from './config/database.js';
import mongoose from 'mongoose';
import { fetchData, startScheduledFetch, getFetchStatus } from './controller/Crypto.js';

import cryptoRoutes from './Routes/CryptoRoutes.js';
import authRoutes from './Routes/AuthRoutes.js';
import alertRoutes from './Routes/AlertRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendBuildPath = path.resolve(__dirname, '../frontend/build');

const app = express();

app.use(cors());
app.use(express.json());


connect()
  .then(async () => {
    console.log('📡 DB ready — running initial crypto fetch and starting scheduler');
    await fetchData().catch(err => console.warn('Initial fetch failed:', err?.message || err));
    startScheduledFetch('*/5 * * * *');
  })
  .catch(err => console.error('Initial DB connection error:', err));


app.use('/api', cryptoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', alertRoutes);


app.get('/api/health', (req, res) => {
    const mongooseState = mongoose.connection ? mongoose.connection.readyState : 0;
    const stateMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };
    const { lastFetchAt, lastFetchSuccess } = getFetchStatus();

    res.json({
        serverTime: new Date(),
        db: {
            readyState: mongooseState,
            status: stateMap[mongooseState] || 'unknown',
        },
        crypto: {
            lastFetchAt,
            lastFetchSuccess,
        },
    });
});




if (fs.existsSync(frontendBuildPath)) {
    console.log(`📦 Serving production frontend build from ${frontendBuildPath}`);
    app.use(express.static(frontendBuildPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
}

if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
}

export default app;

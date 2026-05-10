import express from 'express';
import cors from 'cors';

import 'dotenv/config';
import { connect } from './config/database.js'; // Include `.js` if using ES modules

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());


connect();

// Import routes
import cryptoRoutes from './Routes/CryptoRoutes.js';
import authRoutes from './Routes/AuthRoutes.js';
import alertRoutes from './Routes/AlertRoutes.js';
import mongoose from 'mongoose';
import { startScheduledFetch, fetchData, getFetchStatus } from './controller/Crypto.js';

// Register API routes
app.use('/api', cryptoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', alertRoutes);


import path from 'path';
import fs from 'fs';

const frontendBuildPath = path.resolve('../frontend/build');
const indexHtmlPath = path.join(frontendBuildPath, 'index.html');

if (fs.existsSync(frontendBuildPath) && fs.existsSync(indexHtmlPath)) {
    console.log('📦 Serving frontend from', frontendBuildPath);
    app.use(express.static(frontendBuildPath));

    // SPA fallback for client-side routes
    app.get(['/login', '/signup', '/'], (req, res) => {
        res.sendFile(indexHtmlPath);
    });
} else {
    // Development / fallback JSON responses so developer tools and tests still work
    app.get('/login', (req, res) => {
        res.json({ page: 'login', message: 'Login page route (frontend handles rendering)' });
    });

    app.get('/signup', (req, res) => {
        res.json({ page: 'signup', message: 'Signup page route (frontend handles rendering)' });
    });

    app.get('/', (req, res) => {
        res.json({ message: 'API root. Use /api/auth for authentication endpoints.' });
    });
}



app.listen(PORT, () => {
        console.log(`🚀 Server is running at http://localhost:${PORT}`);
        console.log(`🔐 Authentication endpoints available at /api/auth`);
        console.log(`📊 Crypto API available at /api`);
});

// If DB is connected, trigger an initial fetch and start the scheduled fetches
const startCryptoTasksIfDbReady = async () => {
    // mongoose readyState: 0 = disconnected, 1 = connected
    if (mongoose.connection && mongoose.connection.readyState === 1) {
        try {
            console.log('📡 DB ready — running initial crypto fetch and starting scheduler');
            await fetchData();
            startScheduledFetch();
        } catch (err) {
            console.error('Error running initial fetch:', err && err.message ? err.message : err);
        }
    } else {
        console.log('📡 DB not ready yet; will attempt to start crypto tasks in 5s');
        setTimeout(startCryptoTasksIfDbReady, 5000);
    }
};

startCryptoTasksIfDbReady();

// Health endpoint
app.get('/api/health', (req, res) => {
    const mongooseState = mongoose.connection ? mongoose.connection.readyState : 0;
    const stateMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };

    const fetchStatus = getFetchStatus();

    res.json({
        serverTime: new Date(),
        db: {
            readyState: mongooseState,
            status: stateMap[mongooseState] || 'unknown',
        },
        crypto: fetchStatus,
    });
});

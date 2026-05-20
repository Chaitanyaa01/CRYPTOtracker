import express from 'express';
import { register, login, firebaseLogin, getProfile } from '../controller/Auth.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/firebase', firebaseLogin);

// Protected routes
router.get('/profile', authenticateToken, getProfile);

export default router;

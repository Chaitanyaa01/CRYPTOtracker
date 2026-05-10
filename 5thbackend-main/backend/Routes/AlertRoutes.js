import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { createAlert, deleteAlert, getAlerts, updateAlert } from '../controller/Alert.js';

const router = express.Router();

router.get('/alerts', authenticateToken, getAlerts);
router.post('/alerts', authenticateToken, createAlert);
router.patch('/alerts/:alertId', authenticateToken, updateAlert);
router.delete('/alerts/:alertId', authenticateToken, deleteAlert);

export default router;

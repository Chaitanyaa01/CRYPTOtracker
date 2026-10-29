import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { createAlert, deleteAlert, getAlerts, updateAlert, testEmailAlert, alertStream } from '../controller/Alert.js';

const router = express.Router();

router.get('/alerts', authenticateToken, getAlerts);
router.get('/alerts/stream', authenticateToken, alertStream);
router.post('/alerts', authenticateToken, createAlert);
router.post('/alerts/test-email', authenticateToken, testEmailAlert);
router.patch('/alerts/:alertId', authenticateToken, updateAlert);
router.delete('/alerts/:alertId', authenticateToken, deleteAlert);

export default router;

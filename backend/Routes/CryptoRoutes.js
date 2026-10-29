import express from 'express';
import { getCurrentCoins, getHistoryData, triggerHistoryDataFetch, getMarketChart } from '../controller/Crypto.js';

const router = express.Router();

router.get('/coins', getCurrentCoins);
router.get('/history', triggerHistoryDataFetch);
router.post('/history', triggerHistoryDataFetch);
router.get('/history/:coinId', getHistoryData);
router.get('/market-chart/:coinId', getMarketChart);

export default router;
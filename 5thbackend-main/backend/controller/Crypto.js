import axios from 'axios';
import cron from 'node-cron';
import CurrentData from '../Model/CurrentData.js';
import HistoryData from '../Model/HistoryData.js';
import { evaluateAlertsForCoins } from './Alert.js';

const fetchData = async () => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 50,
        page: 1,
        sparkline: false,
        price_change_percentage: '1h,24h,7d',
      },
    });

    const coins = response.data;

    for (const coinData of coins) {
      await CurrentData.findOneAndUpdate(
        { coin_id: coinData.id },
        {
          name: coinData.name,
          symbol: coinData.symbol,
          price_usd: coinData.current_price,
          market_cap: coinData.market_cap || 0,
          change_24h_pct: coinData.price_change_percentage_24h || 0,
          change_1h_pct: coinData.price_change_percentage_1h_in_currency,
          change_7d_pct: coinData.price_change_percentage_7d_in_currency,
          image: coinData.image || '',
          market_cap_rank: coinData.market_cap_rank,
          volume_24h: coinData.total_volume,
          high_24h: coinData.high_24h,
          low_24h: coinData.low_24h,
          circulating_supply: coinData.circulating_supply,
          total_supply: coinData.total_supply,
          fully_diluted_valuation: coinData.fully_diluted_valuation,
          ath: coinData.ath,
          atl: coinData.atl,
          last_updated: coinData.last_updated ? new Date(coinData.last_updated) : undefined,
          timestamp: new Date(),
        },
        { upsert: true, new: true }
      );

      const historyEntry = new HistoryData({
        coin_id: coinData.id,
        name: coinData.name,
        symbol: coinData.symbol,
        price_usd: coinData.current_price,
        market_cap: coinData.market_cap || 0,
        change_24h_pct: coinData.price_change_percentage_24h || 0,
        volume_24h: coinData.total_volume,
        market_cap_rank: coinData.market_cap_rank,
        timestamp: new Date(),
      });
      await historyEntry.save();
    }

    try {
      await evaluateAlertsForCoins(coins);
    } catch (alertError) {
      console.warn('Alert evaluation failed:', alertError && alertError.message ? alertError.message : alertError);
    }
    console.log('Cryptocurrency data fetched and saved successfully to CurrentData and HistoryData!');
    // update last-fetch metadata
    lastFetchAt = new Date();
    lastFetchSuccess = true;
    return true;
  } catch (error) {
    console.error('Error fetching or saving cryptocurrency data:', error && error.message ? error.message : error);
    lastFetchAt = new Date();
    lastFetchSuccess = false;
    return false;
  }
};

// Expose a function to start periodic fetching once DB is confirmed connected
const startScheduledFetch = (cronExpression = '*/5 * * * *') => {
  // default: every 5 minutes to be gentler on rate limits
  console.log('⏰ Scheduling fetch with expression:', cronExpression);
  cron.schedule(cronExpression, async () => {
    console.log('⏰ Running scheduled fetch...');
    const ok = await fetchData();
    if (!ok) console.warn('⚠️ Scheduled fetch failed (will retry on next cron run)');
  });
};

// last fetch metadata
let lastFetchAt = null;
let lastFetchSuccess = null;

const getFetchStatus = () => ({
  lastFetchAt,
  lastFetchSuccess,
});

export const getCurrentCoins = async (req, res) => {
  try {
    const coins = await CurrentData.find({}).sort({ market_cap_rank: 1 });
    res.json(coins);
  } catch (error) {
    console.error('Error fetching current data from DB:', error.message);
    res.status(500).json({ message: 'Error fetching current data' });
  }
};

export const getHistoryData = async (req, res) => {
  try {
    const { coinId } = req.params;
    console.log('Fetching history for coinId:', coinId);
    const history = await HistoryData.find({ coin_id: coinId });
    res.json(history);
  } catch (error) {
    console.error('Error fetching history data from DB:', error.message);
    res.status(500).json({ message: 'Error fetching history data' });
  }
};

export const triggerHistoryDataFetch = async (req, res) => {
  try {
    await fetchData();
    res.status(200).json({ message: 'Historical data fetch triggered successfully!' });
  } catch (error) {
    console.error('Error triggering historical data fetch:', error.message);
    res.status(500).json({ message: 'Error triggering historical data fetch' });
  }
};

export { fetchData, startScheduledFetch, getFetchStatus };

import mongoose from 'mongoose';

const CurrentDataSchema = new mongoose.Schema({
  coin_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  price_usd: {
    type: Number,
    required: true
  },
  market_cap: {
    type: Number,
    required: true
  },
  change_24h_pct: {
    type: Number,
    required: true
  },
  change_1h_pct: {
    type: Number,
  },
  change_7d_pct: {
    type: Number,
  },
  image: {
    type: String,
    default: '',
  },
  market_cap_rank: {
    type: Number,
  },
  volume_24h: {
    type: Number,
  },
  high_24h: {
    type: Number,
  },
  low_24h: {
    type: Number,
  },
  circulating_supply: {
    type: Number,
  },
  total_supply: {
    type: Number,
  },
  fully_diluted_valuation: {
    type: Number,
  },
  ath: {
    type: Number,
  },
  atl: {
    type: Number,
  },
  last_updated: {
    type: Date,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  }
});

export default mongoose.model('CurrentData', CurrentDataSchema);

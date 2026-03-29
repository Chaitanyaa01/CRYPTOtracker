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
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  }
});

export default mongoose.model('CurrentData', CurrentDataSchema);

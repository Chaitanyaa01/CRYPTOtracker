// backend/Model/Alert.js
import mongoose from "mongoose";

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coinId: {
    type: String,
    required: true // e.g., 'bitcoin'
  },
  targetPrice: {
    type: Number,
    required: true
  },
  condition: {
    type: String,
    enum: ['above', 'below'], // E.g., Alert me when BTC goes 'above' 70000
    required: true
  },
  isTriggered: {
    type: Boolean,
    default: false
  }
});

export default mongoose.model("Alert", alertSchema);
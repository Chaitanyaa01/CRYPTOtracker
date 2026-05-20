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
    required: true
  },
  coinName: {
    type: String,
    required: true
  },
  targetPrice: {
    type: Number,
    required: true
  },
  condition: {
    type: String,
    enum: ['above', 'below'],
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  isTriggered: {
    type: Boolean,
    default: false
  },
  triggeredPrice: {
    type: Number
  },
  lastCheckedAt: {
    type: Date
  },
  lastTriggeredAt: {
    type: Date
  }
}, { timestamps: true });

alertSchema.index({ userId: 1, coinId: 1, active: 1 });

export default mongoose.model("Alert", alertSchema);

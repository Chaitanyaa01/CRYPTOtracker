import Alert from '../Model/Alert.js';
import CurrentData from '../Model/CurrentData.js';

const serializeAlert = (alert) => ({
  id: alert._id,
  coinId: alert.coinId,
  coinName: alert.coinName,
  targetPrice: alert.targetPrice,
  condition: alert.condition,
  active: alert.active,
  isTriggered: alert.isTriggered,
  triggeredPrice: alert.triggeredPrice,
  lastCheckedAt: alert.lastCheckedAt,
  lastTriggeredAt: alert.lastTriggeredAt,
  createdAt: alert.createdAt,
  updatedAt: alert.updatedAt,
});

const didTrigger = (price, targetPrice, condition) => {
  if (condition === 'above') return price >= targetPrice;
  if (condition === 'below') return price <= targetPrice;
  return false;
};

export const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({
      success: true,
      alerts: alerts.map(serializeAlert),
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ success: false, message: 'Could not load alerts' });
  }
};

export const createAlert = async (req, res) => {
  try {
    const { coinId, targetPrice, condition } = req.body;
    const numericTarget = Number(targetPrice);

    if (!coinId || !Number.isFinite(numericTarget) || numericTarget <= 0 || !['above', 'below'].includes(condition)) {
      return res.status(400).json({
        success: false,
        message: 'Provide coinId, a positive targetPrice, and condition above or below',
      });
    }

    const coin = await CurrentData.findOne({ coin_id: coinId });
    if (!coin) {
      return res.status(404).json({ success: false, message: 'Coin not found' });
    }

    const alert = new Alert({
      userId: req.userId,
      coinId,
      coinName: coin.name,
      targetPrice: numericTarget,
      condition,
      lastCheckedAt: new Date(),
    });

    if (didTrigger(coin.price_usd, numericTarget, condition)) {
      alert.isTriggered = true;
      alert.triggeredPrice = coin.price_usd;
      alert.lastTriggeredAt = new Date();
    }

    await alert.save();
    res.status(201).json({ success: true, alert: serializeAlert(alert) });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ success: false, message: 'Could not create alert' });
  }
};

export const updateAlert = async (req, res) => {
  try {
    const { targetPrice, condition, active, resetTriggered } = req.body;
    const alert = await Alert.findOne({ _id: req.params.alertId, userId: req.userId });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    if (targetPrice !== undefined) {
      const numericTarget = Number(targetPrice);
      if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
        return res.status(400).json({ success: false, message: 'Target price must be a positive number' });
      }
      alert.targetPrice = numericTarget;
      alert.isTriggered = false;
      alert.triggeredPrice = undefined;
      alert.lastTriggeredAt = undefined;
    }

    if (condition !== undefined) {
      if (!['above', 'below'].includes(condition)) {
        return res.status(400).json({ success: false, message: 'Condition must be above or below' });
      }
      alert.condition = condition;
      alert.isTriggered = false;
      alert.triggeredPrice = undefined;
      alert.lastTriggeredAt = undefined;
    }

    if (active !== undefined) {
      alert.active = Boolean(active);
    }

    if (resetTriggered) {
      alert.isTriggered = false;
      alert.triggeredPrice = undefined;
      alert.lastTriggeredAt = undefined;
    }

    await alert.save();
    res.json({ success: true, alert: serializeAlert(alert) });
  } catch (error) {
    console.error('Update alert error:', error);
    res.status(500).json({ success: false, message: 'Could not update alert' });
  }
};

export const deleteAlert = async (req, res) => {
  try {
    const deleted = await Alert.findOneAndDelete({ _id: req.params.alertId, userId: req.userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    res.json({ success: true, message: 'Alert deleted' });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ success: false, message: 'Could not delete alert' });
  }
};

export const evaluateAlertsForCoins = async (coins) => {
  if (!Array.isArray(coins) || coins.length === 0) return;

  const priceByCoinId = new Map(
    coins
      .filter((coin) => coin?.id && Number.isFinite(Number(coin.current_price)))
      .map((coin) => [coin.id, Number(coin.current_price)])
  );

  const alerts = await Alert.find({
    active: true,
    isTriggered: false,
    coinId: { $in: [...priceByCoinId.keys()] },
  });

  const now = new Date();

  await Promise.all(alerts.map(async (alert) => {
    const price = priceByCoinId.get(alert.coinId);
    alert.lastCheckedAt = now;

    if (didTrigger(price, alert.targetPrice, alert.condition)) {
      alert.isTriggered = true;
      alert.triggeredPrice = price;
      alert.lastTriggeredAt = now;
    }

    await alert.save();
  }));
};

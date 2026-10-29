import Alert from '../Model/Alert.js';
import CurrentData from '../Model/CurrentData.js';
import User from '../Model/User.js';
import { sendPriceAlertEmail } from '../utils/mailer.js';

const serializeAlert = (alert) => ({
  id: alert._id,
  coinId: alert.coinId,
  coinName: alert.coinName,
  targetPrice: alert.targetPrice,
  condition: alert.condition,
  active: alert.active,
  isTriggered: alert.isTriggered,
  emailNotification: alert.emailNotification ?? true,
  emailSent: alert.emailSent || false,
  emailSentAt: alert.emailSentAt,
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
    res.status(500).json({ success: false, message: 'Could not fetch alerts' });
  }
};

export const createAlert = async (req, res) => {
  try {
    const { coinId, targetPrice, condition, emailNotification } = req.body;
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
      emailNotification: emailNotification !== undefined ? Boolean(emailNotification) : true,
      lastCheckedAt: new Date(),
    });

    if (didTrigger(coin.price_usd, numericTarget, condition)) {
      alert.isTriggered = true;
      alert.triggeredPrice = coin.price_usd;
      alert.lastTriggeredAt = new Date();

      if (alert.emailNotification) {
        try {
          const user = await User.findById(req.userId).select('email username');
          if (user?.email) {
            await sendPriceAlertEmail({
              email: user.email,
              username: user.username,
              coinName: alert.coinName,
              targetPrice: alert.targetPrice,
              currentPrice: coin.price_usd,
              condition: alert.condition,
              triggeredAt: alert.lastTriggeredAt,
            });
            alert.emailSent = true;
            alert.emailSentAt = alert.lastTriggeredAt;
          }
        } catch (emailErr) {
          console.warn('[Alert] Could not send initial triggered email:', emailErr.message);
        }
      }
    }

    await alert.save();
    if (alert.isTriggered) {
      broadcastAlertTriggered(alert);
    }
    res.status(201).json({ success: true, alert: serializeAlert(alert) });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ success: false, message: 'Could not create alert' });
  }
};

export const updateAlert = async (req, res) => {
  try {
    const { targetPrice, condition, active, resetTriggered, emailNotification } = req.body;
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
      alert.emailSent = false;
      alert.emailSentAt = undefined;
      alert.triggeredPrice = undefined;
      alert.lastTriggeredAt = undefined;
    }

    if (condition !== undefined) {
      if (!['above', 'below'].includes(condition)) {
        return res.status(400).json({ success: false, message: 'Condition must be above or below' });
      }
      alert.condition = condition;
      alert.isTriggered = false;
      alert.emailSent = false;
      alert.emailSentAt = undefined;
      alert.triggeredPrice = undefined;
      alert.lastTriggeredAt = undefined;
    }

    if (emailNotification !== undefined) {
      alert.emailNotification = Boolean(emailNotification);
    }

    if (active !== undefined) {
      alert.active = Boolean(active);
    }

    if (resetTriggered) {
      alert.isTriggered = false;
      alert.emailSent = false;
      alert.emailSentAt = undefined;
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

export const testEmailAlert = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('email username');
    if (!user || !user.email) {
      return res.status(404).json({ success: false, message: 'User or email address not found' });
    }

    const result = await sendPriceAlertEmail({
      email: user.email,
      username: user.username,
      coinName: 'Bitcoin (Test Alert)',
      targetPrice: 95000,
      currentPrice: 96500,
      condition: 'above',
      triggeredAt: new Date(),
    });

    let message = `Test notification sent successfully to ${user.email}!`;
    if (result.previewUrl) {
      message = `Test email sent! Click to preview: ${result.previewUrl}`;
    } else if (result.simulated) {
      message = `Test notification simulated! (Add SMTP_USER & SMTP_PASS in backend/.env for real delivery)`;
    }

    res.json({
      success: true,
      message,
      previewUrl: result.previewUrl || null,
      result,
    });
  } catch (err) {
    console.error('Test email alert error:', err);
    res.status(500).json({ success: false, message: 'Failed to send test email: ' + err.message });
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

      if (alert.emailNotification !== false && !alert.emailSent) {
        try {
          const user = await User.findById(alert.userId).select('email username');
          if (user?.email) {
            await sendPriceAlertEmail({
              email: user.email,
              username: user.username,
              coinName: alert.coinName,
              targetPrice: alert.targetPrice,
              currentPrice: price,
              condition: alert.condition,
              triggeredAt: now,
            });
            alert.emailSent = true;
            alert.emailSentAt = now;
          }
        } catch (mailErr) {
          console.warn(`[Alert] Failed to dispatch alert email for ${alert.coinName}:`, mailErr.message);
        }
      }

      broadcastAlertTriggered(alert);
    }

    await alert.save();
  }));
};

const sseClients = new Set();

export const alertStream = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const client = { id: Date.now(), userId: req.userId, res };
  sseClients.add(client);

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'HEARTBEAT' })}\n\n`);
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(client);
  });
};

export const broadcastAlertTriggered = (alert) => {
  const payload = `data: ${JSON.stringify({ type: 'ALERT_TRIGGERED', alert: serializeAlert(alert) })}\n\n`;
  for (const client of sseClients) {
    if (client.userId && client.userId.toString() === alert.userId.toString()) {
      try {
        client.res.write(payload);
      } catch (err) {
        console.warn('SSE client write error:', err.message);
      }
    }
  }
};


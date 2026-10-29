import nodemailer from 'nodemailer';

let transporter = null;
let etherealAccount = null;

export const getTransporter = async () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  // If user configured real credentials in .env
  if (host && user && pass && !user.includes('your_email@gmail.com')) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
    return transporter;
  }

  // Fallback: Automatic Ethereal test account (works immediately with zero configuration)
  try {
    if (!etherealAccount) {
      etherealAccount = await nodemailer.createTestAccount();
    }
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
    });
    console.log(`[Mailer] Initialized Ethereal test mailer (Add Gmail in backend/.env for real inbox delivery)`);
    return transporter;
  } catch (err) {
    console.warn('[Mailer] Could not initialize Ethereal test account:', err.message);
    return null;
  }
};

export const sendPriceAlertEmail = async ({
  email,
  username,
  coinName,
  coinSymbol,
  targetPrice,
  currentPrice,
  condition,
  triggeredAt = new Date(),
}) => {
  if (!email) {
    console.warn('[Mailer] No recipient email specified.');
    return { success: false, reason: 'No email specified' };
  }

  const isRealSmtp = Boolean(
    process.env.SMTP_USER &&
    !process.env.SMTP_USER.includes('your_email@gmail.com') &&
    process.env.SMTP_PASS &&
    !process.env.SMTP_PASS.includes('your_app_specific_password')
  );

  const from = isRealSmtp
    ? (process.env.SMTP_FROM || `"Crypto Tracker" <${process.env.SMTP_USER}>`)
    : '"Crypto Tracker" <alerts@cryptotracker.local>';

  const formattedTarget = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(targetPrice);

  const formattedCurrent = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(currentPrice);

  const isAbove = condition === 'above';
  const badgeColor = isAbove ? '#10b981' : '#f43f5e';
  const conditionLabel = isAbove ? 'Risen Above' : 'Fallen Below';
  const appUrl = process.env.CLIENT_URL || 'http://localhost:3000';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Crypto Price Alert</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f19; padding: 30px 15px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width: 560px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
                <!-- Header -->
                <tr>
                  <td style="padding: 28px 32px; background: linear-gradient(135deg, #1e1b4b, #111827); border-bottom: 1px solid #1f2937;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <span style="display: inline-block; background-color: #fbbf24; color: #000; font-weight: 900; font-size: 13px; padding: 5px 10px; border-radius: 8px; margin-right: 10px; vertical-align: middle;">CD</span>
                          <span style="font-size: 18px; font-weight: 700; color: #ffffff; vertical-align: middle;">Crypto Tracker Alert</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <p style="margin: 0 0 16px; font-size: 15px; color: #9ca3af;">
                      Hello <strong style="color: #f3f4f6;">${username || 'trader'}</strong>,
                    </p>
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #e5e7eb;">
                      Your price alert for <strong style="color: #fbbf24;">${coinName}</strong> was triggered because the market price has <strong>${conditionLabel.toLowerCase()}</strong> your target threshold.
                    </p>

                    <!-- Alert Card -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #182234; border: 1px solid #283548; border-radius: 12px; margin-bottom: 28px;">
                      <tr>
                        <td style="padding: 20px;">
                          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 6px;">Condition Triggered</div>
                          <div style="font-size: 18px; font-weight: 700; color: ${badgeColor}; margin-bottom: 16px;">
                            ${conditionLabel} ${formattedTarget}
                          </div>

                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-top: 10px; border-top: 1px solid #283548;">
                                <span style="font-size: 13px; color: #94a3b8;">Triggered Price:</span>
                              </td>
                              <td align="right" style="padding-top: 10px; border-top: 1px solid #283548;">
                                <strong style="font-size: 18px; color: #ffffff;">${formattedCurrent}</strong>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding-top: 8px;">
                                <span style="font-size: 13px; color: #94a3b8;">Trigger Time:</span>
                              </td>
                              <td align="right" style="padding-top: 8px;">
                                <span style="font-size: 13px; color: #cbd5e1;">${new Date(triggeredAt).toUTCString()}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${appUrl}" target="_blank" style="display: inline-block; background-color: #fbbf24; color: #0f172a; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);">
                            Open Dashboard & View Markets →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 32px; background-color: #0d131f; border-top: 1px solid #1f2937; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                      You received this email because you created a price alert on your Crypto Tracker account.<br>
                      Manage or delete your active alerts anytime on your dashboard.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  try {
    const transport = await getTransporter();

    if (!transport) {
      console.log(`\n======================================================`);
      console.log(`📬 [Mailer Sim] Price alert email simulated for: ${email}`);
      console.log(`   Coin: ${coinName} (${condition} ${formattedTarget})`);
      console.log(`======================================================\n`);
      return { success: true, simulated: true };
    }

    const info = await transport.sendMail({
      from,
      to: email,
      subject: `🚨 Price Alert: ${coinName} is now ${condition} ${formattedTarget} (${formattedCurrent})`,
      text: `Crypto Alert: ${coinName} has crossed your target price of ${formattedTarget}. Current price is ${formattedCurrent}. View your dashboard at ${appUrl}`,
      html: htmlContent,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    if (previewUrl) {
      console.log(`\n======================================================`);
      console.log(`📬 [Mailer] Test Email Sent!`);
      console.log(`🔗 Preview your delivered email here:`);
      console.log(`   ${previewUrl}`);
      console.log(`======================================================\n`);
    } else {
      console.log(`[Mailer] Price alert email delivered to ${email}. MessageId: ${info.messageId}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null,
      isRealSmtp,
    };
  } catch (error) {
    console.error(`[Mailer] Error sending alert email to ${email}:`, error);
    return { success: false, error: error.message };
  }
};

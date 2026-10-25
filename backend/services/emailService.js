const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

// Create Nodemailer SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  // Ignore SSL certificate verification issues for testing if needed
  tls: {
    rejectUnauthorized: false,
  },
});

const defaultFrom = process.env.EMAIL_FROM || '"Upper Store" <no-reply@upperstore.com>';

/**
 * Send Welcome Email to newly registered user
 */
const sendWelcomeEmail = async (userEmail, displayName) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`ℹ️ [Nodemailer] SMTP credentials not set. Skipping Welcome email to ${userEmail}.`);
    return;
  }

  const name = displayName || userEmail.split('@')[0];
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to Upper Store</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0b0e; color: #f8fafc; margin: 0; padding: 0; }
        .email-container { max-width: 600px; margin: 20px auto; background: #121217; border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 16px; overflow: hidden; }
        .email-header { background: linear-gradient(135deg, #18181f 0%, #0d0d11 100%); padding: 30px; text-align: center; border-bottom: 1px solid rgba(212, 175, 55, 0.2); }
        .logo-title { font-size: 26px; font-weight: 800; color: #d4af37; text-transform: uppercase; letter-spacing: 2px; margin: 0; }
        .email-body { padding: 30px; line-height: 1.6; color: #cbd5e1; }
        .welcome-badge { display: inline-block; background: rgba(212, 175, 55, 0.15); color: #d4af37; border: 1px solid rgba(212, 175, 55, 0.4); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #aa820a 100%); color: #0d0d0f; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 30px; margin-top: 20px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4); }
        .email-footer { background: #09090c; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.05); }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1 class="logo-title">UPPER STORE</h1>
        </div>
        <div class="email-body">
          <div class="welcome-badge">Account Created</div>
          <h2 style="color: #ffffff; margin-top: 0;">Welcome, ${name}!</h2>
          <p>Thank you for joining <strong>Upper Store</strong> — your elite destination for high-performance software, Android APKs, developer tools, and digital assets.</p>
          <p>Your account (<strong>${userEmail}</strong>) is now active and ready. You can now browse verified products, download software releases, leave reviews, and receive instant updates.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="cta-btn">Explore Product Catalog</a>
          </div>
          <p style="font-size: 13px; color: #94a3b8;">If you did not create this account, please contact our security team immediately.</p>
        </div>
        <div class="email-footer">
          &copy; ${new Date().getFullYear()} Upper Store — All Rights Reserved.
          
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: defaultFrom,
      to: userEmail,
      subject: 'Welcome to Upper Store - Account Activated',
      html: htmlContent,
    });
    console.log(` Welcome email sent to ${userEmail} (Msg ID: ${info.messageId})`);
  } catch (error) {
    console.error(` Error sending Welcome email to ${userEmail}:`, error.message);
  }
};

/**
 * Send Login Alert Email to user
 */
const sendLoginAlertEmail = async (userEmail, displayName, loginMethod = 'Email & Password') => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`ℹ [Nodemailer] SMTP credentials not set. Skipping Login alert to ${userEmail}.`);
    return;
  }

  const name = displayName || userEmail.split('@')[0];
  const loginTime = new Date().toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Login Security Alert</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0b0e; color: #f8fafc; margin: 0; padding: 0; }
        .email-container { max-width: 600px; margin: 20px auto; background: #121217; border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 16px; overflow: hidden; }
        .email-header { background: linear-gradient(135deg, #18181f 0%, #0d0d11 100%); padding: 30px; text-align: center; border-bottom: 1px solid rgba(212, 175, 55, 0.2); }
        .logo-title { font-size: 26px; font-weight: 800; color: #d4af37; text-transform: uppercase; letter-spacing: 2px; margin: 0; }
        .email-body { padding: 30px; line-height: 1.6; color: #cbd5e1; }
        .alert-badge { display: inline-block; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; }
        .info-box { background: rgba(255, 255, 255, 0.03); border-left: 3px solid #d4af37; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .email-footer { background: #09090c; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.05); }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1 class="logo-title">UPPER STORE</h1>
        </div>
        <div class="email-body">
          <div class="alert-badge">Security Notification</div>
          <h2 style="color: #ffffff; margin-top: 0;">New Account Sign-In Detected</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>We noticed a successful login to your <strong>Upper Store</strong> account.</p>
          <div class="info-box">
            <p style="margin: 0 0 5px 0;"><strong>Account:</strong> ${userEmail}</p>
            <p style="margin: 0 0 5px 0;"><strong>Login Method:</strong> ${loginMethod}</p>
            <p style="margin: 0;"><strong>Timestamp:</strong> ${loginTime}</p>
          </div>
          <p style="font-size: 13px; color: #94a3b8;">If this was you, no action is needed. If you did not log in, please secure your account credentials immediately.</p>
        </div>
        <div class="email-footer">
          &copy; ${new Date().getFullYear()} Upper Store — Security Alert Center.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: defaultFrom,
      to: userEmail,
      subject: 'Security Notification: New Login to Upper Store',
      html: htmlContent,
    });
    console.log(`Login alert email sent to ${userEmail} (Msg ID: ${info.messageId})`);
  } catch (error) {
    console.error(`Error sending Login alert email to ${userEmail}:`, error.message);
  }
};

/**
 * Send License Key Delivery & Order Receipt Email
 */
const sendLicenseDeliveryEmail = async ({
  userEmail,
  productTitle,
  licenseKey,
  plan,
  expiresAt,
  orderId,
  amount,
  currency = 'USD',
}) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`ℹ️ [Nodemailer] SMTP credentials not set. Skipping license email to ${userEmail}. Key: ${licenseKey}`);
    return;
  }

  const name = userEmail.split('@')[0];
  const expiryFormatted = expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Lifetime (Never Expires)';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Upper Store License Key</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0b0e; color: #f8fafc; margin: 0; padding: 0; }
        .email-container { max-width: 600px; margin: 20px auto; background: #121217; border: 1px solid rgba(212, 175, 55, 0.4); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6); }
        .email-header { background: linear-gradient(135deg, #18181f 0%, #0d0d11 100%); padding: 30px; text-align: center; border-bottom: 1px solid rgba(212, 175, 55, 0.25); }
        .logo-title { font-size: 26px; font-weight: 800; color: #d4af37; text-transform: uppercase; letter-spacing: 2px; margin: 0; }
        .email-body { padding: 30px; line-height: 1.6; color: #cbd5e1; }
        .success-badge { display: inline-block; background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; }
        .license-box { background: rgba(212, 175, 55, 0.08); border: 2px dashed rgba(212, 175, 55, 0.5); border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0; }
        .license-title { font-size: 12px; color: #d4af37; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 8px; }
        .license-key { font-family: 'Consolas', 'Courier New', monospace; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 2px; background: rgba(0, 0, 0, 0.4); padding: 10px 16px; border-radius: 8px; display: inline-block; border: 1px solid rgba(212, 175, 55, 0.3); }
        .order-meta { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 15px 20px; margin: 20px 0; font-size: 13px; }
        .order-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #aa820a 100%); color: #0d0d0f; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 30px; margin-top: 15px; }
        .email-footer { background: #09090c; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.05); }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1 class="logo-title">UPPER STORE</h1>
        </div>
        <div class="email-body">
          <div class="success-badge">Payment Verified &bull; License Issued</div>
          <h2 style="color: #ffffff; margin-top: 0;">Thank You for Your Purchase, ${name}!</h2>
          <p>Your order for <strong>${productTitle}</strong> has been successfully processed. Here is your official cryptographic license certificate.</p>
          
          <div class="license-box">
            <div class="license-title">Your Digital License Key</div>
            <div class="license-key">${licenseKey}</div>
            <p style="font-size: 12px; color: #94a3b8; margin: 10px 0 0 0;">Copy and paste this key into the app activation dialog to unlock full Pro features.</p>
          </div>

          <div class="order-meta">
            <div class="order-row"><span><strong>Order Reference:</strong></span> <span>${orderId}</span></div>
            <div class="order-row"><span><strong>Software / Asset:</strong></span> <span>${productTitle}</span></div>
            <div class="order-row"><span><strong>License Plan:</strong></span> <span style="text-transform: uppercase;">${plan}</span></div>
            <div class="order-row"><span><strong>Validity:</strong></span> <span>${expiryFormatted}</span></div>
            ${amount ? `<div class="order-row" style="border: none;"><span><strong>Total Paid:</strong></span> <span>${amount} ${currency}</span></div>` : ''}
          </div>

          <h3 style="color: #d4af37; font-size: 15px; margin-top: 25px;">Activation Instructions:</h3>
          <ol style="padding-left: 20px; font-size: 13px; color: #94a3b8;">
            <li>Launch the software on your device.</li>
            <li>Click <strong>Activate License / Enter Pro Key</strong> in Settings or the top navigation bar.</li>
            <li>Enter your registered email (<code>${userEmail}</code>) and your license key above.</li>
            <li>Enjoy full unrestricted Pro capabilities, verified by Upper Store cryptographic signatures.</li>
          </ol>

          <div style="text-align: center; margin-top: 25px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="cta-btn">Access My Upper Store Account</a>
          </div>
        </div>
        <div class="email-footer">
          &copy; ${new Date().getFullYear()} Upper Store Inc. Cryptographic License & Digital Distribution Authority.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: defaultFrom,
      to: userEmail,
      subject: `Your ${productTitle} License Key & Order Receipt [${orderId}]`,
      html: htmlContent,
    });
    console.log(`License key delivery email sent to ${userEmail} (Msg ID: ${info.messageId})`);
  } catch (error) {
    console.error(`Error sending license email to ${userEmail}:`, error.message);
  }
};

/**
 * Send VIP Premium Subscription Confirmation Email
 * Contains full details: Plan, Badge, Start Date, and End Date
 */
const sendVipSubscriptionEmail = async ({
  userEmail,
  displayName,
  plan = 'pro',
  badge = 'gold',
  startDate,
  validUntil,
  orderId,
  amount,
  currency = 'INR',
}) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`ℹ️ [Nodemailer] SMTP credentials not set. Skipping VIP email to ${userEmail}. Plan: ${plan}`);
    return;
  }

  const name = displayName || userEmail.split('@')[0];
  const isElite = plan === 'elite' || badge === 'purple';
  const planTitle = isElite ? 'Upper Elite VIP (Annual All-Access)' : 'Upper Pro Member (Monthly Pass)';
  const badgeTitle = isElite ? 'Royal Purple VIP Badge' : 'Golden Pro VIP Badge';
  const themeColor = isElite ? '#a855f7' : '#d4af37';
  const themeBgGlow = isElite ? 'rgba(168, 85, 247, 0.16)' : 'rgba(212, 175, 55, 0.15)';
  const themeBorder = isElite ? 'rgba(168, 85, 247, 0.5)' : 'rgba(212, 175, 55, 0.5)';

  const formatEmailDate = (dateVal) => {
    if (!dateVal) return 'Lifetime';
    try {
      const d = new Date(dateVal);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return String(dateVal);
    }
  };

  const startFormatted = formatEmailDate(startDate || new Date());
  const endFormatted = formatEmailDate(validUntil);

  const iconSvg = isElite
    ? `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#c084fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><path d="M6 3h12l4 6-10 12L2 9z"></path><path d="M11 3 8 9l4 12 4-12-3-6"></path><path d="M2 9h20"></path></svg>`
    : `<svg width="34" height="34" viewBox="0 0 24 24" fill="#ffd700" stroke="none" style="display: inline-block; vertical-align: middle;"><path d="M5 19h14a1 1 0 0 0 0-2H5a1 1 0 0 0 0 2zm15.6-11.8a1 1 0 0 0-1.1-.2L16 8.7l-3.2-5.4a1 1 0 0 0-1.6 0L8 8.7 4.5 7a1 1 0 0 0-1.4 1.2l2.3 8.3c.1.3.4.5.7.5h11.8c.3 0 .6-.2.7-.5l2.3-8.3a1 1 0 0 0-.3-1z"></path></svg>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to Upper VIP Club</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #08090d; color: #f8fafc; margin: 0; padding: 0; }
        .email-container { max-width: 600px; margin: 20px auto; background: #0f1118; border: 1px solid ${themeBorder}; border-radius: 18px; overflow: hidden; box-shadow: 0 14px 40px rgba(0, 0, 0, 0.7); }
        .email-header { background: linear-gradient(135deg, #181926 0%, #0d0e15 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
        .logo-title { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 2px; margin: 0; }
        .header-subtitle { font-size: 13px; color: ${themeColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 6px; }
        .email-body { padding: 32px 28px; line-height: 1.6; color: #cbd5e1; }
        .badge-card { background: ${themeBgGlow}; border: 1.5px solid ${themeBorder}; border-radius: 14px; padding: 22px; text-align: center; margin: 24px 0; }
        .badge-icon-wrap { width: 64px; height: 64px; border-radius: 50%; background: rgba(0, 0, 0, 0.4); border: 2px solid ${themeColor}; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; }
        .badge-title { font-size: 18px; font-weight: 800; color: #ffffff; margin: 0 0 4px; }
        .badge-subtitle { font-size: 13px; color: ${themeColor}; font-weight: 600; margin: 0; }
        .details-table { width: 100%; border-collapse: collapse; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; margin: 24px 0; font-size: 13.5px; }
        .details-table tr { border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .details-table tr:last-child { border-bottom: none; }
        .details-table td { padding: 12px 18px; }
        .details-table td.label { color: #94a3b8; font-weight: 600; width: 40%; }
        .details-table td.value { color: #ffffff; font-weight: 700; text-align: right; }
        .perks-list { background: rgba(0, 0, 0, 0.25); border-left: 3px solid ${themeColor}; padding: 16px 20px; border-radius: 8px; margin: 20px 0; font-size: 13px; line-height: 1.8; color: #cbd5e1; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, ${themeColor} 0%, #7e22ce 100%); color: #ffffff; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-size: 14px; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5); }
        .cta-btn-gold { background: linear-gradient(135deg, #ffd700 0%, #d4af37 100%); color: #0d0d0f; }
        .email-footer { background: #07080b; padding: 22px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.05); }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1 class="logo-title">UPPER STORE</h1>
          <div class="header-subtitle">VIP Club Membership Activation</div>
        </div>
        <div class="email-body">
          <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Welcome to Upper VIP Club, ${name}!</h2>
          <p>Your subscription is officially active. Your account (<strong>${userEmail}</strong>) has been elevated to VIP standing with verified privileges across our entire platform.</p>
          
          <div class="badge-card">
            <div class="badge-icon-wrap">
              ${iconSvg}
            </div>
            <h3 class="badge-title">${badgeTitle}</h3>
            <p class="badge-subtitle">${planTitle}</p>
          </div>

          <table class="details-table">
            <tr>
              <td class="label">Membership Plan:</td>
              <td class="value">${planTitle}</td>
            </tr>
            <tr>
              <td class="label">Assigned VIP Badge:</td>
              <td class="value" style="color: ${themeColor};">${badgeTitle}</td>
            </tr>
            <tr>
              <td class="label">Subscription Start Date:</td>
              <td class="value">${startFormatted}</td>
            </tr>
            <tr>
              <td class="label">Subscription Expiry Date:</td>
              <td class="value" style="color: #4ade80;">${endFormatted}</td>
            </tr>
            <tr>
              <td class="label">Order Reference:</td>
              <td class="value">${orderId || 'Direct-VIP'}</td>
            </tr>
            <tr>
              <td class="label">Total Paid:</td>
              <td class="value">${amount ? `${amount} ${currency}` : (isElite ? '399 INR' : '99 INR')}</td>
            </tr>
          </table>

          <h3 style="color: #ffffff; font-size: 15px; margin: 20px 0 10px;">Your Active VIP Privileges:</h3>
          <div class="perks-list">
            <div>&bull; <strong>0 INR Platform Fee:</strong> Unlimited complimentary downloads for all free software in the catalog.</div>
            <div>&bull; <strong>Prestige VIP Badge:</strong> Your official badge shines automatically beside your username across the site and in all product review discussions.</div>
            <div>&bull; <strong>High-Speed CDN:</strong> Direct priority routing through dedicated cloud download servers.</div>
            ${isElite ? '<div>&bull; <strong>Top-Ranked Pinned Comments:</strong> Your reviews are highlighted and pinned at the top of every product page.</div>' : ''}
          </div>

          <p style="font-size: 12.5px; color: #94a3b8;">Note: Your VIP badge and zero platform fee benefits remain active until <strong>${endFormatted}</strong>. You can renew or manage your membership anytime from the user menu.</p>

          <div style="text-align: center; margin: 30px 0 15px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/products" class="cta-btn ${isElite ? '' : 'cta-btn-gold'}">Browse Products with 0 INR Platform Fee</a>
          </div>
        </div>
        <div class="email-footer">
          &copy; ${new Date().getFullYear()} Upper Store &bull; VIP Member Privileges &amp; Distribution Authority.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: defaultFrom,
      to: userEmail,
      subject: `Upper VIP Club Confirmation: ${badgeTitle} Activated [${orderId || 'VIP'}]`,
      html: htmlContent,
    });
    console.log(`VIP Subscription email sent to ${userEmail} (Msg ID: ${info.messageId})`);
  } catch (error) {
    console.error(`Error sending VIP subscription email to ${userEmail}:`, error.message);
  }
};

/**
 * Send VIP Subscription Cancellation Confirmation Email
 * @param {string} userEmail - User's email
 * @param {string} userName - User's display name
 * @param {string} previousPlan - 'pro' | 'elite'
 * @param {string} cancelledAt - ISO date string
 */
const sendSubscriptionCancellationEmail = async (userEmail, userName, previousPlan, cancelledAt) => {
  const isElite = previousPlan === 'elite' || previousPlan === 'vip_yearly';
  const planTitle = isElite ? 'Elite VIP Plan (Annual)' : 'Pro Member Plan (Monthly)';
  const dateFormatted = new Date(cancelledAt || Date.now()).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0c10; color: #e0e0e0; margin: 0; padding: 20px; }
        .email-card { max-width: 600px; margin: 0 auto; background: #13151b; border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.7); }
        .email-header { background: linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(17, 18, 24, 0.95) 100%); padding: 30px 24px; text-align: center; border-bottom: 1px solid rgba(239, 68, 68, 0.25); }
        .logo-title { margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 2px; }
        .header-subtitle { font-size: 13px; color: #f87171; letter-spacing: 1px; margin-top: 6px; text-transform: uppercase; font-weight: 700; }
        .email-body { padding: 32px 28px; line-height: 1.6; }
        .details-table { width: 100%; border-collapse: collapse; margin: 24px 0; background: rgba(255, 255, 255, 0.03); border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.08); }
        .details-table td { padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 13.5px; }
        .details-table td.label { color: #94a3b8; font-weight: 600; width: 45%; }
        .details-table td.value { color: #ffffff; font-weight: 700; text-align: right; }
        .revoked-list { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 10px; padding: 16px 20px; margin: 20px 0; font-size: 13px; color: #fca5a5; line-height: 1.8; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #aa820a 100%); color: #0b0c10 !important; font-weight: 800; padding: 12px 28px; border-radius: 25px; text-decoration: none; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3); }
        .email-footer { background: #0c0d12; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.06); }
      </style>
    </head>
    <body>
      <div class="email-card">
        <div class="email-header">
          <h1 class="logo-title">UPPER STORE</h1>
          <div class="header-subtitle">VIP Subscription Cancellation Notice</div>
        </div>
        <div class="email-body">
          <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Subscription Cancelled</h2>
          <p>Hello ${userName || 'Creator'},</p>
          <p>We are writing to confirm that your <strong>${planTitle}</strong> on Upper Store (<strong>${userEmail}</strong>) has been cancelled as requested.</p>

          <table class="details-table">
            <tr>
              <td class="label">Cancelled Plan:</td>
              <td class="value">${planTitle}</td>
            </tr>
            <tr>
              <td class="label">Cancellation Timestamp:</td>
              <td class="value">${dateFormatted}</td>
            </tr>
            <tr>
              <td class="label">Current Account Tier:</td>
              <td class="value" style="color: #94a3b8;">Free Tier</td>
            </tr>
          </table>

          <h3 style="color: #ffffff; font-size: 14px; margin: 20px 0 8px;">Invalidation of VIP Facilities:</h3>
          <div class="revoked-list">
            <div>&bull; <strong>VIP Badge Revoked:</strong> Your ${isElite ? 'Royal Purple Diamond' : 'Golden Crown'} badge has been removed from your profile and community reviews.</div>
            <div>&bull; <strong>Platform Fee Reinstated:</strong> Standard ₹19 INR platform fee now applies to free software downloads.</div>
            <div>&bull; <strong>Priority Placement Invalidated:</strong> Reviews revert to standard chronological display order.</div>
          </div>

          <p style="font-size: 13px; color: #94a3b8;">You can rejoin the Upper VIP Club anytime to reactivate ₹0 platform fees and reclaim your verified badge.</p>

          <div style="text-align: center; margin: 30px 0 15px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/vip-club" class="cta-btn">View VIP Plans &amp; Resubscribe</a>
          </div>
        </div>
        <div class="email-footer">
          &copy; ${new Date().getFullYear()} Upper Store &bull; VIP Member Privileges &amp; Distribution Authority.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: defaultFrom,
      to: userEmail,
      subject: `Upper VIP Club: Subscription Cancelled [${planTitle}]`,
      html: htmlContent,
    });
    console.log(`VIP Cancellation email sent to ${userEmail} (Msg ID: ${info.messageId})`);
  } catch (error) {
    console.error(`Error sending VIP cancellation email to ${userEmail}:`, error.message);
  }
};

/**
 * Send Payment Rejection Email to user with reason and order details
 */
const sendPaymentRejectionEmail = async ({
  userEmail,
  userName,
  planOrItem = 'Upper VIP Membership',
  amount,
  currency = 'INR',
  utrNumber,
  orderId,
  rejectReason = 'Payment could not be verified in bank records.',
  rejectedAt,
}) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`ℹ️ [Nodemailer] SMTP credentials not set. Skipping payment rejection email to ${userEmail}. Reason: ${rejectReason}`);
    return;
  }

  const name = userName || userEmail.split('@')[0];
  const dateFormatted = new Date(rejectedAt || Date.now()).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #08090d; color: #e2e8f0; margin: 0; padding: 20px; }
        .email-card { max-width: 600px; margin: 0 auto; background: #0f1118; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 18px; overflow: hidden; box-shadow: 0 14px 40px rgba(0,0,0,0.7); }
        .email-header { background: linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(15, 17, 24, 0.98) 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(239, 68, 68, 0.25); }
        .logo-title { margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 2px; }
        .header-subtitle { font-size: 13px; color: #f87171; letter-spacing: 1.5px; margin-top: 6px; text-transform: uppercase; font-weight: 700; }
        .email-body { padding: 32px 28px; line-height: 1.6; }
        .alert-pill { display: inline-block; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.45); padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
        .reason-box { background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; border-radius: 8px; padding: 18px 20px; margin: 24px 0; }
        .reason-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #fca5a5; font-weight: 700; margin: 0 0 6px 0; }
        .reason-text { font-size: 15px; color: #ffffff; font-weight: 600; margin: 0; line-height: 1.5; }
        .details-table { width: 100%; border-collapse: collapse; margin: 24px 0; background: rgba(255, 255, 255, 0.02); border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.07); font-size: 13.5px; }
        .details-table td { padding: 12px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .details-table tr:last-child td { border-bottom: none; }
        .details-table td.label { color: #94a3b8; font-weight: 600; width: 42%; }
        .details-table td.value { color: #ffffff; font-weight: 700; text-align: right; }
        .steps-box { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 18px 22px; margin: 22px 0; font-size: 13px; color: #cbd5e1; }
        .steps-box ol { margin: 8px 0 0; padding-left: 18px; }
        .steps-box li { margin-bottom: 6px; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #aa820a 100%); color: #0b0c10 !important; font-weight: 800; padding: 13px 30px; border-radius: 25px; text-decoration: none; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 4px 16px rgba(212, 175, 55, 0.35); }
        .email-footer { background: #08090d; padding: 22px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.05); }
      </style>
    </head>
    <body>
      <div class="email-card">
        <div class="email-header">
          <h1 class="logo-title">UPPER STORE</h1>
          <div class="header-subtitle">Payment Verification Notice</div>
        </div>
        <div class="email-body">
          <div class="alert-pill">Payment Verification Unsuccessful</div>
          <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Payment Not Verified</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>We reviewed your recent payment submission for <strong>${planOrItem}</strong> on Upper Store (<strong>${userEmail}</strong>). Unfortunately, we were unable to confirm this transaction in our bank records at this time.</p>

          <div class="reason-box">
            <div class="reason-title">Reason for Rejection:</div>
            <div class="reason-text">${rejectReason}</div>
          </div>

          <table class="details-table">
            <tr>
              <td class="label">Order Reference:</td>
              <td class="value">${orderId || 'Direct-Order'}</td>
            </tr>
            <tr>
              <td class="label">Requested Item / Plan:</td>
              <td class="value">${planOrItem}</td>
            </tr>
            <tr>
              <td class="label">Submitted 12-Digit UTR:</td>
              <td class="value"><code style="font-family: monospace; font-size: 13px; color: #fca5a5;">${utrNumber || 'N/A'}</code></td>
            </tr>
            ${amount ? `<tr><td class="label">Amount:</td><td class="value">₹${amount} ${currency}</td></tr>` : ''}
            <tr>
              <td class="label">Verification Timestamp:</td>
              <td class="value">${dateFormatted}</td>
            </tr>
            <tr>
              <td class="label">Payment Status:</td>
              <td class="value" style="color: #ef4444;">REJECTED</td>
            </tr>
          </table>

          <div class="steps-box">
            <strong style="color: #ffffff;">How to Resolve This:</strong>
            <ol>
              <li>Open your UPI app (Google Pay, PhonePe, Paytm, or BHIM) and inspect your bank debit receipt.</li>
              <li>Confirm the amount (<strong>₹${amount || '399'}</strong>) was successfully debited to <code>9692093386@naviaxis</code> (JITENDRA KUMAR MISHRA).</li>
              <li>Double-check the 12-digit <strong>UPI Reference / UTR Number</strong> on the transaction receipt.</li>
              <li>Log in to Upper Store, open <strong>My Licenses &amp; Subscriptions</strong>, and retry the payment with the correct UTR reference.</li>
            </ol>
          </div>

          <p style="font-size: 13px; color: #94a3b8;">You can also view this rejection notice and reason directly in your Upper Store profile under <em>My Licenses &amp; Subscriptions</em>.</p>

          <div style="text-align: center; margin: 30px 0 15px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="cta-btn">View My Account &amp; Retry Payment</a>
          </div>
        </div>
        <div class="email-footer">
          &copy; ${new Date().getFullYear()} Upper Store &bull; Payment Verification &amp; Security Authority.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: defaultFrom,
      to: userEmail,
      subject: `Payment Verification Unsuccessful: ${planOrItem} [Order: ${orderId || 'Direct'}]`,
      html: htmlContent,
    });
    console.log(`Payment rejection email sent to ${userEmail} (Msg ID: ${info.messageId})`);
  } catch (error) {
    console.error(`Error sending payment rejection email to ${userEmail}:`, error.message);
  }
};

module.exports = {
  sendWelcomeEmail,
  sendLoginAlertEmail,
  sendLicenseDeliveryEmail,
  sendVipSubscriptionEmail,
  sendSubscriptionCancellationEmail,
  sendPaymentRejectionEmail,
};



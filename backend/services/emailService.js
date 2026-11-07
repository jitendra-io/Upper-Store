const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
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
  // Enforce TLS certificate validation in production mode
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  },
});

// HTML entity encoding to sanitize user input in email templates against injection
const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const defaultFrom = process.env.EMAIL_FROM || '"Upper Store" <upper.official.in@gmail.com>';

// In-memory token cache for Google Gmail REST API
let cachedGmailAccessToken = null;
let gmailTokenExpiresAt = 0;

/**
 * Acquire fresh Google Gmail access token via OAuth2 Refresh Token (Port 443 HTTPS)
 */
const getGmailAccessToken = async () => {
  const now = Date.now();
  if (cachedGmailAccessToken && now < gmailTokenExpiresAt - 60000) {
    return cachedGmailAccessToken;
  }

  const clientId = process.env.GMAIL_CLIENT_ID ? process.env.GMAIL_CLIENT_ID.trim() : '';
  const clientSecret = process.env.GMAIL_CLIENT_SECRET ? process.env.GMAIL_CLIENT_SECRET.trim() : '';
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN ? process.env.GMAIL_REFRESH_TOKEN.trim() : '';

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Gmail API OAuth credentials not configured in environment');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Failed to refresh Gmail access token: ${data.error_description || data.error || 'Unknown error'}`);
  }

  cachedGmailAccessToken = data.access_token;
  gmailTokenExpiresAt = Date.now() + ((data.expires_in || 3600) * 1000);
  return cachedGmailAccessToken;
};

/**
 * Dispatch raw RFC 2822 email via Google Gmail REST API (Port 443 HTTPS)
 */
const sendViaGmailApi = async ({ to, subject, html, senderName, senderEmail }) => {
  const accessToken = await getGmailAccessToken();
  const recipient = Array.isArray(to) ? to.join(', ') : to;

  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `From: "${senderName}" <${senderEmail}>`,
    `To: ${recipient}`,
    `Subject: ${utf8Subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(html, 'utf-8').toString('base64'),
  ];

  const rawMessage = messageParts.join('\r\n');
  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || JSON.stringify(data));
  }

  return { success: true, messageId: data.id, provider: 'gmail_api' };
};

/**
 * Check if any valid email provider is configured
 */
const isEmailConfigured = () => {
  const hasGmail = !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);
  const hasBrevo = !!(process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim());
  const hasSmtp = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  return hasGmail || hasBrevo || hasSmtp;
};

/**
 * Unified Email Dispatcher
 * Priority 1: Brevo HTTP REST API (Port 443 - 100% bypasses Render & Cloudflare firewall blocks)
 * Priority 2: Nodemailer SMTP (Works on localhost)
 */
const sendDispatchEmail = async ({ to, subject, html, emailType = 'Notification' }) => {
  const senderEmail = process.env.GMAIL_USER || process.env.EMAIL_FROM_ADDRESS || 'upper.official.in@gmail.com';
  const senderName = process.env.EMAIL_FROM_NAME || 'Upper Store';

  // 1. Priority 1: Google Gmail REST API (Direct from Google account with Profile Image)
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
    try {
      const result = await sendViaGmailApi({ to, subject, html, senderName, senderEmail });
      console.log(` [Gmail REST API] ${emailType} delivered to ${to} (MessageId: ${result.messageId})`);
      return result;
    } catch (gmailErr) {
      console.error(` [Gmail API Error] Failed to send ${emailType} to ${to}:`, gmailErr.message);
      // Fall through to Brevo or SMTP
    }
  }

  // 2. Priority 2: Brevo HTTP REST API (Port 443 - Bypasses Render port blocks)
  const brevoApiKey = process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : '';
  if (brevoApiKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: Array.isArray(to) 
            ? to.map(email => ({ email: typeof email === 'string' ? email : email.email }))
            : [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || JSON.stringify(data));
      }
      console.log(` [Brevo API] ${emailType} delivered to ${to} (MessageId: ${data.messageId})`);
      return { success: true, messageId: data.messageId, provider: 'brevo' };
    } catch (brevoErr) {
      console.error(` [Brevo API Error] Failed to send ${emailType} to ${to}:`, brevoErr.message);
      // Fall through to SMTP if configured
    }
  }

  // 2. Fallback to Nodemailer SMTP (Works on localhost)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const info = await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to,
        subject,
        html,
      });
      console.log(` [Nodemailer] ${emailType} sent to ${to} (Msg ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId, provider: 'nodemailer' };
    } catch (smtpErr) {
      console.error(` [Nodemailer Error] Failed to send ${emailType} to ${to}:`, smtpErr.message);
      return { success: false, error: smtpErr.message };
    }
  }

  console.log(` [EmailService] Neither BREVO_API_KEY nor SMTP credentials configured. Skipping ${emailType} to ${to}.`);
  return { success: false, skipped: true };
};


/**
 * Send Welcome Email to newly registered user
 */
const sendWelcomeEmail = async (userEmail, displayName) => {
  if (!isEmailConfigured()) {
    console.log(` [EmailService] No email provider configured. Skipping Welcome email to ${userEmail}.`);
    return;
  }

  const name = escapeHtml(displayName || userEmail.split('@')[0]);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to Upper Store</title>
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070709; color: #f8fafc; margin: 0; padding: 24px 12px; }
        .email-container { max-width: 600px; margin: 0 auto; background: #121217; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7); }
        .email-accent-bar { height: 3px; background: linear-gradient(90deg, #e61919 0%, #ff4d4d 50%, #e61919 100%); }
        .email-header { background: #0c0c10; padding: 32px 24px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
        .brand-logo { font-size: 26px; font-weight: 800; letter-spacing: 2.5px; text-decoration: none; display: inline-block; }
        .logo-crimson { color: #ff2a2a; }
        .logo-white { color: #ffffff; }
        .email-body { padding: 32px 28px; line-height: 1.65; color: #9496a1; font-size: 14px; }
        .welcome-badge { display: inline-block; background: rgba(230, 25, 25, 0.14); color: #ff4d4d; border: 1px solid rgba(230, 25, 25, 0.35); padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 18px; }
        .title { color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em; }
        .title-accent { color: #ff2a2a; }
        .text-lead { color: #cbd5e1; font-size: 15px; margin-bottom: 16px; }
        .info-pill-box { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 18px 20px; margin: 24px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #71717a; font-weight: 600; }
        .info-val { color: #ffffff; font-weight: 600; font-family: 'JetBrains Mono', Consolas, monospace; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #e61919 0%, #b30f0f 100%); color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-size: 14px; letter-spacing: 0.4px; box-shadow: 0 8px 24px rgba(230, 25, 25, 0.4); text-align: center; }
        .email-footer { background: #09090c; padding: 24px 20px; text-align: center; font-size: 11.5px; color: #52525b; border-top: 1px solid rgba(255, 255, 255, 0.05); }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-accent-bar"></div>
        <div class="email-header">
          <div class="brand-logo">
            <span class="logo-crimson">UPPER</span> <span class="logo-white">STORE</span>
          </div>
        </div>
        <div class="email-body">
          <div class="welcome-badge">Account Initialized</div>
          <h2 class="title">Welcome to the Platform, <span class="title-accent">${name}</span></h2>
          <p class="text-lead">Thank you for joining <strong>Upper Store</strong> &mdash; your high-performance destination for verified digital software releases, developer tooling, and zero-latency CDN distribution.</p>
          <div class="info-pill-box">
            <div class="info-row"><span class="info-label">Account Identity:</span> <span class="info-val">${userEmail}</span></div>
            <div class="info-row"><span class="info-label">Security Tier:</span> <span class="info-val" style="color: #4ade80;">Active / Verified</span></div>
            <div class="info-row"><span class="info-label">Package Verification:</span> <span class="info-val">SHA-256 Enforced</span></div>
          </div>
          <p>Your workspace is active. You can immediately browse verified releases, run automated downloads, activate cryptographic license keys, and configure deployment settings.</p>
          <div style="text-align: center; margin: 32px 0 20px;">
            <a href="${frontendUrl}/products" class="cta-btn">Explore Software Catalog &rarr;</a>
          </div>
          <p style="font-size: 12.5px; color: #71717a; margin-top: 28px;">If you did not authorize this account registration, please notify our security response team immediately.</p>
        </div>
        <div class="email-footer">
          &copy; ${new Date().getFullYear()} Upper Store Inc. Cryptographic Distribution &amp; Cloud Licensing Authority.
        </div>
      </div>
    </body>
    </html>
  `;

  await sendDispatchEmail({
    to: userEmail,
    subject: 'Welcome to Upper Store - Account Initialized',
    html: htmlContent,
    emailType: 'Welcome Email'
  });
};

/**
 * Send Login Alert Email to user
 */
const sendLoginAlertEmail = async (userEmail, displayName, loginMethod = 'Email & Password') => {
  if (!isEmailConfigured()) {
    console.log(` [EmailService] No email provider configured. Skipping Login alert to ${userEmail}.`);
    return;
  }

  const name = escapeHtml(displayName || userEmail.split('@')[0]);
  const safeMethod = escapeHtml(loginMethod);
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
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070709; color: #f8fafc; margin: 0; padding: 24px 12px; }
        .email-container { max-width: 600px; margin: 0 auto; background: #121217; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7); }
        .email-accent-bar { height: 3px; background: linear-gradient(90deg, #e61919 0%, #ff4d4d 50%, #e61919 100%); }
        .email-header { background: #0c0c10; padding: 32px 24px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
        .brand-logo { font-size: 26px; font-weight: 800; letter-spacing: 2.5px; text-decoration: none; display: inline-block; }
        .logo-crimson { color: #ff2a2a; }
        .logo-white { color: #ffffff; }
        .email-body { padding: 32px 28px; line-height: 1.65; color: #9496a1; font-size: 14px; }
        .alert-badge { display: inline-block; background: rgba(230, 25, 25, 0.14); color: #ff4d4d; border: 1px solid rgba(230, 25, 25, 0.35); padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 18px; }
        .title { color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em; }
        .info-box { background: rgba(255, 255, 255, 0.02); border-left: 3px solid #e61919; border-top: 1px solid rgba(255, 255, 255, 0.06); border-right: 1px solid rgba(255, 255, 255, 0.06); border-bottom: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 18px 20px; margin: 24px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #71717a; font-weight: 600; }
        .info-val { color: #ffffff; font-weight: 600; font-family: 'JetBrains Mono', Consolas, monospace; }
        .email-footer { background: #09090c; padding: 24px 20px; text-align: center; font-size: 11.5px; color: #52525b; border-top: 1px solid rgba(255, 255, 255, 0.05); }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-accent-bar"></div>
        <div class="email-header">
          <div class="brand-logo">
            <span class="logo-crimson">UPPER</span> <span class="logo-white">STORE</span>
          </div>
        </div>
        <div class="email-body">
          <div class="alert-badge">Telemetry &bull; Security Event</div>
          <h2 class="title">New Session Authentication Detected</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>A new verified authentication event was logged on your <strong>Upper Store</strong> workspace account.</p>
          <div class="info-box">
            <div class="info-row"><span class="info-label">Account Identity:</span> <span class="info-val">${userEmail}</span></div>
            <div class="info-row"><span class="info-label">Authentication Method:</span> <span class="info-val">${safeMethod}</span></div>
            <div class="info-row"><span class="info-label">Event Timestamp:</span> <span class="info-val">${loginTime}</span></div>
            <div class="info-row"><span class="info-label">Telemetry Status:</span> <span class="info-val" style="color: #4ade80;">Authenticated</span></div>
          </div>
          <p style="font-size: 12.5px; color: #71717a; margin-top: 24px;">If this session was initiated by you, no further action is required. If you did not authorize this session, please revoke active tokens and reset your credentials immediately.</p>
        </div>
        <div class="email-footer">
          &copy; ${new Date().getFullYear()} Upper Store Inc. Cryptographic Distribution &amp; Cloud Licensing Authority.
        </div>
      </div>
    </body>
    </html>
  `;

  await sendDispatchEmail({
    to: userEmail,
    subject: 'Security Notification: New Login to Upper Store',
    html: htmlContent,
    emailType: 'Login Alert'
  });
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
  if (!isEmailConfigured()) {
    console.log(` [EmailService] No email provider configured. Skipping license email to ${userEmail}. Key: ${licenseKey}`);
    return;
  }

  const name = escapeHtml(userEmail.split('@')[0]);
  const safeProductTitle = escapeHtml(productTitle || 'Software Release');
  const safeLicenseKey = escapeHtml(licenseKey || 'N/A');
  const safePlan = escapeHtml(plan || 'Standard');
  const safeOrderId = escapeHtml(orderId || 'Direct-Order');
  const expiryFormatted = expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Lifetime (Perpetual)';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Upper Store License Certificate</title>
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070709; color: #f8fafc; margin: 0; padding: 24px 12px; }
        .email-container { max-width: 600px; margin: 0 auto; background: #121217; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7); }
        .email-accent-bar { height: 3px; background: linear-gradient(90deg, #e61919 0%, #ff4d4d 50%, #e61919 100%); }
        .email-header { background: #0c0c10; padding: 32px 24px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
        .brand-logo { font-size: 26px; font-weight: 800; letter-spacing: 2.5px; text-decoration: none; display: inline-block; }
        .logo-crimson { color: #ff2a2a; }
        .logo-white { color: #ffffff; }
        .email-body { padding: 32px 28px; line-height: 1.65; color: #9496a1; font-size: 14px; }
        .success-badge { display: inline-block; background: rgba(34, 197, 94, 0.14); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.35); padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 18px; }
        .title { color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em; }
        .license-box { background: rgba(230, 25, 25, 0.05); border: 1.5px dashed rgba(230, 25, 25, 0.45); border-radius: 12px; padding: 24px 20px; text-align: center; margin: 26px 0; }
        .license-title { font-size: 11px; color: #ff4d4d; text-transform: uppercase; letter-spacing: 1.6px; font-weight: 700; margin-bottom: 10px; }
        .license-key { font-family: 'JetBrains Mono', Consolas, 'Courier New', monospace; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 2px; background: rgba(0, 0, 0, 0.5); padding: 12px 20px; border-radius: 8px; display: inline-block; border: 1px solid rgba(230, 25, 25, 0.3); }
        .order-meta { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 18px 20px; margin: 24px 0; font-size: 13px; }
        .order-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
        .order-row:last-child { border-bottom: none; }
        .order-label { color: #71717a; font-weight: 600; }
        .order-val { color: #ffffff; font-weight: 600; }
        .instructions-box { background: rgba(255, 255, 255, 0.02); border-left: 3px solid #e61919; border-radius: 8px; padding: 16px 20px; margin: 22px 0; font-size: 13px; color: #9496a1; line-height: 1.8; }
        .instructions-box ol { margin: 8px 0 0; padding-left: 18px; }
        .instructions-box li { margin-bottom: 6px; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #e61919 0%, #b30f0f 100%); color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-size: 14px; letter-spacing: 0.4px; box-shadow: 0 8px 24px rgba(230, 25, 25, 0.4); text-align: center; }
        .email-footer { background: #09090c; padding: 24px 20px; text-align: center; font-size: 11.5px; color: #52525b; border-top: 1px solid rgba(255, 255, 255, 0.05); }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-accent-bar"></div>
        <div class="email-header">
          <div class="brand-logo">
            <span class="logo-crimson">UPPER</span> <span class="logo-white">STORE</span>
          </div>
        </div>
        <div class="email-body">
          <div class="success-badge">Cryptographic License Issued</div>
          <h2 class="title">License Certificate for ${safeProductTitle}</h2>
          <p>Hello <strong>${name}</strong>, your purchase has been cryptographically confirmed. Your personal license key and order receipt are detailed below.</p>
          
          <div class="license-box">
            <div class="license-title">Cryptographic License Key</div>
            <div class="license-key">${safeLicenseKey}</div>
            <p style="font-size: 11.5px; color: #71717a; margin: 12px 0 0 0;">Paste this key into the in-app activation modal to unlock full production access.</p>
          </div>

          <div class="order-meta">
            <div class="order-row"><span class="order-label">Order Reference:</span> <span class="order-val" style="font-family: 'JetBrains Mono', Consolas, monospace;">${safeOrderId}</span></div>
            <div class="order-row"><span class="order-label">Software / Asset:</span> <span class="order-val">${safeProductTitle}</span></div>
            <div class="order-row"><span class="order-label">License Plan:</span> <span class="order-val" style="text-transform: uppercase; color: #ff4d4d;">${safePlan}</span></div>
            <div class="order-row"><span class="order-label">Validity / Term:</span> <span class="order-val">${expiryFormatted}</span></div>
            ${amount ? `<div class="order-row"><span class="order-label">Total Amount:</span> <span class="order-val" style="color: #ffffff;">${amount} ${currency}</span></div>` : ''}
          </div>

          <div class="instructions-box">
            <strong style="color: #ffffff;">Activation Steps:</strong>
            <ol>
              <li>Launch the software binary on your system.</li>
              <li>Open <strong>Settings &rarr; Activate License / Enter Pro Key</strong>.</li>
              <li>Provide your registered account email (<code>${userEmail}</code>) and your license key above.</li>
              <li>Instant verification will bind the license to your hardware node.</li>
            </ol>
          </div>

          <div style="text-align: center; margin: 32px 0 20px;">
            <a href="${frontendUrl}" class="cta-btn">Access My Workspace Licenses &rarr;</a>
          </div>
        </div>
        <div class="email-footer">
          &copy; ${new Date().getFullYear()} Upper Store Inc. Cryptographic Distribution &amp; Cloud Licensing Authority.
        </div>
      </div>
    </body>
    </html>
  `;

  await sendDispatchEmail({
    to: userEmail,
    subject: `Your ${safeProductTitle} License Key & Order Receipt [${safeOrderId}]`,
    html: htmlContent,
    emailType: 'License Key Delivery'
  });
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
  if (!isEmailConfigured()) {
    console.log(` [EmailService] No email provider configured. Skipping VIP email to ${userEmail}. Plan: ${plan}`);
    return;
  }

  const name = escapeHtml(displayName || userEmail.split('@')[0]);
  const isElite = plan === 'elite' || badge === 'purple' || badge === 'crimson';
  const planTitle = isElite ? 'Upper Elite VIP (Annual All-Access)' : 'Upper Pro Member (Monthly Pass)';
  const badgeTitle = isElite ? 'Crimson Diamond Elite VIP Badge' : 'Golden Crown Pro VIP Badge';
  const ringTitle = isElite ? 'Glowing Crimson & White Avatar Ring' : 'Glowing Yellow & White Aura Ring';
  const themeColor = isElite ? '#ff2a2a' : '#ffd700';
  const themeBgGlow = isElite ? 'rgba(230, 25, 25, 0.12)' : 'rgba(255, 215, 0, 0.12)';
  const themeBorder = isElite ? 'rgba(230, 25, 25, 0.45)' : 'rgba(255, 215, 0, 0.45)';
  const safeOrderId = escapeHtml(orderId || 'Direct-VIP');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const formatEmailDate = (dateVal) => {
    if (!dateVal) return 'Lifetime (Perpetual)';
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
    ? `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ff2a2a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><path d="M6 3h12l4 6-10 12L2 9z"></path><path d="M11 3 8 9l4 12 4-12-3-6"></path><path d="M2 9h20"></path></svg>`
    : `<svg width="34" height="34" viewBox="0 0 24 24" fill="#ffd700" stroke="none" style="display: inline-block; vertical-align: middle;"><path d="M5 19h14a1 1 0 0 0 0-2H5a1 1 0 0 0 0 2zm15.6-11.8a1 1 0 0 0-1.1-.2L16 8.7l-3.2-5.4a1 1 0 0 0-1.6 0L8 8.7 4.5 7a1 1 0 0 0-1.4 1.2l2.3 8.3c.1.3.4.5.7.5h11.8c.3 0 .6-.2.7-.5l2.3-8.3a1 1 0 0 0-.3-1z"></path></svg>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to Upper VIP Club</title>
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070709; color: #f8fafc; margin: 0; padding: 24px 12px; }
        .email-container { max-width: 600px; margin: 0 auto; background: #121217; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7); }
        .email-accent-bar { height: 3px; background: linear-gradient(90deg, #e61919 0%, #ff4d4d 50%, #e61919 100%); }
        .email-header { background: #0c0c10; padding: 32px 24px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
        .brand-logo { font-size: 26px; font-weight: 800; letter-spacing: 2.5px; text-decoration: none; display: inline-block; }
        .logo-crimson { color: #ff2a2a; }
        .logo-white { color: #ffffff; }
        .header-subtitle { font-size: 11px; color: ${themeColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 1.6px; margin-top: 8px; }
        .email-body { padding: 32px 28px; line-height: 1.65; color: #9496a1; font-size: 14px; }
        .title { color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em; }
        .badge-card { background: ${themeBgGlow}; border: 1.5px solid ${themeBorder}; border-radius: 14px; padding: 22px; text-align: center; margin: 24px 0; }
        .badge-icon-wrap { width: 64px; height: 64px; border-radius: 50%; background: rgba(0, 0, 0, 0.5); border: 2px solid ${themeColor}; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; }
        .badge-title { font-size: 18px; font-weight: 800; color: #ffffff; margin: 0 0 4px; }
        .badge-subtitle { font-size: 12.5px; color: ${themeColor}; font-weight: 600; margin: 0; }
        .details-table { width: 100%; border-collapse: collapse; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; overflow: hidden; margin: 24px 0; font-size: 13.5px; }
        .details-table tr { border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
        .details-table tr:last-child { border-bottom: none; }
        .details-table td { padding: 12px 18px; }
        .details-table td.label { color: #71717a; font-weight: 600; width: 42%; }
        .details-table td.value { color: #ffffff; font-weight: 600; text-align: right; }
        .perks-list { background: rgba(255, 255, 255, 0.02); border-left: 3px solid ${themeColor}; padding: 16px 20px; border-radius: 8px; margin: 22px 0; font-size: 13px; line-height: 1.8; color: #9496a1; }
        .cta-btn { display: inline-block; background: ${isElite ? 'linear-gradient(135deg, #e61919 0%, #ff2a2a 100%)' : 'linear-gradient(135deg, #ffd700 0%, #d4af37 100%)'}; color: ${isElite ? '#ffffff' : '#0a0a0f'} !important; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-size: 14px; letter-spacing: 0.4px; box-shadow: 0 8px 24px ${isElite ? 'rgba(230, 25, 25, 0.45)' : 'rgba(255, 215, 0, 0.45)'}; text-align: center; }
        .email-footer { background: #09090c; padding: 24px 20px; text-align: center; font-size: 11.5px; color: #52525b; border-top: 1px solid rgba(255, 255, 255, 0.05); }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-accent-bar"></div>
        <div class="email-header">
          <div class="brand-logo">
            <span class="logo-crimson">UPPER</span> <span class="logo-white">STORE</span>
          </div>
          <div class="header-subtitle">VIP Club Membership Certificate</div>
        </div>
        <div class="email-body">
          <h2 class="title">Welcome to Upper VIP Club, ${name}</h2>
          <p>Your subscription is officially confirmed. Your account (<strong>${userEmail}</strong>) has been elevated to verified VIP tier with high-priority privileges across the network.</p>
          
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
              <td class="label">VIP Verified Badge:</td>
              <td class="value" style="color: ${themeColor};">${badgeTitle}</td>
            </tr>
            <tr>
              <td class="label">VIP Avatar Ring:</td>
              <td class="value" style="color: ${themeColor};">${ringTitle}</td>
            </tr>
            <tr>
              <td class="label">Effective Start Date:</td>
              <td class="value">${startFormatted}</td>
            </tr>
            <tr>
              <td class="label">Valid Until:</td>
              <td class="value" style="color: #4ade80;">${endFormatted}</td>
            </tr>
            <tr>
              <td class="label">Order Reference:</td>
              <td class="value" style="font-family: 'JetBrains Mono', Consolas, monospace;">${safeOrderId}</td>
            </tr>
            <tr>
              <td class="label">Total Paid:</td>
              <td class="value">${amount ? `${amount} ${currency}` : (isElite ? '399 INR' : '99 INR')}</td>
            </tr>
          </table>

          <div class="perks-list">
            <div>&bull; <strong>0 INR Platform Fee:</strong> Unlimited complimentary downloads for all free software in the catalog.</div>
            <div>&bull; <strong>VIP Avatar Ring:</strong> ${ringTitle} active in dark mode across the store.</div>
            <div>&bull; <strong>Verified Community Badge:</strong> ${badgeTitle} displayed alongside your username in community and review discussions.</div>
            <div>&bull; <strong>Edge CDN Priority:</strong> Direct low-latency routing through dedicated mirror servers.</div>
            ${isElite ? '<div>&bull; <strong>Top-Ranked Pinned Comments:</strong> Your reviews are highlighted with crimson ribbon and pinned at the top of every product page.</div>' : ''}
          </div>

          <p style="font-size: 12.5px; color: #71717a;">Your VIP privileges remain active through <strong>${endFormatted}</strong>. You can view or manage your subscription anytime from your profile.</p>

          <div style="text-align: center; margin: 32px 0 20px;">
            <a href="${frontendUrl}/products" class="cta-btn">Browse Software with 0 INR Platform Fee &rarr;</a>
          </div>
        </div>
        <div class="email-footer">
          &copy; ${new Date().getFullYear()} Upper Store Inc. Cryptographic Distribution &amp; Cloud Licensing Authority.
        </div>
      </div>
    </body>
    </html>
  `;

  await sendDispatchEmail({
    to: userEmail,
    subject: `Upper VIP Club Confirmation: ${badgeTitle} Activated [${safeOrderId}]`,
    html: htmlContent,
    emailType: 'VIP Subscription Confirmation'
  });
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
  const safeName = escapeHtml(userName || 'User');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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
      <title>VIP Subscription Invalidation</title>
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070709; color: #f8fafc; margin: 0; padding: 24px 12px; }
        .email-container { max-width: 600px; margin: 0 auto; background: #121217; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7); }
        .email-accent-bar { height: 3px; background: linear-gradient(90deg, #e61919 0%, #ff4d4d 50%, #e61919 100%); }
        .email-header { background: #0c0c10; padding: 32px 24px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
        .brand-logo { font-size: 26px; font-weight: 800; letter-spacing: 2.5px; text-decoration: none; display: inline-block; }
        .logo-crimson { color: #ff2a2a; }
        .logo-white { color: #ffffff; }
        .header-subtitle { font-size: 11px; color: #ff4d4d; font-weight: 700; text-transform: uppercase; letter-spacing: 1.6px; margin-top: 8px; }
        .email-body { padding: 32px 28px; line-height: 1.65; color: #9496a1; font-size: 14px; }
        .title { color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em; }
        .details-table { width: 100%; border-collapse: collapse; margin: 24px 0; background: rgba(255, 255, 255, 0.02); border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.07); font-size: 13.5px; }
        .details-table td { padding: 12px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
        .details-table tr:last-child td { border-bottom: none; }
        .details-table td.label { color: #71717a; font-weight: 600; width: 45%; }
        .details-table td.value { color: #ffffff; font-weight: 600; text-align: right; }
        .revoked-list { background: rgba(230, 25, 25, 0.06); border-left: 3px solid #e61919; border-radius: 8px; padding: 16px 20px; margin: 22px 0; font-size: 13px; color: #fca5a5; line-height: 1.8; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #e61919 0%, #b30f0f 100%); color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-size: 14px; letter-spacing: 0.4px; box-shadow: 0 8px 24px rgba(230, 25, 25, 0.4); text-align: center; }
        .email-footer { background: #09090c; padding: 24px 20px; text-align: center; font-size: 11.5px; color: #52525b; border-top: 1px solid rgba(255, 255, 255, 0.05); }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-accent-bar"></div>
        <div class="email-header">
          <div class="brand-logo">
            <span class="logo-crimson">UPPER</span> <span class="logo-white">STORE</span>
          </div>
          <div class="header-subtitle">VIP Subscription Invalidation Notice</div>
        </div>
        <div class="email-body">
          <h2 class="title">Subscription Terminated</h2>
          <p>Hello <strong>${safeName}</strong>,</p>
          <p>We are confirming that your <strong>${planTitle}</strong> on Upper Store (<strong>${userEmail}</strong>) has been officially cancelled per your request.</p>

          <table class="details-table">
            <tr>
              <td class="label">Terminated Plan:</td>
              <td class="value">${planTitle}</td>
            </tr>
            <tr>
              <td class="label">Cancellation Timestamp:</td>
              <td class="value">${dateFormatted}</td>
            </tr>
            <tr>
              <td class="label">Current Account Tier:</td>
              <td class="value" style="color: #71717a;">Standard Tier</td>
            </tr>
          </table>

          <div class="revoked-list">
            <div>&bull; <strong>VIP Badge Revoked:</strong> Your verified badge has been removed from your profile and community reviews.</div>
            <div>&bull; <strong>Platform Fee Reinstated:</strong> Standard platform fee now applies to free software downloads.</div>
            <div>&bull; <strong>Priority Placement Invalidated:</strong> Reviews revert to standard chronological display order.</div>
          </div>

          <p style="font-size: 12.5px; color: #71717a;">You may renew or resubscribe anytime to reactivate 0 INR platform fees and restore your verified badge.</p>

          <div style="text-align: center; margin: 32px 0 20px;">
            <a href="${frontendUrl}/vip-club" class="cta-btn">View VIP Plans &amp; Resubscribe &rarr;</a>
          </div>
        </div>
        <div class="email-footer">
          &copy; ${new Date().getFullYear()} Upper Store Inc. Cryptographic Distribution &amp; Cloud Licensing Authority.
        </div>
      </div>
    </body>
    </html>
  `;

  await sendDispatchEmail({
    to: userEmail,
    subject: `Upper VIP Club: Subscription Cancelled [${planTitle}]`,
    html: htmlContent,
    emailType: 'VIP Subscription Cancellation'
  });
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
  const safeReason = escapeHtml(rejectReason || 'Payment could not be verified in bank records.');
  if (!isEmailConfigured()) {
    console.log(` [EmailService] No email provider configured. Skipping payment rejection email to ${userEmail}. Reason: ${safeReason}`);
    return;
  }

  const name = escapeHtml(userName || userEmail.split('@')[0]);
  const safePlan = escapeHtml(planOrItem || 'Upper VIP Membership');
  const safeUtr = escapeHtml(utrNumber || 'N/A');
  const safeOrderId = escapeHtml(orderId || 'Direct-Order');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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
      <title>Payment Verification Unsuccessful</title>
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070709; color: #f8fafc; margin: 0; padding: 24px 12px; }
        .email-container { max-width: 600px; margin: 0 auto; background: #121217; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7); }
        .email-accent-bar { height: 3px; background: linear-gradient(90deg, #e61919 0%, #ff4d4d 50%, #e61919 100%); }
        .email-header { background: #0c0c10; padding: 32px 24px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
        .brand-logo { font-size: 26px; font-weight: 800; letter-spacing: 2.5px; text-decoration: none; display: inline-block; }
        .logo-crimson { color: #ff2a2a; }
        .logo-white { color: #ffffff; }
        .header-subtitle { font-size: 11px; color: #ff4d4d; font-weight: 700; text-transform: uppercase; letter-spacing: 1.6px; margin-top: 8px; }
        .email-body { padding: 32px 28px; line-height: 1.65; color: #9496a1; font-size: 14px; }
        .alert-pill { display: inline-block; background: rgba(230, 25, 25, 0.14); color: #ff4d4d; border: 1px solid rgba(230, 25, 25, 0.35); padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 18px; }
        .title { color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em; }
        .reason-box { background: rgba(230, 25, 25, 0.06); border-left: 3px solid #e61919; border-radius: 8px; padding: 18px 20px; margin: 24px 0; }
        .reason-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.4px; color: #ff4d4d; font-weight: 700; margin: 0 0 6px 0; }
        .reason-text { font-size: 14px; color: #ffffff; font-weight: 600; margin: 0; line-height: 1.5; }
        .details-table { width: 100%; border-collapse: collapse; margin: 24px 0; background: rgba(255, 255, 255, 0.02); border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.07); font-size: 13.5px; }
        .details-table td { padding: 12px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
        .details-table tr:last-child td { border-bottom: none; }
        .details-table td.label { color: #71717a; font-weight: 600; width: 42%; }
        .details-table td.value { color: #ffffff; font-weight: 600; text-align: right; }
        .steps-box { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 18px 22px; margin: 22px 0; font-size: 13px; color: #9496a1; }
        .steps-box ol { margin: 8px 0 0; padding-left: 18px; }
        .steps-box li { margin-bottom: 6px; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #e61919 0%, #b30f0f 100%); color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-size: 14px; letter-spacing: 0.4px; box-shadow: 0 8px 24px rgba(230, 25, 25, 0.4); text-align: center; }
        .email-footer { background: #09090c; padding: 24px 20px; text-align: center; font-size: 11.5px; color: #52525b; border-top: 1px solid rgba(255, 255, 255, 0.05); }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-accent-bar"></div>
        <div class="email-header">
          <div class="brand-logo">
            <span class="logo-crimson">UPPER</span> <span class="logo-white">STORE</span>
          </div>
          <div class="header-subtitle">Transaction Verification Notice</div>
        </div>
        <div class="email-body">
          <div class="alert-pill">Verification Unsuccessful</div>
          <h2 class="title">Payment Submission Not Verified</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>We reviewed your recent payment submission for <strong>${safePlan}</strong> on Upper Store (<strong>${userEmail}</strong>). The transaction could not be reconciled against bank statements at this time.</p>

          <div class="reason-box">
            <div class="reason-title">Audit Notice / Reason:</div>
            <div class="reason-text">${safeReason}</div>
          </div>

          <table class="details-table">
            <tr>
              <td class="label">Order Reference:</td>
              <td class="value" style="font-family: 'JetBrains Mono', Consolas, monospace;">${safeOrderId}</td>
            </tr>
            <tr>
              <td class="label">Target Item / Plan:</td>
              <td class="value">${safePlan}</td>
            </tr>
            <tr>
              <td class="label">Submitted 12-Digit UTR:</td>
              <td class="value"><code style="font-family: 'JetBrains Mono', Consolas, monospace; font-size: 13px; color: #ff4d4d;">${safeUtr}</code></td>
            </tr>
            ${amount ? `<tr><td class="label">Amount:</td><td class="value" style="color: #ffffff;">INR ${amount} ${currency}</td></tr>` : ''}
            <tr>
              <td class="label">Verification Timestamp:</td>
              <td class="value">${dateFormatted}</td>
            </tr>
            <tr>
              <td class="label">Verification Status:</td>
              <td class="value" style="color: #ff4d4d; font-weight: 700;">UNCONFIRMED / REJECTED</td>
            </tr>
          </table>

          <div class="steps-box">
            <strong style="color: #ffffff;">Resolution Instructions:</strong>
            <ol>
              <li>Open your UPI payment application (Google Pay, PhonePe, Paytm, or BHIM) and verify the transaction debit status.</li>
              <li>Confirm the transfer was dispatched to receiver <code>9692093386@naviaxis</code> (JITENDRA KUMAR MISHRA).</li>
              <li>Inspect your bank receipt for the exact 12-digit numeric <strong>UPI Reference / UTR Number</strong>.</li>
              <li>Log in to Upper Store, open <strong>My Licenses &amp; Subscriptions</strong>, and resubmit with the correct UTR code.</li>
            </ol>
          </div>

          <p style="font-size: 12.5px; color: #71717a;">You may also review this audit record directly in your account dashboard under <em>My Licenses &amp; Subscriptions</em>.</p>

          <div style="text-align: center; margin: 32px 0 20px;">
            <a href="${frontendUrl}" class="cta-btn">Access Workspace &amp; Retry Payment &rarr;</a>
          </div>
        </div>
        <div class="email-footer">
          &copy; ${new Date().getFullYear()} Upper Store Inc. Cryptographic Distribution &amp; Cloud Licensing Authority.
        </div>
      </div>
    </body>
    </html>
  `;

  await sendDispatchEmail({
    to: userEmail,
    subject: `Payment Verification Unsuccessful: ${safePlan} [Order: ${safeOrderId}]`,
    html: htmlContent,
    emailType: 'Payment Verification Rejection'
  });
};

module.exports = {
  sendWelcomeEmail,
  sendLoginAlertEmail,
  sendLicenseDeliveryEmail,
  sendVipSubscriptionEmail,
  sendSubscriptionCancellationEmail,
  sendPaymentRejectionEmail,
};



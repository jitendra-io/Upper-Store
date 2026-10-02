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
          <h2 style="color: #ffffff; margin-top: 0;">Welcome, ${name}! 👋</h2>
          <p>Thank you for joining <strong>Upper Store</strong> — your elite destination for high-performance software, Android APKs, developer tools, and digital assets.</p>
          <p>Your account (<strong>${userEmail}</strong>) is now active and ready. You can now browse verified products, download software releases, leave reviews, and receive instant push updates.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="cta-btn">Explore Product Catalog ➔</a>
          </div>
          <p style="font-size: 13px; color: #94a3b8;">If you did not create this account, please contact our security team immediately.</p>
        </div>
        <div class="email-footer">
          &copy; ${new Date().getFullYear()} Upper Store — All Rights Reserved.<br>
          Cryptographically Verified & SHA-256 Protected Releases.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: defaultFrom,
      to: userEmail,
      subject: '🎉 Welcome to Upper Store — Account Activated!',
      html: htmlContent,
    });
    console.log(`✅ Welcome email sent to ${userEmail} (Msg ID: ${info.messageId})`);
  } catch (error) {
    console.error(`❌ Error sending Welcome email to ${userEmail}:`, error.message);
  }
};

/**
 * Send Login Alert Email to user
 */
const sendLoginAlertEmail = async (userEmail, displayName, loginMethod = 'Email & Password') => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`ℹ️ [Nodemailer] SMTP credentials not set. Skipping Login alert to ${userEmail}.`);
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
          <h2 style="color: #ffffff; margin-top: 0;">New Account Sign-In Detected 🔒</h2>
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
          &copy; ${new Date().getFullYear()} Upper Store — Security Alert Center.<br>
          Cryptographically Verified & SHA-256 Protected Releases.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: defaultFrom,
      to: userEmail,
      subject: '🔑 Security Notification: New Login to Upper Store',
      html: htmlContent,
    });
    console.log(`✅ Login alert email sent to ${userEmail} (Msg ID: ${info.messageId})`);
  } catch (error) {
    console.error(`❌ Error sending Login alert email to ${userEmail}:`, error.message);
  }
};

module.exports = {
  sendWelcomeEmail,
  sendLoginAlertEmail,
};

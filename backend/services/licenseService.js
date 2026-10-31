const crypto = require('crypto');
const dotenv = require('dotenv');
const { getLicenseSecret } = require('../config/jwtConfig');
dotenv.config();

/**
 * Format a byte buffer into human-readable segmented product key:
 * UPPER-XXXX-XXXX-XXXX-XXXX
 */
const formatLicenseKey = (buffer) => {
  const hex = buffer.toString('hex').toUpperCase();
  const segments = [];
  for (let i = 0; i < 16; i += 4) {
    segments.push(hex.substring(i, i + 4));
  }
  return `UPPER-${segments.join('-')}`;
};

/**
 * Generate a Cryptographic Digital Signature for a software license
 */
const generateLicenseSignature = (payload) => {
  const serialized = JSON.stringify({
    licenseId: payload.licenseId,
    productId: payload.productId,
    userEmail: (payload.userEmail || '').trim().toLowerCase(),
    plan: payload.plan,
    expiresAt: payload.expiresAt || null,
  });

  return crypto
    .createHmac('sha256', getLicenseSecret())
    .update(serialized)
    .digest('hex');
};

/**
 * Generate a new tamper-proof software license certificate
 * @param {Object} params
 * @param {string} params.userEmail - Purchaser email
 * @param {string} params.productId - Product ID or special plan (e.g. 'upper-vip')
 * @param {string} params.productTitle - Name of the software
 * @param {string} [params.plan='pro'] - 'pro', 'vip_monthly', 'vip_yearly', 'lifetime', 'enterprise'
 * @param {number} [params.durationDays=null] - Expiration duration in days (null for lifetime)
 * @param {string[]} [params.features=[]] - Enabled feature flags
 * @param {string} [params.orderId=null] - Associated payment order ID
 * @param {string} [params.paymentId=null] - Associated gateway payment ID
 * @param {string} [params.gateway='stripe'] - 'stripe' | 'razorpay'
 */
const generateLicense = ({
  userEmail,
  productId,
  productTitle,
  plan = 'pro',
  durationDays = null,
  features = [],
  orderId = null,
  paymentId = null,
  gateway = 'stripe',
}) => {
  if (!userEmail) throw new Error('userEmail is required to generate a license.');
  if (!productId) throw new Error('productId is required to generate a license.');

  const cleanEmail = userEmail.trim().toLowerCase();
  const licenseId = crypto.randomUUID();
  const randomEntropy = crypto.randomBytes(8);
  const licenseKey = formatLicenseKey(randomEntropy);

  const issuedAt = new Date().toISOString();
  let expiresAt = null;

  if (durationDays && Number(durationDays) > 0) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + Number(durationDays));
    expiresAt = expDate.toISOString();
  }

  // Determine default features if not provided
  let licenseFeatures = Array.isArray(features) && features.length > 0 ? features : [];
  if (licenseFeatures.length === 0) {
    if (plan.includes('vip')) {
      licenseFeatures = ['all_products_access', 'priority_cdn', 'vip_badge', 'cloud_sync', 'premium_support'];
    } else {
      licenseFeatures = ['pro_features', 'ad_free', 'lifetime_updates', 'commercial_use'];
    }
  }

  const payload = {
    licenseId,
    productId,
    userEmail: cleanEmail,
    plan,
    expiresAt,
  };

  const signature = generateLicenseSignature(payload);

  return {
    licenseKey,
    licenseId,
    userEmail: cleanEmail,
    productId,
    productTitle: productTitle || 'Upper Software Pro',
    plan,
    status: 'active', // 'active' | 'revoked' | 'expired'
    issuedAt,
    expiresAt,
    features: licenseFeatures,
    orderId: orderId || `ORD-${Date.now()}`,
    paymentId: paymentId || `PAY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    gateway,
    signature,
  };
};

/**
 * Verify a Cryptographic Software License
 * Checks structure, HMAC digital signature, product binding, and expiration
 */
const verifyLicense = ({ licenseKey, userEmail, productId, storedLicense }) => {
  if (!licenseKey || typeof licenseKey !== 'string') {
    return { isValid: false, reason: 'License key is missing or invalid format.' };
  }

  const cleanKey = licenseKey.trim().toUpperCase();
  if (!cleanKey.startsWith('UPPER-') || cleanKey.length !== 25) {
    return { isValid: false, reason: 'Malformed license key format. Expected UPPER-XXXX-XXXX-XXXX-XXXX.' };
  }

  if (!storedLicense) {
    return { isValid: false, reason: 'License record not found in system.' };
  }

  if (storedLicense.status === 'revoked') {
    return { isValid: false, reason: 'License has been revoked by administration.' };
  }

  if (storedLicense.status === 'cancelled' || storedLicense.isCancelled) {
    return { isValid: false, reason: 'Subscription license was cancelled and premium privileges have been invalidated.' };
  }

  // Check email match if email provided
  if (userEmail) {
    const cleanEmail = userEmail.trim().toLowerCase();
    if (storedLicense.userEmail && storedLicense.userEmail.toLowerCase() !== cleanEmail) {
      return { isValid: false, reason: 'License is registered to a different account.' };
    }
  }

  // Check product match if productId provided (VIP licenses apply to all products)
  if (productId && storedLicense.productId !== 'upper-vip' && !storedLicense.plan.includes('vip')) {
    if (storedLicense.productId !== productId) {
      return { isValid: false, reason: 'License is not valid for this specific product.' };
    }
  }

  // Check expiration date
  if (storedLicense.expiresAt) {
    const now = new Date();
    const expiry = new Date(storedLicense.expiresAt);
    if (now > expiry) {
      return { isValid: false, reason: `License expired on ${expiry.toLocaleDateString()}.` };
    }
  }

  // Verify HMAC cryptographic digital signature
  const expectedSignature = generateLicenseSignature({
    licenseId: storedLicense.licenseId,
    productId: storedLicense.productId,
    userEmail: storedLicense.userEmail,
    plan: storedLicense.plan,
    expiresAt: storedLicense.expiresAt,
  });

  const isSignatureValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf8'),
    Buffer.from(storedLicense.signature || '', 'utf8')
  );

  if (!isSignatureValid) {
    return { isValid: false, reason: 'Cryptographic signature mismatch. License tampering detected.' };
  }

  return {
    isValid: true,
    license: {
      licenseKey: storedLicense.licenseKey,
      plan: storedLicense.plan,
      productTitle: storedLicense.productTitle,
      userEmail: storedLicense.userEmail,
      issuedAt: storedLicense.issuedAt,
      expiresAt: storedLicense.expiresAt,
      features: storedLicense.features,
      status: 'active',
    },
  };
};

module.exports = {
  generateLicense,
  verifyLicense,
  generateLicenseSignature,
  formatLicenseKey,
};

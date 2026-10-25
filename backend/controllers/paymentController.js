const crypto = require('crypto');
const Stripe = require('stripe');
const Razorpay = require('razorpay');
const { db, FieldValue } = require('../config/firebase');
const { generateLicense, verifyLicense } = require('../services/licenseService');
const { sendLicenseDeliveryEmail, sendVipSubscriptionEmail, sendSubscriptionCancellationEmail, sendPaymentRejectionEmail } = require('../services/emailService');
const { getPlatformFeeConfig, getPaymentConfigHelper } = require('./settingsController');

// Initialize Stripe Client
let stripeClient = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('💳 Stripe payment gateway initialized successfully');
  } catch (err) {
    console.warn('⚠️ Stripe initialization failed:', err.message);
  }
} else {
  console.log('ℹ️ Stripe API key not configured. Mock sandbox mode active for Stripe checkout.');
}

// Initialize Razorpay Client
let razorpayClient = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('💳 Razorpay payment gateway initialized successfully');
  } catch (err) {
    console.warn('⚠️ Razorpay initialization failed:', err.message);
  }
} else {
  console.log('ℹ️ Razorpay API credentials not configured. Mock sandbox mode active for Razorpay checkout.');
}

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

/**
 * Canonical VIP Subscription Plans Configuration (Server-Side Source of Truth)
 */
const VIP_SUBSCRIPTION_PLANS = Object.freeze({
  pro: {
    planId: 'pro',
    name: 'Pro Member',
    productTitle: 'Upper VIP Club — Pro Member (Monthly)',
    productId: 'upper-vip-pro',
    durationDays: 30,
    amountUSD: 1.25,
    amountINR: 99,
    badge: 'gold',
    tierRank: 1,
    features: ['zero_platform_fee', 'gold_vip_badge', 'priority_cdn', 'vip_community'],
  },
  elite: {
    planId: 'elite',
    name: 'Elite VIP',
    productTitle: 'Upper VIP Club — Elite Member (Annual)',
    productId: 'upper-vip-elite',
    durationDays: 365,
    amountUSD: 4.99,
    amountINR: 399,
    badge: 'purple',
    tierRank: 2,
    features: ['zero_platform_fee', 'purple_vip_badge', 'pinned_reviews', 'ultra_vip_cdn', 'early_access'],
  },
});

/**
 * Normalizes input subscription plan string to canonical key ('pro' | 'elite')
 */
const normalizeSubscriptionPlan = (rawPlan) => {
  if (!rawPlan || typeof rawPlan !== 'string') return null;
  const p = rawPlan.trim().toLowerCase();
  if (p === 'pro' || p === 'pro_monthly' || p === 'vip_monthly') return 'pro';
  if (p === 'elite' || p === 'elite_yearly' || p === 'vip_yearly') return 'elite';
  return null;
};

/**
 * Standard Plan Details & Price Resolver with Production Whitelist Enforcement
 */
const resolvePlanDetails = async (productId, plan = 'pro') => {
  // 1. One-time Platform Fee for single download (Admin controlled fee)
  if (plan === 'download_fee') {
    const feeConfig = await getPlatformFeeConfig();
    let title = 'Software Product';
    let isProductFeeWaived = false;

    if (productId && productId !== 'download-fee') {
      try {
        const doc = await db.collection('products').doc(productId).get();
        if (doc.exists) {
          const pData = doc.data();
          title = pData.title || title;
          if (pData.isPlatformFeeWaived === true) {
            isProductFeeWaived = true;
          }
        }
      } catch (e) {}
    }

    // If platform fee is disabled globally or waived for this product, reject checkout with 400
    if (!feeConfig.enabled || feeConfig.amount === 0 || isProductFeeWaived) {
      const err = new Error('Platform fee is currently waived by the administrator. This product can be downloaded for free.');
      err.statusCode = 400;
      throw err;
    }

    const amountINR = Math.max(0, Math.min(999, Math.round(feeConfig.amount)));
    const amountUSD = Math.max(0.1, Math.round((amountINR / 85) * 100) / 100);

    return {
      productId: productId || 'download-fee',
      productTitle: `${title} — Standard Download Fee`,
      plan: 'download_fee',
      durationDays: null,
      amountUSD,
      amountINR,
      features: ['verified_single_download', 'secure_cdn_delivery'],
    };
  }

  // 2. VIP Membership Plans (Server-Enforced Whitelist & Pricing)
  const isVipRequest = (productId && String(productId).startsWith('upper-vip')) ||
    ['pro_monthly', 'elite_yearly', 'vip_monthly', 'vip_yearly'].includes(plan) ||
    (['pro', 'elite'].includes(plan) && (!productId || String(productId).startsWith('upper-vip')));

  if (isVipRequest) {
    const normalized = normalizeSubscriptionPlan(plan);
    if (!normalized || !VIP_SUBSCRIPTION_PLANS[normalized]) {
      const err = new Error(`Validation Error: Invalid subscription plan "${plan}". Supported plans: "pro" and "elite".`);
      err.statusCode = 400;
      throw err;
    }
    const vipConfig = VIP_SUBSCRIPTION_PLANS[normalized];
    return {
      productId: vipConfig.productId,
      productTitle: vipConfig.productTitle,
      plan: vipConfig.planId,
      durationDays: vipConfig.durationDays,
      amountUSD: vipConfig.amountUSD,
      amountINR: vipConfig.amountINR,
      badge: vipConfig.badge,
      features: vipConfig.features,
    };
  }

  // 3. Specific Catalog Product Pro License
  let productTitle = 'Upper Software Pro';
  let amountUSD = 19;
  let amountINR = 1499;

  if (productId && productId !== 'upper-vip') {
    try {
      const doc = await db.collection('products').doc(productId).get();
      if (doc.exists) {
        const data = doc.data();
        productTitle = `${data.title} Pro License`;
        if (data.licensePrice) {
          const parsed = parseFloat(String(data.licensePrice).replace(/[^0-9.]/g, ''));
          if (!isNaN(parsed) && parsed > 0) {
            amountUSD = parsed;
            amountINR = Math.round(parsed * 85);
          }
        } else if (data.price) {
          const parsed = parseFloat(String(data.price).replace(/[^0-9.]/g, ''));
          if (!isNaN(parsed) && parsed > 0) {
            amountUSD = parsed;
            amountINR = Math.round(parsed * 85);
          }
        }
      }
    } catch (e) {
      console.warn('Error reading product price from Firestore:', e.message);
    }
  }

  return {
    productId: productId || 'upper-product-pro',
    productTitle,
    plan: 'pro',
    durationDays: null, // Lifetime Pro License
    amountUSD,
    amountINR,
    features: ['pro_features', 'ad_free', 'lifetime_updates', 'commercial_use'],
  };
};

/**
 * @desc    Create a payment checkout session (Stripe or Razorpay)
 * @route   POST /api/payments/create-checkout-session
 * @access  Private (Authenticated User)
 */
const createCheckoutSession = async (req, res) => {
  try {
    const { productId, plan = 'pro', gateway = 'stripe' } = req.body;
    const userEmail = (req.user?.email || '').trim().toLowerCase();
    const userId = req.user?.uid || req.user?.id || 'anon_user';

    // 1. Email format and authentication validation
    if (!userEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return res.status(400).json({ message: 'Validation Error: A valid authenticated user email is required.' });
    }

    // 2. Gateway Whitelist Validation
    const cleanGateway = (gateway || '').trim().toLowerCase();
    if (!['stripe', 'razorpay'].includes(cleanGateway)) {
      return res.status(400).json({ message: 'Validation Error: Invalid payment gateway. Supported gateways: "stripe", "razorpay".' });
    }

    // 3. User account status check in Firestore
    const userSnapshot = await db.collection('users').where('email', '==', userEmail).get();
    if (userSnapshot.empty) {
      return res.status(404).json({ message: 'User account not found. Please log in again.' });
    }
    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    if (userData.isBanned) {
      return res.status(403).json({ message: 'Account Restricted: Banned accounts cannot purchase or upgrade subscription plans.' });
    }

    // 4. VIP Subscription Validation & Hierarchy Checks
    const isVipRequest = (productId && String(productId).startsWith('upper-vip')) ||
      ['pro_monthly', 'elite_yearly', 'vip_monthly', 'vip_yearly'].includes(plan) ||
      (['pro', 'elite'].includes(plan) && (!productId || String(productId).startsWith('upper-vip')));

    if (isVipRequest) {
      const normalizedPlan = normalizeSubscriptionPlan(plan);
      if (!normalizedPlan) {
        return res.status(400).json({
          message: `Validation Error: Invalid subscription plan "${plan}". Supported subscription plans: "pro" (Monthly) and "elite" (Annual).`,
        });
      }

      // Check current active membership: If user already has an active subscription, they cannot purchase another unless cancelled
      const currentMembership = userData.membership;
      const isCurrentVipActive =
        currentMembership?.plan &&
        currentMembership.plan !== 'free' &&
        currentMembership.validUntil &&
        new Date(currentMembership.validUntil) > new Date() &&
        !currentMembership.isCancelled;

      if (isCurrentVipActive) {
        const expiryFormatted = new Date(currentMembership.validUntil).toLocaleDateString();
        const activePlanName = currentMembership.plan === 'elite' ? 'Elite VIP' : 'Pro Member';
        return res.status(400).json({
          message: `Active Subscription Exists: You currently have an active ${activePlanName} subscription valid until ${expiryFormatted}. You cannot request or purchase another subscription unless you cancel your current plan first.`,
          code: 'ACTIVE_SUBSCRIPTION_EXISTS',
          activePlan: currentMembership.plan,
          validUntil: currentMembership.validUntil,
        });
      }

      // Check if user already has a pending subscription request awaiting verification
      const pendingSnapshot = await db.collection('upi_payments')
        .where('userEmail', '==', userEmail)
        .where('status', '==', 'pending_verification')
        .get();

      const pendingSubDoc = pendingSnapshot.docs.find((d) => {
        const pData = d.data();
        return (
          (pData.productId && String(pData.productId).startsWith('upper-vip')) ||
          ['pro', 'elite'].includes(pData.plan)
        );
      });

      if (pendingSubDoc) {
        const pendingData = pendingSubDoc.data();
        return res.status(400).json({
          message: `Subscription Request Pending: You already have a subscription request pending verification (Order: ${pendingData.orderId}). You cannot request another plan until your pending request is approved or rejected by the administrator.`,
          code: 'PENDING_SUBSCRIPTION_EXISTS',
        });
      }
    } else if (plan === 'pro' && productId && !productId.startsWith('upper-vip')) {
      const pDoc = await db.collection('products').doc(productId).get();
      if (pDoc.exists) {
        const pData = pDoc.data();
        if (pData.hasLicenseKey === false) {
          return res.status(400).json({
            message: 'License Key system is not enabled for this product.',
          });
        }
      }
    }

    const planDetails = await resolvePlanDetails(productId, plan);

    // ==========================================
    // 1. STRIPE CHECKOUT INTEGRATION
    // ==========================================
    if (cleanGateway === 'stripe') {
      const unitAmountInCents = Math.round(planDetails.amountUSD * 100);

      if (stripeClient) {
        const session = await stripeClient.checkout.sessions.create({
          payment_method_types: ['card'],
          customer_email: userEmail,
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: planDetails.productTitle,
                  description: `Cryptographically verified software license for ${userEmail}.`,
                },
                unit_amount: unitAmountInCents,
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${FRONTEND_URL}/payment/cancel`,
          metadata: {
            userId,
            userEmail,
            productId: planDetails.productId,
            productTitle: planDetails.productTitle,
            plan: planDetails.plan,
            durationDays: String(planDetails.durationDays || 0),
          },
        });

        // Record pending order for replay & fulfillment tracking
        await db.collection('orders').doc(session.id).set({
          orderId: session.id,
          userEmail,
          userId,
          productId: planDetails.productId,
          productTitle: planDetails.productTitle,
          plan: planDetails.plan,
          amount: planDetails.amountUSD,
          currency: 'USD',
          gateway: 'stripe',
          status: 'pending',
          createdAt: new Date().toISOString(),
        });

        return res.json({
          gateway: 'stripe',
          sessionId: session.id,
          checkoutUrl: session.url,
          amount: planDetails.amountUSD,
          currency: 'USD',
          productTitle: planDetails.productTitle,
        });
      } else {
        // Sandbox Simulation Mode (when keys not yet provisioned in .env)
        const mockSessionId = `mock_stripe_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        await db.collection('orders').doc(mockSessionId).set({
          orderId: mockSessionId,
          userEmail,
          userId,
          productId: planDetails.productId,
          productTitle: planDetails.productTitle,
          plan: planDetails.plan,
          amount: planDetails.amountUSD,
          currency: 'USD',
          gateway: 'stripe',
          status: 'pending',
          createdAt: new Date().toISOString(),
        });

        return res.json({
          gateway: 'stripe',
          sessionId: mockSessionId,
          checkoutUrl: `${FRONTEND_URL}/payment/success?session_id=${mockSessionId}&mock=true`,
          amount: planDetails.amountUSD,
          currency: 'USD',
          productTitle: planDetails.productTitle,
          isMock: true,
          message: 'Running in sandbox development mode. Complete checkout via success callback.',
        });
      }
    }

    // ==========================================
    // 2. RAZORPAY CHECKOUT INTEGRATION
    // ==========================================
    if (cleanGateway === 'razorpay') {
      const amountInPaise = Math.round(planDetails.amountINR * 100);
      const receiptId = `rcpt_${Date.now().toString().slice(-8)}`;

      if (razorpayClient) {
        const order = await razorpayClient.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: receiptId,
          notes: {
            userId,
            userEmail,
            productId: planDetails.productId,
            productTitle: planDetails.productTitle,
            plan: planDetails.plan,
            durationDays: String(planDetails.durationDays || 0),
          },
        });

        // Record pending order for replay & fulfillment tracking
        await db.collection('orders').doc(order.id).set({
          orderId: order.id,
          userEmail,
          userId,
          productId: planDetails.productId,
          productTitle: planDetails.productTitle,
          plan: planDetails.plan,
          amount: planDetails.amountINR,
          currency: 'INR',
          gateway: 'razorpay',
          status: 'pending',
          createdAt: new Date().toISOString(),
        });

        return res.json({
          gateway: 'razorpay',
          orderId: order.id,
          amount: order.amount,
          currency: 'INR',
          keyId: process.env.RAZORPAY_KEY_ID,
          productTitle: planDetails.productTitle,
          userEmail,
        });
      } else {
        // Sandbox Simulation Mode
        const mockOrderId = `order_mock_${Date.now()}`;
        await db.collection('orders').doc(mockOrderId).set({
          orderId: mockOrderId,
          userEmail,
          userId,
          productId: planDetails.productId,
          productTitle: planDetails.productTitle,
          plan: planDetails.plan,
          amount: planDetails.amountINR,
          currency: 'INR',
          gateway: 'razorpay',
          status: 'pending',
          createdAt: new Date().toISOString(),
        });

        return res.json({
          gateway: 'razorpay',
          orderId: mockOrderId,
          amount: amountInPaise,
          currency: 'INR',
          keyId: 'rzp_test_mock_sandbox',
          productTitle: planDetails.productTitle,
          userEmail,
          isMock: true,
          message: 'Running in sandbox development mode.',
        });
      }
    }

    return res.status(400).json({ message: 'Validation Error: Invalid payment gateway requested. Supported: "stripe", "razorpay".' });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Error creating checkout session.' });
  }
};

/**
 * Helper to fulfill order and generate cryptographic license certificate
 */
const fulfillOrderAndIssueLicense = async ({
  orderId,
  paymentId,
  gateway,
  userEmail,
  productId,
  productTitle,
  plan,
  durationDays,
  amount,
  currency,
}) => {
  const cleanEmail = userEmail.trim().toLowerCase();

  // 0. Idempotency Check: Has this order already been fulfilled?
  if (orderId) {
    try {
      const existingDoc = await db.collection('orders').doc(orderId).get();
      if (existingDoc.exists && existingDoc.data().status === 'completed') {
        console.log(`[Idempotency Guard] Order ${orderId} already completed. Returning existing certificate.`);
        const licDoc = await db.collection('licenses').doc(existingDoc.data().licenseKey).get();
        if (licDoc.exists) return licDoc.data();
      }
    } catch (e) {
      console.warn('Idempotency order check warning:', e.message);
    }
  }

  // 1. Generate Cryptographic License Certificate
  const license = generateLicense({
    userEmail: cleanEmail,
    productId,
    productTitle,
    plan,
    durationDays: durationDays ? Number(durationDays) : null,
    orderId,
    paymentId,
    gateway,
  });

  // 2. Persist in Firestore 'licenses' Collection
  await db.collection('licenses').doc(license.licenseKey).set(license);

  // 3. Persist Order Record in Firestore 'orders' Collection
  const orderRecord = {
    orderId,
    paymentId,
    gateway,
    userEmail: cleanEmail,
    productId,
    productTitle,
    plan,
    amount: Number(amount) || 0,
    currency: currency || 'USD',
    licenseKey: license.licenseKey,
    status: 'completed',
    createdAt: new Date().toISOString(),
  };
  await db.collection('orders').doc(orderId).set(orderRecord, { merge: true });

  // 4. If VIP Membership or Download Fee, upgrade user profile in Firestore
  const isVipPlan = plan === 'pro' || plan === 'elite' || String(plan).includes('vip');

  try {
    const userSnapshot = await db.collection('users').where('email', '==', cleanEmail).get();
    if (!userSnapshot.empty) {
      const userRef = userSnapshot.docs[0].ref;
      const userData = userSnapshot.docs[0].data();

      if (isVipPlan) {
        const vipDays = (plan === 'elite' || plan === 'vip_yearly') ? 365 : 30;
        const membershipPlan = (plan === 'elite' || plan === 'vip_yearly') ? 'elite' : 'pro';
        const badge = membershipPlan === 'elite' ? 'purple' : 'gold';
        const amountNum = Number(amount) || (membershipPlan === 'elite' ? 399 : 99);
        const startDate = new Date().toISOString();

        // Stacking Calculation: If extending currently active plan, add to existing expiry
        const nowMs = Date.now();
        let validUntil;
        const currentValidUntil = userData.membership?.validUntil;
        const currentExpiryMs = currentValidUntil ? new Date(currentValidUntil).getTime() : 0;

        if (currentExpiryMs > nowMs && userData.membership?.plan === membershipPlan) {
          // Extending same tier: stack vipDays onto current expiry date
          validUntil = new Date(currentExpiryMs + vipDays * 86400000).toISOString();
          console.log(`⭐ [VIP Stacking] User ${cleanEmail} extended ${membershipPlan} by ${vipDays} days. New expiry: ${validUntil}`);
        } else {
          // New subscription, expired subscription, or upgrade from Pro to Elite
          validUntil = new Date(nowMs + vipDays * 86400000).toISOString();
        }

        const membershipData = {
          plan: membershipPlan,
          badge,
          validUntil,
        };

        const updatePayload = {
          membership: membershipData,
          isVip: true,
          vipPlan: membershipPlan,
          vipExpiresAt: validUntil,
          lastSubscribedAt: startDate,
          lastSubscriptionPlan: membershipPlan,
          lastSubscriptionOrderId: orderId,
          updatedAt: startDate,
        };

        // Use Firebase FieldValue.increment to track cumulative subscription data
        if (FieldValue && typeof FieldValue.increment === 'function') {
          updatePayload.subscriptionCount = FieldValue.increment(1);
          updatePayload.totalVipDays = FieldValue.increment(vipDays);
          updatePayload.totalAmountSpent = FieldValue.increment(amountNum);
        } else {
          updatePayload.subscriptionCount = (Number(userData.subscriptionCount) || 0) + 1;
          updatePayload.totalVipDays = (Number(userData.totalVipDays) || 0) + vipDays;
          updatePayload.totalAmountSpent = (Number(userData.totalAmountSpent) || 0) + amountNum;
        }

        await userRef.update(updatePayload);
        license.membership = membershipData;

        // Also update orderRecord with membership for easy reference
        await db.collection('orders').doc(orderId).update({ membership: membershipData });

        console.log(`⭐ User ${cleanEmail} VIP activated (${membershipPlan}) with ${badge} badge using FieldValue.increment`);

        // Send VIP Membership Confirmation Email with Plan, Badge, Start Date, and End Date
        sendVipSubscriptionEmail({
          userEmail: cleanEmail,
          displayName: userData.displayName || cleanEmail.split('@')[0],
          plan: membershipPlan,
          badge,
          startDate,
          validUntil,
          orderId,
          amount: amountNum,
          currency: currency || 'INR',
        }).catch((err) => console.warn('Non-blocking VIP subscription email error:', err.message));
      } else if (plan === 'download_fee') {
        const existingData = userSnapshot.docs[0].data();
        const paidDownloads = Array.isArray(existingData.paidDownloads) ? existingData.paidDownloads : [];
        if (!paidDownloads.includes(productId)) {
          paidDownloads.push(productId);
          await userRef.update({
            paidDownloads,
            updatedAt: new Date().toISOString(),
          });
        }
        license.downloadUnlocked = true;
        license.paidDownloads = paidDownloads;
      }
    }
  } catch (err) {
    console.warn('Error upgrading user VIP/download status in Firestore:', err.message);
  }

  // 5. Send automated receipt and cryptographic license email for software/product orders
  if (!isVipPlan) {
    sendLicenseDeliveryEmail({
      userEmail: cleanEmail,
      productTitle,
      licenseKey: license.licenseKey,
      plan,
      expiresAt: license.expiresAt,
      orderId,
      amount,
      currency,
    }).catch((err) => console.warn('Non-blocking license email error:', err.message));
  }

  console.log(`✅ Order fulfilled: ${license.licenseKey} for ${cleanEmail} [${productTitle || plan}]`);
  return license;
};

/**
 * @desc    Secure Stripe Webhook Listener (validates HMAC signature)
 * @route   POST /api/payments/webhook/stripe
 * @access  Public (Webhook Signature Verified)
 */
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  if (stripeClient && webhookSecret) {
    try {
      if (!req.rawBody) {
        throw new Error('Raw body buffer unavailable for Stripe signature verification.');
      }
      event = stripeClient.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
      console.error(`⚠️ Stripe webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  } else {
    // Development sandbox simulation
    event = req.body;
  }

  // Handle successful checkout with idempotency check
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata || {};

    const userEmail = session.customer_email || metadata.userEmail;
    if (userEmail) {
      try {
        const existingOrder = await db.collection('orders').doc(session.id).get();
        if (!existingOrder.exists || existingOrder.data().status !== 'completed') {
          await fulfillOrderAndIssueLicense({
            orderId: session.id,
            paymentId: session.payment_intent || session.id,
            gateway: 'stripe',
            userEmail,
            productId: metadata.productId || 'upper-product',
            productTitle: metadata.productTitle || 'Upper Software Pro',
            plan: metadata.plan || 'pro',
            durationDays: metadata.durationDays ? Number(metadata.durationDays) : null,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: (session.currency || 'usd').toUpperCase(),
          });
        } else {
          console.log(`[Stripe Webhook] Order ${session.id} already fulfilled.`);
        }
      } catch (fulfillErr) {
        console.error('Error fulfilling Stripe checkout session:', fulfillErr);
      }
    }
  }

  res.json({ received: true });
};

/**
 * @desc    Secure Razorpay Webhook Listener (validates HMAC-SHA256 signature)
 * @route   POST /api/payments/webhook/razorpay
 * @access  Public (HMAC Verified)
 */
const handleRazorpayWebhook = async (req, res) => {
  const razorpaySignature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (webhookSecret) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.rawBody || JSON.stringify(req.body))
      .digest('hex');

    const sigBuf = Buffer.from(razorpaySignature || '', 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.warn('⚠️ Razorpay webhook signature mismatch.');
      return res.status(400).json({ message: 'Invalid webhook signature.' });
    }
  }

  const payload = req.body;

  if (payload.event === 'order.paid' || payload.event === 'payment.captured') {
    const payment = payload.payload?.payment?.entity;
    const orderNotes = payment?.notes || {};
    const orderId = payment.order_id || `ORD-RZP-${Date.now()}`;

    const userEmail = payment?.email || orderNotes.userEmail;
    if (userEmail) {
      try {
        const existingOrder = await db.collection('orders').doc(orderId).get();
        if (!existingOrder.exists || existingOrder.data().status !== 'completed') {
          await fulfillOrderAndIssueLicense({
            orderId,
            paymentId: payment.id,
            gateway: 'razorpay',
            userEmail,
            productId: orderNotes.productId || 'upper-product',
            productTitle: orderNotes.productTitle || 'Upper Software Pro',
            plan: orderNotes.plan || 'pro',
            durationDays: orderNotes.durationDays ? Number(orderNotes.durationDays) : null,
            amount: payment.amount ? payment.amount / 100 : 0,
            currency: payment.currency || 'INR',
          });
        } else {
          console.log(`[Razorpay Webhook] Order ${orderId} already fulfilled.`);
        }
      } catch (err) {
        console.error('Error fulfilling Razorpay order:', err);
      }
    }
  }

  res.json({ status: 'ok' });
};

/**
 * @desc    Verify client-side Razorpay modal completion & issue license
 * @route   POST /api/payments/verify-razorpay
 * @access  Private (Authenticated User)
 */
const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      productId,
      plan = 'pro',
      productTitle,
    } = req.body;

    const userEmail = (req.user?.email || '').trim().toLowerCase();
    if (!userEmail) return res.status(401).json({ message: 'Authentication required.' });

    // 1. Input parameter format validation
    if (!razorpay_order_id || typeof razorpay_order_id !== 'string' || razorpay_order_id.length > 100) {
      return res.status(400).json({ message: 'Validation Error: Valid razorpay_order_id is required.' });
    }
    if (!razorpay_payment_id || typeof razorpay_payment_id !== 'string' || razorpay_payment_id.length > 100) {
      return res.status(400).json({ message: 'Validation Error: Valid razorpay_payment_id is required.' });
    }

    // 2. Replay & Idempotency Check: Was this order already completed?
    const existingOrderDoc = await db.collection('orders').doc(razorpay_order_id).get();
    if (existingOrderDoc.exists && existingOrderDoc.data().status === 'completed') {
      console.log(`[Idempotency] Order ${razorpay_order_id} was already completed. Returning existing certificate.`);
      const existingLicenseDoc = await db.collection('licenses').doc(existingOrderDoc.data().licenseKey).get();
      return res.json({
        success: true,
        message: 'Order was already verified and fulfilled.',
        license: existingLicenseDoc.exists ? existingLicenseDoc.data() : null,
        membership: existingOrderDoc.data().membership || null,
      });
    }

    // 3. Cryptographic HMAC-SHA256 Signature Verification
    if (process.env.RAZORPAY_KEY_SECRET) {
      if (!razorpay_signature) {
        return res.status(400).json({ message: 'Validation Error: Missing cryptographic payment signature.' });
      }
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      const sigBuf = Buffer.from(razorpay_signature, 'utf8');
      const expBuf = Buffer.from(generatedSignature, 'utf8');

      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        console.warn(`⚠️ Razorpay signature mismatch detected for order ${razorpay_order_id}`);
        return res.status(400).json({ message: 'Security Alert: Cryptographic payment signature verification failed.' });
      }
    }

    const planDetails = await resolvePlanDetails(productId, plan);

    // 4. Live Gateway Amount & Status Verification (Anti-Tampering)
    if (razorpayClient) {
      try {
        const paymentEntity = await razorpayClient.payments.fetch(razorpay_payment_id);
        if (!paymentEntity) {
          return res.status(400).json({ message: 'Security Alert: Could not verify payment entity with Razorpay.' });
        }
        if (paymentEntity.status !== 'captured' && paymentEntity.status !== 'authorized') {
          return res.status(400).json({ message: `Security Alert: Payment status is ${paymentEntity.status}, expected captured or authorized.` });
        }
        const expectedPaise = Math.round(planDetails.amountINR * 100);
        if (paymentEntity.amount !== expectedPaise) {
          console.error(`⚠️ Price tamper attempt detected! Paid: ${paymentEntity.amount} paise, Expected: ${expectedPaise} paise`);
          return res.status(400).json({ message: 'Security Violation: Payment amount does not match required plan price.' });
        }
      } catch (rzpFetchErr) {
        console.error('Error fetching payment from Razorpay API:', rzpFetchErr.message);
        return res.status(400).json({ message: `Gateway Verification Error: ${rzpFetchErr.message}` });
      }
    }

    const license = await fulfillOrderAndIssueLicense({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      gateway: 'razorpay',
      userEmail,
      productId: planDetails.productId,
      productTitle: productTitle || planDetails.productTitle,
      plan: planDetails.plan,
      durationDays: planDetails.durationDays,
      amount: planDetails.amountINR,
      currency: 'INR',
    });

    res.json({
      success: true,
      message: 'Payment verified and cryptographic license issued.',
      license,
      membership: license.membership || null,
    });
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({ message: error.message || 'Payment verification failed.' });
  }
};

/**
 * @desc    Simulate/Complete sandbox checkout in dev mode (Permanently disabled in production)
 * @route   POST /api/payments/complete-sandbox-checkout
 * @access  Private (Authenticated User)
 */
const completeSandboxCheckout = async (req, res) => {
  try {
    // 1. Strict Production & Payment Mode Guard
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        message: 'Security Violation: Sandbox checkout simulation is permanently disabled in production mode.',
      });
    }

    const paymentConfig = await getPaymentConfigHelper();
    const isAdmin = req.user?.role === 'admin';
    if (paymentConfig.paymentMode !== 'sandbox' && !isAdmin) {
      return res.status(403).json({
        message: 'Direct sandbox bypass is disabled. Real UPI QR payments are required to purchase subscriptions.',
      });
    }

    const { productId, plan = 'pro', gateway = 'stripe' } = req.body;
    const userEmail = (req.user?.email || '').trim().toLowerCase();
    if (!userEmail) return res.status(401).json({ message: 'Authentication required.' });

    // 2. Validate User Account Status
    const userSnapshot = await db.collection('users').where('email', '==', userEmail).get();
    if (userSnapshot.empty) return res.status(404).json({ message: 'User account not found.' });
    if (userSnapshot.docs[0].data().isBanned) {
      return res.status(403).json({ message: 'Account Restricted: Banned users cannot subscribe.' });
    }

    // 3. Validate Plan Whitelist & Hierarchy
    const isVipRequest = (productId && String(productId).startsWith('upper-vip')) ||
      ['pro_monthly', 'elite_yearly', 'vip_monthly', 'vip_yearly'].includes(plan) ||
      (['pro', 'elite'].includes(plan) && (!productId || String(productId).startsWith('upper-vip')));

    if (isVipRequest) {
      const normalized = normalizeSubscriptionPlan(plan);
      if (!normalized) {
        return res.status(400).json({ message: 'Validation Error: Invalid subscription plan.' });
      }
      const existingMembership = userSnapshot.docs[0].data().membership;
      if (existingMembership?.plan === 'elite' &&
          existingMembership?.validUntil &&
          new Date(existingMembership.validUntil) > new Date() &&
          normalized === 'pro') {
        return res.status(400).json({ message: 'Cannot downgrade to Pro while Elite VIP is active.' });
      }
    }

    const planDetails = await resolvePlanDetails(productId, plan);
    const mockOrderId = `ORD-SANDBOX-${Date.now()}`;
    const mockPaymentId = `PAY-SANDBOX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const license = await fulfillOrderAndIssueLicense({
      orderId: mockOrderId,
      paymentId: mockPaymentId,
      gateway,
      userEmail,
      productId: planDetails.productId,
      productTitle: planDetails.productTitle,
      plan: planDetails.plan,
      durationDays: planDetails.durationDays,
      amount: gateway === 'razorpay' ? planDetails.amountINR : planDetails.amountUSD,
      currency: gateway === 'razorpay' ? 'INR' : 'USD',
    });

    res.status(201).json({
      success: true,
      message: 'Sandbox payment completed successfully.',
      license,
      membership: license.membership || null,
      downloadUnlocked: Boolean(license.downloadUnlocked),
      productId: planDetails.productId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Sandbox checkout failed.' });
  }
};

/**
 * @desc    Get all active licenses owned by the authenticated user
 * @route   GET /api/payments/my-licenses
 * @access  Private (Authenticated User)
 */
const getUserLicenses = async (req, res) => {
  try {
    const userEmail = (req.user?.email || '').trim().toLowerCase();
    if (!userEmail) return res.status(401).json({ message: 'Authentication required.' });

    const snapshot = await db.collection('licenses').where('userEmail', '==', userEmail).get();
    const licenses = [];

    for (const doc of snapshot.docs) {
      licenses.push({ id: doc.id, ...doc.data() });
    }

    // Also fetch rejected and pending UPI payments so payment verification status appears in user's profile
    try {
      const upiSnapshot = await db.collection('upi_payments')
        .where('userEmail', '==', userEmail)
        .get();

      upiSnapshot.forEach((doc) => {
        const pData = doc.data();
        // If approved, an official license is already present in `licenses`
        if (pData.status === 'rejected' || pData.status === 'pending_verification') {
          licenses.push({
            id: `upi-sub-${doc.id}`,
            paymentId: doc.id,
            isPaymentRejection: pData.status === 'rejected',
            isPaymentPending: pData.status === 'pending_verification',
            status: pData.status,
            rejectReason: pData.rejectReason || 'Payment could not be verified in bank records.',
            productTitle: pData.productTitle || (pData.plan === 'elite' ? 'Upper Elite VIP (Annual All-Access)' : 'Upper VIP Subscription'),
            productId: pData.productId || (pData.plan ? 'upper-vip' : 'software'),
            plan: pData.plan || 'pro',
            orderId: pData.orderId,
            utrNumber: pData.utrNumber,
            amount: pData.amount,
            currency: 'INR',
            gateway: 'upi_qr',
            submittedAt: pData.submittedAt,
            rejectedAt: pData.reviewedAt || pData.updatedAt || null,
            issuedAt: pData.submittedAt,
          });
        }
      });
    } catch (e) {
      console.warn('Error fetching UPI payments in getUserLicenses:', e.message);
    }

    licenses.sort((a, b) => new Date(b.issuedAt || b.rejectedAt || b.submittedAt || 0) - new Date(a.issuedAt || a.rejectedAt || a.submittedAt || 0));
    res.json(licenses);
  } catch (error) {
    console.error('Error fetching user licenses:', error);
    res.status(500).json({ message: 'Error fetching licenses.' });
  }
};

/**
 * @desc    Public cryptographic software license verification endpoint
 * @route   POST /api/payments/verify-license
 * @access  Public (Desktop/Mobile App activation check)
 */
const verifyLicenseKey = async (req, res) => {
  try {
    const { licenseKey, userEmail, productId } = req.body;

    if (!licenseKey) {
      return res.status(400).json({ isValid: false, reason: 'License key is required.' });
    }

    const cleanKey = licenseKey.trim().toUpperCase();
    const docRef = db.collection('licenses').doc(cleanKey);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ isValid: false, reason: 'License key does not exist in registry.' });
    }

    const storedLicense = doc.data();
    const result = verifyLicense({
      licenseKey: cleanKey,
      userEmail,
      productId,
      storedLicense,
    });

    if (!result.isValid) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('License verification error:', error);
    res.status(500).json({ isValid: false, reason: 'Server error during license verification.' });
  }
};

/**
 * @desc    Cancel active VIP subscription with explicit "cancel" confirmation
 * @route   POST /api/payments/cancel-subscription
 * @access  Private (Authenticated User)
 */
const cancelSubscription = async (req, res) => {
  try {
    const userEmail = (req.user?.email || '').trim().toLowerCase();
    if (!userEmail) {
      return res.status(401).json({ message: 'Authentication required to manage subscriptions.' });
    }

    const { confirmation } = req.body;
    if (!confirmation || confirmation.trim().toLowerCase() !== 'cancel') {
      return res.status(400).json({
        message: 'Invalid confirmation. You must type "cancel" to confirm cancellation of your VIP subscription.'
      });
    }

    // Look up user in Firestore
    const userSnapshot = await db.collection('users').where('email', '==', userEmail).get();
    if (userSnapshot.empty) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    const currentMembership = userData.membership;

    const isVipActive = currentMembership &&
      currentMembership.plan &&
      currentMembership.plan !== 'free' &&
      currentMembership.validUntil &&
      new Date(currentMembership.validUntil) > new Date();

    if (!isVipActive) {
      return res.status(400).json({
        message: 'You do not have an active VIP membership to cancel.'
      });
    }

    const cancelledPlan = currentMembership.plan;
    const previousBadge = currentMembership.badge || (cancelledPlan === 'elite' ? 'purple' : 'gold');
    const previousExpiry = currentMembership.validUntil;

    const cancellationTimestamp = new Date().toISOString();

    // Invalidate all premium facilities immediately in Firestore
    const invalidatedMembership = {
      plan: 'free',
      badge: null,
      validUntil: null,
      cancelledAt: cancellationTimestamp,
      previousPlan: cancelledPlan,
      previousExpiry,
    };

    await userDoc.ref.update({
      membership: invalidatedMembership,
      isVip: false,
      vipPlan: 'free',
      vipCancelledAt: cancellationTimestamp,
      updatedAt: cancellationTimestamp,
    });

    // Mark user's active VIP subscription licenses as 'cancelled' in Firestore
    let updatedLicenseCount = 0;
    try {
      const licensesSnapshot = await db.collection('licenses').where('userEmail', '==', userEmail).get();
      if (!licensesSnapshot.empty) {
        for (const licDoc of licensesSnapshot.docs) {
          const licData = licDoc.data();
          const isVipLic =
            String(licData.productId || '').startsWith('upper-vip') ||
            (['pro', 'elite'].includes(licData.plan) && String(licData.productTitle || '').toLowerCase().includes('vip')) ||
            String(licData.plan || '').toLowerCase().includes('vip');

          // Strict validation: Only cancel VIP subscription licenses; never touch perpetual product licenses!
          if (isVipLic && licData.status !== 'cancelled') {
            await licDoc.ref.update({
              status: 'cancelled',
              isCancelled: true,
              cancelledAt: cancellationTimestamp,
              cancellationReason: 'Cancelled by account holder',
              updatedAt: cancellationTimestamp,
            });
            updatedLicenseCount++;

            // Also update associated order record if present
            if (licData.orderId) {
              try {
                await db.collection('orders').doc(licData.orderId).update({
                  status: 'cancelled',
                  isCancelled: true,
                  cancelledAt: cancellationTimestamp,
                  updatedAt: cancellationTimestamp,
                });
              } catch (orderErr) {
                console.warn(`Could not update order ${licData.orderId}:`, orderErr.message);
              }
            }
          }
        }
      }
      console.log(`🛑 [VIP Cancelled] Marked ${updatedLicenseCount} VIP subscription license(s) as CANCELLED for ${userEmail}`);
    } catch (licErr) {
      console.error('Error marking user licenses as cancelled in Firestore:', licErr);
    }

    // Send cancellation notice email asynchronously
    sendSubscriptionCancellationEmail(
      userEmail,
      userData.displayName || userEmail.split('@')[0],
      cancelledPlan,
      new Date().toISOString()
    ).catch((err) => console.error('Error sending cancellation email:', err.message));

    // Return the updated membership object and user state
    res.json({
      success: true,
      message: `Your ${cancelledPlan === 'elite' ? 'Elite VIP' : 'Pro Member'} subscription has been cancelled. Premium facilities have been invalidated.`,
      membership: invalidatedMembership,
      user: {
        uid: userDoc.id,
        email: userEmail,
        displayName: userData.displayName || userEmail.split('@')[0],
        photoURL: userData.photoURL || null,
        membership: invalidatedMembership,
        isBanned: Boolean(userData.isBanned),
      },
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ message: error.message || 'Server error while cancelling subscription.' });
  }
};

// =======================================================
// REAL UPI QR PAYMENT FLOW & ADMIN VERIFICATION
// =======================================================

/**
 * @desc    Submit UPI QR payment reference (UTR) for verification
 * @route   POST /api/payments/submit-upi-payment
 * @access  Private (Authenticated User)
 */
const submitUpiPayment = async (req, res) => {
  try {
    const userEmail = (req.user?.email || '').trim().toLowerCase();
    if (!userEmail) return res.status(401).json({ message: 'Authentication required.' });

    const {
      productId = 'upper-vip-pro',
      plan = 'pro',
      amount,
      utrNumber,
      payerUpiId = '',
      payerName = '',
    } = req.body;

    // Strict UTR Number Validation
    const cleanUtr = String(utrNumber || '').trim().toUpperCase();
    if (!cleanUtr || cleanUtr.length < 6 || cleanUtr.length > 35) {
      return res.status(400).json({
        message: 'Invalid UPI Transaction Reference / UTR Number. Please provide a valid 12-digit UTR from your UPI payment receipt.',
      });
    }

    // Look up user account
    const userSnapshot = await db.collection('users').where('email', '==', userEmail).get();
    if (userSnapshot.empty) return res.status(404).json({ message: 'User account not found.' });
    const userData = userSnapshot.docs[0].data();
    if (userData.isBanned) {
      return res.status(403).json({ message: 'Account restricted: Banned users cannot submit payments.' });
    }

    // Check for duplicate UTR submission
    const existingUtr = await db.collection('upi_payments')
      .where('utrNumber', '==', cleanUtr)
      .get();

    if (!existingUtr.empty) {
      const existingDoc = existingUtr.docs[0].data();
      if (existingDoc.status !== 'rejected') {
        return res.status(400).json({
          message: 'This UPI Reference / UTR Number has already been submitted for an order. Please check My Licenses or contact admin.',
        });
      }
    }

    // STRICT SUBSCRIPTION VALIDATION:
    // One user can request 1 premium plan.
    // - If user has an active approved subscription, they cannot request another unless they cancel their active plan.
    // - If user has a pending request awaiting verification, they cannot request another until approved or rejected.
    // - If rejected, they can request again.
    // - If cancelled, they can request again.
    const isSubscriptionRequest =
      (productId && String(productId).startsWith('upper-vip')) ||
      ['pro', 'elite', 'pro_monthly', 'elite_yearly', 'vip_monthly', 'vip_yearly'].includes(plan);

    if (isSubscriptionRequest) {
      // 1. Check if user already has an active approved subscription
      const currentMembership = userData.membership;
      const isCurrentVipActive =
        currentMembership?.plan &&
        currentMembership.plan !== 'free' &&
        currentMembership.validUntil &&
        new Date(currentMembership.validUntil) > new Date() &&
        !currentMembership.isCancelled;

      if (isCurrentVipActive) {
        const expiryFormatted = new Date(currentMembership.validUntil).toLocaleDateString();
        const activePlanName = currentMembership.plan === 'elite' ? 'Elite VIP (Annual)' : 'Pro Member (Monthly)';
        return res.status(400).json({
          message: `Active Subscription Exists: You currently have an active ${activePlanName} plan valid until ${expiryFormatted}. You cannot request another subscription unless you cancel your current plan first.`,
          code: 'ACTIVE_SUBSCRIPTION_EXISTS',
          activePlan: currentMembership.plan,
          validUntil: currentMembership.validUntil,
        });
      }

      // 2. Check if user already has a pending subscription request awaiting verification
      const pendingSnapshot = await db.collection('upi_payments')
        .where('userEmail', '==', userEmail)
        .where('status', '==', 'pending_verification')
        .get();

      const pendingSubDoc = pendingSnapshot.docs.find((d) => {
        const pData = d.data();
        return (
          (pData.productId && String(pData.productId).startsWith('upper-vip')) ||
          ['pro', 'elite'].includes(pData.plan)
        );
      });

      if (pendingSubDoc) {
        const pendingData = pendingSubDoc.data();
        return res.status(400).json({
          message: `Subscription Request Pending: You already have a subscription request pending verification (Order: ${pendingData.orderId}, UTR: ${pendingData.utrNumber}). You cannot request another plan until your pending request is approved or rejected by the administrator.`,
          code: 'PENDING_SUBSCRIPTION_EXISTS',
          pendingOrder: {
            orderId: pendingData.orderId,
            utrNumber: pendingData.utrNumber,
            plan: pendingData.plan,
            submittedAt: pendingData.submittedAt,
          },
        });
      }
    }

    const planDetails = await resolvePlanDetails(productId, plan);
    const paymentConfig = await getPaymentConfigHelper();
    const now = new Date().toISOString();
    const orderId = `ORD-UPI-${Date.now()}`;
    const paymentDocId = `UPI-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const paymentRecord = {
      id: paymentDocId,
      orderId,
      paymentDocId,
      userEmail,
      userName: userData.displayName || userEmail.split('@')[0],
      productId: planDetails.productId,
      productTitle: planDetails.productTitle,
      plan: planDetails.plan,
      amount: Number(amount) || planDetails.amountINR,
      currency: 'INR',
      utrNumber: cleanUtr,
      payerUpiId: payerUpiId.trim(),
      payerName: payerName.trim() || userData.displayName || '',
      status: paymentConfig.autoApproveUpi ? 'approved' : 'pending_verification',
      submittedAt: now,
      reviewedAt: paymentConfig.autoApproveUpi ? now : null,
      reviewedBy: paymentConfig.autoApproveUpi ? 'auto_system' : null,
    };

    await db.collection('upi_payments').doc(paymentDocId).set(paymentRecord);

    if (paymentConfig.autoApproveUpi) {
      const license = await fulfillOrderAndIssueLicense({
        orderId,
        paymentId: cleanUtr,
        gateway: 'upi_qr',
        userEmail,
        productId: planDetails.productId,
        productTitle: planDetails.productTitle,
        plan: planDetails.plan,
        durationDays: planDetails.durationDays,
        amount: paymentRecord.amount,
        currency: 'INR',
      });

      return res.status(201).json({
        success: true,
        status: 'approved',
        message: 'UPI payment verified and VIP membership activated instantly!',
        orderId,
        license,
        membership: license.membership || null,
      });
    }

    return res.status(201).json({
      success: true,
      status: 'pending_verification',
      message: `Payment request submitted successfully. Reference UTR: ${cleanUtr}. Our administrative team verifies payments promptly. Your VIP badge and cryptographic license will activate upon verification.`,
      orderId,
      utrNumber: cleanUtr,
      paymentRecord,
    });
  } catch (error) {
    console.error('Error submitting UPI payment:', error);
    return res.status(500).json({ message: error.message || 'Error processing UPI payment submission.' });
  }
};

/**
 * @desc    Get all UPI payment verification requests (Admin)
 * @route   GET /api/payments/admin/upi-payments
 * @access  Private (Admin)
 */
const getAdminUpiPayments = async (req, res) => {
  try {
    const snapshot = await db.collection('upi_payments').get();
    const payments = [];
    let pendingCount = 0;
    let approvedCount = 0;
    let totalRevenueINR = 0;

    snapshot.forEach((doc) => {
      const d = doc.data();
      payments.push({ id: doc.id, ...d });
      if (d.status === 'pending_verification') pendingCount++;
      if (d.status === 'approved') {
        approvedCount++;
        totalRevenueINR += Number(d.amount) || 0;
      }
    });

    payments.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    return res.json({
      success: true,
      payments,
      stats: {
        total: payments.length,
        pending: pendingCount,
        approved: approvedCount,
        totalRevenueINR,
      },
    });
  } catch (error) {
    console.error('Error fetching admin UPI payments:', error);
    return res.status(500).json({ message: 'Error retrieving UPI payments.' });
  }
};

/**
 * @desc    Approve or reject a UPI payment verification request (Admin)
 * @route   POST /api/payments/admin/verify-upi-payment
 * @access  Private (Admin)
 */
const verifyAdminUpiPayment = async (req, res) => {
  try {
    const { paymentId, action, rejectReason = '' } = req.body;
    if (!paymentId || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid request. "paymentId" and valid "action" (approve/reject) are required.' });
    }

    const paymentDocRef = db.collection('upi_payments').doc(paymentId);
    const paymentDoc = await paymentDocRef.get();
    if (!paymentDoc.exists) {
      return res.status(404).json({ message: 'Payment record not found.' });
    }

    const pData = paymentDoc.data();
    const now = new Date().toISOString();
    const reviewer = req.user?.username || req.user?.email || 'admin';

    if (action === 'approve') {
      if (pData.status === 'approved') {
        return res.status(400).json({ message: 'This payment has already been approved.' });
      }

      const planDetails = await resolvePlanDetails(pData.productId, pData.plan);

      const license = await fulfillOrderAndIssueLicense({
        orderId: pData.orderId || `ORD-UPI-${Date.now()}`,
        paymentId: pData.utrNumber,
        gateway: 'upi_qr',
        userEmail: pData.userEmail,
        productId: planDetails.productId,
        productTitle: planDetails.productTitle,
        plan: planDetails.plan,
        durationDays: planDetails.durationDays,
        amount: pData.amount,
        currency: 'INR',
      });

      await paymentDocRef.update({
        status: 'approved',
        licenseKey: license.licenseKey,
        reviewedAt: now,
        reviewedBy: reviewer,
        updatedAt: now,
      });

      return res.json({
        success: true,
        message: `Payment approved! VIP membership and cryptographic license key activated for ${pData.userEmail}.`,
        license,
      });
    } else {
      // Reject
      const cleanReason = (rejectReason || '').trim() || 'Payment could not be verified in bank records. Please verify your 12-digit UTR.';

      await paymentDocRef.update({
        status: 'rejected',
        rejectReason: cleanReason,
        reviewedAt: now,
        reviewedBy: reviewer,
        updatedAt: now,
      });

      // Fetch user displayName for personalization if available
      let userName = pData.userName || pData.userEmail.split('@')[0];
      try {
        const userSnap = await db.collection('users').where('email', '==', pData.userEmail).get();
        if (!userSnap.empty) {
          const uData = userSnap.docs[0].data();
          userName = uData.displayName || userName;
        }
      } catch (e) {
        console.warn('Error fetching user for rejection email:', e.message);
      }

      const itemTitle = pData.productTitle || (pData.plan === 'elite' ? 'Upper Elite VIP (Annual All-Access)' : 'Upper VIP Membership');

      // Dispatch rejection notification email to user
      sendPaymentRejectionEmail({
        userEmail: pData.userEmail,
        userName,
        planOrItem: itemTitle,
        amount: pData.amount,
        currency: 'INR',
        utrNumber: pData.utrNumber,
        orderId: pData.orderId,
        rejectReason: cleanReason,
        rejectedAt: now,
      }).catch((err) => console.warn('Background payment rejection email failed:', err.message));

      // Create a notification for the user to be notified in the navbar
      try {
        await db.collection('notifications').add({
          title: 'Payment Verification Update',
          message: `Your payment for ${itemTitle} (UTR: ${pData.utrNumber}) could not be verified. Reason: ${cleanReason}`,
          category: 'Security',
          targetEmail: pData.userEmail,
          createdAt: now,
        });
      } catch (e) {
        console.warn('Error creating rejection notification:', e.message);
      }

      return res.json({
        success: true,
        message: `Payment request marked as rejected for ${pData.userEmail}. Rejection notice dispatched to user's email and profile.`,
      });
    }
  } catch (error) {
    console.error('Error verifying UPI payment:', error);
    return res.status(500).json({ message: error.message || 'Error processing payment verification.' });
  }
};

/**
 * @desc    Get current user's submitted UPI payment requests
 * @route   GET /api/payments/my-upi-payments
 * @access  Private (Authenticated User)
 */
const getUserUpiPayments = async (req, res) => {
  try {
    const userEmail = (req.user?.email || '').trim().toLowerCase();
    if (!userEmail) return res.status(401).json({ message: 'Authentication required.' });

    const snapshot = await db.collection('upi_payments')
      .where('userEmail', '==', userEmail)
      .get();

    const payments = [];
    snapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() });
    });
    payments.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    return res.json({ success: true, payments });
  } catch (error) {
    console.error('Error fetching user UPI payments:', error);
    return res.status(500).json({ message: 'Error retrieving your payments.' });
  }
};

/**
 * @desc    Get subscription eligibility and active/pending status for authenticated user
 * @route   GET /api/payments/subscription-eligibility
 * @access  Private (Authenticated User)
 */
const getSubscriptionEligibility = async (req, res) => {
  try {
    const userEmail = (req.user?.email || '').trim().toLowerCase();
    if (!userEmail) return res.status(401).json({ message: 'Authentication required.' });

    const userSnapshot = await db.collection('users').where('email', '==', userEmail).get();
    if (userSnapshot.empty) return res.status(404).json({ message: 'User account not found.' });

    const userData = userSnapshot.docs[0].data();
    const currentMembership = userData.membership || {};

    const isCurrentVipActive =
      currentMembership.plan &&
      currentMembership.plan !== 'free' &&
      currentMembership.validUntil &&
      new Date(currentMembership.validUntil) > new Date() &&
      !currentMembership.isCancelled;

    // Check for pending or rejected subscription payment submissions
    const upiSnapshot = await db.collection('upi_payments')
      .where('userEmail', '==', userEmail)
      .get();

    let pendingSubscription = null;
    let latestRejectedSubscription = null;

    upiSnapshot.forEach((doc) => {
      const pData = doc.data();
      const isSub =
        (pData.productId && String(pData.productId).startsWith('upper-vip')) ||
        ['pro', 'elite'].includes(pData.plan);

      if (isSub) {
        if (pData.status === 'pending_verification' && !pendingSubscription) {
          pendingSubscription = { id: doc.id, ...pData };
        } else if (pData.status === 'rejected') {
          if (
            !latestRejectedSubscription ||
            new Date(pData.reviewedAt || pData.updatedAt || 0) >
              new Date(latestRejectedSubscription.reviewedAt || latestRejectedSubscription.updatedAt || 0)
          ) {
            latestRejectedSubscription = { id: doc.id, ...pData };
          }
        }
      }
    });

    const canRequestSubscription = !isCurrentVipActive && !pendingSubscription;
    let ineligibilityReason = null;
    let ineligibilityCode = null;

    if (isCurrentVipActive) {
      const expiryFormatted = new Date(currentMembership.validUntil).toLocaleDateString();
      const planName = currentMembership.plan === 'elite' ? 'Elite VIP (Annual)' : 'Pro Member (Monthly)';
      ineligibilityReason = `You currently have an active ${planName} subscription valid until ${expiryFormatted}. To request another subscription, you must cancel your current active plan first.`;
      ineligibilityCode = 'ACTIVE_SUBSCRIPTION_EXISTS';
    } else if (pendingSubscription) {
      ineligibilityReason = `You have a subscription request pending verification (Order: ${pendingSubscription.orderId}, UTR: ${pendingSubscription.utrNumber}). Please wait for the admin to approve or reject your request before requesting another plan.`;
      ineligibilityCode = 'PENDING_SUBSCRIPTION_EXISTS';
    }

    return res.json({
      success: true,
      canRequestSubscription,
      ineligibilityReason,
      ineligibilityCode,
      hasActiveSubscription: !!isCurrentVipActive,
      activeSubscription: isCurrentVipActive
        ? {
            plan: currentMembership.plan,
            badge: currentMembership.badge,
            validUntil: currentMembership.validUntil,
            isCancelled: false,
          }
        : null,
      hasPendingRequest: !!pendingSubscription,
      pendingSubscription: pendingSubscription
        ? {
            orderId: pendingSubscription.orderId,
            utrNumber: pendingSubscription.utrNumber,
            plan: pendingSubscription.plan,
            amount: pendingSubscription.amount,
            submittedAt: pendingSubscription.submittedAt,
          }
        : null,
      hasRejectedRequest: !isCurrentVipActive && !pendingSubscription && !!latestRejectedSubscription,
      rejectedSubscription: latestRejectedSubscription
        ? {
            orderId: latestRejectedSubscription.orderId,
            utrNumber: latestRejectedSubscription.utrNumber,
            plan: latestRejectedSubscription.plan,
            rejectReason: latestRejectedSubscription.rejectReason,
            rejectedAt: latestRejectedSubscription.reviewedAt || latestRejectedSubscription.updatedAt,
          }
        : null,
    });
  } catch (error) {
    console.error('Error checking subscription eligibility:', error);
    return res.status(500).json({ message: 'Error checking subscription status.' });
  }
};

module.exports = {
  createCheckoutSession,
  handleStripeWebhook,
  handleRazorpayWebhook,
  verifyRazorpayPayment,
  completeSandboxCheckout,
  getUserLicenses,
  verifyLicenseKey,
  cancelSubscription,
  submitUpiPayment,
  getAdminUpiPayments,
  verifyAdminUpiPayment,
  getUserUpiPayments,
  getSubscriptionEligibility,
};


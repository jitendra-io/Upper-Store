const express = require('express');
const router = express.Router();
const { protect, protectAdmin } = require('../middleware/authMiddleware');
const { paymentLimiter } = require('../middleware/rateLimiter');
const {
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
} = require('../controllers/paymentController');

// =======================================================
// Webhook Routes (Must receive raw body for HMAC signature verification)
// =======================================================
router.post('/webhook/stripe', handleStripeWebhook);
router.post('/webhook/razorpay', handleRazorpayWebhook);

// =======================================================
// Checkout & Payment Verification Routes
// =======================================================
router.post('/create-checkout-session', protect, paymentLimiter, createCheckoutSession);
router.post('/verify-razorpay', protect, verifyRazorpayPayment);
router.post('/complete-sandbox-checkout', protect, completeSandboxCheckout);
router.post('/cancel-subscription', protect, cancelSubscription);
router.get('/subscription-eligibility', protect, getSubscriptionEligibility);

// =======================================================
// Real UPI QR Payment Routes & User Registry
// =======================================================
router.post('/submit-upi-payment', protect, paymentLimiter, submitUpiPayment);
router.get('/my-upi-payments', protect, getUserUpiPayments);

// =======================================================
// Admin UPI Payment Verification & Management
// =======================================================
router.get('/admin/upi-payments', protectAdmin, getAdminUpiPayments);
router.post('/admin/verify-upi-payment', protectAdmin, verifyAdminUpiPayment);

// =======================================================
// License Management & Public Validation Routes
// =======================================================
router.get('/my-licenses', protect, getUserLicenses);
router.post('/verify-license', verifyLicenseKey);

module.exports = router;

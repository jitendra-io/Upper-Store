const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/authMiddleware');
const {
  getPlatformFee,
  updatePlatformFee,
  getPaymentSettings,
  updatePaymentSettings,
} = require('../controllers/settingsController');

// Public route to fetch current platform fee setting
router.get('/platform-fee', getPlatformFee);

// Protected admin route to update platform fee (add/remove/modify fee)
router.put('/platform-fee', protectAdmin, updatePlatformFee);

// Public route to fetch payment gateway / UPI QR settings
router.get('/payment-config', getPaymentSettings);

// Protected admin route to update payment gateway / UPI QR settings
router.put('/payment-config', protectAdmin, updatePaymentSettings);

module.exports = router;

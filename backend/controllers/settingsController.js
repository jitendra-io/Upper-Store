const { db } = require('../config/firebase');

// Default in-memory fallback
let cachedFeeConfig = {
  enabled: true,
  amount: 19,
  currency: 'INR',
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds cache to avoid repetitive Firestore reads

/**
 * Server-side helper to get live platform fee configuration
 */
const getPlatformFeeConfig = async () => {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_TTL_MS && cachedFeeConfig) {
    return cachedFeeConfig;
  }

  try {
    const doc = await db.collection('system_settings').doc('platform_fee').get();
    if (doc.exists) {
      const data = doc.data();
      cachedFeeConfig = {
        enabled: data.enabled !== false,
        amount: typeof data.amount === 'number' ? Math.max(0, Math.min(999, Math.round(data.amount))) : 19,
        currency: data.currency || 'INR',
        updatedAt: data.updatedAt || new Date().toISOString(),
        updatedBy: data.updatedBy || 'admin',
      };
      lastFetchTime = now;
      return cachedFeeConfig;
    } else {
      // Document does not exist yet; initialize it in Firestore
      const initialConfig = {
        enabled: true,
        amount: 19,
        currency: 'INR',
        updatedAt: new Date().toISOString(),
        updatedBy: 'system_init',
      };
      await db.collection('system_settings').doc('platform_fee').set(initialConfig);
      cachedFeeConfig = initialConfig;
      lastFetchTime = now;
      return cachedFeeConfig;
    }
  } catch (err) {
    console.warn('⚠️ Warning: Error fetching platform fee from Firestore, using cached fallback:', err.message);
    return cachedFeeConfig;
  }
};

/**
 * @desc    Get active platform fee settings
 * @route   GET /api/settings/platform-fee
 * @access  Public
 */
const getPlatformFee = async (req, res) => {
  try {
    const config = await getPlatformFeeConfig();
    return res.status(200).json({
      success: true,
      ...config,
    });
  } catch (error) {
    console.error('Error fetching platform fee:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve platform fee settings.',
      enabled: true,
      amount: 19,
    });
  }
};

/**
 * @desc    Update platform fee settings (Toggle on/off, change amount)
 * @route   PUT /api/settings/platform-fee
 * @access  Private (Admin)
 */
const updatePlatformFee = async (req, res) => {
  try {
    const { enabled, amount } = req.body;

    // Strict Validation: enabled must be boolean or boolean string
    let parsedEnabled;
    if (typeof enabled === 'boolean') {
      parsedEnabled = enabled;
    } else if (typeof enabled === 'string') {
      if (enabled.toLowerCase() === 'true') parsedEnabled = true;
      else if (enabled.toLowerCase() === 'false') parsedEnabled = false;
      else {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: "enabled" must be a boolean (true or false).',
        });
      }
    } else if (enabled !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: "enabled" must be a boolean (true or false).',
      });
    } else {
      // If enabled is not passed, retain existing state
      const current = await getPlatformFeeConfig();
      parsedEnabled = current.enabled;
    }

    // Strict Validation: amount must be a non-negative integer between 0 and 999
    let parsedAmount;
    if (amount !== undefined && amount !== null && amount !== '') {
      const num = Number(amount);
      if (isNaN(num)) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Platform fee amount must be a valid number.',
        });
      }
      if (!Number.isFinite(num)) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Platform fee amount must be a finite number.',
        });
      }
      if (num < 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Platform fee amount cannot be negative.',
        });
      }
      if (num > 999) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Platform fee amount cannot exceed ₹999 INR.',
        });
      }
      parsedAmount = Math.round(num);
    } else {
      // If amount not passed and enabled is true, fallback to 19 or current
      const current = await getPlatformFeeConfig();
      parsedAmount = current.amount;
    }

    // If admin explicitly removes the fee by setting amount to 0, mark enabled as false or amount as 0
    if (parsedAmount === 0) {
      parsedEnabled = false;
    }

    const updatedConfig = {
      enabled: parsedEnabled,
      amount: parsedAmount,
      currency: 'INR',
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.email || 'admin',
    };

    await db.collection('system_settings').doc('platform_fee').set(updatedConfig, { merge: true });

    // Update in-memory cache immediately
    cachedFeeConfig = updatedConfig;
    lastFetchTime = Date.now();

    console.log(`⚙️ Admin updated Platform Fee: enabled=${parsedEnabled}, amount=₹${parsedAmount} INR by ${updatedConfig.updatedBy}`);

    return res.status(200).json({
      success: true,
      message: parsedEnabled
        ? `Platform fee enabled and set to ₹${parsedAmount} INR.`
        : 'Platform fee successfully removed. All free products can now be downloaded for ₹0.',
      settings: updatedConfig,
    });
  } catch (error) {
    console.error('Error updating platform fee settings:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while updating platform fee.',
    });
  }
};

// ==========================================
// PAYMENT GATEWAY & UPI QR SETTINGS
// ==========================================

let cachedPaymentConfig = {
  paymentMode: 'upi_qr', // 'upi_qr' (Default: real payments via user's UPI QR) | 'sandbox' | 'merchant_gateway'
  upiId: '9692093386@naviaxis',
  payeeName: 'JITENDRA KUMAR MISHRA',
  autoApproveUpi: false, // Strict review: Admin manually verifies bank/UPI payment before activation
  qrImageUrl: '/src/assets/upper-upi-qr.png',
  proMonthlyPriceINR: 99,
  eliteYearlyPriceINR: 399,
  instructions: 'Scan the QR code with any UPI app (GPay, PhonePe, Paytm, BHIM) and pay the exact amount. Enter the 12-digit UTR/Reference Number after payment.',
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};
let lastPaymentFetchTime = 0;

/**
 * Server-side helper to get live payment settings
 */
const getPaymentConfigHelper = async () => {
  const now = Date.now();
  if (now - lastPaymentFetchTime < CACHE_TTL_MS && cachedPaymentConfig) {
    return cachedPaymentConfig;
  }

  try {
    const doc = await db.collection('system_settings').doc('payment_config').get();
    if (doc.exists) {
      const data = doc.data();
      cachedPaymentConfig = {
        paymentMode: ['upi_qr', 'sandbox', 'merchant_gateway'].includes(data.paymentMode) ? data.paymentMode : 'upi_qr',
        upiId: data.upiId || '9692093386@naviaxis',
        payeeName: data.payeeName || 'JITENDRA KUMAR MISHRA',
        autoApproveUpi: Boolean(data.autoApproveUpi),
        qrImageUrl: data.qrImageUrl || '/src/assets/upper-upi-qr.png',
        proMonthlyPriceINR: typeof data.proMonthlyPriceINR === 'number' ? data.proMonthlyPriceINR : 99,
        eliteYearlyPriceINR: typeof data.eliteYearlyPriceINR === 'number' ? data.eliteYearlyPriceINR : 399,
        instructions: data.instructions || 'Scan the QR code with any UPI app and submit your 12-digit UTR.',
        updatedAt: data.updatedAt || new Date().toISOString(),
        updatedBy: data.updatedBy || 'admin',
      };
      lastPaymentFetchTime = now;
      return cachedPaymentConfig;
    } else {
      const initialConfig = {
        paymentMode: 'upi_qr',
        upiId: '9692093386@naviaxis',
        payeeName: 'JITENDRA KUMAR MISHRA',
        autoApproveUpi: false,
        qrImageUrl: '/src/assets/upper-upi-qr.png',
        proMonthlyPriceINR: 99,
        eliteYearlyPriceINR: 399,
        instructions: 'Scan the QR code with any UPI app (GPay, PhonePe, Paytm, BHIM) and pay the exact amount. Enter the 12-digit UTR/Reference Number after payment.',
        updatedAt: new Date().toISOString(),
        updatedBy: 'system_init',
      };
      await db.collection('system_settings').doc('payment_config').set(initialConfig);
      cachedPaymentConfig = initialConfig;
      lastPaymentFetchTime = now;
      return cachedPaymentConfig;
    }
  } catch (err) {
    console.warn('⚠️ Warning: Error fetching payment config from Firestore, using cached fallback:', err.message);
    return cachedPaymentConfig;
  }
};

/**
 * @desc    Get active payment settings (public)
 * @route   GET /api/settings/payment-config
 * @access  Public
 */
const getPaymentSettings = async (req, res) => {
  try {
    const config = await getPaymentConfigHelper();
    return res.status(200).json({
      success: true,
      ...config,
    });
  } catch (error) {
    console.error('Error fetching payment settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment configuration.',
      paymentMode: 'upi_qr',
      upiId: '9692093386@naviaxis',
      payeeName: 'JITENDRA KUMAR MISHRA',
      autoApproveUpi: false,
    });
  }
};

/**
 * @desc    Update payment settings (Admin)
 * @route   PUT /api/settings/payment-config
 * @access  Private (Admin)
 */
const updatePaymentSettings = async (req, res) => {
  try {
    const { paymentMode, upiId, payeeName, autoApproveUpi } = req.body;

    const current = await getPaymentConfigHelper();
    let updatedMode = current.paymentMode;
    if (paymentMode !== undefined) {
      if (!['upi_qr', 'sandbox', 'merchant_gateway'].includes(paymentMode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid paymentMode. Valid options: upi_qr, sandbox, merchant_gateway.',
        });
      }
      updatedMode = paymentMode;
    }

    let updatedUpiId = current.upiId;
    if (upiId !== undefined) {
      if (typeof upiId !== 'string' || !upiId.trim() || !upiId.includes('@')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid UPI ID format. Expected format: user@bank (e.g. 9692093386@naviaxis).',
        });
      }
      updatedUpiId = upiId.trim();
    }

    let updatedPayee = current.payeeName;
    if (payeeName !== undefined) {
      if (typeof payeeName !== 'string' || !payeeName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Payee name cannot be empty.',
        });
      }
      updatedPayee = payeeName.trim();
    }

    let updatedAutoApprove = current.autoApproveUpi;
    if (autoApproveUpi !== undefined) {
      updatedAutoApprove = Boolean(autoApproveUpi);
    }

    const newConfig = {
      ...current,
      paymentMode: updatedMode,
      upiId: updatedUpiId,
      payeeName: updatedPayee,
      autoApproveUpi: updatedAutoApprove,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.username || req.user?.email || 'admin',
    };

    await db.collection('system_settings').doc('payment_config').set(newConfig, { merge: true });
    cachedPaymentConfig = newConfig;
    lastPaymentFetchTime = Date.now();

    console.log(`⚙️ Admin updated Payment Settings: mode=${updatedMode}, upiId=${updatedUpiId}, autoApprove=${updatedAutoApprove}`);

    return res.status(200).json({
      success: true,
      message: 'Payment configuration updated successfully.',
      settings: newConfig,
    });
  } catch (error) {
    console.error('Error updating payment settings:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating payment configuration.',
    });
  }
};

module.exports = {
  getPlatformFee,
  updatePlatformFee,
  getPlatformFeeConfig,
  getPaymentConfigHelper,
  getPaymentSettings,
  updatePaymentSettings,
};

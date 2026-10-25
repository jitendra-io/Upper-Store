const rateLimit = require('express-rate-limit');

const isLocalhost = (req) => {
  const ip = req.ip || req.connection?.remoteAddress || '';
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    req.hostname === 'localhost' ||
    process.env.NODE_ENV !== 'production'
  );
};

/**
 * Global API Rate Limiter:
 * Prevents automated scraping and DoS across all general endpoints.
 * Local development and localhost traffic are exempt to prevent developer lockout.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500, // Limit each external IP to 1,500 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isLocalhost(req),
  message: {
    message: 'Too many requests from this IP address. Please try again after 15 minutes.',
  },
});

/**
 * Auth & Account Protection Limiter:
 * Strictly prevents brute-force password attacks and registration email flooding.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 authentication attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many authentication attempts from this IP. Please wait 15 minutes before retrying.',
  },
});

/**
 * Contact & Appeal Limiter:
 * Prevents SMTP credit exhaustion and inbox spamming.
 */
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 contact form submissions per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many contact messages sent from this IP. Please wait 15 minutes before submitting again.',
  },
});

/**
 * Download Counter Protection Limiter:
 * Prevents automated bots from artificially inflating product download counts.
 */
const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 downloads recorded per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Download recording rate limit reached. Please wait a few minutes before downloading again.',
  },
});

/**
 * Payment & Checkout Protection Limiter:
 * Prevents automated card testing, bot spam, and checkout session exhaustion.
 */
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 checkout sessions per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isLocalhost(req),
  message: {
    message: 'Too many checkout attempts from this IP. Please wait a few minutes before trying again.',
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  contactLimiter,
  downloadLimiter,
  paymentLimiter,
};

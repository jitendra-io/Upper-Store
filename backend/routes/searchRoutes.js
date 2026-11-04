const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { searchGlobal } = require('../controllers/searchController');

// Rate limiting for public global search: 60 queries per minute per IP
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Search query rate limit exceeded. Please wait a moment before searching again.',
  },
});

router.get('/', searchLimiter, searchGlobal);

module.exports = router;

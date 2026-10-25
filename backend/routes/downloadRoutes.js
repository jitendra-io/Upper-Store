const express = require('express');
const router = express.Router();
const { protect, protectAdmin } = require('../middleware/authMiddleware');
const { downloadLimiter } = require('../middleware/rateLimiter');
const {
  recordDownload,
  getUserDownloadHistory,
  clearUserDownloadHistory,
  getAllDownloadHistoryAdmin,
} = require('../controllers/downloadController');

// Record a download (Rate-limited to prevent counter spoofing)
router.post('/record', downloadLimiter, recordDownload);

// Fetch user's download history from DB (Requires authenticated user or admin)
router.get('/history/:userEmail', protect, getUserDownloadHistory);

// Clear user's download history in DB (Requires authenticated user or admin)
router.delete('/history/:userEmail', protect, clearUserDownloadHistory);

// Admin route to get all history records (Requires verified admin)
router.get('/admin/all', protectAdmin, getAllDownloadHistoryAdmin);

module.exports = router;

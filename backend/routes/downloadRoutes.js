const express = require('express');
const router = express.Router();
const {
  recordDownload,
  getUserDownloadHistory,
  clearUserDownloadHistory,
  getAllDownloadHistoryAdmin,
} = require('../controllers/downloadController');

// Record a download (saves record & increments DB product downloadCount)
router.post('/record', recordDownload);

// Fetch user's download history from DB
router.get('/history/:userEmail', getUserDownloadHistory);

// Clear user's download history in DB
router.delete('/history/:userEmail', clearUserDownloadHistory);

// Admin route to get all history records
router.get('/admin/all', getAllDownloadHistoryAdmin);

module.exports = router;

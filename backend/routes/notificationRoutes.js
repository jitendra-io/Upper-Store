const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/authMiddleware');
const {
  getNotifications,
  createNotification,
  deleteNotification,
} = require('../controllers/notificationController');

// Public route to fetch broadcasts
router.get('/', getNotifications);

// Admin routes to send and delete broadcasts
router.post('/', protectAdmin, createNotification);
router.delete('/:id', protectAdmin, deleteNotification);

module.exports = router;

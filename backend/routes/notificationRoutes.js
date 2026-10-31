const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/authMiddleware');
const { protectPublisher } = require('../middleware/publisherMiddleware');
const {
  getNotifications,
  createNotification,
  deleteNotification,
} = require('../controllers/notificationController');

// Public route to fetch broadcasts
router.get('/', getNotifications);

// Admin routes to send and delete broadcasts
router.post('/', protectPublisher, createNotification);
router.delete('/:id', protectPublisher, deleteNotification);

module.exports = router;

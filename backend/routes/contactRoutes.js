const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createMessage,
  getMessages,
  markMessageRead,
  deleteMessage,
} = require('../controllers/contactController');

// Public route to send contact message
router.post('/', createMessage);

// Protected Admin routes for Inbox
router.get('/', protect, getMessages);
router.put('/:id/read', protect, markMessageRead);
router.delete('/:id', protect, deleteMessage);

module.exports = router;

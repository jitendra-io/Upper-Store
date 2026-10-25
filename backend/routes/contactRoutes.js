const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/authMiddleware');
const { contactLimiter } = require('../middleware/rateLimiter');
const {
  createMessage,
  getMessages,
  markMessageRead,
  deleteMessage,
  submitAppeal,
  getAppeals,
  resolveAppeal,
  rejectAppeal,
  deleteAppeal,
} = require('../controllers/contactController');

// Public routes (Rate-limited to protect SMTP quota and prevent spam)
router.post('/', contactLimiter, createMessage);
router.post('/appeal', contactLimiter, submitAppeal);

// Protected Admin routes for Inbox & Appeals
router.get('/', protectAdmin, getMessages);
router.put('/:id/read', protectAdmin, markMessageRead);
router.delete('/:id', protectAdmin, deleteMessage);
router.get('/appeals', protectAdmin, getAppeals);
router.post('/appeals/:appealId/resolve', protectAdmin, resolveAppeal);
router.post('/appeals/:appealId/reject', protectAdmin, rejectAppeal);
router.delete('/appeals/:appealId', protectAdmin, deleteAppeal);

module.exports = router;


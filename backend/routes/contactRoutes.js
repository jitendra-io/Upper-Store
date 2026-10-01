const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/authMiddleware');
const {
  createMessage,
  getMessages,
  markMessageRead,
  deleteMessage,
  submitAppeal,
  getAppeals,
  resolveAppeal,
  rejectAppeal,
} = require('../controllers/contactController');

// Public routes
router.post('/', createMessage);
router.post('/appeal', submitAppeal);

// Protected Admin routes for Inbox & Appeals
router.get('/', protectAdmin, getMessages);
router.put('/:id/read', protectAdmin, markMessageRead);
router.delete('/:id', protectAdmin, deleteMessage);
router.get('/appeals', protectAdmin, getAppeals);
router.post('/appeals/:appealId/resolve', protectAdmin, resolveAppeal);
router.post('/appeals/:appealId/reject', protectAdmin, rejectAppeal);

module.exports = router;


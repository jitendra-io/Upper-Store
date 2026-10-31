const express = require('express');
const router = express.Router();
const { protect, protectAdmin } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  loginAdmin,
  setupAdmin,
  registerUser,
  loginUser,
  googleOAuthLogin,
  getAllUsers,
  banUser,
  unbanUser,
  getUserStatus,
} = require('../controllers/authController');

// Admin Auth Routes (Protected against brute-force attacks)
router.post('/login', authLimiter, loginAdmin);
router.post('/setup', authLimiter, setupAdmin);

// User Management Routes (Admin only)
router.get('/users', protectAdmin, getAllUsers);
router.post('/users/:userId/ban', protectAdmin, banUser);
router.post('/users/:userId/unban', protectAdmin, unbanUser);

// User Auth Routes & Real-time Status Check (Protected against credential stuffing & spam)
router.post('/user/register', authLimiter, registerUser);
router.post('/user/login', authLimiter, loginUser);
router.post('/user/google', authLimiter, googleOAuthLogin);
router.get('/user/status/:email', protect, getUserStatus);

module.exports = router;

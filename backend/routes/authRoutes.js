const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/authMiddleware');
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

// Admin Auth Routes
router.post('/login', loginAdmin);
router.post('/setup', setupAdmin);

// User Management Routes (Admin only)
router.get('/users', protectAdmin, getAllUsers);
router.post('/users/:userId/ban', protectAdmin, banUser);
router.post('/users/:userId/unban', protectAdmin, unbanUser);

// User Auth Routes & Real-time Status Check
router.post('/user/register', registerUser);
router.post('/user/login', loginUser);
router.post('/user/google', googleOAuthLogin);
router.get('/user/status/:email', getUserStatus);

module.exports = router;


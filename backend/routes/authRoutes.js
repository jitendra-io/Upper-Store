const express = require('express');
const router = express.Router();
const {
  loginAdmin,
  setupAdmin,
  registerUser,
  loginUser,
  googleOAuthLogin,
} = require('../controllers/authController');

// Admin Auth Routes
router.post('/login', loginAdmin);
router.post('/setup', setupAdmin);

// User Auth Routes (Email/Password & Google OAuth2.0)
router.post('/user/register', registerUser);
router.post('/user/login', loginUser);
router.post('/user/google', googleOAuthLogin);

module.exports = router;

const express = require('express');
const router = express.Router();
const { loginAdmin, setupAdmin } = require('../controllers/authController');

router.post('/login', loginAdmin);
router.post('/setup', setupAdmin); // One-time use to create admin account

module.exports = router;

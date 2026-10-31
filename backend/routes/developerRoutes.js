const express = require('express');
const router = express.Router();
const { protect, protectAdmin } = require('../middleware/authMiddleware');
const {
  getMyDeveloperProfile,
  registerDeveloperKyc,
  getAllDevelopers,
  toggleDeveloperSuspension,
} = require('../controllers/developerController');

// User Developer Profile & KYC Registration
router.get('/me', protect, getMyDeveloperProfile);
router.post('/register', protect, registerDeveloperKyc);

// Admin Developer Oversight Routes
router.get('/', protectAdmin, getAllDevelopers);
router.post('/:id/suspend', protectAdmin, toggleDeveloperSuspension);

module.exports = router;


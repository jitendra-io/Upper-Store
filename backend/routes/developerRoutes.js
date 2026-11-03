const express = require('express');
const router = express.Router();
const { protect, protectAdmin } = require('../middleware/authMiddleware');
const {
  getMyDeveloperProfile,
  registerDeveloperKyc,
  getAllDevelopers,
  toggleDeveloperSuspension,
  getPublicDeveloperProfile,
  updateDeveloperBio,
} = require('../controllers/developerController');

// Public Developer Profile & Published Products (No Auth required)
router.get('/profile/:username', getPublicDeveloperProfile);

// User Developer Profile & KYC Registration
router.get('/me', protect, getMyDeveloperProfile);
router.post('/register', protect, registerDeveloperKyc);
router.put('/bio', protect, updateDeveloperBio);

// Admin Developer Oversight Routes
router.get('/', protectAdmin, getAllDevelopers);
router.post('/:id/suspend', protectAdmin, toggleDeveloperSuspension);

module.exports = router;


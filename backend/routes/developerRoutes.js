const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, protectAdmin } = require('../middleware/authMiddleware');
const { followLimiter } = require('../middleware/rateLimiter');
const {
  getMyDeveloperProfile,
  registerDeveloperKyc,
  withdrawDeveloperConsent,
  getAllDevelopers,
  toggleDeveloperSuspension,
  getPublicDeveloperProfile,
  updateDeveloperBio,
  getOfficialProfile,
  updateOfficialProfile,
  uploadOfficialCoverImage,
  removeOfficialCoverImage,
  toggleFollowDeveloper,
  getFollowStatus,
  getDeveloperFollowers,
  getDeveloperFollowing,
  removeDeveloperFollower,
} = require('../controllers/developerController');

// Multer storage for profile background / cover images
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destFolder = path.join(__dirname, '../uploads/images');
    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }
    cb(null, destFolder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `official-cover-${uniqueSuffix}${ext}`);
  },
});

const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeImageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml' && safeImageExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only safe raster images (JPEG, PNG, WEBP, GIF) are allowed for profile background. SVG files are not permitted.'), false);
    }
  },
});

const handleCoverUpload = (req, res, next) => {
  uploadCover.single('coverImage')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Background image exceeds the 8MB size limit. Please select a smaller file.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message || 'Invalid image file.' });
    }
    next();
  });
};

// Public Developer Profile & Published Products (No Auth required)
router.get('/profile/:username', getPublicDeveloperProfile);

// Real Followers & Following Lists (Public, Rate Limited)
router.get('/:username/followers', followLimiter, getDeveloperFollowers);
router.get('/:username/following', followLimiter, getDeveloperFollowing);

// Remove Follower (Authenticated, Owner/Admin Only, Rate Limited)
router.delete('/:username/followers/:followerUsername', followLimiter, protect, removeDeveloperFollower);
router.post('/:username/followers/remove', followLimiter, protect, removeDeveloperFollower);

// Follow / Unfollow Developer Routes (Authenticated, Rate Limited, Concurrency Protected)
router.post('/follow/:username', followLimiter, protect, toggleFollowDeveloper);
router.delete('/follow/:username', followLimiter, protect, toggleFollowDeveloper);
router.get('/follow-status/:username', followLimiter, protect, getFollowStatus);

// Upper Store Official Profile Management (Strict Admin Access)
router.get('/official/profile', getOfficialProfile);
router.put('/official/profile', protectAdmin, updateOfficialProfile);
router.post('/official/cover-image', protectAdmin, handleCoverUpload, uploadOfficialCoverImage);
router.delete('/official/cover-image', protectAdmin, removeOfficialCoverImage);

// User Developer Profile & KYC Registration
router.get('/me', protect, getMyDeveloperProfile);
router.post('/register', protect, registerDeveloperKyc);
router.post('/withdraw-consent', protect, withdrawDeveloperConsent);
router.put('/bio', protect, updateDeveloperBio);

// Admin Developer Oversight Routes
router.get('/', protectAdmin, getAllDevelopers);
router.post('/:id/suspend', protectAdmin, toggleDeveloperSuspension);

module.exports = router;

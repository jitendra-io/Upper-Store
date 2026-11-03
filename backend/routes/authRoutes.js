const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
  updateUsername,
  getUsernameStatus,
  checkUsernameAvailability,
  updateFullProfile,
  uploadCoverImage,
  removeCoverImage,
} = require('../controllers/authController');

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
    cb(null, `cover-${uniqueSuffix}${ext}`);
  },
});

const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WEBP, GIF) are allowed for profile background.'), false);
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
router.get('/username/check/:username', checkUsernameAvailability);
router.get('/user/username/status', protect, getUsernameStatus);
router.put('/user/username', protect, updateUsername);
router.put('/user/profile', protect, updateFullProfile);
router.post('/user/cover-image', protect, handleCoverUpload, uploadCoverImage);
router.delete('/user/cover-image', protect, removeCoverImage);

module.exports = router;

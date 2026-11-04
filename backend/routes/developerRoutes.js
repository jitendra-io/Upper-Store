const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, protectAdmin } = require('../middleware/authMiddleware');
const {
  getMyDeveloperProfile,
  registerDeveloperKyc,
  getAllDevelopers,
  toggleDeveloperSuspension,
  getPublicDeveloperProfile,
  updateDeveloperBio,
  getOfficialProfile,
  updateOfficialProfile,
  uploadOfficialCoverImage,
  removeOfficialCoverImage,
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

// Upper Store Official Profile Management (Admin / Owner)
router.get('/official/profile', getOfficialProfile);
router.put('/official/profile', protect, updateOfficialProfile);
router.post('/official/cover-image', protect, handleCoverUpload, uploadOfficialCoverImage);
router.delete('/official/cover-image', protect, removeOfficialCoverImage);

// User Developer Profile & KYC Registration
router.get('/me', protect, getMyDeveloperProfile);
router.post('/register', protect, registerDeveloperKyc);
router.put('/bio', protect, updateDeveloperBio);

// Admin Developer Oversight Routes
router.get('/', protectAdmin, getAllDevelopers);
router.post('/:id/suspend', protectAdmin, toggleDeveloperSuspension);

module.exports = router;

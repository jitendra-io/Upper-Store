const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protectAdmin, protect } = require('../middleware/authMiddleware');
const { protectPublisher } = require('../middleware/publisherMiddleware');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  trackProductDownload,
  inspectRemoteAsset,
} = require('../controllers/productController');

// Multer Disk Storage - stream large files directly to disk (supports 1GB+ files cleanly)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let destFolder = path.join(__dirname, '../uploads');
    if (file.fieldname === 'image' || file.fieldname === 'images' || file.fieldname === 'logo' || file.fieldname === 'videoPoster') {
      destFolder = path.join(destFolder, 'images');
    } else if (file.fieldname === 'apk') {
      destFolder = path.join(destFolder, 'apks');
    } else if (file.fieldname === 'video') {
      destFolder = path.join(destFolder, 'videos');
    }
    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }
    cb(null, destFolder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1500 * 1024 * 1024 }, // 1.5 GB limit (supports 210MB+ APKs & video files)
  fileFilter: (req, file, cb) => {
    const orig = file.originalname.toLowerCase();
    const ext = path.extname(orig);
    const safeImageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const safeVideoExts = ['.mp4', '.webm', '.mov', '.m4v', '.avi'];
    const safePackageExts = ['.apk', '.exe', '.msi', '.zip', '.dmg'];

    // Strict raster image check (reject SVG to prevent stored XSS via static upload serving)
    const isSafeImage = file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml' && safeImageExts.includes(ext);
    const isSafeVideo = (file.mimetype.startsWith('video/') || safeVideoExts.includes(ext)) && safeVideoExts.includes(ext);
    const isSafePackage = safePackageExts.includes(ext);

    if (isSafeImage || isSafeVideo || isSafePackage) {
      cb(null, true);
    } else {
      cb(new Error('Invalid or unsafe file type. Only raster images (JPEG, PNG, WEBP, GIF), video (MP4, WEBM), and software packages (APK, EXE, MSI, ZIP) are allowed.'));
    }
  },
});

const uploadFields = (req, res, next) => {
  const handler = upload.fields([
    { name: 'image', maxCount: 3 },
    { name: 'images', maxCount: 3 },
    { name: 'logo', maxCount: 1 },
    { name: 'apk', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'videoPoster', maxCount: 1 },
  ]);

  handler(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File is too large! Maximum allowed size is 1.5GB.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// Public routes
router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/:id/download', trackProductDownload);
router.post('/inspect-remote', inspectRemoteAsset);

// Protected routes
router.post('/', protectPublisher, uploadFields, createProduct);
router.put('/:id', protectPublisher, uploadFields, updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;

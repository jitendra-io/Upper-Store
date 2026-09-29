const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

// Multer - store in memory buffer before sending to ImageKit
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 150MB max
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isApk = file.mimetype === 'application/vnd.android.package-archive' ||
                  file.mimetype === 'application/octet-stream' ||
                  file.originalname.toLowerCase().endsWith('.apk') ||
                  file.originalname.toLowerCase().endsWith('.zip');
    if (isImage || isApk) cb(null, true);
    else cb(new Error('Invalid file type. Only images and APK/ZIP files allowed.'));
  }
});

const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'apk', maxCount: 1 },
]);

// Public routes
router.get('/', getProducts);
router.get('/:id', getProductById);

// Protected admin routes
router.post('/', protect, uploadFields, createProduct);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;

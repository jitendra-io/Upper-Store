const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

// Multer Disk Storage - stream large files directly to disk (supports 1GB+ files cleanly)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let destFolder = path.join(__dirname, '../uploads');
    if (file.fieldname === 'image') {
      destFolder = path.join(destFolder, 'images');
    } else if (file.fieldname === 'apk') {
      destFolder = path.join(destFolder, 'apks');
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
  limits: { fileSize: 1500 * 1024 * 1024 }, // 1.5 GB limit (supports 210MB+ APKs)
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isApk = file.mimetype === 'application/vnd.android.package-archive' ||
                  file.mimetype === 'application/octet-stream' ||
                  file.originalname.toLowerCase().endsWith('.apk') ||
                  file.originalname.toLowerCase().endsWith('.zip');
    if (isImage || isApk) cb(null, true);
    else cb(new Error('Invalid file type. Only image files and APK/ZIP files are allowed.'));
  },
});

const uploadFields = (req, res, next) => {
  const handler = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'apk', maxCount: 1 },
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

// Protected admin routes
router.post('/', protect, uploadFields, createProduct);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;

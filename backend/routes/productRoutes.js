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
  trackProductDownload,
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
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    const orig = file.originalname.toLowerCase();
    const isBinary = file.mimetype === 'application/vnd.android.package-archive' ||
                     file.mimetype === 'application/octet-stream' ||
                     file.mimetype === 'application/x-msdownload' ||
                     file.mimetype === 'application/x-msdos-program' ||
                     orig.endsWith('.apk') ||
                     orig.endsWith('.exe') ||
                     orig.endsWith('.msi') ||
                     orig.endsWith('.zip');
    const isVideoExt = orig.endsWith('.mp4') || orig.endsWith('.webm') || orig.endsWith('.mov') || orig.endsWith('.m4v') || orig.endsWith('.avi');

    if (isImage || isVideo || isVideoExt || isBinary) cb(null, true);
    else cb(new Error('Invalid file type. Only image, video, and software package files are allowed.'));
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

// Protected admin routes
router.post('/', protect, uploadFields, createProduct);
router.put('/:id', protect, uploadFields, updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;

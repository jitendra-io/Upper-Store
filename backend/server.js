const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

// Ensure upload directories exist
const uploadDir = path.join(__dirname, 'uploads');
const imagesDir = path.join(uploadDir, 'images');
const apksDir = path.join(uploadDir, 'apks');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
if (!fs.existsSync(apksDir)) fs.mkdirSync(apksDir, { recursive: true });

// Initialize Firebase
require('./config/firebase');

const app = express();

// Middleware
// Dynamic CORS middleware supporting local dev and deployed GitHub Pages domains
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      origin.includes('github.io') ||
      origin.includes('localhost') ||
      (process.env.FRONTEND_URL && origin.includes(process.env.FRONTEND_URL))
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ limit: '1000mb', extended: true }));

// Static directory for uploaded files (APKs and Images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/downloads', require('./routes/downloadRoutes'));

// Serve static frontend in production if built dist exists
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
} else {
  // Health check fallback when backend is deployed as a standalone API
  app.get('/', (req, res) => res.json({ status: 'Upper Store API is running' }));
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

// Process-level crash prevention guards
process.on('uncaughtException', (err) => {
  console.error('[WARN] Uncaught Exception caught (process guarded):', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[WARN] Unhandled Promise Rejection caught (process guarded):', reason);
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`[INFO] Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[ERROR] Port ${PORT} is already in use by another process.`);
    console.error(`[ERROR] Either stop the existing process on port ${PORT} or change PORT in backend/.env (e.g. PORT=5001).`);
  } else {
    console.error('[ERROR] Server error:', err.message);
  }
  process.exit(1);
});


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
// Strict CORS configuration allowing designated origins and rejecting arbitrary domains
const allowedOrigins = [
  'https://jitendra-io.github.io',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
].filter(Boolean).map((o) => o.replace(/\/$/, ''));

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow server-to-server, mobile app webviews, Postman, or curl
  const cleanOrigin = origin.replace(/\/$/, '');

  if (allowedOrigins.includes(cleanOrigin)) return true;

  // Allow localhost / 127.0.0.1 on any port during local development
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) return true;

  // Allow official GitHub Pages subdomains
  if (/^https:\/\/([a-zA-Z0-9_-]+)\.github\.io$/.test(cleanOrigin)) return true;

  return false;
};

app.use(
  cors({
    origin: function (origin, callback) {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy restriction: Origin '${origin}' is not permitted.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-setup-key'],
  })
);

// Body parser with safe payload limits and raw body buffer preservation for webhooks
app.use(
  express.json({
    limit: '2mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// Static directory for uploaded files (APKs and Images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate Limiting (Protects against scraping and DoS)
const { apiLimiter } = require('./middleware/rateLimiter');
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/downloads', require('./routes/downloadRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/developers', require('./routes/developerRoutes'));

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

// Windows Socket Tracking for Clean Nodemon Restarts
const connections = new Set();
server.on('connection', (socket) => {
  connections.add(socket);
  socket.on('close', () => connections.delete(socket));
});

const closeConnectionsAndServer = () => {
  for (const socket of connections) {
    try {
      socket.destroy();
    } catch (_) {}
  }
  connections.clear();
  return new Promise((resolve) => server.close(resolve));
};

// Gracefully release port on nodemon restart (SIGUSR2) and termination
process.once('SIGUSR2', async () => {
  try {
    await closeConnectionsAndServer();
  } catch (_) {}
  process.kill(process.pid, 'SIGUSR2');
});

process.on('SIGINT', async () => {
  try {
    await closeConnectionsAndServer();
  } catch (_) {}
  process.exit(0);
});

process.on('SIGTERM', async () => {
  try {
    await closeConnectionsAndServer();
  } catch (_) {}
  process.exit(0);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[ERROR] Port ${PORT} is temporarily busy. Waiting to retry...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT);
    }, 1000);
  } else {
    console.error('[ERROR] Server error:', err.message);
    process.exit(1);
  }
});


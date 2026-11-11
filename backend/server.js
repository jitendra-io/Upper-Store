const express = require('express');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const cluster = require('node:cluster');
const os = require('node:os');

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

// Disable Express fingerprint header to prevent server profiling
app.disable('x-powered-by');

// Cluster Mode Configuration:
// When CLUSTER_MODE=true or running in production on multi-core environments,
// worker processes are forked to utilize all available CPU cores.
const totalCpus = os.cpus().length;
const isClusterEnabled = process.env.CLUSTER_MODE === 'true' ||
  (process.env.NODE_ENV === 'production' && totalCpus > 1 && process.env.CLUSTER_MODE !== 'false');
const maxConfiguredWorkers = parseInt(process.env.MAX_WORKERS || process.env.WEB_CONCURRENCY, 10);
const workerCount = Math.max(1, Math.min(maxConfiguredWorkers || totalCpus, 8));

// Enforce standard baseline HTTP security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Baseline Cache-Control Policy for Edge & Browser Load Balancing:
// Mutating operations and private routes default to no-store to prevent CDN/browser cache contamination.
// Public read endpoints (products, search, developer profile) explicitly opt-in with edge cache headers.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Middleware
// Strict CORS configuration allowing designated origins and rejecting arbitrary domains
const allowedOrigins = [
  'https://jitendra-io.github.io',
  'http://upperstore.bbroot.com',
  'https://upperstore.bbroot.com',
  "https://upperstore.pages.dev",
  'http://localhost:5173',
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

  // Allow Cloudflare Pages subdomains (*.pages.dev)
  if (/^https:\/\/([a-zA-Z0-9_.-]+)\.pages\.dev$/.test(cleanOrigin)) return true;

  // Allow Vercel app subdomains (*.vercel.app)
  if (/^https:\/\/([a-zA-Z0-9_.-]+)\.vercel\.app$/.test(cleanOrigin)) return true;

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

// HTTP Response Compression (Gzip / Deflate, reduces response size by 75-85%)
app.use(
  compression({
    threshold: 1024,
    level: 6,
  })
);

// Static directory for uploaded files (APKs and Images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Background jobs & services
const { startNotificationCleanupJob, stopNotificationCleanupJob } = require('./services/notificationCleanupService');

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
app.get('/api/download', require('./controllers/downloadController').proxyDownload);
app.use('/api/downloads', require('./routes/downloadRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/developers', require('./routes/developerRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));

// High-Performance Telemetry & Health Endpoint
const cacheService = require('./services/cacheService');
app.get('/api/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    cluster: {
      enabled: Boolean(isClusterEnabled),
      isWorker: Boolean(cluster.isWorker),
      workerId: cluster.worker ? cluster.worker.id : 'standalone',
      pid: process.pid,
      totalCPUs: totalCpus,
      activeWorkers: isClusterEnabled && cluster.isPrimary ? Object.keys(cluster.workers || {}).length : undefined,
    },
    memory: {
      rssMB: (mem.rss / (1024 * 1024)).toFixed(1),
      heapUsedMB: (mem.heapUsed / (1024 * 1024)).toFixed(1),
      heapTotalMB: (mem.heapTotal / (1024 * 1024)).toFixed(1),
    },
    cache: cacheService.getMetrics(),
  });
});

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
let server;
let retryCount = 0;
const MAX_PORT_RETRIES = 3;
let cleanupJobStarted = false;
let stableTimer = null;

// Active connection tracking for instantaneous zero-latency socket destruction on shutdown
const connections = new Set();

const startServer = () => {
  server = app.listen(PORT);

  server.once('listening', () => {
    const workerTag = cluster.isWorker ? `[Worker ${cluster.worker.id} / PID ${process.pid}]` : '[Standalone]';
    console.log(`[INFO] ${workerTag} Server running on http://localhost:${PORT}`);

    // Only reset retryCount once the server has been running stably without error
    if (stableTimer) clearTimeout(stableTimer);
    stableTimer = setTimeout(() => {
      retryCount = 0;
    }, 4000);
    stableTimer.unref();

    if (!isClusterEnabled && !cleanupJobStarted) {
      cleanupJobStarted = true;
      startNotificationCleanupJob();
    }
  });

  // 1. Enforce strict HTTP socket timeouts to prevent Slowloris & hung sockets
  server.keepAliveTimeout = 65000; // 65s (gracefully handles Cloudflare/Render 60s idle keep-alive)
  server.headersTimeout = 66000;   // 66s (must be strictly greater than keepAliveTimeout)
  server.requestTimeout = 30000;   // 30s max for receiving request payloads

  // 2. Track all live sockets
  server.on('connection', (socket) => {
    connections.add(socket);
    socket.on('close', () => connections.delete(socket));
  });

  // 3. Robust Error Handling (Guarded against infinite EADDRINUSE freeze loops)
  server.once('error', (err) => {
    if (stableTimer) clearTimeout(stableTimer);

    if (err.code === 'EADDRINUSE') {
      retryCount++;
      if (retryCount <= MAX_PORT_RETRIES) {
        const delay = retryCount * 800;
        console.warn(`[WARN] Port ${PORT} is busy. Retrying in ${delay}ms (Attempt ${retryCount}/${MAX_PORT_RETRIES})...`);
        setTimeout(() => {
          try {
            server.close();
          } catch (_) {}
          startServer();
        }, delay);
      } else {
        console.error(`[FATAL] Port ${PORT} remained busy after ${MAX_PORT_RETRIES} retries. Another process is actively listening.`);
        console.error(`[DIAGNOSTIC] To release port ${PORT} manually:`);
        console.error(`  - On Windows: netstat -ano | findstr :${PORT}  (then Stop-Process -Id <PID> -Force)`);
        console.error(`  - On Linux/Mac: lsof -ti :${PORT} | xargs kill -9`);
        process.exit(1);
      }
    } else {
      console.error('[FATAL] Unexpected server error:', err.message);
      process.exit(1);
    }
  });
};

// Process Execution: Cluster Primary vs Worker / Standalone
if (isClusterEnabled && cluster.isPrimary) {
  console.log(`[CLUSTER] Master process ${process.pid} orchestrating ${workerCount} worker(s) across ${totalCpus} CPU core(s)...`);

  // Master starts single background tasks to avoid duplicate crons across workers
  startNotificationCleanupJob();

  let isMasterShuttingDown = false;

  for (let i = 0; i < workerCount; i++) {
    cluster.fork();
  }

  cluster.on('online', (worker) => {
    console.log(`[CLUSTER] Worker ${worker.id} (PID: ${worker.process.pid}) is online and accepting connections.`);
  });

  cluster.on('exit', (worker, code, signal) => {
    if (isMasterShuttingDown) return;
    console.warn(`[CLUSTER] Worker ${worker.id} (PID: ${worker.process.pid}) exited (${signal || code}). Respawning in 1s...`);
    setTimeout(() => {
      if (!isMasterShuttingDown) cluster.fork();
    }, 1000);
  });

  const handleMasterShutdown = (signal) => {
    if (isMasterShuttingDown) return;
    isMasterShuttingDown = true;
    console.log(`[CLUSTER] Master received ${signal}. Forwarding shutdown to all workers...`);
    stopNotificationCleanupJob();

    for (const id in cluster.workers) {
      try {
        cluster.workers[id].process.kill(signal);
      } catch (_) {}
    }

    const forceExitTimer = setTimeout(() => {
      console.warn('[CLUSTER] Force exiting master process after timeout.');
      process.exit(0);
    }, 5000);
    forceExitTimer.unref();
  };

  process.on('SIGINT', () => handleMasterShutdown('SIGINT'));
  process.on('SIGTERM', () => handleMasterShutdown('SIGTERM'));
} else {
  // Worker process or standalone single-process mode
  startServer();
}

// Forceful Cleanup and Zero-Orphan Shutdown
const closeConnectionsAndServer = () => {
  stopNotificationCleanupJob();

  // Immediately destroy all open keep-alive and active TCP sockets
  for (const socket of connections) {
    try {
      socket.destroy();
    } catch (_) {}
  }
  connections.clear();

  return new Promise((resolve) => {
    if (server && server.listening) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
};

// Safe Graceful Termination Handler with 4-second Hard Kill Timer (prevents zombie freeze)
const gracefulShutdown = (signal) => {
  console.log(`[INFO] Received ${signal}. Shutting down cleanly...`);

  // Hard deadline timer: Guarantee process exits within 4s even if an external call hangs
  const forceKillTimer = setTimeout(() => {
    console.warn(`[WARN] Clean shutdown timed out. Forcing process exit.`);
    process.exit(1);
  }, 4000);
  forceKillTimer.unref(); // Prevents timer itself from keeping the event loop alive

  closeConnectionsAndServer()
    .then(() => {
      clearTimeout(forceKillTimer);
      console.log('[INFO] Port released and sockets closed cleanly.');
      process.exit(0);
    })
    .catch((err) => {
      clearTimeout(forceKillTimer);
      console.error('[ERROR] Error during shutdown:', err.message);
      process.exit(1);
    });
};

// Listen for termination signals in worker or standalone processes
if (!isClusterEnabled || !cluster.isPrimary) {
  process.once('SIGUSR2', async () => {
    try {
      await closeConnectionsAndServer();
    } catch (_) {}
    process.kill(process.pid, 'SIGUSR2');
  });

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}


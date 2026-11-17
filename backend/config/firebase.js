const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

let db = null;
let authAdmin = null;

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL) {
  try {
    const serviceAccount = {
      type: 'service_account',
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      clientId: process.env.FIREBASE_CLIENT_ID,
      authUri: 'https://accounts.google.com/o/oauth2/auth',
      tokenUri: 'https://oauth2.googleapis.com/token',
    };

    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    }

    db = getFirestore();
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch (settingsErr) {
      console.warn('[WARN] Could not set ignoreUndefinedProperties on Firestore:', settingsErr.message);
    }
    try {
      authAdmin = getAuth();
    } catch (authErr) {
      console.warn('[WARN] Firebase Admin Auth initialization failed:', authErr.message);
    }
    console.log('[INFO] Firebase Admin initialized');
  } catch (err) {
    console.error('[WARN] Firebase Admin initialization failed:', err.message);
  }
} else {
  console.warn('[WARN] Firebase Admin credentials not provided in environment variables.');
}

// Quota exhaustion tracking state
let isQuotaExceeded = false;
let lastQuotaExceededAt = 0;
const QUOTA_COOLDOWN_MS = 60 * 1000; // 60s cooldown before re-testing

const isFirestoreQuotaError = (err) => {
  if (!err) return false;
  const isQuota =
    err.code === 8 ||
    (typeof err.message === 'string' && (err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('Quota exceeded'))) ||
    (typeof err.details === 'string' && err.details.includes('Quota exceeded'));
  if (isQuota) {
    isQuotaExceeded = true;
    lastQuotaExceededAt = Date.now();
    console.warn('[FIRESTORE QUOTA] Quota limit exceeded detected. Maintenance mode activated.');
  }
  return isQuota;
};

const getQuotaStatus = () => {
  if (isQuotaExceeded && Date.now() - lastQuotaExceededAt > QUOTA_COOLDOWN_MS) {
    isQuotaExceeded = false;
  }
  return {
    isQuotaExceeded,
    lastQuotaExceededAt,
  };
};

const setQuotaExceeded = () => {
  isQuotaExceeded = true;
  lastQuotaExceededAt = Date.now();
};

const resetQuotaStatus = () => {
  isQuotaExceeded = false;
  lastQuotaExceededAt = 0;
};

// Recursive Proxy to automatically catch Firestore Quota Exhaustion on ANY collection, query, or doc operation
const wrapWithQuotaDetection = (obj) => {
  if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return obj;
  return new Proxy(obj, {
    get(target, prop) {
      const orig = target[prop];
      if (typeof orig === 'function') {
        return function (...args) {
          try {
            const result = orig.apply(target, args);
            if (result && typeof result.then === 'function') {
              return result.catch((err) => {
                isFirestoreQuotaError(err);
                throw err;
              });
            }
            if (result && typeof result === 'object') {
              return wrapWithQuotaDetection(result);
            }
            return result;
          } catch (err) {
            isFirestoreQuotaError(err);
            throw err;
          }
        };
      }
      if (orig && typeof orig === 'object') {
        return wrapWithQuotaDetection(orig);
      }
      return orig;
    },
  });
};

// Proxy db fallback to provide clear error message if queried while unconfigured
const dbProxy = new Proxy({}, {
  get(target, prop) {
    if (db) return wrapWithQuotaDetection(db)[prop];
    return () => {
      throw new Error('Firestore is not initialized. Please verify Firebase Admin credentials in environment variables.');
    };
  }
});

module.exports = {
  db: dbProxy,
  authAdmin: () => authAdmin,
  FieldValue,
  isFirestoreQuotaError,
  getQuotaStatus,
  setQuotaExceeded,
  resetQuotaStatus,
};

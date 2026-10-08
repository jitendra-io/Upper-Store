const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

let db = null;

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
    console.log('[INFO] Firebase Admin initialized');
  } catch (err) {
    console.error('[WARN] Firebase Admin initialization failed:', err.message);
  }
} else {
  console.warn('[WARN] Firebase Admin credentials not provided in environment variables.');
}

// Proxy db fallback to provide clear error message if queried while unconfigured
const dbProxy = new Proxy({}, {
  get(target, prop) {
    if (db) return db[prop];
    return () => {
      throw new Error('Firestore is not initialized. Please verify Firebase Admin credentials in environment variables.');
    };
  }
});

module.exports = { db: dbProxy };


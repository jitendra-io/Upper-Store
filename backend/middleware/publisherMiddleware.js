const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwtConfig');
const { db } = require('../config/firebase');

/**
 * Publisher Authorization Middleware:
 * Allows either Platform Administrators OR Active, Verified, Non-Suspended VIP Developers.
 */
const protectPublisher = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;

    // 1. Admin has unconditional publishing authority
    if (decoded.role === 'admin') {
      req.isAdmin = true;
      return next();
    }

    req.isAdmin = false;
    const cleanEmail = (decoded.email || '').trim().toLowerCase();

    // 2. Lookup User in Firestore
    let userDoc = null;
    let userData = null;

    if (decoded.uid) {
      const doc = await db.collection('users').doc(decoded.uid).get();
      if (doc.exists) {
        userDoc = doc;
        userData = doc.data();
      }
    }

    if (!userData && cleanEmail) {
      const snap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
      if (!snap.empty) {
        userDoc = snap.docs[0];
        userData = snap.docs[0].data();
      }
    }

    if (!userData) {
      return res.status(401).json({ message: 'User account not found.' });
    }

    // 3. Ensure user account is not banned
    if (userData.isBanned) {
      return res.status(403).json({
        message: 'Account restricted. Banned accounts cannot publish or broadcast.',
        code: 'ACCOUNT_BANNED',
      });
    }

    // 4. Validate VIP Membership (Pro or Elite, not expired)
    const membership = userData.membership;
    const isVipValid =
      membership &&
      (membership.plan === 'pro' || membership.plan === 'elite') &&
      (!membership.validUntil || new Date(membership.validUntil) > new Date());

    if (!isVipValid) {
      return res.status(403).json({
        message: 'VIP membership required. Active Pro or Elite membership is needed to upload products and broadcasts.',
        code: 'VIP_REQUIRED',
      });
    }

    // 5. Lookup Developer KYC record in Firestore
    let devSnap = await db.collection('developers').where('userId', '==', userDoc.id).limit(1).get();
    if (devSnap.empty && cleanEmail) {
      devSnap = await db.collection('developers').where('email', '==', cleanEmail).limit(1).get();
    }

    if (devSnap.empty) {
      return res.status(403).json({
        message: 'Developer Aadhaar verification required before uploading products or broadcasts.',
        code: 'KYC_REQUIRED',
      });
    }

    const devDoc = devSnap.docs[0];
    const devData = { id: devDoc.id, ...devDoc.data() };

    // 6. Check if Developer account has been suspended by an administrator
    if (devData.isSuspended) {
      return res.status(403).json({
        message: 'Developer Account Suspended: Your developer privileges have been suspended by an administrator.',
        code: 'DEV_SUSPENDED',
        suspensionReason: devData.suspensionReason || 'Violation of developer policies.',
      });
    }

    // Attach developer data to request
    req.developer = devData;
    req.developerDocRef = devDoc.ref;
    req.userDocRef = userDoc.ref;
    req.membership = membership;

    next();
  } catch (err) {
    console.error('Publisher auth error:', err.message);
    return res.status(401).json({ message: 'Invalid or expired authorization token.' });
  }
};

module.exports = {
  protectPublisher,
};


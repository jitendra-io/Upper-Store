const { db, authAdmin } = require('../config/firebase');
const { getJwtSecret } = require('../config/jwtConfig');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { uploadFileToCloudOrLocal } = require('../services/imagekitService');
const { sendWelcomeEmail, sendLoginAlertEmail } = require('../services/emailService');

const generateToken = (uid, role = 'user', email = null) => {
  const payload = { uid, role };
  if (email) payload.email = email.trim().toLowerCase();
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
};

const resolveUserMembership = async (userData, userDocRef = null) => {
  const defaultMembership = { plan: 'free', badge: null, validUntil: null };
  if (!userData || !userData.membership) return defaultMembership;
  const m = userData.membership;
  if (m.plan && m.plan !== 'free') {
    if (m.validUntil && new Date(m.validUntil) < new Date()) {
      // Expiration date has passed! Automatically remove user's badge in Firestore
      if (userDocRef && typeof userDocRef.update === 'function') {
        try {
          await userDocRef.update({
            membership: defaultMembership,
            isVip: false,
            vipPlan: 'free',
            vipExpiredAt: m.validUntil,
            updatedAt: new Date().toISOString(),
          });
          console.log(`⭐ [VIP Expiry] Subscription expired for ${userData.email || 'user'}. Badge removed and reverted to free in Firestore.`);
        } catch (err) {
          console.warn('[VIP Expiry] Error removing expired badge in Firestore:', err.message);
        }
      }
      return defaultMembership; // Expired: badge removed!
    }
    return {
      plan: m.plan,
      badge: m.badge || (m.plan === 'elite' ? 'purple' : 'gold'),
      validUntil: m.validUntil || null,
    };
  }
  return defaultMembership;
};

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

// @desc    Login admin
// @route   POST /api/auth/login
// @access  Public
const loginAdmin = async (req, res) => {
  const { username, password } = req.body;
  try {
    const adminRef = db.collection('admins').where('username', '==', username);
    const snapshot = await adminRef.get();

    if (snapshot.empty) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const adminDoc = snapshot.docs[0];
    const adminData = adminDoc.data();

    const isMatch = await bcrypt.compare(password, adminData.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // Trigger Admin Security Login Alert Email
    const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL || process.env.GMAIL_USER || 'upper.official.in@gmail.com';
    sendLoginAlertEmail(adminAlertEmail, adminData.username || 'Store Admin', 'Admin Portal Access').catch((err) =>
      console.error('Admin login alert email trigger error:', err)
    );

    res.json({
      uid: adminDoc.id,
      username: adminData.username,
      role: 'admin',
      token: generateToken(adminDoc.id, 'admin'),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during admin login.' });
  }
};

// @desc    One-time initial admin setup (Permanently locked if an admin exists)
// @route   POST /api/auth/setup
// @access  Restricted / Setup Secret
const setupAdmin = async (req, res) => {
  const { username, password, setupSecret } = req.body;
  const setupKeyHeader = req.headers['x-setup-key'];

  try {
    // 1. Check if ANY admin already exists in the database
    const existingAdmins = await db.collection('admins').limit(1).get();
    if (!existingAdmins.empty) {
      return res.status(403).json({
        message: 'Forbidden: Admin setup is permanently locked because an admin account already exists.',
      });
    }

    // 2. If an ADMIN_SETUP_SECRET is configured in .env, verify it
    const configuredSecret = process.env.ADMIN_SETUP_SECRET || process.env.SETUP_SECRET_TOKEN;
    if (configuredSecret) {
      const providedSecret = setupSecret || setupKeyHeader;
      if (providedSecret !== configuredSecret) {
        return res.status(401).json({ message: 'Unauthorized: Invalid setup secret key.' });
      }
    }

    // 3. Validate input
    if (!username || !password || username.trim().length < 3 || password.trim().length < 6) {
      return res.status(400).json({
        message: 'Username must be at least 3 characters and password at least 6 characters.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password.trim(), salt);

    await db.collection('admins').add({
      username: username.trim(),
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      message: 'Admin created successfully. Setup is now permanently locked.',
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ message: 'Error creating admin.' });
  }
};

// ==========================================
// USER AUTHENTICATION (REGISTER, LOGIN, GOOGLE OAUTH)
// ==========================================

/**
 * Validate strict username rules:
 * - Unique across users
 * - Can contain small letters (a-z), numbers (0-9), underscores (_), and dots (.) only
 * - No uppercase letters, spaces, or other special characters
 * - Length: 3 to 30 characters
 */
const validateUsernameFormat = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'Username is required.' };
  }
  let clean = username.trim().toLowerCase();
  // Automatically strip leading @ if user entered e.g. "@username"
  if (clean.startsWith('@')) {
    clean = clean.replace(/^@+/, '');
  }
  if (clean.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters long.' };
  }
  if (clean.length > 30) {
    return { valid: false, message: 'Username cannot exceed 30 characters.' };
  }
  if (!/^[a-z0-9_.]+$/.test(clean)) {
    return {
      valid: false,
      message: 'Username can only contain small letters (a-z), numbers (0-9), underscores (_), and dots (.). No uppercase, spaces, or other special characters are allowed.',
    };
  }
  return { valid: true, clean };
};

/**
 * Generate a unique compliant username from email/name
 */
const generateUniqueUsername = async (identifier, excludeUserId = null) => {
  let base = (identifier || 'user')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '_')
    .slice(0, 20);
  if (!base || base.length < 3) {
    base = 'user_' + Math.floor(100 + Math.random() * 900);
  }
  base = base.replace(/[^a-z0-9_.]/g, '_');
  let candidate = base;
  let counter = 1;
  while (true) {
    const snap = await db.collection('users').where('username', '==', candidate).limit(1).get();
    if (snap.empty) {
      return candidate;
    }
    const doc = snap.docs[0];
    if (excludeUserId && doc.id === excludeUserId) {
      return candidate;
    }
    candidate = base.slice(0, 22) + '_' + counter;
    counter++;
  }
};

// @desc    Register new end-user
// @route   POST /api/auth/user/register
// @access  Public
const registerUser = async (req, res) => {
  const { email, password, displayName, username } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  // Validate Username: must be unique, lowercase letters, numbers, _, and . only
  const uv = validateUsernameFormat(username);
  if (!uv.valid) {
    return res.status(400).json({ message: uv.message });
  }
  const cleanUsername = uv.clean;

  try {
    const cleanEmail = email.trim().toLowerCase();
    
    // Check if user already exists
    const usersRef = db.collection('users').where('email', '==', cleanEmail);
    const snapshot = await usersRef.get();

    if (!snapshot.empty) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // Check if username is already taken
    const usernameSnap = await db.collection('users').where('username', '==', cleanUsername).limit(1).get();
    if (!usernameSnap.empty) {
      return res.status(400).json({ message: 'Username @' + cleanUsername + ' is already taken. Please choose another.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const photoURL = `https://unavatar.io/${encodeURIComponent(cleanEmail)}?fallback=https%3A%2F%2Fapi.dicebear.com%2F7.x%2Finitials%2Fsvg%3Fseed%3D${encodeURIComponent(cleanEmail)}`;

    const newUserRef = await db.collection('users').add({
      email: cleanEmail,
      username: cleanUsername,
      password: hashedPassword,
      displayName: displayName ? displayName.trim() : cleanUsername,
      photoURL,
      provider: 'email',
      membership: { plan: 'free', badge: null, validUntil: null },
      subscriptionCount: 0,
      totalVipDays: 0,
      totalAmountSpent: 0,
      lastSubscribedAt: null,
      createdAt: new Date().toISOString(),
    });

    const userProfile = {
      uid: newUserRef.id,
      email: cleanEmail,
      username: cleanUsername,
      displayName: displayName ? displayName.trim() : cleanUsername,
      photoURL,
      provider: 'email',
      membership: { plan: 'free', badge: null, validUntil: null },
      subscriptionCount: 0,
      totalVipDays: 0,
      totalAmountSpent: 0,
      lastSubscribedAt: null,
      role: 'user',
    };

    // Trigger Welcome Email asynchronously
    sendWelcomeEmail(cleanEmail, userProfile.displayName).catch((err) =>
      console.error('Welcome email async trigger error:', err)
    );

    res.status(201).json({
      message: 'Account created successfully.',
      user: userProfile,
      token: generateToken(newUserRef.id, 'user', cleanEmail),
    });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ message: 'Failed to create user account.' });
  }
};

// @desc    Login user with email & password
// @route   POST /api/auth/user/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const usersRef = db.collection('users').where('email', '==', cleanEmail);
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    if (userData.provider === 'google' && !userData.password) {
      return res.status(400).json({ message: 'This email is linked with Google Sign-In. Please click "Continue with Google".' });
    }

    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const photoURL = userData.photoURL || `https://unavatar.io/${encodeURIComponent(cleanEmail)}?fallback=https%3A%2F%2Fapi.dicebear.com%2F7.x%2Finitials%2Fsvg%3Fseed%3D${encodeURIComponent(cleanEmail)}`;

    let userUsername = userData.username;
    if (!userUsername) {
      userUsername = await generateUniqueUsername(userData.email, userDoc.id);
      await userDoc.ref.update({ username: userUsername });
    }

    const membership = await resolveUserMembership(userData, userDoc.ref);

    const userProfile = {
      uid: userDoc.id,
      email: userData.email,
      username: userUsername,
      displayName: userData.displayName || userUsername || userData.email.split('@')[0],
      provider: userData.provider || 'email',
      photoURL,
      isBanned: Boolean(userData.isBanned),
      bannedAt: userData.bannedAt || null,
      lastAppealedAt: userData.lastAppealedAt || null,
      membership,
      subscriptionCount: Number(userData.subscriptionCount) || 0,
      totalVipDays: Number(userData.totalVipDays) || 0,
      totalAmountSpent: Number(userData.totalAmountSpent) || 0,
      lastSubscribedAt: userData.lastSubscribedAt || null,
      lastSubscriptionPlan: userData.lastSubscriptionPlan || null,
      role: 'user',
    };

    // Trigger Login Alert Email asynchronously
    sendLoginAlertEmail(userProfile.email, userProfile.displayName, 'Email & Password').catch((err) =>
      console.error('Login alert email trigger error:', err)
    );

    res.json({
      message: 'Logged in successfully.',
      user: userProfile,
      token: generateToken(userDoc.id, 'user', cleanEmail),
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({ message: 'Server error during user login.' });
  }
};

// @desc    Google OAuth2.0 Login / Register Sync
// @route   POST /api/auth/user/google
// @access  Public
const googleOAuthLogin = async (req, res) => {
  const { idToken, credential, displayName, photoURL, googleId } = req.body;

  const rawToken = idToken || credential;
  if (!rawToken) {
    return res.status(400).json({ message: 'Authentication token is required for Google Sign-In.' });
  }

  try {
    let verifiedEmail = null;
    let verifiedName = displayName || null;
    let verifiedPhoto = photoURL || null;
    let verifiedUid = googleId || null;

    // 1. Verify token with Firebase Admin Auth if initialized
    const adminAuth = typeof authAdmin === 'function' ? authAdmin() : authAdmin;
    if (adminAuth && typeof adminAuth.verifyIdToken === 'function') {
      try {
        const decoded = await adminAuth.verifyIdToken(rawToken);
        if (decoded && decoded.email) {
          if (decoded.email_verified === false) {
            return res.status(401).json({ message: 'Google account email is not verified.' });
          }
          verifiedEmail = decoded.email.trim().toLowerCase();
          verifiedName = decoded.name || verifiedName;
          verifiedPhoto = decoded.picture || verifiedPhoto;
          verifiedUid = decoded.uid || verifiedUid;
        }
      } catch (fbErr) {
        // Fall back to Google tokeninfo
      }
    }

    // 2. Cryptographic verification fallback via Google tokeninfo API
    if (!verifiedEmail) {
      try {
        const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(rawToken)}`);
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.email) {
            if (gData.email_verified === 'false' || gData.email_verified === false) {
              return res.status(401).json({ message: 'Google account email is not verified.' });
            }
            verifiedEmail = gData.email.trim().toLowerCase();
            verifiedName = gData.name || verifiedName;
            verifiedPhoto = gData.picture || verifiedPhoto;
            verifiedUid = gData.sub || verifiedUid;
          }
        }
      } catch (gErr) {
        console.warn('Google tokeninfo verification failed:', gErr.message);
      }
    }

    if (!verifiedEmail) {
      return res.status(401).json({ message: 'Google authentication verification failed. Token is invalid or expired.' });
    }

    const cleanEmail = verifiedEmail;
    const usersRef = db.collection('users').where('email', '==', cleanEmail);
    const snapshot = await usersRef.get();

    let uid;
    let finalProfile;
    const computedPhoto = verifiedPhoto || `https://unavatar.io/${encodeURIComponent(cleanEmail)}?fallback=https%3A%2F%2Fapi.dicebear.com%2F7.x%2Finitials%2Fsvg%3Fseed%3D${encodeURIComponent(cleanEmail)}`;

    if (snapshot.empty) {
      // Create new user account via Google with unique username
      const generatedUsername = await generateUniqueUsername(cleanEmail);
      const newUserRef = await db.collection('users').add({
        email: cleanEmail,
        username: generatedUsername,
        displayName: verifiedName || generatedUsername || cleanEmail.split('@')[0],
        photoURL: computedPhoto,
        googleId: verifiedUid || null,
        provider: 'google',
        isBanned: false,
        membership: { plan: 'free', badge: null, validUntil: null },
        subscriptionCount: 0,
        totalVipDays: 0,
        totalAmountSpent: 0,
        lastSubscribedAt: null,
        createdAt: new Date().toISOString(),
      });
      uid = newUserRef.id;
      finalProfile = {
        uid,
        email: cleanEmail,
        username: generatedUsername,
        displayName: verifiedName || generatedUsername || cleanEmail.split('@')[0],
        photoURL: computedPhoto,
        provider: 'google',
        isBanned: false,
        membership: { plan: 'free', badge: null, validUntil: null },
        subscriptionCount: 0,
        totalVipDays: 0,
        totalAmountSpent: 0,
        lastSubscribedAt: null,
        role: 'user',
      };

      // Trigger Welcome Email for new Google sign-ups
      sendWelcomeEmail(cleanEmail, finalProfile.displayName).catch((err) =>
        console.error('Welcome email async trigger error:', err)
      );
    } else {
      const userDoc = snapshot.docs[0];
      uid = userDoc.id;
      const existingData = userDoc.data();

      const activePhoto = verifiedPhoto || existingData.photoURL || computedPhoto;

      // Update avatar or display name if missing
      await userDoc.ref.update({
        displayName: verifiedName || existingData.displayName || cleanEmail.split('@')[0],
        photoURL: activePhoto,
        lastLogin: new Date().toISOString(),
      });

      let userUsername = existingData.username;
      if (!userUsername) {
        userUsername = await generateUniqueUsername(cleanEmail, userDoc.id);
        await userDoc.ref.update({ username: userUsername });
      }

      const membership = await resolveUserMembership(existingData, userDoc.ref);

      finalProfile = {
        uid,
        email: cleanEmail,
        username: userUsername,
        displayName: verifiedName || existingData.displayName || userUsername || cleanEmail.split('@')[0],
        photoURL: activePhoto,
        provider: existingData.provider || 'google',
        isBanned: Boolean(existingData.isBanned),
        bannedAt: existingData.bannedAt || null,
        lastAppealedAt: existingData.lastAppealedAt || null,
        membership,
        subscriptionCount: Number(existingData.subscriptionCount) || 0,
        totalVipDays: Number(existingData.totalVipDays) || 0,
        totalAmountSpent: Number(existingData.totalAmountSpent) || 0,
        lastSubscribedAt: existingData.lastSubscribedAt || null,
        lastSubscriptionPlan: existingData.lastSubscriptionPlan || null,
        role: 'user',
      };

      // Trigger Login Alert for existing Google sign-ins
      sendLoginAlertEmail(cleanEmail, finalProfile.displayName, 'Google OAuth 2.0').catch((err) =>
        console.error('Login alert email trigger error:', err)
      );
    }

    res.json({
      message: 'Google Sign-In successful.',
      user: finalProfile,
      token: generateToken(uid, 'user', cleanEmail),
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ message: 'Server error during Google OAuth authentication.' });
  }
};

// @desc    Get all registered users for Admin panel
// @route   GET /api/auth/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const membership = await resolveUserMembership(data, doc.ref);
        return {
          uid: doc.id,
          ...data,
          isBanned: Boolean(data.isBanned),
          membership,
          subscriptionCount: Number(data.subscriptionCount) || 0,
          totalVipDays: Number(data.totalVipDays) || 0,
          totalAmountSpent: Number(data.totalAmountSpent) || 0,
          lastSubscribedAt: data.lastSubscribedAt || null,
        };
      })
    );

    users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch registered users.' });
  }
};

// @desc    Ban a user account
// @route   POST /api/auth/users/:userId/ban
// @access  Private (Admin)
const banUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const docRef = db.collection('users').doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    await docRef.update({
      isBanned: true,
      bannedAt: new Date().toISOString(),
    });

    res.json({ message: 'User account has been banned successfully.' });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ message: 'Failed to ban user account.' });
  }
};

// @desc    Unban a user account
// @route   POST /api/auth/users/:userId/unban
// @access  Private (Admin)
const unbanUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const docRef = db.collection('users').doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    await docRef.update({
      isBanned: false,
      unbannedAt: new Date().toISOString(),
    });

    res.json({ message: 'User account has been unbanned successfully.' });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ message: 'Failed to unban user account.' });
  }
};

// @desc    Get real-time user status (check if banned & membership)
// @route   GET /api/auth/user/status/:email
// @access  Public
const getUserStatus = async (req, res) => {
  const { email } = req.params;
  try {
    const cleanEmail = email.trim().toLowerCase();

    // Security authorization guard: user must be authenticated as target user or admin
    if (!req.user || (req.user.role !== 'admin' && req.user.email?.toLowerCase() !== cleanEmail)) {
      return res.status(403).json({ message: 'Forbidden: Access denied to user profile status.' });
    }

    const snapshot = await db.collection('users').where('email', '==', cleanEmail).get();

    if (snapshot.empty) {
      return res.json({
        isBanned: false,
        membership: { plan: 'free', badge: null, validUntil: null },
        subscriptionCount: 0,
        totalVipDays: 0,
        totalAmountSpent: 0,
        lastSubscribedAt: null,
      });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const membership = await resolveUserMembership(userData, userDoc.ref);

    res.json({
      uid: userDoc.id,
      email: userData.email,
      username: userData.username || userData.email.split('@')[0],
      usernameChangeHistory: userData.usernameChangeHistory || [],
      isBanned: Boolean(userData.isBanned),
      bannedAt: userData.bannedAt || null,
      lastAppealedAt: userData.lastAppealedAt || null,
      membership,
      subscriptionCount: Number(userData.subscriptionCount) || 0,
      totalVipDays: Number(userData.totalVipDays) || 0,
      totalAmountSpent: Number(userData.totalAmountSpent) || 0,
      lastSubscribedAt: userData.lastSubscribedAt || null,
      lastSubscriptionPlan: userData.lastSubscriptionPlan || null,
      subscriptionData: {
        subscriptionCount: Number(userData.subscriptionCount) || 0,
        totalVipDays: Number(userData.totalVipDays) || 0,
        totalAmountSpent: Number(userData.totalAmountSpent) || 0,
        lastSubscribedAt: userData.lastSubscribedAt || null,
        lastSubscriptionPlan: userData.lastSubscriptionPlan || null,
      },
    });
  } catch (error) {
    console.error('Error fetching user status:', error);
    res.status(500).json({ message: 'Failed to fetch user status.' });
  }
};

// @desc    Update authenticated user's username (VIP members allowed max 2 changes per year)
// @route   PUT /api/auth/user/username
// @access  Private (Authenticated User)
const updateUsername = async (req, res) => {
  const { username } = req.body;
  const userId = req.user.uid;
  const cleanEmail = (req.user.email || '').trim().toLowerCase();

  const uv = validateUsernameFormat(username);
  if (!uv.valid) {
    return res.status(400).json({ message: uv.message });
  }
  const cleanUsername = uv.clean;

  try {
    let userDocRef = db.collection('users').doc(userId);
    let userDoc = await userDocRef.get();
    if (!userDoc.exists && cleanEmail) {
      const snap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
      if (!snap.empty) {
        userDocRef = snap.docs[0].ref;
        userDoc = snap.docs[0];
      }
    }

    if (!userDoc || !userDoc.exists) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    const userData = userDoc.data();

    // 1. If username is already the requested username, return immediately
    if (userData.username === cleanUsername) {
      return res.json({
        message: 'Your username is already set to @' + cleanUsername + '.',
        username: cleanUsername,
      });
    }

    // 2. Rate limit applies to all members (max 2 changes per rolling year)

    // 3. Rate Limit Check: VIP allowed to change username twice per rolling year (365 days)
    const MAX_CHANGES_PER_YEAR = 2;
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - ONE_YEAR_MS);

    const changeHistory = Array.isArray(userData.usernameChangeHistory) ? userData.usernameChangeHistory : [];
    const recentChanges = changeHistory.filter(item => item && item.changedAt && new Date(item.changedAt) > oneYearAgo);

    if (recentChanges.length >= MAX_CHANGES_PER_YEAR) {
      const sortedRecent = [...recentChanges].sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
      const oldestChangeTime = new Date(sortedRecent[0].changedAt).getTime();
      const nextEligibleDate = new Date(oldestChangeTime + ONE_YEAR_MS);
      const dateFormatted = nextEligibleDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      return res.status(403).json({
        message: `VIP members can change their username up to 2 times per year. You have used your 2 annual changes. Next change available on ${dateFormatted}.`,
        changesUsed: recentChanges.length,
        maxChangesPerYear: MAX_CHANGES_PER_YEAR,
        nextEligibleDate: nextEligibleDate.toISOString()
      });
    }

    // 4. Check if taken by another user
    const checkSnap = await db.collection('users').where('username', '==', cleanUsername).limit(1).get();
    if (!checkSnap.empty && checkSnap.docs[0].id !== userDoc.id) {
      return res.status(400).json({ message: 'Username @' + cleanUsername + ' is already taken. Please choose another.' });
    }

    // 5. Append new change record to history
    const newRecord = {
      changedAt: now.toISOString(),
      oldUsername: userData.username || '',
      newUsername: cleanUsername,
    };
    const updatedHistory = [...changeHistory, newRecord];

    await userDocRef.update({
      username: cleanUsername,
      usernameChangeHistory: updatedHistory,
      updatedAt: now.toISOString(),
    });

    // If developer profile exists, update developer username as well
    const devSnap = await db.collection('developers').where('userId', '==', userDoc.id).limit(1).get();
    if (!devSnap.empty) {
      await devSnap.docs[0].ref.update({
        username: cleanUsername,
        updatedAt: now.toISOString(),
      });
    }

    const remainingChanges = Math.max(0, MAX_CHANGES_PER_YEAR - (recentChanges.length + 1));

    res.json({
      message: `Username successfully updated to @${cleanUsername}.`,
      username: cleanUsername,
      changesUsed: recentChanges.length + 1,
      changesRemaining: remainingChanges,
      maxChangesPerYear: MAX_CHANGES_PER_YEAR,
    });
  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).json({ message: 'Failed to update username.' });
  }
};

// @desc    Get user's username status and annual change allowance
// @route   GET /api/auth/user/username/status
// @access  Private (Authenticated User)
const getUsernameStatus = async (req, res) => {
  const userId = req.user.uid;
  const cleanEmail = (req.user.email || '').trim().toLowerCase();

  try {
    let userDocRef = db.collection('users').doc(userId);
    let userDoc = await userDocRef.get();
    if (!userDoc.exists && cleanEmail) {
      const snap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
      if (!snap.empty) {
        userDocRef = snap.docs[0].ref;
        userDoc = snap.docs[0];
      }
    }

    if (!userDoc || !userDoc.exists) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    const userData = userDoc.data();
    const membership = await resolveUserMembership(userData, userDocRef);
    const isVip = membership.plan === 'pro' || membership.plan === 'elite';

    const MAX_CHANGES_PER_YEAR = 2;
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - ONE_YEAR_MS);

    const changeHistory = Array.isArray(userData.usernameChangeHistory) ? userData.usernameChangeHistory : [];
    const recentChanges = changeHistory.filter(item => item && item.changedAt && new Date(item.changedAt) > oneYearAgo);

    let nextEligibleDate = null;
    if (recentChanges.length >= MAX_CHANGES_PER_YEAR) {
      const sortedRecent = [...recentChanges].sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
      const oldestChangeTime = new Date(sortedRecent[0].changedAt).getTime();
      nextEligibleDate = new Date(oldestChangeTime + ONE_YEAR_MS).toISOString();
    }

    const changesRemaining = Math.max(0, MAX_CHANGES_PER_YEAR - recentChanges.length);

    res.json({
      username: userData.username || cleanEmail.split('@')[0],
      isVip,
      vipPlan: membership.plan,
      changesUsed: recentChanges.length,
      changesRemaining,
      maxChangesPerYear: MAX_CHANGES_PER_YEAR,
      canChange: isVip && changesRemaining > 0,
      nextEligibleDate,
    });
  } catch (error) {
    console.error('Error fetching username status:', error);
    res.status(500).json({ message: 'Failed to fetch username status.' });
  }
};

// @desc    Check if username is available
// @route   GET /api/auth/username/check/:username
// @access  Public
const checkUsernameAvailability = async (req, res) => {
  const { username } = req.params;
  const uv = validateUsernameFormat(username);
  if (!uv.valid) {
    return res.json({ available: false, message: uv.message });
  }
  try {
    const checkSnap = await db.collection('users').where('username', '==', uv.clean).limit(1).get();
    if (!checkSnap.empty) {
      return res.json({ available: false, message: 'Username @' + uv.clean + ' is already taken.' });
    }
    return res.json({ available: true, message: 'Username @' + uv.clean + ' is available!' });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ message: 'Failed to check username availability.' });
  }
};

// @desc    Update unified user profile (Display Name, Username, Bio)
// @route   PUT /api/auth/user/profile
// @access  Private (Authenticated User)
const updateFullProfile = async (req, res) => {
  const { displayName, username, bio, coverImage, banner, location } = req.body;
  const userId = req.user.uid;
  const cleanEmail = (req.user.email || '').trim().toLowerCase();

  try {
    let userDocRef = db.collection('users').doc(userId);
    let userDoc = await userDocRef.get();
    if (!userDoc.exists && cleanEmail) {
      const snap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
      if (!snap.empty) {
        userDocRef = snap.docs[0].ref;
        userDoc = snap.docs[0];
      }
    }

    if (!userDoc || !userDoc.exists) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    const userData = userDoc.data();
    const now = new Date().toISOString();
    const userUpdates = { updatedAt: now };

    // 1. Validate & Update Display Name
    if (displayName !== undefined) {
      const cleanDisplayName = String(displayName).trim().slice(0, 50);
      if (!cleanDisplayName) {
        return res.status(400).json({ message: 'Display name cannot be empty.' });
      }
      userUpdates.displayName = cleanDisplayName;
    }

    // 2. Validate & Update Bio
    if (bio !== undefined) {
      userUpdates.bio = String(bio).trim().slice(0, 500);
    }

    // 3. Validate & Update Username (if provided and different)
    let newUsername = userData.username;
    if (username !== undefined) {
      const rawUser = String(username).replace(/^@/, '').trim().toLowerCase();
      if (rawUser && rawUser !== (userData.username || '').toLowerCase()) {
        const uv = validateUsernameFormat(rawUser);
        if (!uv.valid) {
          return res.status(400).json({ message: uv.message });
        }
        const cleanUsername = uv.clean;

        // Rate limit: max 2 changes per rolling year
        const MAX_CHANGES_PER_YEAR = 2;
        const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
        const oneYearAgo = new Date(Date.now() - ONE_YEAR_MS);
        const changeHistory = Array.isArray(userData.usernameChangeHistory) ? userData.usernameChangeHistory : [];
        const recentChanges = changeHistory.filter(item => item && item.changedAt && new Date(item.changedAt) > oneYearAgo);

        if (recentChanges.length >= MAX_CHANGES_PER_YEAR) {
          return res.status(403).json({
            message: `Usernames can only be changed up to ${MAX_CHANGES_PER_YEAR} times per rolling year.`,
          });
        }

        // Uniqueness check
        const checkSnap = await db.collection('users').where('username', '==', cleanUsername).limit(1).get();
        if (!checkSnap.empty && checkSnap.docs[0].id !== userDoc.id) {
          return res.status(400).json({ message: `Username @${cleanUsername} is already taken. Please choose another.` });
        }

        const newRecord = {
          changedAt: now,
          oldUsername: userData.username || '',
          newUsername: cleanUsername,
        };
        userUpdates.username = cleanUsername;
        userUpdates.usernameChangeHistory = [...changeHistory, newRecord];
        newUsername = cleanUsername;
      }
    }

    // 4. Validate & Update Location (Allowed ONCE throughout account, default 'None')
    if (location !== undefined) {
      const rawLoc = String(location).trim();
      const existingLoc = (userData.location || '').trim();
      const hasSetExisting = existingLoc && existingLoc.toLowerCase() !== 'none';

      if (hasSetExisting) {
        // If already set, prohibit changing to a different location
        if (rawLoc && rawLoc.toLowerCase() !== existingLoc.toLowerCase()) {
          return res.status(403).json({
            message: 'Location has already been set and can only be updated once throughout your account.',
          });
        }
      } else if (rawLoc && rawLoc.toLowerCase() !== 'none') {
        userUpdates.location = rawLoc.slice(0, 80);
        userUpdates.locationLocked = true;
        userUpdates.locationSetAt = now;
      }
    }

    // 5. Validate & Update Cover / Background Image (Supports Google Drive Links & Direct URLs)
    const rawCover = coverImage !== undefined ? coverImage : banner;
    if (rawCover !== undefined) {
      const trimmed = String(rawCover || '').trim();
      if (!trimmed) {
        userUpdates.coverImage = '';
        userUpdates.banner = '';
      } else {
        try {
          const parsed = new URL(trimmed);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            return res.status(400).json({ message: 'Background image must be a valid HTTP or HTTPS URL.' });
          }
        } catch {
          return res.status(400).json({ message: 'Please provide a valid URL for the background image.' });
        }

        // Convert Google Drive view/share link to direct embed CDN link
        let optimizedUrl = trimmed;
        const driveMatch = trimmed.match(/(?:file\/d\/|id=|open\?id=)([a-zA-Z0-9_-]+)/);
        if (trimmed.includes('drive.google.com') && driveMatch && driveMatch[1]) {
          optimizedUrl = `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
        }
        userUpdates.coverImage = optimizedUrl;
        userUpdates.banner = optimizedUrl;
      }
    }

    // Apply updates to user document
    await userDocRef.update(userUpdates);

    // Sync to developers collection if this user has developer doc
    let devSnap = await db.collection('developers').where('userId', '==', userDoc.id).limit(1).get();
    if (devSnap.empty && cleanEmail) {
      devSnap = await db.collection('developers').where('email', '==', cleanEmail).limit(1).get();
    }
    if (!devSnap.empty) {
      const devUpdates = { updatedAt: now };
      if (userUpdates.displayName) devUpdates.displayName = userUpdates.displayName;
      if (userUpdates.bio !== undefined) devUpdates.bio = userUpdates.bio;
      if (userUpdates.username) devUpdates.username = userUpdates.username;
      if (userUpdates.location !== undefined) {
        devUpdates.location = userUpdates.location;
        devUpdates.locationLocked = true;
      }
      if (userUpdates.coverImage !== undefined) {
        devUpdates.coverImage = userUpdates.coverImage;
        devUpdates.banner = userUpdates.coverImage;
      }
      await devSnap.docs[0].ref.update(devUpdates);
    }

    // If username or displayName changed, sync to this developer's products
    if (userUpdates.username || userUpdates.displayName) {
      try {
        const prodSnap = await db.collection('products')
          .where('developerId', '==', userDoc.id)
          .get();
        const batch = db.batch();
        prodSnap.docs.forEach((pDoc) => {
          const pUpdate = {};
          if (userUpdates.username) pUpdate.developerUsername = userUpdates.username;
          if (userUpdates.displayName) pUpdate.developerName = userUpdates.displayName;
          batch.update(pDoc.ref, pUpdate);
        });
        if (prodSnap.size > 0) {
          await batch.commit();
        }
      } catch (pSyncErr) {
        console.warn('Sync products author error:', pSyncErr.message);
      }
    }

    // If username or displayName changed, update this author's past broadcast notifications
    if (userUpdates.username || userUpdates.displayName) {
      try {
        const notifSnap = await db.collection('notifications')
          .where('authorId', '==', userDoc.id)
          .get();
        let notifDocs = [...notifSnap.docs];

        if (cleanEmail) {
          const emailSnap = await db.collection('notifications')
            .where('authorEmail', '==', cleanEmail)
            .get();
          emailSnap.docs.forEach((doc) => {
            if (!notifDocs.some((d) => d.id === doc.id)) {
              notifDocs.push(doc);
            }
          });
        }

        if (notifDocs.length > 0) {
          const notifBatch = db.batch();
          notifDocs.forEach((nDoc) => {
            const nUpdate = {};
            if (userUpdates.displayName) nUpdate.authorName = userUpdates.displayName;
            if (userUpdates.username) nUpdate.authorUsername = userUpdates.username;
            notifBatch.update(nDoc.ref, nUpdate);
          });
          await notifBatch.commit();
        }
      } catch (nSyncErr) {
        console.warn('Sync notifications author error:', nSyncErr.message);
      }
    }

    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: userDoc.id,
        uid: userDoc.id,
        email: userData.email,
        displayName: userUpdates.displayName || userData.displayName,
        username: newUsername,
        bio: userUpdates.bio !== undefined ? userUpdates.bio : userData.bio || '',
        location: userUpdates.location !== undefined ? userUpdates.location : userData.location || 'None',
        locationLocked: Boolean(userUpdates.locationLocked || (userData.location && userData.location.trim().toLowerCase() !== 'none')),
        coverImage: userUpdates.coverImage !== undefined ? userUpdates.coverImage : userData.coverImage || userData.banner || '',
        banner: userUpdates.coverImage !== undefined ? userUpdates.coverImage : userData.coverImage || userData.banner || '',
        photoURL: userData.photoURL,
        role: userData.role,
        membership: userData.membership,
      },
    });
  } catch (error) {
    console.error('Update full profile error:', error);
    res.status(500).json({ message: 'Failed to update profile.' });
  }
};

// @desc    Upload profile background/cover image to ImageKit CDN
// @route   POST /api/auth/user/cover-image
// @access  Private
const uploadCoverImage = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ message: 'Unauthorized. Please sign in to upload cover image.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided. Please select an image from your computer.' });
    }

    // Double check MIME type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(req.file.mimetype.toLowerCase())) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(400).json({ message: 'Invalid file format. Only JPG, PNG, WEBP, and GIF images are allowed.' });
    }

    // Upload to ImageKit folder: 'banners'
    const cdnUrl = await uploadFileToCloudOrLocal(req.file, 'banners', req);

    if (!cdnUrl) {
      return res.status(500).json({ message: 'Failed to upload background image to ImageKit.' });
    }

    const now = new Date().toISOString();
    const cleanEmail = (authUser.email || '').trim().toLowerCase();

    // 1. Locate user document
    let userDocRef = null;
    if (authUser.uid) {
      const snap = await db.collection('users').doc(authUser.uid).get();
      if (snap.exists) userDocRef = snap.ref;
    }
    if (!userDocRef && cleanEmail) {
      const snap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
      if (!snap.empty) {
        userDocRef = snap.docs[0].ref;
      }
    }

    if (!userDocRef) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    // Update user document
    await userDocRef.update({
      coverImage: cdnUrl,
      banner: cdnUrl,
      updatedAt: now,
    });

    // 2. Sync to developers collection if this user has developer doc
    let devSnap = await db.collection('developers').where('userId', '==', userDocRef.id).limit(1).get();
    if (devSnap.empty && cleanEmail) {
      devSnap = await db.collection('developers').where('email', '==', cleanEmail).limit(1).get();
    }
    if (!devSnap.empty) {
      await devSnap.docs[0].ref.update({
        coverImage: cdnUrl,
        banner: cdnUrl,
        updatedAt: now,
      });
    }

    return res.json({
      message: 'Background image uploaded successfully to ImageKit CDN.',
      coverImage: cdnUrl,
      banner: cdnUrl,
    });
  } catch (error) {
    console.error('Upload cover image error:', error);
    return res.status(500).json({ message: 'Server error while uploading background image.' });
  }
};

// @desc    Remove profile background/cover image (reverts to default)
// @route   DELETE /api/auth/user/cover-image
// @access  Private
const removeCoverImage = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const now = new Date().toISOString();
    const cleanEmail = (authUser.email || '').trim().toLowerCase();

    let userDocRef = null;
    if (authUser.uid) {
      const snap = await db.collection('users').doc(authUser.uid).get();
      if (snap.exists) userDocRef = snap.ref;
    }
    if (!userDocRef && cleanEmail) {
      const snap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
      if (!snap.empty) {
        userDocRef = snap.docs[0].ref;
      }
    }

    if (!userDocRef) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    await userDocRef.update({
      coverImage: '',
      banner: '',
      updatedAt: now,
    });

    let devSnap = await db.collection('developers').where('userId', '==', userDocRef.id).limit(1).get();
    if (devSnap.empty && cleanEmail) {
      devSnap = await db.collection('developers').where('email', '==', cleanEmail).limit(1).get();
    }
    if (!devSnap.empty) {
      await devSnap.docs[0].ref.update({
        coverImage: '',
        banner: '',
        updatedAt: now,
      });
    }

    return res.json({
      message: 'Background image removed successfully.',
      coverImage: '',
      banner: '',
    });
  } catch (error) {
    console.error('Remove cover image error:', error);
    return res.status(500).json({ message: 'Server error while removing background image.' });
  }
};

module.exports = {
  loginAdmin,
  setupAdmin,
  registerUser,
  loginUser,
  googleOAuthLogin,
  getAllUsers,
  banUser,
  unbanUser,
  getUserStatus,
  validateUsernameFormat,
  generateUniqueUsername,



  updateUsername,
  getUsernameStatus,
  checkUsernameAvailability,
  updateFullProfile,
  uploadCoverImage,
  removeCoverImage,
};
const { db, authAdmin } = require('../config/firebase');
const { getJwtSecret } = require('../config/jwtConfig');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
          console.warn('⚠️ [VIP Expiry] Error removing expired badge in Firestore:', err.message);
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

// @desc    Register new end-user
// @route   POST /api/auth/user/register
// @access  Public
const registerUser = async (req, res) => {
  const { email, password, displayName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    
    // Check if user already exists
    const usersRef = db.collection('users').where('email', '==', cleanEmail);
    const snapshot = await usersRef.get();

    if (!snapshot.empty) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const photoURL = `https://unavatar.io/${encodeURIComponent(cleanEmail)}?fallback=https%3A%2F%2Fapi.dicebear.com%2F7.x%2Finitials%2Fsvg%3Fseed%3D${encodeURIComponent(cleanEmail)}`;

    const newUserRef = await db.collection('users').add({
      email: cleanEmail,
      password: hashedPassword,
      displayName: displayName ? displayName.trim() : cleanEmail.split('@')[0],
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
      displayName: displayName ? displayName.trim() : cleanEmail.split('@')[0],
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

    const membership = await resolveUserMembership(userData, userDoc.ref);

    const userProfile = {
      uid: userDoc.id,
      email: userData.email,
      displayName: userData.displayName || userData.email.split('@')[0],
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
      // Create new user account via Google
      const newUserRef = await db.collection('users').add({
        email: cleanEmail,
        displayName: verifiedName || cleanEmail.split('@')[0],
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
        displayName: verifiedName || cleanEmail.split('@')[0],
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

      const membership = await resolveUserMembership(existingData, userDoc.ref);

      finalProfile = {
        uid,
        email: cleanEmail,
        displayName: verifiedName || existingData.displayName || cleanEmail.split('@')[0],
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
};


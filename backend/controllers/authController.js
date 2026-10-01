const { db } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (uid, role = 'user') => {
  return jwt.sign({ uid, role }, process.env.JWT_SECRET || 'upper_store_jwt_secret_key_2026', { expiresIn: '7d' });
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

// @desc    One-time admin setup
// @route   POST /api/auth/setup
// @access  Public
const setupAdmin = async (req, res) => {
  const { username, password } = req.body;
  try {
    const snapshot = await db.collection('admins').where('username', '==', username).get();
    if (!snapshot.empty) {
      return res.status(400).json({ message: 'Admin already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await db.collection('admins').add({
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ message: 'Admin created successfully.' });
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
      createdAt: new Date().toISOString(),
    });

    const userProfile = {
      uid: newUserRef.id,
      email: cleanEmail,
      displayName: displayName ? displayName.trim() : cleanEmail.split('@')[0],
      photoURL,
      provider: 'email',
      role: 'user',
    };

    res.status(201).json({
      message: 'Account created successfully.',
      user: userProfile,
      token: generateToken(newUserRef.id, 'user'),
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

    const userProfile = {
      uid: userDoc.id,
      email: userData.email,
      displayName: userData.displayName || userData.email.split('@')[0],
      provider: userData.provider || 'email',
      photoURL,
      isBanned: Boolean(userData.isBanned),
      bannedAt: userData.bannedAt || null,
      lastAppealedAt: userData.lastAppealedAt || null,
      role: 'user',
    };

    res.json({
      message: 'Logged in successfully.',
      user: userProfile,
      token: generateToken(userDoc.id, 'user'),
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
  const { email, displayName, photoURL, googleId } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required for Google OAuth.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const usersRef = db.collection('users').where('email', '==', cleanEmail);
    const snapshot = await usersRef.get();

    let uid;
    let finalProfile;
    const computedPhoto = photoURL || `https://unavatar.io/${encodeURIComponent(cleanEmail)}?fallback=https%3A%2F%2Fapi.dicebear.com%2F7.x%2Finitials%2Fsvg%3Fseed%3D${encodeURIComponent(cleanEmail)}`;

    if (snapshot.empty) {
      // Create new user account via Google
      const newUserRef = await db.collection('users').add({
        email: cleanEmail,
        displayName: displayName || cleanEmail.split('@')[0],
        photoURL: computedPhoto,
        googleId: googleId || null,
        provider: 'google',
        isBanned: false,
        createdAt: new Date().toISOString(),
      });
      uid = newUserRef.id;
      finalProfile = {
        uid,
        email: cleanEmail,
        displayName: displayName || cleanEmail.split('@')[0],
        photoURL: computedPhoto,
        provider: 'google',
        isBanned: false,
        role: 'user',
      };
    } else {
      const userDoc = snapshot.docs[0];
      uid = userDoc.id;
      const existingData = userDoc.data();

      const activePhoto = photoURL || existingData.photoURL || computedPhoto;

      // Update avatar or display name if missing
      await userDoc.ref.update({
        displayName: displayName || existingData.displayName || cleanEmail.split('@')[0],
        photoURL: activePhoto,
        lastLogin: new Date().toISOString(),
      });

      finalProfile = {
        uid,
        email: cleanEmail,
        displayName: displayName || existingData.displayName || cleanEmail.split('@')[0],
        photoURL: activePhoto,
        provider: existingData.provider || 'google',
        isBanned: Boolean(existingData.isBanned),
        bannedAt: existingData.bannedAt || null,
        lastAppealedAt: existingData.lastAppealedAt || null,
        role: 'user',
      };
    }

    res.json({
      message: 'Google Sign-In successful.',
      user: finalProfile,
      token: generateToken(uid, 'user'),
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
    const users = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
      isBanned: Boolean(doc.data().isBanned),
    }));

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

// @desc    Get real-time user status (check if banned)
// @route   GET /api/auth/user/status/:email
// @access  Public
const getUserStatus = async (req, res) => {
  const { email } = req.params;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const snapshot = await db.collection('users').where('email', '==', cleanEmail).get();

    if (snapshot.empty) {
      return res.json({ isBanned: false });
    }

    const userData = snapshot.docs[0].data();
    res.json({
      uid: snapshot.docs[0].id,
      email: userData.email,
      isBanned: Boolean(userData.isBanned),
      bannedAt: userData.bannedAt || null,
      lastAppealedAt: userData.lastAppealedAt || null,
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


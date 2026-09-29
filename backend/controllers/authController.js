const { db } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (uid) => {
  return jwt.sign({ uid }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

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
      token: generateToken(adminDoc.id),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// @desc    One-time admin setup
// @route   POST /api/auth/setup
// @access  Public (run once, then disable)
const setupAdmin = async (req, res) => {
  const { username, password } = req.body;
  try {
    // Check if admin already exists
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

module.exports = { loginAdmin, setupAdmin };

const { db } = require('../config/firebase');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwtConfig');

// @desc    Get broadcast and user notifications (privacy-scoped)
// @route   GET /api/notifications
// @access  Public / Authenticated
const getNotifications = async (req, res) => {
  try {
    let currentUser = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        currentUser = jwt.verify(token, getJwtSecret());
      } catch (tokenErr) {
        // Ignored; treated as unauthenticated public visitor
      }
    }

    const snapshot = await db.collection('notifications').get();
    let notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter by privacy boundary
    if (currentUser && currentUser.role === 'admin') {
      // Admin sees all broadcast & user notification records
    } else if (currentUser && currentUser.email) {
      // Authenticated user: sees general broadcast notices + their own targeted notifications
      const userEmail = currentUser.email.trim().toLowerCase();
      notifications = notifications.filter((n) => {
        if (!n.targetEmail) return true;
        return n.targetEmail.trim().toLowerCase() === userEmail;
      });
    } else {
      // Unauthenticated public: only general broadcasts without targetEmail
      notifications = notifications.filter((n) => {
        return !n.targetEmail;
      });
    }

    // Sort newest first
    notifications.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
};

// @desc    Create a new broadcast notification
// @route   POST /api/notifications
// @access  Private (Admin)
const createNotification = async (req, res) => {
  const { title, message, category, link } = req.body;

  if (!title || !message) {
    return res.status(400).json({ message: 'Title and message are required.' });
  }

  try {
    const authorType = req.developer ? 'developer' : 'admin';
    const authorId = req.developer ? req.user.uid : null;
    const authorEmail = req.developer ? (req.developer.email || req.user.email || '').toLowerCase() : null;
    const authorName = req.developer
      ? (req.developer.displayName || req.user.displayName || req.user.email.split('@')[0])
      : 'Upper Store Official';
    const passedAvatar = req.body.authorAvatar && typeof req.body.authorAvatar === 'string' ? req.body.authorAvatar.trim() : null;
    const authorAvatar = req.developer
      ? (passedAvatar || req.developer.avatar || req.user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.user.email || 'dev')}`)
      : (passedAvatar || req.user?.photoURL || null);
    const authorTier = req.developer ? (req.developer.vipPlan || req.membership?.plan || 'pro') : 'admin';

    const newDoc = {
      authorType,
      authorId,
      authorEmail,
      authorName,
      authorAvatar,
      authorTier,
      title: title.trim(),
      message: message.trim(),
      category: category || 'Update', // 'Update' | 'Release' | 'Notice' | 'Announcement'
      link: link ? link.trim() : '',
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('notifications').add(newDoc);

    res.status(201).json({
      message: 'Broadcast notification sent successfully.',
      notification: {
        id: docRef.id,
        ...newDoc,
      },
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Failed to send notification.' });
  }
};

// @desc    Delete a broadcast notification
// @route   DELETE /api/notifications/:id
// @access  Private (Admin)
const deleteNotification = async (req, res) => {
  const { id } = req.params;

  try {
    const docRef = db.collection('notifications').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    const nData = doc.data();
    if (!req.isAdmin) {
      const currentEmail = (req.user?.email || '').toLowerCase();
      const currentUid = req.user?.uid;
      const isOwner =
        (nData.authorEmail && nData.authorEmail.toLowerCase() === currentEmail) ||
        (nData.authorId && nData.authorId === currentUid);

      if (!isOwner) {
        return res.status(403).json({ message: 'Forbidden: You can only delete broadcast notifications you sent.' });
      }
    }

    await docRef.delete();

    res.json({ message: 'Notification deleted successfully.' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Failed to delete notification.' });
  }
};

module.exports = {
  getNotifications,
  createNotification,
  deleteNotification,
};

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
      // Authenticated user: sees broadcast notices + their own targeted notifications
      const userEmail = currentUser.email.trim().toLowerCase();
      notifications = notifications.filter((n) => {
        if (!n.targetEmail) return true;
        return n.targetEmail.trim().toLowerCase() === userEmail;
      });
    } else {
      // Unauthenticated public: only general broadcasts without targetEmail and non-security category
      notifications = notifications.filter((n) => {
        return !n.targetEmail && n.category !== 'Security';
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
    const newDoc = {
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

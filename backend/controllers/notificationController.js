const { db } = require('../config/firebase');

// @desc    Get all broadcast notifications
// @route   GET /api/notifications
// @access  Public
const getNotifications = async (req, res) => {
  try {
    const snapshot = await db.collection('notifications').get();
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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

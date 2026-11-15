const { db } = require('../config/firebase');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwtConfig');
const {
  cleanExpiredNotifications,
  maybeTriggerPassiveCleanup,
  getLastCleanupStatus,
} = require('../services/notificationCleanupService');

// @desc    Get broadcast and user notifications (privacy-scoped)
// @route   GET /api/notifications
// @access  Public / Authenticated
const getNotifications = async (req, res) => {
  try {
    // Non-blocking passive cleanup check (triggers if >6h since last cleanup)
    maybeTriggerPassiveCleanup({ retentionDays: 15 });

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

    // Strict privacy boundary enforcement:
    // A follow notification or targeted notification MUST ONLY be visible to the exact targeted user.
    const isAdminBroadcastScope = currentUser && currentUser.role === 'admin' && req.query.scope === 'admin';

    if (isAdminBroadcastScope) {
      // Admin managing broadcast announcements in Admin Dashboard:
      // Return ONLY untargeted site-wide broadcast announcements. NEVER leak private follow notifications!
      notifications = notifications.filter((n) => {
        const isPrivate = Boolean(n.type === 'follow' || n.category === 'Follower' || n.targetEmail || n.targetUserId || n.targetUsername);
        return !isPrivate;
      });
    } else if (currentUser) {
      // Authenticated user (personal notification feed in Navbar / profile):
      let userEmail = (currentUser.email || '').trim().toLowerCase();
      const userId = currentUser.uid || currentUser.id;
      let userUsername = (currentUser.username || '').trim().toLowerCase();

      // Ensure userUsername and userEmail are resolved even if missing from token payload
      if (userId && (!userUsername || !userEmail)) {
        try {
          const userSnap = await db.collection('users').doc(userId).get();
          if (userSnap.exists) {
            const uData = userSnap.data();
            if (!userUsername && uData.username) userUsername = uData.username.trim().toLowerCase();
            if (!userEmail && uData.email) userEmail = uData.email.trim().toLowerCase();
          }
          if (!userUsername) {
            const dSnap = await db.collection('developers').where('userId', '==', userId).limit(1).get();
            if (!dSnap.empty && dSnap.docs[0].data().username) {
              userUsername = dSnap.docs[0].data().username.trim().toLowerCase();
            }
          }
        } catch (_) {}
      }

      const emailPrefix = userEmail ? userEmail.split('@')[0] : '';
      const isOfficialAccount = currentUser.role === 'admin' || userEmail === 'upper.official.in@gmail.com' || userId === 'GOhjkTTW9ZPqPS9I7Oa1';

      notifications = notifications.filter((n) => {
        const isFollow = n.type === 'follow' || n.category === 'Follower';
        const isTargeted = Boolean(n.targetEmail || n.targetUserId || n.targetUsername || isFollow);

        if (isTargeted) {
          // STRICT PRIVATE TARGET CHECK: ONLY THE TARGETED USER CAN SEE THIS
          const targetUserId = n.targetUserId ? String(n.targetUserId) : null;
          const targetEmail = n.targetEmail ? String(n.targetEmail).trim().toLowerCase() : null;
          const targetUsername = n.targetUsername ? String(n.targetUsername).trim().toLowerCase() : null;

          if (targetUserId && userId && targetUserId === String(userId)) return true;
          if (targetEmail && userEmail && targetEmail === userEmail) return true;
          if (targetUsername && userUsername && targetUsername === userUsername) return true;
          if (targetUsername && emailPrefix && targetUsername === emailPrefix) return true;

          // Official store administrator check (only for official upperstore targets)
          if (isOfficialAccount && targetUsername && ['upperstore', 'upper-store', 'upper_store', 'upperofficial'].includes(targetUsername)) {
            return true;
          }

          // Strictly hidden from everyone else
          return false;
        }

        // Untargeted site-wide broadcast announcements are visible
        return true;
      });
    } else {
      // Unauthenticated public visitor:
      // STRICTLY ONLY untargeted general broadcasts. Absolutely NO follow or targeted notifications!
      notifications = notifications.filter((n) => {
        const isPrivate = Boolean(n.type === 'follow' || n.category === 'Follower' || n.targetEmail || n.targetUserId || n.targetUsername);
        return !isPrivate;
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
// @access  Private (Admin / Publisher)
const createNotification = async (req, res) => {
  const { title, message, category, link } = req.body;

  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  if (!cleanTitle || cleanTitle.length < 3 || cleanTitle.length > 120) {
    return res.status(400).json({ message: 'Title must be between 3 and 120 characters.' });
  }

  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  if (!cleanMessage || cleanMessage.length < 5 || cleanMessage.length > 1000) {
    return res.status(400).json({ message: 'Message must be between 5 and 1000 characters.' });
  }

  const validCategories = ['Update', 'Release', 'Notice', 'Announcement', 'Security'];
  const cleanCategory = validCategories.find(c => c.toLowerCase() === String(category || '').trim().toLowerCase()) || 'Update';

  let cleanLink = '';
  if (link && typeof link === 'string' && link.trim()) {
    const rawLink = link.trim();
    if (rawLink.length > 500) {
      return res.status(400).json({ message: 'Link URL cannot exceed 500 characters.' });
    }
    if (!/^https?:\/\//i.test(rawLink)) {
      return res.status(400).json({ message: 'Link must be a valid HTTP or HTTPS URL.' });
    }
    cleanLink = rawLink;
  }

  try {
    const authorType = req.developer ? 'developer' : 'admin';
    const authorId = req.developer ? req.user.uid : null;
    const authorEmail = req.developer ? (req.developer.email || req.user.email || '').toLowerCase() : null;
    const authorName = req.developer
      ? (req.developer.displayName || req.user.displayName || req.user.email.split('@')[0])
      : 'Upper Store Official';
    const authorUsername = req.developer
      ? (req.developer.username || req.user.username || (req.user.email ? req.user.email.split('@')[0] : 'developer'))
      : 'upperstore';
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
      authorUsername,
      authorAvatar,
      authorTier,
      title: cleanTitle,
      message: cleanMessage,
      category: cleanCategory,
      link: cleanLink,
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
// @access  Private (Admin / Publisher)
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

// @desc    Clean up notifications older than retention days (default 15 days)
// @route   POST /api/notifications/cleanup or DELETE /api/notifications/cleanup
// @access  Private (Admin)
const cleanupNotifications = async (req, res) => {
  try {
    const retentionDays = Number(req.body?.days || req.query?.days) || 15;
    const dryRun = req.body?.dryRun === true || req.query?.dryRun === 'true';

    const result = await cleanExpiredNotifications({ retentionDays, dryRun });

    res.json({
      message: dryRun
        ? `Identified ${result.expiredCount} notification(s) older than ${retentionDays} days.`
        : `Cleaned up ${result.deletedCount} notification(s) older than ${retentionDays} days.`,
      ...result,
    });
  } catch (error) {
    console.error('Error cleaning notifications:', error);
    res.status(500).json({ message: 'Failed to clean up expired notifications.', error: error.message });
  }
};

// @desc    Get status of notification cleanup job
// @route   GET /api/notifications/cleanup-status
// @access  Private (Admin)
const getCleanupStatus = async (req, res) => {
  try {
    const status = getLastCleanupStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get cleanup status.' });
  }
};

module.exports = {
  getNotifications,
  createNotification,
  deleteNotification,
  cleanupNotifications,
  getCleanupStatus,
};

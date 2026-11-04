const { db } = require('../config/firebase');

/**
 * Notification Retention Cleanup Service
 * Automatically prunes notifications older than a specified retention window (default 15 days).
 */

let cleanupTimer = null;
let isCleanupInProgress = false;
let lastCleanupRun = null;

/**
 * Parse document creation timestamp safely across string, Firestore Timestamp, or createTime.
 * @param {Object} doc - Firestore document snapshot
 * @returns {number|null} Milliseconds timestamp or null if unparseable
 */
const parseDocTimestamp = (doc) => {
  const data = doc.data() || {};

  if (data.createdAt) {
    if (typeof data.createdAt.toDate === 'function') {
      return data.createdAt.toDate().getTime();
    }
    if (typeof data.createdAt === 'number') {
      return data.createdAt;
    }
    const parsed = new Date(data.createdAt).getTime();
    if (!isNaN(parsed)) return parsed;
  }

  // Fallback to Firestore document system metadata if available
  if (doc.createTime && typeof doc.createTime.toDate === 'function') {
    return doc.createTime.toDate().getTime();
  }

  return null;
};

/**
 * Execute cleanup of expired notifications.
 * @param {Object} options
 * @param {number} options.retentionDays - Days to retain notifications (default 15)
 * @param {boolean} options.dryRun - If true, identify without deleting
 * @returns {Promise<Object>} Cleanup execution summary
 */
const cleanExpiredNotifications = async ({ retentionDays = 15, dryRun = false } = {}) => {
  if (isCleanupInProgress) {
    console.log('[INFO] [Notification Cleanup] Cleanup task already in progress. Skipping duplicate run.');
    return { skipped: true, reason: 'in_progress' };
  }

  isCleanupInProgress = true;
  const startTime = Date.now();
  const retentionMs = Math.max(1, retentionDays) * 24 * 60 * 60 * 1000;
  const cutoffMs = startTime - retentionMs;
  const cutoffIso = new Date(cutoffMs).toISOString();

  try {
    const snapshot = await db.collection('notifications').get();
    const expiredDocRefs = [];
    const expiredDetails = [];

    snapshot.forEach((doc) => {
      const docTime = parseDocTimestamp(doc);
      if (docTime !== null && docTime < cutoffMs) {
        expiredDocRefs.push(doc.ref);
        const data = doc.data() || {};
        expiredDetails.push({
          id: doc.id,
          title: data.title || 'Untitled',
          createdAt: data.createdAt || doc.createTime?.toDate?.()?.toISOString?.() || 'Unknown',
        });
      }
    });

    let deletedCount = 0;

    if (!dryRun && expiredDocRefs.length > 0) {
      // Chunk deletions into batches (max 400 docs per batch to stay under Firestore's 500 limit)
      const BATCH_SIZE = 400;
      for (let i = 0; i < expiredDocRefs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = expiredDocRefs.slice(i, i + BATCH_SIZE);
        chunk.forEach((ref) => batch.delete(ref));
        await batch.commit();
        deletedCount += chunk.length;
      }
    } else if (dryRun) {
      deletedCount = expiredDocRefs.length;
    }

    const durationMs = Date.now() - startTime;
    lastCleanupRun = {
      timestamp: new Date().toISOString(),
      retentionDays,
      cutoffIso,
      scannedCount: snapshot.size,
      expiredCount: expiredDocRefs.length,
      deletedCount,
      durationMs,
      dryRun,
    };

    console.log(
      `[INFO] [Notification Cleanup] Scanned ${snapshot.size} notifications. ` +
      `${dryRun ? 'Identified' : 'Deleted'} ${deletedCount} expired notification(s) older than ${retentionDays} days (cutoff: ${cutoffIso}) in ${durationMs}ms.`
    );

    return {
      success: true,
      ...lastCleanupRun,
      expiredDetails,
    };
  } catch (error) {
    console.error('[ERROR] [Notification Cleanup] Failed to run notification cleanup:', error.message);
    lastCleanupRun = {
      timestamp: new Date().toISOString(),
      error: error.message,
    };
    throw error;
  } finally {
    isCleanupInProgress = false;
  }
};

/**
 * Passive check to trigger cleanup during read operations if overdue.
 * Safe for serverless environments where persistent intervals may freeze.
 * @param {Object} options
 */
const maybeTriggerPassiveCleanup = ({ retentionDays = 15, minIntervalMs = 6 * 60 * 60 * 1000 } = {}) => {
  const lastTime = lastCleanupRun && lastCleanupRun.timestamp ? new Date(lastCleanupRun.timestamp).getTime() : 0;
  const now = Date.now();

  if (now - lastTime >= minIntervalMs && !isCleanupInProgress) {
    // Run asynchronously in background without blocking caller
    cleanExpiredNotifications({ retentionDays }).catch((err) => {
      console.warn('[WARN] [Notification Cleanup] Passive cleanup background error:', err.message);
    });
  }
};

/**
 * Start recurring background cleanup timer.
 * @param {Object} options
 * @param {number} options.intervalMs - Milliseconds between cleanup runs (default 12 hours)
 * @param {number} options.retentionDays - Retention window in days (default 15)
 * @param {number} options.initialDelayMs - Initial delay after server boot before first run (default 5 seconds)
 */
const startNotificationCleanupJob = ({
  intervalMs = 12 * 60 * 60 * 1000, // 12 hours
  retentionDays = 15,
  initialDelayMs = 5000,
} = {}) => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }

  // Initial run after short delay to let server boot cleanly
  const initialTimeout = setTimeout(() => {
    cleanExpiredNotifications({ retentionDays }).catch((err) => {
      console.warn('[WARN] [Notification Cleanup] Initial startup run failed:', err.message);
    });
  }, initialDelayMs);
  initialTimeout.unref();

  // Scheduled recurring run
  cleanupTimer = setInterval(() => {
    cleanExpiredNotifications({ retentionDays }).catch((err) => {
      console.warn('[WARN] [Notification Cleanup] Scheduled run failed:', err.message);
    });
  }, intervalMs);
  cleanupTimer.unref();

  console.log(`[INFO] [Notification Cleanup] Background job scheduled. Runs every ${Math.round(intervalMs / (60 * 60 * 1000))}h with ${retentionDays}-day retention.`);
};

/**
 * Stop background cleanup timer.
 */
const stopNotificationCleanupJob = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.log('[INFO] [Notification Cleanup] Background job stopped.');
  }
};

/**
 * Get status and telemetry of last cleanup run.
 */
const getLastCleanupStatus = () => {
  return {
    isCleanupInProgress,
    lastCleanupRun,
  };
};

module.exports = {
  cleanExpiredNotifications,
  maybeTriggerPassiveCleanup,
  startNotificationCleanupJob,
  stopNotificationCleanupJob,
  getLastCleanupStatus,
};

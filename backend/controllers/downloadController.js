const { db } = require('../config/firebase');

// @desc    Record a new download (saves to download_history & increments product downloadCount in DB)
// @route   POST /api/downloads/record
// @access  Public
const recordDownload = async (req, res) => {
  try {
    const { userEmail, productId, title, category, version, image, apkFile, price } = req.body;

    let cleanEmail = '';
    if (userEmail) {
      cleanEmail = userEmail.trim().toLowerCase();
      
      // Check ban status if email provided
      const userSnapshot = await db.collection('users').where('email', '==', cleanEmail).get();
      if (!userSnapshot.empty && userSnapshot.docs[0].data().isBanned) {
        return res.status(403).json({
          message: 'Your account has been banned. Software downloads are restricted.',
        });
      }
    }

    const downloadRecord = {
      downloadId: `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userEmail: cleanEmail || 'anonymous',
      productId: String(productId || 'custom'),
      title: title || 'Downloaded Item',
      category: category || 'Digital Asset',
      version: version || '1.0.0',
      image: image || '',
      apkFile: apkFile || '#',
      price: price || 'Free',
      downloadedAt: new Date().toISOString(),
    };

    // 1. Save download history record in Firestore
    const historyRef = await db.collection('download_history').add(downloadRecord);
    downloadRecord.id = historyRef.id;

    // 2. Increment total product downloadCount in Firestore database
    let updatedCount = 1;
    if (productId && productId !== 'custom') {
      const pRef = db.collection('products').doc(String(productId));
      const pDoc = await pRef.get();
      if (pDoc.exists) {
        const curCount = Number(pDoc.data().downloadCount) || 0;
        const historySnap = await db.collection('download_history').where('productId', '==', String(productId)).get();
        const historyCount = historySnap.size;
        updatedCount = Math.max(curCount + 1, historyCount);
        await pRef.update({ downloadCount: updatedCount });
      }
    }

    res.status(201).json({
      success: true,
      record: downloadRecord,
      newDownloadCount: updatedCount,
    });
  } catch (error) {
    console.error('Error recording download:', error);
    res.status(500).json({ message: 'Error recording download in database.' });
  }
};

// @desc    Get user download history from database
// @route   GET /api/downloads/history/:userEmail
// @access  Public
const getUserDownloadHistory = async (req, res) => {
  try {
    const { userEmail } = req.params;
    if (!userEmail) {
      return res.json([]);
    }

    const cleanEmail = decodeURIComponent(userEmail).trim().toLowerCase();
    const snapshot = await db
      .collection('download_history')
      .where('userEmail', '==', cleanEmail)
      .get();

    const history = [];
    snapshot.forEach((doc) => {
      history.push({ id: doc.id, ...doc.data() });
    });

    // Sort descending by downloadedAt
    history.sort((a, b) => new Date(b.downloadedAt || 0) - new Date(a.downloadedAt || 0));

    res.json(history);
  } catch (error) {
    console.error('Error fetching user download history from DB:', error);
    res.status(500).json({ message: 'Error fetching user download history.' });
  }
};

// @desc    Clear user download history from database
// @route   DELETE /api/downloads/history/:userEmail
// @access  Public
const clearUserDownloadHistory = async (req, res) => {
  try {
    const { userEmail } = req.params;
    if (!userEmail) {
      return res.status(400).json({ message: 'User email is required.' });
    }

    const cleanEmail = decodeURIComponent(userEmail).trim().toLowerCase();
    const snapshot = await db
      .collection('download_history')
      .where('userEmail', '==', cleanEmail)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    res.json({ success: true, message: 'Download history cleared from database.' });
  } catch (error) {
    console.error('Error clearing user download history in DB:', error);
    res.status(500).json({ message: 'Error clearing user download history.' });
  }
};

// @desc    Get all user download history stats (for Admin dashboard)
// @route   GET /api/downloads/admin/all
// @access  Public
const getAllDownloadHistoryAdmin = async (req, res) => {
  try {
    const snapshot = await db.collection('download_history').get();
    const allRecords = [];
    snapshot.forEach((doc) => {
      allRecords.push({ id: doc.id, ...doc.data() });
    });

    allRecords.sort((a, b) => new Date(b.downloadedAt || 0) - new Date(a.downloadedAt || 0));

    res.json(allRecords);
  } catch (error) {
    console.error('Error fetching all download history for admin:', error);
    res.status(500).json({ message: 'Error fetching download history stats.' });
  }
};

module.exports = {
  recordDownload,
  getUserDownloadHistory,
  clearUserDownloadHistory,
  getAllDownloadHistoryAdmin,
};

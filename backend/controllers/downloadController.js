const { Readable } = require('stream');
const { db, FieldValue } = require('../config/firebase');
const cacheService = require('../services/cacheService');

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

    // 2. Atomically increment total product downloadCount in Firestore database (Zero history scanning)
    let updatedCount = 1;
    if (productId && productId !== 'custom') {
      const pRef = db.collection('products').doc(String(productId));
      try {
        await pRef.update({
          downloadCount: FieldValue.increment(1),
        });
      } catch (incErr) {
        // Self-heal if document is missing initial count field
        await pRef.set({ downloadCount: 1 }, { merge: true });
      }

      const pDoc = await pRef.get();
      if (pDoc.exists) {
        updatedCount = Number(pDoc.data().downloadCount) || 1;
      }

      // Invalidate products cache so catalog immediately reflects updated count
      cacheService.invalidate('products_list');
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
// @access  Protected (User or Admin)
const getUserDownloadHistory = async (req, res) => {
  try {
    const { userEmail } = req.params;
    if (!userEmail) {
      return res.json([]);
    }

    const cleanEmail = decodeURIComponent(userEmail).trim().toLowerCase();

    // IDOR Protection: Admin OR authenticated owner of this email
    if (req.user?.role !== 'admin') {
      let requesterEmail = req.user?.email;
      if (!requesterEmail && req.user?.uid) {
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        if (userDoc.exists) {
          requesterEmail = userDoc.data().email;
        }
      }

      if (!requesterEmail || requesterEmail.trim().toLowerCase() !== cleanEmail) {
        return res.status(403).json({
          message: 'Forbidden: You are not authorized to view another user’s download history.',
        });
      }
    }

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
// @access  Protected (User or Admin)
const clearUserDownloadHistory = async (req, res) => {
  try {
    const { userEmail } = req.params;
    if (!userEmail) {
      return res.status(400).json({ message: 'User email is required.' });
    }

    const cleanEmail = decodeURIComponent(userEmail).trim().toLowerCase();

    // IDOR Protection: Admin OR authenticated owner of this email
    if (req.user?.role !== 'admin') {
      let requesterEmail = req.user?.email;
      if (!requesterEmail && req.user?.uid) {
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        if (userDoc.exists) {
          requesterEmail = userDoc.data().email;
        }
      }

      if (!requesterEmail || requesterEmail.trim().toLowerCase() !== cleanEmail) {
        return res.status(403).json({
          message: 'Forbidden: You are not authorized to clear another user’s download history.',
        });
      }
    }

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
// @access  Protected (Admin only)
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


// @desc    Secure proxy stream for binary downloads (hides raw GitHub releases from user)
// @route   GET /api/downloads/proxy or GET /api/download
// @access  Public
const proxyDownload = async (req, res) => {
  try {
    const { id, file, name } = req.query;
    let targetUrl = '';
    let customName = name || '';

    // 1. Resolve product from database
    if (id) {
      try {
        const prodDoc = await db.collection('products').doc(String(id)).get();
        if (prodDoc.exists) {
          const pData = prodDoc.data();
          targetUrl = pData.apkFile;
          if (!customName && pData.title) {
            const rawExt = targetUrl ? targetUrl.split('?')[0].toLowerCase() : '';
            const ext = rawExt.endsWith('.exe') ? '.exe' : (rawExt.endsWith('.zip') ? '.zip' : '.apk');
            customName = `${pData.title.replace(/[^a-zA-Z0-9_-]/g, '_')}${ext}`;
          }
        }
      } catch (dbErr) {
        console.error('Error fetching product for download proxy:', dbErr);
      }
    }

    // 2. Fallback to base64 obfuscated file parameter
    if (!targetUrl && file) {
      try {
        let b64 = file.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        targetUrl = Buffer.from(b64, 'base64').toString('utf8');
      } catch (e) {
        targetUrl = decodeURIComponent(file);
      }
    }

    if (!targetUrl || targetUrl === '#' || !targetUrl.startsWith('http')) {
      return res.status(404).json({ message: 'Valid download target not found.' });
    }

    const cleanTarget = targetUrl.split('?')[0].toLowerCase();
    const isWebPage = cleanTarget.includes('/releases/tag/') || 
                      cleanTarget.endsWith('/releases') || 
                      cleanTarget.includes('/tree/') || 
                      cleanTarget.includes('/blob/') ||
                      (!cleanTarget.includes('/releases/download/') && !/\.(apk|exe|zip|dmg|tar\.gz|msi|pkg|bin|pdf)$/i.test(cleanTarget));

    if (req.query.mode === 'redirect' || isWebPage) {
      return res.redirect(targetUrl);
    }

    // 3. Fetch from upstream GitHub release with redirect: follow
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'UpperStore-Proxy/1.0',
        'Accept': '*/*'
      },
      redirect: 'follow'
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send(`Upstream download failed with status ${upstreamRes.status}`);
    }

    const upContentType = upstreamRes.headers.get('content-type') || '';
    if (upContentType.includes('text/html')) {
      return res.redirect(targetUrl);
    }

    // 4. Derive clean filename & extension
    let finalFileName = customName;
    if (!finalFileName) {
      try {
        const pathname = new URL(targetUrl).pathname;
        finalFileName = pathname.substring(pathname.lastIndexOf('/') + 1) || 'package.apk';
      } catch (e) {
        finalFileName = 'package.apk';
      }
    }

    const cleanLower = targetUrl.split('?')[0].toLowerCase();
    let detectedExt = '.apk';
    if (cleanLower.endsWith('.exe')) detectedExt = '.exe';
    else if (cleanLower.endsWith('.zip')) detectedExt = '.zip';
    else if (cleanLower.endsWith('.dmg')) detectedExt = '.dmg';
    else if (cleanLower.endsWith('.tar.gz')) detectedExt = '.tar.gz';
    else if (cleanLower.endsWith('.pdf')) detectedExt = '.pdf';
    else if (cleanLower.endsWith('.json')) detectedExt = '.json';
    else if (cleanLower.endsWith('.txt')) detectedExt = '.txt';

    // If filename has no extension, append detected extension
    if (!/\.[a-zA-Z0-9]{2,5}$/.test(finalFileName)) {
      finalFileName += detectedExt;
    }

    let contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    if (finalFileName.endsWith('.apk')) contentType = 'application/vnd.android.package-archive';
    else if (finalFileName.endsWith('.exe')) contentType = 'application/x-msdownload';
    else if (finalFileName.endsWith('.zip')) contentType = 'application/zip';

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFileName)}"`);
    res.setHeader('Content-Type', contentType);

    const cl = upstreamRes.headers.get('content-length');
    if (cl) res.setHeader('Content-Length', cl);

    // Stream the web body directly to the Express response
    Readable.fromWeb(upstreamRes.body).pipe(res);
  } catch (error) {
    console.error('Download proxy streaming error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error streaming package download.' });
    }
  }
};

module.exports = {
  recordDownload,
  getUserDownloadHistory,
  clearUserDownloadHistory,
  getAllDownloadHistoryAdmin,
  proxyDownload,
};

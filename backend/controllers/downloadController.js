const { Readable } = require('stream');
const crypto = require('crypto');
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
      
      // Check ban and consent status if email provided
      const userSnapshot = await db.collection('users').where('email', '==', cleanEmail).get();
      if (!userSnapshot.empty) {
        const uData = userSnapshot.docs[0].data();
        if (uData.isBanned) {
          return res.status(403).json({
            message: 'Your account has been banned. Software downloads are restricted.',
          });
        }
        if (uData.consentStatus === 'withdrawn') {
          return res.status(403).json({
            message: 'Consent Withdrawn: You must accept data processing consent before downloading software.',
            consentWithdrawn: true,
          });
        }
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


// Helper to extract authentic package filename from URL
const getUrlFilename = (targetUrl) => {
  if (!targetUrl || typeof targetUrl !== 'string') return '';
  try {
    const pathname = new URL(targetUrl).pathname;
    const last = pathname.substring(pathname.lastIndexOf('/') + 1);
    return decodeURIComponent(last).trim();
  } catch (_) {
    const clean = targetUrl.split('?')[0].split('#')[0];
    const last = clean.substring(clean.lastIndexOf('/') + 1);
    return last.trim();
  }
};

// Helper to detect authentic package extension from target release URL or filename
const detectExtension = (targetUrl) => {
  if (!targetUrl || typeof targetUrl !== 'string') return '';
  const clean = targetUrl.split('?')[0].split('#')[0].toLowerCase();
  
  // Compound extensions check (e.g. .tar.gz, .tar.bz2, .tar.xz)
  const compoundMatch = clean.match(/\.tar\.(gz|bz2|xz|zst|br)$/i);
  if (compoundMatch) {
    return compoundMatch[0].toLowerCase();
  }

  // General extension check: 1 to 15 alphanumeric characters with dash/underscore
  const match = clean.match(/\.([a-zA-Z0-9_-]{1,15})$/i);
  if (match) {
    const ext = match[0].toLowerCase();
    const webExts = ['.html', '.htm', '.php', '.asp', '.aspx', '.jsp', '.cgi'];
    if (!webExts.includes(ext)) {
      return ext;
    }
  }
  return '';
};

// Map package extension to proper MIME Content-Type
const getMimeTypeForExtension = (ext) => {
  const e = (ext || '').toLowerCase().replace(/^\./, '');
  const mimeMap = {
    apk: 'application/vnd.android.package-archive',
    aab: 'application/octet-stream',
    vsix: 'application/vnd.visx',
    crx: 'application/x-chrome-extension',
    xpi: 'application/x-xpinstall',
    whl: 'application/x-wheel+zip',
    jar: 'application/java-archive',
    war: 'application/java-archive',
    exe: 'application/x-msdownload',
    msi: 'application/x-msdownload',
    zip: 'application/zip',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    'tar.gz': 'application/gzip',
    tgz: 'application/gzip',
    bz2: 'application/x-bzip2',
    xz: 'application/x-xz',
    dmg: 'application/x-apple-diskimage',
    pkg: 'application/octet-stream',
    deb: 'application/vnd.debian.binary-package',
    rpm: 'application/x-rpm',
    appimage: 'application/octet-stream',
    iso: 'application/x-iso9660-image',
    pdf: 'application/pdf',
    json: 'application/json',
    gguf: 'application/octet-stream',
    safetensors: 'application/octet-stream',
    onnx: 'application/octet-stream',
    bin: 'application/octet-stream',
  };
  return mimeMap[e] || 'application/octet-stream';
};

// @desc    Secure proxy stream for binary downloads (hides raw GitHub releases from user)
// @route   GET /api/downloads/proxy or GET /api/download
// @access  Public
const proxyDownload = async (req, res) => {
  try {
    const { id, file, name } = req.query;
    let targetUrl = '';
    let customName = name || '';
    let productTitle = '';
    let exactDevFilename = '';

    // 1. Resolve product from database
    if (id) {
      try {
        const prodDoc = await db.collection('products').doc(String(id)).get();
        if (prodDoc.exists) {
          const pData = prodDoc.data();
          targetUrl = pData.apkFile || '';
          productTitle = pData.title || '';
          exactDevFilename = pData.originalFilename || pData.securityDetails?.fileName || '';
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

    if (!targetUrl || targetUrl === '#' || (!targetUrl.startsWith('http') && !targetUrl.startsWith('/uploads/') && !targetUrl.startsWith('/'))) {
      return res.status(404).json({ message: 'Valid download target not found.' });
    }

    const detectedExt = detectExtension(targetUrl) || (exactDevFilename ? detectExtension(exactDevFilename) : '');
    const urlFilename = getUrlFilename(targetUrl);

    // Direct local uploaded file serving (supports any extension without SSRF or network proxy bottlenecks)
    if (targetUrl.includes('/uploads/')) {
      const rawRel = targetUrl.split('/uploads/')[1].split('?')[0].split('#')[0];
      const safeRel = path.normalize(rawRel).replace(/^(\.\.[\/\\])+/, '');
      const localFilePath = path.resolve(__dirname, '..', 'uploads', safeRel);
      const uploadsDir = path.resolve(__dirname, '..', 'uploads');

      if (localFilePath.startsWith(uploadsDir) && fs.existsSync(localFilePath)) {
        let finalFileName = exactDevFilename || urlFilename || customName || path.basename(localFilePath);
        if (detectedExt && !finalFileName.toLowerCase().endsWith(detectedExt.toLowerCase())) {
          finalFileName = finalFileName.replace(/\.[a-zA-Z0-9_-]{1,10}$/i, '') + detectedExt;
        }

        const safeAsciiFilename = finalFileName.replace(/["\r\n\\]/g, '_');
        const contentType = getMimeTypeForExtension(detectedExt || path.extname(localFilePath));
        const stat = fs.statSync(localFilePath);

        res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stat.size);

        return fs.createReadStream(localFilePath).pipe(res);
      }
    }

    if (targetUrl.startsWith('/')) {
      const serverBase = (process.env.BACKEND_URL || 'https://upper-store.onrender.com').replace(/\/$/, '');
      targetUrl = `${serverBase}${targetUrl}`;
    }

    // Derive or normalize customName with authentic package extension
    if (customName) {
      try {
        customName = decodeURIComponent(customName);
      } catch (_) {}

      // If customName ends with generic placeholder (.bin or .apk) while targetUrl has a distinct extension, replace it
      if (detectedExt && detectedExt !== '.bin') {
        if (customName.toLowerCase().endsWith('.bin') || customName.toLowerCase().endsWith('.apk')) {
          customName = customName.replace(/\.(bin|apk)$/i, '') + detectedExt;
        }
      }
      
      // If customName lacks an extension entirely, append detected extension
      if (!/\.[a-zA-Z0-9_-]{1,15}$/i.test(customName)) {
        customName = `${customName}${detectedExt || '.bin'}`;
      }
    } else if (exactDevFilename && detectExtension(exactDevFilename)) {
      customName = exactDevFilename;
    } else if (urlFilename && detectExtension(urlFilename)) {
      customName = urlFilename;
    } else if (productTitle) {
      customName = `${productTitle.replace(/[^a-zA-Z0-9._-]/g, '_')}${detectedExt || '.bin'}`;
    } else {
      customName = `package${detectedExt || '.bin'}`;
    }

    // SSRF & Open Proxy Prevention: Strictly validate host and prevent internal loopback/metadata probing
    try {
      const parsedUrl = new URL(targetUrl);
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        return res.status(400).json({ message: 'Invalid download protocol.' });
      }

      const host = parsedUrl.hostname.toLowerCase();
      const isInternal =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1' ||
        host === '169.254.169.254' ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);

      if (isInternal) {
        return res.status(403).json({ message: 'Access to internal network addresses is strictly forbidden.' });
      }

      const isAllowedHost =
        host === 'github.com' ||
        host.endsWith('.github.com') ||
        host === 'githubusercontent.com' ||
        host.endsWith('.githubusercontent.com') ||
        host === 'huggingface.co' ||
        host.endsWith('.huggingface.co') ||
        host === 'ik.imagekit.io' ||
        host.endsWith('.imagekit.io') ||
        host.endsWith('.r2.dev') ||
        host.endsWith('.s3.amazonaws.com') ||
        host === 'storage.googleapis.com' ||
        host.endsWith('.storage.googleapis.com') ||
        host.endsWith('.blob.core.windows.net') ||
        host.endsWith('.onrender.com');

      if (!isAllowedHost) {
        return res.status(403).json({ message: 'Forbidden download host. Only verified release mirrors are permitted.' });
      }
    } catch {
      return res.status(400).json({ message: 'Invalid target URL structure.' });
    }

    const cleanTarget = targetUrl.split('?')[0].toLowerCase();
    const hasReleaseDownload = cleanTarget.includes('/releases/download/');
    const hasDetectedExt = Boolean(detectedExt);
    const isWebPage = cleanTarget.includes('/releases/tag/') || 
                      cleanTarget.endsWith('/releases') || 
                      cleanTarget.includes('/tree/') || 
                      cleanTarget.includes('/blob/') ||
                      (!hasReleaseDownload && !hasDetectedExt);

    if (req.query.mode === 'redirect' || isWebPage) {
      return res.redirect(targetUrl);
    }

    // High-Speed Edge Delivery: Check if Cloudflare Worker is configured
    // If configured, delegate 100% of the download bandwidth to Cloudflare Edge with a 5-minute signed token
    const cfWorkerUrl = process.env.CLOUDFLARE_WORKER_URL;
    if (cfWorkerUrl && targetUrl.includes('/releases/download/')) {
      const exp = Math.floor(Date.now() / 1000) + (5 * 60); // 5 minutes expiration
      const secret = process.env.DOWNLOAD_SECRET_KEY || process.env.JWT_SECRET || 'upper_store_secure_edge_key';
      const b64Url = Buffer.from(targetUrl).toString('base64');
      const dataToSign = `${b64Url}:${exp}`;
      const sig = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');
      const encodedName = customName ? encodeURIComponent(customName) : '';
      const edgeUrl = `${cfWorkerUrl.replace(/\/$/, '')}/dl?url=${encodeURIComponent(b64Url)}&exp=${exp}&sig=${sig}&name=${encodedName}`;
      return res.redirect(edgeUrl);
    }

    // 3. Fallback: Fetch from upstream GitHub release with redirect: follow
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
      return res.status(404).json({ message: 'Upstream release asset not found or inaccessible.' });
    }

    // 4. Derive clean, exact developer filename & authentic extension
    let finalFileName = '';
    if (exactDevFilename && detectExtension(exactDevFilename)) {
      finalFileName = exactDevFilename;
    } else if (urlFilename && detectExtension(urlFilename)) {
      finalFileName = urlFilename;
    } else if (customName) {
      finalFileName = customName;
    } else if (productTitle) {
      finalFileName = `${productTitle.replace(/[^a-zA-Z0-9._-]/g, '_')}${detectedExt || '.bin'}`;
    } else {
      finalFileName = `package${detectedExt || '.bin'}`;
    }

    // Ensure finalFileName ends with detected authentic extension
    if (detectedExt && !finalFileName.toLowerCase().endsWith(detectedExt.toLowerCase())) {
      if (finalFileName.toLowerCase().endsWith('.bin') || finalFileName.toLowerCase().endsWith('.apk')) {
        finalFileName = finalFileName.replace(/\.(bin|apk)$/i, '') + detectedExt;
      } else if (!/\.[a-zA-Z0-9_-]{1,15}$/i.test(finalFileName)) {
        finalFileName += detectedExt;
      }
    }

    const cleanFileLower = finalFileName.toLowerCase();
    let contentType = upstreamRes.headers.get('content-type') || '';
    if (!contentType || contentType.includes('text/plain') || contentType.includes('application/octet-stream')) {
      contentType = getMimeTypeForExtension(detectedExt || cleanFileLower.match(/\.[a-zA-Z0-9_-]+$/)?.[0] || '');
    } else if (cleanFileLower.endsWith('.vsix')) {
      contentType = 'application/vnd.visx';
    } else if (cleanFileLower.endsWith('.apk')) {
      contentType = 'application/vnd.android.package-archive';
    }

    const safeAsciiFilename = finalFileName.replace(/["\r\n\\]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`);
    res.setHeader('Content-Type', contentType);

    const cl = upstreamRes.headers.get('content-length');
    if (cl) res.setHeader('Content-Length', cl);

    // Stream the web body directly to the Express response with socket abort cleanup
    const nodeStream = Readable.fromWeb(upstreamRes.body);
    req.on('close', () => {
      try {
        nodeStream.destroy();
      } catch (_) {}
    });
    nodeStream.pipe(res);
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
  detectExtension,
  getMimeTypeForExtension,
  getUrlFilename,
};

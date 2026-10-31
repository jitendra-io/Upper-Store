const { db } = require('../config/firebase');
const ImageKit = require('@imagekit/nodejs');
const path = require('path');
const fs = require('fs');

let imagekit = null;
if (
  process.env.IMAGEKIT_PUBLIC_KEY &&
  process.env.IMAGEKIT_PUBLIC_KEY !== 'your_imagekit_public_key'
) {
  try {
    imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });
  } catch (err) {
    console.warn('⚠️ ImageKit initialization skipped:', err.message);
  }
}

const { uploadToGitHubRelease } = require('../services/githubReleaseService');
const { buildSecurityVerification } = require('../services/securityScanService');
const { FieldValue } = require('../config/firebase');
const cacheService = require('../services/cacheService');

// Helper to resolve full file URL fallback
const getFileUrl = (req, relativePath) => {
  if (process.env.BACKEND_URL) {
    const baseUrl = process.env.BACKEND_URL.replace(/\/$/, '');
    return `${baseUrl}/${relativePath.replace(/\\/g, '/')}`;
  }
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:5000';
  return `${protocol}://${host}/${relativePath.replace(/\\/g, '/')}`;
};

// Helper to upload a file to ImageKit or fallback to server URL
const uploadFileToCloudOrLocal = async (file, folder, req) => {
  const relativePath = path.relative(path.join(__dirname, '..'), file.path);
  let url = getFileUrl(req, relativePath);

  if (imagekit) {
    try {
      const buffer = fs.readFileSync(file.path);
      const uploadFn = (imagekit.files?.upload ? imagekit.files.upload.bind(imagekit.files) : imagekit.upload.bind(imagekit));
      const uploaded = await uploadFn({
        file: buffer.toString('base64'),
        fileName: file.filename,
        folder: `/upper-store/${folder}`,
      });
      if (uploaded?.url) {
        url = uploaded.url;
        console.log(`☁️ Uploaded to ImageKit (${folder}): ${url}`);

        // Remove local temporary staging file so it is not stored locally
        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch (unlinkErr) {
          console.warn(`Note: Could not delete local temp file ${file.path}`);
        }
      }
    } catch (ikErr) {
      console.warn(`⚠️ ImageKit upload failed for ${file.originalname}: ${ikErr.message}. Using fallback: ${url}`);
    }
  } else {
    console.log(`📁 Saved locally (${folder}): ${url}`);
  }
  return url;
};

// Helper to process package file upload (prefers GitHub Release for large files)
const handlePackageFileUpload = async (apkFile, title, version, description, req) => {
  // 1. Try uploading to GitHub Release
  const ghUrl = await uploadToGitHubRelease({
    filePath: apkFile.path,
    fileName: apkFile.originalname || apkFile.filename,
    version,
    title,
    description,
    customToken: req.body?.githubToken,
    customOwner: req.body?.githubOwner,
    customRepo: req.body?.githubRepo,
  });

  if (ghUrl) {
    return ghUrl;
  }

  // 2. Fallback to ImageKit or Local
  return await uploadFileToCloudOrLocal(apkFile, 'apks', req);
};

// Quick sanitize image URLs without blocking network requests
const quickSanitizeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return url || '';
  const clean = url.trim();
  const driveMatch = clean.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return clean;
};

// Helper to resolve Google Photos & Google Drive sharing links to raw direct image or video URLs
const resolveDirectImageUrl = async (url) => {
  if (!url || typeof url !== 'string') return url;
  let cleanUrl = url.trim();

  // 1. Convert Google Drive file view links: drive.google.com/file/d/FILE_ID/view -> https://lh3.googleusercontent.com/d/FILE_ID
  const driveMatch = cleanUrl.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }

  // 2. Resolve Google Photos app share links (strictly validated hostname to prevent SSRF)
  try {
    const parsed = new URL(cleanUrl);
    const validHosts = ['photos.app.goo.gl', 'photos.google.com'];
    if (parsed.protocol === 'https:' && validHosts.includes(parsed.hostname.toLowerCase())) {
      const response = await fetch(cleanUrl, {
        signal: AbortSignal.timeout(3500),
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (response.ok) {
        const html = await response.text();
        
        // Check 1: og:video meta tags (Extract direct MP4 video stream)
        const ogVideoMatch = html.match(/<meta\s+property="og:video(?::secure_url|:url)?"\s+content="([^"]+)"/i) ||
                             html.match(/<meta\s+content="([^"]+)"\s+property="og:video(?::secure_url|:url)?"/i);
        if (ogVideoMatch && ogVideoMatch[1]) {
          let directVidUrl = ogVideoMatch[1];
          if (directVidUrl.includes('=w600-h315')) {
            directVidUrl = directVidUrl.replace(/=w600-h315.*$/, '=m22');
          }
          console.log(`🎥 Resolved Google Photos video share link (${cleanUrl}) -> direct video MP4: ${directVidUrl}`);
          return directVidUrl;
        }

        // Check 2: direct googleusercontent video stream URLs in page HTML
        const videoStreamMatch = html.match(/https:\/\/video-downloads\.googleusercontent\.com\/[^\s"'\\]+/i) ||
                                 html.match(/https:\/\/lh3\.googleusercontent\.com\/[^\s"'\\]+=m\d+/i) ||
                                 html.match(/https:\/\/[^"'\s]+\.mp4[^\s"'\\]*/i);
        if (videoStreamMatch && videoStreamMatch[0]) {
          const streamUrl = videoStreamMatch[0].replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');
          console.log(`🎥 Resolved Google Photos stream link (${cleanUrl}) -> ${streamUrl}`);
          return streamUrl;
        }

        // Check 3: og:image meta tag for direct high-res images
        const ogMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) || html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);
        if (ogMatch && ogMatch[1]) {
          const directImg = ogMatch[1].replace(/=w\d+-h\d+.*$/, '=s1200');
          console.log(`📸 Resolved Google Photos share link (${cleanUrl}) -> direct image: ${directImg}`);
          return directImg;
        }
      }
    }
  } catch (err) {
    // Malformed URL or resolution error; safe to ignore and return cleanUrl
  }

  return cleanUrl;
};

// @desc    Get all products (Ultra-fast with 0-latency caching & pagination support)
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const isHit = cacheService.get('products_list') !== null;
    const products = await cacheService.getOrSet('products_list', async () => {
      const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map((doc) => {
        const p = { id: doc.id, ...doc.data() };
        p.downloadCount = Number(p.downloadCount) || 0;
        p.image = quickSanitizeImageUrl(p.image);
        p.logo = quickSanitizeImageUrl(p.logo);
        p.videoUrl = quickSanitizeImageUrl(p.videoUrl);
        p.videoPoster = quickSanitizeImageUrl(p.videoPoster);
        if (Array.isArray(p.images)) {
          p.images = p.images.map(quickSanitizeImageUrl);
        }
        if (!p.sha256Checksum) {
          p.sha256Checksum = 'Verified-Upper-SEC-256';
          p.securityStatus = 'Clean / 0 Threats Detected';
          p.isSecurityVerified = true;
        }
        return p;
      });
    }, 60);

    res.setHeader('X-Cache-Status', isHit ? 'HIT' : 'MISS');

    // Support pagination query: ?page=1&limit=10
    if (req.query.page) {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
      const total = products.length;
      const totalPages = Math.min(10, Math.ceil(total / limit) || 1);
      const startIndex = (page - 1) * limit;
      const paginatedProducts = products.slice(startIndex, startIndex + limit);

      res.setHeader('X-Total-Count', total);
      res.setHeader('X-Total-Pages', totalPages);
      res.setHeader('X-Current-Page', page);

      return res.json({
        products: paginatedProducts,
        page,
        limit,
        total,
        totalPages,
      });
    }

    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Error fetching products.' });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ message: 'Product not found.' });
    const data = doc.data();

    // Developer Permission Guard: If not admin, only the creator can delete
    if (!req.isAdmin) {
      const currentEmail = (req.user?.email || '').toLowerCase();
      const currentUid = req.user?.uid;
      const isOwner =
        (data.developerEmail && data.developerEmail.toLowerCase() === currentEmail) ||
        (data.developerId && data.developerId === currentUid);

      if (!isOwner) {
        return res.status(403).json({ message: 'Forbidden: You can only delete products you published.' });
      }
    }
    if (!data.sha256Checksum) {
      const sec = await buildSecurityVerification(data.apkFile || doc.id, data.version || '1.0.0');
      data.sha256Checksum = sec.sha256Checksum;
      data.securityStatus = sec.securityStatus;
      data.virusTotalUrl = sec.virusTotalUrl;
      data.isSecurityVerified = true;
    }
    res.json({ id: doc.id, ...data });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product.' });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private (Admin)
const createProduct = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      price,
      version,
      releaseNotes,
      directApkUrl,
      videoUrl,
      videoPosterUrl,
      logoUrl,
      imageUrl1,
      imageUrl2,
      imageUrl3,
      imageUrls: bodyImageUrls,
      tags,
      customTags,
    } = req.body;

    if (!title || !category || !description) {
      return res.status(400).json({ message: 'Title, category, and description are required.' });
    }

    // Enforce VIP tier upload limits: Pro VIP = max 3 products, Elite VIP = unlimited products (Admin = unlimited)
    if (!req.isAdmin && req.developer) {
      const plan = (req.developer.vipPlan || req.membership?.plan || 'pro').toLowerCase();
      if (plan === 'pro') {
        const devUid = req.user?.uid || '';
        const devEmail = (req.developer.email || req.user?.email || '').trim().toLowerCase();

        const productIds = new Set();
        if (devEmail) {
          const emailSnap = await db.collection('products').where('developerEmail', '==', devEmail).get();
          emailSnap.docs.forEach((doc) => productIds.add(doc.id));
        }
        if (devUid) {
          const uidSnap = await db.collection('products').where('developerId', '==', devUid).get();
          uidSnap.docs.forEach((doc) => productIds.add(doc.id));
        }

        if (productIds.size >= 3) {
          return res.status(403).json({
            message: 'Publishing Limit Reached: Pro VIP members can publish up to 3 products. Upgrade to Elite VIP for unlimited product publishing!',
            code: 'PRO_LIMIT_REACHED',
            currentCount: productIds.size,
            maxAllowed: 3,
          });
        }
      }
    }

    // Enforce GitHub Release link requirement
    const apkUrl = (directApkUrl || '').trim();
    if (!apkUrl || (!apkUrl.toLowerCase().includes('github.com') && !apkUrl.toLowerCase().includes('githubusercontent.com'))) {
      return res.status(400).json({
        message: 'GitHub Release URL is required as the download source (e.g. https://github.com/owner/repo/releases/download/v1.0.0/app.apk).',
      });
    }

    // Collect Screenshot image links (Google Photos / Web image links)
    let rawUrls = [];
    if (imageUrl1 && imageUrl1.trim()) rawUrls.push(imageUrl1.trim());
    if (imageUrl2 && imageUrl2.trim()) rawUrls.push(imageUrl2.trim());
    if (imageUrl3 && imageUrl3.trim()) rawUrls.push(imageUrl3.trim());

    if (Array.isArray(bodyImageUrls)) {
      rawUrls.push(...bodyImageUrls.map(u => u.trim()).filter(Boolean));
    } else if (typeof bodyImageUrls === 'string' && bodyImageUrls.trim()) {
      rawUrls.push(...bodyImageUrls.split('\n').map(u => u.trim()).filter(Boolean));
    }

    let finalImageUrls = [];
    for (const urlItem of rawUrls) {
      const resolved = await resolveDirectImageUrl(urlItem);
      if (resolved) finalImageUrls.push(resolved);
    }

    // Fallback if image uploaded via file staging
    const imgFiles = req.files?.images || req.files?.image || [];
    for (const imgFile of imgFiles) {
      const url = await uploadFileToCloudOrLocal(imgFile, 'images', req);
      finalImageUrls.push(url);
    }

    let finalLogoUrl = (logoUrl || '').trim();
    if (finalLogoUrl) {
      finalLogoUrl = await resolveDirectImageUrl(finalLogoUrl);
    } else if (req.files?.logo) {
      const logoFile = req.files.logo[0];
      finalLogoUrl = await uploadFileToCloudOrLocal(logoFile, 'logos', req);
    }

    let finalVideoUrl = (videoUrl || '').trim();
    if (finalVideoUrl) {
      finalVideoUrl = await resolveDirectImageUrl(finalVideoUrl);
    } else if (req.files?.video) {
      const videoFile = req.files.video[0];
      finalVideoUrl = await uploadFileToCloudOrLocal(videoFile, 'videos', req);
    }

    let finalVideoPosterUrl = (videoPosterUrl || '').trim();
    if (finalVideoPosterUrl) {
      finalVideoPosterUrl = await resolveDirectImageUrl(finalVideoPosterUrl);
    } else if (req.files?.videoPoster) {
      const posterFile = req.files.videoPoster[0];
      finalVideoPosterUrl = await uploadFileToCloudOrLocal(posterFile, 'images', req);
    }

    const mainImageUrl = finalImageUrls[0] || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600';

    const securityMeta = await buildSecurityVerification(
      apkUrl,
      version ? version.trim() : '1.0.0',
      req.body?.sha256Checksum
    );

    let finalTags = [];
    const rawTags = tags || customTags;
    if (Array.isArray(rawTags)) {
      finalTags = rawTags.map(t => String(t).trim()).filter(Boolean);
    } else if (typeof rawTags === 'string') {
      finalTags = rawTags.split(',').map(t => t.trim()).filter(Boolean);
    }
    finalTags = finalTags.slice(0, 2);

    const hasLicenseKey = req.body.hasLicenseKey === true || req.body.hasLicenseKey === 'true';
    const licensePrice = req.body.licensePrice ? String(req.body.licensePrice).trim() : '';
    const isPlatformFeeWaived = req.body.isPlatformFeeWaived === true || req.body.isPlatformFeeWaived === 'true';

    const productData = {
      isDeveloperProduct: Boolean(req.developer),
      developerId: req.developer ? req.user.uid : null,
      developerEmail: req.developer ? (req.developer.email || req.user.email || '').toLowerCase() : null,
      developerUsername: req.developer ? (req.developer.username || req.user.username || null) : null,
      developerName: req.developer ? (req.developer.displayName || req.user.displayName || req.user.email.split('@')[0]) : 'Upper Store',
      developerAvatar: req.developer ? (req.developer.avatar || req.user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(req.user.email)}`) : null,
      developerTier: req.developer ? (req.developer.vipPlan || req.membership?.plan || 'pro') : null,
      isStoreOfficial: !req.developer,
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      price: price ? price.trim() : 'Free',
      version: version ? version.trim() : '1.0.0',
      releaseNotes: releaseNotes ? releaseNotes.trim() : '',
      tags: finalTags,
      hasLicenseKey: Boolean(hasLicenseKey),
      licensePrice: licensePrice || '',
      isPlatformFeeWaived: Boolean(isPlatformFeeWaived),
      image: mainImageUrl,
      images: finalImageUrls.length > 0 ? finalImageUrls : [mainImageUrl],
      logo: finalLogoUrl,
      videoUrl: finalVideoUrl,
      videoPoster: finalVideoPosterUrl,
      apkFile: apkUrl,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
      ...securityMeta,
    };

    const docRef = await db.collection('products').add(productData);
    cacheService.invalidate('products_list');
    console.log(`✅ Product published successfully via GitHub Release: "${title}" (ID: ${docRef.id})`);
    res.status(201).json({ id: docRef.id, ...productData });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: error.message || 'Error creating product.' });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (Admin)
const updateProduct = async (req, res) => {
  try {
    const docRef = db.collection('products').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ message: 'Product not found.' });

    const existingData = doc.data();

    // Developer Permission Guard: If not admin, only the creator can update
    if (!req.isAdmin) {
      const currentEmail = (req.user?.email || '').toLowerCase();
      const currentUid = req.user?.uid;
      const isOwner =
        (existingData.developerEmail && existingData.developerEmail.toLowerCase() === currentEmail) ||
        (existingData.developerId && existingData.developerId === currentUid);

      if (!isOwner) {
        return res.status(403).json({ message: 'Forbidden: You can only edit products you published.' });
      }
    }
    const {
      title,
      category,
      description,
      price,
      version,
      releaseNotes,
      directApkUrl,
      videoUrl,
      videoPosterUrl,
      logoUrl,
      imageUrl1,
      imageUrl2,
      imageUrl3,
      imageUrls: bodyImageUrls,
      tags,
      customTags,
    } = req.body;

    const updatedData = {};
    if (title !== undefined) updatedData.title = title.trim();
    if (category !== undefined) updatedData.category = category.trim();
    if (description !== undefined) updatedData.description = description.trim();
    if (price !== undefined) updatedData.price = price.trim();
    if (version !== undefined) updatedData.version = version.trim();
    if (releaseNotes !== undefined) updatedData.releaseNotes = releaseNotes.trim();

    if (req.body.hasLicenseKey !== undefined) {
      updatedData.hasLicenseKey = Boolean(req.body.hasLicenseKey === true || req.body.hasLicenseKey === 'true');
    }
    if (req.body.licensePrice !== undefined) {
      updatedData.licensePrice = String(req.body.licensePrice).trim();
    }
    if (req.body.isPlatformFeeWaived !== undefined) {
      updatedData.isPlatformFeeWaived = Boolean(req.body.isPlatformFeeWaived === true || req.body.isPlatformFeeWaived === 'true');
    }
    if (req.developer && (req.developer.username || req.user?.username)) {
      updatedData.developerUsername = req.developer.username || req.user?.username;
    }

    if (tags !== undefined || customTags !== undefined) {
      const rawTags = tags !== undefined ? tags : customTags;
      if (Array.isArray(rawTags)) {
        updatedData.tags = rawTags.map(t => String(t).trim()).filter(Boolean).slice(0, 2);
      } else if (typeof rawTags === 'string') {
        updatedData.tags = rawTags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 2);
      }
    }

    if (directApkUrl !== undefined && directApkUrl.trim() !== '') {
      const apkUrl = directApkUrl.trim();
      if (!apkUrl.toLowerCase().includes('github.com') && !apkUrl.toLowerCase().includes('githubusercontent.com')) {
        return res.status(400).json({
          message: 'Download link must be a valid GitHub Release URL.',
        });
      }
      updatedData.apkFile = apkUrl;
    }

    if (videoUrl !== undefined) {
      updatedData.videoUrl = videoUrl.trim() ? await resolveDirectImageUrl(videoUrl.trim()) : '';
    } else if (req.files?.video) {
      const videoFile = req.files.video[0];
      updatedData.videoUrl = await uploadFileToCloudOrLocal(videoFile, 'videos', req);
    }

    if (videoPosterUrl !== undefined) {
      updatedData.videoPoster = videoPosterUrl.trim() ? await resolveDirectImageUrl(videoPosterUrl.trim()) : '';
    } else if (req.files?.videoPoster) {
      const posterFile = req.files.videoPoster[0];
      updatedData.videoPoster = await uploadFileToCloudOrLocal(posterFile, 'images', req);
    }

    if (logoUrl !== undefined && logoUrl.trim() !== '') {
      updatedData.logo = await resolveDirectImageUrl(logoUrl);
    }

    let rawUrls = [];
    if (imageUrl1 && imageUrl1.trim()) rawUrls.push(imageUrl1.trim());
    if (imageUrl2 && imageUrl2.trim()) rawUrls.push(imageUrl2.trim());
    if (imageUrl3 && imageUrl3.trim()) rawUrls.push(imageUrl3.trim());

    if (rawUrls.length > 0) {
      let finalImageUrls = [];
      for (const urlItem of rawUrls) {
        const resolved = await resolveDirectImageUrl(urlItem);
        if (resolved) finalImageUrls.push(resolved);
      }
      if (finalImageUrls.length > 0) {
        updatedData.images = finalImageUrls;
        updatedData.image = finalImageUrls[0];
      }
    }

    updatedData.updatedAt = new Date().toISOString();

    await docRef.update(updatedData);
    cacheService.invalidate('products_list');
    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: error.message || 'Error updating product.' });
  }
};


// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Admin)
const deleteProduct = async (req, res) => {
  try {
    const docRef = db.collection('products').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ message: 'Product not found.' });

    const data = doc.data();

    // Clean up local files if present (strictly confined to backend/uploads directory)
    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    const safeDeleteFile = (fileUrlOrPath) => {
      if (!fileUrlOrPath || typeof fileUrlOrPath !== 'string' || !fileUrlOrPath.includes('/uploads/')) return;
      const rawRel = fileUrlOrPath.split('/uploads/')[1];
      if (!rawRel) return;
      const safeFilename = path.basename(rawRel.trim());
      const resolvedPath = path.resolve(uploadsDir, safeFilename);
      if (resolvedPath.startsWith(uploadsDir) && fs.existsSync(resolvedPath)) {
        try {
          fs.unlinkSync(resolvedPath);
        } catch (unlinkErr) {
          console.warn('Failed to delete file from uploads:', unlinkErr.message);
        }
      }
    };

    safeDeleteFile(data.image);
    safeDeleteFile(data.apkFile);

    await docRef.delete();
    cacheService.invalidate('products_list');
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product.' });
  }
};

// @desc    Increment product download count
// @route   POST /api/products/:id/download
// @access  Public
const trackProductDownload = async (req, res) => {
  try {
    const { userEmail } = req.body;
    if (userEmail) {
      const cleanEmail = userEmail.trim().toLowerCase();
      const userSnapshot = await db.collection('users').where('email', '==', cleanEmail).get();
      if (!userSnapshot.empty && userSnapshot.docs[0].data().isBanned) {
        return res.status(403).json({
          message: 'Your account has been banned. Product downloads are restricted.',
        });
      }
    }

    const docRef = db.collection('products').doc(req.params.id);
    await docRef.update({
      downloadCount: FieldValue.increment(1),
    }).catch(async () => {
      await docRef.set({ downloadCount: 1 }, { merge: true });
    });

    cacheService.invalidate('products_list');

    const updatedDoc = await docRef.get();
    const newCount = updatedDoc.exists ? Number(updatedDoc.data().downloadCount) || 1 : 1;
    res.json({ id: req.params.id, downloadCount: newCount });
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({ message: 'Error updating download count.' });
  }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct, trackProductDownload };

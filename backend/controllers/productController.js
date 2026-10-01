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

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product.' });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private (Admin)
const createProduct = async (req, res) => {
  try {
    const { title, category, description, price, version, releaseNotes, directApkUrl } = req.body;

    if (!title || !category || !description) {
      return res.status(400).json({ message: 'Title, category, and description are required.' });
    }

    let imageUrls = [];
    let logoUrl = '';
    let apkUrl = directApkUrl ? directApkUrl.trim() : '';

    // Handle up to 3 Screenshot Images upload
    const imgFiles = req.files?.images || req.files?.image || [];
    for (const imgFile of imgFiles) {
      const url = await uploadFileToCloudOrLocal(imgFile, 'images', req);
      imageUrls.push(url);
    }
    const imageUrl = imageUrls[0] || '';

    // Handle Logo / Icon upload
    if (req.files?.logo) {
      const logoFile = req.files.logo[0];
      logoUrl = await uploadFileToCloudOrLocal(logoFile, 'logos', req);
    }

    // Handle APK / Package upload if no direct URL was provided
    if (!apkUrl && req.files?.apk) {
      const apkFile = req.files.apk[0];
      apkUrl = await handlePackageFileUpload(apkFile, title, version, description, req);
    }

    const productData = {
      title,
      category,
      description,
      price: price || 'Free',
      version: version || '1.0.0',
      releaseNotes: releaseNotes || '',
      image: imageUrl,
      images: imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []),
      logo: logoUrl,
      apkFile: apkUrl,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('products').add(productData);
    console.log(`✅ Product published successfully: "${title}" (ID: ${docRef.id})`);
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
    const { title, category, description, price, version, releaseNotes, directApkUrl } = req.body;

    const updatedData = {};
    if (title !== undefined) updatedData.title = title;
    if (category !== undefined) updatedData.category = category;
    if (description !== undefined) updatedData.description = description;
    if (price !== undefined) updatedData.price = price;
    if (version !== undefined) updatedData.version = version;
    if (releaseNotes !== undefined) updatedData.releaseNotes = releaseNotes;
    if (directApkUrl !== undefined && directApkUrl.trim() !== '') {
      updatedData.apkFile = directApkUrl.trim();
    }

    // Handle screenshot image uploads if provided
    const imgFiles = req.files?.images || req.files?.image || [];
    if (imgFiles.length > 0) {
      let imageUrls = [];
      for (const imgFile of imgFiles) {
        const url = await uploadFileToCloudOrLocal(imgFile, 'images', req);
        imageUrls.push(url);
      }
      updatedData.image = imageUrls[0];
      updatedData.images = imageUrls;
    }

    // Handle logo upload if provided
    if (req.files?.logo) {
      const logoFile = req.files.logo[0];
      updatedData.logo = await uploadFileToCloudOrLocal(logoFile, 'logos', req);
    }

    // Handle binary / apk / exe file upload if provided
    if (req.files?.apk) {
      const apkFile = req.files.apk[0];
      const prodTitle = title || existingData.title;
      const prodVersion = version || existingData.version;
      const prodDesc = description || existingData.description;
      updatedData.apkFile = await handlePackageFileUpload(apkFile, prodTitle, prodVersion, prodDesc, req);
    }

    updatedData.updatedAt = new Date().toISOString();

    await docRef.update(updatedData);
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

    // Clean up local files if present
    if (data.image && data.image.includes('/uploads/')) {
      const imgPath = path.join(__dirname, '..', data.image.split('/uploads/')[1]);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    if (data.apkFile && data.apkFile.includes('/uploads/')) {
      const apkPath = path.join(__dirname, '..', data.apkFile.split('/uploads/')[1]);
      if (fs.existsSync(apkPath)) fs.unlinkSync(apkPath);
    }

    await docRef.delete();
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
    const docRef = db.collection('products').doc(req.params.id);
    const doc = await docRef.get();
    
    if (doc.exists) {
      const currentCount = Number(doc.data().downloadCount) || 0;
      const newCount = currentCount + 1;
      await docRef.update({ downloadCount: newCount });
      return res.json({ id: req.params.id, downloadCount: newCount });
    }
    
    res.json({ id: req.params.id, downloadCount: 1 });
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({ message: 'Error updating download count.' });
  }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct, trackProductDownload };

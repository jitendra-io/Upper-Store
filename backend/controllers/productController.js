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
    const {
      title,
      category,
      description,
      price,
      version,
      releaseNotes,
      directApkUrl,
      logoUrl,
      imageUrl1,
      imageUrl2,
      imageUrl3,
      imageUrls: bodyImageUrls,
    } = req.body;

    if (!title || !category || !description) {
      return res.status(400).json({ message: 'Title, category, and description are required.' });
    }

    // Enforce GitHub Release link requirement
    const apkUrl = (directApkUrl || '').trim();
    if (!apkUrl || (!apkUrl.toLowerCase().includes('github.com') && !apkUrl.toLowerCase().includes('githubusercontent.com'))) {
      return res.status(400).json({
        message: 'GitHub Release URL is required as the download source (e.g. https://github.com/owner/repo/releases/download/v1.0.0/app.apk).',
      });
    }

    // Collect Screenshot image links (Google Photos / Web image links)
    let finalImageUrls = [];
    if (Array.isArray(bodyImageUrls)) {
      finalImageUrls = bodyImageUrls.map(u => u.trim()).filter(Boolean);
    } else if (typeof bodyImageUrls === 'string' && bodyImageUrls.trim()) {
      finalImageUrls = bodyImageUrls.split('\n').map(u => u.trim()).filter(Boolean);
    }

    if (imageUrl1 && imageUrl1.trim()) finalImageUrls.push(imageUrl1.trim());
    if (imageUrl2 && imageUrl2.trim()) finalImageUrls.push(imageUrl2.trim());
    if (imageUrl3 && imageUrl3.trim()) finalImageUrls.push(imageUrl3.trim());

    // Fallback if image uploaded via file staging
    const imgFiles = req.files?.images || req.files?.image || [];
    for (const imgFile of imgFiles) {
      const url = await uploadFileToCloudOrLocal(imgFile, 'images', req);
      finalImageUrls.push(url);
    }

    let finalLogoUrl = (logoUrl || '').trim();
    if (!finalLogoUrl && req.files?.logo) {
      const logoFile = req.files.logo[0];
      finalLogoUrl = await uploadFileToCloudOrLocal(logoFile, 'logos', req);
    }

    const mainImageUrl = finalImageUrls[0] || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600';

    const productData = {
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      price: price ? price.trim() : 'Free',
      version: version ? version.trim() : '1.0.0',
      releaseNotes: releaseNotes ? releaseNotes.trim() : '',
      image: mainImageUrl,
      images: finalImageUrls.length > 0 ? finalImageUrls : [mainImageUrl],
      logo: finalLogoUrl,
      apkFile: apkUrl,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('products').add(productData);
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
    const {
      title,
      category,
      description,
      price,
      version,
      releaseNotes,
      directApkUrl,
      logoUrl,
      imageUrl1,
      imageUrl2,
      imageUrl3,
      imageUrls: bodyImageUrls,
    } = req.body;

    const updatedData = {};
    if (title !== undefined) updatedData.title = title.trim();
    if (category !== undefined) updatedData.category = category.trim();
    if (description !== undefined) updatedData.description = description.trim();
    if (price !== undefined) updatedData.price = price.trim();
    if (version !== undefined) updatedData.version = version.trim();
    if (releaseNotes !== undefined) updatedData.releaseNotes = releaseNotes.trim();

    if (directApkUrl !== undefined && directApkUrl.trim() !== '') {
      const apkUrl = directApkUrl.trim();
      if (!apkUrl.toLowerCase().includes('github.com') && !apkUrl.toLowerCase().includes('githubusercontent.com')) {
        return res.status(400).json({
          message: 'Download link must be a valid GitHub Release URL.',
        });
      }
      updatedData.apkFile = apkUrl;
    }

    if (logoUrl !== undefined && logoUrl.trim() !== '') {
      updatedData.logo = logoUrl.trim();
    }

    let finalImageUrls = [];
    if (imageUrl1 && imageUrl1.trim()) finalImageUrls.push(imageUrl1.trim());
    if (imageUrl2 && imageUrl2.trim()) finalImageUrls.push(imageUrl2.trim());
    if (imageUrl3 && imageUrl3.trim()) finalImageUrls.push(imageUrl3.trim());

    if (finalImageUrls.length > 0) {
      updatedData.image = finalImageUrls[0];
      updatedData.images = finalImageUrls;
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

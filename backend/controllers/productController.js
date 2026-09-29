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

// Helper to resolve full file URL
const getFileUrl = (req, relativePath) => {
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:5000';
  return `${protocol}://${host}/${relativePath.replace(/\\/g, '/')}`;
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
    const { title, category, description, price, version, releaseNotes } = req.body;

    if (!title || !category || !description) {
      return res.status(400).json({ message: 'Title, category, and description are required.' });
    }

    let imageUrl = '';
    let logoUrl = '';
    let apkUrl = '';

    // Handle Image upload
    if (req.files?.image) {
      const imgFile = req.files.image[0];
      const relativePath = path.relative(path.join(__dirname, '..'), imgFile.path);
      imageUrl = getFileUrl(req, relativePath);

      if (imagekit) {
        try {
          const buffer = fs.readFileSync(imgFile.path);
          const uploaded = await imagekit.upload({
            file: buffer.toString('base64'),
            fileName: imgFile.filename,
            folder: '/upper-store/images',
          });
          if (uploaded?.url) imageUrl = uploaded.url;
        } catch (ikErr) {
          console.warn('ImageKit upload warning (using local fallback):', ikErr.message);
        }
      }
    }

    // Handle Logo / Icon upload
    if (req.files?.logo) {
      const logoFile = req.files.logo[0];
      const relativePath = path.relative(path.join(__dirname, '..'), logoFile.path);
      logoUrl = getFileUrl(req, relativePath);

      if (imagekit) {
        try {
          const buffer = fs.readFileSync(logoFile.path);
          const uploaded = await imagekit.upload({
            file: buffer.toString('base64'),
            fileName: logoFile.filename,
            folder: '/upper-store/logos',
          });
          if (uploaded?.url) logoUrl = uploaded.url;
        } catch (ikErr) {
          console.warn('ImageKit logo upload warning:', ikErr.message);
        }
      }
    }

    // Handle APK / Package upload
    if (req.files?.apk) {
      const apkFile = req.files.apk[0];
      const relativePath = path.relative(path.join(__dirname, '..'), apkFile.path);
      apkUrl = getFileUrl(req, relativePath);

      if (imagekit && apkFile.size <= 25 * 1024 * 1024) {
        try {
          const buffer = fs.readFileSync(apkFile.path);
          const uploaded = await imagekit.upload({
            file: buffer.toString('base64'),
            fileName: apkFile.filename,
            folder: '/upper-store/apks',
          });
          if (uploaded?.url) apkUrl = uploaded.url;
        } catch (ikErr) {
          console.warn('ImageKit APK upload warning (using local fallback):', ikErr.message);
        }
      }
    }

    const productData = {
      title,
      category,
      description,
      price: price || 'Free',
      version: version || '1.0.0',
      releaseNotes: releaseNotes || '',
      image: imageUrl,
      logo: logoUrl,
      apkFile: apkUrl,
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

    await docRef.update({ ...req.body, updatedAt: new Date().toISOString() });
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    res.status(500).json({ message: 'Error updating product.' });
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

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };

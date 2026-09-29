const { db } = require('../config/firebase');
const ImageKit = require('@imagekit/nodejs');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

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
    let imageUrl = '';
    let apkUrl = '';

    if (req.files?.image) {
      const imgFile = req.files.image[0];
      const uploaded = await imagekit.upload({
        file: imgFile.buffer.toString('base64'),
        fileName: imgFile.originalname,
        folder: '/upper-store/images',
      });
      imageUrl = uploaded.url;
    }

    if (req.files?.apk) {
      const apkFile = req.files.apk[0];
      const uploaded = await imagekit.upload({
        file: apkFile.buffer.toString('base64'),
        fileName: apkFile.originalname,
        folder: '/upper-store/apks',
      });
      apkUrl = uploaded.url;
    }

    const productData = {
      title,
      category,
      description,
      price: price || 'Free',
      version: version || '1.0.0',
      releaseNotes: releaseNotes || '',
      image: imageUrl,
      apkFile: apkUrl,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('products').add(productData);
    res.status(201).json({ id: docRef.id, ...productData });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Error creating product.' });
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
    await docRef.delete();
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product.' });
  }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };

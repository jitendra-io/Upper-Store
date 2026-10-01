const { db } = require('../config/firebase');

// Baseline fallback ratings for initial visual appeal
const DEMO_REVIEWS = {
  'demo-1': [
    {
      id: 'rev-1',
      productId: 'demo-1',
      userName: 'Alex Rivers',
      userEmail: 'alex@example.com',
      userAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=alex@example.com&backgroundColor=d4af37&textColor=000000',
      rating: 5,
      comment: 'Exceptional dark mode UI kit! The glassmorphism components fit our React enterprise app perfectly.',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'rev-2',
      productId: 'demo-1',
      userName: 'Elena Rostova',
      userEmail: 'elena@example.com',
      userAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=elena@example.com&backgroundColor=d4af37&textColor=000000',
      rating: 4.5,
      comment: 'Very clean CSS architecture. Loved the gold color tokens.',
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    }
  ],
  'demo-2': [
    {
      id: 'rev-3',
      productId: 'demo-2',
      userName: 'Marcus Vance',
      userEmail: 'marcus@example.com',
      userAvatar: 'https://api.dicebear.com/7.x/initials/svg?seed=marcus@example.com&backgroundColor=d4af37&textColor=000000',
      rating: 5,
      comment: 'Smooth download performance! The APK installed cleanly with zero issues on Android 14.',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    }
  ]
};

// @desc    Get all reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
const getProductReviews = async (req, res) => {
  const { productId } = req.params;

  try {
    const snapshot = await db.collection('reviews').where('productId', '==', productId).get();
    let reviews = [];

    if (!snapshot.empty) {
      reviews = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else if (DEMO_REVIEWS[productId]) {
      reviews = DEMO_REVIEWS[productId];
    }

    // Sort by newest first
    reviews.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const totalRatings = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const averageRating = reviews.length > 0 ? Number((totalRatings / reviews.length).toFixed(1)) : 5.0;

    res.json({
      productId,
      reviews,
      reviewsCount: reviews.length,
      averageRating,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    const fallbackList = DEMO_REVIEWS[productId] || [];
    const total = fallbackList.reduce((acc, r) => acc + r.rating, 0);
    res.json({
      productId,
      reviews: fallbackList,
      reviewsCount: fallbackList.length,
      averageRating: fallbackList.length > 0 ? Number((total / fallbackList.length).toFixed(1)) : 5.0,
    });
  }
};

// @desc    Add or Update a review for a product
// @route   POST /api/reviews/product/:productId
// @access  Public (Verified User)
const addOrUpdateReview = async (req, res) => {
  const { productId } = req.params;
  const { userEmail, userName, userAvatar, rating, comment } = req.body;

  if (!userEmail) {
    return res.status(400).json({ message: 'User email is required to submit a review.' });
  }

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5 stars.' });
  }

  if (!comment || comment.trim().length < 3) {
    return res.status(400).json({ message: 'Please write a review comment (minimum 3 characters).' });
  }

  try {
    const cleanEmail = userEmail.trim().toLowerCase();
    const reviewId = `${productId}_${cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const docRef = db.collection('reviews').doc(reviewId);

    const reviewData = {
      productId,
      userEmail: cleanEmail,
      userName: userName ? userName.trim() : cleanEmail.split('@')[0],
      userAvatar: userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}&backgroundColor=d4af37&textColor=000000`,
      rating: Number(rating),
      comment: comment.trim(),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await docRef.set(reviewData, { merge: true });

    // Recalculate average rating & reviews count for product
    const allSnapshot = await db.collection('reviews').where('productId', '==', productId).get();
    const allReviews = allSnapshot.docs.map(doc => doc.data());
    const totalRatings = allReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const averageRating = allReviews.length > 0 ? Number((totalRatings / allReviews.length).toFixed(1)) : Number(rating);

    // Update products document in Firestore if it exists
    const productRef = db.collection('products').doc(productId);
    const prodDoc = await productRef.get();
    if (prodDoc.exists) {
      await productRef.update({
        averageRating,
        reviewsCount: allReviews.length,
      });
    }

    res.status(201).json({
      message: 'Review submitted successfully!',
      review: { id: reviewId, ...reviewData },
      averageRating,
      reviewsCount: allReviews.length,
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ message: 'Failed to submit product review.' });
  }
};

module.exports = { getProductReviews, addOrUpdateReview };

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

    // Filter out badges and priority for expired VIP subscriptions
    reviews = reviews.map((r) => {
      const m = r.userMembership || r.membership;
      if (m && m.validUntil && new Date(m.validUntil) < new Date()) {
        const expiredDefault = { plan: 'free', badge: null, validUntil: null };
        return {
          ...r,
          userMembership: expiredDefault,
          membership: expiredDefault,
        };
      }
      return r;
    });

    // Sort VIP comments first: Elite (Purple) -> Pro (Gold) -> then newest date
    const getVipRank = (r) => {
      const m = r.userMembership || r.membership;
      if (!m) return 0;
      if (m.validUntil && new Date(m.validUntil) < new Date()) return 0;
      const plan = m.plan || 'free';
      if (plan === 'elite') return 2;
      if (plan === 'pro') return 1;
      return 0;
    };

    reviews.sort((a, b) => {
      const rankDiff = getVipRank(b) - getVipRank(a);
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

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
// @access  Protected (Verified User)
const addOrUpdateReview = async (req, res) => {
  const { productId } = req.params;
  const { userEmail, userName, userAvatar, rating, comment } = req.body;

  // 1. Determine verified user identity from authenticated JWT token
  let cleanEmail = (req.user?.email || '').trim().toLowerCase();
  if (!cleanEmail && req.user?.uid) {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (userDoc.exists) {
      cleanEmail = (userDoc.data().email || '').trim().toLowerCase();
    }
  }

  if (!cleanEmail) {
    return res.status(401).json({ message: 'Authentication required: Verified email missing from token.' });
  }

  // Prevent author spoofing if userEmail is supplied in body
  if (userEmail && userEmail.trim().toLowerCase() !== cleanEmail && req.user?.role !== 'admin') {
    return res.status(403).json({
      message: 'Forbidden: You cannot submit reviews under another user’s email address.',
    });
  }

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5 stars.' });
  }

  if (!comment || comment.trim().length < 3) {
    return res.status(400).json({ message: 'Please write a review comment (minimum 3 characters).' });
  }

  try {
    // Check if user account is banned in Firestore
    const userSnapshot = await db.collection('users').where('email', '==', cleanEmail).get();
    if (!userSnapshot.empty && userSnapshot.docs[0].data().isBanned) {
      return res.status(403).json({
        message: 'Your account has been banned. You cannot submit product reviews while banned.',
      });
    }

    let userMembership = { plan: 'free', badge: null };
    if (!userSnapshot.empty) {
      const uData = userSnapshot.docs[0].data();
      if (uData.membership && uData.membership.plan && uData.membership.plan !== 'free') {
        const isExpired = uData.membership.validUntil && new Date(uData.membership.validUntil) < new Date();
        if (!isExpired) {
          userMembership = {
            plan: uData.membership.plan,
            badge: uData.membership.badge || (uData.membership.plan === 'elite' ? 'purple' : 'gold'),
            validUntil: uData.membership.validUntil || null,
          };
        }
      }
    }

    const reviewId = `${productId}_${cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const docRef = db.collection('reviews').doc(reviewId);

    const reviewData = {
      productId,
      userEmail: cleanEmail,
      userName: userName ? userName.trim() : cleanEmail.split('@')[0],
      userAvatar: userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}&backgroundColor=d4af37&textColor=000000`,
      rating: Number(rating),
      comment: comment.trim(),
      userMembership,
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

// @desc    Delete a review for a product
// @route   DELETE /api/reviews/:reviewId
// @access  Protected (Review Author or Admin)
const deleteReview = async (req, res) => {
  const { reviewId } = req.params;

  try {
    const docRef = db.collection('reviews').doc(reviewId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    const reviewData = doc.data();
    const productId = reviewData.productId;
    const reviewOwnerEmail = (reviewData.userEmail || '').trim().toLowerCase();

    // Verify ownership: Admin OR verified author
    if (req.user?.role !== 'admin') {
      let requesterEmail = (req.user?.email || '').trim().toLowerCase();
      if (!requesterEmail && req.user?.uid) {
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        if (userDoc.exists) {
          requesterEmail = (userDoc.data().email || '').trim().toLowerCase();
        }
      }

      if (!requesterEmail || requesterEmail !== reviewOwnerEmail) {
        return res.status(403).json({
          message: 'Forbidden: You are not authorized to delete another user’s review.',
        });
      }
    }

    await docRef.delete();

    // Recalculate average rating & reviews count for product
    const allSnapshot = await db.collection('reviews').where('productId', '==', productId).get();
    const remainingReviews = allSnapshot.docs.map(d => d.data());
    const totalRatings = remainingReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const averageRating = remainingReviews.length > 0 ? Number((totalRatings / remainingReviews.length).toFixed(1)) : 5.0;

    const productRef = db.collection('products').doc(productId);
    const prodDoc = await productRef.get();
    if (prodDoc.exists) {
      await productRef.update({
        averageRating,
        reviewsCount: remainingReviews.length,
      });
    }

    res.json({
      message: 'Review deleted successfully.',
      productId,
      averageRating,
      reviewsCount: remainingReviews.length,
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Failed to delete review.' });
  }
};

// @desc    Get all reviews written across all products
// @route   GET /api/reviews/all
// @access  Public / Admin
const getAllReviews = async (req, res) => {
  try {
    const snapshot = await db.collection('reviews').get();
    let reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Include demo fallback reviews if no database reviews for those products
    Object.values(DEMO_REVIEWS).forEach(list => {
      list.forEach(demoR => {
        if (!reviews.some(r => r.id === demoR.id)) {
          reviews.push(demoR);
        }
      });
    });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching all reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews.' });
  }
};

// @desc    Get all reviews written by a specific user email
// @route   GET /api/reviews/user/:email
// @access  Public / Admin
const getUserReviews = async (req, res) => {
  const { email } = req.params;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const snapshot = await db.collection('reviews').where('userEmail', '==', cleanEmail).get();
    let reviews = [];

    if (!snapshot.empty) {
      reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Check demo reviews fallback
    Object.values(DEMO_REVIEWS).forEach(list => {
      const matches = list.filter(r => r.userEmail?.trim().toLowerCase() === cleanEmail);
      matches.forEach(m => {
        if (!reviews.some(r => r.id === m.id)) {
          reviews.push(m);
        }
      });
    });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ message: 'Failed to fetch user reviews.' });
  }
};

module.exports = {
  getProductReviews,
  addOrUpdateReview,
  deleteReview,
  getAllReviews,
  getUserReviews,
};

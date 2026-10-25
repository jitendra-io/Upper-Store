const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getProductReviews,
  addOrUpdateReview,
  deleteReview,
  getAllReviews,
  getUserReviews,
} = require('../controllers/reviewController');

// Public read routes
router.get('/all', getAllReviews);
router.get('/user/:email', getUserReviews);
router.get('/product/:productId', getProductReviews);

// Protected mutation routes (Requires verified user or admin)
router.post('/product/:productId', protect, addOrUpdateReview);
router.delete('/:reviewId', protect, deleteReview);

module.exports = router;


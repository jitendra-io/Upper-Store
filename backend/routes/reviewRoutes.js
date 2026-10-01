const express = require('express');
const router = express.Router();
const { getProductReviews, addOrUpdateReview, deleteReview } = require('../controllers/reviewController');

router.get('/product/:productId', getProductReviews);
router.post('/product/:productId', addOrUpdateReview);
router.delete('/:reviewId', deleteReview);

module.exports = router;


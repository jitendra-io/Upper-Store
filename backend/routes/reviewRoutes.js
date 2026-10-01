const express = require('express');
const router = express.Router();
const { getProductReviews, addOrUpdateReview, deleteReview, getAllReviews, getUserReviews } = require('../controllers/reviewController');

router.get('/all', getAllReviews);
router.get('/user/:email', getUserReviews);
router.get('/product/:productId', getProductReviews);
router.post('/product/:productId', addOrUpdateReview);
router.delete('/:reviewId', deleteReview);

module.exports = router;


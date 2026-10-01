const express = require('express');
const router = express.Router();
const { getProductReviews, addOrUpdateReview } = require('../controllers/reviewController');

router.get('/product/:productId', getProductReviews);
router.post('/product/:productId', addOrUpdateReview);

module.exports = router;

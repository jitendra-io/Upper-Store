import { useState, useEffect } from 'react';
import './StarRatingBadge.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const formatCount = (num) => {
  if (!num) return 0;
  if (num > 999) {
    const formatted = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}k`;
  }
  return num;
};

const StarRatingBadge = ({ productId, initialRating = 5.0, initialCount = 0, onClick }) => {
  const [rating, setRating] = useState(initialRating);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    if (!productId) return;
    const fetchRating = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/reviews/product/${productId}`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setRating(data.averageRating || 5.0);
            setCount(data.reviewsCount || 0);
          }
        }
      } catch (err) {
        // Keep initial rating
      }
    };
    fetchRating();

    const handleUpdate = (e) => {
      if (!e.detail?.productId || e.detail.productId === productId) {
        fetchRating();
      }
    };
    window.addEventListener('reviewsUpdated', handleUpdate);
    return () => window.removeEventListener('reviewsUpdated', handleUpdate);
  }, [productId]);

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div
      className="star-rating-badge"
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      title="Click to view all user comments & ratings"
    >
      <div className="stars-flex-row">
        {[1, 2, 3, 4, 5].map((starIdx) => {
          let starFill = 'empty';
          if (starIdx <= fullStars) starFill = 'full';
          else if (starIdx === fullStars + 1 && hasHalfStar) starFill = 'half';

          return (
            <svg
              key={starIdx}
              width="8"
              height="8"
              viewBox="0 0 24 24"
              className={`star-svg ${starFill}`}
            >
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              />
            </svg>
          );
        })}
      </div>
      <span className="rating-num">{rating.toFixed(1)}</span>
      <span className="rating-count">({formatCount(count)})</span>
    </div>
  );
};

export default StarRatingBadge;


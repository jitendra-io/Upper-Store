import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { getUserDownloadHistory } from '../utils/downloadTracker';
import './ProductReviewsModal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ProductReviewsModal = ({ product, isOpen, onClose }) => {
  const { user, isLoggedIn, openAuthModal } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(5.0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Review Form state
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });

  // Fetch reviews on load
  const loadReviews = async () => {
    if (!product?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reviews/product/${product.id}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setAverageRating(data.averageRating || 5.0);
        setReviewsCount(data.reviewsCount || 0);

        // Pre-fill user review if exists
        if (user && user.email) {
          const cleanEmail = user.email.trim().toLowerCase();
          const existing = (data.reviews || []).find(r => r.userEmail === cleanEmail);
          if (existing) {
            setUserRating(existing.rating || 5);
            setUserComment(existing.comment || '');
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && product?.id) {
      loadReviews();
    }
  }, [isOpen, product, user]);

  // Lock background scroll without blur
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  // Check if current user has downloaded this specific product
  const hasUserDownloadedProduct = () => {
    if (!isLoggedIn || !user || !user.email) return false;
    const history = getUserDownloadHistory(user.email);
    return history.some((item) => String(item.productId) === String(product.id));
  };

  const isEligibleToReview = isLoggedIn && hasUserDownloadedProduct();

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isEligibleToReview) return;
    if (!userComment.trim()) {
      setFormMsg({ type: 'error', text: 'Please enter a review comment.' });
      return;
    }

    setSubmitting(true);
    setFormMsg({ type: '', text: '' });

    try {
      const userAvatar = user.photoURL || `https://unavatar.io/${encodeURIComponent(user.email ? user.email.trim().toLowerCase() : 'user')}?fallback=https%3A%2F%2Fapi.dicebear.com%2F7.x%2Finitials%2Fsvg%3Fseed%3D${encodeURIComponent(user.email || 'user')}`;

      const res = await fetch(`${API_BASE}/api/reviews/product/${product.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          userName: user.displayName || user.email.split('@')[0],
          userAvatar,
          rating: userRating,
          comment: userComment,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit review.');
      }

      setFormMsg({ type: 'success', text: 'Thank you! Your review has been published.' });
      loadReviews();

      // Trigger global reactive event
      window.dispatchEvent(new CustomEvent('reviewsUpdated', { detail: { productId: product.id } }));
    } catch (err) {
      setFormMsg({ type: 'error', text: err.message || 'Error submitting review.' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return 'Recently';
    try {
      return new Date(isoStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  return createPortal(
    <div className="reviews-modal-backdrop" onClick={onClose}>
      <div className="reviews-modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* MODAL HEADER */}
        <div className="reviews-modal-header">
          <div className="reviews-header-brand">
            {product.logo ? (
              <img src={product.logo} alt="" className="reviews-product-logo" />
            ) : (
              <div className="reviews-logo-placeholder">📦</div>
            )}
            <div>
              <h3>{product.title}</h3>
              <div className="reviews-header-meta">
                <span className="reviews-count-badge">💬 {reviewsCount} {reviewsCount === 1 ? 'Comment' : 'Comments'}</span>
                <span className="reviews-avg-rating">★ {averageRating.toFixed(1)} / 5.0</span>
              </div>
            </div>
          </div>
          <button className="reviews-close-btn" onClick={onClose} title="Close Modal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* BODY CONTENT */}
        <div className="reviews-modal-body">
          
          {/* ELIGIBILITY & REVIEW SUBMISSION FORM */}
          <div className="reviews-submit-box">
            <h4>Share Your Rating & Experience</h4>

            {!isLoggedIn ? (
              <div className="reviews-banner-notice warning">
                <p>🔒 <strong>Authentication Required:</strong> Please sign in to submit a rating or comment for this product.</p>
                <button
                  className="reviews-notice-btn"
                  onClick={() => {
                    onClose();
                    openAuthModal('Please sign in to leave a review.');
                  }}
                >
                  Sign In to Upper Store
                </button>
              </div>
            ) : !hasUserDownloadedProduct() ? (
              <div className="reviews-banner-notice info">
                <p>📥 <strong>Verified Download Required:</strong> Only users who have registered and downloaded this particular software product can submit a review. Please download the app first to share your feedback!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="reviews-form">
                
                {formMsg.text && (
                  <div className={`reviews-alert-badge ${formMsg.type}`}>
                    {formMsg.type === 'error' ? '⚠️' : '✓'} {formMsg.text}
                  </div>
                )}

                {/* STAR RATING INTERACTIVE SELECTOR */}
                <div className="rating-picker-row">
                  <span className="picker-label">Your Rating:</span>
                  <div className="picker-stars">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        type="button"
                        key={starVal}
                        className={`star-pick-btn ${starVal <= (hoverRating || userRating) ? 'active' : ''}`}
                        onClick={() => setUserRating(starVal)}
                        onMouseEnter={() => setHoverRating(starVal)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`Rate ${starVal} stars`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <span className="picker-score-text">{userRating} / 5 Stars</span>
                </div>

                {/* COMMENT TEXT AREA */}
                <textarea
                  className="reviews-textarea"
                  rows={3}
                  required
                  placeholder="Write your honest review or feedback regarding this product..."
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                />

                <button type="submit" className="reviews-submit-btn" disabled={submitting}>
                  {submitting ? 'Publishing Review...' : 'Publish User Review'}
                </button>
              </form>
            )}
          </div>

          <hr className="reviews-divider" />

          {/* COMMENTS LIST */}
          <div className="reviews-list-section">
            <h4 className="reviews-list-title">All User Reviews ({reviewsCount})</h4>

            {loading ? (
              <div className="reviews-loading">Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className="reviews-empty">
                <p>No comments yet. Be the first verified downloader to leave a review!</p>
              </div>
            ) : (
              <div className="reviews-cards-stack">
                {reviews.map((rev) => (
                  <div key={rev.id || rev.userEmail} className="review-comment-card">
                    <div className="review-comment-header">
                      <img
                        src={rev.userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(rev.userEmail || 'user')}&backgroundColor=d4af37&textColor=000000`}
                        alt={rev.userName || 'User'}
                        className="review-user-avatar"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(rev.userEmail || 'user')}&backgroundColor=d4af37&textColor=000000`;
                        }}
                      />
                      <div className="review-user-info">
                        <div className="review-user-name-row">
                          <span className="review-user-name">{rev.userName || rev.userEmail?.split('@')[0]}</span>
                          <span className="review-verified-tag">✓ Verified Downloader</span>
                        </div>
                        <span className="review-timestamp">{formatDate(rev.createdAt)}</span>
                      </div>
                      <div className="review-card-stars">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className={`comment-star ${s <= rev.rating ? 'active' : ''}`}>
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="review-comment-body">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductReviewsModal;

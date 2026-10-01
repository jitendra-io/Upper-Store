import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { getUserDownloadHistory, recordUserDownload } from '../utils/downloadTracker';
import TermsAcceptanceModal from './TermsAcceptanceModal';
import './ProductReviewsModal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const formatCount = (num) => {
  if (!num) return 0;
  if (num > 999) {
    const formatted = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}k`;
  }
  return num;
};

const ProductReviewsModal = ({ product, isOpen, onClose }) => {
  const { user, isLoggedIn, openAuthModal } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(5.0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Review Form state
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });
  const [termsModalOpen, setTermsModalOpen] = useState(false);

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
  }, [isOpen, product, user, forceUpdate]);

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

  const isVerifiedDownloader = isLoggedIn && hasUserDownloadedProduct();
  const cleanUserEmail = user?.email ? user.email.trim().toLowerCase() : '';
  const userExistingReview = cleanUserEmail ? reviews.find(r => r.userEmail === cleanUserEmail) : null;

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isVerifiedDownloader) return;
    if (userExistingReview) {
      setFormMsg({ type: 'error', text: 'You have already submitted a review for this product. Delete your previous review to submit a new one.' });
      return;
    }

    if (!userComment.trim()) {
      setFormMsg({ type: 'error', text: 'Please write a review comment.' });
      return;
    }

    setSubmitting(true);
    setFormMsg({ type: '', text: '' });

    try {
      const userAvatar = user.photoURL || `https://unavatar.io/${encodeURIComponent(cleanUserEmail)}?fallback=https%3A%2F%2Fapi.dicebear.com%2F7.x%2Finitials%2Fsvg%3Fseed%3D${encodeURIComponent(cleanUserEmail)}`;

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

  const handleDeleteReview = async (reviewId) => {
    if (!reviewId) return;
    if (!window.confirm('Are you sure you want to delete your review? You can submit a new review after deleting.')) return;

    setDeletingId(reviewId);
    try {
      const res = await fetch(`${API_BASE}/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setFormMsg({ type: 'success', text: 'Your review was deleted. You can now submit a new review.' });
        setUserComment('');
        setUserRating(5);
        loadReviews();
        window.dispatchEvent(new CustomEvent('reviewsUpdated', { detail: { productId: product.id } }));
      } else {
        const data = await res.json();
        setFormMsg({ type: 'error', text: data.message || 'Failed to delete review.' });
      }
    } catch (err) {
      setFormMsg({ type: 'error', text: 'Error deleting review.' });
    } finally {
      setDeletingId(null);
    }
  };

  // Download handling for unverified users
  const hasUserAcceptedTerms = () => {
    if (!user || !user.email) return false;
    return localStorage.getItem(`upper_terms_accepted_${cleanUserEmail}`) === 'true';
  };

  const handleModalDownloadClick = () => {
    if (!isLoggedIn) {
      onClose();
      openAuthModal("Authentication Required: Please sign in to download this application.");
      return;
    }

    if (!hasUserAcceptedTerms()) {
      setTermsModalOpen(true);
      return;
    }

    executeDownload();
  };

  const executeDownload = () => {
    if (user && user.email) {
      recordUserDownload(user.email, product);
    }
    const targetUrl = product.apkFile && product.apkFile !== '#' ? product.apkFile : '/products';
    if (targetUrl && targetUrl !== '#') {
      window.open(targetUrl, '_blank');
    }
    setForceUpdate((prev) => prev + 1);
  };

  const handleAcceptTerms = () => {
    if (user && user.email) {
      localStorage.setItem(`upper_terms_accepted_${cleanUserEmail}`, 'true');
    }
    setTermsModalOpen(false);
    executeDownload();
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
              <div className="reviews-logo-placeholder">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
            )}
            <div>
              <h3>{product.title}</h3>
              <div className="reviews-header-meta">
                <span className="reviews-count-badge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span>{formatCount(reviewsCount)} {reviewsCount === 1 ? 'Comment' : 'Comments'}</span>
                </span>
                <span className="reviews-avg-rating">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#d4af37" stroke="#d4af37" strokeWidth="1">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  <span>{averageRating.toFixed(1)} / 5.0</span>
                </span>
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
                <p>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span><strong>Authentication Required:</strong> Please sign in to submit a rating or comment for this product.</span>
                </p>
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
            ) : !isVerifiedDownloader ? (
              <div className="reviews-banner-notice info">
                <p>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span><strong>Verified Download Required:</strong> Only users who have registered and downloaded this software product can submit a review. Download it now to leave your feedback!</span>
                </p>
                {/* REQUIREMENT 4: Download Button inside review popup for non-downloaders */}
                <button
                  type="button"
                  className="reviews-download-btn"
                  onClick={handleModalDownloadClick}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Download {product.title}</span>
                </button>
              </div>
            ) : userExistingReview ? (
              /* REQUIREMENT 3: Single review enforcement - show existing review notice & delete option */
              <div className="reviews-banner-notice existing-review">
                <p>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span><strong>Review Already Submitted:</strong> You have submitted a review for this product. Editing is not permitted. To submit a new review, delete your previous review first.</span>
                </p>
                <button
                  type="button"
                  className="review-delete-btn"
                  disabled={deletingId === userExistingReview.id}
                  onClick={() => handleDeleteReview(userExistingReview.id)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                  <span>{deletingId === userExistingReview.id ? 'Deleting...' : 'Delete My Review'}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="reviews-form">
                
                {formMsg.text && (
                  <div className={`reviews-alert-badge ${formMsg.type}`}>
                    {formMsg.type === 'error' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                    <span>{formMsg.text}</span>
                  </div>
                )}

                {/* STAR RATING INTERACTIVE SELECTOR */}
                <div className="rating-picker-row">
                  <span className="picker-label">Your Rating:</span>
                  <div className="picker-stars">
                    {[1, 2, 3, 4, 5].map((starVal) => {
                      const isActive = starVal <= (hoverRating || userRating);
                      return (
                        <button
                          type="button"
                          key={starVal}
                          className={`star-pick-btn ${isActive ? 'active' : ''}`}
                          onClick={() => setUserRating(starVal)}
                          onMouseEnter={() => setHoverRating(starVal)}
                          onMouseLeave={() => setHoverRating(0)}
                          aria-label={`Rate ${starVal} stars`}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill={isActive ? "#d4af37" : "none"} stroke={isActive ? "#d4af37" : "rgba(255,255,255,0.3)"} strokeWidth="1.5">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                        </button>
                      );
                    })}
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
            <h4 className="reviews-list-title">All User Reviews ({formatCount(reviewsCount)})</h4>

            {loading ? (
              <div className="reviews-loading">Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className="reviews-empty">
                <p>No comments yet. Be the first verified downloader to leave a review!</p>
              </div>
            ) : (
              <div className="reviews-cards-stack">
                {reviews.map((rev) => {
                  const isUserCard = cleanUserEmail && rev.userEmail === cleanUserEmail;
                  return (
                    <div key={rev.id || rev.userEmail} className={`review-comment-card ${isUserCard ? 'user-own-card' : ''}`}>
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
                            <span className="review-verified-tag">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              <span>Verified Downloader</span>
                            </span>
                          </div>
                          <span className="review-timestamp">{formatDate(rev.createdAt)}</span>
                        </div>
                        <div className="review-card-stars">
                          {[1, 2, 3, 4, 5].map((s) => {
                            const isFilled = s <= rev.rating;
                            return (
                              <svg
                                key={s}
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill={isFilled ? "#d4af37" : "none"}
                                stroke={isFilled ? "#d4af37" : "rgba(255,255,255,0.2)"}
                                strokeWidth="1.5"
                              >
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                              </svg>
                            );
                          })}
                        </div>
                      </div>
                      <p className="review-comment-body">{rev.comment}</p>

                      {/* REQUIREMENT 3: Only delete button for user's own review, no edit button */}
                      {isUserCard && rev.id && (
                        <div className="review-card-actions">
                          <button
                            type="button"
                            className="review-delete-btn sm"
                            disabled={deletingId === rev.id}
                            onClick={() => handleDeleteReview(rev.id)}
                            title="Delete this review to submit a new one"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>{deletingId === rev.id ? 'Deleting...' : 'Delete Review'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TERMS ACCEPTANCE MODAL FOR DOWNLOAD FROM POPUP */}
      {termsModalOpen && (
        <TermsAcceptanceModal
          isOpen={termsModalOpen}
          product={product}
          onAccept={handleAcceptTerms}
          onClose={() => setTermsModalOpen(false)}
        />
      )}
    </div>,
    document.body
  );
};

export default ProductReviewsModal;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { recordUserDownload, getProductDownloadCount, formatDownloadCount } from '../utils/downloadTracker';
import TermsAcceptanceModal from './TermsAcceptanceModal';
import StarRatingBadge from './StarRatingBadge';
import ProductReviewsModal from './ProductReviewsModal';
import './ProductDetailModal.css';

const ProductDetailModal = ({ product, onClose }) => {
  const { user, isLoggedIn, openAuthModal } = useAuth();
  const [downloadCount, setDownloadCount] = useState(() => getProductDownloadCount(product?.id, product?.downloadCount));
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    if (product?.id) {
      setDownloadCount(getProductDownloadCount(product.id, product.downloadCount));
    }
  }, [product]);

  useEffect(() => {
    const handleUpdate = () => {
      if (product?.id) {
        setDownloadCount(getProductDownloadCount(product.id, product.downloadCount));
      }
    };
    window.addEventListener('productDownloadsUpdated', handleUpdate);
    return () => window.removeEventListener('productDownloadsUpdated', handleUpdate);
  }, [product]);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const [isBanned, setIsBanned] = useState(Boolean(user?.isBanned));

  useEffect(() => {
    if (!user || !user.email) {
      setIsBanned(false);
      return;
    }
    setIsBanned(Boolean(user.isBanned));
    const checkBanStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/user/status/${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          setIsBanned(Boolean(data.isBanned));
        }
      } catch (err) {}
    };
    checkBanStatus();
  }, [user]);

  const hasUserAcceptedTerms = () => {
    if (!user || !user.email) return false;
    const cleanEmail = user.email.trim().toLowerCase();
    return localStorage.getItem(`upper_terms_accepted_${cleanEmail}`) === 'true';
  };

  const handleDownloadClick = (e) => {
    if (!isLoggedIn) {
      e.preventDefault();
      openAuthModal("Authentication Required: Please sign in to download this application or digital package.");
      return;
    }

    if (isBanned || user?.isBanned) {
      e.preventDefault();
      alert("Account Banned: Downloads and product reviews are restricted. Please submit an appeal on the Contact page.");
      return;
    }

    if (!hasUserAcceptedTerms()) {
      e.preventDefault();
      setTermsModalOpen(true);
      return;
    }

    // Terms already accepted! Track download in database
    recordUserDownload(user?.email || '', product);
  };

  const handleAcceptTerms = () => {
    if (user && user.email) {
      const cleanEmail = user.email.trim().toLowerCase();
      localStorage.setItem(`upper_terms_accepted_${cleanEmail}`, 'true');
    }
    setTermsModalOpen(false);
    recordUserDownload(user?.email || '', product);

    // Trigger download programmatically
    const targetUrl = product.apkFile && product.apkFile !== '#' ? product.apkFile : '/products';
    if (targetUrl && targetUrl !== '#') {
      window.open(targetUrl, '_blank');
    }
  };

  const allImages = product?.images && product.images.length > 0
    ? product.images
    : (product?.image ? [product.image] : []);

  const [activeImage, setActiveImage] = useState(allImages[0] || '');

  useEffect(() => {
    if (allImages.length > 0) setActiveImage(allImages[0]);
  }, [product]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('modalToggle', { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent('modalToggle', { detail: false }));
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [onClose]);

  if (!product) return null;

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('modal-backdrop-overlay')) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop-overlay" onClick={handleBackdropClick}>
      <div className="modal-card-container">
        {/* Close Icon */}
        <button className="modal-close-icon" onClick={onClose} aria-label="Close modal">
          ✕
        </button>

        {/* Cover Image with Preserved Aspect Ratio */}
        {activeImage && (
          <div className="modal-cover-frame">
            <img
              src={activeImage}
              alt={product.title}
              className="modal-cover-img"
              referrerPolicy="no-referrer"
            />
            <span className="modal-category-badge">{product.category}</span>
          </div>
        )}

        {/* Multiple Screenshots Gallery Thumbs */}
        {allImages.length > 1 && (
          <div className="modal-thumbs-row">
            {allImages.map((imgUrl, idx) => (
              <button
                key={idx}
                className={`thumb-btn ${activeImage === imgUrl ? 'active' : ''}`}
                onClick={() => setActiveImage(imgUrl)}
              >
                <img src={imgUrl} alt={`Screenshot ${idx + 1}`} referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        )}

        {/* Product Info Section */}
        <div className="modal-details-body">
          <div className="modal-header-row">
            {product.logo ? (
              <img src={product.logo} alt="" className="modal-app-logo" referrerPolicy="no-referrer" />
            ) : (
              <div className="modal-logo-placeholder">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
            )}
            <div>
              <h2 className="modal-product-title">{product.title}</h2>
              <div className="modal-meta-pills">
                <span className="pill-item">Version: v{product.version || '1.0.0'}</span>
                {/* 5-Star Review Rating Button inside Product Details */}
                <StarRatingBadge
                  productId={product.id}
                  initialRating={product.averageRating || 5.0}
                  initialCount={product.reviewsCount || 0}
                  onClick={() => setReviewModalOpen(true)}
                />
                <span className="pill-item download-count-pill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  {formatDownloadCount(downloadCount)} Downloads
                </span>
                <span className="pill-item price-pill">{product.price}</span>
              </div>
            </div>
          </div>

          {/* Account Banned Restriction Banner */}
          {(isBanned || user?.isBanned) && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              color: '#fca5a5',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
              </svg>
              <span><strong>Account Restricted (Banned):</strong> You cannot download software or submit product reviews while your account is banned. Please submit an appeal on the Contact page.</span>
            </div>
          )}

          {/* Animated Download Button */}
          <div className="modal-actions">
            {product.apkFile ? (
              <a
                href={isLoggedIn ? product.apkFile : '#'}
                target={isLoggedIn ? '_blank' : '_self'}
                rel="noopener noreferrer"
                download
                className="modal-download-link"
                onClick={handleDownloadClick}
              >
                <button className="modal-cta-button animated-download-btn">
                  <span className="btn-icon">
                    {product.apkFile.toLowerCase().endsWith('.exe') || product.category?.includes('.exe') || product.category?.includes('Windows') ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                      </svg>
                    ) : product.apkFile.toLowerCase().endsWith('.zip') ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                        <line x1="12" y1="18" x2="12.01" y2="18"></line>
                      </svg>
                    )}
                  </span>
                  <span className="btn-text">
                    {product.apkFile.toLowerCase().endsWith('.exe') || product.category?.includes('.exe') || product.category?.includes('Windows')
                      ? 'Download Windows App (.exe)'
                      : product.apkFile.toLowerCase().endsWith('.zip')
                      ? 'Download Zip Package (.zip)'
                      : 'Download Android App (.apk)'}
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '0.4rem', verticalAlign: 'middle' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span className="btn-shine"></span>
                </button>
              </a>
            ) : (
              <button className="modal-cta-button animated-download-btn" onClick={handleDownloadClick}>
                <span className="btn-text">Get Now — {product.price}</span>
                <span className="btn-shine"></span>
              </button>
            )}
          </div>

          {product.releaseNotes && (
            <div className="modal-release-notes">
              <h4>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.4rem', verticalAlign: 'middle' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                Release Notes & Specs
              </h4>
              <p>{product.releaseNotes}</p>
            </div>
          )}
        </div>
      </div>

      {/* ONE-TIME TERMS & CONDITIONS ACCEPTANCE MODAL */}
      <TermsAcceptanceModal
        isOpen={termsModalOpen}
        onAccept={handleAcceptTerms}
        onCancel={() => setTermsModalOpen(false)}
      />

      {/* PRODUCT REVIEWS POPUP FROM DETAILS */}
      {reviewModalOpen && (
        <ProductReviewsModal
          product={product}
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ProductDetailModal;


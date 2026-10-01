import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './ProductDetailModal.css';

const ProductDetailModal = ({ product, onClose }) => {
  const { isLoggedIn, openAuthModal } = useAuth();

  const handleDownloadClick = (e) => {
    if (!isLoggedIn) {
      e.preventDefault();
      openAuthModal("Authentication Required: Please sign in to download this application or digital package.");
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
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
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

        {/* Cover Image with Preserved Aspect Ratio (Reduced by 60px vertically) */}
        {activeImage && (
          <div className="modal-cover-frame">
            <img
              src={activeImage}
              alt={product.title}
              className="modal-cover-img"
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
                <img src={imgUrl} alt={`Screenshot ${idx + 1}`} />
              </button>
            ))}
          </div>
        )}

        {/* Product Info Section */}
        <div className="modal-details-body">
          <div className="modal-header-row">
            {product.logo ? (
              <img src={product.logo} alt="" className="modal-app-logo" />
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
                <span className="pill-item price-pill">{product.price}</span>
              </div>
            </div>
          </div>

          <p className="modal-description-text">{product.description}</p>

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
    </div>
  );
};

export default ProductDetailModal;

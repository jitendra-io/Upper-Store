import React, { useEffect } from 'react';
import './ProductDetailModal.css';

const ProductDetailModal = ({ product, onClose }) => {
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
        {/* Close Button */}
        <button className="modal-close-icon" onClick={onClose} aria-label="Close modal">
          ✕
        </button>

        {/* Cover Image with Preserved Aspect Ratio */}
        {product.image && (
          <div className="modal-cover-frame">
            <img
              src={product.image}
              alt={product.title}
              className="modal-cover-img"
            />
            <span className="modal-category-badge">{product.category}</span>
          </div>
        )}

        {/* Product Info Section */}
        <div className="modal-details-body">
          <div className="modal-header-row">
            {product.logo ? (
              <img src={product.logo} alt="" className="modal-app-logo" />
            ) : (
              <div className="modal-logo-placeholder">📦</div>
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

          <div className="modal-actions">
            {product.apkFile ? (
              <a href={product.apkFile} target="_blank" rel="noopener noreferrer" download className="modal-download-link">
                <button className="modal-cta-button download-btn">⬇ Download Package / APK</button>
              </a>
            ) : (
              <button className="modal-cta-button purchase-btn">Get Now — {product.price}</button>
            )}
          </div>

          {product.releaseNotes && (
            <div className="modal-release-notes">
              <h4>📋 Release Notes & Specs</h4>
              <p>{product.releaseNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;

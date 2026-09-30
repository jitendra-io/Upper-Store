import React, { useState, useEffect } from 'react';
import './ProductDetailModal.css';

const ProductDetailModal = ({ product, onClose }) => {
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

          {/* Animated Download Button */}
          <div className="modal-actions">
            {product.apkFile ? (
              <a
                href={product.apkFile}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="modal-download-link"
              >
                <button className="modal-cta-button animated-download-btn">
                  <span className="btn-icon">
                    {product.apkFile.toLowerCase().endsWith('.exe') || product.category?.includes('.exe') || product.category?.includes('Windows')
                      ? '💻'
                      : '📱'}
                  </span>
                  <span className="btn-text">
                    {product.apkFile.toLowerCase().endsWith('.exe') || product.category?.includes('.exe') || product.category?.includes('Windows')
                      ? 'Download Windows App (.exe)'
                      : product.apkFile.toLowerCase().endsWith('.zip')
                      ? 'Download Zip Package (.zip)'
                      : 'Download Android App (.apk)'}
                  </span>
                  <span className="btn-shine"></span>
                </button>
              </a>
            ) : (
              <button className="modal-cta-button animated-download-btn">
                <span className="btn-text">Get Now — {product.price}</span>
                <span className="btn-shine"></span>
              </button>
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

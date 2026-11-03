import React, { useEffect } from 'react';
import { formatDownloadCount } from '../utils/downloadTracker';
import './DeveloperDownloadsModal.css';

export const DeveloperDownloadsModal = ({
  isOpen,
  onClose,
  developer,
  products = [],
  totalDownloads = 0,
  onSelectProduct,
}) => {
  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevDocOverflow = document.documentElement.style.overflow;
      const prevBodyTouch = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevDocOverflow;
        document.body.style.touchAction = prevBodyTouch;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="dev-downloads-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="downloads-modal-title"
    >
      <div className="dev-downloads-modal-card">
        {/* HEADER */}
        <div className="dev-downloads-header">
          <div className="downloads-header-left">
            <div className="downloads-header-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
            <div>
              <h2 id="downloads-modal-title" className="downloads-modal-title">
                Application Telemetry
              </h2>
              <p className="downloads-modal-sub">
                Private verified downloads breakdown for @{developer?.username || 'developer'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="downloads-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* METRICS SUMMARY STRIP */}
        <div className="downloads-summary-strip">
          <div className="downloads-summary-card">
            <span className="summary-card-lbl">Total Installs</span>
            <span className="summary-card-val highlight-gold">
              {formatDownloadCount(totalDownloads)}
            </span>
            <span className="summary-card-detail">
              {Number(totalDownloads).toLocaleString()} Lifetime Downloads
            </span>
          </div>

          <div className="downloads-summary-card">
            <span className="summary-card-lbl">Published Applications</span>
            <span className="summary-card-val">
              {products.length}
            </span>
            <span className="summary-card-detail">
              Active in Store Catalog
            </span>
          </div>
        </div>

        {/* PER-PRODUCT LIST */}
        <div className="downloads-products-list-wrapper">
          <h3 className="downloads-list-heading">Downloads by Application</h3>

          {products.length > 0 ? (
            <div className="downloads-products-grid">
              {products.map((product) => {
                const count = Number(product.downloadsCount) || Number(product.downloads) || 0;
                const iconSrc = product.logo || product.image || product.imageUrl1 || '/logo.png';

                return (
                  <div key={product.id} className="downloads-product-row">
                    <div className="product-row-icon-frame">
                      <img
                        src={iconSrc}
                        alt={product.title}
                        className="product-row-icon-img"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/logo.png';
                        }}
                      />
                    </div>

                    <div className="product-row-info">
                      <div className="product-row-title-strip">
                        <h4 className="product-row-title">{product.title}</h4>
                        <span className="product-row-version">v{product.version || '1.0.0'}</span>
                      </div>
                      <span className="product-row-cat">{product.category || 'Utility'}</span>
                    </div>

                    <div className="product-row-stats">
                      <div className="product-row-count-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span className="product-count-number">{formatDownloadCount(count)}</span>
                      </div>
                      <span className="product-count-exact">{count.toLocaleString()} installs</span>
                    </div>

                    {onSelectProduct && (
                      <button
                        type="button"
                        className="product-row-inspect-btn"
                        onClick={() => {
                          onClose();
                          onSelectProduct(product);
                        }}
                        title="View product store listing"
                      >
                        Inspect
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="downloads-empty-state">
              <p>You have not published any software applications to Upper Store yet.</p>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="dev-downloads-footer">
          <span className="downloads-footer-hint">
            Telemetry is synchronized with client install logs &amp; database transactions.
          </span>
          <button type="button" className="downloads-footer-btn" onClick={onClose}>
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDownloadsModal;


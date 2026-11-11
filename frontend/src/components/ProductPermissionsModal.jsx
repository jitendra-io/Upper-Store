import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, CheckIcon } from './Icons';
import './ProductPermissionsModal.css';

const ProductPermissionsModal = ({ product, isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const permissions = product.securityDetails?.permissions || [];

  const filteredPermissions = permissions.filter((perm) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (perm.name && perm.name.toLowerCase().includes(q)) ||
      (perm.raw && perm.raw.toLowerCase().includes(q)) ||
      (perm.desc && perm.desc.toLowerCase().includes(q))
    );
  });

  const modalContent = (
    <div className="perms-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="perms-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Mobile Drag Indicator */}
        <div className="perms-modal-drag-bar" />

        {/* Modal Header */}
        <div className="perms-modal-header">
          <div className="perms-modal-header-info">
            <div className="perms-modal-title-row">
              <span className="perms-modal-title-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </span>
              <h2 className="perms-modal-title">Declared App Permissions</h2>
            </div>
            <p className="perms-modal-subtitle">
              {product.title} {product.version ? `(v${product.version})` : ''} &bull; {product.securityDetails?.platform || 'Android OS'}
            </p>
          </div>

          <button
            type="button"
            className="perms-modal-close-btn"
            onClick={onClose}
            aria-label="Close Permissions"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Summary Metric Bar */}
        <div className="perms-modal-summary-row">
          <div className="perms-modal-summary-pill pill-total">
            Total Declared Permissions: <strong>{permissions.length}</strong>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="perms-modal-toolbar">
          <div className="perms-modal-search-wrapper">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="perms-search-icon">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="perms-modal-search-input"
              placeholder="Filter permissions by name or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="perms-search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                <CloseIcon size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Permissions List */}
        <div className="perms-modal-list-body">
          {filteredPermissions.length > 0 ? (
            <div className="perms-modal-grid">
              {filteredPermissions.map((perm, idx) => (
                <div key={idx} className="perms-card-item">
                  <div className="perms-card-top">
                    <span className="perms-card-name">{perm.name}</span>
                  </div>

                  {perm.raw && <code className="perms-card-raw">{perm.raw}</code>}

                  <p className="perms-card-desc">{perm.desc}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="perms-modal-empty">
              <p>No permissions found matching "{searchQuery}".</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="perms-modal-footer">
          <div className="perms-modal-footer-note">
            <CheckIcon size={13} />
            <span>Extracted directly from binary AndroidManifest.xml</span>
          </div>

          <button
            type="button"
            className="perms-modal-done-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ProductPermissionsModal;

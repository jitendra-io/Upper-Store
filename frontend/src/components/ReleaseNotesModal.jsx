import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import MarkdownViewer from './MarkdownViewer';
import './ReleaseNotesModal.css';

const ReleaseNotesModal = ({ product, isOpen, onClose }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const devHandle = (
    product.developerUsername ||
    (product.developerEmail ? product.developerEmail.split('@')[0] : '') ||
    'upperstore'
  ).replace(/^@/, '');

  const modalContent = (
    <div
      className="rn-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="rn-modal-container" ref={modalRef} role="dialog" aria-modal="true">
        {/* Top Header */}
        <div className="rn-modal-header">
          <div className="rn-modal-identity">
            {product.logo ? (
              <img
                src={product.logo}
                alt=""
                className="rn-modal-logo"
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="rn-modal-logo-placeholder">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff2a2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </div>
            )}

            <div className="rn-modal-title-wrap">
              <div className="rn-modal-title-row">
                <h3 className="rn-modal-title">{product.title}</h3>
                <span className="rn-modal-version-pill">v{product.version || '1.0.0'}</span>
              </div>
              <span className="rn-modal-subtitle">Full Release Notes &amp; Technical Changelog</span>
            </div>
          </div>

          <button
            type="button"
            className="rn-modal-close-btn"
            onClick={onClose}
            aria-label="Close release notes reader"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Scrollable Markdown Document Body */}
        <div className="rn-modal-body">
          <MarkdownViewer content={product.releaseNotes} className="rn-markdown-reader" />
        </div>

        {/* Footer */}
        <div className="rn-modal-footer">
          <div className="rn-modal-meta-left">
            <span className="rn-meta-label">Published by</span>
            <span className="rn-meta-author">@{devHandle}</span>
            {product.category && <span className="rn-meta-category-pill">{product.category}</span>}
          </div>

          <button type="button" className="rn-modal-done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default ReleaseNotesModal;

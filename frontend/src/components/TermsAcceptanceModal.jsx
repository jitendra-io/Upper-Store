import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './TermsAcceptanceModal.css';

const TermsAcceptanceModal = ({ isOpen, onAccept, onCancel, onClose, isConsentWithdrawn }) => {
  const [agreed, setAgreed] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [consentAgreed, setConsentAgreed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAgreed(false);
      setIsAdult(false);
      setConsentAgreed(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setAgreed(false);
    setIsAdult(false);
    setConsentAgreed(false);
    if (onCancel) onCancel();
    if (onClose) onClose();
  };

  const canAccept = agreed && isAdult && (!isConsentWithdrawn || consentAgreed);

  const handleAccept = () => {
    if (canAccept) {
      onAccept();
    }
  };

  return createPortal(
    <div className="terms-modal-backdrop" onClick={handleClose}>
      <div className="terms-modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="terms-modal-header">
          <div className="terms-header-brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <polyline points="9 12 11 14 15 10"></polyline>
            </svg>
            <div>
              <h3>{isConsentWithdrawn ? 'Consent & Store Terms Agreement' : 'One-Time Terms & Conditions Agreement'}</h3>
              <p className="terms-modal-sub">
                {isConsentWithdrawn
                  ? 'Your consent is currently withdrawn. Please re-grant consent and accept store governance terms before downloading software.'
                  : 'Please review and accept our store governance terms before downloading software or digital assets.'}
              </p>
            </div>
          </div>
          <button className="terms-close-btn" onClick={handleClose} title="Close Modal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* TERMS CLAUSES BODY */}
        <div className="terms-modal-body">
          {isConsentWithdrawn && (
            <div className="terms-consent-alert">
              <div className="terms-consent-alert-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div className="terms-consent-alert-text">
                <strong>Data Processing Consent Required</strong>
                <p>You have currently withdrawn consent. In accordance with platform governance, downloading applications and digital assets requires active consent to process your account details for delivery and licensing.</p>
              </div>
            </div>
          )}

          <div className="terms-clause-card">
            <div className="terms-clause-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18M3 7l9-4 9 4M3 7l4 9h4L3 7zm18 0l-4 9h-4l4-9z"></path>
              </svg>
            </div>
            <div>
              <h4>1. User Liability & Zero Misuse Liability</h4>
              <p>
                Upper Store and its developers hold <strong>zero financial or legal liability</strong> under any circumstances for any user's misuse, modification, misrepresentation, or misleading distribution of our products or software. You as the user bear 100% full personal, legal, and financial responsibility for your actions, must provide explanation for any misleading activity, and may undergo legal procedures if applicable. Upper Store will not pay any compensation or damages for user misuse.
              </p>
            </div>
          </div>

          <div className="terms-clause-card">
            <div className="terms-clause-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
            </div>
            <div>
              <h4>2. Verified Monetary Refund Policy</h4>
              <p>
                Upper Store will issue a full refund if a monetary-related error or financial mistake occurs directly from our side, subject to administrative verification and transaction proof.
              </p>
            </div>
          </div>

          <div className="terms-clause-card">
            <div className="terms-clause-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <div>
              <h4>3. Account Termination & Suspension Rights</h4>
              <p>
                Upper Store reserves the absolute right to suspend or terminate any user account or download access at any moment without prior notice if suspicious activity, code of conduct violations, or platform policy breaches are detected.
              </p>
            </div>
          </div>
        </div>

        {/* CHECKBOXES & ACTIONS FOOTER */}
        <div className="terms-modal-footer">
          <div className="terms-checkboxes-group">
            <label className="terms-checkbox-label">
              <input
                type="checkbox"
                checked={isAdult}
                onChange={(e) => setIsAdult(e.target.checked)}
              />
              <span className="checkbox-text">
                I confirm that I am <strong>18 years of age or older</strong>.
              </span>
            </label>

            {isConsentWithdrawn && (
              <label className="terms-checkbox-label">
                <input
                  type="checkbox"
                  checked={consentAgreed}
                  onChange={(e) => setConsentAgreed(e.target.checked)}
                />
                <span className="checkbox-text">
                  I give affirmative consent to Upper Store to process my account details for <strong>software downloads, licensing, and security updates</strong>.
                </span>
              </label>
            )}

            <label className="terms-checkbox-label">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span className="checkbox-text">
                I have read, understood, and agree to Upper Store's Terms & Conditions and Misuse Policy.
              </span>
            </label>
          </div>

          <div className="terms-footer-buttons">
            <button className="terms-cancel-btn" onClick={handleClose}>
              Cancel
            </button>
            <button
              className="terms-accept-btn"
              disabled={!canAccept}
              onClick={handleAccept}
            >
              {isConsentWithdrawn ? 'Accept Consent & Continue Download' : 'Accept Terms & Continue Download'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TermsAcceptanceModal;
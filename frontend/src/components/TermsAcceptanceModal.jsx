import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './TermsAcceptanceModal.css';

const TermsAcceptanceModal = ({ isOpen, onAccept, onCancel }) => {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (agreed) {
      onAccept();
    }
  };

  return createPortal(
    <div className="terms-modal-backdrop" onClick={onCancel}>
      <div className="terms-modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="terms-modal-header">
          <div className="terms-header-brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <polyline points="9 12 11 14 15 10"></polyline>
            </svg>
            <div>
              <h3>One-Time Terms & Conditions Agreement</h3>
              <p className="terms-modal-sub">Please review and accept our store governance terms before downloading software or digital assets.</p>
            </div>
          </div>
          <button className="terms-close-btn" onClick={onCancel} title="Close Modal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* TERMS CLAUSES BODY */}
        <div className="terms-modal-body">
          <div className="terms-clause-card">
            <div className="terms-clause-icon">⚖️</div>
            <div>
              <h4>1. User Liability & Zero Misuse Liability</h4>
              <p>
                Upper Store and its developers hold <strong>zero financial or legal liability</strong> under any circumstances for any user's misuse, modification, misrepresentation, or misleading distribution of our products or software. You as the user bear 100% full personal, legal, and financial responsibility for your actions, must provide explanation for any misleading activity, and may undergo legal procedures if applicable. Upper Store will not pay any compensation or damages for user misuse.
              </p>
            </div>
          </div>

          <div className="terms-clause-card">
            <div className="terms-clause-icon">💳</div>
            <div>
              <h4>2. Verified Monetary Refund Policy</h4>
              <p>
                Upper Store will issue a full refund if a monetary-related error or financial mistake occurs directly from our side, subject to administrative verification and transaction proof.
              </p>
            </div>
          </div>

          <div className="terms-clause-card">
            <div className="terms-clause-icon">🛡️</div>
            <div>
              <h4>3. Account Termination & Suspension Rights</h4>
              <p>
                Upper Store reserves the absolute right to suspend or terminate any user account or download access at any moment without prior notice if suspicious activity, code of conduct violations, or platform policy breaches are detected.
              </p>
            </div>
          </div>
        </div>

        {/* CHECKBOX & ACTIONS FOOTER */}
        <div className="terms-modal-footer">
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

          <div className="terms-footer-buttons">
            <button className="terms-cancel-btn" onClick={onCancel}>
              Cancel
            </button>
            <button
              className="terms-accept-btn"
              disabled={!agreed}
              onClick={handleAccept}
            >
              Accept Terms & Continue Download
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TermsAcceptanceModal;
